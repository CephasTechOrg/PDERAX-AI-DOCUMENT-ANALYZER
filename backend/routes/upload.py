from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import FileResponse
import os
from services.file_processing import FileProcessingService
from utils.file_utils import FileUtils

upload_router = APIRouter()

@upload_router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    """Handle file upload and analysis"""
    
    # Validate file
    if not FileUtils.validate_file(file):
        raise HTTPException(
            status_code=400, 
            detail="Invalid file type. Supported types: PDF, DOCX, DOC, XLSX, XLS"
        )
    
    file_processing = FileProcessingService()
    temp_file_path = None
    
    try:
        # Save uploaded file temporarily
        temp_file_path = await FileUtils.save_uploaded_file(file)
        
        # Process the file
        result = await file_processing.process_uploaded_file(temp_file_path, file.filename)
        
        if result["status"] == "error":
            raise HTTPException(status_code=500, detail=result["error"])
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Processing error: {str(e)}")
    
    finally:
        # Cleanup temporary file
        if temp_file_path:
            FileUtils.cleanup_file(temp_file_path)

@upload_router.get("/download/{filename}")
async def download_file(filename: str):
    """Download exported analysis file"""
    file_path = os.path.join("static/temp", filename)
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    
    return FileResponse(
        path=file_path,
        filename=filename,
        media_type='application/octet-stream'
    )