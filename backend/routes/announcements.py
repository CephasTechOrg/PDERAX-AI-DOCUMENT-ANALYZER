"""Classroom Announcements Routes"""
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from auth_dependencies import get_current_user
from dependencies import get_db
from models.db_models import (
    Classroom, ClassroomAnnouncement, AnnouncementComment, ClassroomEnrollment, User
)
from schemas.announcements import (
    AnnouncementOut, CommentOut,
    CreateAnnouncementRequest, CreateCommentRequest,
)

announcements_router = APIRouter(prefix="/classrooms", tags=["Announcements"])


def _get_classroom_and_check_access(classroom_id: UUID, current_user: User, db: Session):
    """Return classroom or raise 404/403. Also returns is_teacher flag."""
    classroom = db.query(Classroom).filter(Classroom.id == classroom_id).first()
    if not classroom:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Classroom not found")

    is_teacher = classroom.teacher_id == current_user.id
    is_enrolled = db.query(ClassroomEnrollment).filter(
        ClassroomEnrollment.classroom_id == classroom_id,
        ClassroomEnrollment.student_id == current_user.id,
        ClassroomEnrollment.status == "active",
    ).first() is not None

    if not (is_teacher or is_enrolled or current_user.is_admin):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    return classroom, is_teacher


# ── Announcements ─────────────────────────────────────────────────────────────

@announcements_router.get("/{classroom_id}/announcements", response_model=list[AnnouncementOut])
async def list_announcements(
    classroom_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _get_classroom_and_check_access(classroom_id, current_user, db)

    announcements = (
        db.query(ClassroomAnnouncement)
        .filter(ClassroomAnnouncement.classroom_id == classroom_id)
        .order_by(ClassroomAnnouncement.created_at.desc())
        .all()
    )

    return [
        AnnouncementOut(
            id=a.id,
            classroom_id=a.classroom_id,
            author_id=a.author_id,
            author_name=a.author.full_name or a.author.email.split("@")[0],
            title=a.title,
            content=a.content,
            comment_count=len(a.comments),
            created_at=a.created_at,
            updated_at=a.updated_at,
        )
        for a in announcements
    ]


@announcements_router.post("/{classroom_id}/announcements", response_model=AnnouncementOut, status_code=status.HTTP_201_CREATED)
async def create_announcement(
    classroom_id: UUID,
    body: CreateAnnouncementRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    classroom, is_teacher = _get_classroom_and_check_access(classroom_id, current_user, db)

    if not is_teacher and not current_user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only teachers can post announcements")

    ann = ClassroomAnnouncement(
        classroom_id=classroom_id,
        author_id=current_user.id,
        title=body.title,
        content=body.content,
    )
    db.add(ann)
    db.commit()
    db.refresh(ann)

    return AnnouncementOut(
        id=ann.id,
        classroom_id=ann.classroom_id,
        author_id=ann.author_id,
        author_name=current_user.full_name or current_user.email.split("@")[0],
        title=ann.title,
        content=ann.content,
        comment_count=0,
        created_at=ann.created_at,
        updated_at=ann.updated_at,
    )


@announcements_router.delete("/{classroom_id}/announcements/{ann_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_announcement(
    classroom_id: UUID,
    ann_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    classroom, is_teacher = _get_classroom_and_check_access(classroom_id, current_user, db)

    ann = db.query(ClassroomAnnouncement).filter(
        ClassroomAnnouncement.id == ann_id,
        ClassroomAnnouncement.classroom_id == classroom_id,
    ).first()
    if not ann:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Announcement not found")

    if not is_teacher and ann.author_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    db.delete(ann)
    db.commit()
    return None


# ── Comments ──────────────────────────────────────────────────────────────────

@announcements_router.get("/{classroom_id}/announcements/{ann_id}/comments", response_model=list[CommentOut])
async def list_comments(
    classroom_id: UUID,
    ann_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _get_classroom_and_check_access(classroom_id, current_user, db)

    ann = db.query(ClassroomAnnouncement).filter(
        ClassroomAnnouncement.id == ann_id,
        ClassroomAnnouncement.classroom_id == classroom_id,
    ).first()
    if not ann:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Announcement not found")

    return [
        CommentOut(
            id=c.id,
            announcement_id=c.announcement_id,
            author_id=c.author_id,
            author_name=c.author.full_name or c.author.email.split("@")[0],
            content=c.content,
            created_at=c.created_at,
        )
        for c in ann.comments
    ]


@announcements_router.post("/{classroom_id}/announcements/{ann_id}/comments", response_model=CommentOut, status_code=status.HTTP_201_CREATED)
async def add_comment(
    classroom_id: UUID,
    ann_id: UUID,
    body: CreateCommentRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _get_classroom_and_check_access(classroom_id, current_user, db)

    ann = db.query(ClassroomAnnouncement).filter(
        ClassroomAnnouncement.id == ann_id,
        ClassroomAnnouncement.classroom_id == classroom_id,
    ).first()
    if not ann:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Announcement not found")

    comment = AnnouncementComment(
        announcement_id=ann_id,
        author_id=current_user.id,
        content=body.content,
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)

    return CommentOut(
        id=comment.id,
        announcement_id=comment.announcement_id,
        author_id=comment.author_id,
        author_name=current_user.full_name or current_user.email.split("@")[0],
        content=comment.content,
        created_at=comment.created_at,
    )


@announcements_router.delete("/{classroom_id}/announcements/{ann_id}/comments/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_comment(
    classroom_id: UUID,
    ann_id: UUID,
    comment_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    classroom, is_teacher = _get_classroom_and_check_access(classroom_id, current_user, db)

    comment = db.query(AnnouncementComment).filter(
        AnnouncementComment.id == comment_id,
        AnnouncementComment.announcement_id == ann_id,
    ).first()
    if not comment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Comment not found")

    if not is_teacher and comment.author_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    db.delete(comment)
    db.commit()
    return None
