import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.routes import upload, status, download, cancel
from api.services.storage import ensure_storage_dir


@asynccontextmanager
async def lifespan(app: FastAPI):
    ensure_storage_dir()
    yield


app = FastAPI(
    title="Watermark Remover API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(upload.router, prefix="/api")
app.include_router(status.router, prefix="/api")
app.include_router(download.router, prefix="/api")
app.include_router(cancel.router, prefix="/api")


@app.get("/api/health")
async def health_check():
    return {"status": "ok"}
