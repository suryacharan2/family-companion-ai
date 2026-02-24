"""
schemas.py - Pydantic models for request/response validation
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class RelationType(str, Enum):
    mother = "mother"
    father = "father"
    brother = "brother"
    sister = "sister"


class CreateUserRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, description="User's name")


class UserResponse(BaseModel):
    id: int
    name: str
    created_at: str


class ChatRequest(BaseModel):
    user_id: Optional[int] = None
    relation_type: RelationType
    message: str = Field(..., min_length=1, max_length=2000)
    conversation_history: Optional[List[dict]] = []  # For context memory


class ChatResponse(BaseModel):
    response: str
    emotion_detected: str
    relation_type: str
    timestamp: str


class ConversationRecord(BaseModel):
    id: int
    user_id: Optional[int]
    relation_type: str
    message: str
    response: str
    emotion: str
    timestamp: str


class HistoryResponse(BaseModel):
    conversations: List[ConversationRecord]
    total: int
