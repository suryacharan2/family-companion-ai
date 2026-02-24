"""
routes/chat.py - Chat endpoint
"""
from fastapi import APIRouter, HTTPException
from datetime import datetime
from schemas import ChatRequest, ChatResponse
from services.ai_service import generate_response, detect_emotion
from database import get_connection
import traceback

router = APIRouter()


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Main chat endpoint.
    Accepts a message + relation type, returns AI response.
    Saves conversation to database.
    """
    try:
        # Detect emotion from user's message
        emotion = detect_emotion(request.message)

        # Generate AI response
        ai_response = await generate_response(
            relation_type=request.relation_type.value,
            user_message=request.message,
            conversation_history=request.conversation_history or [],
        )

        # Save to database
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            """INSERT INTO conversations (user_id, relation_type, message, response, emotion)
               VALUES (?, ?, ?, ?, ?)""",
            (request.user_id, request.relation_type.value, request.message, ai_response, emotion)
        )
        conn.commit()
        conn.close()

        return ChatResponse(
            response=ai_response,
            emotion_detected=emotion,
            relation_type=request.relation_type.value,
            timestamp=datetime.utcnow().isoformat()
        )

    except Exception as e:
        # Print full error to backend console for debugging
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))