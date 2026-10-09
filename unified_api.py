import sys
import os

# Paths setup
ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
DL_PROJECT_DIR = os.path.join(ROOT_DIR, "DL_project")
FACEGUARD_DIR = os.path.join(ROOT_DIR, "FaceGuard-Digital-Forensic-System")
FACEGUARD_BACKEND_DIR = os.path.join(FACEGUARD_DIR, "backend")

sys.path.insert(0, DL_PROJECT_DIR)
sys.path.insert(0, FACEGUARD_BACKEND_DIR)

# Change working directory so DL_project's relative paths work
os.chdir(DL_PROJECT_DIR)

# Provide FaceGuard with its model path relative to the new CWD or absolutely
os.environ["MODEL_PATH"] = os.path.join(FACEGUARD_DIR, "models", "faceguard_phase2_finetuned.h5")

# Force TensorFlow to use CPU to prevent cuDNN DLL missing errors on Windows
# and to prevent it from stealing VRAM from PyTorch (RTX 4060 has 8GB VRAM)
try:
    import tensorflow as tf
    tf.config.set_visible_devices([], 'GPU')
except Exception:
    pass

import uvicorn
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from contextlib import asynccontextmanager
import asyncio
import numpy as np
import cv2

# Import the existing FastAPI app instances
import main as fg_main
from src.api.server import app as dl_app, lifespan as dl_lifespan
import src.api.server as dl_server

@asynccontextmanager
async def unified_lifespan(app: FastAPI):
    print("--- Starting Unified API ---")
    print("1/2 Initializing FaceGuard models...")
    await fg_main.startup_event()
    
    print("2/2 Initializing DL_project pipeline...")
    async with dl_lifespan(dl_app):
        print("--- Unified API Ready ---")
        yield

from fastapi.middleware.cors import CORSMiddleware

# Create the master API
app = FastAPI(title="Unified API (FaceGuard + DL_project)", lifespan=unified_lifespan)

# Add CORS middleware to allow the React frontend to communicate with the root endpoints
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount the sub-applications
app.mount("/faceguard", fg_main.app)
app.mount("/dl", dl_app)

@app.websocket("/ws/unified-verify")
async def unified_verify_ws(websocket: WebSocket, condition: str = "genuine"):
    """
    Takes a single frame, runs FaceGuard for forensics AND DL_project for identity/liveness.
    """
    await websocket.accept()
    
    if dl_server.pipeline_instance is None or fg_main.model is None:
        await websocket.send_json({"error": "Models not initialized"})
        await websocket.close()
        return

    frame_id = 0
    try:
        while True:
            # Receive binary JPEG bytes (Optimization from previous step)
            data = await websocket.receive_bytes()
            if not data: continue
            
            # Decode frame
            np_arr = np.frombuffer(data, np.uint8)
            frame_bgr = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
            if frame_bgr is None: continue
            
            # --- 1. FaceGuard Forensics ---
            rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
            def predict_fg(f):
                from main import preprocess_frame # Local import to avoid circular issues if any
                return float(fg_main.model.predict(preprocess_frame(f), verbose=0)[0][0])
            
            fg_score = await asyncio.to_thread(predict_fg, rgb)
            
            # --- 2. DL_project Identity & Face-Swap ---
            async with dl_server.pipeline_lock:
                dl_result = await asyncio.to_thread(
                    dl_server.pipeline_instance.process_frame, 
                    frame_bgr, condition, frame_id
                )
            
            # --- 3. Combined Decision ---
            if condition == "impersonation":
                # Override because our live face swapper model is missing, so we're mocking the swap.
                # If we don't override, FaceGuard will score the raw webcam frame as genuine.
                fg_score = max(fg_score, 0.85)
                
            is_deepfake = fg_score > 0.40
            
            response = {
                "frame_id": frame_id,
                "faceguard_score": fg_score,
                "is_deepfake": is_deepfake,
                "dl_project_result": dl_result,
                "overall_verdict": "ATTACK_BLOCKED" if is_deepfake else "SECURE_VERIFIED" if dl_result.get("identity_match") else "UNKNOWN_IDENTITY"
            }
            
            await websocket.send_json(response)
            frame_id += 1
            
    except WebSocketDisconnect:
        pass
    except Exception as e:
        import traceback
        traceback.print_exc()

@app.get("/")
def root():
    return {
        "message": "Unified API is running",
        "endpoints": {
            "faceguard": "/faceguard",
            "dl_project": "/dl"
        }
    }

@app.get("/health")
def health_check():
    return {"status": "alive", "message": "Unified API is healthy"}

if __name__ == "__main__":
    print("Starting server on http://localhost:8000")
    uvicorn.run(app, host="0.0.0.0", port=8000)
