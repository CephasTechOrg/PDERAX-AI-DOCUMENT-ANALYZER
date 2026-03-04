"""
Assignment Management Routes
Handles assignment CRUD, submissions, grading, and rubrics
"""
import csv
import math
import os
from datetime import datetime
from io import StringIO
from pathlib import Path
from typing import Optional
from uuid import UUID
from zipfile import ZipFile

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from fastapi.responses import FileResponse, Response
from sqlalchemy import func
from sqlalchemy.orm import Session

from auth_dependencies import get_current_user
from dependencies import get_db
from models.db_models import Assignment, Classroom, ClassroomEnrollment, Grade, Submission, User
from schemas.assignments import (
    AssignmentOut,
    AssignmentRubricOut,
    AssignmentSettingsOut,
    AssignmentStatsOut,
    AssignmentWithStatsOut,
    BulkGradeRequest,
    CreateAssignmentRequest,
    GradeSubmissionRequest,
    PaginatedAssignments,
    PaginatedSubmissions,
    SetRubricRequest,
    SubmitAssignmentRequest,
    SubmissionOut,
    UpdateAssignmentRequest,
)
from schemas.classrooms import MessageResponse

assignment_router = APIRouter(prefix="/classrooms", tags=["Assignments"])

# Get upload directory
BASE_DIR = Path(__file__).resolve().parent.parent
UPLOAD_DIR = BASE_DIR / "static" / "submissions"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


def can_manage_assignment(classroom: Classroom, user: User) -> bool:
    """Check if user can manage this assignment"""
    return classroom.teacher_id == user.id or user.is_admin


def can_view_assignment(classroom: Classroom, user: User, db: Session) -> bool:
    """Check if user can view this assignment"""
    is_teacher = can_manage_assignment(classroom, user)
    is_enrolled = db.query(ClassroomEnrollment).filter(
        ClassroomEnrollment.classroom_id == classroom.id,
        ClassroomEnrollment.student_id == user.id,
        ClassroomEnrollment.status == "active"
    ).first() is not None
    return is_teacher or is_enrolled


def calculate_percentage(points_earned: float, points_possible: int) -> float:
    """Calculate percentage from points"""
    if points_possible == 0:
        return 0.0
    return round((points_earned / points_possible) * 100, 2)


def calculate_letter_grade(percentage: float) -> str:
    """Calculate letter grade from percentage"""
    if percentage >= 97: return "A+"
    elif percentage >= 93: return "A"
    elif percentage >= 90: return "A-"
    elif percentage >= 87: return "B+"
    elif percentage >= 83: return "B"
    elif percentage >= 80: return "B-"
    elif percentage >= 77: return "C+"
    elif percentage >= 73: return "C"
    elif percentage >= 70: return "C-"
    elif percentage >= 60: return "D"
    else: return "F"


# ============================================================================
# ASSIGNMENT CRUD
# ============================================================================


@assignment_router.post("/{classroom_id}/assignments", response_model=AssignmentOut, status_code=status.HTTP_201_CREATED)
async def create_assignment(
    classroom_id: UUID,
    assignment_data: CreateAssignmentRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new assignment"""
    classroom = db.query(Classroom).filter(Classroom.id == classroom_id).first()
    if not classroom:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Classroom not found")
    
    if not can_manage_assignment(classroom, current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    
    assignment = Assignment(
        classroom_id=classroom_id,
        title=assignment_data.title,
        description=assignment_data.description,
        points_possible=assignment_data.points_possible,
        due_date=assignment_data.due_date,
        status="draft",
        settings={
            "allow_late": True,
            "allow_resubmit": True,
            "max_submissions": None,
            "peer_review_enabled": False
        }
    )
    
    db.add(assignment)
    db.commit()
    db.refresh(assignment)
    
    return AssignmentOut(
        id=assignment.id,
        classroom_id=assignment.classroom_id,
        title=assignment.title,
        description=assignment.description,
        points_possible=assignment.points_possible,
        due_date=assignment.due_date,
        status=assignment.status,
        settings=assignment.settings,
        rubric=assignment.rubric,
        created_at=assignment.created_at,
        updated_at=assignment.updated_at
    )


@assignment_router.get("/{classroom_id}/assignments", response_model=PaginatedAssignments)
async def list_assignments(
    classroom_id: UUID,
    status_filter: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List assignments in a classroom"""
    classroom = db.query(Classroom).filter(Classroom.id == classroom_id).first()
    if not classroom:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Classroom not found")
    
    if not can_view_assignment(classroom, current_user, db):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    
    query = db.query(Assignment).filter(Assignment.classroom_id == classroom_id)
    
    # Filter by status if provided
    if status_filter and status_filter != "all":
        query = query.filter(Assignment.status == status_filter)
    
    # Don't show archived by default
    query = query.filter(Assignment.status != "archived")
    
    total = query.count()
    total_pages = math.ceil(total / limit)
    offset = (page - 1) * limit
    
    assignments = query.order_by(Assignment.created_at.desc()).offset(offset).limit(limit).all()
    
    items = []
    for assignment in assignments:
        submission_count = db.query(Submission).filter(
            Submission.assignment_id == assignment.id
        ).count()
        
        graded_count = db.query(Grade).filter(
            Grade.assignment_id == assignment.id
        ).count()
        
        pending_count = submission_count - graded_count
        
        # Calculate average score
        avg_score = db.query(func.avg(Grade.percentage)).filter(
            Grade.assignment_id == assignment.id
        ).scalar()
        
        items.append(AssignmentWithStatsOut(
            id=assignment.id,
            classroom_id=assignment.classroom_id,
            title=assignment.title,
            description=assignment.description,
            points_possible=assignment.points_possible,
            due_date=assignment.due_date,
            status=assignment.status,
            settings=assignment.settings,
            rubric=assignment.rubric,
            created_at=assignment.created_at,
            updated_at=assignment.updated_at,
            submission_count=submission_count,
            graded_count=graded_count,
            pending_count=pending_count,
            average_score=float(avg_score) if avg_score else None
        ))
    
    return PaginatedAssignments(
        items=items,
        total=total,
        page=page,
        per_page=limit,
        total_pages=total_pages
    )


@assignment_router.get("/{classroom_id}/assignments/{assignment_id}", response_model=AssignmentWithStatsOut)
async def get_assignment(
    classroom_id: UUID,
    assignment_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get assignment details"""
    classroom = db.query(Classroom).filter(Classroom.id == classroom_id).first()
    if not classroom:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Classroom not found")
    
    if not can_view_assignment(classroom, current_user, db):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    
    assignment = db.query(Assignment).filter(
        Assignment.id == assignment_id,
        Assignment.classroom_id == classroom_id
    ).first()
    
    if not assignment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found")
    
    # Get statistics
    submission_count = db.query(Submission).filter(
        Submission.assignment_id == assignment.id
    ).count()
    
    graded_count = db.query(Grade).filter(
        Grade.assignment_id == assignment.id
    ).count()
    
    pending_count = submission_count - graded_count
    
    avg_score = db.query(func.avg(Grade.percentage)).filter(
        Grade.assignment_id == assignment.id
    ).scalar()
    
    return AssignmentWithStatsOut(
        id=assignment.id,
        classroom_id=assignment.classroom_id,
        title=assignment.title,
        description=assignment.description,
        points_possible=assignment.points_possible,
        due_date=assignment.due_date,
        status=assignment.status,
        settings=assignment.settings,
        rubric=assignment.rubric,
        created_at=assignment.created_at,
        updated_at=assignment.updated_at,
        submission_count=submission_count,
        graded_count=graded_count,
        pending_count=pending_count,
        average_score=float(avg_score) if avg_score else None
    )


@assignment_router.put("/{classroom_id}/assignments/{assignment_id}", response_model=AssignmentOut)
async def update_assignment(
    classroom_id: UUID,
    assignment_id: UUID,
    update_data: UpdateAssignmentRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update assignment"""
    classroom = db.query(Classroom).filter(Classroom.id == classroom_id).first()
    if not classroom:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Classroom not found")
    
    if not can_manage_assignment(classroom, current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    
    assignment = db.query(Assignment).filter(
        Assignment.id == assignment_id,
        Assignment.classroom_id == classroom_id
    ).first()
    
    if not assignment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found")
    
    # Update fields
    if update_data.title is not None:
        assignment.title = update_data.title
    if update_data.description is not None:
        assignment.description = update_data.description
    if update_data.points_possible is not None:
        assignment.points_possible = update_data.points_possible
    if update_data.due_date is not None:
        assignment.due_date = update_data.due_date
    if update_data.status is not None:
        assignment.status = update_data.status
    
    db.commit()
    db.refresh(assignment)
    
    return AssignmentOut(
        id=assignment.id,
        classroom_id=assignment.classroom_id,
        title=assignment.title,
        description=assignment.description,
        points_possible=assignment.points_possible,
        due_date=assignment.due_date,
        status=assignment.status,
        settings=assignment.settings,
        rubric=assignment.rubric,
        created_at=assignment.created_at,
        updated_at=assignment.updated_at
    )


@assignment_router.delete("/{classroom_id}/assignments/{assignment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_assignment(
    classroom_id: UUID,
    assignment_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete assignment"""
    classroom = db.query(Classroom).filter(Classroom.id == classroom_id).first()
    if not classroom:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Classroom not found")
    
    if not can_manage_assignment(classroom, current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    
    assignment = db.query(Assignment).filter(
        Assignment.id == assignment_id,
        Assignment.classroom_id == classroom_id
    ).first()
    
    if not assignment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found")
    
    db.delete(assignment)
    db.commit()
    return None


# ============================================================================
# ASSIGNMENT LIFECYCLE
# ============================================================================


@assignment_router.post("/{classroom_id}/assignments/{assignment_id}/publish", response_model=AssignmentOut)
async def publish_assignment(
    classroom_id: UUID,
    assignment_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Publish assignment (make it visible to students)"""
    classroom = db.query(Classroom).filter(Classroom.id == classroom_id).first()
    if not classroom:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Classroom not found")
    
    if not can_manage_assignment(classroom, current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    
    assignment = db.query(Assignment).filter(
        Assignment.id == assignment_id,
        Assignment.classroom_id == classroom_id
    ).first()
    
    if not assignment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found")
    
    assignment.status = "published"
    db.commit()
    db.refresh(assignment)
    
    return AssignmentOut(
        id=assignment.id,
        classroom_id=assignment.classroom_id,
        title=assignment.title,
        description=assignment.description,
        points_possible=assignment.points_possible,
        due_date=assignment.due_date,
        status=assignment.status,
        settings=assignment.settings,
        rubric=assignment.rubric,
        created_at=assignment.created_at,
        updated_at=assignment.updated_at
    )


@assignment_router.post("/{classroom_id}/assignments/{assignment_id}/close", response_model=AssignmentOut)
async def close_assignment(
    classroom_id: UUID,
    assignment_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Close assignment (no more submissions allowed)"""
    classroom = db.query(Classroom).filter(Classroom.id == classroom_id).first()
    if not classroom:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Classroom not found")
    
    if not can_manage_assignment(classroom, current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    
    assignment = db.query(Assignment).filter(
        Assignment.id == assignment_id,
        Assignment.classroom_id == classroom_id
    ).first()
    
    if not assignment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found")
    
    assignment.status = "closed"
    db.commit()
    db.refresh(assignment)
    
    return AssignmentOut(
        id=assignment.id,
        classroom_id=assignment.classroom_id,
        title=assignment.title,
        description=assignment.description,
        points_possible=assignment.points_possible,
        due_date=assignment.due_date,
        status=assignment.status,
        settings=assignment.settings,
        rubric=assignment.rubric,
        created_at=assignment.created_at,
        updated_at=assignment.updated_at
    )


# ============================================================================
# SUBMISSIONS
# ============================================================================


@assignment_router.get("/{classroom_id}/assignments/{assignment_id}/submissions", response_model=PaginatedSubmissions)
async def get_submissions(
    classroom_id: UUID,
    assignment_id: UUID,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all submissions for an assignment (teacher only)"""
    classroom = db.query(Classroom).filter(Classroom.id == classroom_id).first()
    if not classroom:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Classroom not found")
    
    if not can_manage_assignment(classroom, current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    
    assignment = db.query(Assignment).filter(
        Assignment.id == assignment_id,
        Assignment.classroom_id == classroom_id
    ).first()
    
    if not assignment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found")
    
    # Get all submissions
    query = db.query(Submission, User).join(
        User, Submission.student_id == User.id
    ).filter(
        Submission.assignment_id == assignment_id
    )
    
    total = query.count()
    total_pages = math.ceil(total / limit)
    offset = (page - 1) * limit
    
    submissions = query.order_by(Submission.submitted_at.desc()).offset(offset).limit(limit).all()
    
    items = []
    for submission, user in submissions:
        # Get grade if exists
        grade = db.query(Grade).filter(Grade.submission_id == submission.id).first()
        
        items.append(SubmissionOut(
            id=submission.id,
            assignment_id=submission.assignment_id,
            student_id=submission.student_id,
            student_name=user.full_name or user.email.split('@')[0],
            student_email=user.email,
            content=submission.content,
            attachments=submission.attachments or [],
            submitted_at=submission.submitted_at,
            status=submission.status,
            revision_count=submission.revision_count,
            grade=grade.points_earned if grade else None,
            feedback=grade.feedback if grade else None,
            graded_at=grade.graded_at if grade else None,
            graded_by=grade.graded_by if grade else None
        ))
    
    return PaginatedSubmissions(
        items=items,
        total=total,
        page=page,
        per_page=limit,
        total_pages=total_pages
    )


@assignment_router.get("/{classroom_id}/assignments/{assignment_id}/submissions/{submission_id}", response_model=SubmissionOut)
async def get_submission(
    classroom_id: UUID,
    assignment_id: UUID,
    submission_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific submission"""
    classroom = db.query(Classroom).filter(Classroom.id == classroom_id).first()
    if not classroom:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Classroom not found")
    
    submission = db.query(Submission).filter(
        Submission.id == submission_id,
        Submission.assignment_id == assignment_id
    ).first()
    
    if not submission:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found")
    
    # Check access: teacher, admin, or the student who submitted
    is_teacher = can_manage_assignment(classroom, current_user)
    is_student = submission.student_id == current_user.id
    
    if not (is_teacher or is_student):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    
    user = db.query(User).filter(User.id == submission.student_id).first()
    grade = db.query(Grade).filter(Grade.submission_id == submission.id).first()
    
    return SubmissionOut(
        id=submission.id,
        assignment_id=submission.assignment_id,
        student_id=submission.student_id,
        student_name=user.full_name or user.email.split('@')[0],
        student_email=user.email,
        content=submission.content,
        attachments=submission.attachments or [],
        submitted_at=submission.submitted_at,
        status=submission.status,
        revision_count=submission.revision_count,
        grade=grade.points_earned if grade else None,
        feedback=grade.feedback if grade else None,
        graded_at=grade.graded_at if grade else None,
        graded_by=grade.graded_by if grade else None
    )


@assignment_router.post("/{classroom_id}/assignments/{assignment_id}/submit")
async def submit_assignment(
    classroom_id: UUID,
    assignment_id: UUID,
    content: str = "",
    files: list[UploadFile] = File(default=[]),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Submit assignment as a student"""
    classroom = db.query(Classroom).filter(Classroom.id == classroom_id).first()
    if not classroom:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Classroom not found")
    
    # Check enrollment
    enrollment = db.query(ClassroomEnrollment).filter(
        ClassroomEnrollment.classroom_id == classroom_id,
        ClassroomEnrollment.student_id == current_user.id,
        ClassroomEnrollment.status == "active"
    ).first()
    
    if not enrollment:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enrolled in this classroom")
    
    assignment = db.query(Assignment).filter(
        Assignment.id == assignment_id,
        Assignment.classroom_id == classroom_id
    ).first()
    
    if not assignment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found")
    
    # Reject submissions to draft or archived assignments
    if assignment.status not in ("published", "closed"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Assignment is not accepting submissions")
    
    settings = assignment.settings or {}
    
    # If assignment is closed, check if late submissions are allowed
    if assignment.status == "closed" and not settings.get("allow_late", True):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Assignment is closed and late submissions are not allowed")
    
    # If past due date, check allow_late
    if assignment.due_date and datetime.utcnow() > assignment.due_date and not settings.get("allow_late", True):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Assignment is past due and late submissions are not allowed")
    
    # Get or create submission
    submission = db.query(Submission).filter(
        Submission.assignment_id == assignment_id,
        Submission.student_id == current_user.id
    ).first()
    
    # If resubmitting, check allow_resubmit
    if submission and not settings.get("allow_resubmit", True):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Resubmissions are not allowed for this assignment")
    
    # Store uploaded files
    attachment_paths = []
    for file in files:
        if file.filename:
            # Sanitize filename — strip path components & reject traversal
            safe_name = os.path.basename(file.filename)
            if not safe_name or ".." in safe_name:
                continue
            
            # Create directory for this submission
            submission_dir = UPLOAD_DIR / str(assignment_id) / str(current_user.id)
            submission_dir.mkdir(parents=True, exist_ok=True)
            
            # Save file with sanitized name
            file_path = submission_dir / safe_name
            # Final check: resolved path must stay inside UPLOAD_DIR
            if not str(file_path.resolve()).startswith(str(UPLOAD_DIR.resolve())):
                continue
            
            with open(file_path, "wb") as f:
                f.write(await file.read())
            
            attachment_paths.append(str(file_path.relative_to(BASE_DIR)))
    
    if submission:
        # Update existing submission
        submission.content = content
        if attachment_paths:
            submission.attachments = attachment_paths
        submission.submitted_at = datetime.utcnow()
        submission.revision_count += 1
        submission.status = "submitted"
    else:
        # Create new submission
        submission = Submission(
            assignment_id=assignment_id,
            student_id=current_user.id,
            content=content,
            attachments=attachment_paths,
            status="submitted"
        )
        db.add(submission)
    
    db.commit()
    db.refresh(submission)
    
    user = db.query(User).filter(User.id == submission.student_id).first()
    
    return SubmissionOut(
        id=submission.id,
        assignment_id=submission.assignment_id,
        student_id=submission.student_id,
        student_name=user.full_name or user.email.split('@')[0],
        student_email=user.email,
        content=submission.content,
        attachments=submission.attachments or [],
        submitted_at=submission.submitted_at,
        status=submission.status,
        revision_count=submission.revision_count
    )


@assignment_router.get("/{classroom_id}/assignments/{assignment_id}/my-submission", response_model=SubmissionOut)
async def get_my_submission(
    classroom_id: UUID,
    assignment_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current student's submission"""
    classroom = db.query(Classroom).filter(Classroom.id == classroom_id).first()
    if not classroom:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Classroom not found")
    
    submission = db.query(Submission).filter(
        Submission.assignment_id == assignment_id,
        Submission.student_id == current_user.id
    ).first()
    
    if not submission:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No submission found")
    
    user = db.query(User).filter(User.id == current_user.id).first()
    grade = db.query(Grade).filter(Grade.submission_id == submission.id).first()
    
    return SubmissionOut(
        id=submission.id,
        assignment_id=submission.assignment_id,
        student_id=submission.student_id,
        student_name=user.full_name or user.email.split('@')[0],
        student_email=user.email,
        content=submission.content,
        attachments=submission.attachments or [],
        submitted_at=submission.submitted_at,
        status=submission.status,
        revision_count=submission.revision_count,
        grade=grade.points_earned if grade else None,
        feedback=grade.feedback if grade else None,
        graded_at=grade.graded_at if grade else None,
        graded_by=grade.graded_by if grade else None
    )


@assignment_router.get("/{classroom_id}/assignments/student", response_model=dict)
async def get_student_assignments(
    classroom_id: UUID,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get assignments for current student in classroom"""
    classroom = db.query(Classroom).filter(Classroom.id == classroom_id).first()
    if not classroom:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Classroom not found")
    
    # Check enrollment
    enrollment = db.query(ClassroomEnrollment).filter(
        ClassroomEnrollment.classroom_id == classroom_id,
        ClassroomEnrollment.student_id == current_user.id
    ).first()
    
    if not enrollment:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enrolled in this classroom")
    
    # Get assignments
    query = db.query(Assignment).filter(
        Assignment.classroom_id == classroom_id,
        Assignment.status.in_(["published", "closed"])
    )
    
    total = query.count()
    total_pages = math.ceil(total / limit)
    offset = (page - 1) * limit
    
    assignments = query.order_by(Assignment.due_date.desc()).offset(offset).limit(limit).all()
    
    items = []
    for assignment in assignments:
        submission = db.query(Submission).filter(
            Submission.assignment_id == assignment.id,
            Submission.student_id == current_user.id
        ).first()
        
        grade = db.query(Grade).filter(
            Grade.assignment_id == assignment.id,
            Grade.student_id == current_user.id
        ).first()
        
        items.append({
            "id": assignment.id,
            "title": assignment.title,
            "description": assignment.description,
            "points_possible": assignment.points_possible,
            "due_date": assignment.due_date,
            "status": assignment.status,
            "submitted": submission is not None,
            "submitted_at": submission.submitted_at if submission else None,
            "grade": grade.points_earned if grade else None,
            "feedback": grade.feedback if grade else None
        })
    
    return {
        "items": items,
        "total": total,
        "page": page,
        "per_page": limit,
        "total_pages": total_pages
    }


# ============================================================================
# GRADING
# ============================================================================


@assignment_router.put("/{classroom_id}/assignments/{assignment_id}/submissions/{submission_id}/grade", response_model=SubmissionOut)
async def grade_submission(
    classroom_id: UUID,
    assignment_id: UUID,
    submission_id: UUID,
    grade_data: GradeSubmissionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Grade a submission"""
    classroom = db.query(Classroom).filter(Classroom.id == classroom_id).first()
    if not classroom:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Classroom not found")
    
    if not can_manage_assignment(classroom, current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    
    submission = db.query(Submission).filter(
        Submission.id == submission_id,
        Submission.assignment_id == assignment_id
    ).first()
    
    if not submission:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found")
    
    assignment = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    
    # Validate points_earned doesn't exceed points_possible
    if grade_data.points_earned > assignment.points_possible:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Points earned ({grade_data.points_earned}) cannot exceed points possible ({assignment.points_possible})"
        )
    
    # Calculate percentage and letter grade
    percentage = calculate_percentage(grade_data.points_earned, assignment.points_possible)
    letter_grade = calculate_letter_grade(percentage)
    
    # Get or create grade
    grade = db.query(Grade).filter(Grade.submission_id == submission.id).first()
    
    if grade:
        grade.points_earned = grade_data.points_earned
        grade.percentage = percentage
        grade.letter_grade = letter_grade
        grade.feedback = grade_data.feedback
        grade.rubric_scores = grade_data.rubric_scores
        grade.graded_by = current_user.id
        grade.graded_at = datetime.utcnow()
    else:
        grade = Grade(
            submission_id=submission.id,
            assignment_id=assignment_id,
            student_id=submission.student_id,
            classroom_id=classroom_id,
            points_earned=grade_data.points_earned,
            points_possible=assignment.points_possible,
            percentage=percentage,
            letter_grade=letter_grade,
            feedback=grade_data.feedback,
            rubric_scores=grade_data.rubric_scores,
            graded_by=current_user.id
        )
        db.add(grade)
    
    submission.status = "graded"
    db.commit()
    db.refresh(submission)
    db.refresh(grade)
    
    user = db.query(User).filter(User.id == submission.student_id).first()
    
    return SubmissionOut(
        id=submission.id,
        assignment_id=submission.assignment_id,
        student_id=submission.student_id,
        student_name=user.full_name or user.email.split('@')[0],
        student_email=user.email,
        content=submission.content,
        attachments=submission.attachments or [],
        submitted_at=submission.submitted_at,
        status=submission.status,
        revision_count=submission.revision_count,
        grade=grade.points_earned,
        feedback=grade.feedback,
        graded_at=grade.graded_at,
        graded_by=grade.graded_by
    )


@assignment_router.post("/{classroom_id}/assignments/{assignment_id}/grades/bulk", response_model=MessageResponse)
async def bulk_update_grades(
    classroom_id: UUID,
    assignment_id: UUID,
    bulk_data: BulkGradeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Bulk update grades for multiple submissions"""
    classroom = db.query(Classroom).filter(Classroom.id == classroom_id).first()
    if not classroom:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Classroom not found")
    
    if not can_manage_assignment(classroom, current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    
    assignment = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found")
    
    count = 0
    for grade_update in bulk_data.grades:
        submission_id = grade_update.get("submission_id")
        points_earned = grade_update.get("points_earned")
        feedback = grade_update.get("feedback")
        
        if not submission_id or points_earned is None:
            continue
        
        # Clamp points_earned to valid range
        points_earned = max(0, min(float(points_earned), assignment.points_possible))
        
        submission = db.query(Submission).filter(Submission.id == submission_id).first()
        if not submission:
            continue
        
        # Calculate grade
        percentage = calculate_percentage(points_earned, assignment.points_possible)
        letter_grade = calculate_letter_grade(percentage)
        
        grade = db.query(Grade).filter(Grade.submission_id == submission_id).first()
        
        if grade:
            grade.points_earned = points_earned
            grade.percentage = percentage
            grade.letter_grade = letter_grade
            if feedback:
                grade.feedback = feedback
            grade.graded_by = current_user.id
            grade.graded_at = datetime.utcnow()
        else:
            grade = Grade(
                submission_id=submission_id,
                assignment_id=assignment_id,
                student_id=submission.student_id,
                classroom_id=classroom_id,
                points_earned=points_earned,
                points_possible=assignment.points_possible,
                percentage=percentage,
                letter_grade=letter_grade,
                feedback=feedback,
                graded_by=current_user.id
            )
            db.add(grade)
        
        submission.status = "graded"
        count += 1
    
    db.commit()
    
    return MessageResponse(
        success=True,
        message=f"Updated grades for {count} submission(s)"
    )


# ============================================================================
# RUBRICS
# ============================================================================


@assignment_router.post("/{classroom_id}/assignments/{assignment_id}/rubric", response_model=AssignmentRubricOut)
async def set_rubric(
    classroom_id: UUID,
    assignment_id: UUID,
    rubric_data: SetRubricRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Set or update assignment rubric"""
    classroom = db.query(Classroom).filter(Classroom.id == classroom_id).first()
    if not classroom:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Classroom not found")
    
    if not can_manage_assignment(classroom, current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    
    assignment = db.query(Assignment).filter(
        Assignment.id == assignment_id,
        Assignment.classroom_id == classroom_id
    ).first()
    
    if not assignment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found")
    
    assignment.rubric = rubric_data.rubric_items
    db.commit()
    db.refresh(assignment)
    
    return AssignmentRubricOut(
        id=assignment.id,
        assignment_id=assignment.id,
        items=rubric_data.rubric_items
    )


@assignment_router.get("/{classroom_id}/assignments/{assignment_id}/rubric", response_model=dict)
async def get_rubric(
    classroom_id: UUID,
    assignment_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get assignment rubric"""
    classroom = db.query(Classroom).filter(Classroom.id == classroom_id).first()
    if not classroom:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Classroom not found")
    
    assignment = db.query(Assignment).filter(
        Assignment.id == assignment_id,
        Assignment.classroom_id == classroom_id
    ).first()
    
    if not assignment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found")
    
    return {
        "id": assignment.id,
        "assignment_id": assignment.id,
        "items": assignment.rubric or []
    }


# ============================================================================
# STATISTICS & EXPORT
# ============================================================================


@assignment_router.get("/{classroom_id}/assignments/{assignment_id}/stats", response_model=AssignmentStatsOut)
async def get_assignment_stats(
    classroom_id: UUID,
    assignment_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get assignment statistics"""
    classroom = db.query(Classroom).filter(Classroom.id == classroom_id).first()
    if not classroom:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Classroom not found")
    
    if not can_view_assignment(classroom, current_user, db):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    
    assignment = db.query(Assignment).filter(
        Assignment.id == assignment_id,
        Assignment.classroom_id == classroom_id
    ).first()
    
    if not assignment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found")
    
    # Get stats
    total_submissions = db.query(func.count(Submission.id)).filter(
        Submission.assignment_id == assignment_id
    ).scalar()
    
    graded_submissions = db.query(func.count(Grade.id)).filter(
        Grade.assignment_id == assignment_id
    ).scalar()
    
    pending_submissions = total_submissions - graded_submissions
    
    avg_score = db.query(func.avg(Grade.percentage)).filter(
        Grade.assignment_id == assignment_id
    ).scalar()
    
    highest_score = db.query(func.max(Grade.percentage)).filter(
        Grade.assignment_id == assignment_id
    ).scalar()
    
    lowest_score = db.query(func.min(Grade.percentage)).filter(
        Grade.assignment_id == assignment_id
    ).scalar()
    
    # Count on-time vs late submissions
    on_time = 0
    late = 0
    if assignment.due_date:
        on_time = db.query(func.count(Submission.id)).filter(
            Submission.assignment_id == assignment_id,
            Submission.submitted_at <= assignment.due_date
        ).scalar()
        late = db.query(func.count(Submission.id)).filter(
            Submission.assignment_id == assignment_id,
            Submission.submitted_at > assignment.due_date
        ).scalar()
    
    return AssignmentStatsOut(
        total_submissions=total_submissions or 0,
        graded_submissions=graded_submissions or 0,
        pending_submissions=pending_submissions or 0,
        average_score=float(avg_score) if avg_score else None,
        highest_score=float(highest_score) if highest_score else None,
        lowest_score=float(lowest_score) if lowest_score else None,
        on_time_submissions=on_time,
        late_submissions=late
    )


@assignment_router.get("/{classroom_id}/assignments/{assignment_id}/submissions/export")
async def export_submissions(
    classroom_id: UUID,
    assignment_id: UUID,
    format: str = Query("zip", regex="^(csv|zip)$"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Export submissions as CSV or ZIP"""
    classroom = db.query(Classroom).filter(Classroom.id == classroom_id).first()
    if not classroom:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Classroom not found")
    
    if not can_manage_assignment(classroom, current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    
    assignment = db.query(Assignment).filter(
        Assignment.id == assignment_id,
        Assignment.classroom_id == classroom_id
    ).first()
    
    if not assignment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found")
    
    # Get all submissions with student info
    submissions = db.query(Submission, User, Grade).join(
        User, Submission.student_id == User.id
    ).outerjoin(
        Grade, Submission.id == Grade.submission_id
    ).filter(
        Submission.assignment_id == assignment_id
    ).all()
    
    if format == "csv":
        # Generate CSV
        output = StringIO()
        writer = csv.writer(output)
        writer.writerow(["Student Name", "Email", "Submitted", "Grade", "Feedback", "Revision Count"])
        
        for submission, user, grade in submissions:
            writer.writerow([
                user.full_name or user.email.split('@')[0],
                user.email,
                "Yes" if submission.submitted_at else "No",
                f"{grade.points_earned}/{assignment.points_possible}" if grade else "Not Graded",
                grade.feedback if grade else "",
                submission.revision_count
            ])
        
        csv_content = output.getvalue()
        
        import re as _re
        safe_title = _re.sub(r'[^\w\s-]', '', assignment.title).strip().replace(' ', '_')[:50]
        
        return Response(
            content=csv_content,
            media_type="text/csv",
            headers={
                "Content-Disposition": f'attachment; filename="assignment_{safe_title}_submissions.csv"'
            }
        )
    
    else:  # zip format
        # Create ZIP with submissions
        from io import BytesIO
        
        zip_buffer = BytesIO()
        with ZipFile(zip_buffer, 'w') as zip_file:
            for submission, user, grade in submissions:
                student_folder = f"{user.full_name or user.email.split('@')[0]}"
                
                # Add submission content
                if submission.content:
                    zip_file.writestr(
                        f"{student_folder}/submission.txt",
                        submission.content
                    )
                
                # Add grade info
                grade_info = f"Points: {grade.points_earned}/{assignment.points_possible}\n"
                if grade:
                    grade_info += f"Percentage: {grade.percentage}%\n"
                    grade_info += f"Letter Grade: {grade.letter_grade}\n"
                    if grade.feedback:
                        grade_info += f"\nFeedback:\n{grade.feedback}"
                else:
                    grade_info += "Status: Not Graded"
                
                zip_file.writestr(f"{student_folder}/grade.txt", grade_info)
                
                # Add attachments
                for attachment in (submission.attachments or []):
                    attachment_path = BASE_DIR / attachment
                    if attachment_path.exists():
                        zip_file.write(
                            attachment_path,
                            f"{student_folder}/{attachment_path.name}"
                        )
        
        zip_buffer.seek(0)
        
        import re as _re
        safe_title = _re.sub(r'[^\w\s-]', '', assignment.title).strip().replace(' ', '_')[:50]
        
        return Response(
            content=zip_buffer.getvalue(),
            media_type="application/zip",
            headers={
                "Content-Disposition": f'attachment; filename="assignment_{safe_title}_submissions.zip"'
            }
        )
