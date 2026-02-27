# 🎓 PDERAX EDU - Master TODO List

> **Last Updated**: February 26, 2026  
> **Status**: Active Development  
> **Reference**: See `IMPLEMENTATION_PLAN.md` for detailed specs

---

## 📋 Project Vision

**What it is**: An AI-powered study platform where students upload notes, PDFs, and past questions → Get summaries, flashcards, quizzes, and an AI tutor.

**Business Model**:

- Free tier: 3 documents/day
- Premium: $5-15/month (unlimited)
- Campus Pack: Institutional licensing

---

## ✅ Current Status (Completed)

- [x] Document upload (PDF, DOCX, XLSX, TXT)
- [x] Text extraction with word limits (5,000 words)
- [x] AI summarization (DeepSeek API)
- [x] Key insights generation
- [x] Q&A generation
- [x] Multi-format exports (PDF, DOCX, TXT)
- [x] Basic JWT authentication
- [x] Email verification (basic)
- [x] Google OAuth integration
- [x] Backend deployed on Render
- [x] Responsive frontend

---

## 🚀 PHASE 1: Authentication Overhaul

**Priority**: 🔴 CRITICAL | **Duration**: 3-4 days | **Status**: ⏳ Not Started

### 1.1 Backend - User Model Updates

- [ ] Add `full_name` column to users table
- [ ] Add `avatar_url` column to users table
- [ ] Add `created_via` column (email/google)
- [ ] Add `last_login_at` column
- [ ] Add `preferences` JSONB column
- [ ] Create database migration script
- [ ] Run migration on local PostgreSQL

### 1.2 Backend - Auth Endpoints

- [ ] Update `/register` to require full_name
- [ ] Add password confirmation validation
- [ ] Update `/login` to return full user profile
- [ ] Create `GET /auth/me` endpoint
- [ ] Create `PUT /auth/profile` endpoint
- [ ] Update `last_login_at` on successful login
- [ ] Improve error messages for auth failures

### 1.3 Backend - Email Verification

- [ ] Ensure verification code is sent on registration
- [ ] Test verification flow end-to-end
- [ ] Add "resend code" rate limiting (60s)
- [ ] Clear expired verification codes

### 1.4 Frontend - Login Page Redesign

- [ ] Create clean, modern login form
- [ ] Add password visibility toggle
- [ ] Add "Remember me" checkbox
- [ ] Style Google OAuth button properly
- [ ] Add loading state on submit
- [ ] Show clear error messages
- [ ] Link to signup / forgot password

### 1.5 Frontend - Signup Flow

- [ ] Add full name input field
- [ ] Add password confirmation field
- [ ] Real-time password match validation
- [ ] Password strength indicator
- [ ] "Check your email" success page
- [ ] Verification code input page
- [ ] Redirect to dashboard after verification

### 1.6 Frontend - Route Protection

- [ ] Create `requireAuth()` function
- [ ] Add auth check to index.html
- [ ] Add auth check to all protected pages
- [ ] Redirect to login if not authenticated
- [ ] Pass redirect URL to login page
- [ ] Return to original page after login

### 1.7 Testing

- [ ] Test registration flow (new user)
- [ ] Test email verification
- [ ] Test login with correct credentials
- [ ] Test login with wrong credentials
- [ ] Test Google OAuth login
- [ ] Test protected route redirect
- [ ] Test token expiration handling

---

## 🚀 PHASE 2: Database Restructure

**Priority**: 🔴 CRITICAL | **Duration**: 2-3 days | **Status**: ⏳ Not Started

### 2.1 Create New Tables

- [ ] Create `documents` table (store uploaded file metadata)
- [ ] Create `flashcard_sets` table
- [ ] Create `flashcards` table
- [ ] Create `quizzes` table
- [ ] Create `quiz_questions` table
- [ ] Create `quiz_attempts` table
- [ ] Create `chat_sessions` table
- [ ] Create `chat_messages` table
- [ ] Create `user_activity` table
- [ ] Create `study_sessions` table
- [ ] Add all foreign keys and indexes

### 2.2 SQLAlchemy Models

- [ ] Create `models/study_models.py`
- [ ] Define Document model
- [ ] Define FlashcardSet model
- [ ] Define Flashcard model
- [ ] Define Quiz model
- [ ] Define QuizQuestion model
- [ ] Define QuizAttempt model
- [ ] Define ChatSession model
- [ ] Define ChatMessage model
- [ ] Define UserActivity model
- [ ] Import models in `__init__.py`

### 2.3 Database Migration

- [ ] Create SQL migration script
- [ ] Test migration on local DB
- [ ] Backup production DB
- [ ] Run migration on production
- [ ] Verify all tables created

---

## 🚀 PHASE 3: UI/UX Cleanup

**Priority**: 🟡 HIGH | **Duration**: 2-3 days | **Status**: ⏳ Not Started

### 3.1 Navigation Changes

- [ ] Remove "Docs" tab from navigation
- [ ] Update nav for logged-in users:
  - Dashboard | Analyzer | Flashcards | Quizzes | Chat
- [ ] Add user avatar dropdown (Profile, Settings, Logout)
- [ ] Make mobile menu work with new nav

### 3.2 Design System

- [ ] Define CSS variables (colors, spacing, typography)
- [ ] Implement 8px spacing grid
- [ ] Create consistent button styles
- [ ] Create consistent card styles
- [ ] Create consistent form input styles
- [ ] Define shadow system
- [ ] Define border-radius system

### 3.3 Dashboard Page (New)

- [ ] Create `dashboard.html`
- [ ] Add welcome message: "Welcome back, {Name}!"
- [ ] Add stats cards (Documents, Flashcards, Quizzes, Avg Score)
- [ ] Add recent activity feed
- [ ] Add quick action buttons
- [ ] Add "Continue Studying" section
- [ ] Make it the default landing after login

### 3.4 Cleanup Existing Pages

- [ ] Remove unnecessary text/descriptions
- [ ] Reduce padding in condensed areas
- [ ] Improve card spacing
- [ ] Clean up footer
- [ ] Remove unused CSS
- [ ] Remove commented code in JS

### 3.5 Components

- [ ] Create reusable toast notification component
- [ ] Create reusable modal component
- [ ] Create reusable loading spinner
- [ ] Create reusable empty state component
- [ ] Create reusable card component

### 3.6 Mobile Responsiveness

- [ ] Test all pages on mobile
- [ ] Fix any overflow issues
- [ ] Ensure touch targets are 44px+
- [ ] Test mobile menu
- [ ] Test forms on mobile

---

## 🚀 PHASE 4: Flashcard System

**Priority**: 🟡 HIGH | **Duration**: 4-5 days | **Status**: ⏳ Not Started

### 4.1 Backend - Service

- [ ] Create `services/flashcard_service.py`
- [ ] Implement `generate_flashcards(text, count)` method
- [ ] Create AI prompt for flashcard generation
- [ ] Parse AI response into structured data
- [ ] Handle AI errors gracefully

### 4.2 Backend - Routes

- [ ] Create `routes/flashcards.py`
- [ ] `POST /flashcards/generate` - Generate from document
- [ ] `GET /flashcards/sets` - List user's sets
- [ ] `GET /flashcards/sets/{id}` - Get set with cards
- [ ] `POST /flashcards/sets/{id}/review` - Record review
- [ ] `DELETE /flashcards/sets/{id}` - Delete set
- [ ] `POST /flashcards/sets/{id}/cards` - Add card manually
- [ ] Register router in main.py

### 4.3 Backend - Schemas

- [ ] Create `schemas/flashcard.py`
- [ ] FlashcardGenerateRequest
- [ ] FlashcardSetResponse
- [ ] FlashcardResponse
- [ ] ReviewRequest

### 4.4 Frontend - Flashcards Page

- [ ] Create `flashcards.html`
- [ ] List all flashcard sets
- [ ] Show card count and mastery % per set
- [ ] "Create New" button
- [ ] Delete set option
- [ ] Link to study mode

### 4.5 Frontend - Create Flow

- [ ] Modal to upload document OR select existing
- [ ] Show generation progress
- [ ] Preview generated cards
- [ ] Save to database

### 4.6 Frontend - Study Mode

- [ ] Full-screen flashcard view
- [ ] Show question side
- [ ] Tap/click to flip (CSS 3D animation)
- [ ] Show answer side
- [ ] "Got It" / "Didn't Know" buttons
- [ ] Track progress (X of Y cards)
- [ ] Progress bar
- [ ] End screen with stats

### 4.7 Testing

- [ ] Test flashcard generation from document
- [ ] Test create flashcard set
- [ ] Test list flashcard sets
- [ ] Test study mode navigation
- [ ] Test flip animation
- [ ] Test review tracking
- [ ] Test delete set

---

## 🚀 PHASE 5: Quiz System

**Priority**: 🟡 HIGH | **Duration**: 5-6 days | **Status**: ⏳ Not Started

### 5.1 Backend - Service

- [ ] Create `services/quiz_service.py`
- [ ] Implement `generate_quiz(text, question_count)` method
- [ ] Create AI prompt for MCQ generation
- [ ] Parse questions, options, correct answers
- [ ] Generate explanations for answers
- [ ] Handle AI errors gracefully

### 5.2 Backend - Routes

- [ ] Create `routes/quizzes.py`
- [ ] `POST /quizzes/generate` - Generate from document
- [ ] `GET /quizzes` - List user's quizzes
- [ ] `GET /quizzes/{id}` - Get quiz with questions
- [ ] `POST /quizzes/{id}/start` - Start attempt
- [ ] `POST /quizzes/{id}/submit` - Submit answers
- [ ] `GET /quizzes/{id}/results/{attempt_id}` - Get results
- [ ] Register router in main.py

### 5.3 Backend - Schemas

- [ ] Create `schemas/quiz.py`
- [ ] QuizGenerateRequest
- [ ] QuizResponse
- [ ] QuizQuestionResponse
- [ ] QuizSubmitRequest
- [ ] QuizResultResponse

### 5.4 Frontend - Quiz List Page

- [ ] Create `quizzes.html`
- [ ] List all quizzes
- [ ] Show question count, best score, attempts
- [ ] "Create Quiz" button
- [ ] Delete quiz option
- [ ] "Take Quiz" button

### 5.5 Frontend - Create Flow

- [ ] Modal to upload document OR select existing
- [ ] Select number of questions (5, 10, 15, 20)
- [ ] Show generation progress
- [ ] Preview generated quiz
- [ ] Save to database

### 5.6 Frontend - Quiz Taking Mode

- [ ] Full-screen quiz view
- [ ] Show question number (X of Y)
- [ ] Show question text
- [ ] Show 4 options (A, B, C, D) as buttons
- [ ] Highlight selected option
- [ ] Previous / Next buttons
- [ ] Question navigator (dots/numbers)
- [ ] Timer (optional)
- [ ] Submit button on last question

### 5.7 Frontend - Results Page

- [ ] Show score (percentage + X/Y correct)
- [ ] Visual score indicator (circle chart)
- [ ] Breakdown: correct, incorrect, skipped
- [ ] Time taken
- [ ] "Review Answers" button
- [ ] "Retake Quiz" button
- [ ] "Back to Quizzes" button

### 5.8 Frontend - Review Answers

- [ ] Show each question
- [ ] Highlight user's answer
- [ ] Show correct answer
- [ ] Show explanation
- [ ] Navigate between questions

### 5.9 Testing

- [ ] Test quiz generation
- [ ] Test quiz list
- [ ] Test start attempt
- [ ] Test answer selection
- [ ] Test submit answers
- [ ] Test scoring calculation
- [ ] Test results display
- [ ] Test answer review

---

## 🚀 PHASE 6: Study Chatbot

**Priority**: 🟢 MEDIUM | **Duration**: 4-5 days | **Status**: ⏳ Not Started

### 6.1 Backend - Service

- [ ] Create `services/chat_service.py`
- [ ] Implement `chat(message, context, history)` method
- [ ] Create system prompt for study assistant
- [ ] Maintain conversation context
- [ ] Handle context length limits
- [ ] Handle AI errors gracefully

### 6.2 Backend - Routes

- [ ] Create `routes/chat.py`
- [ ] `POST /chat/sessions` - Create new session
- [ ] `GET /chat/sessions` - List user's sessions
- [ ] `GET /chat/sessions/{id}` - Get session with messages
- [ ] `POST /chat/sessions/{id}/message` - Send message
- [ ] `DELETE /chat/sessions/{id}` - Delete session
- [ ] Register router in main.py

### 6.3 Backend - Schemas

- [ ] Create `schemas/chat.py`
- [ ] ChatSessionCreate
- [ ] ChatSessionResponse
- [ ] ChatMessageRequest
- [ ] ChatMessageResponse

### 6.4 Frontend - Chat Page

- [ ] Create `chat.html`
- [ ] Chat session list (sidebar)
- [ ] "New Chat" button
- [ ] Chat message area
- [ ] Message input field
- [ ] Send button
- [ ] Typing indicator

### 6.5 Frontend - Chat Features

- [ ] Display user messages (right aligned)
- [ ] Display AI messages (left aligned)
- [ ] Auto-scroll to bottom
- [ ] Show message timestamps
- [ ] Document context selector
- [ ] Session title editing
- [ ] Delete session confirmation

### 6.6 Testing

- [ ] Test create chat session
- [ ] Test send message
- [ ] Test receive AI response
- [ ] Test conversation history
- [ ] Test with document context
- [ ] Test session management

---

## 🚀 PHASE 7: Analytics Dashboard

**Priority**: 🟢 MEDIUM | **Duration**: 3-4 days | **Status**: ⏳ Not Started

### 7.1 Backend - Service

- [ ] Create `services/analytics_service.py`
- [ ] `get_user_stats(user_id)` - Overview stats
- [ ] `get_activity_feed(user_id, limit)` - Recent activity
- [ ] `get_quiz_performance(user_id)` - Quiz scores over time
- [ ] `get_study_time(user_id)` - Study duration stats

### 7.2 Backend - Routes

- [ ] Create `routes/analytics.py`
- [ ] `GET /analytics/overview` - Stats summary
- [ ] `GET /analytics/activity` - Activity feed
- [ ] `GET /analytics/quizzes` - Quiz performance
- [ ] `GET /analytics/study-time` - Study duration
- [ ] Register router in main.py

### 7.3 Backend - Activity Tracking

- [ ] Track document uploads
- [ ] Track flashcard reviews
- [ ] Track quiz completions
- [ ] Track chat messages
- [ ] Track login events

### 7.4 Frontend - Analytics Page

- [ ] Create `analytics.html`
- [ ] Stats cards (Documents, Study Time, Avg Score, Streak)
- [ ] Quiz performance chart (line chart)
- [ ] Subject breakdown (progress bars)
- [ ] Activity feed
- [ ] Date range selector

### 7.5 Charts

- [ ] Install/include Chart.js
- [ ] Quiz performance line chart
- [ ] Study time bar chart
- [ ] Subject pie chart

### 7.6 Testing

- [ ] Test stats calculation
- [ ] Test activity tracking
- [ ] Test chart rendering
- [ ] Test date filtering

---

## 🚀 PHASE 8: Admin Panel

**Priority**: 🔵 LOW | **Duration**: 3-4 days | **Status**: ⏳ Not Started

### 8.1 Backend - Admin Auth

- [ ] Add `is_admin` column to users table
- [ ] Create admin dependency/middleware
- [ ] Reject non-admin users

### 8.2 Backend - Admin Routes

- [ ] Create `routes/admin.py`
- [ ] `GET /admin/users` - List all users
- [ ] `GET /admin/users/{id}` - Get user details
- [ ] `PUT /admin/users/{id}` - Update user (deactivate)
- [ ] `GET /admin/metrics` - System metrics
- [ ] `GET /admin/activity` - System activity log
- [ ] Register router in main.py

### 8.3 Frontend - Admin Dashboard

- [ ] Create `admin/index.html`
- [ ] System metrics cards
- [ ] User management table
- [ ] Search/filter users
- [ ] User detail modal
- [ ] Deactivate user action
- [ ] Activity log

### 8.4 Testing

- [ ] Test admin access control
- [ ] Test user listing
- [ ] Test user deactivation
- [ ] Test metrics accuracy

---

## 📁 Files to Create

### Backend

```
backend/
├── models/
│   └── study_models.py          # NEW
├── schemas/
│   ├── flashcard.py             # NEW
│   ├── quiz.py                  # NEW
│   └── chat.py                  # NEW
├── routes/
│   ├── flashcards.py            # NEW
│   ├── quizzes.py               # NEW
│   ├── chat.py                  # NEW
│   ├── analytics.py             # NEW
│   └── admin.py                 # NEW
├── services/
│   ├── flashcard_service.py     # NEW
│   ├── quiz_service.py          # NEW
│   ├── chat_service.py          # NEW
│   └── analytics_service.py     # NEW
└── migrations/
    └── 001_add_study_tables.sql # NEW
```

### Frontend

```
frontend/
├── dashboard.html               # NEW
├── flashcards.html              # NEW
├── quizzes.html                 # NEW
├── chat.html                    # NEW
├── analytics.html               # NEW
├── admin/
│   └── index.html               # NEW
└── components/
    ├── toast.js                 # NEW
    ├── modal.js                 # NEW
    └── loader.js                # NEW
```

---

## 📅 Timeline

| Phase   | Duration | Dependencies | Target   |
| ------- | -------- | ------------ | -------- |
| Phase 1 | 3-4 days | None         | Week 1   |
| Phase 2 | 2-3 days | Phase 1      | Week 1-2 |
| Phase 3 | 2-3 days | Phase 1      | Week 2   |
| Phase 4 | 4-5 days | Phase 2, 3   | Week 3   |
| Phase 5 | 5-6 days | Phase 2, 3   | Week 4   |
| Phase 6 | 4-5 days | Phase 2      | Week 5   |
| Phase 7 | 3-4 days | Phase 4, 5   | Week 6   |
| Phase 8 | 3-4 days | All above    | Week 7   |

**Total**: 5-7 weeks

---

## 🔥 Quick Start: What to Do First

1. **Start Phase 1.1**: Update User model with `full_name`
2. **Start Phase 1.4**: Redesign login page
3. **Start Phase 1.6**: Add route protection

These three tasks unblock everything else and improve UX immediately.

---

## 📝 Notes

- All backend endpoints require authentication except `/auth/register`, `/auth/login`, `/auth/verify`
- Use PostgreSQL for all database operations
- Keep AI timeouts at 20 seconds max
- Always handle AI failures gracefully with fallbacks
- Test on mobile after every UI change
