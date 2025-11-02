<p align="center">
  <h1 align="center">🧠 PDERAX AI DOCUMENT ANALYZER</h1>
  <h3 align="center"><em>AI THAT UNDERSTANDS YOUR DOCUMENTS</em></h3>
</p>

---

## 🌍 Overview

<p align="center">
  <b>PDERAX AI Document Analyzer</b> is an advanced AI-powered document intelligence system built to <b>analyze, summarize, and transform your documents</b> into concise and actionable insights.  
  It seamlessly integrates with <b>DeepSeek AI API</b>, enabling smart document summarization with precision and speed.  
</p>

<p align="center">
  Whether it’s a <b>PDF, Word document, or Excel file</b>, PDERAX processes your file, extracts text, analyzes it, and generates a detailed summary.  
  You can then <b>download results</b> in your <b>preferred format (PDF, DOCX, TXT, etc.)</b> — all branded with our <b>PDERAX logo</b> for authenticity.
</p>

---

## 📱 User Journey

<p align="center">

| Step | Description |
|------|--------------|
| **Landing** | Eye-catching Hero section with live stats and Call-to-Action (CTA). |
| **Upload** | Drag & Drop file uploader with validation for file type and size. |
| **Processing** | Animated AI brain visual with dynamic progress stages. |
| **Results** | Displays comprehensive analysis, summaries, and extracted insights in multiple formats. |
| **Export** | One-click download in preferred file format (PDF, DOCX, TXT). |
| **New Analysis** | Simple reset functionality for analyzing new documents instantly. |

</p>

---

## 🎉 Project Strengths

### 🧩 Technical Excellence
- Clean separation of concerns (**API layer, UI logic, and services**).  
- Uses **modern JavaScript practices (ES6+, async/await)**.  
- Comprehensive **error handling** with clear user feedback.  
- **Optimized performance** with lazy loading and efficient DOM updates.

### 🎨 Design Quality
- Cohesive **design system** with consistent styling.  
- **Smooth animations** and seamless transitions.  
- Strong **branding and professional interface**.  
- Highly **intuitive user flow** for better engagement.

---

## 🧠 Backend Folder Structure

```bash
back-end/
├── models/request_models.py      # Pydantic schemas for validation
├── routes/upload.py              # API endpoints for file uploads
├── services/                     # Business logic modules
│   ├── ai_service.py             # Connects to DeepSeek AI API
│   ├── file_processing.py        # Handles document pre-processing
│   └── summarization_service.py  # Summarization and analysis logic
├── utils/                        # Utility helpers
│   ├── export_utils.py           # Exporting and download formatting
│   ├── file_utils.py             # File management utilities
│   └── text_extractor.py         # Text extraction logic
├── static/temp/                  # Temporary storage for uploads
├── main.py                       # Application entry point (FastAPI)
└── requirements.txt              # Project dependencies

💻 Frontend Folder Structure
frontend/
🔗 Integration with DeepSeek AI
<p align="center"> The backend communicates directly with <b>DeepSeek AI API</b> for intelligent document summarization. This ensures the analyzer delivers <b>context-aware summaries</b> while maintaining <b>data privacy and efficiency</b>. </p>
🖼️ Project Screenshots
<p align="center"> <img src="https://github.com/CephasTechOrg/PDERAX-AI-DOCUMENT-ANALYZER/blob/main/README/Screenshot_2-11-2025_0212_.jpeg" width="30%"> <img src="https://github.com/CephasTechOrg/PDERAX-AI-DOCUMENT-ANALYZER/blob/main/README/Screenshot_2-11-2025_02138_.jpeg" width="30%"> <img src="https://github.com/CephasTechOrg/PDERAX-AI-DOCUMENT-ANALYZER/blob/main/README/Screenshot_2-11-2025_02154_.jpeg" width="30%"> </p> <p align="center"> <img src="https://github.com/CephasTechOrg/PDERAX-AI-DOCUMENT-ANALYZER/blob/main/README/Screenshot_2-11-2025_02342_.jpeg" width="30%"> <img src="https://github.com/CephasTechOrg/PDERAX-AI-DOCUMENT-ANALYZER/blob/main/README/Screenshot_2-11-2025_02548_.jpeg" width="30%"> <img src="https://github.com/CephasTechOrg/PDERAX-AI-DOCUMENT-ANALYZER/blob/main/README/Screenshot_2-11-2025_0235_.jpeg" width="30%"> </p>
🧩 Technologies Used
<p align="center">
Category	Tools / Frameworks
Frontend	HTML5, CSS3, JavaScript (ES6+), Glassmorphism UI
Backend	FastAPI, Python, Uvicorn
AI Engine	DeepSeek API
Data Processing	Pydantic, Custom File Parsers
Deployment	GitHub, Local or Cloud (optional)
</p>
├── index.html          # Main HTML structure
├── style.css           # Glassmorphism-inspired responsive design
├── app.js              # Core JavaScript (2,000+ lines of logic)
├── api.js              # Handles backend communication via REST
└── assets/images/      # Logos, icons, and static assets

