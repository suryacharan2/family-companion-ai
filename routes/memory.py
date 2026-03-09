from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime
from database import get_db, LongTermMemory
from routes.auth import get_current_user

router = APIRouter()


class MemoryCreate(BaseModel):
    fact_key: str
    fact_value: str
    confidence: float = 1.0


class MemoryUpdate(BaseModel):
    fact_value: str


@router.get("/api/memory/{relation}")
async def get_memories(
    relation: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    memories = db.query(LongTermMemory).filter(
        LongTermMemory.user_id == current_user.id,
        LongTermMemory.relation_type == relation,
    ).all()
    return {
        "memories": [
            {
                "fact_key":   m.fact_key,
                "fact_value": m.fact_value,
                "confidence": m.confidence,
                "updated":    m.last_updated.isoformat() if m.last_updated else None,
            }
            for m in memories
        ]
    }


@router.post("/api/memory/{relation}")
async def add_memory(
    relation: str,
    body: MemoryCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    existing = db.query(LongTermMemory).filter(
        LongTermMemory.user_id == current_user.id,
        LongTermMemory.relation_type == relation,
        LongTermMemory.fact_key == body.fact_key,
    ).first()

    if existing:
        existing.fact_value = body.fact_value
        existing.confidence = body.confidence
        existing.last_updated = datetime.utcnow()
    else:
        db.add(LongTermMemory(
            user_id=current_user.id,
            relation_type=relation,
            fact_key=body.fact_key,
            fact_value=body.fact_value,
            confidence=body.confidence,
        ))
    db.commit()
    return {"success": True, "fact_key": body.fact_key}


@router.put("/api/memory/{relation}/{fact_key}")
async def update_memory(
    relation: str,
    fact_key: str,
    body: MemoryUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    mem = db.query(LongTermMemory).filter(
        LongTermMemory.user_id == current_user.id,
        LongTermMemory.relation_type == relation,
        LongTermMemory.fact_key == fact_key,
    ).first()
    if not mem:
        raise HTTPException(status_code=404, detail="Memory not found")
    mem.fact_value = body.fact_value
    mem.last_updated = datetime.utcnow()
    db.commit()
    return {"success": True}


@router.delete("/api/memory/{relation}/{fact_key}")
async def delete_memory(
    relation: str,
    fact_key: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    mem = db.query(LongTermMemory).filter(
        LongTermMemory.user_id == current_user.id,
        LongTermMemory.relation_type == relation,
        LongTermMemory.fact_key == fact_key,
    ).first()
    if not mem:
        raise HTTPException(status_code=404, detail="Memory not found")
    db.delete(mem)
    db.commit()
    return {"success": True}
