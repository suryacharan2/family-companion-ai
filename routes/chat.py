import json
import re
import traceback
from datetime import datetime

from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from schemas import ChatRequest, ChatResponse
from services.ai_service import (
    generate_response,
    generate_response_stream,
    detect_emotion,
    is_noise_transcription,
)
from database import get_db, Message, LongTermMemory

router = APIRouter()


def fetch_memories(db: Session, user_id: int, relation: str):
    """Fetch all long-term memories for this user+relation."""
    if not user_id:
        return []
    try:
        records = db.query(LongTermMemory).filter(
            LongTermMemory.user_id == user_id,
            LongTermMemory.relation_type == relation,
        ).all()
        return [{"fact_key": m.fact_key, "fact_value": m.fact_value} for m in records]
    except Exception:
        return []


def save_memory(db: Session, user_id: int, relation: str, user_message: str, ai_response: str):
    """Extract and save key facts from conversation to long-term memory."""
    if not user_id:
        return
    try:
        memories_to_save = []
        msg = user_message.lower()

        # Name — capture full name (two words)
        m = re.search(r"my name is ([a-zA-Z]+(?: [a-zA-Z]+)?)", msg)
        if m:
            memories_to_save.append(("user_name", m.group(1).title()))

        # Age
        m = re.search(r"i(?:'m| am) (\d+)(?: years old)?", msg)
        if m:
            memories_to_save.append(("user_age", m.group(1)))

        # Job/study
        for pattern in [r"i (?:work as|am a|study) (.+?)(?:\.|,|$)", r"my job is (.+?)(?:\.|,|$)"]:
            m = re.search(pattern, msg)
            if m:
                memories_to_save.append(("occupation", m.group(1).strip()[:100]))

        # Location
        m = re.search(r"i (?:live|stay|am from) (?:in |at )?(.+?)(?:\.|,|$)", msg)
        if m:
            memories_to_save.append(("location", m.group(1).strip()[:100]))

        # Feelings/emotions
        for kw in ["feeling", "feel", "stressed", "happy", "sad", "anxious", "excited", "lonely"]:
            if kw in msg:
                memories_to_save.append(("recent_emotion", user_message.strip()[:150]))
                break

        # Hobbies/interests
        m = re.search(r"i (?:love|like|enjoy|hate) (.+?)(?:\.|,|$)", msg)
        if m:
            memories_to_save.append(("interest", m.group(1).strip()[:100]))

        # Save all extracted facts
        for fact_key, fact_value in memories_to_save:
            existing = db.query(LongTermMemory).filter(
                LongTermMemory.user_id == user_id,
                LongTermMemory.relation_type == relation,
                LongTermMemory.fact_key == fact_key,
            ).first()
            if existing:
                existing.fact_value = fact_value
                existing.last_updated = datetime.utcnow()
            else:
                db.add(LongTermMemory(
                    user_id=user_id,
                    relation_type=relation,
                    fact_key=fact_key,
                    fact_value=fact_value,
                    confidence=1.0,
                ))
        db.commit()
    except Exception:
        traceback.print_exc()


@router.post("/api/chat/stream")
async def chat_stream(request: ChatRequest, db: Session = Depends(get_db)):
    if is_noise_transcription(request.message):
        raise HTTPException(status_code=400, detail="Message appears to be noise.")

    emotion = detect_emotion(request.message)
    relation = (
        request.relation_type.value
        if hasattr(request.relation_type, "value")
        else request.relation_type
    )

    # Fetch memories BEFORE streaming so AI knows about the user
    memories = fetch_memories(db, request.user_id, relation)

    def event_generator():
        full_response = ""
        try:
            for chunk in generate_response_stream(
                relation_type=relation,
                user_message=request.message,
                conversation_history=request.conversation_history or [],
                language=request.language or "en",
                memories=memories,
            ):
                full_response += chunk
                yield f"data: {json.dumps({'chunk': chunk, 'done': False})}\n\n"

            # Save messages to history
            try:
                db.add(Message(
                    user_id=request.user_id, relation_type=relation,
                    role="user", content=request.message, emotion=emotion,
                ))
                db.add(Message(
                    user_id=request.user_id, relation_type=relation,
                    role="assistant", content=full_response, emotion=emotion,
                ))
                db.commit()
            except Exception:
                traceback.print_exc()

            # Extract and save new memories from this message
            save_memory(db, request.user_id, relation, request.message, full_response)

            yield f"data: {json.dumps({'chunk': '', 'emotion': emotion, 'done': True, 'full_response': full_response})}\n\n"

        except Exception as e:
            traceback.print_exc()
            yield f"data: {json.dumps({'error': str(e), 'done': True})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Access-Control-Allow-Origin": "*",
        },
    )


@router.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest, db: Session = Depends(get_db)):
    try:
        if is_noise_transcription(request.message):
            raise HTTPException(status_code=400, detail="Message appears to be noise.")

        emotion = detect_emotion(request.message)
        relation = (
            request.relation_type.value
            if hasattr(request.relation_type, "value")
            else request.relation_type
        )

        # Fetch memories before generating response
        memories = fetch_memories(db, request.user_id, relation)

        ai_response = await generate_response(
            relation_type=relation,
            user_message=request.message,
            conversation_history=request.conversation_history or [],
            language=request.language or "en",
            memories=memories,
        )

        db.add(Message(
            user_id=request.user_id, relation_type=relation,
            role="user", content=request.message, emotion=emotion,
        ))
        db.add(Message(
            user_id=request.user_id, relation_type=relation,
            role="assistant", content=ai_response, emotion=emotion,
        ))
        db.commit()

        save_memory(db, request.user_id, relation, request.message, ai_response)

        return ChatResponse(
            response=ai_response,
            emotion_detected=emotion,
            relation_type=relation,
            timestamp=datetime.utcnow().isoformat(),
        )
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))