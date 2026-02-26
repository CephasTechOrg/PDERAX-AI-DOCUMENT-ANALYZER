from fastapi import APIRouter, UploadFile, File, HTTPException, Query, BackgroundTasks, Depends

from services.compression_service import CompressionService
from utils.file_utils import FileUtils
from auth_dependencies import get_current_user
from models.db_models import User

compression_router = APIRouter(prefix="/compression", tags=["Compression"])


@compression_router.post("/compress")
async def compress_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    compression_level: int = Query(
        5,
        ge=0,
        le=9,
        description="Compression effort passed to PyMuPDF (0-9).",
    ),
    current_user: User = Depends(get_current_user),
):
    """Compress a PDF file and return download details."""
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="A file must be provided.")

    extension = FileUtils.get_file_extension(file)
    if extension != ".pdf":
        raise HTTPException(
            status_code=400,
            detail="Only PDF files are currently supported for compression.",
        )

    temp_file_path = None
    try:
        temp_file_path = await FileUtils.save_uploaded_file(file)
        compression_service = CompressionService()
        result = compression_service.compress_pdf(
            temp_file_path,
            original_filename=file.filename,
            compression_level=compression_level,
        )
        background_tasks.add_task(FileUtils.cleanup_old_files)
        return result
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=500, detail=f"Compression failed: {str(exc)}"
        ) from exc
    finally:
        if temp_file_path:
            FileUtils.cleanup_file(temp_file_path)
