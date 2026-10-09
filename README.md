# Adversarially Robust Identity Verification System

This repository unifies a state-of-the-art **Face Recognition Pipeline** (with adversarially trained face-swap impersonation detection) with **FaceGuard**, a digital forensic system for neural deepfake detection. 

## 🧠 System Architecture

The core concept of this system is an "Attack vs. Defense" dynamic:
1. **Model A (Identity):** Recognizes faces and matches identities.
2. **Deepfake Generator:** An adversarial face-swap module that generates synthetic impersonations designed to fool biometric systems.
3. **Model C (Forensics/Liveness):** FaceGuard's robust convolutional neural network that detects temporal artifacts, liveness indicators, and inconsistencies injected by deepfake models.

By unifying these two previously separate repositories, we can now pipe live webcam feeds or uploaded videos through a comprehensive pipeline that attempts a face swap, and immediately validates it against a forensics detector to make identity verification significantly harder to fool.

## 🚀 Quick Start (Docker)

The easiest way to run the entire unified system (Frontend + FastAPIs + GPU-accelerated Models) is using Docker Compose.

```bash
# 1. Start the unified stack
docker-compose up --build

# 2. Access the UI
# Navigate to http://localhost:3000
```

## 📂 Project Structure

*   `unified_api.py` - The master backend controller that seamlessly mounts both ML pipelines into a single FastAPI router on port `8000`.
*   `backend.Dockerfile` - A unified CUDA-enabled Ubuntu environment that natively resolves PyTorch and TensorFlow dependency clashes.
*   `DL_project/` - Contains the Face Recognition and Deepfake Generation logic.
*   `FaceGuard-Digital-Forensic-System/` - Contains the temporal deepfake detection model and the unified React UI.
*   `FaceGuard-Digital-Forensic-System/frontend/src/components/DeepfakeGenerator.tsx` - The migrated DL_project frontend, now integrated directly into FaceGuard's mode selector.

## 🔒 Security & Performance Features (v2)

Following a rigorous security and performance audit, this system now features:
- **Path Traversal Protection:** Enrollment routes heavily sanitize user input.
- **Asynchronous ML:** `cv2` and Keras/PyTorch inference blocks run inside `asyncio.to_thread()` pools, ensuring the WebSocket streaming remains strictly non-blocking.
- **Strict File Cleanup:** Memory leaks and hanging temporary files during video analysis have been patched with strict `finally` unlink blocks.

## 🛠️ Local Development (Without Docker)

1. **Install Unified Requirements:**
   ```bash
   pip install -r requirements.txt
   pip install "DL_project/insightface-0.7.3-cp310-cp310-win_amd64.whl"  # Windows only
   ```
2. **Start Backend:**
   ```bash
   uvicorn unified_api:app --host 0.0.0.0 --port 8000
   ```
3. **Start Frontend:**
   ```bash
   cd FaceGuard-Digital-Forensic-System/frontend
   npm install && npm start
   ```
