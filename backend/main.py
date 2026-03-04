from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import os
from pathlib import Path
from dotenv import load_dotenv
from starlette.middleware.sessions import SessionMiddleware

# Load environment variables
load_dotenv()

from database import Base, engine
import models.db_models  # noqa: F401
from routes.auth import auth_router
from routes.upload import upload_router
from routes.compression import compression_router
from routes.flashcards import flashcard_router
from routes.quiz import quiz_router
from routes.history import history_router
from routes.chat import chat_router
from routes.analytics import router as analytics_router
from routes.classrooms import classroom_router
from routes.assignments import assignment_router
from routes.grades import grade_router

# Rate limiter — keyed by IP
limiter = Limiter(key_func=get_remote_address, default_limits=["200/hour"])

# Create FastAPI app
app = FastAPI(
    title="AI PDF Analyzer API",
    description="Advanced AI-powered document analysis system",
    version="1.0.0"
)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Configure CORS based on environment
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
if ENVIRONMENT == "production":
    allowed_origins = [
        "https://pderax.onrender.com",
        "https://ai-pdf-analyzer-backend.onrender.com",
        # Add your frontend domain here
    ]
else:
    # Development: allow all origins including file:// and localhost
    allowed_origins = [
        "http://localhost:5500",
        "http://localhost:5501",
        "http://localhost:8000",
        "http://localhost:3000",
        "http://localhost:8080",
        "http://127.0.0.1:5500",
        "http://127.0.0.1:5501",
        "http://127.0.0.1:8000",
        "http://127.0.0.1:3000",
        "null",  # For file:// protocol (opening HTML files directly)
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if ENVIRONMENT == "development" else allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Session middleware required for OAuth flows
session_secret = os.getenv("SESSION_SECRET")
if session_secret:
    app.add_middleware(
        SessionMiddleware,
        secret_key=session_secret,
        same_site="lax",
        https_only=ENVIRONMENT == "production",
    )
else:
    print("⚠️  SESSION_SECRET not set. Google OAuth may fail.")

# Ensure static directory exists
BASE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BASE_DIR.parent  # Parent of backend folder
STATIC_DIR = BASE_DIR / "static"
TEMP_DIR = STATIC_DIR / "temp"
TEMP_DIR.mkdir(parents=True, exist_ok=True)

# Frontend directories
FRONTEND_DIR = PROJECT_ROOT / "frontend"
INDEX_HTML = PROJECT_ROOT / "index.html"

# Include routers
app.include_router(auth_router, prefix="/api/v1", tags=["Auth"])
app.include_router(upload_router, prefix="/api/v1", tags=["File Upload & Analysis"])
app.include_router(compression_router, prefix="/api/v1", tags=["Compression"])
app.include_router(flashcard_router, prefix="/api/v1/flashcards", tags=["Flashcards"])
app.include_router(quiz_router, prefix="/api/v1/quiz", tags=["Quiz"])
app.include_router(history_router, prefix="/api/v1", tags=["History"])
app.include_router(chat_router, prefix="/api/v1/chat", tags=["Chat"])
app.include_router(analytics_router, tags=["Analytics"])
app.include_router(classroom_router, prefix="/api/v1", tags=["Classrooms"])
app.include_router(assignment_router, prefix="/api/v1", tags=["Assignments"])
app.include_router(grade_router, prefix="/api/v1", tags=["Grades"])

# Mount static files for downloads
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

# Mount frontend static files (CSS, JS, images)
if FRONTEND_DIR.exists():
    app.mount("/frontend", StaticFiles(directory=str(FRONTEND_DIR)), name="frontend")
    print(f"✅ Frontend directory mounted: {FRONTEND_DIR}")

def _run_column_migrations():
    """Add any new columns to existing tables that create_all() would miss."""
    migrations = [
        # Add role column to users table (Phase 7)
        """
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'users' AND column_name = 'role'
            ) THEN
                ALTER TABLE users ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'student';
            END IF;
        END $$;
        """,
        # Add file_type column to analysis_results (added later to model)
        """
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'analysis_results' AND column_name = 'file_type'
            ) THEN
                ALTER TABLE analysis_results ADD COLUMN file_type VARCHAR(50);
            END IF;
        END $$;
        """,
    ]
    with engine.connect() as conn:
        for sql in migrations:
            try:
                conn.execute(__import__('sqlalchemy').text(sql))
                conn.commit()
            except Exception as exc:
                print(f"⚠️  Migration warning: {exc}")


@app.on_event("startup")
async def startup_event():
    """Validate environment and setup on startup"""
    try:
        Base.metadata.create_all(bind=engine)
        print("✅ Database tables ensured")
    except Exception as exc:
        print(f"❌ Database setup failed: {exc}")

    try:
        _run_column_migrations()
        print("✅ Column migrations applied")
    except Exception as exc:
        print(f"⚠️  Column migrations warning: {exc}")

    api_key = os.getenv("DEEPSEEK_API_KEY")
    if not api_key:
        print("⚠️ WARNING: DEEPSEEK_API_KEY not configured!")
        print("📝 AI analysis will use fallback mode.")
    else:
        print("✅ DEEPSEEK_API_KEY configured")
    
    print(f"🌍 Environment: {os.getenv('ENVIRONMENT', 'development')}")
    print(f"📁 Static directory ready: {TEMP_DIR}")

@app.get("/")
async def root():
    """Serve the main index.html page"""
    if INDEX_HTML.exists():
        return FileResponse(str(INDEX_HTML))
    return {
        "message": "AI PDF Analyzer API", 
        "status": "running",
        "version": "1.0.0",
        "environment": os.getenv("ENVIRONMENT", "development")
    }

@app.get("/index.html")
async def serve_index():
    """Serve index.html at /index.html path"""
    if INDEX_HTML.exists():
        return FileResponse(str(INDEX_HTML))
    return {"error": "index.html not found"}

@app.get("/api")
async def api_info():
    """API information endpoint"""
    return {
        "message": "AI PDF Analyzer API", 
        "status": "running",
        "version": "1.0.0",
        "environment": os.getenv("ENVIRONMENT", "development")
    }

@app.get("/health")
async def health_check():
    return {
        "status": "healthy", 
        "service": "AI PDF Analyzer",
        "ai_configured": bool(os.getenv("DEEPSEEK_API_KEY"))
    }

@app.get("/api/v1/health")
async def versioned_health_check():
    """Health endpoint to match frontend expectations."""
    return {
        "status": "healthy", 
        "service": "AI PDF Analyzer", 
        "version": "v1",
        "ai_configured": bool(os.getenv("DEEPSEEK_API_KEY"))
    }

if __name__ == "__main__":
    import uvicorn
    # Use PORT from environment (Render sets this) or default to 8000
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=ENVIRONMENT == "development"
    )
