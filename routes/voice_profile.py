from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import get_db, VoiceProfile
from routes.auth import get_current_user

router = APIRouter(prefix="/api/voice-profile", tags=["voice-profile"])


class VoiceProfileCreate(BaseModel):
    relation_type: str
    voice_id: str
    voice_name: str = ""


@router.post("/save")
def save_voice_profile(
    req: VoiceProfileCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    existing = db.query(VoiceProfile).filter(
        VoiceProfile.user_id == current_user.id,
        VoiceProfile.relation_type == req.relation_type,
    ).first()

    if existing:
        existing.voice_id = req.voice_id
        existing.voice_name = req.voice_name
    else:
        db.add(VoiceProfile(
            user_id=current_user.id,
            relation_type=req.relation_type,
            voice_id=req.voice_id,
            voice_name=req.voice_name,
        ))
    db.commit()
    return {"status": "saved", "relation_type": req.relation_type, "voice_id": req.voice_id}


@router.get("/get/{relation_type}")
def get_voice_profile(
    relation_type: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    profile = db.query(VoiceProfile).filter(
        VoiceProfile.user_id == current_user.id,
        VoiceProfile.relation_type == relation_type,
    ).first()

    if not profile:
        return {"has_voice": False, "voice_id": None}

    return {
        "has_voice": True,
        "voice_id": profile.voice_id,
        "voice_name": profile.voice_name,
        "relation_type": profile.relation_type,
    }


@router.get("/all")
def get_all_voice_profiles(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    profiles = db.query(VoiceProfile).filter(
        VoiceProfile.user_id == current_user.id
    ).all()
    return {
        p.relation_type: {
            "voice_id": p.voice_id,
            "voice_name": p.voice_name,
        }
        for p in profiles
    }


@router.delete("/delete/{relation_type}")
def delete_voice_profile(
    relation_type: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    profile = db.query(VoiceProfile).filter(
        VoiceProfile.user_id == current_user.id,
        VoiceProfile.relation_type == relation_type,
    ).first()
    if profile:
        db.delete(profile)
        db.commit()
    return {"status": "deleted"}
