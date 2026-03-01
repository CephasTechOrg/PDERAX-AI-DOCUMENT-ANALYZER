"""
Pydantic schemas for Assignment Management
"""
from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


# ============================================================================
# REQUEST SCHEMAS
# ============================================================================


class CreateAssignmentRequest(BaseModel):
    """Request body for creating an assignment"""
    title: str = Field(..., min_length=1, max_length=300)
    description: Optional[str] = None
    points_possible: int = Field(..., ge=1, le=1000)
    due_date: Optional[datetime] = None


class UpdateAssignmentRequest(BaseModel):
    """Request body for updating an assignment"""
    title: Optional[str] = Field(None, min_length=1, max_length=300)
    description: Optional[str] = None
    points_possible: Optional[int] = Field(None, ge=1, le=1000)
    due_date: Optional[datetime] = None
    status: Optional[str] = Field(None, pattern="^(draft|published|closed|archived)$")


class SubmitAssignmentRequest(BaseModel):
    """Request body for submitting an assignment"""
    content: Optional[str] = None
    # Files will be handled via multipart/form-data


class GradeSubmissionRequest(BaseModel):
    """Request body for grading a submission"""
    points_earned: float = Field(..., ge=0)
    feedback: Optional[str] = None
    rubric_scores: Optional[dict] = None
    return_for_revision: bool = False


class SetRubricRequest(BaseModel):
    """Request body for setting assignment rubric"""
    rubric_items: list[dict] = Field(..., min_length=1)


class BulkGradeRequest(BaseModel):
    """Request body for bulk grading"""
    grades: list[dict] = Field(..., min_length=1)


# ============================================================================
# RESPONSE SCHEMAS
# ============================================================================


class AssignmentSettingsOut(BaseModel):
    """Assignment settings"""
    allow_late: bool = True
    allow_resubmit: bool = True
    max_submissions: Optional[int] = None
    peer_review_enabled: bool = False

    class Config:
        from_attributes = True


class AssignmentOut(BaseModel):
    """Assignment output schema"""
    id: UUID
    classroom_id: UUID
    title: str
    description: Optional[str]
    points_possible: int
    due_date: Optional[datetime]
    status: str
    settings: Optional[dict] = {}
    rubric: Optional[dict] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class AssignmentWithStatsOut(AssignmentOut):
    """Assignment with submission statistics"""
    submission_count: int = 0
    graded_count: int = 0
    pending_count: int = 0
    average_score: Optional[float] = None

    class Config:
        from_attributes = True


class SubmissionOut(BaseModel):
    """Submission output schema"""
    id: UUID
    assignment_id: UUID
    student_id: UUID
    student_name: Optional[str] = None
    student_email: Optional[str] = None
    content: Optional[str]
    attachments: list[str] = []
    submitted_at: datetime
    status: str
    revision_count: int = 0
    grade: Optional[float] = None
    feedback: Optional[str] = None
    graded_at: Optional[datetime] = None
    graded_by: Optional[UUID] = None

    class Config:
        from_attributes = True


class RubricItemOut(BaseModel):
    """Rubric item output"""
    id: str
    description: str
    points: float
    criteria: str


class AssignmentRubricOut(BaseModel):
    """Assignment rubric output"""
    id: UUID
    assignment_id: UUID
    items: list[RubricItemOut]


class AssignmentStatsOut(BaseModel):
    """Assignment statistics"""
    total_submissions: int
    graded_submissions: int
    pending_submissions: int
    average_score: Optional[float]
    highest_score: Optional[float]
    lowest_score: Optional[float]
    on_time_submissions: int
    late_submissions: int


class PaginatedAssignments(BaseModel):
    """Paginated list of assignments"""
    items: list[AssignmentWithStatsOut]
    total: int
    page: int
    per_page: int
    total_pages: int


class PaginatedSubmissions(BaseModel):
    """Paginated list of submissions"""
    items: list[SubmissionOut]
    total: int
    page: int
    per_page: int
    total_pages: int
