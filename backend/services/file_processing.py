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
        try:
            # Extract text from file with word limit enforcement
            extraction_result = self.text_extractor.extract_text(file_path, word_limit=5000)
            
            # Analyze the extracted text
            analysis_result = await self.summarization_service.analyze_document(extraction_result)
            
            # Generate export files
            export_files = self._generate_exports(analysis_result)
            
            # Prepare response with word count information
            response = {
                "filename": original_filename,
                "extracted_text_length": len(extraction_result["text"]),
                "analysis": analysis_result,
                "export_files": export_files,
                "status": "success",
                "word_count_info": extraction_result  # Include word count details
            }
            
            # Add truncation warning if applicable
            if extraction_result.get("was_truncated", False):
                response["warning"] = {
                    "type": "word_limit_exceeded",
                    "message": f"Document exceeded 5,000 word limit. Only first 5,000 words were processed.",
                    "original_words": extraction_result["original_word_count"],
                    "processed_words": extraction_result["processed_word_count"],
                    "limit": extraction_result["word_limit"]
                }
            
            return response
            
        except Exception as e:
            return {
                "filename": original_filename,
                "error": str(e),
                "status": "error"
            }
    
    def _generate_exports(self, analysis_result: dict) -> dict:
        """Generate export files for download"""
        from utils.export_utils import ExportUtils
        return ExportUtils.export_analysis(analysis_result)