"""Full-stack smoke test: boots unified_api (real models) and sends real webcam-style frames over the WebSocket.
Needs models/swapdet_adversarial.pt (python train_swapdet.py). Usage: python smoke_unified.py"""
import os, sys, cv2
from fastapi.testclient import TestClient
import unified_api

LIVE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "DL_project", "experiments", "live_demo")
CASES = [  # (frame, condition sent by the client, what a sane system must do)
    ("manual/diagnostic_genuine.jpg", "genuine", {"SECURE_VERIFIED", "UNKNOWN_IDENTITY"}),         # real face: never an attack
    ("manual/diagnostic_impersonation.jpg", "genuine", {"ATTACK_BLOCKED"}),                      # already-swapped webcam frame
    ("manual/diagnostic_genuine.jpg", "impersonation", {"ATTACK_BLOCKED"}),                      # server applies the live swap
]

def verdicts(client, path, condition, n=4):
    img = cv2.imread(os.path.join(LIVE, path)); ok, buf = cv2.imencode(".jpg", img); out = []
    with client.websocket_connect(f"/ws/unified-verify?condition={condition}") as ws:
        for _ in range(n):
            ws.send_bytes(buf.tobytes()); out.append(ws.receive_json())
    return out

if __name__ == "__main__":
    failed = 0
    with TestClient(unified_api.app) as client:
        for path, cond, allowed in CASES:
            r = verdicts(client, path, cond)[-1]
            ok = r.get("overall_verdict") in allowed; failed += not ok
            print(f"{'PASS' if ok else 'FAIL'}  {path} [{cond}] -> {r.get('overall_verdict')}  P(swap)={r.get('swap_probability')}  id={r.get('identity')}  | {r.get('reason')}")
    sys.exit(1 if failed else 0)
