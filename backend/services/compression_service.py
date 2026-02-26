import os
import uuid
from typing import Dict, Any

import fitz  # PyMuPDF
from utils.file_utils import FileUtils


class CompressionService:
    """Handles PDF compression tasks."""

    def __init__(self, output_dir: str | None = None):
        self.output_dir = output_dir or FileUtils.get_temp_dir()
        os.makedirs(self.output_dir, exist_ok=True)

    def compress_pdf(
        self,
        file_path: str,
        original_filename: str,
        compression_level: int = 5
    ) -> Dict[str, Any]:
        """
        Compress a PDF document using PyMuPDF.

        Args:
            file_path: Temporary path of the uploaded file.
            original_filename: Name of the uploaded file.
            compression_level: Effort parameter (0-9) passed to PyMuPDF.
        """
        if compression_level < 0 or compression_level > 9:
            raise ValueError("compression_level must be between 0 and 9")

        compressed_filename = self._build_compressed_filename(original_filename)
        compressed_path = os.path.join(self.output_dir, compressed_filename)

        doc = fitz.open(file_path)
        try:
            doc.save(
                compressed_path,
                garbage=4,
                clean=True,
                deflate=True,
                deflate_images=True,
                deflate_fonts=True,
                compression_effort=compression_level
            )
        finally:
            doc.close()

        original_size = os.path.getsize(file_path)
        compressed_size = os.path.getsize(compressed_path)
        reduction = original_size - compressed_size
        reduction_percent = (
            round((reduction / original_size) * 100, 2) if original_size else 0.0
        )

        return {
            "status": "success",
            "original_filename": original_filename,
            "compressed_filename": compressed_filename,
            "original_size_bytes": original_size,
            "original_size_human": self._format_size(original_size),
            "compressed_size_bytes": compressed_size,
            "compressed_size_human": self._format_size(compressed_size),
            "reduction_bytes": reduction,
            "reduction_percent": reduction_percent,
            "download_url": f"/static/temp/{compressed_filename}",
            "message": "Compression completed successfully",
        }

    def _build_compressed_filename(self, original_filename: str) -> str:
        base, ext = os.path.splitext(original_filename)
        safe_base = "".join(
            c if c.isalnum() or c in ("-", "_") else "_"
            for c in base
        ).strip("_") or "document"
        unique_id = uuid.uuid4().hex[:8]
        return f"{safe_base}-compressed-{unique_id}{ext or '.pdf'}"

    def _format_size(self, size_bytes: int) -> str:
        if size_bytes == 0:
            return "0 B"
        units = ["B", "KB", "MB", "GB"]
        idx = 0
        size = float(size_bytes)
        while size >= 1024 and idx < len(units) - 1:
            size /= 1024
            idx += 1
        return f"{size:.2f} {units[idx]}"
