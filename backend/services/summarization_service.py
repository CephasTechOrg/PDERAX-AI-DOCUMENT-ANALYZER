from services.ai_service import AIService

class SummarizationService:
    def __init__(self):
        self.ai_service = AIService()
    
    async def analyze_document(self, extraction_result: dict, analysis_type: str = "full") -> dict:
        """Analyze document text and return structured results"""
        text = extraction_result.get("text", "")
        original_word_count = extraction_result.get("original_word_count", 0)
        processed_word_count = extraction_result.get("processed_word_count", 0)
        was_truncated = extraction_result.get("was_truncated", False)
        word_limit = extraction_result.get("word_limit", 5000)
        
        if not text or len(text.strip()) < 10:
            return {
                "summary": "Document content is too short for meaningful analysis.",
                "insights": ["Insufficient content for insights"],
                "questions_answers": [],
                "word_count_info": {
                    "original": original_word_count,
                    "processed": processed_word_count,
                    "was_truncated": was_truncated,
                    "limit": word_limit
                }
            }
        
        # Add truncation notice to AI context if needed
        if was_truncated:
            truncation_notice = f"\n\nImportant: This document was truncated to {word_limit:,} words for analysis. The original document contained {original_word_count:,} words. Please focus your analysis on the provided content."
            # We'll let the AI handle the truncated text directly since we already added a notice in the text
        
        # Additional safety truncation for very long texts (character-based)
        if len(text) > 15000:
            text = text[:15000] + "... [content further truncated for analysis]"
        
        analysis_result = self.ai_service.analyze_text(text, analysis_type)
        
        # Add word count information to the analysis result
        analysis_result["word_count_info"] = {
            "original": original_word_count,
            "processed": processed_word_count,
            "was_truncated": was_truncated,
            "limit": word_limit
        }
        
        return analysis_result