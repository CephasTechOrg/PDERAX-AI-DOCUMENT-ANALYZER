# 🎓 PDERAX EDU - TODO LIST

## 📋 Vision

**What it is:**
A platform where students upload PDFs, screenshots, lecture notes, and past questions.
Then AI generates summaries, flashcards, quizzes, exam predictions, and a personal tutor chatbot.

**Why it blows up:**
- Education is daily usage
- Every student studies every week, panics during exams, needs help
- This becomes addictive

**Business model:**
- Free basic tier
- Premium: $5–$15/month
- "Campus pack": schools pay for students

---

## ✅ Current Status (What We Have)

- [x] Document upload (PDF, DOCX, XLSX, TXT)
- [x] AI text extraction with word limits
- [x] AI-powered summarization (DeepSeek)
- [x] Key insights generation
- [x] Q&A generation
- [x] Multi-format exports (PDF, DOCX, TXT)
- [x] Backend deployed on Render
- [x] Responsive frontend
- [x] Mobile-friendly UI

---

## 🎯 NEXT STEPS (Priority Order)

### 1. Add Flashcard Generation ⏰ **START HERE**

**Backend:**
- [ ] Create `backend/services/flashcard_service.py`
- [ ] Add flashcard generation to AI prompts
- [ ] Format: Q: [question] | A: [answer]
- [ ] Add endpoint `/api/v1/flashcards` to routes
- [ ] Return structured flashcard data

**Frontend:**
- [ ] Add "Generate Flashcards" button in results
- [ ] Create flashcard viewer component
- [ ] Add flip animation (CSS)
- [ ] Add navigation (next/previous)
- [ ] Add export flashcards option
- [ ] Mobile-responsive flashcard viewer

**Files to create/edit:**
- `backend/services/flashcard_service.py` (NEW)
- `backend/routes/upload.py` (EDIT - add flashcard endpoint)
- `frontend/app.js` (EDIT - add flashcard display)
- `frontend/style.css` (EDIT - add flashcard styles)
- `index.html` (EDIT - add flashcard UI)

---

### 2. Add Quiz Generation

**Backend:**
- [ ] Create `backend/services/quiz_service.py`
- [ ] Generate multiple choice questions (MCQ)
- [ ] Generate True/False questions
- [ ] Generate answers with explanations
- [ ] Add difficulty levels (easy, medium, hard)
- [ ] Add endpoint `/api/v1/quiz`

**Frontend:**
- [ ] Create quiz interface component
- [ ] Add answer selection UI
- [ ] Add "Check Answer" button
- [ ] Show correct/incorrect feedback
- [ ] Display score at the end
- [ ] Add "Retake Quiz" option
- [ ] Export quiz as PDF

**Files to create/edit:**
- `backend/services/quiz_service.py` (NEW)
- `backend/routes/upload.py` (EDIT - add quiz endpoint)
- `frontend/app.js` (EDIT - add quiz logic)
- `frontend/style.css` (EDIT - add quiz styles)
- `index.html` (EDIT - add quiz UI)

---

### 3. Add User Authentication

**Backend:**
- [ ] Choose auth method (JWT recommended)
- [ ] Create `backend/models/user_models.py`
- [ ] Create `backend/routes/auth.py`
- [ ] Add signup endpoint `/api/v1/auth/signup`
- [ ] Add login endpoint `/api/v1/auth/login`
- [ ] Add logout endpoint `/api/v1/auth/logout`
- [ ] Add password hashing (bcrypt)
- [ ] Add JWT token generation
- [ ] Protect routes with auth middleware
- [ ] Add database (PostgreSQL or MongoDB)

**Frontend:**
- [ ] Create login page
- [ ] Create signup page
- [ ] Add authentication state management
- [ ] Store JWT token in localStorage
- [ ] Add "Log Out" button
- [ ] Protect routes (redirect if not logged in)
- [ ] Add user profile section

**Files to create/edit:**
- `backend/models/user_models.py` (NEW)
- `backend/routes/auth.py` (NEW)
- `backend/middleware/auth_middleware.py` (NEW)
- `backend/database.py` (NEW)
- `frontend/login.html` (NEW)
- `frontend/signup.html` (NEW)
- `frontend/auth.js` (NEW)

**Dependencies to add:**
```txt
PyJWT==2.8.0
bcrypt==4.1.2
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
```

---

### 4. Add Database & User Data Management

**Backend:**
- [ ] Set up PostgreSQL database
- [ ] Create user table schema
- [ ] Create documents table (track uploads)
- [ ] Create flashcards table (save generated)
- [ ] Create quizzes table (save results)
- [ ] Add SQLAlchemy ORM
- [ ] Create database migrations
- [ ] Add database connection pooling

**Database Schema:**
```sql
users: id, email, password_hash, created_at, subscription_tier
documents: id, user_id, filename, upload_date, processed
flashcards: id, document_id, question, answer
quizzes: id, document_id, questions, answers
user_progress: id, user_id, documents_count, flashcards_studied
```

**Files to create:**
- `backend/database.py` (NEW)
- `backend/models/database_models.py` (NEW)
- `backend/alembic/` (NEW - for migrations)

**Dependencies to add:**
```txt
sqlalchemy==2.0.25
psycopg2-binary==2.9.9
alembic==1.13.1
```

---

### 5. Add Subscription System (Freemium)

**Backend:**
- [ ] Create `backend/models/subscription_models.py`
- [ ] Add Stripe integration
- [ ] Create `/api/v1/subscription/create-checkout`
- [ ] Create `/api/v1/subscription/webhook` (Stripe)
- [ ] Add tier checking middleware
- [ ] Free tier: 5 docs/month
- [ ] Premium tier: unlimited
- [ ] Track usage per user

**Frontend:**
- [ ] Create pricing page
- [ ] Add "Upgrade to Premium" button
- [ ] Add Stripe checkout integration
- [ ] Show usage limits on dashboard
- [ ] Add subscription management page

**Files to create/edit:**
- `backend/models/subscription_models.py` (NEW)
- `backend/routes/subscription.py` (NEW)
- `backend/services/stripe_service.py` (NEW)
- `frontend/pricing.html` (EDIT - make functional)
- `frontend/subscription.js` (NEW)

**Dependencies to add:**
```txt
stripe==7.10.0
```

**Environment variables to add:**
```env
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=your_webhook_secret
```

---

### 6. Add Personal Tutor Chatbot

**Backend:**
- [ ] Create `backend/services/chatbot_service.py`
- [ ] Implement RAG (Retrieval Augmented Generation)
- [ ] Store document embeddings
- [ ] Create `/api/v1/chat` endpoint
- [ ] Add conversation history
- [ ] Add context from uploaded documents

**Frontend:**
- [ ] Create chat interface
- [ ] Add message input
- [ ] Display chat history
- [ ] Add typing indicator
- [ ] Add "Ask AI Tutor" button

**Files to create:**
- `backend/services/chatbot_service.py` (NEW)
- `backend/routes/chat.py` (NEW)
- `frontend/chat.html` (NEW)
- `frontend/chat.js` (NEW)

---

### 7. Add Exam Prediction

**Backend:**
- [ ] Analyze past questions patterns
- [ ] Create prediction algorithm
- [ ] Generate likely exam questions
- [ ] Add confidence scores

**Frontend:**
- [ ] Display predicted questions
- [ ] Show confidence level
- [ ] Add study priority indicators

---

### 8. Add Analytics Dashboard

**Backend:**
- [ ] Track user study sessions
- [ ] Track feature usage
- [ ] Generate progress reports
- [ ] Add `/api/v1/analytics` endpoint

**Frontend:**
- [ ] Create dashboard page
- [ ] Show documents processed
- [ ] Show flashcards studied
- [ ] Show quizzes taken
- [ ] Show study time
- [ ] Add progress charts (Chart.js)

---

### 9. Add Campus Pack (B2B)

**Backend:**
- [ ] Create institution accounts
- [ ] Bulk user creation
- [ ] Admin dashboard API
- [ ] Usage analytics per institution

**Frontend:**
- [ ] Create admin portal
- [ ] Show institution analytics
- [ ] User management interface
- [ ] Bulk invite system

---

### 10. Polish & Deploy

- [ ] Add loading skeletons
- [ ] Improve error messages
- [ ] Add onboarding tour
- [ ] Add help documentation
- [ ] Add feedback system
- [ ] Performance optimization
- [ ] SEO optimization
- [ ] Add sitemap
- [ ] Add robots.txt
- [ ] Set up monitoring (Sentry)
- [ ] Set up analytics (Google Analytics)

---

## 📦 Dependencies to Install (For Next Steps)

```bash
# Authentication
pip install PyJWT bcrypt python-jose[cryptography] passlib[bcrypt]

# Database
pip install sqlalchemy psycopg2-binary alembic

# Payments
pip install stripe

# OCR (for screenshots)
pip install pytesseract Pillow

# Embeddings (for chatbot)
pip install sentence-transformers faiss-cpu
```

---

## 🚀 Quick Start: Add Flashcards NOW

**Run these commands:**

```bash
# 1. Create flashcard service
New-Item -Path "backend/services/flashcard_service.py" -ItemType File

# 2. Test locally
cd backend
python main.py

# 3. Test flashcard generation endpoint
```

I can help you implement flashcards right now! Just say "add flashcards" and I'll create all the files.
