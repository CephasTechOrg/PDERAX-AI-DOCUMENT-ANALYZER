# 📝 Quiz Generation - Implementation Plan

> **Feature**: Multiple Choice Quiz Generation from Documents  
> **Priority**: 🟢 High  
> **Estimated Duration**: 2-3 days  
> **Reference**: Follows same pattern as Flashcard Generation

---

## 📋 Overview

Add quiz generation capability that mirrors the flashcard generation flow:

1. User uploads document (uses existing `/upload` endpoint)
2. User selects number of questions and difficulty
3. AI generates multiple choice questions (MCQ)
4. User takes the quiz one question at a time
5. User sees results: correct/incorrect with explanations

---

## 🏗️ Architecture

### Current Flow (Flashcards)

```
Upload → Process Document → Show Settings → Generate Flashcards → Display Cards → Study Mode
```

### New Flow (Quiz)

```
Upload → Process Document → Show Settings → Generate Quiz → Take Quiz → Show Results with Explanations
```

---

## 📁 Files to Create/Modify

### Backend (New Files)

| File                          | Purpose                                   |
| ----------------------------- | ----------------------------------------- |
| `backend/schemas/quiz.py`     | Pydantic models for quiz request/response |
| `backend/routes/quiz.py`      | Quiz generation API endpoints             |
| `backend/models/db_models.py` | Add QuizSet and QuizAttempt models        |

### Backend (Modify)

| File                             | Changes                      |
| -------------------------------- | ---------------------------- |
| `backend/services/ai_service.py` | Add `generate_quiz()` method |
| `backend/main.py`                | Include quiz router          |
| `backend/routes/history.py`      | Add quiz history endpoints   |

### Frontend (New Files)

| File                    | Purpose                                       |
| ----------------------- | --------------------------------------------- |
| `frontend/quiz.js`      | Quiz logic, state management, UI interactions |
| `frontend/css/quiz.css` | Quiz-specific styling                         |

### Frontend (Modify)

| File                        | Changes                            |
| --------------------------- | ---------------------------------- |
| `frontend/study-tools.html` | Add quiz modal and results section |
| `frontend/api.js`           | Add `generateQuiz()` method        |

---

## 🔧 Detailed Implementation

### 1. Backend Schemas (`backend/schemas/quiz.py`)

```python
"""Quiz generation schemas for PDERAX"""
from typing import List, Optional
from pydantic import BaseModel, Field
from datetime import datetime


class QuizOption(BaseModel):
    """Single option for a multiple choice question"""
    label: str = Field(description="Option label (A, B, C, D)")
    text: str = Field(description="Option text")
    is_correct: bool = Field(default=False, description="Whether this is the correct answer")


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


class QuizSubmitRequest(BaseModel):
    """Request to submit quiz answers"""
    quiz_id: str
    answers: List[QuizAnswer]


class QuizResultItem(BaseModel):
    """Result for a single question"""
    question: str
    user_answer: str
    correct_answer: str
    is_correct: bool
    explanation: str


class QuizSubmitResponse(BaseModel):
    """Quiz submission results"""
    total_questions: int
    correct_count: int
    incorrect_count: int
    score_percentage: float
    results: List[QuizResultItem]
```

---

### 2. Database Model (`backend/models/db_models.py`)

Add to existing models:

```python
class QuizSet(Base):
    __tablename__ = "quiz_sets"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    analysis_id = Column(UUID(as_uuid=True), ForeignKey("analysis_results.id", ondelete="SET NULL"), nullable=True, index=True)
    title = Column(String(500), nullable=True)
    difficulty = Column(String(20), default="medium", nullable=False)
    questions = Column(JSONB, nullable=False)  # Store questions with options
    question_count = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    user = relationship("User", back_populates="quiz_sets")
    analysis = relationship("AnalysisResult", back_populates="quiz_sets")
    attempts = relationship("QuizAttempt", back_populates="quiz_set", cascade="all, delete-orphan")


class QuizAttempt(Base):
    __tablename__ = "quiz_attempts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    quiz_set_id = Column(UUID(as_uuid=True), ForeignKey("quiz_sets.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    answers = Column(JSONB, nullable=False)  # User's answers
    score = Column(Integer, nullable=False)  # Number correct
    total = Column(Integer, nullable=False)  # Total questions
    completed_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    quiz_set = relationship("QuizSet", back_populates="attempts")
    user = relationship("User", back_populates="quiz_attempts")
```

Update User model relationships:

```python
quiz_sets = relationship("QuizSet", back_populates="user", cascade="all, delete-orphan")
quiz_attempts = relationship("QuizAttempt", back_populates="user", cascade="all, delete-orphan")
```

Update AnalysisResult model:

```python
quiz_sets = relationship("QuizSet", back_populates="analysis", cascade="all, delete-orphan")
```

---

### 3. AI Service Method (`backend/services/ai_service.py`)

Add `generate_quiz()` method:

````python
async def generate_quiz(self, text: str, count: int = 10, difficulty: str = "medium") -> dict:
    """Generate multiple choice quiz questions from text using DeepSeek AI."""
    import json

    text = (text or "").strip()

    if not text or len(text) < 50:
        return self._build_fallback_quiz(text, reason="Insufficient text for quiz generation.")

    # Truncate very long texts
    if len(text) > 6000:
        text = text[:6000] + "... [content truncated]"

    # Check AI credentials
    if not self.api_key or not self.api_url:
        return self._build_fallback_quiz(text, reason="AI credentials not configured.")

    difficulty_instructions = {
        "easy": "Create straightforward questions testing basic recall and simple concepts.",
        "medium": "Create questions that test understanding and require some analysis.",
        "hard": "Create challenging questions requiring deep understanding, application, and critical thinking."
    }

    prompt = f"""Generate exactly {count} multiple choice quiz questions from the following text.

Difficulty level: {difficulty}
{difficulty_instructions.get(difficulty, difficulty_instructions["medium"])}

IMPORTANT: Return ONLY a valid JSON array with no additional text. Each question must have:
- "question": The question text (string)
- "options": Array of exactly 4 options, each with "label" (A/B/C/D), "text" (the option text)
- "correct_answer": The correct option label (A, B, C, or D)
- "explanation": Brief explanation of why the answer is correct (string)
- "category": The topic this question relates to (string)

Example format:
[
  {{
    "question": "What is the primary function of mitochondria?",
    "options": [
      {{"label": "A", "text": "Protein synthesis"}},
      {{"label": "B", "text": "Energy production"}},
      {{"label": "C", "text": "Cell division"}},
      {{"label": "D", "text": "Waste removal"}}
    ],
    "correct_answer": "B",
    "explanation": "Mitochondria are known as the powerhouse of the cell because they produce ATP through cellular respiration.",
    "category": "Cell Biology"
  }}
]

Source text:
{text}

Generate {count} quiz questions as a JSON array:"""

    payload = {
        "model": "deepseek-chat",
        "messages": [
            {
                "role": "system",
                "content": "You are an expert educator creating multiple choice quiz questions. Always respond with valid JSON only, no markdown or extra text."
            },
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.4,
        "max_tokens": 3000,
    }

    try:
        async with httpx.AsyncClient(timeout=self.request_timeout) as client:
            response = await client.post(
                self.api_url,
                headers=self.headers,
                json=payload,
            )
        response.raise_for_status()

        result = response.json()
        ai_response = (
            result.get("choices", [{}])[0]
            .get("message", {})
            .get("content", "")
        )

        if not ai_response:
            return self._build_fallback_quiz(text, reason="Empty response from AI service.")

        # Parse the JSON response
        questions = self._parse_quiz_response(ai_response)

        if not questions:
            return self._build_fallback_quiz(text, reason="Could not parse AI response into quiz questions.")

        words = text.split()
        source_summary = " ".join(words[:50]) + "..." if len(words) > 50 else text

        return {
            "questions": questions,
            "source_summary": source_summary,
            "total_count": len(questions),
            "source": "ai",
            "difficulty": difficulty
        }

    except httpx.TimeoutException:
        return self._build_fallback_quiz(text, reason="AI service timed out.")
    except httpx.HTTPError as exc:
        return self._build_fallback_quiz(text, reason=f"AI service unavailable: {exc}")
    except Exception as exc:
        return self._build_fallback_quiz(text, reason=f"Quiz generation error: {exc}")


def _parse_quiz_response(self, response: str) -> list:
    """Parse AI response into quiz question list."""
    import json
    import re

    response = response.strip()
    response = re.sub(r'^```json\s*', '', response)
    response = re.sub(r'^```\s*', '', response)
    response = re.sub(r'\s*```$', '', response)

    try:
        questions = json.loads(response)
        if isinstance(questions, list):
            valid_questions = []
            for q in questions:
                if isinstance(q, dict) and "question" in q and "options" in q and "correct_answer" in q:
                    valid_questions.append({
                        "question": str(q.get("question", "")).strip(),
                        "options": q.get("options", []),
                        "correct_answer": str(q.get("correct_answer", "A")).strip().upper(),
                        "explanation": str(q.get("explanation", "")).strip(),
                        "category": str(q.get("category", "General")).strip()
                    })
            return valid_questions
    except json.JSONDecodeError:
        pass

    return []


def _build_fallback_quiz(self, text: str, reason: str = "") -> dict:
    """Generate basic quiz when AI service is unavailable."""
    words = text.split()

    questions = [{
        "question": "What type of content does this document contain?",
        "options": [
            {"label": "A", "text": "Educational material"},
            {"label": "B", "text": "News article"},
            {"label": "C", "text": "Technical documentation"},
            {"label": "D", "text": "General information"}
        ],
        "correct_answer": "D",
        "explanation": reason or "AI service was unavailable for full quiz generation.",
        "category": "System"
    }]

    source_summary = " ".join(words[:50]) + "..." if len(words) > 50 else text

    return {
        "questions": questions,
        "source_summary": source_summary,
        "total_count": len(questions),
        "source": "fallback",
        "notice": reason,
        "difficulty": "easy"
    }
````

---

### 4. Quiz Routes (`backend/routes/quiz.py`)

```python
"""Quiz generation routes for PDERAX"""
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
    http_request: Request,
    request: QuizGenerateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Generate quiz questions from provided text using AI"""

    try:
        result = await ai_service.generate_quiz(
            text=request.text,
            count=request.count,
            difficulty=request.difficulty,
        )

        if not result.get("questions"):
            raise HTTPException(
                status_code=500,
                detail="Failed to generate quiz questions. Please try again."
            )

        # Convert to response model
        quiz_questions = [
            QuizQuestion(
                question=q.get("question", ""),
                options=q.get("options", []),
                correct_answer=q.get("correct_answer", "A"),
                explanation=q.get("explanation", ""),
                category=q.get("category")
            )
            for q in result["questions"]
        ]

        # Persist quiz set
        try:
            questions_data = [q.dict() for q in quiz_questions]
            analysis_uuid = None
            if getattr(request, "analysis_id", None):
                import uuid as _uuid
                try:
                    analysis_uuid = _uuid.UUID(request.analysis_id)
                except ValueError:
                    pass
            qs = QuizSet(
                user_id=current_user.id,
                analysis_id=analysis_uuid,
                title=f"Quiz from document",
                difficulty=request.difficulty,
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
            difficulty=request.difficulty,
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
    http_request: Request,
    request: QuickQuizRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Quick quiz generation endpoint"""
    text = request.text
    count = request.count
    difficulty = request.difficulty

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
            if request.analysis_id:
                import uuid as _uuid
                try:
                    analysis_uuid = _uuid.UUID(request.analysis_id)
                except ValueError:
                    pass
            qs = QuizSet(
                user_id=current_user.id,
                analysis_id=analysis_uuid,
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
            "generated_at": datetime.utcnow().isoformat(),
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Quiz generation error: {str(e)}")
```

---

### 5. Frontend API Method (`frontend/api.js`)

Add to APIService class:

```javascript
/**
 * Generate quiz questions from text
 * @param {string} text - Source text for quiz generation
 * @param {number} count - Number of questions to generate
 * @param {string} difficulty - Difficulty level (easy, medium, hard)
 * @returns {Promise<Object>} Generated quiz questions
 */
async generateQuiz(text, count = 10, difficulty = 'medium') {
    const response = await fetch(`${this.baseURL}/quiz/generate`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...this.getAuthHeader()
        },
        body: JSON.stringify({
            text: text,
            count: count,
            difficulty: difficulty
        })
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Quiz generation failed: ${response.status}`);
    }

    return await response.json();
}
```

---

### 6. Frontend Study Tools Update (`frontend/study-tools.html`)

Add quiz modal (similar to flashcard modal) and quiz results section.

---

### 7. Frontend Quiz Logic (`frontend/quiz.js`)

Create quiz state management:

- `currentQuestion` - current question index
- `userAnswers` - array of user's selected answers
- `quizQuestions` - array of generated questions
- `quizResults` - calculated results after submission

Key functions:

- `openQuizModal()` / `closeQuizModal()`
- `handleQuizUpload(file)`
- `generateQuiz()`
- `showQuestion(index)`
- `selectAnswer(questionIndex, answer)`
- `nextQuestion()` / `prevQuestion()`
- `submitQuiz()`
- `showResults()`
- `showQuestionReview(index)` - show why answer was right/wrong

---

## 🎨 UI/UX Design

### Quiz Generation Flow

1. **Hub Card** → Click "Generate Quiz"
2. **Upload Modal** → Upload document
3. **Processing** → "Analyzing document..."
4. **Settings** → Choose count (5-25) and difficulty
5. **Generating** → "AI is creating your quiz..."
6. **Quiz Mode** → Take quiz one question at a time

### Quiz Taking UI

```
┌─────────────────────────────────────────┐
│  Question 3 of 10           [Progress]  │
├─────────────────────────────────────────┤
│                                         │
│  What is the main function of...?       │
│                                         │
│  ○ A. Option one text here              │
│  ○ B. Option two text here              │
│  ● C. Option three text here  ← selected│
│  ○ D. Option four text here             │
│                                         │
├─────────────────────────────────────────┤
│  [← Previous]           [Next →]        │
│            [Submit Quiz]                │
└─────────────────────────────────────────┘
```

### Results Screen

```
┌─────────────────────────────────────────┐
│        🎉 Quiz Complete!                │
│                                         │
│     ┌───────────────────┐               │
│     │    8 / 10         │               │
│     │    80% Score      │               │
│     └───────────────────┘               │
│                                         │
│  ✓ 8 Correct    ✗ 2 Incorrect           │
│                                         │
├─────────────────────────────────────────┤
│  Review Your Answers:                   │
│                                         │
│  ✓ Q1: What is...                       │
│  ✓ Q2: Define...                        │
│  ✗ Q3: Which of... [View Explanation]   │
│  ...                                    │
│                                         │
│  [Take Another Quiz]  [Back to Hub]     │
└─────────────────────────────────────────┘
```

### Question Review Modal

```
┌─────────────────────────────────────────┐
│  Question 3                     [Close] │
├─────────────────────────────────────────┤
│  Which of the following is NOT...?      │
│                                         │
│  Your answer: B ✗                       │
│  Correct answer: D ✓                    │
│                                         │
│  Explanation:                           │
│  The correct answer is D because...     │
│                                         │
└─────────────────────────────────────────┘
```

---

## 📝 Implementation Checklist

### Phase 1: Backend (Day 1)

- [ ] Create `backend/schemas/quiz.py`
- [ ] Add QuizSet model to `backend/models/db_models.py`
- [ ] Add `generate_quiz()` to `backend/services/ai_service.py`
- [ ] Create `backend/routes/quiz.py`
- [ ] Register quiz router in `backend/main.py`
- [ ] Test API endpoints with Swagger

### Phase 2: Frontend Structure (Day 2)

- [ ] Add quiz modal to `frontend/study-tools.html`
- [ ] Add quiz results section to study-tools.html
- [ ] Create `frontend/css/quiz.css`
- [ ] Add `generateQuiz()` to `frontend/api.js`
- [ ] Create `frontend/quiz.js` with state management

### Phase 3: Quiz UI Logic (Day 2-3)

- [ ] Implement quiz upload flow (reuse flashcard pattern)
- [ ] Implement question navigation
- [ ] Implement answer selection
- [ ] Implement quiz submission
- [ ] Implement results display
- [ ] Implement question review with explanations

### Phase 4: Polish (Day 3)

- [ ] Add animations and transitions
- [ ] Mobile responsive testing
- [ ] Error handling and edge cases
- [ ] History integration
- [ ] Final testing

---

## 🔗 Dependencies

- Uses existing `/upload` endpoint for document processing
- Uses existing `AIService` class pattern
- Uses existing auth middleware (`get_current_user`)
- Uses existing CSS variables and glass-card styling
- Follows existing modal pattern from flashcards

---

## ⚠️ Notes

1. **Rate Limiting**: Quiz generation is set to 20/hour (slightly lower than flashcards due to larger token usage)

2. **Question Count**: Limited to 3-25 questions (reasonable for a single quiz session)

3. **Storage**: Questions stored as JSONB in PostgreSQL for flexibility

4. **No separate upload**: Reuses existing upload/analysis flow to avoid duplication

5. **Consistent UI**: Modal, processing, and results follow exact same pattern as flashcards for consistency
