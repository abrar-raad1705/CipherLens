"""
FastAPI application for the BAT SIGNAL Computational Imaging Laboratory.
Exposes REST endpoints for image uploading, preset benchmarking, spatial filtering,
transform-domain encryption, Wiener restoration, and quantitative cryptanalysis.
"""

from __future__ import annotations

import argparse
from pathlib import Path
from typing import Any

import cv2
import numpy as np
import uvicorn
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from batsignal.ui.service import LaboratorySession, create_synthetic_target

app = FastAPI(
    title="BAT SIGNAL - Computational Imaging Laboratory",
    description="Interactive 2D signal processing and cryptanalysis workbench.",
    version="0.1.0",
)

# Enable CORS for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global laboratory session (single-user local workbench session)
session = LaboratorySession()

STATIC_DIR = Path(__file__).resolve().parent / "static"


# =============================================================================
# PYDANTIC REQUEST MODELS
# =============================================================================


class LoadSampleRequest(BaseModel):
    sample_id: str = Field(
        ...,
        description="ID of preset image (cat512, frequency_grid, checkerboard, etc.)",
    )


class FilterRequest(BaseModel):
    filter_type: str = Field(
        ..., description="GAUSSIAN, MEDIAN, SOBEL, CUSTOM, or RESET"
    )
    kernel_size: int = 5
    sigma: float = 1.5
    kernel: list[list[float]] | None = None
    normalize: bool = False


class RestoreRequest(BaseModel):
    mode: str = "GAUSSIAN"
    K: float = 0.01
    kernel_size: int = 5
    sigma: float = 1.0


class DRPERequest(BaseModel):
    seed1: int = 1234
    seed2: int = 5678


class SingleSeedRequest(BaseModel):
    seed: int = 42


class ArnoldRequest(BaseModel):
    itr: int = 10
    xor_value: int = 170  # 0xAA


class DecryptRequest(BaseModel):
    method: str = "DRPE"
    key_params: dict[str, Any] = Field(default_factory=dict)


class DiffAnalysisRequest(BaseModel):
    diff_x: int = 0
    diff_y: int = 0


# =============================================================================
# API ENDPOINTS
# =============================================================================


@app.get("/api/session")
async def get_session():
    """Retrieve current laboratory instrument metadata and status."""
    return session.get_summary()


@app.get("/api/samples")
async def list_samples():
    """List available benchmark and synthetic test images."""
    return {
        "samples": [
            {
                "id": "cat512",
                "name": "Standard Benchmark (Cat 512×512)",
                "description": "Standard natural image with broad spectrum.",
            },
            {
                "id": "frequency_grid",
                "name": "Synthetic Frequency Zone Plate",
                "description": "Concentric chirps and radial frequencies.",
            },
            {
                "id": "checkerboard",
                "name": "High-Contrast Checkerboard",
                "description": "Crisp binary edge transitions (32×32 tiles).",
            },
            {
                "id": "gradient_ramp",
                "name": "Linear & Sinusoidal Ramp",
                "description": "Continuous gradient with wave modulation.",
            },
            {
                "id": "resolution_bars",
                "name": "Optical Bar Target",
                "description": "Multi-frequency Ronchi grating target.",
            },
        ]
    }


@app.post("/api/load-sample")
async def load_sample(req: LoadSampleRequest):
    """Load a preset research sample image into the laboratory session."""
    sample_id = req.sample_id.lower()

    if sample_id == "cat512":
        pkg_cat = Path(__file__).resolve().parent.parent / "pipeline" / "cat512.png"
        if not pkg_cat.exists():
            raise HTTPException(status_code=404, detail="cat512.png not found")
        img = cv2.imread(str(pkg_cat), cv2.IMREAD_GRAYSCALE)
        name = "cat512.png"
    elif sample_id in (
        "frequency_grid",
        "checkerboard",
        "gradient_ramp",
        "resolution_bars",
    ):
        img = create_synthetic_target(sample_id, 512)
        name = f"{sample_id}.png"
    else:
        raise HTTPException(status_code=400, detail=f"Unknown sample ID: {sample_id}")

    return session.set_image(img, name)


@app.post("/api/upload")
async def upload_image(file: UploadFile = File(...)):
    """Upload custom image, converting it to grayscale uint8."""
    try:
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_GRAYSCALE)
        if img is None:
            raise HTTPException(
                status_code=400,
                detail="Failed to decode image. Formats: PNG, JPG, JPEG, WEBP.",
            )

        filename = file.filename or "uploaded_image.png"
        return session.set_image(img, filename)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Image upload failed: {str(e)}")


@app.post("/api/process/filter")
async def apply_filter(req: FilterRequest):
    """Apply spatial filtering operation."""
    try:
        params = {
            "kernel_size": req.kernel_size,
            "sigma": req.sigma,
            "kernel": req.kernel,
            "normalize": req.normalize,
        }
        return session.apply_filter(req.filter_type, params)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/process/restore")
async def apply_restore(req: RestoreRequest):
    """Apply Wiener deconvolution restoration."""
    try:
        params = {"kernel_size": req.kernel_size, "sigma": req.sigma}
        return session.apply_restoration(mode=req.mode, K=req.K, params=params)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/encrypt/drpe")
async def encrypt_drpe(req: DRPERequest):
    """Execute Double Random Phase Encoding (DRPE)."""
    try:
        return session.run_drpe(seed1=req.seed1, seed2=req.seed2)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/encrypt/fourier")
async def encrypt_fourier(req: SingleSeedRequest):
    """Execute Fourier scrambling encryption."""
    try:
        return session.run_fourier(seed=req.seed)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/encrypt/dct")
async def encrypt_dct(req: SingleSeedRequest):
    """Execute Discrete Cosine Transform (DCT) encryption."""
    try:
        return session.run_dct(seed=req.seed)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/encrypt/arnold")
async def encrypt_arnold(req: ArnoldRequest):
    """Execute Arnold Cat Map + XOR encryption."""
    try:
        return session.run_arnold_xor(itr=req.itr, xor_value=req.xor_value)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/decrypt")
async def decrypt(req: DecryptRequest):
    """Execute decryption with specified key parameters."""
    try:
        return session.run_decryption(method=req.method, key_params=req.key_params)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/api/analysis")
async def get_analysis(diff_x: int = 0, diff_y: int = 0):
    """Compute and retrieve quantitative cryptanalysis and scatter data."""
    try:
        return session.run_analysis(diff_x=diff_x, diff_y=diff_y)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/api/benchmark")
async def get_benchmark():
    """Run full multi-algorithm comparative evaluation."""
    try:
        return session.run_benchmark()
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# =============================================================================
# STATIC ASSETS
# =============================================================================


@app.get("/")
async def serve_index():
    index_file = STATIC_DIR / "index.html"
    if not index_file.exists():
        return JSONResponse({"message": "BAT SIGNAL Laboratory Web UI starting up..."})
    return FileResponse(index_file)


if STATIC_DIR.exists():
    app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")


def main():
    parser = argparse.ArgumentParser(
        description="Run BAT SIGNAL Computational Imaging Laboratory Web UI"
    )
    parser.add_argument(
        "--host", default="127.0.0.1", help="Host address (default: 127.0.0.1)"
    )
    parser.add_argument(
        "--port", type=int, default=8000, help="Port number (default: 8000)"
    )
    parser.add_argument(
        "--reload", action="store_true", help="Enable auto-reload for development"
    )
    args = parser.parse_args()

    print("\n=======================================================")
    print("  BAT SIGNAL - Computational Imaging Laboratory")
    print(f"  Research Interface running at: http://{args.host}:{args.port}")
    print("=======================================================\n")
    uvicorn.run(
        "batsignal.ui.app:app", host=args.host, port=args.port, reload=args.reload
    )


if __name__ == "__main__":
    main()
