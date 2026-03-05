"""Classroom Attendance / Session Routes"""
from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from auth_dependencies import get_current_user
from dependencies import get_db
from models.db_models import (
    Classroom, ClassroomEnrollment, ClassSession, AttendanceRecord, User
)
from schemas.attendance import (
    AttendanceRecordOut, BulkAttendanceRequest,
    CloseSessionRequest, CreateSessionRequest, SessionOut,
)

attendance_router = APIRouter(prefix="/classrooms", tags=["Attendance"])


def _check_member(classroom_id: UUID, current_user: User, db: Session):
    classroom = db.query(Classroom).filter(Classroom.id == classroom_id).first()
    if not classroom:
        raise HTTPException(status_code=404, detail="Classroom not found")
    is_teacher = classroom.teacher_id == current_user.id
    is_enrolled = db.query(ClassroomEnrollment).filter(
        ClassroomEnrollment.classroom_id == classroom_id,
        ClassroomEnrollment.student_id == current_user.id,
        ClassroomEnrollment.status == "active",
    ).first() is not None
    if not (is_teacher or is_enrolled or current_user.is_admin):
        raise HTTPException(status_code=403, detail="Access denied")
    return classroom, is_teacher


# ── Sessions ──────────────────────────────────────────────────────────────────

@attendance_router.post("/{classroom_id}/sessions", response_model=SessionOut, status_code=201)
async def create_session(
    classroom_id: UUID,
    body: CreateSessionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    classroom, is_teacher = _check_member(classroom_id, current_user, db)
    if not is_teacher and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Only teachers can open sessions")

    session = ClassSession(
        classroom_id=classroom_id,
        teacher_id=current_user.id,
        title=body.title,
        status="open",
    )
    db.add(session)
    db.flush()  # get session.id before bulk insert

    # Pre-populate "absent" records for all active enrolled students
    enrollments = db.query(ClassroomEnrollment).filter(
        ClassroomEnrollment.classroom_id == classroom_id,
        ClassroomEnrollment.status == "active",
    ).all()

    for enrollment in enrollments:
        db.add(AttendanceRecord(
            session_id=session.id,
            student_id=enrollment.student_id,
            classroom_id=classroom_id,
            status="absent",
        ))

    db.commit()
    db.refresh(session)

    return SessionOut(
        id=session.id,
        classroom_id=session.classroom_id,
        teacher_id=session.teacher_id,
        title=session.title,
        status=session.status,
        session_date=session.session_date,
        closed_at=session.closed_at,
        student_count=len(enrollments),
    )


@attendance_router.get("/{classroom_id}/sessions", response_model=list[SessionOut])
async def list_sessions(
    classroom_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _check_member(classroom_id, current_user, db)

    sessions = (
        db.query(ClassSession)
        .filter(ClassSession.classroom_id == classroom_id)
        .order_by(ClassSession.session_date.desc())
        .all()
    )
    return [
        SessionOut(
            id=s.id,
            classroom_id=s.classroom_id,
            teacher_id=s.teacher_id,
            title=s.title,
            status=s.status,
            session_date=s.session_date,
            closed_at=s.closed_at,
            student_count=len(s.records),
        )
        for s in sessions
    ]


@attendance_router.patch("/{classroom_id}/sessions/{session_id}", response_model=SessionOut)
async def close_session(
    classroom_id: UUID,
    session_id: UUID,
    body: CloseSessionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    classroom, is_teacher = _check_member(classroom_id, current_user, db)
    if not is_teacher and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Only teachers can close sessions")

    session = db.query(ClassSession).filter(
        ClassSession.id == session_id,
        ClassSession.classroom_id == classroom_id,
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    session.status = "closed"
    session.closed_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(session)

    return SessionOut(
        id=session.id,
        classroom_id=session.classroom_id,
        teacher_id=session.teacher_id,
        title=session.title,
        status=session.status,
        session_date=session.session_date,
        closed_at=session.closed_at,
        student_count=len(session.records),
    )


# ── Attendance Records ────────────────────────────────────────────────────────

@attendance_router.put("/{classroom_id}/sessions/{session_id}/attendance", response_model=list[AttendanceRecordOut])
async def update_attendance(
    classroom_id: UUID,
    session_id: UUID,
    body: BulkAttendanceRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    classroom, is_teacher = _check_member(classroom_id, current_user, db)
    if not is_teacher and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Only teachers can update attendance")

    session = db.query(ClassSession).filter(
        ClassSession.id == session_id,
        ClassSession.classroom_id == classroom_id,
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    for update in body.records:
        record = db.query(AttendanceRecord).filter(
            AttendanceRecord.session_id == session_id,
            AttendanceRecord.student_id == update.student_id,
        ).first()
        if record:
            record.status = update.status
        else:
            db.add(AttendanceRecord(
                session_id=session_id,
                student_id=update.student_id,
                classroom_id=classroom_id,
                status=update.status,
            ))

    db.commit()

    records = db.query(AttendanceRecord, User).join(
        User, AttendanceRecord.student_id == User.id
    ).filter(AttendanceRecord.session_id == session_id).all()

    return [
        AttendanceRecordOut(
            id=r.id,
            session_id=r.session_id,
            student_id=r.student_id,
            student_name=u.full_name or u.email.split("@")[0],
            student_email=u.email,
            classroom_id=r.classroom_id,
            status=r.status,
            marked_at=r.marked_at,
        )
        for r, u in records
    ]


@attendance_router.get("/{classroom_id}/sessions/{session_id}/attendance", response_model=list[AttendanceRecordOut])
async def get_attendance(
    classroom_id: UUID,
    session_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    classroom, is_teacher = _check_member(classroom_id, current_user, db)

    session = db.query(ClassSession).filter(
        ClassSession.id == session_id,
        ClassSession.classroom_id == classroom_id,
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    query = db.query(AttendanceRecord, User).join(
        User, AttendanceRecord.student_id == User.id
    ).filter(AttendanceRecord.session_id == session_id)

    # Students only see their own record
    if not is_teacher and not current_user.is_admin:
        query = query.filter(AttendanceRecord.student_id == current_user.id)

    records = query.all()

    return [
        AttendanceRecordOut(
            id=r.id,
            session_id=r.session_id,
            student_id=r.student_id,
            student_name=u.full_name or u.email.split("@")[0],
            student_email=u.email,
            classroom_id=r.classroom_id,
            status=r.status,
            marked_at=r.marked_at,
        )
        for r, u in records
    ]
