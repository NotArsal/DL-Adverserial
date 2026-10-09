"""Enroll the person who will stand in front of the camera (the "genuine user"), WITHOUT changing the face-swap source.
Run this before the demo, in the same lighting/camera you will demo with, then restart the server.
  python enroll_user.py Arsal --webcam          # 6 snapshots, 1 s apart (look at the camera, vary your pose slightly)
  python enroll_user.py Arsal photo1.jpg photo2.jpg ..."""
import os, sys, time, tempfile
import cv2

ROOT = os.path.dirname(os.path.abspath(__file__)); DL = os.path.join(ROOT, "DL_project")
if len(sys.argv) < 3: sys.exit(__doc__)
name, args = sys.argv[1], sys.argv[2:]
paths = []
if args == ["--webcam"]:
    cap = cv2.VideoCapture(0, cv2.CAP_DSHOW if os.name == "nt" else 0)
    if not cap.isOpened(): sys.exit("Cannot open the camera.")
    tmp = tempfile.mkdtemp(); time.sleep(1.5)  # let auto-exposure settle
    for i in range(6):
        ok, frame = cap.read()
        if ok: p = os.path.join(tmp, f"{i}.jpg"); cv2.imwrite(p, frame); paths.append(p); print(f"captured {i + 1}/6"); time.sleep(1)
    cap.release()
else:
    paths = [os.path.abspath(a) for a in args]   # absolute before we chdir into DL_project

os.chdir(DL); sys.path.insert(0, DL)
from src.runtime.identity_pipeline import IdentityPipeline
pipe = IdentityPipeline(gallery_dir="experiments/live_demo/v4_gallery")
if not pipe.enroll(name, paths): sys.exit("Enrollment failed: no face detected in the images.")
print(f"Enrolled '{name}' from {len(paths)} image(s) into DL_project/experiments/live_demo/v4_gallery. Restart the server.")
