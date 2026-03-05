"""Pydantic schemas for Classroom Announcements"""
from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


class CreateAnnouncementRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    content: str = Field(..., min_length=1)


class CreateCommentRequest(BaseModel):
    content: str = Field(..., min_length=1)


class CommentOut(BaseModel):
    id: UUID
    announcement_id: UUID
    author_id: UUID
    author_name: str
    content: str
    created_at: datetime

    class Config:
        from_attributes = True


class AnnouncementOut(BaseModel):
    id: UUID
    classroom_id: UUID
    author_id: UUID
    author_name: str
    title: str
    content: str
    comment_count: int = 0
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
