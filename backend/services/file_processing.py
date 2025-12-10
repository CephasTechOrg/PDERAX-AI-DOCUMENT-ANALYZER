from utils.text_extractor import TextExtractor
from utils.file_utils import FileUtils
from services.summarization_service import SummarizationService
import os

class FileProcessingService:
    def __init__(self):
        self.text_extractor = TextExtractor()
        self.summarization_service = SummarizationService()
    
    async def process_uploaded_file(self, file_path: str, original_filename: str) -> dict:
        """Process uploaded file and return analysis results"""
        warnings = []

        # Extract text with a robust fallback to avoid hard failures
        try:
            extraction_result = self.text_extractor.extract_text(file_path, word_limit=5000)
        except Exception as exc:
            warnings.append({
                "type": "extraction_failed",
                "message": f"Text extraction failed, using fallback response: {exc}"
            })
            extraction_result = {
                "text": "",
                "original_word_count": 0,
                "processed_word_count": 0,
                "was_truncated": False,
                "word_limit": 5000
            }
        
        # Analyze the extracted text
        try:
            analysis_result = await self.summarization_service.analyze_document(extraction_result)
        except Exception as exc:
            warnings.append({
                "type": "analysis_failed",
                "message": f"Analysis failed, using safe fallback: {exc}"
            })
            analysis_result = {
                "summary": "Analysis could not be completed. Please try again with a different file.",
                "insights": [],
                "questions_answers": []
            }
        
        # Generate export files
        export_files = {}
        try:
            export_files = self._generate_exports(analysis_result)
        except Exception as exc:
            warnings.append({
                "type": "export_failed",
                "message": f"Export generation failed: {exc}"
            })
        
        # Prepare response with word count information
        response = {
            "filename": original_filename,
            "extracted_text_length": len(extraction_result.get("text", "")),
            "analysis": analysis_result,
            "export_files": export_files,
            "status": "success",
            "word_count_info": extraction_result  # Include word count details
        }
        
        # Add truncation warning if applicable
        if extraction_result.get("was_truncated", False):
            warnings.append({
                "type": "word_limit_exceeded",
                "message": "Document exceeded 5,000 word limit. Only first 5,000 words were processed.",
                "original_words": extraction_result.get("original_word_count", 0),
                "processed_words": extraction_result.get("processed_word_count", 0),
                "limit": extraction_result.get("word_limit", 5000)
            })

        if warnings:
            response["warnings"] = warnings
        
        return response
    
    def _generate_exports(self, analysis_result: dict) -> dict:
        """Generate export files for download"""
        from utils.export_utils import ExportUtils
        return ExportUtils.export_analysis(analysis_result)
