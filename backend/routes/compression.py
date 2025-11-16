from fastapi import APIRouter, UploadFile, File, HTTPException, Query

from services.compression_service import CompressionService
from utils.file_utils import FileUtils

compression_router = APIRouter(prefix="/compression", tags=["Compression"])


@compression_router.post("/compress")
async def compress_document(
    file: UploadFile = File(...),
    compression_level: int = Query(
        5,
        ge=0,
        le=9,
        description="Compression effort passed to PyMuPDF (0-9).",
    ),
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

    temp_file_path = await FileUtils.save_uploaded_file(file)
    compression_service = CompressionService()

    try:
        return compression_service.compress_pdf(
            temp_file_path,
            original_filename=file.filename,
            compression_level=compression_level,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=500, detail=f"Compression failed: {str(exc)}"
        ) from exc
    finally:
        FileUtils.cleanup_file(temp_file_path)
