from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import documents, sessions

app = FastAPI(title="Document Q&A API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(documents.router)
app.include_router(sessions.router)


@app.get("/health")
def health():
    return {"status": "ok"}
