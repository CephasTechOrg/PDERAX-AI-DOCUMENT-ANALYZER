"""
History routes — list, retrieve, and delete saved analyses and flashcard sets.
"""
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from auth_dependencies import get_current_user
from dependencies import get_db
from models.db_models import AnalysisResult, FlashcardSet, QuizSet, User
from schemas.history import AnalysisResultOut, FlashcardSetOut, QuizSetOut

history_router = APIRouter(prefix="/history", tags=["History"])


def _analysis_out(r: AnalysisResult) -> AnalysisResultOut:
    return AnalysisResultOut(
        id=str(r.id),
        filename=r.filename,
        file_type=r.file_type,
        analysis=r.analysis,
        word_count=r.word_count,
        created_at=r.created_at,
    )


def _flashcard_set_out(s: FlashcardSet) -> FlashcardSetOut:
    return FlashcardSetOut(
        id=str(s.id),
        analysis_id=str(s.analysis_id) if s.analysis_id else None,
        title=s.title,
        difficulty=s.difficulty,
        cards=s.cards,
        card_count=s.card_count,
        created_at=s.created_at,
    )


# ── Analyses ─────────────────────────────────────────────────────────────────

@history_router.get("/analyses", response_model=List[AnalysisResultOut])
async def list_analyses(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return all saved analyses for the authenticated user, newest first."""
    results = (
        db.query(AnalysisResult)
        .filter(AnalysisResult.user_id == current_user.id)
        .order_by(AnalysisResult.created_at.desc())
        .all()
    )
    return [_analysis_out(r) for r in results]


@history_router.get("/analyses/{analysis_id}", response_model=AnalysisResultOut)
async def get_analysis(
    analysis_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return a single saved analysis by ID."""
    result = (
        db.query(AnalysisResult)
        .filter(
            AnalysisResult.id == analysis_id,
            AnalysisResult.user_id == current_user.id,
        )
        .first()
    )
    if not result:
        raise HTTPException(status_code=404, detail="Analysis not found")
    return _analysis_out(result)


@history_router.delete("/analyses/{analysis_id}")
async def delete_analysis(
    analysis_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a saved analysis (and its linked flashcard sets)."""
    result = (
        db.query(AnalysisResult)
        .filter(
            AnalysisResult.id == analysis_id,
            AnalysisResult.user_id == current_user.id,
        )
        .first()
    )
    if not result:
        raise HTTPException(status_code=404, detail="Analysis not found")
    db.delete(result)
    db.commit()
    return {"message": "Analysis deleted"}


# ── Flashcard sets ────────────────────────────────────────────────────────────

@history_router.get("/flashcard-sets", response_model=List[FlashcardSetOut])
async def list_flashcard_sets(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return all saved flashcard sets for the authenticated user, newest first."""
    sets = (
        db.query(FlashcardSet)
        .filter(FlashcardSet.user_id == current_user.id)
        .order_by(FlashcardSet.created_at.desc())
        .all()
    )
    return [_flashcard_set_out(s) for s in sets]


@history_router.delete("/flashcard-sets/{set_id}")
async def delete_flashcard_set(
    set_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a saved flashcard set."""
    fs = (
        db.query(FlashcardSet)
        .filter(
            FlashcardSet.id == set_id,
            FlashcardSet.user_id == current_user.id,
        )
        .first()
    )
    if not fs:
        raise HTTPException(status_code=404, detail="Flashcard set not found")
    db.delete(fs)
    db.commit()
    return {"message": "Flashcard set deleted"}


# ── Quiz sets ─────────────────────────────────────────────────────────────────

def _quiz_set_out(s: QuizSet) -> QuizSetOut:
    return QuizSetOut(
        id=str(s.id),
        analysis_id=str(s.analysis_id) if s.analysis_id else None,
        title=s.title,
        difficulty=s.difficulty,
        questions=s.questions,
        question_count=s.question_count,
        created_at=s.created_at,
    )


@history_router.get("/quiz-sets", response_model=List[QuizSetOut])
async def list_quiz_sets(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return all saved quiz sets for the authenticated user, newest first."""
    sets = (
        db.query(QuizSet)
        .filter(QuizSet.user_id == current_user.id)
        .order_by(QuizSet.created_at.desc())
        .all()
    )
    return [_quiz_set_out(s) for s in sets]


@history_router.get("/quiz-sets/{set_id}", response_model=QuizSetOut)
async def get_quiz_set(
    set_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return a single quiz set by ID."""
    qs = (
        db.query(QuizSet)
        .filter(
            QuizSet.id == set_id,
            QuizSet.user_id == current_user.id,
        )
        .first()
    )
    if not qs:
        raise HTTPException(status_code=404, detail="Quiz set not found")
    return _quiz_set_out(qs)


@history_router.delete("/quiz-sets/{set_id}")
async def delete_quiz_set(
    set_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a saved quiz set."""
    qs = (
        db.query(QuizSet)
        .filter(
            QuizSet.id == set_id,
            QuizSet.user_id == current_user.id,
        )
        .first()
    )
    if not qs:
        raise HTTPException(status_code=404, detail="Quiz set not found")
    db.delete(qs)
    db.commit()
    return {"message": "Quiz set deleted"}
