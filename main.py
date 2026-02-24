"""
Family Companion AI - FastAPI Backend
Main entry point for the application
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from database import init_db
from routes.chat import router as chat_router
from routes.history import router as history_router
from routes.users import router as users_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize database on startup"""
    init_db()
    yield


app = FastAPI(
    title="Family Companion AI",
    description="An emotional AI chatbot that simulates family relationships",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration - allow frontend origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "https://*.vercel.app",
        "*"  # Remove in strict production; use specific origins
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(users_router, prefix="/api", tags=["users"])
app.include_router(chat_router, prefix="/api", tags=["chat"])
app.include_router(history_router, prefix="/api", tags=["history"])


@app.get("/")
async def root():
    return {"message": "Family Companion AI API is running 💚", "version": "1.0.0"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}
