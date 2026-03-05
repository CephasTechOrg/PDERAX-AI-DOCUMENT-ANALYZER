from fastapi import APIRouter, Request, UploadFile, File, HTTPException, BackgroundTasks, Depends
from fastapi.responses import FileResponse
import os
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.orm import Session
from services.file_processing import FileProcessingService
from utils.file_utils import FileUtils
from auth_dependencies import get_current_user
from dependencies import get_db
from models.db_models import AnalysisResult, User

upload_router = APIRouter()
_limiter = Limiter(key_func=get_remote_address)


@upload_router.post("/upload")
@_limiter.limit("20/hour")
async def upload_file(
    request: Request,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Handle file upload and analysis"""

    # Validate file
    if not FileUtils.validate_file(file):
        raise HTTPException(
            status_code=400,
            detail="Invalid file type. Supported types: PDF, DOCX, DOC, XLSX, XLS, TXT",
        )

    file_processing = FileProcessingService()
    temp_file_path = None

    try:
        # Save uploaded file temporarily
        temp_file_path = await FileUtils.save_uploaded_file(file)

        # Process the file
        result = await file_processing.process_uploaded_file(
            temp_file_path, file.filename
        )

        extracted_text = result.get("extracted_text") or ""

        # Persist to history whenever we have text — even on partial AI failure.
        # Only skip saving if there is genuinely nothing extracted.
        if extracted_text.strip():
            try:
                word_info = result.get("word_count_info") or {}
                record = AnalysisResult(
                    user_id=current_user.id,
                    filename=file.filename,
                    analysis=result.get("analysis", {}),
                    word_count=word_info.get("processed_word_count"),
                )
                db.add(record)
                db.commit()
                db.refresh(record)
                result["analysis_id"] = str(record.id)
            except Exception as exc:
                print(f"Warning: could not save analysis to history: {exc}")

        # Now surface a proper error only when there is nothing usable at all
        if result["status"] == "error" and not extracted_text.strip():
            raise HTTPException(status_code=500, detail=result.get("error", "Processing failed"))

        background_tasks.add_task(FileUtils.cleanup_old_files)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Processing error: {str(e)}")
    finally:
        # Cleanup temporary file
        if temp_file_path:
            FileUtils.cleanup_file(temp_file_path)

@upload_router.get("/download/{filename}")
async def download_file(
    filename: str,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
):
    """Download exported analysis file"""
    temp_dir = FileUtils.get_temp_dir()
    file_path = FileUtils.resolve_safe_path(temp_dir, filename)

    if not file_path:
        raise HTTPException(status_code=400, detail="Invalid filename")

    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")

    background_tasks.add_task(FileUtils.cleanup_file, file_path)

    return FileResponse(
        path=file_path,
        filename=filename,
        media_type='application/octet-stream',
        background=background_tasks,
    )
