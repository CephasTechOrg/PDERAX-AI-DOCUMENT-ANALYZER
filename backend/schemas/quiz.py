"""
Quiz generation schemas for PDERAX
"""
from typing import List, Optional
from pydantic import BaseModel, Field
from datetime import datetime


class QuizOption(BaseModel):
    """Single option for a multiple choice question"""
    label: str = Field(description="Option label (A, B, C, D)")
    text: str = Field(description="Option text")


class QuizQuestion(BaseModel):
    """Single quiz question with multiple choice options"""
    question: str = Field(description="The question text")
    options: List[QuizOption] = Field(description="List of answer options (A, B, C, D)")
    correct_answer: str = Field(description="The correct option label (A, B, C, or D)")
    explanation: str = Field(description="Why this answer is correct")
    category: Optional[str] = Field(default=None, description="Topic/category")


class QuizGenerateRequest(BaseModel):
    """Request to generate a quiz from text"""
    text: str = Field(min_length=50, description="Source text to generate quiz from")
    count: int = Field(default=10, ge=3, le=25, description="Number of questions")
    difficulty: str = Field(default="medium", description="easy, medium, or hard")
    analysis_id: Optional[str] = Field(default=None, description="Optional analysis ID to link to")


class QuizGenerateResponse(BaseModel):
    """Response containing generated quiz"""
    questions: List[QuizQuestion]
    source_summary: str
    total_count: int
    difficulty: str
    generated_at: datetime


class QuizAnswer(BaseModel):
    """User's answer to a question"""
    question_index: int
    selected_answer: str  # A, B, C, or D


class QuizResultItem(BaseModel):
    """Result for a single question"""
    question: str
    user_answer: str
    correct_answer: str
    is_correct: bool
    explanation: str
    options: List[QuizOption]


class QuizSubmitResponse(BaseModel):
    """Quiz submission results"""
    total_questions: int
    correct_count: int
    incorrect_count: int
    score_percentage: float
    results: List[QuizResultItem]
