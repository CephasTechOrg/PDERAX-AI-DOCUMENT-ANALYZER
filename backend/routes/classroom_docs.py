"""Classroom Document Library Routes"""
from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from auth_dependencies import get_current_user
from dependencies import get_db
from models.db_models import (
    AnalysisResult, Classroom, ClassroomDocument, ClassroomEnrollment, User
)
from services.file_processing import FileProcessingService
from utils.file_utils import FileUtils

classroom_docs_router = APIRouter(prefix="/classrooms", tags=["Classroom Documents"])


class DocumentOut(BaseModel):
    id: str
    classroom_id: str
    uploader_id: str
    uploader_name: str
    analysis_id: str | None
    filename: str
    description: str | None
    is_visible_to_students: bool
    uploaded_at: str


class ToggleVisibilityRequest(BaseModel):
    is_visible_to_students: bool


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


def _doc_to_out(doc: ClassroomDocument) -> DocumentOut:
    return DocumentOut(
        id=str(doc.id),
        classroom_id=str(doc.classroom_id),
        uploader_id=str(doc.uploader_id),
        uploader_name=doc.uploader.full_name or doc.uploader.email.split("@")[0],
        analysis_id=str(doc.analysis_id) if doc.analysis_id else None,
        filename=doc.filename,
        description=doc.description,
        is_visible_to_students=doc.is_visible_to_students,
        uploaded_at=doc.uploaded_at.isoformat(),
    )


@classroom_docs_router.get("/{classroom_id}/documents", response_model=list[DocumentOut])
async def list_documents(
    classroom_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    classroom, is_teacher = _check_member(classroom_id, current_user, db)

    query = db.query(ClassroomDocument).filter(ClassroomDocument.classroom_id == classroom_id)
    if not is_teacher and not current_user.is_admin:
        query = query.filter(ClassroomDocument.is_visible_to_students == True)

    docs = query.order_by(ClassroomDocument.uploaded_at.desc()).all()
    return [_doc_to_out(d) for d in docs]


@classroom_docs_router.post("/{classroom_id}/documents", response_model=DocumentOut, status_code=201)
async def upload_document(
    classroom_id: UUID,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    classroom, is_teacher = _check_member(classroom_id, current_user, db)

    # Check upload permission
    allow_uploads = (classroom.settings or {}).get("allow_student_uploads", True)
    if not is_teacher and not allow_uploads and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Student uploads are disabled for this classroom")

    if not FileUtils.validate_file(file):
        raise HTTPException(status_code=400, detail="Invalid file type. Supported: PDF, DOCX, DOC, XLSX, XLS, TXT")

    temp_path = None
    try:
        temp_path = await FileUtils.save_uploaded_file(file)
        result = await FileProcessingService().process_uploaded_file(temp_path, file.filename)

        extracted_text = result.get("extracted_text") or ""
        analysis_id = None

        if extracted_text.strip():
            record = AnalysisResult(
                user_id=current_user.id,
                filename=file.filename,
                analysis=result.get("analysis", {}),
                word_count=(result.get("word_count_info") or {}).get("processed_word_count"),
            )
            db.add(record)
            db.flush()
            analysis_id = record.id

        doc = ClassroomDocument(
            classroom_id=classroom_id,
            uploader_id=current_user.id,
            analysis_id=analysis_id,
            filename=file.filename,
        )
        db.add(doc)
        db.commit()
        db.refresh(doc)
        return _doc_to_out(doc)

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")
    finally:
        if temp_path:
            FileUtils.cleanup_file(temp_path)


@classroom_docs_router.patch("/{classroom_id}/documents/{doc_id}", response_model=DocumentOut)
async def toggle_visibility(
    classroom_id: UUID,
    doc_id: UUID,
    body: ToggleVisibilityRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    classroom, is_teacher = _check_member(classroom_id, current_user, db)
    if not is_teacher and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Only teachers can change document visibility")

    doc = db.query(ClassroomDocument).filter(
        ClassroomDocument.id == doc_id,
        ClassroomDocument.classroom_id == classroom_id,
    ).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    doc.is_visible_to_students = body.is_visible_to_students
    db.commit()
    db.refresh(doc)
    return _doc_to_out(doc)


@classroom_docs_router.delete("/{classroom_id}/documents/{doc_id}", status_code=204)
async def delete_document(
    classroom_id: UUID,
    doc_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    classroom, is_teacher = _check_member(classroom_id, current_user, db)

    doc = db.query(ClassroomDocument).filter(
        ClassroomDocument.id == doc_id,
        ClassroomDocument.classroom_id == classroom_id,
    ).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    if not is_teacher and doc.uploader_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Access denied")

    db.delete(doc)
    db.commit()
    return None
