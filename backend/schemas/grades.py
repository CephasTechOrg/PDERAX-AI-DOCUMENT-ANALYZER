"""
Pydantic schemas for Grade Management and Analytics
"""
from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


# ============================================================================
# REQUEST SCHEMAS
# ============================================================================


class CreateGradeRequest(BaseModel):
    """Request body for creating a grade"""
    submission_id: UUID
    points_earned: float = Field(..., ge=0)
    feedback: Optional[str] = None
    rubric_scores: Optional[dict] = None


class UpdateGradeRequest(BaseModel):
    """Request body for updating a grade"""
    points_earned: Optional[float] = Field(None, ge=0)
    feedback: Optional[str] = None
    rubric_scores: Optional[dict] = None


class BulkGradeUpdateRequest(BaseModel):
    """Request body for bulk grade updates"""
    updates: list[dict] = Field(..., min_length=1)


class GradeWeightingRequest(BaseModel):
    """Request body for setting grade weightings"""
    weightings: dict = Field(..., description="Assignment category weightings")


# ============================================================================
# RESPONSE SCHEMAS
# ============================================================================


class GradeOut(BaseModel):
    """Grade output schema"""
    id: UUID
    submission_id: UUID
    assignment_id: UUID
    student_id: UUID
    classroom_id: UUID
    points_earned: float
    points_possible: int
    percentage: Optional[float]
    letter_grade: Optional[str]
    feedback: Optional[str]
    rubric_scores: Optional[dict]
    graded_by: Optional[UUID]
    graded_at: datetime

    class Config:
        from_attributes = True


class GradeEntryOut(BaseModel):
    """Single grade entry in gradebook"""
    id: UUID
    assignment_id: UUID
    assignment_title: str
    points_earned: float
    points_possible: int
    percentage: float
    letter_grade: str
    submitted_at: Optional[datetime]
    graded_at: Optional[datetime]


class StudentGradesOut(BaseModel):
    """All grades for a student"""
    student_id: UUID
    student_name: str
    student_email: str
    grades: list[GradeEntryOut]
    overall_average: float
    overall_letter_grade: str
    total_points_earned: float
    total_points_possible: int


class GradebookEntryOut(BaseModel):
    """Gradebook entry for an assignment"""
    assignment_id: UUID
    assignment_title: str
    points_possible: int
    due_date: Optional[datetime]
    average_score: Optional[float]
    submission_count: int
    graded_count: int


class GradebookOut(BaseModel):
    """Full gradebook response"""
    assignments: list[GradebookEntryOut]
    students: list[StudentGradesOut]
    class_average: float


class PerformanceAnalyticsOut(BaseModel):
    """Student performance analytics"""
    student_id: UUID
    student_name: str
    overall_average: float
    overall_letter_grade: str
    total_assignments: int
    completed_assignments: int
    completion_rate: float
    strengths: list[str]
    areas_for_improvement: list[str]
    trend: str  # improving | declining | stable
    predicted_final_grade: Optional[float]


class TrendDataPoint(BaseModel):
    """Single trend data point"""
    date: datetime
    score: float
    assignment_title: str


class TrendDataOut(BaseModel):
    """Trend data over time"""
    student_id: UUID
    data_points: list[TrendDataPoint]
    trend_line: list[float]
    prediction: Optional[float]


class GradeDistributionOut(BaseModel):
    """Grade distribution statistics"""
    a_plus: int = 0
    a: int = 0
    a_minus: int = 0
    b_plus: int = 0
    b: int = 0
    b_minus: int = 0
    c_plus: int = 0
    c: int = 0
    c_minus: int = 0
    d: int = 0
    f: int = 0


class ClassPerformanceOut(BaseModel):
    """Class-wide performance metrics"""
    classroom_id: UUID
    total_students: int
    average_score: float
    median_score: float
    std_deviation: float
    grade_distribution: GradeDistributionOut
    top_performers: list[dict]
    struggling_students: list[dict]


class ReportCardOut(BaseModel):
    """Student report card"""
    student_id: UUID
    student_name: str
    classroom_id: UUID
    classroom_name: str
    reporting_period: str
    overall_grade: str
    overall_percentage: float
    assignments: list[GradeEntryOut]
    attendance: Optional[dict] = None
    teacher_comments: Optional[str] = None
    generated_at: datetime


class GradeStatisticsOut(BaseModel):
    """Grade statistics for a classroom"""
    mean: float
    median: float
    mode: Optional[float]
    std_dev: float
    min: float
    max: float
    quartiles: dict


class GradeWeightingOut(BaseModel):
    """Grade weighting configuration"""
    classroom_id: UUID
    weightings: dict
    updated_at: datetime


class PaginatedGrades(BaseModel):
    """Paginated list of grades"""
    items: list[GradeOut]
    total: int
    page: int
    per_page: int
    total_pages: int
