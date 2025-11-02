from pydantic import BaseModel
from typing import Optional, List, Dict, Any

class AnalysisRequest(BaseModel):
    text: str
    analysis_type: str = "summary"  # summary, insights, qa, full

class AnalysisResponse(BaseModel):
    summary: str
    insights: List[str]
    questions_answers: List[Dict[str, str]]
    status: str = "success"

class FileUploadResponse(BaseModel):
    filename: str
    content_type: str
    file_size: int
    extracted_text: str
    analysis: Optional[AnalysisResponse] = None
    export_files: Optional[Dict[str, str]] = None