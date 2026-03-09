from fastapi import APIRouter, BackgroundTasks, HTTPException, Depends
from fastapi.responses import FileResponse
from pydantic import BaseModel
from pathlib import Path
from sqlalchemy.orm import Session
import os, uuid, traceback
from database import get_db, AvatarProfile
from routes.auth import get_current_user
from services.wav2lip_runner import generate_talking_video

router = APIRouter()

OUTPUTS_DIR = Path(__file__).parent.parent / "outputs"
OUTPUTS_DIR.mkdir(exist_ok=True)

job_status = {}

class VideoRequest(BaseModel):
    relation: str
    audio_url: str

def _run_video_job(job_id: str, face_path: str, audio_path: str, output_filename: str):
    try:
        job_status[job_id] = {"status": "processing", "video_url": None, "error": None}
        output_path = generate_talking_video(face_path, audio_path, output_filename)
        video_url = f"http://localhost:8000/api/video/file/{output_filename}"
        job_status[job_id] = {"status": "done", "video_url": video_url, "error": None}
    except Exception as e:
        traceback.print_exc()
        job_status[job_id] = {"status": "failed", "video_url": None, "error": str(e)}

@router.post("/api/video/generate")
async def generate_video(
    request: VideoRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    profile = db.query(AvatarProfile).filter(
        AvatarProfile.user_id == current_user.id,
        AvatarProfile.relation_type == request.relation,
    ).first()
    if not profile or not profile.local_filename:
        raise HTTPException(status_code=404, detail="No avatar photo found.")

    face_path = str(Path(__file__).parent.parent / "avatars" / profile.local_filename)
    if not os.path.exists(face_path):
        raise HTTPException(status_code=404, detail="Avatar photo file not found.")

    # Extract just the filename from the URL — works regardless of /tts/file/ or /api/tts/file/
    audio_filename = request.audio_url.rstrip("/").split("/")[-1]
    audio_path = str(OUTPUTS_DIR / audio_filename)

    if not os.path.exists(audio_path):
        raise HTTPException(
            status_code=404,
            detail=f"Audio file not found: {audio_filename}. Make sure TTS ran successfully first."
        )

    job_id = uuid.uuid4().hex[:12]
    output_filename = f"talking_{current_user.id}_{request.relation}_{job_id}.mp4"
    job_status[job_id] = {"status": "pending", "video_url": None, "error": None}
    background_tasks.add_task(_run_video_job, job_id, face_path, audio_path, output_filename)
    return {"job_id": job_id, "status": "pending"}

@router.get("/api/video/status/{job_id}")
async def get_video_status(job_id: str):
    if job_id not in job_status:
        raise HTTPException(status_code=404, detail="Job not found")
    status = job_status[job_id]
    return {
        "job_id": job_id,
        "status": status["status"],
        "video_url": status.get("video_url"),
        "error": status.get("error"),
    }

@router.get("/api/video/file/{filename}")
async def serve_video(filename: str):
    if not filename.endswith(".mp4") or ".." in filename:
        raise HTTPException(status_code=400, detail="Invalid filename")
    filepath = OUTPUTS_DIR / filename
    if not filepath.exists():
        raise HTTPException(status_code=404, detail="Video not found")
    return FileResponse(
        str(filepath), media_type="video/mp4",
        headers={"Cache-Control": "no-cache"}
    )