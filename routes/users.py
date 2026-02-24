"""
routes/users.py - User management endpoints
"""
from fastapi import APIRouter, HTTPException
from schemas import CreateUserRequest, UserResponse
from database import get_connection

router = APIRouter()


@router.post("/create-user", response_model=UserResponse)
async def create_user(request: CreateUserRequest):
    """Create a new user session"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("INSERT INTO users (name) VALUES (?)", (request.name,))
    conn.commit()
    user_id = cursor.lastrowid
    cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
    user = cursor.fetchone()
    conn.close()

    return UserResponse(id=user["id"], name=user["name"], created_at=user["created_at"])


@router.get("/users/{user_id}", response_model=UserResponse)
async def get_user(user_id: int):
    """Get user by ID"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
    user = cursor.fetchone()
    conn.close()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return UserResponse(id=user["id"], name=user["name"], created_at=user["created_at"])
