import sys
print(f"Python Version: {sys.version}")

try:
    import mediapipe as mp
    print("✅ MediaPipe imported successfully!")
    print(f"File location: {mp.__file__}")
    
    mp_face_detection = mp.solutions.face_detection
    print("✅ mp.solutions.face_detection is working!")
    
except ImportError as e:
    print(f"❌ ImportError: {e}")
    print("Run: pip install mediapipe")
except AttributeError as e:
    print(f"❌ AttributeError: {e}")
    print("⚠️ CRITICAL: You likely have a file named 'mediapipe.py' in your folder. Rename or delete it.")
except Exception as e:
    print(f"❌ Unknown Error: {e}")