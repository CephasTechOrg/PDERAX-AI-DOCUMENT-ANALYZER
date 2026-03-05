"""
AI Chat Assistant routes for PDERAX
"""
from uuid import UUID

from fastapi import APIRouter, Request, HTTPException, Depends, UploadFile, File
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.orm import Session

from auth_dependencies import get_current_user
from dependencies import get_db
from models.db_models import ChatSession, ChatMessage, Classroom, ClassroomEnrollment, User
from schemas.chat import (
    ChatSessionCreate,
    ChatSessionUpdate,
    ChatSessionOut,
    ChatSessionDetail,
    ChatMessageOut,
    ChatSendRequest,
    ChatSendResponse,
)
from services.chat_service import ChatService
from services.file_processing import FileProcessingService
from utils.file_utils import FileUtils

chat_router = APIRouter()
classroom_chat_router = APIRouter(prefix="/classrooms")
_limiter = Limiter(key_func=get_remote_address)
_chat_service = ChatService()


def _session_out(s: ChatSession) -> ChatSessionOut:
    return ChatSessionOut(
        id=str(s.id),
        title=s.title,
        mode=s.mode,
        document_filename=s.document_filename,
        message_count=s.message_count,
        created_at=s.created_at,
        updated_at=s.updated_at,
    )


def _message_out(m: ChatMessage) -> ChatMessageOut:
    sender_name = None
    if m.sender and m.role == "user":
        sender_name = m.sender.full_name or m.sender.email.split("@")[0]
    return ChatMessageOut(
        id=str(m.id),
        role=m.role,
        content=m.content,
        sender_name=sender_name,
        created_at=m.created_at,
    )


def _check_session_access(session_id: str, current_user: User, db: Session) -> ChatSession:
    """Return session if accessible by the current user (owner or classroom member)."""
    import uuid as _uuid
    try:
        sid = _uuid.UUID(session_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid session ID")

    session = db.query(ChatSession).filter(ChatSession.id == sid).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Owner always has access
    if session.user_id == current_user.id or current_user.is_admin:
        return session

    # Classroom sessions: check membership
    if session.classroom_id:
        classroom = db.query(Classroom).filter(Classroom.id == session.classroom_id).first()
        if classroom:
            is_teacher = classroom.teacher_id == current_user.id
            is_enrolled = db.query(ClassroomEnrollment).filter(
                ClassroomEnrollment.classroom_id == session.classroom_id,
                ClassroomEnrollment.student_id == current_user.id,
                ClassroomEnrollment.status == "active",
            ).first() is not None
            if is_teacher or is_enrolled:
                return session

    raise HTTPException(status_code=403, detail="Access denied")


# ── Session management ────────────────────────────────────────────────────────

@chat_router.post("/sessions", response_model=ChatSessionOut, status_code=201)
async def create_session(
    payload: ChatSessionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new chat session."""
    session = ChatSession(
        user_id=current_user.id,
        mode=payload.mode,
        title=payload.title or ("Teacher Mode" if payload.mode == "teacher" else "Helper Mode"),
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return _session_out(session)


@chat_router.get("/sessions", response_model=list[ChatSessionOut])
async def list_sessions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all chat sessions for the current user, newest first."""
    sessions = (
        db.query(ChatSession)
        .filter(ChatSession.user_id == current_user.id)
        .order_by(ChatSession.updated_at.desc())
        .all()
    )
    return [_session_out(s) for s in sessions]


@chat_router.get("/sessions/{session_id}", response_model=ChatSessionDetail)
async def get_session(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get a session with its full message history."""
    session = _check_session_access(session_id, current_user, db)
    return ChatSessionDetail(
        **_session_out(session).model_dump(),
        messages=[_message_out(m) for m in session.messages],
    )


@chat_router.patch("/sessions/{session_id}", response_model=ChatSessionOut)
async def update_session(
    session_id: str,
    payload: ChatSessionUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update session mode or title."""
    session = _check_session_access(session_id, current_user, db)

    if payload.mode is not None:
        session.mode = payload.mode
    if payload.title is not None:
        session.title = payload.title
    db.commit()
    db.refresh(session)
    return _session_out(session)


@chat_router.delete("/sessions/{session_id}", status_code=200)
async def delete_session(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a chat session and all its messages."""
    session = _check_session_access(session_id, current_user, db)

    db.delete(session)
    db.commit()
    return {"deleted": True}


# ── Document upload into session ──────────────────────────────────────────────

@chat_router.post("/sessions/{session_id}/upload")
@_limiter.limit("20/hour")
async def upload_document(
    request: Request,
    session_id: str,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Upload a document into a chat session.
    The extracted text becomes the AI's document context for the conversation.
    """
    session = _check_session_access(session_id, current_user, db)

    if not FileUtils.validate_file(file):
        raise HTTPException(
            status_code=400,
            detail="Invalid file type. Supported: PDF, DOCX, DOC, XLSX, XLS, TXT",
        )

    temp_path = None
    try:
        temp_path = await FileUtils.save_uploaded_file(file)
        fp = FileProcessingService()
        result = await fp.process_uploaded_file(temp_path, file.filename)

        if result.get("status") == "error":
            raise HTTPException(status_code=500, detail=result.get("error", "Processing failed"))

        # Extract plain text for context
        analysis = result.get("analysis", {})
        raw_text = (
            analysis.get("extracted_text")
            or analysis.get("summary", "")
            or str(analysis)
        )[:8000]

        session.document_context = raw_text
        session.document_filename = file.filename
        db.commit()

        return {
            "success": True,
            "filename": file.filename,
            "context_length": len(raw_text),
        }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Upload error: {exc}")
    finally:
        if temp_path:
            FileUtils.cleanup_file(temp_path)


# ── Send message ──────────────────────────────────────────────────────────────

@chat_router.post("/sessions/{session_id}/message", response_model=ChatSendResponse)
@_limiter.limit("60/hour")
async def send_message(
    request: Request,
    session_id: str,
    payload: ChatSendRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Send a user message and get an AI reply."""
    session = _check_session_access(session_id, current_user, db)

    # Build history from existing messages
    history = [
        {"role": m.role, "content": m.content}
        for m in session.messages
    ]

    # Persist the user message
    user_msg = ChatMessage(
        session_id=session.id,
        sender_id=current_user.id,
        role="user",
        content=payload.content,
    )
    db.add(user_msg)
    db.flush()

    # Call AI
    try:
        reply_text = await _chat_service.send_message(
            mode=session.mode,
            document_context=session.document_context,
            history=history,
            user_message=payload.content,
        )
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"AI error: {exc}")

    # Persist the assistant message
    assistant_msg = ChatMessage(
        session_id=session.id,
        role="assistant",
        content=reply_text,
    )
    db.add(assistant_msg)

    # Update session title from first user message if still default
    if session.message_count == 0:
        first_words = payload.content.strip().split()[:8]
        session.title = " ".join(first_words) + ("..." if len(first_words) >= 8 else "")

    session.message_count = session.message_count + 2
    db.commit()
    db.refresh(assistant_msg)

    return ChatSendResponse(
        message=_message_out(assistant_msg),
        session_id=str(session.id),
    )


# ── Classroom group chat ───────────────────────────────────────────────────────

@classroom_chat_router.get("/{classroom_id}/chat-session")
async def get_classroom_chat_session(
    classroom_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return (or lazily create) the shared AI chat session for a classroom."""
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

    session = db.query(ChatSession).filter(
        ChatSession.classroom_id == classroom_id
    ).first()

    if not session:
        session = ChatSession(
            user_id=current_user.id,
            classroom_id=classroom_id,
            title=f"{classroom.name} — Group Chat",
            mode="helper",
        )
        db.add(session)
        db.commit()
        db.refresh(session)

    return {"session_id": str(session.id)}
