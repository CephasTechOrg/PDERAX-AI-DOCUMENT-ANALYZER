# Phase 5 Backend Implementation Plan

## Overview

Implement complete backend for Classroom Management & Learning Analytics system to support the existing Next.js frontend. This includes database models, API routes, business logic, and email notifications via SendGrid.

---

## Architecture Summary

### Tech Stack

- **Framework**: FastAPI
- **Database**: PostgreSQL with SQLAlchemy ORM
- **Auth**: JWT-based authentication (existing)
- **Email**: SendGrid (configured in .env)
- **File Storage**: Local filesystem (temp directory)

### Core Components

1. **Database Models** - 5 new tables with relationships
2. **API Routes** - 51 endpoints across 3 route files
3. **Schemas** - Pydantic models for validation
4. **Services** - Email notifications for invitations
5. **Migrations** - SQL scripts for database setup

---

## Step 1: Database Models

### File: `backend/models/db_models.py`

Add 5 new models with full relationships:

#### 1. Classroom Model

```python
class Classroom(Base):
    __tablename__ = "classrooms"

    id = UUID (PK)
    teacher_id = UUID (FK -> users.id)
    name = String(200)
    description = Text
    subject = String(100)
    grade_level = String(50)
    invite_code = String(10) UNIQUE
    is_archived = Boolean (default=False)
    settings = JSONB (5 settings)
    created_at = DateTime
    updated_at = DateTime

    # Relationships
    teacher -> User
    enrollments -> ClassroomEnrollment[]
    assignments -> Assignment[]
```

#### 2. ClassroomEnrollment Model

```python
class ClassroomEnrollment(Base):
    __tablename__ = "classroom_enrollments"

    id = UUID (PK)
    classroom_id = UUID (FK -> classrooms.id)
    student_id = UUID (FK -> users.id)
    role = String(20) (student | assistant)
    status = String(20) (active | inactive | pending)
    joined_at = DateTime

    # Relationships
    classroom -> Classroom
    student -> User

    # Unique constraint
    UniqueConstraint(classroom_id, student_id)
```

#### 3. Assignment Model

```python
class Assignment(Base):
    __tablename__ = "assignments"

    id = UUID (PK)
    classroom_id = UUID (FK -> classrooms.id)
    title = String(300)
    description = Text
    points_possible = Integer
    due_date = DateTime
    status = String(20) (draft | published | closed | archived)
    settings = JSONB (assignment settings)
    rubric = JSONB (grading rubric)
    created_at = DateTime
    updated_at = DateTime

    # Relationships
    classroom -> Classroom
    submissions -> Submission[]
```

#### 4. Submission Model

```python
class Submission(Base):
    __tablename__ = "submissions"

    id = UUID (PK)
    assignment_id = UUID (FK -> assignments.id)
    student_id = UUID (FK -> users.id)
    content = Text
    attachments = JSONB (file paths array)
    submitted_at = DateTime
    status = String(20) (not_submitted | submitted | graded | returned)
    revision_count = Integer (default=0)

    # Relationships
    assignment -> Assignment
    student -> User
    grade -> Grade (one-to-one)

    # Unique constraint
    UniqueConstraint(assignment_id, student_id)
```

#### 5. Grade Model

```python
class Grade(Base):
    __tablename__ = "grades"

    id = UUID (PK)
    submission_id = UUID (FK -> submissions.id) UNIQUE
    assignment_id = UUID (FK -> assignments.id)
    student_id = UUID (FK -> users.id)
    classroom_id = UUID (FK -> classrooms.id)
    points_earned = Float
    points_possible = Integer
    percentage = Float
    letter_grade = String(2) (A+, A, B+, etc.)
    feedback = Text
    rubric_scores = JSONB
    graded_by = UUID (FK -> users.id)
    graded_at = DateTime

    # Relationships
    submission -> Submission
    assignment -> Assignment
    student -> User
    classroom -> Classroom
    grader -> User
```

---

## Step 2: Request/Response Schemas

### File: `backend/schemas/classrooms.py` (NEW)

```python
# Request Schemas
- CreateClassroomRequest
- UpdateClassroomRequest
- InviteStudentRequest
- JoinClassroomRequest
- UpdateSettingsRequest
- ChangeRoleRequest

# Response Schemas
- ClassroomOut
- ClassroomWithStats
- StudentInClassroom
- InviteCodeOut
- ClassroomSettingsOut
- PaginatedClassrooms
```

### File: `backend/schemas/assignments.py` (NEW)

```python
# Request Schemas
- CreateAssignmentRequest
- UpdateAssignmentRequest
- SubmitAssignmentRequest
- GradeSubmissionRequest
- SetRubricRequest

# Response Schemas
- AssignmentOut
- AssignmentWithStats
- SubmissionOut
- SubmissionWithGrade
- AssignmentRubricOut
- PaginatedAssignments
- PaginatedSubmissions
```

### File: `backend/schemas/grades.py` (NEW)

```python
# Request Schemas
- CreateGradeRequest
- UpdateGradeRequest
- BulkGradeRequest

# Response Schemas
- GradeOut
- GradebookEntry
- StudentGrades
- ClassPerformance
- PerformanceAnalytics
- TrendData
- ReportCard
- PaginatedGrades
```

---

## Step 3: API Routes

### File: `backend/routes/classrooms.py` (NEW)

**17 Endpoints:**

```
POST   /api/classrooms                          - Create classroom
GET    /api/classrooms                          - List classrooms (paginated)
GET    /api/classrooms/{id}                     - Get classroom details
PUT    /api/classrooms/{id}                     - Update classroom
DELETE /api/classrooms/{id}                     - Delete classroom
POST   /api/classrooms/{id}/archive             - Archive classroom

GET    /api/classrooms/{id}/students            - Get student roster (paginated)
POST   /api/classrooms/{id}/invite              - Invite student by email
DELETE /api/classrooms/{id}/students/{student}  - Remove student
PUT    /api/classrooms/{id}/students/{student}/role - Change student role

POST   /api/classrooms/{id}/invite-code         - Generate invite code
GET    /api/classrooms/{id}/invite-codes        - Get invite codes
POST   /api/classrooms/join                     - Join classroom with code

GET    /api/classrooms/{id}/stats               - Get classroom statistics
PUT    /api/classrooms/{id}/settings            - Update settings
GET    /api/classrooms/student/enrolled         - Get student's classrooms
GET    /api/classrooms/{id}/roster/export       - Export roster (CSV)
```

### File: `backend/routes/assignments.py` (NEW)

**18 Endpoints:**

```
POST   /api/classrooms/{id}/assignments                                 - Create assignment
GET    /api/classrooms/{id}/assignments                                 - List assignments (paginated)
GET    /api/classrooms/{id}/assignments/{assignment}                    - Get assignment details
PUT    /api/classrooms/{id}/assignments/{assignment}                    - Update assignment
DELETE /api/classrooms/{id}/assignments/{assignment}                    - Delete assignment
POST   /api/classrooms/{id}/assignments/{assignment}/publish            - Publish assignment
POST   /api/classrooms/{id}/assignments/{assignment}/close              - Close assignment

GET    /api/classrooms/{id}/assignments/{assignment}/submissions        - Get submissions (paginated)
GET    /api/classrooms/{id}/assignments/{assignment}/submissions/{sub}  - Get single submission
POST   /api/classrooms/{id}/assignments/{assignment}/submit             - Submit assignment
GET    /api/classrooms/{id}/assignments/{assignment}/my-submission      - Get my submission
GET    /api/classrooms/{id}/assignments/student                         - Get student assignments

PUT    /api/classrooms/{id}/assignments/{assignment}/submissions/{sub}/grade - Grade submission
POST   /api/classrooms/{id}/assignments/{assignment}/grades/bulk        - Bulk update grades
POST   /api/classrooms/{id}/assignments/{assignment}/rubric             - Set rubric
GET    /api/classrooms/{id}/assignments/{assignment}/rubric             - Get rubric

GET    /api/classrooms/{id}/assignments/{assignment}/stats              - Get assignment stats
GET    /api/classrooms/{id}/assignments/{assignment}/submissions/export - Export submissions (CSV/ZIP)
```

### File: `backend/routes/grades.py` (NEW)

**16 Endpoints:**

```
GET    /api/classrooms/{id}/gradebook                      - Get full gradebook
GET    /api/classrooms/{id}/students/{student}/grades      - Get student grades
GET    /api/classrooms/{id}/grades/my                      - Get my grades
GET    /api/classrooms/{id}/assignments/{assignment}/grades - Get assignment grades

GET    /api/classrooms/{id}/students/{student}/performance - Get student performance
GET    /api/classrooms/{id}/performance/my                 - Get my performance
GET    /api/classrooms/{id}/performance                    - Get class performance

GET    /api/classrooms/{id}/grades/trends                  - Get grade trends
GET    /api/classrooms/{id}/grade-statistics               - Get grade statistics

GET    /api/classrooms/{id}/students/{student}/report-card - Generate report card
GET    /api/classrooms/{id}/report-card/my                 - Get my report card
GET    /api/classrooms/{id}/progress-reports               - Generate all progress reports

POST   /api/classrooms/{id}/grade-weightings               - Set grade weightings
GET    /api/classrooms/{id}/grade-weightings               - Get grade weightings

POST   /api/classrooms/{id}/grades/bulk                    - Bulk update grades
GET    /api/classrooms/{id}/gradebook/export               - Export gradebook (CSV/JSON)
```

---

## Step 4: Email Service Extension

### File: `backend/services/email_service.py`

Add new function:

```python
async def send_classroom_invitation(
    student_email: str,
    classroom_name: str,
    teacher_name: str,
    invite_code: str,
    classroom_id: str
) -> bool:
    """
    Send classroom invitation email via SendGrid
    """
    subject = f"You've been invited to {classroom_name}"

    html_content = f"""
    <h2>Classroom Invitation</h2>
    <p>Hi there!</p>
    <p><strong>{teacher_name}</strong> has invited you to join their classroom:</p>
    <h3>{classroom_name}</h3>
    <p>Use this invite code to join:</p>
    <div style="background: #f3f4f6; padding: 20px; text-align: center;">
        <h1 style="color: #4f46e5; letter-spacing: 3px;">{invite_code}</h1>
    </div>
    <p>Or click the link below to join directly:</p>
    <a href="{FRONTEND_URL}/classrooms?code={invite_code}">Join Classroom</a>
    """

    return await send_email(student_email, subject, html_content)
```

---

## Step 5: Main App Configuration

### File: `backend/main.py`

Add new routers:

```python
from routes.classrooms import classroom_router
from routes.assignments import assignment_router
from routes.grades import grade_router

app.include_router(classroom_router, prefix="/api", tags=["Classrooms"])
app.include_router(assignment_router, prefix="/api", tags=["Assignments"])
app.include_router(grade_router, prefix="/api", tags=["Grades"])
```

---

## Step 6: Database Migration

### File: `backend/migrations/002_phase_5_classroom_system.sql`

```sql
-- Classrooms table
CREATE TABLE classrooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    subject VARCHAR(100) NOT NULL,
    grade_level VARCHAR(50) NOT NULL,
    invite_code VARCHAR(10) UNIQUE NOT NULL,
    is_archived BOOLEAN DEFAULT FALSE,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Classroom enrollments
CREATE TABLE classroom_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'student',
    status VARCHAR(20) DEFAULT 'active',
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(classroom_id, student_id)
);

-- Assignments
CREATE TABLE assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
    title VARCHAR(300) NOT NULL,
    description TEXT,
    points_possible INTEGER NOT NULL,
    due_date TIMESTAMPTZ,
    status VARCHAR(20) DEFAULT 'draft',
    settings JSONB DEFAULT '{}',
    rubric JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Submissions
CREATE TABLE submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT,
    attachments JSONB DEFAULT '[]',
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'submitted',
    revision_count INTEGER DEFAULT 0,
    UNIQUE(assignment_id, student_id)
);

-- Grades
CREATE TABLE grades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID UNIQUE REFERENCES submissions(id) ON DELETE CASCADE,
    assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
    points_earned FLOAT NOT NULL,
    points_possible INTEGER NOT NULL,
    percentage FLOAT,
    letter_grade VARCHAR(2),
    feedback TEXT,
    rubric_scores JSONB,
    graded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    graded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_classrooms_teacher ON classrooms(teacher_id);
CREATE INDEX idx_classrooms_invite_code ON classrooms(invite_code);
CREATE INDEX idx_enrollments_classroom ON classroom_enrollments(classroom_id);
CREATE INDEX idx_enrollments_student ON classroom_enrollments(student_id);
CREATE INDEX idx_assignments_classroom ON assignments(classroom_id);
CREATE INDEX idx_submissions_assignment ON submissions(assignment_id);
CREATE INDEX idx_submissions_student ON submissions(student_id);
CREATE INDEX idx_grades_student ON grades(student_id);
CREATE INDEX idx_grades_classroom ON grades(classroom_id);
```

---

## Implementation Order

### Phase 1: Foundation (Steps 1-2)

1. ✅ Create implementation plan
2. ⬜ Add database models to `db_models.py`
3. ⬜ Create schema files (`classrooms.py`, `assignments.py`, `grades.py`)

### Phase 2: Core Routes (Steps 3-4)

4. ⬜ Implement `routes/classrooms.py` (17 endpoints)
5. ⬜ Implement `routes/assignments.py` (18 endpoints)
6. ⬜ Implement `routes/grades.py` (16 endpoints)

### Phase 3: Integration (Steps 5-6)

7. ⬜ Extend email service for invitations
8. ⬜ Register routers in `main.py`
9. ⬜ Create database migration SQL file

### Phase 4: Testing (Step 7)

10. ⬜ Test all endpoints with frontend
11. ⬜ Verify database operations
12. ⬜ Test email notifications
13. ⬜ Validate authentication & authorization

---

## Key Features to Implement

### Authorization Checks

- Teachers can only manage their own classrooms
- Students can only view/submit in enrolled classrooms
- Admins have full access

### Business Logic

- Auto-generate unique invite codes (8 chars, uppercase)
- Calculate letter grades from percentages
- Track submission revision counts
- Handle late submissions
- Support file attachments storage

### Email Notifications

- Classroom invitation emails (SendGrid)
- Assignment published notifications (optional)
- Grade posted notifications (optional)

### Export Functionality

- CSV export for rosters
- CSV/JSON export for gradebooks
- ZIP export for submissions with files

---

## Environment Variables Required

```env
# Already configured
DATABASE_URL=postgresql://...
DEEPSEEK_API_KEY=...
SENDGRID_API_KEY=...
SENDGRID_FROM_EMAIL=...

# May need to add
FRONTEND_URL=http://localhost:3000
```

---

## Success Criteria

✅ All 51 endpoints functional  
✅ Database models with proper relationships  
✅ Proper authentication & authorization  
✅ Email invitations working via SendGrid  
✅ File upload support for submissions  
✅ Export functionality (CSV, JSON, ZIP)  
✅ Grade calculation and letter grade assignment  
✅ Frontend integration successful  
✅ No breaking changes to existing features

---

## Next Steps

Start with Step 1: Database Models implementation.
