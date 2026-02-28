"""
AI Chat Assistant routes for PDERAX
"""
from fastapi import APIRouter, Request, HTTPException, Depends, UploadFile, File
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.orm import Session

from auth_dependencies import get_current_user
from dependencies import get_db
from models.db_models import ChatSession, ChatMessage, User
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
    return ChatMessageOut(
        id=str(m.id),
        role=m.role,
        content=m.content,
        created_at=m.created_at,
    )


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
    import uuid as _uuid
    try:
        sid = _uuid.UUID(session_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid session ID")

    session = db.query(ChatSession).filter(
        ChatSession.id == sid,
        ChatSession.user_id == current_user.id,
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

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
    import uuid as _uuid
    try:
        sid = _uuid.UUID(session_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid session ID")

    session = db.query(ChatSession).filter(
        ChatSession.id == sid,
        ChatSession.user_id == current_user.id,
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

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
    import uuid as _uuid
    try:
        sid = _uuid.UUID(session_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid session ID")

    session = db.query(ChatSession).filter(
        ChatSession.id == sid,
        ChatSession.user_id == current_user.id,
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

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
    import uuid as _uuid
    try:
        sid = _uuid.UUID(session_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid session ID")

    session = db.query(ChatSession).filter(
        ChatSession.id == sid,
        ChatSession.user_id == current_user.id,
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

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
    import uuid as _uuid
    try:
        sid = _uuid.UUID(session_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid session ID")

    session = db.query(ChatSession).filter(
        ChatSession.id == sid,
        ChatSession.user_id == current_user.id,
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Build history from existing messages
    history = [
        {"role": m.role, "content": m.content}
        for m in session.messages
    ]

    # Persist the user message
    user_msg = ChatMessage(
        session_id=session.id,
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
