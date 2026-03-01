# 🚀 PDERAX EDU - Complete Implementation Plan

## 📋 Executive Summary

Transform PDERAX from a basic document analyzer into a **full-featured AI-powered study platform** with proper authentication, flashcards, quizzes, chatbot, and analytics.

**Target User**: Students who want to study smarter using AI
**Core Value**: Upload notes → Get flashcards, quizzes, AI tutor, and analytics

---

## 🏗️ Current State Assessment

### ✅ What Works

- Document upload (PDF, DOCX, XLSX, TXT)
- Text extraction with word limits
- AI-powered summarization (DeepSeek)
- Key insights and Q&A generation
- Multi-format exports (PDF, DOCX, TXT)
- Basic JWT authentication
- Email verification (partially working)
- Google OAuth (configured)

### ❌ Problems Identified

1. **Authentication Issues**
   - Minimal user data collected (just email/password)
   - No password confirmation on signup
   - Inconsistent login page behavior
   - Unprotected routes accessible without login
   - Poor redirect flow after auth

2. **Database Limitations**
   - No user profile data (name, avatar, preferences)
   - No tables for flashcards, quizzes, or chat history
   - No analytics/progress tracking tables
   - No document storage (files processed but not saved)

3. **UI/UX Problems**
   - Condensed, cluttered design
   - Unnecessary text and sections
   - No personalized welcome experience
   - Docs tab not needed
   - Inconsistent styling across pages

4. **Missing Features**
   - No flashcard generation
   - No quiz/MCQ system
   - No study chatbot
   - No analytics dashboard
   - No admin panel

---

## 🎯 Implementation Phases

---

## PHASE 1: Authentication Overhaul

**Priority**: 🔴 Critical | **Duration**: 3-4 days

### 1.1 Database Changes

```sql
-- Update users table
ALTER TABLE users ADD COLUMN full_name VARCHAR(100);
ALTER TABLE users ADD COLUMN avatar_url VARCHAR(500);
ALTER TABLE users ADD COLUMN created_via VARCHAR(20) DEFAULT 'email'; -- email, google
ALTER TABLE users ADD COLUMN last_login_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN preferences JSONB DEFAULT '{}';
```

### 1.2 Backend Changes

**Update User Model** (`models/db_models.py`):

```python
class User(Base):
    __tablename__ = "users"

    id = Column(UUID, primary_key=True, default=uuid.uuid4)
    email = Column(String(320), unique=True, index=True, nullable=False)
    full_name = Column(String(100), nullable=True)
    password_hash = Column(String(255), nullable=True)
    avatar_url = Column(String(500), nullable=True)
    created_via = Column(String(20), default="email")  # email, google
    is_verified = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    last_login_at = Column(DateTime(timezone=True), nullable=True)
    preferences = Column(JSONB, default={})
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
```

**Update Auth Schemas** (`schemas/auth.py`):

```python
class RegisterRequest(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=2, max_length=100)
    password: str = Field(min_length=8, max_length=72)
    password_confirm: str = Field(min_length=8, max_length=72)

    @validator('password_confirm')
    def passwords_match(cls, v, values):
        if 'password' in values and v != values['password']:
            raise ValueError('Passwords do not match')
        return v
```

**New Endpoints**:

- `POST /api/v1/auth/register` - With name + password confirmation
- `POST /api/v1/auth/login` - Returns user profile with tokens
- `GET /api/v1/auth/me` - Get current user profile
- `PUT /api/v1/auth/profile` - Update profile
- `POST /api/v1/auth/logout` - Invalidate tokens (optional)

### 1.3 Frontend Changes

**Login Page Redesign** (`login.html`):

- Clean, modern design
- Consistent styling
- Clear form validation
- Password visibility toggle
- "Remember me" option
- Social login buttons (Google)
- Link to signup/forgot password

**Signup Flow**:

1. Enter: Full Name, Email, Password, Confirm Password
2. Submit → Show "Check your email" page
3. Enter verification code
4. Redirect to portal with welcome message

**Route Protection**:

```javascript
// Check auth on every page load
function requireAuth() {
  const token = localStorage.getItem("pderax_access_token");
  if (!token) {
    window.location.href =
      "/frontend/login.html?redirect=" +
      encodeURIComponent(window.location.href);
    return false;
  }
  return true;
}
```

### 1.4 Deliverables

- [ ] Updated User model with new fields
- [ ] Database migration script
- [ ] Updated register endpoint with password confirmation
- [ ] Updated login to return full user profile
- [ ] GET /me endpoint for profile fetch
- [ ] Redesigned login.html page
- [ ] Redesigned signup flow with email verification
- [ ] Auth check on all protected pages
- [ ] Welcome message with user's name

---

## PHASE 2: Database Restructure

**Priority**: 🔴 Critical | **Duration**: 2-3 days

### 2.1 New Tables

```sql
-- Documents table (store uploaded files metadata)
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    file_type VARCHAR(20) NOT NULL,
    file_size_bytes INTEGER,
    extracted_text TEXT,
    word_count INTEGER,
    status VARCHAR(20) DEFAULT 'processed', -- processing, processed, failed
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Flashcard sets
CREATE TABLE flashcard_sets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    card_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Individual flashcards
CREATE TABLE flashcards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    set_id UUID REFERENCES flashcard_sets(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    difficulty VARCHAR(20) DEFAULT 'medium', -- easy, medium, hard
    times_reviewed INTEGER DEFAULT 0,
    times_correct INTEGER DEFAULT 0,
    last_reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Quizzes
CREATE TABLE quizzes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    question_count INTEGER DEFAULT 0,
    time_limit_minutes INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Quiz questions
CREATE TABLE quiz_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    question_type VARCHAR(20) DEFAULT 'mcq', -- mcq, true_false, short_answer
    options JSONB, -- ["A. Option 1", "B. Option 2", "C. Option 3", "D. Option 4"]
    correct_answer VARCHAR(10) NOT NULL, -- "A", "B", "C", "D" or "true"/"false"
    explanation TEXT,
    points INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Quiz attempts
CREATE TABLE quiz_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    score INTEGER DEFAULT 0,
    max_score INTEGER DEFAULT 0,
    percentage DECIMAL(5,2),
    answers JSONB, -- {"question_id": "user_answer", ...}
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    time_taken_seconds INTEGER
);

-- Chat sessions (for AI tutor)
CREATE TABLE chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
    title VARCHAR(200),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chat messages
CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL, -- 'user' or 'assistant'
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User analytics/activity
CREATE TABLE user_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    activity_type VARCHAR(50) NOT NULL, -- 'document_upload', 'quiz_completed', 'flashcard_reviewed', etc.
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Study sessions (for tracking study time)
CREATE TABLE study_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    duration_minutes INTEGER,
    activity_summary JSONB -- {"flashcards_reviewed": 10, "quiz_score": 85}
);

-- Indexes for performance
CREATE INDEX idx_documents_user_id ON documents(user_id);
CREATE INDEX idx_flashcard_sets_user_id ON flashcard_sets(user_id);
CREATE INDEX idx_quizzes_user_id ON quizzes(user_id);
CREATE INDEX idx_quiz_attempts_user_id ON quiz_attempts(user_id);
CREATE INDEX idx_chat_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX idx_user_activity_user_id ON user_activity(user_id);
CREATE INDEX idx_user_activity_created_at ON user_activity(created_at);
```

### 2.2 SQLAlchemy Models

Create `models/study_models.py`:

```python
class Document(Base):
    __tablename__ = "documents"
    # ... fields

class FlashcardSet(Base):
    __tablename__ = "flashcard_sets"
    # ... fields

class Flashcard(Base):
    __tablename__ = "flashcards"
    # ... fields

class Quiz(Base):
    __tablename__ = "quizzes"
    # ... fields

class QuizQuestion(Base):
    __tablename__ = "quiz_questions"
    # ... fields

class QuizAttempt(Base):
    __tablename__ = "quiz_attempts"
    # ... fields

class ChatSession(Base):
    __tablename__ = "chat_sessions"
    # ... fields

class ChatMessage(Base):
    __tablename__ = "chat_messages"
    # ... fields

class UserActivity(Base):
    __tablename__ = "user_activity"
    # ... fields
```

### 2.3 Deliverables

- [ ] SQL migration script for all new tables
- [ ] SQLAlchemy models for all entities
- [ ] Database relationships properly defined
- [ ] Indexes for performance
- [ ] Test migration on local PostgreSQL

---

## PHASE 3: UI/UX Cleanup

**Priority**: 🟡 High | **Duration**: 2-3 days

### 3.1 Global Changes

**Remove/Simplify**:

- [ ] Remove Docs tab from navigation
- [ ] Remove unnecessary explanatory text
- [ ] Reduce padding/margin in condensed areas
- [ ] Remove redundant buttons/actions
- [ ] Simplify footer

**Add/Improve**:

- [ ] Consistent color scheme (define CSS variables)
- [ ] Better typography hierarchy
- [ ] Improved spacing system (8px grid)
- [ ] Loading states for all actions
- [ ] Success/error feedback (toast notifications)
- [ ] Mobile-first responsive design

### 3.2 Navigation Redesign

**Before Login**:

```
Logo | Features | Pricing | Login | Sign Up
```

**After Login (Portal)**:

```
Logo | Dashboard | Analyzer | Flashcards | Quizzes | Chat | [Avatar Dropdown]
                                                              └─ Profile
                                                              └─ Settings
                                                              └─ Logout
```

### 3.3 Welcome Experience

**Dashboard Page** (new landing after login):

```
┌─────────────────────────────────────────────────────────────────┐
│  👋 Welcome back, {User's First Name}!                         │
│  ──────────────────────────────────────────────────────────────│
│                                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │ 📄 12    │  │ 🎴 45    │  │ 📝 8     │  │ 📊 78%   │       │
│  │ Documents│  │ Flashcard│  │ Quizzes  │  │ Avg Score│       │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘       │
│                                                                 │
│  📈 Recent Activity                    🚀 Quick Actions        │
│  ├─ Completed Biology Quiz (85%)       [+ Upload Notes]        │
│  ├─ Reviewed Chemistry Flashcards      [+ Create Quiz]         │
│  └─ Uploaded Lecture_Notes.pdf         [+ New Flashcards]      │
│                                                                 │
│  📚 Continue Studying                                          │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Biology 101 - Flashcards    │ 15 cards │ [Continue →]  │   │
│  │ Chemistry Quiz              │ 10 Qs    │ [Start →]     │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### 3.4 CSS Variables System

```css
:root {
  /* Colors */
  --color-primary: #4f46e5;
  --color-primary-dark: #4338ca;
  --color-secondary: #06b6d4;
  --color-success: #10b981;
  --color-warning: #f59e0b;
  --color-error: #ef4444;

  /* Neutrals */
  --color-bg: #0f172a;
  --color-bg-secondary: #1e293b;
  --color-bg-card: #1e293b;
  --color-text: #f8fafc;
  --color-text-muted: #94a3b8;
  --color-border: #334155;

  /* Spacing (8px grid) */
  --space-1: 0.25rem; /* 4px */
  --space-2: 0.5rem; /* 8px */
  --space-3: 0.75rem; /* 12px */
  --space-4: 1rem; /* 16px */
  --space-6: 1.5rem; /* 24px */
  --space-8: 2rem; /* 32px */
  --space-12: 3rem; /* 48px */

  /* Typography */
  --font-sans: "Inter", system-ui, sans-serif;
  --font-mono: "JetBrains Mono", monospace;

  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.3);
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.3);
  --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.3);

  /* Borders */
  --radius-sm: 0.375rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;
  --radius-full: 9999px;
}
```

### 3.5 Deliverables

- [ ] Remove Docs tab
- [ ] CSS variables system implemented
- [ ] New navigation structure
- [ ] Dashboard page with welcome message
- [ ] Cleaned up Analyzer page
- [ ] Consistent button styles
- [ ] Toast notification system
- [ ] Loading spinner component
- [ ] Mobile responsive fixes

---

## PHASE 4: Flashcard System

**Priority**: 🟡 High | **Duration**: 4-5 days

### 4.1 Backend

**New Routes** (`routes/flashcards.py`):

```python
@router.post("/generate")
# Upload document → AI generates flashcards → Save to DB

@router.get("/sets")
# Get all flashcard sets for user

@router.get("/sets/{set_id}")
# Get specific set with all cards

@router.post("/sets/{set_id}/review")
# Record review result (correct/incorrect)

@router.delete("/sets/{set_id}")
# Delete a flashcard set
```

**AI Service Extension** (`services/flashcard_service.py`):

```python
class FlashcardService:
    def generate_flashcards(self, text: str, count: int = 10) -> list:
        prompt = f"""
        Generate {count} flashcards from this content.

        Format each as:
        Q: [question]
        A: [answer]

        Content:
        {text}
        """
        # Call DeepSeek → Parse response → Return list
```

### 4.2 Frontend

**Flashcards Page**:

```
┌─────────────────────────────────────────────────────────────────┐
│  🎴 My Flashcards                              [+ Create New]  │
│  ──────────────────────────────────────────────────────────────│
│                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ Biology 101     │  │ Chemistry       │  │ History Notes   │ │
│  │ 25 cards        │  │ 18 cards        │  │ 32 cards        │ │
│  │ 80% mastered    │  │ 45% mastered    │  │ 60% mastered    │ │
│  │ [Study →]       │  │ [Study →]       │  │ [Study →]       │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

**Flashcard Study Mode**:

```
┌─────────────────────────────────────────────────────────────────┐
│  Biology 101                                    Card 5 of 25   │
│  ──────────────────────────────────────────────────────────────│
│                                                                 │
│          ┌───────────────────────────────────────┐             │
│          │                                       │             │
│          │   What is the powerhouse of the      │             │
│          │   cell?                               │             │
│          │                                       │             │
│          │            [Tap to flip]              │             │
│          │                                       │             │
│          └───────────────────────────────────────┘             │
│                                                                 │
│          [❌ Didn't Know]        [✅ Got It!]                   │
│                                                                 │
│  Progress: ████████░░░░░░░░░░░░ 40%                            │
└─────────────────────────────────────────────────────────────────┘
```

### 4.3 Deliverables

- [ ] FlashcardService with AI generation
- [ ] CRUD endpoints for flashcard sets
- [ ] Review tracking endpoint
- [ ] Flashcards list page
- [ ] Create flashcards modal (upload → generate)
- [ ] Flashcard study mode with flip animation
- [ ] Progress tracking per set
- [ ] Correct/incorrect buttons with feedback

---

## PHASE 5: Quiz System

**Priority**: 🟡 High | **Duration**: 5-6 days

### 5.1 Backend

**New Routes** (`routes/quizzes.py`):

```python
@router.post("/generate")
# Upload document → AI generates quiz questions

@router.get("/")
# List all quizzes for user

@router.get("/{quiz_id}")
# Get quiz with questions

@router.post("/{quiz_id}/start")
# Start a quiz attempt

@router.post("/{quiz_id}/submit")
# Submit answers → Calculate score

@router.get("/{quiz_id}/results/{attempt_id}")
# Get detailed results
```

**AI Service Extension** (`services/quiz_service.py`):

```python
class QuizService:
    def generate_quiz(self, text: str, question_count: int = 10) -> dict:
        prompt = f"""
        Generate {question_count} multiple choice questions from this content.

        Format each question as:
        QUESTION: [question text]
        A) [option 1]
        B) [option 2]
        C) [option 3]
        D) [option 4]
        ANSWER: [correct letter]
        EXPLANATION: [why this is correct]

        Content:
        {text}
        """
```

### 5.2 Frontend

**Quiz List Page**:

```
┌─────────────────────────────────────────────────────────────────┐
│  📝 My Quizzes                                [+ Create Quiz]  │
│  ──────────────────────────────────────────────────────────────│
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Biology Midterm Review                    10 questions  │   │
│  │ Best Score: 85%  |  Attempts: 3          [Take Quiz →] │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Chemistry Chapter 5                       15 questions  │   │
│  │ Best Score: --   |  Attempts: 0          [Take Quiz →] │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

**Quiz Taking Mode**:

```
┌─────────────────────────────────────────────────────────────────┐
│  Biology Midterm Review              Question 3 of 10  ⏱️ 5:32 │
│  ──────────────────────────────────────────────────────────────│
│                                                                 │
│  What is the primary function of mitochondria in a cell?       │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  ○  A) Protein synthesis                                │   │
│  └─────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  ●  B) Energy production (ATP)           ← Selected    │   │
│  └─────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  ○  C) Cell division                                    │   │
│  └─────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  ○  D) Waste removal                                    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  [← Previous]                                    [Next →]      │
│                                                                 │
│  Progress: ███░░░░░░░ 3/10                                     │
└─────────────────────────────────────────────────────────────────┘
```

**Results Page**:

```
┌─────────────────────────────────────────────────────────────────┐
│  🎉 Quiz Complete!                                              │
│  ──────────────────────────────────────────────────────────────│
│                                                                 │
│              ┌─────────────────────┐                           │
│              │        85%          │                           │
│              │    Your Score       │                           │
│              │   8/10 correct      │                           │
│              └─────────────────────┘                           │
│                                                                 │
│  📊 Breakdown:                                                  │
│  ✅ Correct: 8    ❌ Incorrect: 2    ⏱️ Time: 4:23             │
│                                                                 │
│  [Review Answers]    [Retake Quiz]    [Back to Quizzes]        │
└─────────────────────────────────────────────────────────────────┘
```

### 5.3 Deliverables

- [ ] QuizService with AI generation
- [ ] Quiz CRUD endpoints
- [ ] Quiz attempt tracking
- [ ] Scoring system
- [ ] Quiz list page
- [ ] Quiz creation flow
- [ ] Quiz taking interface (MCQ selection)
- [ ] Timer functionality
- [ ] Results page with breakdown
- [ ] Answer review with explanations

---

## PHASE 6: Study Chatbot

**Priority**: 🟢 Medium | **Duration**: 4-5 days

### 6.1 Backend

**New Routes** (`routes/chat.py`):

```python
@router.post("/sessions")
# Create new chat session (optionally linked to document)

@router.get("/sessions")
# List user's chat sessions

@router.post("/sessions/{session_id}/message")
# Send message → Get AI response

@router.get("/sessions/{session_id}/history")
# Get chat history
```

**Chat Service** (`services/chat_service.py`):

```python
class ChatService:
    def chat(self, message: str, context: str, history: list) -> str:
        system_prompt = f"""
        You are a helpful study assistant. The student is studying this content:

        {context}

        Answer questions helpfully and encourage learning.
        If asked about topics not in the content, gently redirect.
        """

        messages = [{"role": "system", "content": system_prompt}]
        messages.extend(history[-10:])  # Last 10 messages for context
        messages.append({"role": "user", "content": message})

        # Call DeepSeek → Return response
```

### 6.2 Frontend

**Chat Interface**:

```
┌─────────────────────────────────────────────────────────────────┐
│  💬 Study Assistant                           📄 Biology Notes │
│  ──────────────────────────────────────────────────────────────│
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  🤖 Hi! I'm your study assistant for Biology Notes.    │   │
│  │     What would you like to learn about?                │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  👤 Can you explain how photosynthesis works?          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  🤖 Of course! Photosynthesis is the process by which  │   │
│  │     plants convert sunlight into energy...              │   │
│  │                                                         │   │
│  │     The equation is: 6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂       │   │
│  │                                                         │   │
│  │     Would you like me to explain each step in detail?  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Type your message...                        [Send →]  │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### 6.3 Deliverables

- [ ] ChatService with context-aware responses
- [ ] Chat session endpoints
- [ ] Message history storage
- [ ] Chat UI component
- [ ] Document context selection
- [ ] Typing indicator
- [ ] Message timestamps
- [ ] Session management

---

## PHASE 7: Analytics Dashboard

**Priority**: 🟢 Medium | **Duration**: 3-4 days

### 7.1 Backend

**New Routes** (`routes/analytics.py`):

```python
@router.get("/overview")
# Get user's overall stats

@router.get("/activity")
# Get recent activity feed

@router.get("/progress")
# Get learning progress over time

@router.get("/quiz-performance")
# Get quiz scores over time
```

### 7.2 Frontend

**Analytics Dashboard**:

```
┌─────────────────────────────────────────────────────────────────┐
│  📊 Your Progress                             Last 30 Days ▼  │
│  ──────────────────────────────────────────────────────────────│
│                                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │ 📚 24    │  │ ⏱️ 12h   │  │ 🎯 82%   │  │ 🔥 7     │       │
│  │ Documents│  │Study Time│  │ Avg Score│  │ Day Streak│       │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘       │
│                                                                 │
│  📈 Quiz Performance                                           │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │     100% │                         ●                    │   │
│  │      80% │    ●         ●    ●  ●                      │   │
│  │      60% │ ●     ●   ●                                  │   │
│  │      40% │                                              │   │
│  │      20% │                                              │   │
│  │       0% └──────────────────────────────────────────── │   │
│  │           W1   W2   W3   W4   W5   W6   W7   W8        │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  📚 Subject Breakdown                                          │
│  ├── Biology      ████████████░░░░░░░░ 65%                     │
│  ├── Chemistry    ██████████░░░░░░░░░░ 50%                     │
│  └── History      ████████████████░░░░ 80%                     │
└─────────────────────────────────────────────────────────────────┘
```

### 7.3 Deliverables

- [ ] Analytics service for data aggregation
- [ ] Overview stats endpoint
- [ ] Activity tracking middleware
- [ ] Progress over time endpoint
- [ ] Analytics dashboard page
- [ ] Stats cards component
- [ ] Progress charts (Chart.js)
- [ ] Activity feed component

---

## PHASE 8: Admin Panel

**Priority**: 🔵 Low | **Duration**: 3-4 days

### 8.1 Features

- User management (list, view, deactivate)
- System metrics (total users, active users, uploads)
- Activity logs
- Feature flags (enable/disable features)
- Basic moderation tools

### 8.2 Access Control

```python
class AdminDependency:
    def __call__(self, user: User = Depends(get_current_user)):
        if not user.is_admin:
            raise HTTPException(403, "Admin access required")
        return user
```

### 8.3 Deliverables

- [ ] Admin role field in User model
- [ ] Admin middleware/dependency
- [ ] Admin routes (users, metrics)
- [ ] Admin dashboard page
- [ ] User management table
- [ ] System metrics display

---

## 📅 Timeline Overview

| Phase                  | Duration | Dependencies |
| ---------------------- | -------- | ------------ |
| Phase 1: Auth Overhaul | 3-4 days | None         |
| Phase 2: Database      | 2-3 days | Phase 1      |
| Phase 3: UI/UX         | 2-3 days | Phase 1      |
| Phase 4: Flashcards    | 4-5 days | Phase 2, 3   |
| Phase 5: Quizzes       | 5-6 days | Phase 2, 3   |
| Phase 6: Chatbot       | 4-5 days | Phase 2      |
| Phase 7: Analytics     | 3-4 days | Phase 4, 5   |
| Phase 8: Admin         | 3-4 days | All above    |

**Total Estimated Time**: 26-34 days (5-7 weeks)

---

## 🔧 Technical Decisions

### Stack Confirmation

- **Backend**: FastAPI + PostgreSQL + SQLAlchemy
- **Frontend**: Vanilla JS (no framework - keep it light)
- **AI**: DeepSeek API
- **Auth**: JWT + OAuth
- **Email**: SendGrid
- **Hosting**: Render.com

### Code Organization

```
backend/
├── main.py
├── database.py
├── dependencies.py
├── auth_dependencies.py
├── models/
│   ├── db_models.py      # User, EmailVerification, OAuthAccount
│   └── study_models.py   # Document, Flashcard, Quiz, Chat, etc.
├── schemas/
│   ├── auth.py
│   ├── flashcard.py
│   ├── quiz.py
│   └── chat.py
├── routes/
│   ├── auth.py
│   ├── upload.py
│   ├── flashcards.py
│   ├── quizzes.py
│   ├── chat.py
│   ├── analytics.py
│   └── admin.py
├── services/
│   ├── ai_service.py
│   ├── auth_service.py
│   ├── flashcard_service.py
│   ├── quiz_service.py
│   ├── chat_service.py
│   └── analytics_service.py
└── utils/
    ├── text_extractor.py
    ├── export_utils.py
    └── file_utils.py

frontend/
├── index.html           # Landing page (before login)
├── login.html           # Auth page
├── dashboard.html       # Welcome page (after login)
├── analyzer.html        # Document analyzer
├── flashcards.html      # Flashcard system
├── quizzes.html         # Quiz system
├── chat.html            # AI chatbot
├── analytics.html       # Progress dashboard
├── style.css            # Global styles
├── api.js               # API service
├── auth.js              # Auth handling
├── app.js               # Main app logic
└── components/          # Reusable JS components
    ├── toast.js
    ├── modal.js
    └── loader.js
```

---

## ✅ Next Steps

1. **Start Phase 1**: Authentication overhaul
   - Update User model
   - Fix registration flow
   - Redesign login page
   - Implement route protection

2. **Review this plan** and adjust priorities if needed

3. **Set up local PostgreSQL** for development (or use Render's managed DB)

Ready to begin Phase 1?
