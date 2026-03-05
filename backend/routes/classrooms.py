"""
Classroom Management Routes
Handles classroom CRUD, student enrollment, and invitations
"""
import math
import secrets
import string
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from auth_dependencies import get_current_user
from dependencies import get_db
from models.db_models import Assignment, Classroom, ClassroomEnrollment, User
from schemas.classrooms import (
    ChangeStudentRoleRequest,
    ClassroomOut,
    ClassroomSettingsOut,
    ClassroomSettingsRequest,
    ClassroomStatsOut,
    ClassroomWithStatsOut,
    CreateClassroomRequest,
    InviteStudentRequest,
    JoinClassroomRequest,
    MessageResponse,
    PaginatedClassrooms,
    PaginatedStudents,
    StudentInClassroomOut,
    UpdateClassroomRequest,
)
from services.email_service import send_classroom_invitation

classroom_router = APIRouter(prefix="/classrooms", tags=["Classrooms"])


def generate_invite_code() -> str:
    """Generate a unique 8-character invite code"""
    characters = string.ascii_uppercase + string.digits
    return ''.join(secrets.choice(characters) for _ in range(8))


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
# CLASSROOM CRUD
# ============================================================================


@classroom_router.post("", response_model=ClassroomOut, status_code=status.HTTP_201_CREATED)
async def create_classroom(
    classroom_data: CreateClassroomRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new classroom"""
    # Any authenticated user can create classrooms (students can lead study groups)
    # Admin check kept for potential future use
    _ = current_user.is_admin  # noqa
    
    # Generate unique invite code
    invite_code = generate_invite_code()
    while db.query(Classroom).filter(Classroom.invite_code == invite_code).first():
        invite_code = generate_invite_code()
    
    # Default settings (include creator_role so classroom pages can gate features)
    default_settings = {
        "allow_student_uploads": True,
        "allow_peer_review": False,
        "anonymous_feedback": False,
        "email_notifications": True,
        "auto_grading_enabled": False,
        "creator_role": classroom_data.creator_role or "teacher",
    }

    classroom = Classroom(
        teacher_id=current_user.id,
        name=classroom_data.name,
        description=classroom_data.description,
        subject=classroom_data.subject,
        grade_level=classroom_data.grade_level,
        invite_code=invite_code,
        settings=default_settings
    )
    
    db.add(classroom)
    db.commit()
    db.refresh(classroom)
    
    # Convert settings dict to Pydantic model
    classroom_dict = {
        "id": classroom.id,
        "teacher_id": classroom.teacher_id,
        "name": classroom.name,
        "description": classroom.description,
        "subject": classroom.subject,
        "grade_level": classroom.grade_level,
        "invite_code": classroom.invite_code,
        "is_archived": classroom.is_archived,
        "settings": ClassroomSettingsOut(**(classroom.settings or {})),
        "created_at": classroom.created_at,
        "updated_at": classroom.updated_at
    }
    
    return ClassroomOut(**classroom_dict)


@classroom_router.get("", response_model=PaginatedClassrooms)
async def list_classrooms(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all classrooms for the current user (teacher or enrolled student)"""
    query = db.query(Classroom)
    
    # Everyone sees classrooms they own (teacher_id) OR are enrolled in.
    # This ensures a user who creates a classroom always sees it,
    # regardless of their account role field.
    if not current_user.is_admin:
        enrolled_classroom_ids = db.query(ClassroomEnrollment.classroom_id).filter(
            ClassroomEnrollment.student_id == current_user.id,
            ClassroomEnrollment.status == "active"
        ).subquery()
        query = query.filter(
            or_(
                Classroom.teacher_id == current_user.id,
                Classroom.id.in_(enrolled_classroom_ids)
            )
        )
    
    # Filter out archived classrooms by default
    query = query.filter(Classroom.is_archived == False)
    
    total = query.count()
    total_pages = math.ceil(total / limit)
    offset = (page - 1) * limit
    
    classrooms = query.order_by(Classroom.created_at.desc()).offset(offset).limit(limit).all()
    
    # Add statistics to each classroom
    items = []
    for classroom in classrooms:
        student_count = db.query(ClassroomEnrollment).filter(
            ClassroomEnrollment.classroom_id == classroom.id,
            ClassroomEnrollment.status == "active"
        ).count()
        
        assignment_count = db.query(Assignment).filter(
            Assignment.classroom_id == classroom.id
        ).count()
        
        active_assignment_count = db.query(Assignment).filter(
            Assignment.classroom_id == classroom.id,
            Assignment.status == "published"
        ).count()
        
        classroom_dict = {
            "id": classroom.id,
            "teacher_id": classroom.teacher_id,
            "name": classroom.name,
            "description": classroom.description,
            "subject": classroom.subject,
            "grade_level": classroom.grade_level,
            "invite_code": classroom.invite_code,
            "is_archived": classroom.is_archived,
            "settings": ClassroomSettingsOut(**(classroom.settings or {})),
            "created_at": classroom.created_at,
            "updated_at": classroom.updated_at,
            "student_count": student_count,
            "assignment_count": assignment_count,
            "active_assignment_count": active_assignment_count
        }
        items.append(ClassroomWithStatsOut(**classroom_dict))
    
    return PaginatedClassrooms(
        items=items,
        total=total,
        page=page,
        per_page=limit,
        total_pages=total_pages
    )


@classroom_router.get("/student/enrolled", response_model=PaginatedClassrooms)
async def get_student_classrooms(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all classrooms where current user is enrolled as a student"""
    enrolled_classroom_ids = db.query(ClassroomEnrollment.classroom_id).filter(
        ClassroomEnrollment.student_id == current_user.id,
        ClassroomEnrollment.status == "active"
    ).subquery()

    query = db.query(Classroom).filter(
        Classroom.id.in_(enrolled_classroom_ids),
        Classroom.is_archived == False
    )

    total = query.count()
    total_pages = math.ceil(total / limit)
    offset = (page - 1) * limit

    classrooms = query.order_by(Classroom.created_at.desc()).offset(offset).limit(limit).all()

    items = []
    for classroom in classrooms:
        student_count = db.query(ClassroomEnrollment).filter(
            ClassroomEnrollment.classroom_id == classroom.id,
            ClassroomEnrollment.status == "active"
        ).count()
        assignment_count = db.query(Assignment).filter(
            Assignment.classroom_id == classroom.id
        ).count()
        active_assignment_count = db.query(Assignment).filter(
            Assignment.classroom_id == classroom.id,
            Assignment.status == "published"
        ).count()
        classroom_dict = {
            "id": classroom.id,
            "teacher_id": classroom.teacher_id,
            "name": classroom.name,
            "description": classroom.description,
            "subject": classroom.subject,
            "grade_level": classroom.grade_level,
            "invite_code": classroom.invite_code,
            "is_archived": classroom.is_archived,
            "settings": ClassroomSettingsOut(**(classroom.settings or {})),
            "created_at": classroom.created_at,
            "updated_at": classroom.updated_at,
            "student_count": student_count,
            "assignment_count": assignment_count,
            "active_assignment_count": active_assignment_count
        }
        items.append(ClassroomWithStatsOut(**classroom_dict))

    return PaginatedClassrooms(
        items=items,
        total=total,
        page=page,
        per_page=limit,
        total_pages=total_pages
    )


@classroom_router.get("/{classroom_id}", response_model=ClassroomWithStatsOut)
async def get_classroom(
    classroom_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get classroom details"""
    classroom = db.query(Classroom).filter(Classroom.id == classroom_id).first()
    if not classroom:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Classroom not found")
    
    # Check access
    is_teacher = classroom.teacher_id == current_user.id
    is_enrolled = db.query(ClassroomEnrollment).filter(
        ClassroomEnrollment.classroom_id == classroom_id,
        ClassroomEnrollment.student_id == current_user.id,
        ClassroomEnrollment.status == "active"
    ).first() is not None
    
    if not (is_teacher or is_enrolled or current_user.is_admin):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    
    # Get statistics
    student_count = db.query(ClassroomEnrollment).filter(
        ClassroomEnrollment.classroom_id == classroom_id,
        ClassroomEnrollment.status == "active"
    ).count()
    
    assignment_count = db.query(Assignment).filter(
        Assignment.classroom_id == classroom_id
    ).count()
    
    active_assignment_count = db.query(Assignment).filter(
        Assignment.classroom_id == classroom_id,
        Assignment.status == "published"
    ).count()
    
    classroom_dict = {
        "id": classroom.id,
        "teacher_id": classroom.teacher_id,
        "name": classroom.name,
        "description": classroom.description,
        "subject": classroom.subject,
        "grade_level": classroom.grade_level,
        "invite_code": classroom.invite_code,
        "is_archived": classroom.is_archived,
        "settings": ClassroomSettingsOut(**(classroom.settings or {})),
        "created_at": classroom.created_at,
        "updated_at": classroom.updated_at,
        "student_count": student_count,
        "assignment_count": assignment_count,
        "active_assignment_count": active_assignment_count
    }
    
    return ClassroomWithStatsOut(**classroom_dict)


@classroom_router.put("/{classroom_id}", response_model=ClassroomOut)
async def update_classroom(
    classroom_id: UUID,
    update_data: UpdateClassroomRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update classroom details"""
    classroom = db.query(Classroom).filter(Classroom.id == classroom_id).first()
    if not classroom:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Classroom not found")
    
    # Only teacher or admin can update
    if classroom.teacher_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    
    # Update fields
    if update_data.name is not None:
        classroom.name = update_data.name
    if update_data.description is not None:
        classroom.description = update_data.description
    if update_data.subject is not None:
        classroom.subject = update_data.subject
    if update_data.grade_level is not None:
        classroom.grade_level = update_data.grade_level
    
    db.commit()
    db.refresh(classroom)
    
    classroom_dict = {
        "id": classroom.id,
        "teacher_id": classroom.teacher_id,
        "name": classroom.name,
        "description": classroom.description,
        "subject": classroom.subject,
        "grade_level": classroom.grade_level,
        "invite_code": classroom.invite_code,
        "is_archived": classroom.is_archived,
        "settings": ClassroomSettingsOut(**(classroom.settings or {})),
        "created_at": classroom.created_at,
        "updated_at": classroom.updated_at
    }
    
    return ClassroomOut(**classroom_dict)


@classroom_router.delete("/{classroom_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_classroom(
    classroom_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a classroom"""
    classroom = db.query(Classroom).filter(Classroom.id == classroom_id).first()
    if not classroom:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Classroom not found")
    
    # Only teacher or admin can delete
    if classroom.teacher_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    
    db.delete(classroom)
    db.commit()
    return None


@classroom_router.post("/{classroom_id}/archive", response_model=ClassroomOut)
async def archive_classroom(
    classroom_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Archive a classroom"""
    classroom = db.query(Classroom).filter(Classroom.id == classroom_id).first()
    if not classroom:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Classroom not found")
    
    # Only teacher or admin can archive
    if classroom.teacher_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    
    classroom.is_archived = True
    db.commit()
    db.refresh(classroom)
    
    classroom_dict = {
        "id": classroom.id,
        "teacher_id": classroom.teacher_id,
        "name": classroom.name,
        "description": classroom.description,
        "subject": classroom.subject,
        "grade_level": classroom.grade_level,
        "invite_code": classroom.invite_code,
        "is_archived": classroom.is_archived,
        "settings": ClassroomSettingsOut(**(classroom.settings or {})),
        "created_at": classroom.created_at,
        "updated_at": classroom.updated_at
    }
    
    return ClassroomOut(**classroom_dict)


# ============================================================================
# STUDENT MANAGEMENT
# ============================================================================


@classroom_router.get("/{classroom_id}/students", response_model=PaginatedStudents)
async def get_classroom_students(
    classroom_id: UUID,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get list of students enrolled in classroom"""
    classroom = db.query(Classroom).filter(Classroom.id == classroom_id).first()
    if not classroom:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Classroom not found")
    
    # Check access
    is_teacher = classroom.teacher_id == current_user.id
    is_enrolled = db.query(ClassroomEnrollment).filter(
        ClassroomEnrollment.classroom_id == classroom_id,
        ClassroomEnrollment.student_id == current_user.id
    ).first() is not None
    
    if not (is_teacher or is_enrolled or current_user.is_admin):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    
    # Query enrollments
    query = db.query(ClassroomEnrollment, User).join(
        User, ClassroomEnrollment.student_id == User.id
    ).filter(
        ClassroomEnrollment.classroom_id == classroom_id,
        ClassroomEnrollment.status == "active"
    )
    
    total = query.count()
    total_pages = math.ceil(total / limit)
    offset = (page - 1) * limit
    
    enrollments = query.order_by(User.full_name).offset(offset).limit(limit).all()
    
    items = []
    for enrollment, user in enrollments:
        items.append(StudentInClassroomOut(
            id=enrollment.id,
            user_id=user.id,
            classroom_id=enrollment.classroom_id,
            name=user.full_name or user.email.split('@')[0],
            email=user.email,
            role=enrollment.role,
            status=enrollment.status,
            joined_at=enrollment.joined_at
        ))
    
    return PaginatedStudents(
        items=items,
        total=total,
        page=page,
        per_page=limit,
        total_pages=total_pages
    )


@classroom_router.post("/{classroom_id}/invite", response_model=MessageResponse)
async def invite_student(
    classroom_id: UUID,
    invite_data: InviteStudentRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Invite a student to the classroom by email"""
    classroom = db.query(Classroom).filter(Classroom.id == classroom_id).first()
    if not classroom:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Classroom not found")
    
    # Only teacher or admin can invite
    if classroom.teacher_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    
    # Check if student exists
    student = db.query(User).filter(User.email == invite_data.email).first()
    
    # Send invitation email via SendGrid
    teacher_name = current_user.full_name or current_user.email.split('@')[0]
    
    try:
        await send_classroom_invitation(
            student_email=invite_data.email,
            classroom_name=classroom.name,
            teacher_name=teacher_name,
            invite_code=classroom.invite_code,
            classroom_id=str(classroom_id)
        )
        
        return MessageResponse(
            success=True,
            message=f"Invitation email sent to {invite_data.email}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to send invitation: {str(e)}"
        )


@classroom_router.delete("/{classroom_id}/students/{student_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_student(
    classroom_id: UUID,
    student_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Remove a student from the classroom"""
    classroom = db.query(Classroom).filter(Classroom.id == classroom_id).first()
    if not classroom:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Classroom not found")
    
    # Only teacher or admin can remove students
    if classroom.teacher_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    
    enrollment = db.query(ClassroomEnrollment).filter(
        ClassroomEnrollment.classroom_id == classroom_id,
        ClassroomEnrollment.student_id == student_id
    ).first()
    
    if not enrollment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found in classroom")
    
    db.delete(enrollment)
    db.commit()
    return None


@classroom_router.put("/{classroom_id}/students/{student_id}/role", response_model=StudentInClassroomOut)
async def change_student_role(
    classroom_id: UUID,
    student_id: UUID,
    role_data: ChangeStudentRoleRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Change a student's role (student or assistant)"""
    classroom = db.query(Classroom).filter(Classroom.id == classroom_id).first()
    if not classroom:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Classroom not found")
    
    # Only teacher or admin can change roles
    if classroom.teacher_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    
    enrollment = db.query(ClassroomEnrollment).filter(
        ClassroomEnrollment.classroom_id == classroom_id,
        ClassroomEnrollment.student_id == student_id
    ).first()
    
    if not enrollment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found in classroom")
    
    enrollment.role = role_data.role
    db.commit()
    db.refresh(enrollment)
    
    user = db.query(User).filter(User.id == student_id).first()
    
    return StudentInClassroomOut(
        id=enrollment.id,
        user_id=user.id,
        classroom_id=enrollment.classroom_id,
        name=user.full_name or user.email.split('@')[0],
        email=user.email,
        role=enrollment.role,
        status=enrollment.status,
        joined_at=enrollment.joined_at
    )


# ============================================================================
# INVITATIONS & JOINING
# ============================================================================


@classroom_router.post("/{classroom_id}/invite-code", response_model=dict)
async def generate_new_invite_code(
    classroom_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generate a new invite code for the classroom"""
    classroom = db.query(Classroom).filter(Classroom.id == classroom_id).first()
    if not classroom:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Classroom not found")
    
    # Only teacher or admin can generate codes
    if classroom.teacher_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    
    # Generate new unique code
    invite_code = generate_invite_code()
    while db.query(Classroom).filter(Classroom.invite_code == invite_code).first():
        invite_code = generate_invite_code()
    
    classroom.invite_code = invite_code
    db.commit()
    
    return {
        "id": classroom.id,
        "classroom_id": classroom.id,
        "invite_code": invite_code,
        "created_at": classroom.updated_at
    }


@classroom_router.get("/{classroom_id}/invite-codes", response_model=list[dict])
async def get_invite_codes(
    classroom_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all invite codes for the classroom"""
    classroom = db.query(Classroom).filter(Classroom.id == classroom_id).first()
    if not classroom:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Classroom not found")
    
    # Check access — enrolled members may also view the invite code so they can share it
    is_teacher = classroom.teacher_id == current_user.id
    is_enrolled = db.query(ClassroomEnrollment).filter(
        ClassroomEnrollment.classroom_id == classroom_id,
        ClassroomEnrollment.student_id == current_user.id
    ).first() is not None
    if not (is_teacher or is_enrolled or current_user.is_admin):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    # Return current invite code
    return [{
        "id": classroom.id,
        "classroom_id": classroom.id,
        "invite_code": classroom.invite_code,
        "created_at": classroom.created_at
    }]


@classroom_router.post("/join", response_model=ClassroomWithStatsOut)
async def join_classroom_with_code(
    join_data: JoinClassroomRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Join a classroom using an invite code"""
    classroom = db.query(Classroom).filter(
        Classroom.invite_code == join_data.invite_code.upper()
    ).first()
    
    if not classroom:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invalid invite code"
        )
    
    # Prevent joining archived classrooms
    if classroom.is_archived:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This classroom has been archived and is no longer accepting students"
        )
    
    # Prevent teacher from enrolling as student in their own classroom
    if classroom.teacher_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You are the teacher of this classroom"
        )
    
    # Check if already enrolled
    existing = db.query(ClassroomEnrollment).filter(
        ClassroomEnrollment.classroom_id == classroom.id,
        ClassroomEnrollment.student_id == current_user.id
    ).first()
    
    if existing:
        if existing.status == "active":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Already enrolled in this classroom"
            )
        else:
            # Reactivate enrollment
            existing.status = "active"
            db.commit()
    else:
        # Create new enrollment
        enrollment = ClassroomEnrollment(
            classroom_id=classroom.id,
            student_id=current_user.id,
            role="student",
            status="active"
        )
        db.add(enrollment)
        db.commit()
    
    # Get statistics
    student_count = db.query(ClassroomEnrollment).filter(
        ClassroomEnrollment.classroom_id == classroom.id,
        ClassroomEnrollment.status == "active"
    ).count()
    
    assignment_count = db.query(Assignment).filter(
        Assignment.classroom_id == classroom.id
    ).count()
    
    active_assignment_count = db.query(Assignment).filter(
        Assignment.classroom_id == classroom.id,
        Assignment.status == "published"
    ).count()
    
    classroom_dict = {
        "id": classroom.id,
        "teacher_id": classroom.teacher_id,
        "name": classroom.name,
        "description": classroom.description,
        "subject": classroom.subject,
        "grade_level": classroom.grade_level,
        "invite_code": classroom.invite_code,
        "is_archived": classroom.is_archived,
        "settings": ClassroomSettingsOut(**(classroom.settings or {})),
        "created_at": classroom.created_at,
        "updated_at": classroom.updated_at,
        "student_count": student_count,
        "assignment_count": assignment_count,
        "active_assignment_count": active_assignment_count
    }
    
    return ClassroomWithStatsOut(**classroom_dict)


# ============================================================================
# SETTINGS & STATS
# ============================================================================


@classroom_router.get("/{classroom_id}/stats", response_model=ClassroomStatsOut)
async def get_classroom_stats(
    classroom_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get classroom statistics"""
    classroom = db.query(Classroom).filter(Classroom.id == classroom_id).first()
    if not classroom:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Classroom not found")
    
    # Check access
    is_teacher = classroom.teacher_id == current_user.id
    is_enrolled = db.query(ClassroomEnrollment).filter(
        ClassroomEnrollment.classroom_id == classroom_id,
        ClassroomEnrollment.student_id == current_user.id
    ).first() is not None
    
    if not (is_teacher or is_enrolled or current_user.is_admin):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    
    student_count = db.query(ClassroomEnrollment).filter(
        ClassroomEnrollment.classroom_id == classroom_id,
        ClassroomEnrollment.status == "active"
    ).count()
    
    assignment_count = db.query(Assignment).filter(
        Assignment.classroom_id == classroom_id
    ).count()
    
    active_assignment_count = db.query(Assignment).filter(
        Assignment.classroom_id == classroom_id,
        Assignment.status == "published"
    ).count()
    
    # TODO: Calculate average score from grades
    average_score = 0.0
    
    return ClassroomStatsOut(
        total_students=student_count,
        total_assignments=assignment_count,
        average_score=average_score,
        active_assignments=active_assignment_count
    )


@classroom_router.put("/{classroom_id}/settings", response_model=ClassroomOut)
async def update_classroom_settings(
    classroom_id: UUID,
    settings_data: ClassroomSettingsRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update classroom settings"""
    classroom = db.query(Classroom).filter(Classroom.id == classroom_id).first()
    if not classroom:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Classroom not found")
    
    # Only teacher or admin can update settings
    if classroom.teacher_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    
    # Update settings — copy dict so SQLAlchemy detects the mutation
    current_settings = dict(classroom.settings or {})
    
    if settings_data.allow_student_uploads is not None:
        current_settings["allow_student_uploads"] = settings_data.allow_student_uploads
    if settings_data.allow_peer_review is not None:
        current_settings["allow_peer_review"] = settings_data.allow_peer_review
    if settings_data.anonymous_feedback is not None:
        current_settings["anonymous_feedback"] = settings_data.anonymous_feedback
    if settings_data.email_notifications is not None:
        current_settings["email_notifications"] = settings_data.email_notifications
    if settings_data.auto_grading_enabled is not None:
        current_settings["auto_grading_enabled"] = settings_data.auto_grading_enabled
    
    classroom.settings = current_settings
    db.commit()
    db.refresh(classroom)
    
    classroom_dict = {
        "id": classroom.id,
        "teacher_id": classroom.teacher_id,
        "name": classroom.name,
        "description": classroom.description,
        "subject": classroom.subject,
        "grade_level": classroom.grade_level,
        "invite_code": classroom.invite_code,
        "is_archived": classroom.is_archived,
        "settings": ClassroomSettingsOut(**(classroom.settings or {})),
        "created_at": classroom.created_at,
        "updated_at": classroom.updated_at
    }
    
    return ClassroomOut(**classroom_dict)


@classroom_router.get("/{classroom_id}/roster/export")
async def export_classroom_roster(
    classroom_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Export classroom roster as CSV"""
    classroom = db.query(Classroom).filter(Classroom.id == classroom_id).first()
    if not classroom:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Classroom not found")
    
    # Only teacher or admin can export
    if classroom.teacher_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    
    # Get all students
    enrollments = db.query(ClassroomEnrollment, User).join(
        User, ClassroomEnrollment.student_id == User.id
    ).filter(
        ClassroomEnrollment.classroom_id == classroom_id
    ).all()
    
    # Generate CSV content
    import csv
    from io import StringIO
    
    output = StringIO()
    writer = csv.writer(output)
    writer.writerow(["Name", "Email", "Role", "Status", "Joined Date"])
    
    for enrollment, user in enrollments:
        writer.writerow([
            user.full_name or user.email.split('@')[0],
            user.email,
            enrollment.role,
            enrollment.status,
            enrollment.joined_at.strftime("%Y-%m-%d")
        ])
    
    csv_content = output.getvalue()
    
    # Sanitize classroom name for filename (remove non-alphanumeric chars)
    import re as _re
    safe_name = _re.sub(r'[^\w\s-]', '', classroom.name).strip().replace(' ', '_')[:50]
    
    from fastapi.responses import Response
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={
            "Content-Disposition": f'attachment; filename="classroom_{safe_name}_roster.csv"'
        }
    )
