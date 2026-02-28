from typing import Any, Dict, List, Optional
from datetime import datetime
from pydantic import BaseModel


class AnalysisResultOut(BaseModel):
    id: str
    filename: str
    file_type: Optional[str] = None
    analysis: Dict[str, Any]
    word_count: Optional[int] = None
    created_at: datetime


class FlashcardSetOut(BaseModel):
    id: str
    analysis_id: Optional[str] = None
    title: Optional[str] = None
    difficulty: str
    cards: List[Dict[str, Any]]
    card_count: int
    created_at: datetime


class QuizSetOut(BaseModel):
    id: str
    analysis_id: Optional[str] = None
    title: Optional[str] = None
    difficulty: str
    questions: List[Dict[str, Any]]
    question_count: int
    created_at: datetime
