import fitz  # PyMuPDF
import pandas as pd
from docx import Document
import os
import re

class TextExtractor:
    @staticmethod
    def extract_text_from_pdf(file_path: str) -> str:
        """Extract text from PDF file"""
        try:
            doc = fitz.open(file_path)
            text = ""
            for page in doc:
                text += page.get_text()
            doc.close()
            return text.strip()
        except Exception as e:
            raise Exception(f"PDF extraction error: {str(e)}")

    @staticmethod
    def extract_text_from_docx(file_path: str) -> str:
        """Extract text from Word document"""
        try:
            doc = Document(file_path)
            text = ""
            for paragraph in doc.paragraphs:
                text += paragraph.text + "\n"
            return text.strip()
        except Exception as e:
            raise Exception(f"DOCX extraction error: {str(e)}")

    @staticmethod
    def extract_text_from_excel(file_path: str) -> str:
        """Extract text from Excel file"""
        try:
            # Read all sheets
            excel_file = pd.ExcelFile(file_path)
            text = ""
            
            for sheet_name in excel_file.sheet_names:
                df = pd.read_excel(file_path, sheet_name=sheet_name)
                text += f"--- Sheet: {sheet_name} ---\n"
                
                # Convert dataframe to string
                text += df.to_string(index=False) + "\n\n"
                
            return text.strip()
        except Exception as e:
            raise Exception(f"Excel extraction error: {str(e)}")

    @staticmethod
    def count_words(text: str) -> int:
        """Count words in text"""
        if not text:
            return 0
        # Split by whitespace and filter out empty strings
        words = re.findall(r'\b\w+\b', text)
        return len(words)

    @staticmethod
    def truncate_to_word_limit(text: str, word_limit: int = 5000) -> tuple:
        """Truncate text to specified word limit and return (truncated_text, original_word_count, was_truncated)"""
        if not text:
            return text, 0, False
            
        words = re.findall(r'\b\w+\b', text)
        original_word_count = len(words)
        
        if original_word_count <= word_limit:
            return text, original_word_count, False
        
        # Truncate to word limit
        truncated_words = words[:word_limit]
        
        # Reconstruct text while preserving as much structure as possible
        # Find the position where the last word ends
        pattern = r'(?:\b\w+\b\W*){' + str(word_limit) + '}'
        match = re.search(pattern, text)
        
        if match:
            truncated_text = match.group(0).strip()
        else:
            # Fallback: join words with spaces
            truncated_text = ' '.join(truncated_words)
        
        # Add truncation notice
        truncated_text += f"\n\n[Note: Document exceeded {word_limit:,} word limit. Only first {word_limit:,} words were processed. Original document had {original_word_count:,} words.]"
        
        return truncated_text, original_word_count, True

    @staticmethod
    def extract_text(file_path: str, word_limit: int = 5000) -> dict:
        """Extract text based on file extension with word limit enforcement"""
        ext = os.path.splitext(file_path)[1].lower()
        
        try:
            if ext == '.pdf':
                raw_text = TextExtractor.extract_text_from_pdf(file_path)
            elif ext in ['.docx', '.doc']:
                raw_text = TextExtractor.extract_text_from_docx(file_path)
            elif ext in ['.xlsx', '.xls']:
                raw_text = TextExtractor.extract_text_from_excel(file_path)
            else:
                raise Exception(f"Unsupported file type: {ext}")
            
            # Apply word limit
            processed_text, original_word_count, was_truncated = TextExtractor.truncate_to_word_limit(raw_text, word_limit)
            
            return {
                "text": processed_text,
                "original_word_count": original_word_count,
                "processed_word_count": TextExtractor.count_words(processed_text),
                "was_truncated": was_truncated,
                "word_limit": word_limit
            }
            
        except Exception as e:
            raise Exception(f"Text extraction error: {str(e)}")