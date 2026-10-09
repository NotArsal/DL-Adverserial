import os
import insightface
import cv2

class NativeInSwapper:
    def __init__(self, model_path="models/inswapper_128.onnx"):
        self.model_path = model_path
        self.is_mock = False
        if not os.path.exists(model_path):
            print(f"Warning: {model_path} not found. Running in MOCK swap mode.")
            self.swapper = None
            self.is_mock = True
        else:
            self.swapper = insightface.model_zoo.get_model(model_path, download=False, download_zip=False)
        self.source_face = None

    def set_source_face(self, source_face):
        """
        Sets the source identity (e.g. Alice) to be swapped onto the live webcam feed.
        source_face should be an insightface Face object.
        """
        self.source_face = source_face

    def process_frame(self, target_frame_bgr, target_faces):
        """
        Swaps the source_face onto the target_faces in the target_frame.
        target_faces should be a list of insightface Face objects detected in the target_frame.
        """
        if self.source_face is None:
            return target_frame_bgr
        
        if not target_faces:
            return target_frame_bgr
            
        result_frame = target_frame_bgr.copy()
        
        if self.is_mock:
            # Just draw a red box and text to indicate "Simulated Deepfake"
            for face in target_faces:
                box = face.bbox.astype(int)
                cv2.rectangle(result_frame, (box[0], box[1]), (box[2], box[3]), (0, 0, 255), 2)
                cv2.putText(result_frame, "SIMULATED DEEPFAKE", (box[0], box[1] - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)
            return result_frame
            
        # Swap onto all detected faces in the target frame
        for face in target_faces:
            result_frame = self.swapper.get(result_frame, face, self.source_face, paste_back=True)
            
        return result_frame
