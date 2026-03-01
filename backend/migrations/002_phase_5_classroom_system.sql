-- Phase 5: Classroom Management System Schema
-- Creates tables for classrooms, assignments, submissions, and grades

-- Create Classroom table
CREATE TABLE IF NOT EXISTS classroom (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    teacher_id UUID NOT NULL,
    invite_code VARCHAR(8) UNIQUE NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'archived', 'inactive')),
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_classroom_teacher FOREIGN KEY (teacher_id) 
        REFERENCES "user" (id) ON DELETE CASCADE
);

-- Create index for teacher lookup
CREATE INDEX IF NOT EXISTS idx_classroom_teacher_id ON classroom(teacher_id);
CREATE INDEX IF NOT EXISTS idx_classroom_invite_code ON classroom(invite_code);
CREATE INDEX IF NOT EXISTS idx_classroom_status ON classroom(status);

-- Create ClassroomEnrollment table
CREATE TABLE IF NOT EXISTS classroom_enrollment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    classroom_id UUID NOT NULL,
    student_id UUID NOT NULL,
    role VARCHAR(50) DEFAULT 'student' CHECK (role IN ('student', 'assistant', 'teacher')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
    joined_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(classroom_id, student_id),
    CONSTRAINT fk_enrollment_classroom FOREIGN KEY (classroom_id) 
        REFERENCES classroom (id) ON DELETE CASCADE,
    CONSTRAINT fk_enrollment_student FOREIGN KEY (student_id) 
        REFERENCES "user" (id) ON DELETE CASCADE
);

-- Create indexes for enrollment lookups
CREATE INDEX IF NOT EXISTS idx_enrollment_classroom_id ON classroom_enrollment(classroom_id);
CREATE INDEX IF NOT EXISTS idx_enrollment_student_id ON classroom_enrollment(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollment_status ON classroom_enrollment(status);

-- Create Assignment table
CREATE TABLE IF NOT EXISTS assignment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    classroom_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    instructions TEXT,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'closed', 'archived')),
    points_possible NUMERIC(10, 2) NOT NULL DEFAULT 100.00,
    due_date TIMESTAMPTZ,
    rubric JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_assignment_classroom FOREIGN KEY (classroom_id) 
        REFERENCES classroom (id) ON DELETE CASCADE
);

-- Create indexes for assignment lookups
CREATE INDEX IF NOT EXISTS idx_assignment_classroom_id ON assignment(classroom_id);
CREATE INDEX IF NOT EXISTS idx_assignment_status ON assignment(status);
CREATE INDEX IF NOT EXISTS idx_assignment_due_date ON assignment(due_date);

-- Create Submission table
CREATE TABLE IF NOT EXISTS submission (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL,
    student_id UUID NOT NULL,
    classroom_id UUID NOT NULL,
    content TEXT,
    attachments TEXT[] DEFAULT '{}',
    submitted_at TIMESTAMPTZ,
    revision_count INT DEFAULT 0,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'graded', 'returned')),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(assignment_id, student_id),
    CONSTRAINT fk_submission_assignment FOREIGN KEY (assignment_id) 
        REFERENCES assignment (id) ON DELETE CASCADE,
    CONSTRAINT fk_submission_student FOREIGN KEY (student_id) 
        REFERENCES "user" (id) ON DELETE CASCADE,
    CONSTRAINT fk_submission_classroom FOREIGN KEY (classroom_id) 
        REFERENCES classroom (id) ON DELETE CASCADE
);

-- Create indexes for submission lookups
CREATE INDEX IF NOT EXISTS idx_submission_assignment_id ON submission(assignment_id);
CREATE INDEX IF NOT EXISTS idx_submission_student_id ON submission(student_id);
CREATE INDEX IF NOT EXISTS idx_submission_classroom_id ON submission(classroom_id);
CREATE INDEX IF NOT EXISTS idx_submission_status ON submission(status);
CREATE INDEX IF NOT EXISTS idx_submission_submitted_at ON submission(submitted_at);

-- Create Grade table
CREATE TABLE IF NOT EXISTS grade (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID NOT NULL UNIQUE,
    assignment_id UUID NOT NULL,
    student_id UUID NOT NULL,
    classroom_id UUID NOT NULL,
    points_earned NUMERIC(10, 2) NOT NULL DEFAULT 0,
    points_possible NUMERIC(10, 2) NOT NULL,
    percentage NUMERIC(5, 2),
    letter_grade VARCHAR(2),
    feedback TEXT,
    rubric_scores JSONB DEFAULT '{}',
    graded_by UUID,
    graded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_grade_submission FOREIGN KEY (submission_id) 
        REFERENCES submission (id) ON DELETE CASCADE,
    CONSTRAINT fk_grade_assignment FOREIGN KEY (assignment_id) 
        REFERENCES assignment (id) ON DELETE CASCADE,
    CONSTRAINT fk_grade_student FOREIGN KEY (student_id) 
        REFERENCES "user" (id) ON DELETE CASCADE,
    CONSTRAINT fk_grade_classroom FOREIGN KEY (classroom_id) 
        REFERENCES classroom (id) ON DELETE CASCADE,
    CONSTRAINT fk_grade_graded_by FOREIGN KEY (graded_by) 
        REFERENCES "user" (id) ON DELETE SET NULL
);

-- Create indexes for grade lookups
CREATE INDEX IF NOT EXISTS idx_grade_assignment_id ON grade(assignment_id);
CREATE INDEX IF NOT EXISTS idx_grade_student_id ON grade(student_id);
CREATE INDEX IF NOT EXISTS idx_grade_classroom_id ON grade(classroom_id);
CREATE INDEX IF NOT EXISTS idx_grade_graded_by ON grade(graded_by);
CREATE INDEX IF NOT EXISTS idx_grade_graded_at ON grade(graded_at);
CREATE INDEX IF NOT EXISTS idx_grade_percentage ON grade(percentage);

-- Create composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_classroom_enrollment_composite 
    ON classroom_enrollment(classroom_id, status);
CREATE INDEX IF NOT EXISTS idx_grade_composite 
    ON grade(classroom_id, student_id);
CREATE INDEX IF NOT EXISTS idx_submission_composite 
    ON submission(assignment_id, status);

-- Add foreign key references to user table (if not already present)
-- These extensions to the user table are handled by SQLAlchemy ORM

-- Migration metadata
-- This migration:
-- 1. Adds Classroom (teacher-created courses)
-- 2. Adds ClassroomEnrollment (student enrollment tracking)
-- 3. Adds Assignment (assignments within classrooms)
-- 4. Adds Submission (student work submissions)
-- 5. Adds Grade (grading and scoring)
-- With proper cascade delete, unique constraints, and JSONB for flexible data storage
