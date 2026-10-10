# System Architecture

The FaceGuard Digital Forensic System is designed as a highly modular, decoupled application split into three distinct layers: the AI engine, the backend API, and the frontend user interface.

## High-Level Flow

1. **Webcam / Upload Source**: A user submits a video stream or image (via React frontend).
2. **FastAPI Backend**: Receives the frames, handles structural validations, and applies security constraints (OriginGuard).
3. **AI Engine (Python)**:
   - **Identity Recognition**: Frames are processed by ArcFace (`buffalo_l`) to establish an identity match against enrolled users.
   - **Swap Detection**: Concurrently, the frame's face crop is evaluated by a custom MobileNetV2 model to determine if the face is a synthetic swap.
4. **Verdict Logic**: The `decide()` function temporally smoothes the swap probabilities over an 8-frame window. If the mean probability exceeds the threshold (0.3), the system vetoes the identity match.
5. **WebSocket / SSE Return**: The final verdict is streamed back to the frontend.

## Components

### 1. The Models
- **ArcFace (`buffalo_l`)**: An industry-standard facial recognition model running on ONNX Runtime. It extracts a 512-dimensional feature vector to compare against enrolled templates.
- **MobileNetV2 Swap Detector**: A lightweight convolutional neural network fine-tuned on FaceForensics++ and InSwapper data. It evaluates a tightly cropped face region for artifacts indicative of a live swap.

### 2. The Backend (`unified_api.py`)
Built on FastAPI, the backend provides both REST endpoints (for enrollment and static file uploads) and a high-performance WebSocket endpoint (`/ws/webcam`) for real-time video stream analysis. The backend natively supports OpenTelemetry for deep performance tracing.

### 3. The Frontend
A React-based single-page application (SPA) providing a modern, glassmorphic UI. It handles real-time canvas rendering of the webcam feed, bounding box overlays, and asynchronous communication with the backend. It also utilizes OpenTelemetry web instrumentations to trace user interactions.

## Data Flow Diagram

```mermaid
flowchart TD
    Client[React Client] -->|WebSocket| API[FastAPI Backend]
    API -->|Extract Frame| FaceCrop[Face Cropping]
    
    FaceCrop -->|Full Frame| ArcFace[ArcFace Model]
    FaceCrop -->|Cropped Face| SwapDet[MobileNetV2 Detector]
    
    ArcFace -->|Similarity Score| Logic[Decision Logic]
    SwapDet -->|P(swap)| Logic
    
    Logic -->|Temporal Smoothing| Verdict[Final Verdict]
    Verdict -->|JSON Response| Client
```
