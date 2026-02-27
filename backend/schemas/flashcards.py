"""
Flashcard generation schemas for PDERAX
"""
from typing import List, Optional
from pydantic import BaseModel, Field
from datetime import datetime


class FlashcardItem(BaseModel):
    """Single flashcard with front (question) and back (answer)"""
    front: str = Field(description="The question or term on the front of the card")
    back: str = Field(description="The answer or definition on the back of the card")
    category: Optional[str] = Field(default=None, description="Optional category/topic")


class FlashcardGenerateRequest(BaseModel):
    """Request to generate flashcards from text"""
    text: str = Field(min_length=50, description="The source text to generate flashcards from")
    count: int = Field(default=10, ge=3, le=30, description="Number of flashcards to generate")
    difficulty: str = Field(default="medium", description="Difficulty level: easy, medium, hard")
    focus_topics: Optional[List[str]] = Field(default=None, description="Specific topics to focus on")


class FlashcardGenerateResponse(BaseModel):
    """Response containing generated flashcards"""
    flashcards: List[FlashcardItem]
    source_summary: str = Field(description="Brief summary of the source material")
    total_count: int
    generated_at: datetime


class FlashcardSetCreate(BaseModel):
    """Request to save a flashcard set"""
    title: str = Field(min_length=1, max_length=200)
    description: Optional[str] = Field(default=None, max_length=500)
    flashcards: List[FlashcardItem]
    source_document: Optional[str] = Field(default=None, description="Original document filename")


class FlashcardSetOut(BaseModel):
    """Flashcard set response"""
    id: str
    title: str
    description: Optional[str]
    flashcards: List[FlashcardItem]
    card_count: int
    source_document: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime]
    user_id: str


class FlashcardStudyProgress(BaseModel):
    """Track study progress for a flashcard"""
    flashcard_id: str
    correct_count: int = 0
    incorrect_count: int = 0
    last_reviewed: Optional[datetime] = None
    confidence_level: int = Field(default=0, ge=0, le=5, description="0-5 confidence rating")
