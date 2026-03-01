"""
Analytics Schemas
Request and response models for analytics endpoints
"""

from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime


class UserStatsResponse(BaseModel):
    """User statistics overview"""
    total_documents: int
    total_flashcard_sets: int
    total_quizzes: int
    total_study_time: int  # in minutes
    average_quiz_score: float  # 0-100
    current_streak: int  # consecutive days
    documents_this_week: int
    quiz_attempts_this_week: int

    class Config:
        from_attributes = True


class ActivityItem(BaseModel):
    """Single activity item"""
    type: str  # document_uploaded, quiz_attempted, chat_session
    description: str
    timestamp: str  # ISO format
    icon: str


class ActivityFeedResponse(BaseModel):
    """User activity feed"""
    items: List[ActivityItem]

    class Config:
        from_attributes = True


class QuizPerformancePoint(BaseModel):
    """Single point in quiz performance chart"""
    date: str
    score: float  # 0-100
    attempts: int


class QuizPerformanceResponse(BaseModel):
    """Quiz performance over time"""
    items: List[QuizPerformancePoint]

    class Config:
        from_attributes = True


class StudyTimePoint(BaseModel):
    """Single point in study time chart"""
    date: str
    minutes: int
    hours: float


class StudyTimeResponse(BaseModel):
    """Daily study time over time"""
    items: List[StudyTimePoint]

    class Config:
        from_attributes = True


class SubjectBreakdownItem(BaseModel):
    """Subject breakdown item"""
    subject: str
    count: int


class SubjectBreakdownResponse(BaseModel):
    """Subject breakdown"""
    items: List[SubjectBreakdownItem]

    class Config:
        from_attributes = True


class AnalyticsDashboardResponse(BaseModel):
    """Complete analytics dashboard data"""
    stats: UserStatsResponse
    activity_feed: ActivityFeedResponse
    quiz_performance: QuizPerformanceResponse
    study_time: StudyTimeResponse
    subject_breakdown: SubjectBreakdownResponse

    class Config:
        from_attributes = True
