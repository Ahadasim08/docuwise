from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import documents, sessions

_LOCAL_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:3000",
]

app = FastAPI(title="Document Q&A API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=_LOCAL_ORIGINS + ([settings.frontend_url] if settings.frontend_url else []),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

app.include_router(documents.router)
app.include_router(sessions.router)


@app.get("/health")
def health():
    return {"status": "ok"}
