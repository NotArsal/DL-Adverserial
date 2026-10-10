# FaceGuard Documentation

Welcome to the official documentation for the **Face-Swap Impersonation vs. Identity Verification** project. 

This repository explores the vulnerability of standard facial recognition systems (ArcFace) to live face-swap attacks (e.g., InSwapper, Deep-Live-Cam), and demonstrates a robust, real-time defense mechanism using a custom MobileNetV2 swap detector.

## Table of Contents

1. [System Architecture](./architecture.md)
   * Explores the high-level flow, the FastAPI backend, the React frontend, and how the ArcFace and MobileNetV2 models integrate.
2. [Security and Observability](./security.md)
   * Details the enterprise-grade hardening (OriginGuard, CSWSH protection) and the native OpenTelemetry tracing pipeline.
3. [Evaluation & Limitations](./evaluation.md)
   * Provides an academically honest breakdown of the system's performance, its threat model (Presentation Attacks), and its known limitations.

## Quick Start Reference

To run the local demonstration, ensure you have Python 3.10+ and Node.js 18+ installed.

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Enroll a demo identity
python make_demo_identity.py
python enroll_user.py YourName --webcam

# 3. Start the FastAPI backend
uvicorn unified_api:app --host 127.0.0.1 --port 8001

# 4. Start the React frontend (in a new terminal)
cd FaceGuard-Digital-Forensic-System/frontend
npm install
npm start
```

For more details on the training pipelines and data generation, please refer to the experiments located in the `DL_project/` directory.
