"""
Pydantic schemas for Classroom Management
"""
from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


# ============================================================================
# REQUEST SCHEMAS
# ============================================================================


class CreateClassroomRequest(BaseModel):
    """Request body for creating a classroom"""
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    subject: str = Field(..., min_length=1, max_length=100)
    grade_level: str = Field(..., min_length=1, max_length=50)
    creator_role: Optional[str] = "teacher"  # "teacher" | "student"


class UpdateClassroomRequest(BaseModel):
    """Request body for updating classroom details"""
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    subject: Optional[str] = Field(None, min_length=1, max_length=100)
    grade_level: Optional[str] = Field(None, min_length=1, max_length=50)


class ClassroomSettingsRequest(BaseModel):
    """Request body for updating classroom settings"""
    allow_student_uploads: Optional[bool] = None
    allow_peer_review: Optional[bool] = None
    anonymous_feedback: Optional[bool] = None
    email_notifications: Optional[bool] = None
    auto_grading_enabled: Optional[bool] = None


class InviteStudentRequest(BaseModel):
    """Request body for inviting a student by email"""
    email: str = Field(..., pattern=r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")


class JoinClassroomRequest(BaseModel):
    """Request body for joining a classroom with invite code"""
    invite_code: str = Field(..., min_length=8, max_length=10)


class ChangeStudentRoleRequest(BaseModel):
    """Request body for changing a student's role"""
    role: str = Field(..., pattern="^(student|assistant)$")


# ============================================================================
# RESPONSE SCHEMAS
# ============================================================================


class ClassroomSettingsOut(BaseModel):
    """Classroom settings output"""
    allow_student_uploads: bool = True
    allow_peer_review: bool = False
    anonymous_feedback: bool = False
    email_notifications: bool = True
    auto_grading_enabled: bool = False

    class Config:
        from_attributes = True


class ClassroomOut(BaseModel):
    """Classroom output schema"""
    id: UUID
    teacher_id: UUID
    name: str
    description: Optional[str]
    subject: str
    grade_level: str
    invite_code: str
    is_archived: bool
    settings: ClassroomSettingsOut
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ClassroomWithStatsOut(ClassroomOut):
    """Classroom with statistics"""
    student_count: int = 0
    assignment_count: int = 0
    active_assignment_count: int = 0

    class Config:
        from_attributes = True


class StudentInClassroomOut(BaseModel):
    """Student enrollment information"""
    id: UUID
    user_id: UUID
    classroom_id: UUID
    name: str
    email: str
    role: str
    status: str
    joined_at: datetime

    class Config:
        from_attributes = True


class InviteCodeOut(BaseModel):
    """Invite code information"""
    id: UUID
    classroom_id: UUID
    invite_code: str
    expires_at: Optional[datetime] = None
    max_uses: Optional[int] = None
    used_count: int = 0
    created_at: datetime

    class Config:
        from_attributes = True


class ClassroomStatsOut(BaseModel):
    """Classroom statistics"""
    total_students: int
    total_assignments: int
    average_score: float
    active_assignments: int


class PaginatedClassrooms(BaseModel):
    """Paginated list of classrooms"""
    items: list[ClassroomWithStatsOut]
    total: int
    page: int
    per_page: int
    total_pages: int


class PaginatedStudents(BaseModel):
    """Paginated list of students"""
    items: list[StudentInClassroomOut]
    total: int
    page: int
    per_page: int
    total_pages: int


class MessageResponse(BaseModel):
    """Generic message response"""
    success: bool
    message: str
