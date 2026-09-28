"""
CipherLens FastAPI Application.
Application-level REST API interfacing the Next.js frontend with the batsignal core.
"""

from __future__ import annotations

import argparse
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.routes import analysis, encryption, health, processing

app = FastAPI(
    title="CipherLens API",
    description="Computational imaging, 2D signal processing, and optical encryption laboratory API.",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# The frontend and backend are deployed independently. Set CORS_ORIGINS to a
# comma-separated list of deployed frontend URLs.
cors_origins = [
    origin.strip()
    for origin in os.getenv(
        "CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000"
    ).split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount routes under /api
app.include_router(health.router, prefix="/api")
app.include_router(processing.router, prefix="/api")
app.include_router(encryption.router, prefix="/api")
app.include_router(analysis.router, prefix="/api")


@app.get("/")
async def root():
    return {
        "service": "CipherLens Laboratory API",
        "status": "operational",
        "version": "0.1.0",
        "docs": "/docs",
    }


def main():
    import uvicorn

    parser = argparse.ArgumentParser(description="Run the CipherLens FastAPI application")
    parser.add_argument(
        "--host", default="127.0.0.1", help="Host IP (default: 127.0.0.1)"
    )
    parser.add_argument("--port", type=int, default=8000, help="Port (default: 8000)")
    parser.add_argument("--reload", action="store_true", help="Enable reload")
    args = parser.parse_args()

    print(f"Starting CipherLens API on http://{args.host}:{args.port}")
    uvicorn.run("api.main:app", host=args.host, port=args.port, reload=args.reload)


if __name__ == "__main__":
    main()
