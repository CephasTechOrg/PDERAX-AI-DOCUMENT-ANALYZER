"""
Analytics Routes
Endpoints for user analytics and statistics
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from uuid import UUID

from auth_dependencies import get_current_user
from database import get_db
from models.db_models import User
from services.analytics_service import AnalyticsService
from schemas.analytics import (
    UserStatsResponse,
    ActivityFeedResponse,
    ActivityItem,
    QuizPerformanceResponse,
    QuizPerformancePoint,
    StudyTimeResponse,
    StudyTimePoint,
    SubjectBreakdownResponse,
    SubjectBreakdownItem,
    AnalyticsDashboardResponse,
)

router = APIRouter(
    prefix="/api/analytics",
    tags=["analytics"]
)


@router.get("/overview", response_model=UserStatsResponse)
async def get_overview(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get user statistics overview
    
    Returns:
    - total_documents
    - total_flashcard_sets
    - total_quizzes
    - total_study_time
    - average_quiz_score
    - current_streak
    - documents_this_week
    - quiz_attempts_this_week
    """
    try:
        stats = AnalyticsService.get_user_stats(current_user.id, db)
        return UserStatsResponse(**stats)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching statistics: {str(e)}")


@router.get("/activity", response_model=ActivityFeedResponse)
async def get_activity(
    limit: int = 20,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get user's recent activity feed
    
    Query Parameters:
    - limit: Maximum number of activities to return (default 20)
    """
    if limit < 1 or limit > 100:
        limit = 20
    
    try:
        activities = AnalyticsService.get_activity_feed(current_user.id, db, limit)
        activity_items = [ActivityItem(**activity) for activity in activities]
        return ActivityFeedResponse(items=activity_items)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching activity: {str(e)}")


@router.get("/quiz-performance", response_model=QuizPerformanceResponse)
async def get_quiz_performance(
    days: int = 30,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get quiz performance over time
    
    Query Parameters:
    - days: Number of days to include (default 30)
    """
    if days < 1 or days > 365:
        days = 30
    
    try:
        performance = AnalyticsService.get_quiz_performance(current_user.id, db, days)
        points = [QuizPerformancePoint(**point) for point in performance]
        return QuizPerformanceResponse(items=points)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching quiz performance: {str(e)}")


@router.get("/study-time", response_model=StudyTimeResponse)
async def get_study_time(
    days: int = 7,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get daily study time over time
    
    Query Parameters:
    - days: Number of days to include (default 7)
    """
    if days < 1 or days > 365:
        days = 7
    
    try:
        study_time = AnalyticsService.get_study_time(current_user.id, db, days)
        points = [StudyTimePoint(**point) for point in study_time]
        return StudyTimeResponse(items=points)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching study time: {str(e)}")


@router.get("/subjects", response_model=SubjectBreakdownResponse)
async def get_subject_breakdown(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get breakdown of documents by subject
    """
    try:
        breakdown = AnalyticsService.get_subject_breakdown(current_user.id, db)
        items = [SubjectBreakdownItem(**item) for item in breakdown]
        return SubjectBreakdownResponse(items=items)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching subject breakdown: {str(e)}")


@router.get("/dashboard", response_model=AnalyticsDashboardResponse)
async def get_full_dashboard(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get complete analytics dashboard data in one request
    Includes stats, activity, quiz performance, study time, and subject breakdown
    """
    try:
        stats = AnalyticsService.get_user_stats(current_user.id, db)
        activities = AnalyticsService.get_activity_feed(current_user.id, db, 10)
        performance = AnalyticsService.get_quiz_performance(current_user.id, db, 30)
        study_time = AnalyticsService.get_study_time(current_user.id, db, 7)
        subjects = AnalyticsService.get_subject_breakdown(current_user.id, db)
        
        activity_items = [ActivityItem(**activity) for activity in activities]
        performance_points = [QuizPerformancePoint(**point) for point in performance]
        study_time_points = [StudyTimePoint(**point) for point in study_time]
        subject_items = [SubjectBreakdownItem(**item) for item in subjects]
        
        return AnalyticsDashboardResponse(
            stats=UserStatsResponse(**stats),
            activity_feed=ActivityFeedResponse(items=activity_items),
            quiz_performance=QuizPerformanceResponse(items=performance_points),
            study_time=StudyTimeResponse(items=study_time_points),
            subject_breakdown=SubjectBreakdownResponse(items=subject_items),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching dashboard: {str(e)}")
