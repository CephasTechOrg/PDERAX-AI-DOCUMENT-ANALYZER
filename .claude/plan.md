# Phase 12 — Classroom Fixes + Generation Flow Overhaul

## Root Cause Analysis

### Classroom "Forbidden" / Join Failures

**A. Route ordering bug (critical)**
`GET /classrooms/student/enrolled` (line 793 in classrooms.py) is registered AFTER
`GET /classrooms/{classroom_id}` (line 200). FastAPI matches routes in declaration order.
Any request to `/classrooms/student/enrolled` is caught by `/{classroom_id}` with
`classroom_id="student"` — which fails UUID validation and returns 422. This means the
entire "enrolled classrooms" endpoint is dead.

**B. Invite code whitespace (likely join failure cause)**
The join modal's input does `.toUpperCase()` but NOT `.trim()`. If a user copy-pastes
an invite code with a trailing space (e.g. "ABC12345 "), the backend lookup of
`Classroom.invite_code == "ABC12345 "` finds nothing → 404 "Invalid invite code".

**C. Settings null safety**
Every endpoint in classrooms.py that builds a response does
`ClassroomSettingsOut(**classroom.settings)`. If `classroom.settings` is ever null
(e.g. old rows before the column had a default), this raises a 500.

### Document Extraction False Error

The quiz and flashcard pages show "Failed to extract text" or "Failed to generate quiz"
but History still shows the AnalysisResult. The actual chain:
1. `POST /api/v1/upload` → succeeds, text extracted, **saved to DB** ✓ → history populated
2. The `extracted_text` returned is short (< 50 chars) → frontend shows "not enough text"
   OR the AI on the backend partially fails — but history is already saved from step 1.
3. When quiz *generation* fails separately, the error says "Failed to generate" but users
   read this as "extraction failed" since both are part of the same flow.

Also: the quiz/flashcard pages require an explicit **"Extract Text"** button click after
file selection. Users assume selecting a file = extracting it; the extra click is surprising.

---

## Plan

### 1. `backend/routes/classrooms.py`
- **Move `GET /student/enrolled`** to be declared BEFORE `GET /{classroom_id}` (fixes route ordering)
- **Add `or {}` null safety** to every `ClassroomSettingsOut(**classroom.settings)` call
  → `ClassroomSettingsOut(**(classroom.settings or {}))`
- **Store `creator_role`** from the create request into `settings["creator_role"]`

### 2. `backend/schemas/classrooms.py`
- Add `creator_role: Optional[str] = "teacher"` to `CreateClassroomRequest`

### 3. `backend/routes/upload.py`
- **Reorder the DB save BEFORE the status error check** — if text was extracted,
  always save to history. Only raise 500 if `extracted_text` is absent entirely.
- This ensures history always reflects what was extracted, regardless of AI analysis failures.

### 4. `pderax-nextjs/src/app/(dashboard)/classrooms/page.tsx`
- **Invite code trim**: add `.trim()` to both the input `onChange` handler and `handleJoinClassroom`
- **2-step creation modal**:
  Step 1 — role selection: two cards ("Teacher — full control" / "Student — study group")
  Step 2 — existing creation form (unchanged visually)
- Pass `creator_role` in the `classroomService.createClassroom()` call

### 5. `pderax-nextjs/src/services/classroom_service.ts`
- Add `creator_role?: string` to the local `CreateClassroomRequest` interface

### 6. `pderax-nextjs/src/app/(dashboard)/study-tools/quiz/page.tsx`
- **Auto-extract on file select**: when a file is dropped or chosen, immediately call
  `handleUploadExtract` — no separate "Extract Text" button click needed
- Show an inline "Extracting…" spinner while upload is in progress
- After success: show "✓ filename — X words extracted" + [Change file] (already exists)
- **Clearer error wording**: "Could not read this file" (extraction) vs
  "Quiz generation failed" (generation) — so users know which step broke

### 7. `pderax-nextjs/src/app/(dashboard)/study-tools/flashcards/page.tsx`
- Same auto-extract on select + same error message improvements as quiz

### 8. `pderax-nextjs/src/app/(dashboard)/analyzer/page.tsx`
- After successful analysis, **add a "Generate Study Material" section** inside the
  existing results area with:
  - Type toggle: Quiz / Flashcards
  - Count slider (5–20)
  - Difficulty selector (easy / medium / hard)
  - "Generate" button → saves settings to `sessionStorage` and navigates to the
    appropriate study tool page (which already reads `study_text` from sessionStorage)
- The existing plain "Generate Flashcards" / "Generate Quiz" buttons are replaced by
  this inline config section

---

## Affected Files Summary

| File | Change type |
|------|-------------|
| `backend/routes/classrooms.py` | Route reorder, null safety, creator_role storage |
| `backend/schemas/classrooms.py` | Add creator_role field |
| `backend/routes/upload.py` | Save-before-error-check fix |
| `classrooms/page.tsx` | Trim invite code, 2-step creation modal |
| `classroom_service.ts` | Add creator_role to type |
| `study-tools/quiz/page.tsx` | Auto-extract, better errors |
| `study-tools/flashcards/page.tsx` | Auto-extract, better errors |
| `analyzer/page.tsx` | Inline generation config after results |

## Role Scope Decision (Recommended: Per-classroom)
`creator_role` is stored in `classroom.settings` JSON. The same user can be a
"Teacher" in one classroom and a "Student" (study group leader) in another.
No global account role change. The classroom detail pages can read
`settings.creator_role` to show/hide teacher-only features (grade management etc.)
