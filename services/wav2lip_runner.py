import os
import subprocess
import uuid
import cv2
import numpy as np
from pathlib import Path

BASE_DIR           = Path(__file__).parent.parent
WAV2LIP_DIR        = BASE_DIR.parent / "Wav2Lip"
WAV2LIP_PYTHON     = WAV2LIP_DIR / "wav2lip_env" / "Scripts" / "python.exe"
WAV2LIP_INFERENCE  = WAV2LIP_DIR / "inference.py"
WAV2LIP_CHECKPOINT = WAV2LIP_DIR / "checkpoints" / "wav2lip_gan.pth"
OUTPUTS_DIR        = BASE_DIR / "outputs"
OUTPUTS_DIR.mkdir(exist_ok=True)

# OpenCV face detector
FACE_CASCADE_PATH = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
face_cascade = cv2.CascadeClassifier(FACE_CASCADE_PATH)


def prepare_face_image(image_path: str) -> str:
    """
    Load image, detect face, crop tightly around face only,
    then resize to 720px height. This prevents Wav2Lip double-face ghost
    by removing neck/body from the input.
    """
    img = cv2.imread(image_path, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError(f"Could not read image: {image_path}")
    if len(img.shape) == 3 and img.shape[2] == 4:
        img = cv2.cvtColor(img, cv2.COLOR_BGRA2BGR)

    h, w = img.shape[:2]
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # Detect face
    faces = face_cascade.detectMultiScale(
        gray, scaleFactor=1.1, minNeighbors=5, minSize=(80, 80)
    )

    if len(faces) > 0:
        # Use largest detected face
        faces = sorted(faces, key=lambda f: f[2] * f[3], reverse=True)
        fx, fy, fw, fh = faces[0]

        # Add padding around face: 60% top, 40% bottom, 30% sides
        pad_top    = int(fh * 0.60)
        pad_bottom = int(fh * 0.40)
        pad_side   = int(fw * 0.30)

        x1 = max(0, fx - pad_side)
        y1 = max(0, fy - pad_top)
        x2 = min(w, fx + fw + pad_side)
        y2 = min(h, fy + fh + pad_bottom)

        img = img[y1:y2, x1:x2]
        print(f"✅ Face detected and cropped: ({x1},{y1}) to ({x2},{y2})")
    else:
        # No face detected — use top 80% of image (removes body/background at bottom)
        img = img[:int(h * 0.80), :]
        print("⚠️ No face detected — using top 80% of image")

    # Resize to 720px height
    ch, cw = img.shape[:2]
    scale = 720 / ch
    img = cv2.resize(img, (int(cw * scale), 720))

    prepared_path = str(OUTPUTS_DIR / f"prep_{uuid.uuid4().hex[:8]}.jpg")
    cv2.imwrite(prepared_path, img, [cv2.IMWRITE_JPEG_QUALITY, 95])
    return prepared_path


def crop_and_sharpen_video(input_path: str, output_path: str) -> bool:
    """
    Crop Wav2Lip output to a centered square and sharpen.
    Since input photo is now face-only, the video should be well centered.
    """
    try:
        # Get video dimensions first
        probe = subprocess.run([
            "ffprobe", "-v", "quiet", "-select_streams", "v:0",
            "-show_entries", "stream=width,height",
            "-of", "csv=p=0", input_path
        ], capture_output=True, text=True)

        dims = probe.stdout.strip().split(",")
        if len(dims) == 2:
            vid_w, vid_h = int(dims[0]), int(dims[1])
            # Crop to square from center
            size = min(vid_w, vid_h)
            x = (vid_w - size) // 2
            y = (vid_h - size) // 2
            # Shift crop up slightly to center on face not chin
            y = max(0, y - int(size * 0.05))
            crop_filter = f"crop={size}:{size}:{x}:{y}"
        else:
            crop_filter = "crop=528:528:0:96"

        cmd = [
            "ffmpeg", "-y",
            "-i", input_path,
            "-vf", f"{crop_filter},unsharp=5:5:1.0:5:5:0.0",
            "-c:v", "libx264",
            "-crf", "18",
            "-preset", "fast",
            "-c:a", "copy",
            output_path
        ]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
        if result.returncode == 0:
            print("✅ Video cropped and sharpened successfully")
            return True
        else:
            print(f"crop_and_sharpen failed: {result.stderr}")
            return False
    except Exception as e:
        print(f"Crop/sharpen failed: {e}")
        return False


def generate_talking_video(face_image_path: str, audio_path: str, output_filename: str = None) -> str:
    if not os.path.exists(face_image_path):
        raise FileNotFoundError(f"Face image not found: {face_image_path}")
    if not os.path.exists(audio_path):
        raise FileNotFoundError(f"Audio file not found: {audio_path}")
    if not WAV2LIP_PYTHON.exists():
        raise RuntimeError(f"Wav2Lip Python not found: {WAV2LIP_PYTHON}")
    if not WAV2LIP_CHECKPOINT.exists():
        raise RuntimeError(f"Wav2Lip checkpoint not found: {WAV2LIP_CHECKPOINT}")

    prepared_face = prepare_face_image(face_image_path)

    if not output_filename:
        output_filename = f"talking_{uuid.uuid4().hex[:8]}.mp4"

    raw_output_path   = str(OUTPUTS_DIR / f"raw_{output_filename}")
    final_output_path = str(OUTPUTS_DIR / output_filename)

    try:
        cmd = [
            str(WAV2LIP_PYTHON),
            str(WAV2LIP_INFERENCE),
            "--checkpoint_path", str(WAV2LIP_CHECKPOINT),
            "--face",    prepared_face,
            "--audio",   audio_path,
            "--outfile", raw_output_path,
            "--resize_factor", "1",
            "--nosmooth",
            "--pads", "0", "10", "0", "0",
        ]
        result = subprocess.run(
            cmd, capture_output=True, text=True, timeout=120, cwd=str(WAV2LIP_DIR),
        )
        if result.returncode != 0:
            raise RuntimeError(f"Wav2Lip failed:\n{result.stderr}")
        if not os.path.exists(raw_output_path):
            raise RuntimeError("Wav2Lip ran but output file not created")

        # Crop to square + sharpen
        success = crop_and_sharpen_video(raw_output_path, final_output_path)
        if success and os.path.exists(final_output_path):
            return final_output_path
        else:
            os.rename(raw_output_path, final_output_path)
            return final_output_path

    finally:
        if os.path.exists(prepared_face):
            os.remove(prepared_face)
        if os.path.exists(raw_output_path):
            try:
                os.remove(raw_output_path)
            except:
                pass