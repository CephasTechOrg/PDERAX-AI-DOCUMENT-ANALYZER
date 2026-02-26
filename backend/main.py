from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
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

# Create FastAPI app
app = FastAPI(
    title="AI PDF Analyzer API",
    description="Advanced AI-powered document analysis system",
    version="1.0.0"
)

# Configure CORS based on environment
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
if ENVIRONMENT == "production":
    allowed_origins = [
        "https://pderax.onrender.com",
        "https://ai-pdf-analyzer-backend.onrender.com",
        # Add your frontend domain here
    ]
    allow_credentials = True
else:
    allowed_origins = ["*"]
    allow_credentials = False

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
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
STATIC_DIR = BASE_DIR / "static"
TEMP_DIR = STATIC_DIR / "temp"
TEMP_DIR.mkdir(parents=True, exist_ok=True)

# Include routers
app.include_router(auth_router, prefix="/api/v1", tags=["Auth"])
app.include_router(upload_router, prefix="/api/v1", tags=["File Upload & Analysis"])
app.include_router(compression_router, prefix="/api/v1", tags=["Compression"])

# Mount static files for downloads
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

@app.on_event("startup")
async def startup_event():
    """Validate environment and setup on startup"""
    try:
        Base.metadata.create_all(bind=engine)
        print("✅ Database tables ensured")
    except Exception as exc:
        print(f"❌ Database setup failed: {exc}")

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
