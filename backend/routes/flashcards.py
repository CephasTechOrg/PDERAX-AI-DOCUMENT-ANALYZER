"""
Flashcard generation routes for PDERAX
"""
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime
from typing import Optional

from schemas.flashcards import (
    FlashcardGenerateRequest,
    FlashcardGenerateResponse,
    FlashcardItem,
)
from services.ai_service import AIService
from auth_dependencies import get_current_user
from models.db_models import User

flashcard_router = APIRouter()
ai_service = AIService()


@flashcard_router.post("/generate", response_model=FlashcardGenerateResponse)
async def generate_flashcards(
    request: FlashcardGenerateRequest,
    current_user: User = Depends(get_current_user),
):
    """Generate flashcards from provided text using AI"""
    
    try:
        result = ai_service.generate_flashcards(
            text=request.text,
            count=request.count,
            difficulty=request.difficulty,
            focus_topics=request.focus_topics
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
async def generate_flashcards_quick(
    text: str,
    count: int = 10,
    difficulty: str = "medium",
    current_user: User = Depends(get_current_user),
):
    """Quick flashcard generation endpoint with query parameters"""
    
    if not text or len(text) < 50:
        raise HTTPException(
            status_code=400,
            detail="Text must be at least 50 characters long"
        )
    
    if count < 3 or count > 30:
        raise HTTPException(
            status_code=400,
            detail="Count must be between 3 and 30"
        )
    
    if difficulty not in ["easy", "medium", "hard"]:
        raise HTTPException(
            status_code=400,
            detail="Difficulty must be 'easy', 'medium', or 'hard'"
        )
    
    try:
        result = ai_service.generate_flashcards(
            text=text,
            count=count,
            difficulty=difficulty
        )
        
        return {
            "success": True,
            "flashcards": result.get("flashcards", []),
            "total_count": result.get("total_count", 0),
            "source": result.get("source", "unknown"),
            "generated_at": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Flashcard generation error: {str(e)}"
        )
