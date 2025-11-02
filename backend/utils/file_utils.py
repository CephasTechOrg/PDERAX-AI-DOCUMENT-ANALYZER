import os
import uuid
from fastapi import UploadFile

class FileUtils:
    ALLOWED_EXTENSIONS = {'.pdf', '.docx', '.doc', '.xlsx', '.xls'}
    
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
    async def save_uploaded_file(file: UploadFile, directory: str = "static/temp") -> str:
        """Save uploaded file to temporary directory"""
        os.makedirs(directory, exist_ok=True)
        
        filename = FileUtils.generate_unique_filename(file.filename)
        file_path = os.path.join(directory, filename)
        
        with open(file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
            
        return file_path
    
    @staticmethod
    def cleanup_file(file_path: str):
        """Remove temporary file"""
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
        except Exception:
            pass  # Ignore cleanup errors