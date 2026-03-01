"""
Analytics Service
Provides user statistics, activity feeds, and performance tracking
"""

from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from sqlalchemy import func, desc
from sqlalchemy.orm import Session
from uuid import UUID

from models.db_models import (
    User, QuizAttempt, FlashcardSet, Flashcard, Document,
    ChatSession, UserActivity, StudySession
)


class AnalyticsService:
    """Service for generating user analytics and statistics"""

    @staticmethod
    def get_user_stats(user_id: UUID, db: Session) -> Dict[str, Any]:
        """
        Get overall user statistics
        
        Returns:
        - total_documents: Number of documents uploaded
        - total_flashcard_sets: Number of flashcard sets created
        - total_quizzes: Number of quizzes created
        - total_study_time: Total hours spent studying (minutes)
        - average_quiz_score: Average quiz score percentage
        - current_streak: Consecutive days of study activity
        - documents_this_week: Documents uploaded in last 7 days
        - quiz_attempts_this_week: Quiz attempts in last 7 days
        """
        
        week_ago = datetime.utcnow() - timedelta(days=7)
        
        # Total documents
        total_documents = db.query(func.count(Document.id)).filter(
            Document.user_id == user_id
        ).scalar() or 0
        
        # Total flashcard sets
        total_flashcard_sets = db.query(func.count(FlashcardSet.id)).filter(
            FlashcardSet.user_id == user_id
        ).scalar() or 0
        
        # Total quizzes (based on quiz attempts)
        total_quizzes = db.query(func.count(func.distinct(QuizAttempt.quiz_id))).filter(
            QuizAttempt.user_id == user_id
        ).scalar() or 0
        
        # Total study time (from study sessions, in minutes)
        study_sessions = db.query(StudySession).filter(
            StudySession.user_id == user_id
        ).all()
        total_study_time = sum(
            int((s.ended_at - s.started_at).total_seconds() / 60)
            for s in study_sessions if s.ended_at
        )
        
        # Average quiz score
        quiz_scores = db.query(QuizAttempt.score_percentage).filter(
            QuizAttempt.user_id == user_id
        ).all()
        average_quiz_score = (
            sum(score[0] for score in quiz_scores) / len(quiz_scores)
            if quiz_scores else 0
        )
        
        # Documents this week
        documents_this_week = db.query(func.count(Document.id)).filter(
            Document.user_id == user_id,
            Document.created_at >= week_ago
        ).scalar() or 0
        
        # Quiz attempts this week
        quiz_attempts_this_week = db.query(func.count(QuizAttempt.id)).filter(
            QuizAttempt.user_id == user_id,
            QuizAttempt.created_at >= week_ago
        ).scalar() or 0
        
        # Current streak (consecutive days with activity)
        current_streak = AnalyticsService._calculate_streak(user_id, db)
        
        return {
            "total_documents": total_documents,
            "total_flashcard_sets": total_flashcard_sets,
            "total_quizzes": total_quizzes,
            "total_study_time": total_study_time,  # in minutes
            "average_quiz_score": round(average_quiz_score, 2),
            "current_streak": current_streak,
            "documents_this_week": documents_this_week,
            "quiz_attempts_this_week": quiz_attempts_this_week,
        }

    @staticmethod
    def get_activity_feed(user_id: UUID, db: Session, limit: int = 20) -> List[Dict[str, Any]]:
        """
        Get recent user activity feed
        
        Returns list of activities with timestamps and descriptions
        """
        
        activities = []
        
        # Recent documents
        recent_docs = db.query(Document).filter(
            Document.user_id == user_id
        ).order_by(desc(Document.created_at)).limit(limit).all()
        
        for doc in recent_docs:
            activities.append({
                "type": "document_uploaded",
                "description": f"Uploaded document: {doc.filename}",
                "timestamp": doc.created_at,
                "icon": "📄"
            })
        
        # Recent quiz attempts
        recent_attempts = db.query(QuizAttempt).filter(
            QuizAttempt.user_id == user_id
        ).order_by(desc(QuizAttempt.created_at)).limit(limit).all()
        
        for attempt in recent_attempts:
            activities.append({
                "type": "quiz_attempted",
                "description": f"Completed quiz with {attempt.score_percentage}% score",
                "timestamp": attempt.created_at,
                "icon": "📝"
            })
        
        # Recent chat sessions
        recent_chats = db.query(ChatSession).filter(
            ChatSession.user_id == user_id
        ).order_by(desc(ChatSession.created_at)).limit(limit).all()
        
        for chat in recent_chats:
            activities.append({
                "type": "chat_session",
                "description": f"Chat session: {chat.title}",
                "timestamp": chat.created_at,
                "icon": "💬"
            })
        
        # Sort by timestamp (newest first) and limit
        activities.sort(key=lambda x: x["timestamp"], reverse=True)
        activities = activities[:limit]
        
        # Format timestamps
        for activity in activities:
            activity["timestamp"] = activity["timestamp"].isoformat()
        
        return activities

    @staticmethod
    def get_quiz_performance(
        user_id: UUID, 
        db: Session, 
        days: int = 30
    ) -> List[Dict[str, Any]]:
        """
        Get quiz performance over time
        
        Returns daily aggregated quiz scores for the past N days
        """
        
        date_from = datetime.utcnow() - timedelta(days=days)
        
        # Get all quiz attempts in date range
        attempts = db.query(QuizAttempt).filter(
            QuizAttempt.user_id == user_id,
            QuizAttempt.created_at >= date_from
        ).all()
        
        # Aggregate by date
        daily_scores: Dict[str, List[float]] = {}
        
        for attempt in attempts:
            date_key = attempt.created_at.strftime("%Y-%m-%d")
            if date_key not in daily_scores:
                daily_scores[date_key] = []
            daily_scores[date_key].append(attempt.score_percentage)
        
        # Calculate daily averages
        performance_data = []
        for date_str in sorted(daily_scores.keys()):
            scores = daily_scores[date_str]
            avg_score = sum(scores) / len(scores)
            
            performance_data.append({
                "date": date_str,
                "score": round(avg_score, 2),
                "attempts": len(scores)
            })
        
        return performance_data

    @staticmethod
    def get_study_time(
        user_id: UUID,
        db: Session,
        days: int = 7
    ) -> List[Dict[str, Any]]:
        """
        Get daily study time over the past N days
        
        Returns daily study duration in minutes
        """
        
        date_from = datetime.utcnow() - timedelta(days=days)
        
        # Get all study sessions in date range
        sessions = db.query(StudySession).filter(
            StudySession.user_id == user_id,
            StudySession.started_at >= date_from
        ).all()
        
        # Aggregate by date
        daily_time: Dict[str, int] = {}
        
        for session in sessions:
            if session.ended_at:
                date_key = session.started_at.strftime("%Y-%m-%d")
                duration_minutes = int((session.ended_at - session.started_at).total_seconds() / 60)
                
                if date_key not in daily_time:
                    daily_time[date_key] = 0
                daily_time[date_key] += duration_minutes
        
        # Build response for all days in range (including days with 0 study time)
        study_data = []
        current_date = datetime.utcnow() - timedelta(days=days)
        
        while current_date <= datetime.utcnow():
            date_str = current_date.strftime("%Y-%m-%d")
            study_time = daily_time.get(date_str, 0)
            
            study_data.append({
                "date": date_str,
                "minutes": study_time,
                "hours": round(study_time / 60, 2)
            })
            
            current_date += timedelta(days=1)
        
        return study_data

    @staticmethod
    def get_subject_breakdown(user_id: UUID, db: Session) -> List[Dict[str, Any]]:
        """
        Get breakdown of documents by subject/topic
        
        Returns count of documents per subject
        """
        
        # Get all documents and count by filename pattern or custom subject field
        documents = db.query(Document).filter(
            Document.user_id == user_id
        ).all()
        
        # Simple breakdown by document type/filename
        subjects: Dict[str, int] = {}
        
        for doc in documents:
            # Extract subject from filename (e.g., "Biology_Notes.pdf" -> "Biology")
            subject = doc.filename.split("_")[0].split(".")[0]
            if not subject or len(subject) < 2:
                subject = "Other"
            
            if subject not in subjects:
                subjects[subject] = 0
            subjects[subject] += 1
        
        # Convert to list and sort by count
        breakdown = [
            {"subject": subject, "count": count}
            for subject, count in subjects.items()
        ]
        breakdown.sort(key=lambda x: x["count"], reverse=True)
        
        return breakdown

    @staticmethod
    def _calculate_streak(user_id: UUID, db: Session) -> int:
        """
        Calculate current study streak (consecutive days with activity)
        """
        
        # Get all activity dates
        activity_dates = db.query(func.date(UserActivity.created_at)).filter(
            UserActivity.user_id == user_id
        ).distinct().all()
        
        if not activity_dates:
            return 0
        
        # Convert to set of dates
        dates = set(row[0] for row in activity_dates if row[0])
        
        # Check consecutive days from today backwards
        streak = 0
        current_date = datetime.utcnow().date()
        
        while current_date in dates:
            streak += 1
            current_date -= timedelta(days=1)
        
        return streak
