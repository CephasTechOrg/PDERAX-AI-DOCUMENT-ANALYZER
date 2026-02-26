from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks, Depends
from fastapi.responses import FileResponse
import os
from services.file_processing import FileProcessingService
from utils.file_utils import FileUtils
from auth_dependencies import get_current_user
from models.db_models import User

upload_router = APIRouter()

@upload_router.post("/upload")
async def upload_file(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
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

        if result["status"] == "error":
            raise HTTPException(status_code=500, detail=result["error"])

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
