import os
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from database import get_db, User, AvatarProfile
from routes.auth import get_current_user

router = APIRouter()

AVATAR_DIR = os.path.join(os.path.dirname(__file__), "..", "avatars")
os.makedirs(AVATAR_DIR, exist_ok=True)

ALLOWED_TYPES = {"image/jpeg", "image/jpg", "image/png", "image/webp"}
MAX_SIZE = 5 * 1024 * 1024


@router.post("/api/avatar/upload")
async def upload_avatar(
    image: UploadFile = File(...),
    relation: str = Form(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if image.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail="Only JPG, PNG, or WebP images allowed.")
    image_bytes = await image.read()
    if len(image_bytes) > MAX_SIZE:
        raise HTTPException(status_code=400, detail="Image must be under 5MB.")

    filename = f"user_{current_user.id}_{relation}.jpg"
    filepath = os.path.join(AVATAR_DIR, filename)
    with open(filepath, "wb") as f:
        f.write(image_bytes)

    hosted_url = f"http://localhost:8000/api/avatar/image/{filename}"

    existing = db.query(AvatarProfile).filter(
        AvatarProfile.user_id == current_user.id,
        AvatarProfile.relation_type == relation,
    ).first()
    if existing:
        existing.image_url = hosted_url
        existing.local_filename = filename
    else:
        profile = AvatarProfile(
            user_id=current_user.id,
            relation_type=relation,
            image_url=hosted_url,
            local_filename=filename,
        )
        db.add(profile)
    db.commit()
    return {"success": True, "image_url": hosted_url, "relation": relation}


@router.get("/api/avatar/image/{filename}")
async def serve_avatar_image(filename: str):
    filepath = os.path.join(AVATAR_DIR, filename)
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="Image not found")
    return FileResponse(filepath)


@router.get("/api/avatar/{relation}")
async def get_avatar(
    relation: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    profile = db.query(AvatarProfile).filter(
        AvatarProfile.user_id == current_user.id,
        AvatarProfile.relation_type == relation,
    ).first()
    if not profile:
        return {"has_avatar": False}
    return {"has_avatar": True, "image_url": profile.image_url, "relation": relation}


@router.delete("/api/avatar/remove/{relation}")
async def remove_avatar(
    relation: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    profile = db.query(AvatarProfile).filter(
        AvatarProfile.user_id == current_user.id,
        AvatarProfile.relation_type == relation,
    ).first()
    if profile:
        if profile.local_filename:
            filepath = os.path.join(AVATAR_DIR, profile.local_filename)
            if os.path.exists(filepath):
                os.remove(filepath)
        db.delete(profile)
        db.commit()
    return {"success": True}


@router.post("/api/avatar/talk")
async def generate_talking_video(
    relation: str = Form(...),
    audio_base64: str = Form(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    raise HTTPException(status_code=501, detail="Talking video not enabled.")