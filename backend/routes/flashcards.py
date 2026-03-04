"""
Flashcard generation routes for PDERAX
"""
from fastapi import APIRouter, Request, HTTPException, Depends
from datetime import datetime
from typing import Optional
from pydantic import BaseModel
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.orm import Session

from schemas.flashcards import (
    FlashcardGenerateRequest,
    FlashcardGenerateResponse,
    FlashcardItem,
)
from services.ai_service import AIService
from auth_dependencies import get_current_user
from dependencies import get_db
from models.db_models import FlashcardSet, User

flashcard_router = APIRouter()
ai_service = AIService()
_limiter = Limiter(key_func=get_remote_address)


class QuickGenerateRequest(BaseModel):
    text: str
    count: int = 10
    difficulty: str = "medium"
    analysis_id: Optional[str] = None


@flashcard_router.post("/generate", response_model=FlashcardGenerateResponse)
@_limiter.limit("30/hour")
async def generate_flashcards(
    request: Request,
    payload: FlashcardGenerateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Generate flashcards from provided text using AI"""

    try:
        result = await ai_service.generate_flashcards(
            text=payload.text,
            count=payload.count,
            difficulty=payload.difficulty,
            focus_topics=payload.focus_topics
        )

        if not result.get("flashcards"):
            raise HTTPException(
                status_code=500,
                detail="Failed to generate flashcards. Please try again."
            )

        # Convert to response model
        flashcard_items = [
            FlashcardItem(
                front=card.get("front", ""),
                back=card.get("back", ""),
                category=card.get("category")
            )
            for card in result["flashcards"]
        ]

        # Persist flashcard set
        try:
            cards_data = [
                {"front": c.front, "back": c.back, "category": c.category}
                for c in flashcard_items
            ]
            analysis_uuid = None
            if getattr(payload, "analysis_id", None):
                import uuid as _uuid
                try:
                    analysis_uuid = _uuid.UUID(payload.analysis_id)
                except ValueError:
                    pass
            fs = FlashcardSet(
                user_id=current_user.id,
                analysis_id=analysis_uuid,
                title=f"Flashcards from {getattr(payload, 'source_title', 'document')}",
                difficulty=payload.difficulty,
                cards=cards_data,
                card_count=len(cards_data),
            )
            db.add(fs)
            db.commit()
        except Exception as exc:
            print(f"Warning: could not save flashcard set to history: {exc}")

        return FlashcardGenerateResponse(
            flashcards=flashcard_items,
            source_summary=result.get("source_summary", ""),
            total_count=len(flashcard_items),
            generated_at=datetime.utcnow()
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Flashcard generation error: {str(e)}"
        )


@flashcard_router.post("/generate-quick")
@_limiter.limit("30/hour")
async def generate_flashcards_quick(
    request: Request,
    payload: QuickGenerateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Quick flashcard generation endpoint — accepts text in the request body."""
    text = payload.text
    count = payload.count
    difficulty = payload.difficulty

    if not text or len(text) < 50:
        raise HTTPException(status_code=400, detail="Text must be at least 50 characters long")
    if count < 3 or count > 30:
        raise HTTPException(status_code=400, detail="Count must be between 3 and 30")
    if difficulty not in ["easy", "medium", "hard"]:
        raise HTTPException(status_code=400, detail="Difficulty must be 'easy', 'medium', or 'hard'")

    try:
        result = await ai_service.generate_flashcards(text=text, count=count, difficulty=difficulty)

        cards_data = result.get("flashcards", [])

        # Persist flashcard set
        try:
            analysis_uuid = None
            if payload.analysis_id:
                import uuid as _uuid
                try:
                    analysis_uuid = _uuid.UUID(payload.analysis_id)
                except ValueError:
                    pass
            fs = FlashcardSet(
                user_id=current_user.id,
                analysis_id=analysis_uuid,
                difficulty=difficulty,
                cards=cards_data,
                card_count=len(cards_data),
            )
            db.add(fs)
            db.commit()
        except Exception as exc:
            print(f"Warning: could not save flashcard set to history: {exc}")

        return {
            "success": True,
            "flashcards": cards_data,
            "total_count": len(cards_data),
            "source": result.get("source", "unknown"),
            "generated_at": datetime.utcnow().isoformat(),
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Flashcard generation error: {str(e)}")
