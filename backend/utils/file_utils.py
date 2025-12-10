import os
import uuid
from fastapi import UploadFile

class FileUtils:
    ALLOWED_EXTENSIONS = {'.pdf', '.docx', '.doc', '.xlsx', '.xls', '.txt'}
    
    @staticmethod
    def validate_file(file: UploadFile) -> bool:
        """Validate uploaded file type"""
        if not file.filename:
            return False
            
        ext = os.path.splitext(file.filename)[1].lower()
        return ext in FileUtils.ALLOWED_EXTENSIONS
    
    @staticmethod
    def get_file_extension(file: UploadFile) -> str:
        """Get file extension"""
        return os.path.splitext(file.filename)[1].lower()
    
    @staticmethod
    def generate_unique_filename(original_filename: str) -> str:
        """Generate unique filename for storage"""
        ext = os.path.splitext(original_filename)[1].lower()
        unique_id = str(uuid.uuid4())
        return f"{unique_id}{ext}"
    
    @staticmethod
    async def save_uploaded_file(file: UploadFile, directory: str = "static/temp", chunk_size: int = 1024 * 1024) -> str:
        """Save uploaded file to temporary directory without loading entire file into memory"""
        os.makedirs(directory, exist_ok=True)
        max_size_mb = int(os.getenv("MAX_UPLOAD_SIZE_MB", "50"))
        max_size_bytes = max_size_mb * 1024 * 1024
        
        filename = FileUtils.generate_unique_filename(file.filename)
        file_path = os.path.join(directory, filename)
        
        with open(file_path, "wb") as buffer:
            total_bytes = 0
            while True:
                chunk = await file.read(chunk_size)
                if not chunk:
                    break
                total_bytes += len(chunk)
                if total_bytes > max_size_bytes:
                    buffer.close()
                    os.remove(file_path)
                    raise ValueError(f"File exceeds {max_size_mb}MB limit.")
                buffer.write(chunk)
            
        return file_path
    
    @staticmethod
    def cleanup_file(file_path: str):
        """Remove temporary file"""
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
        except Exception:
            pass  # Ignore cleanup errors
