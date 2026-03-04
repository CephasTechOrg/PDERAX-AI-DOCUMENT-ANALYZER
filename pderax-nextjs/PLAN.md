# PDERAX Next.js Frontend Rebuild Plan

## Current State Summary

The Next.js app has auth working but almost every feature page is a stub or broken:
- `/analyzer` - PLACEHOLDER ("Coming in Phase 3")
- No study tools page (no flashcard/quiz generation)
- `/history` - only shows documents, not flashcard sets or quiz sets
- AI Assistant - has UI but service layer has response-shape bugs
- Classrooms - list page exists but detail pages are stubs
- Navigation - no sidebar, wrong links
- No quiz service exists at all

Meanwhile the backend has 100+ fully working endpoints ready to use.

---

## Phase 1: Foundation + Analyzer (THE CORE PRODUCT)

The analyzer IS the product. Without it, nothing works.

### Step 1.1: Install dependencies
- `lucide-react` for professional icons (replaces all emoji/inline SVG)

### Step 1.2: Add missing TypeScript types to `types/index.ts`
- `AnalysisResponse` (from POST /api/v1/upload)
- `AnalysisData`, `QAPair`, `WordCountInfo`, `AnalysisWarning`
- `AnalysisHistoryItem` (from GET /api/v1/history/analyses)
- `QuizQuestion`, `QuizOption`, `QuizGenerateResponse`, `QuizHistoryItem`

### Step 1.3: Fix `document_service.ts`
- `uploadDocument()` must return `AnalysisResponse` (full analysis), not a Document object
- `getAnalyses()` returns flat `AnalysisHistoryItem[]` (NOT paginated)
- Add `downloadExport(filename)` method

### Step 1.4: Rebuild `/analyzer` page - 3 states
**State A - Upload:** FileDropZone + "Analyze Document" button
**State B - Processing:** Animated progress bar with 4 stages (Extracting > Analyzing > Insights > Compiling)
**State C - Results:**
- Stats bar (document type, word count, insights count, Q&A count)
- Executive Summary card
- Key Insights card (numbered list)
- Q&A card (collapsible pairs)
- Export Options card (TXT/DOCX/PDF download)
- Study Actions card ("Generate Flashcards" / "Generate Quiz" buttons)

### New components
- `components/analyzer/AnalysisProgress.tsx` - progress bar with stages
- `components/analyzer/AnalysisResults.tsx` - full results layout
- `components/analyzer/StatCard.tsx` - reusable stat card with icon
- `components/analyzer/InsightsList.tsx` - numbered insights
- `components/analyzer/QASection.tsx` - collapsible Q&A

### Files: ~12 new/modified files

---

## Phase 2: Study Tools (Flashcards + Quizzes)

### Step 2.1: Create `quiz_service.ts`
- `generateQuiz(text, count, difficulty)` -> POST /api/v1/quiz/generate
- `getQuizSets()` -> GET /api/v1/history/quiz-sets
- `getQuizSet(id)`, `deleteQuizSet(id)`

### Step 2.2: Fix `flashcard_service.ts`
- Fix `generateFlashcards` to send correct payload `{text, count, difficulty}`
- Add `getFlashcardSets()` using GET /api/v1/history/flashcard-sets

### Step 2.3: Create `/study-tools` hub page
Three cards: Flashcards (indigo), Quizzes (amber), AI Tutor (teal)

### Step 2.4: Flashcard generation flow (`/study-tools/flashcards`)
Input text/upload -> Settings (count, difficulty) -> Generate -> Interactive flip-card deck

### Step 2.5: Quiz generation flow (`/study-tools/quiz`)
Input text/upload -> Settings -> Generate -> Take quiz (A-D options) -> Score + Review

### Shared components
- `components/study/TextInputStep.tsx` - textarea + file upload
- `components/study/SettingsStep.tsx` - count slider + difficulty selector
- `components/study/FlashcardDeck.tsx` - interactive flip cards
- `components/study/QuizQuestion.tsx` - single question display
- `components/study/QuizResults.tsx` - score + review

### Files: ~15 new/modified files

---

## Phase 3: History Overhaul

### Rebuild `/history` with 3 tabs
- **Analyses** tab: filename, word count, date, View/Delete
- **Flashcard Sets** tab: title, difficulty badge, card count, Study/Delete
- **Quiz Sets** tab: title, difficulty badge, question count, Retake/Delete

### Create `history_service.ts`
Consolidates all history API calls in one place.

### New components
- `components/history/HistoryTabs.tsx`
- `components/history/AnalysisCard.tsx`
- `components/history/FlashcardSetCard.tsx`
- `components/history/QuizSetCard.tsx`

### Optional: Analysis detail page at `/history/analysis/[id]`
Reuses AnalysisResults component from Phase 1.

### Files: ~8 new/modified files

---

## Phase 4: Navigation + Dashboard Layout

### Create Sidebar component
- lucide-react icons for each nav item
- Items: Analyzer, Study Tools, AI Assistant, History, Classrooms, Analytics, Profile
- Collapsible on desktop, slide-out drawer on mobile
- Active link highlighting via `usePathname()`
- User avatar + logout at bottom

### Update dashboard layout
- Flex row: sidebar + main content
- Mobile responsive breakpoints

### Update Navigation.tsx
- Dashboard pages: thin header bar with logo + breadcrumb + user dropdown
- Landing page: keep current marketing nav

### Files: ~5 modified files

---

## Phase 5: AI Assistant Polish

### Fix `ai_service.ts` (multiple bugs)
- `createSession` sends `{title}` but backend needs `{mode, title?}` - ADD mode param
- `sendMessage` double-wraps `.data` - FIX response access
- `getSessions` expects `{items}` but backend returns flat array
- Add `uploadDocumentToSession(sessionId, file)` method

### Install `react-markdown` + `remark-gfm`

### Update AI Assistant page
- Teacher/Helper mode toggle on session creation
- Document upload button in chat header
- Markdown rendering for assistant messages
- Better empty state with suggested prompts

### Files: ~5 modified files

---

## Phase 6: Classrooms + Analytics

### Fix `analytics_service.ts`
- Fix double `.data` wrapping
- Verify endpoint paths match backend

### Build classroom detail page (`/classrooms/[id]`)
- Header with name, subject, invite code
- Student list, assignment list
- Create assignment button (teachers)

### Build assignment pages
- Assignment detail with submission form (students) / grading (teachers)

### Build gradebook page
- Grade table: students x assignments
- Grade entry for teachers

### Fix analytics page
- Wire up to corrected service
- Display stats, charts, streaks

### Files: ~8 modified files

---

## Execution Order

Phase 1 -> Phase 2 -> Phase 3 -> Phase 4 -> Phase 5 -> Phase 6

Each phase results in a working state. Phase 1 is the most critical - it makes the core product functional.

Total: ~50 new/modified files across all phases.
