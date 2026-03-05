"""Pydantic schemas for Classroom Attendance"""
from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, Field


class CreateSessionRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)


class CloseSessionRequest(BaseModel):
    status: str = Field("closed", pattern="^closed$")


class AttendanceUpdate(BaseModel):
    student_id: UUID
    status: str = Field(..., pattern="^(present|absent|late|excused)$")


class BulkAttendanceRequest(BaseModel):
    records: List[AttendanceUpdate]


class AttendanceRecordOut(BaseModel):
    id: UUID
    session_id: UUID
    student_id: UUID
    student_name: str
    student_email: str
    classroom_id: UUID
    status: str
    marked_at: datetime

    class Config:
        from_attributes = True


class SessionOut(BaseModel):
    id: UUID
    classroom_id: UUID
    teacher_id: UUID
    title: str
    status: str
    session_date: datetime
    closed_at: Optional[datetime] = None
    student_count: int = 0

    class Config:
        from_attributes = True
