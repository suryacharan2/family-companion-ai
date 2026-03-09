from fastapi import APIRouter, Query, Depends
from typing import Optional
from sqlalchemy.orm import Session
from database import get_db, Message

router = APIRouter()

@router.get("/api/history")
def get_history(
    user_id: Optional[int] = Query(None),
    relation_type: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    query = db.query(Message).filter(Message.role == "user")
    if user_id:
        query = query.filter(Message.user_id == user_id)
    if relation_type:
        query = query.filter(Message.relation_type == relation_type)

    total = query.count()
    user_msgs = query.order_by(Message.created_at.desc()).offset(offset).limit(limit).all()

    conversations = []
    for um in user_msgs:
        reply = db.query(Message).filter(
            Message.relation_type == um.relation_type,
            Message.role == "assistant",
            Message.created_at >= um.created_at
        ).order_by(Message.created_at.asc()).first()

        conversations.append({
            "id": um.id,
            "user_id": um.user_id,
            "relation_type": um.relation_type,
            "message": um.content,
            "response": reply.content if reply else "",
            "emotion": reply.emotion if reply else "neutral",
            "timestamp": um.created_at.isoformat() if um.created_at else "",
        })

    return {"conversations": conversations, "total": total}
