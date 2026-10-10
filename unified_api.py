import sys
import os
import torch  # noqa: F401  must load before onnxruntime so it finds torch's CUDA 12 / cuDNN 9 DLLs

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

sys.path.insert(0, ROOT_DIR)
from swapdet import SwapDetector, decide
MAX_FRAME_BYTES = 2 * 1024 * 1024
# P(swap) at/above this blocks the attempt, even if ArcFace matches an identity. 0.8 (not 0.5) leaves margin for webcam domain shift:
# real webcam frames score 0.3-0.5, a live InSwapper frame ~1.0. Held-out test: ~90% of swaps caught at ~1% false alarms (eval_results/system_results.json).
SWAP_THRESHOLD = 0.8
EMA_ALPHA = 0.5        # temporal smoothing of P(swap) across frames
swap_detector = None

@asynccontextmanager
async def unified_lifespan(app: FastAPI):
    print("--- Starting Unified API ---")
    print("1/3 Initializing FaceGuard models (used by the /faceguard video/image forensics endpoints)...")
    await fg_main.startup_event()
    
    print("2/3 Loading adversarially-trained swap detector...")
    global swap_detector
    swap_detector = SwapDetector()
    print("3/3 Initializing DL_project pipeline...")
    async with dl_lifespan(dl_app):
        print("--- Unified API Ready ---")
        yield

from fastapi.middleware.cors import CORSMiddleware

# Create the master API
app = FastAPI(title="Unified API (FaceGuard + DL_project)", lifespan=unified_lifespan)

# Add CORS middleware to allow the React frontend to communicate with the root endpoints
app.add_middleware(
    CORSMiddleware,
    allow_origins=fg_main.ALLOWED_ORIGINS,
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
    Per frame: ArcFace identity (+ optional InSwapper attack when condition=impersonation), then the
    adversarially-trained swap detector, which can veto an identity match.
    """
    await websocket.accept()
    
    if dl_server.pipeline_instance is None or fg_main.model is None:
        await websocket.send_json({"error": "Models not initialized"})
        await websocket.close()
        return

    if condition == "impersonation" and dl_server.pipeline_instance.swapper.source_face is None:
        await websocket.send_json({"error": "Attack simulation needs a source identity to impersonate. Run `python make_demo_identity.py` (or enroll one in the Deepfake Generator tab), then restart."})
        await websocket.close()
        return

    frame_id = 0
    ema_p = None
    try:
        while True:
            # Receive binary JPEG bytes (Optimization from previous step)
            data = await websocket.receive_bytes()
            if not data or len(data) > MAX_FRAME_BYTES: continue  # drop empty/oversized frames
            
            # Decode frame
            np_arr = np.frombuffer(data, np.uint8)
            frame_bgr = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
            if frame_bgr is None: continue
            
            # --- 1. Identity (ArcFace) + optional simulated swap attack (InSwapper) ---
            async with dl_server.pipeline_lock:
                dl_result = await asyncio.to_thread(
                    dl_server.pipeline_instance.process_frame, 
                    frame_bgr, condition, frame_id
                )
                scored_bgr = dl_server.pipeline_instance.last_processed_frame
                bbox = dl_server.pipeline_instance.last_face_bbox
            
            # --- 2. Swap detector on the face crop of the frame the verifier actually sees ---
            if bbox is None:
                ema_p = None  # no face: reset temporal state
                p_swap = None
            else:
                p_raw = await asyncio.to_thread(swap_detector.p_swap, scored_bgr, bbox)
                ema_p = p_raw if ema_p is None else EMA_ALPHA * p_raw + (1 - EMA_ALPHA) * ema_p
                p_swap = ema_p
            
            # --- 3. Decision: the detector can veto an identity match ---
            identity = dl_result.get("matched_identity")
            id_ok = bool(dl_result.get("model_a_accept"))
            verdict, reason = decide(p_swap, id_ok, identity, SWAP_THRESHOLD)
            
            response = {
                "frame_id": frame_id,
                "condition": condition,
                "swap_probability": p_swap,
                "identity": identity if id_ok else None,
                "identity_similarity": dl_result.get("model_a_similarity"),
                "identity_accepted_by_arcface": id_ok,
                "swap_applied": dl_result.get("swap_applied"),
                "overall_verdict": verdict,
                "reason": reason,
                "dl_project_result": dl_result,
            }
            
            await websocket.send_json(response)
            frame_id += 1
            
    except WebSocketDisconnect:
        pass
    except Exception as e:
        import traceback
        traceback.print_exc()
        try:  # fail closed and tell the UI, instead of silently freezing the last verdict
            await websocket.send_json({"error": f"Verification error: {type(e).__name__}"})
        except Exception:
            pass

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
