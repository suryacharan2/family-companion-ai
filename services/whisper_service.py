import os
import httpx
import tempfile
from pathlib import Path

SARVAM_API_KEY = os.getenv("SARVAM_API_KEY", "")

# Map app language codes to Sarvam BCP-47 codes
LANGUAGE_MAP = {
    "en":   "en-IN",
    "hi":   "hi-IN",
    "ta":   "ta-IN",
    "te":   "te-IN",
    "es":   "en-IN",
    "fr":   "en-IN",
    "ar":   "en-IN",
    "auto": None,
}

def detect_audio_format(audio_bytes: bytes) -> tuple[str, str]:
    """
    Detect actual audio format from file magic bytes.
    Returns (suffix, content_type)
    """
    if audio_bytes[:4] == b'OggS':
        return ".ogg", "audio/ogg"
    elif audio_bytes[:4] == b'RIFF':
        return ".wav", "audio/wav"
    elif audio_bytes[:3] == b'ID3' or audio_bytes[:2] == b'\xff\xfb':
        return ".mp3", "audio/mpeg"
    elif audio_bytes[:4] == b'fLaC':
        return ".flac", "audio/flac"
    elif audio_bytes[4:8] == b'ftyp':
        return ".m4a", "audio/mp4"
    else:
        # Browser MediaRecorder usually outputs webm
        return ".webm", "audio/webm"


async def transcribe_audio(audio_path: str, language: str = "auto") -> dict:
    if not SARVAM_API_KEY:
        raise RuntimeError("SARVAM_API_KEY not set in environment variables")
    if not Path(audio_path).exists():
        raise FileNotFoundError(f"Audio file not found: {audio_path}")

    lang_code   = LANGUAGE_MAP.get(language, None)
    audio_bytes = Path(audio_path).read_bytes()

    # Detect real format from magic bytes instead of trusting file extension
    suffix, content_type = detect_audio_format(audio_bytes)
    filename = f"audio{suffix}"

    print(f"STT: detected format={suffix}, size={len(audio_bytes)}B, lang={language}")

    files = {"file": (filename, audio_bytes, content_type)}
    data  = {
        "model": "saaras:v3",
        "mode":  "transcribe",
    }
    if lang_code:
        data["language_code"] = lang_code

    headers = {"api-subscription-key": SARVAM_API_KEY}

    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            "https://api.sarvam.ai/speech-to-text",
            headers=headers,
            files=files,
            data=data,
        )

    if resp.status_code != 200:
        print(f"Sarvam error response: {resp.text}")
        raise RuntimeError(f"Sarvam STT error {resp.status_code}: {resp.text}")

    result        = resp.json()
    transcript    = result.get("transcript", "")
    detected_lang = result.get("language_code", language)

    print(f"✅ Sarvam STT: [{detected_lang}] {transcript}")

    return {
        "text":       transcript,
        "language":   detected_lang,
        "confidence": 1.0,
    }


async def transcribe(audio_bytes: bytes, language: str = "auto") -> dict:
    """
    Called from voice.py — accepts raw bytes, detects format,
    saves to temp file with correct extension, calls Sarvam.
    """
    # Detect format first so temp file has correct extension
    suffix, _ = detect_audio_format(audio_bytes)

    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(audio_bytes)
        tmp_path = tmp.name

    try:
        result = await transcribe_audio(tmp_path, language=language)
        return result
    except Exception as e:
        print(f"Sarvam transcribe error: {e}")
        return {"text": "", "language": language, "confidence": 0.0, "error": str(e)}
    finally:
        try:
            os.remove(tmp_path)
        except:
            pass