"""
Quiz generation routes for PDERAX
"""
from fastapi import APIRouter, Request, HTTPException, Depends
from datetime import datetime
from typing import Optional
from pydantic import BaseModel
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.orm import Session

from schemas.quiz import (
    QuizGenerateRequest,
    QuizGenerateResponse,
    QuizQuestion,
    QuizOption,
)
from services.ai_service import AIService
from auth_dependencies import get_current_user
from dependencies import get_db
from models.db_models import QuizSet, User

quiz_router = APIRouter()
ai_service = AIService()
_limiter = Limiter(key_func=get_remote_address)


class QuickQuizRequest(BaseModel):
    text: str
    count: int = 10
    difficulty: str = "medium"
    analysis_id: Optional[str] = None


@quiz_router.post("/generate", response_model=QuizGenerateResponse)
@_limiter.limit("20/hour")
async def generate_quiz(
    request: Request,
    payload: QuizGenerateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Generate quiz questions from provided text using AI"""
    
    try:
        result = await ai_service.generate_quiz(
            text=payload.text,
            count=payload.count,
            difficulty=payload.difficulty,
        )
        
        if not result.get("questions"):
            raise HTTPException(
                status_code=500,
                detail="Failed to generate quiz questions. Please try again."
            )
        
        # Convert to response model
        quiz_questions = []
        for q in result["questions"]:
            options = [
                QuizOption(label=opt.get("label", ""), text=opt.get("text", ""))
                for opt in q.get("options", [])
            ]
            quiz_questions.append(
                QuizQuestion(
                    question=q.get("question", ""),
                    options=options,
                    correct_answer=q.get("correct_answer", "A"),
                    explanation=q.get("explanation", ""),
                    category=q.get("category")
                )
            )
        
        # Persist quiz set
        try:
            questions_data = [
                {
                    "question": q.question,
                    "options": [{"label": o.label, "text": o.text} for o in q.options],
                    "correct_answer": q.correct_answer,
                    "explanation": q.explanation,
                    "category": q.category,
                }
                for q in quiz_questions
            ]
            analysis_uuid = None
            if payload.analysis_id:
                import uuid as _uuid
                try:
                    analysis_uuid = _uuid.UUID(payload.analysis_id)
                except ValueError:
                    pass
            qs = QuizSet(
                user_id=current_user.id,
                analysis_id=analysis_uuid,
                title="Quiz from document",
                difficulty=payload.difficulty,
                questions=questions_data,
                question_count=len(questions_data),
            )
            db.add(qs)
            db.commit()
        except Exception as exc:
            print(f"Warning: could not save quiz set to history: {exc}")

        return QuizGenerateResponse(
            questions=quiz_questions,
            source_summary=result.get("source_summary", ""),
            total_count=len(quiz_questions),
            difficulty=payload.difficulty,
            generated_at=datetime.utcnow()
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Quiz generation error: {str(e)}"
        )


@quiz_router.post("/generate-quick")
@_limiter.limit("20/hour")
async def generate_quiz_quick(
    request: Request,
    payload: QuickQuizRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Quick quiz generation endpoint — accepts text in the request body."""
    text = payload.text
    count = payload.count
    difficulty = payload.difficulty

    if not text or len(text) < 50:
        raise HTTPException(status_code=400, detail="Text must be at least 50 characters long")
    if count < 3 or count > 25:
        raise HTTPException(status_code=400, detail="Count must be between 3 and 25")
    if difficulty not in ["easy", "medium", "hard"]:
        raise HTTPException(status_code=400, detail="Difficulty must be 'easy', 'medium', or 'hard'")

    try:
        result = await ai_service.generate_quiz(text=text, count=count, difficulty=difficulty)

        questions_data = result.get("questions", [])

        # Persist quiz set
        try:
            analysis_uuid = None
            if payload.analysis_id:
                import uuid as _uuid
                try:
                    analysis_uuid = _uuid.UUID(payload.analysis_id)
                except ValueError:
                    pass
            qs = QuizSet(
                user_id=current_user.id,
                analysis_id=analysis_uuid,
                title="Quiz from document",
                difficulty=difficulty,
                questions=questions_data,
                question_count=len(questions_data),
            )
            db.add(qs)
            db.commit()
        except Exception as exc:
            print(f"Warning: could not save quiz set to history: {exc}")

        return {
            "success": True,
            "questions": questions_data,
            "total_count": len(questions_data),
            "source": result.get("source", "unknown"),
            "difficulty": difficulty,
            "generated_at": datetime.utcnow().isoformat(),
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Quiz generation error: {str(e)}")
