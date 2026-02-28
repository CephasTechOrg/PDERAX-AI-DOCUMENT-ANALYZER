"""
Pydantic schemas for AI Chat Assistant
"""
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field


class ChatSessionCreate(BaseModel):
    mode: str = Field(default="teacher", pattern="^(teacher|helper)$")
    title: Optional[str] = Field(None, max_length=300)


class ChatSessionUpdate(BaseModel):
    mode: Optional[str] = Field(None, pattern="^(teacher|helper)$")
    title: Optional[str] = Field(None, max_length=300)


class ChatMessageOut(BaseModel):
    id: str
    role: str
    content: str
    created_at: datetime

    class Config:
        from_attributes = True


class ChatSessionOut(BaseModel):
    id: str
    title: Optional[str]
    mode: str
    document_filename: Optional[str]
    message_count: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ChatSessionDetail(ChatSessionOut):
    messages: List[ChatMessageOut] = []


class ChatSendRequest(BaseModel):
    content: str = Field(..., min_length=1, max_length=4000)


class ChatSendResponse(BaseModel):
    message: ChatMessageOut
    session_id: str
