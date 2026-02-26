import os
import re
import time
import uuid
from fastapi import UploadFile

class FileUtils:
    ALLOWED_EXTENSIONS = {'.pdf', '.docx', '.doc', '.xlsx', '.xls', '.txt'}
    _SAFE_FILENAME_RE = re.compile(r'^[A-Za-z0-9._-]+$')

    @staticmethod
    def get_base_dir() -> str:
        """Return absolute backend directory."""
        return os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

    @staticmethod
    def get_static_dir() -> str:
        """Return absolute static directory."""
        return os.path.join(FileUtils.get_base_dir(), "static")

    @staticmethod
    def get_temp_dir() -> str:
        """Return absolute temp directory for uploads/exports."""
        return os.path.join(FileUtils.get_static_dir(), "temp")
    
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
    async def save_uploaded_file(file: UploadFile, directory: str | None = None, chunk_size: int = 1024 * 1024) -> str:
        """Save uploaded file to temporary directory without loading entire file into memory"""
        if directory is None:
            directory = FileUtils.get_temp_dir()
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
    def is_safe_filename(filename: str) -> bool:
        """Check if filename is safe for direct filesystem access."""
        if not filename:
            return False
        if filename != os.path.basename(filename):
            return False
        return bool(FileUtils._SAFE_FILENAME_RE.match(filename))

    @staticmethod
    def resolve_safe_path(base_dir: str, filename: str) -> str | None:
        """Resolve a safe file path within base_dir or return None."""
        if not FileUtils.is_safe_filename(filename):
            return None
        base_dir_abs = os.path.abspath(base_dir)
        file_path = os.path.abspath(os.path.join(base_dir_abs, filename))
        if not file_path.startswith(base_dir_abs + os.sep):
            return None
        return file_path
    
    @staticmethod
    def cleanup_file(file_path: str):
        """Remove temporary file"""
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
        except Exception:
            pass  # Ignore cleanup errors

    @staticmethod
    def cleanup_old_files(directory: str | None = None, max_age_minutes: int | None = None):
        """Remove files older than max_age_minutes from directory."""
        if directory is None:
            directory = FileUtils.get_temp_dir()
        if max_age_minutes is None:
            max_age_minutes = int(os.getenv("TEMP_FILE_TTL_MINUTES", "60"))

        if not os.path.isdir(directory):
            return

        cutoff = time.time() - (max_age_minutes * 60)
        try:
            for entry in os.scandir(directory):
                if not entry.is_file():
                    continue
                try:
                    if entry.stat().st_mtime < cutoff:
                        os.remove(entry.path)
                except Exception:
                    continue
        except Exception:
            pass
