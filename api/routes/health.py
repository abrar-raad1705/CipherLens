"""
Health and diagnostics endpoint.
"""

from __future__ import annotations

from fastapi import APIRouter

router = APIRouter(prefix="/health", tags=["Health"])


@router.get("")
async def get_health():
    return {
        "status": "healthy",
        "service": "Bat Signal Computational Imaging Core",
        "version": "0.1.0",
        "engine": "FastAPI + NumPy/SciPy",
    }
