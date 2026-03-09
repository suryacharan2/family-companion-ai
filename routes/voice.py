import uuid
import traceback
from pathlib import Path
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from fastapi.responses import Response, FileResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from services.whisper_service import transcribe
from services.tts_service import synthesize_speech

router = APIRouter(prefix="/api")

OUTPUTS_DIR = Path(__file__).parent.parent / "outputs"
OUTPUTS_DIR.mkdir(exist_ok=True)

security = HTTPBearer(auto_error=False)


@router.post("/stt")
async def speech_to_text(
    audio: UploadFile = File(...),
    language: str = Form(default="auto"),
):
    try:
        audio_bytes = await audio.read()
        if len(audio_bytes) < 1000:
            raise HTTPException(status_code=400, detail="Audio too short.")

        result = await transcribe(audio_bytes, language=language)

        if result.get("error"):
            raise HTTPException(status_code=400, detail=result["error"])
        if not result.get("text"):
            raise HTTPException(status_code=400, detail="No speech detected.")

        return {
            "text":       result["text"],
            "language":   result["language"],
            "confidence": result.get("confidence", 1.0),
        }
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")


@router.post("/tts")
async def text_to_speech_endpoint(
    text: str = Form(...),
    relation: str = Form(default="mother"),
    emotion: str = Form(default="neutral"),
    language: str = Form(default="en"),
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    try:
        if not text.strip():
            raise HTTPException(status_code=400, detail="Text is required.")
        text = text[:500]
        audio_bytes = await synthesize_speech(
            text=text, relation=relation, emotion=emotion, language=language
        )
        audio_filename = f"tts_{uuid.uuid4().hex[:12]}.mp3"
        audio_path = OUTPUTS_DIR / audio_filename
        with open(audio_path, "wb") as f:
            f.write(audio_bytes)
        return Response(
            content=audio_bytes,
            media_type="audio/mpeg",
            headers={
                "Cache-Control": "no-cache",
                "X-Audio-Filename": audio_filename,
                "Access-Control-Expose-Headers": "X-Audio-Filename",
            },
        )
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"TTS failed: {str(e)}")


@router.get("/tts/file/{filename}")
async def serve_tts_audio(filename: str):
    if not filename.endswith(".mp3") or ".." in filename:
        raise HTTPException(status_code=400, detail="Invalid filename")
    filepath = OUTPUTS_DIR / filename
    if not filepath.exists():
        raise HTTPException(status_code=404, detail="Audio file not found")
    return FileResponse(str(filepath), media_type="audio/mpeg")