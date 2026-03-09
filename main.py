from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import init_db
from routes.chat import router as chat_router
from routes.voice import router as voice_router
from routes.auth import router as auth_router
from routes.history import router as history_router
from routes.voice_profile import router as voice_profile_router
from routes.avatar import router as avatar_router
from routes.memory import router as memory_router
from routes.generate_video import router as video_router

app = FastAPI(title="AI Family Companion", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup():
    init_db()

app.include_router(auth_router)
app.include_router(chat_router)
app.include_router(voice_router)
app.include_router(history_router)
app.include_router(voice_profile_router)
app.include_router(avatar_router)
app.include_router(memory_router)
app.include_router(video_router)

@app.get("/")
def root():
    return {"status": "AI Family Companion API v2.0 running"}