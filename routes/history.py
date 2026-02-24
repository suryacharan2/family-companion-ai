"""
routes/history.py - Chat history endpoint
"""
from fastapi import APIRouter, Query
from typing import Optional
from schemas import HistoryResponse, ConversationRecord
from database import get_connection

router = APIRouter()


@router.get("/history", response_model=HistoryResponse)
async def get_history(
    user_id: Optional[int] = Query(None, description="Filter by user ID"),
    relation_type: Optional[str] = Query(None, description="Filter by relation type"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0)
):
    """Retrieve conversation history with optional filters"""
    conn = get_connection()
    cursor = conn.cursor()

    # Build dynamic query
    query = "SELECT * FROM conversations WHERE 1=1"
    params = []

    if user_id:
        query += " AND user_id = ?"
        params.append(user_id)
    if relation_type:
        query += " AND relation_type = ?"
        params.append(relation_type)

    # Count total
    count_query = query.replace("SELECT *", "SELECT COUNT(*)")
    cursor.execute(count_query, params)
    total = cursor.fetchone()[0]

    # Fetch paginated results
    query += " ORDER BY timestamp DESC LIMIT ? OFFSET ?"
    params.extend([limit, offset])
    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()

    conversations = [
        ConversationRecord(
            id=row["id"],
            user_id=row["user_id"],
            relation_type=row["relation_type"],
            message=row["message"],
            response=row["response"],
            emotion=row["emotion"] or "neutral",
            timestamp=row["timestamp"]
        )
        for row in rows
    ]

    return HistoryResponse(conversations=conversations, total=total)
