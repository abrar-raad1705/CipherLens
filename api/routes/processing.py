"""
Image processing and filtering route handlers.
Thin routing layer that validates requests and dispatches to processing_service.
"""

from __future__ import annotations

from pathlib import Path

import cv2
from fastapi import APIRouter, HTTPException

from api.schemas.processing import (
    ConvolutionRequest,
    DeconvolutionRequest,
    GaussianRequest,
    MedianRequest,
    ProcessingResponse,
    SobelRequest,
)
from api.services import processing_service
from api.services.utils import array_to_data_uri, create_synthetic_target

router = APIRouter(prefix="/processing", tags=["Processing"])


@router.get("/samples")
async def list_sample_images():
    """List and supply standard benchmark preset images."""
    samples = []

    # 1. Cat512 natural benchmark
    cat_path = (
        Path(__file__).resolve().parent.parent.parent
        / "src"
        / "batsignal"
        / "pipeline"
        / "cat512.png"
    )
    if cat_path.exists():
        cat_img = cv2.imread(str(cat_path), cv2.IMREAD_GRAYSCALE)
        if cat_img is not None:
            samples.append(
                {
                    "id": "cat512",
                    "name": "Cat Benchmark (512×512)",
                    "description": "Standard natural grayscale benchmark with complex frequency distribution.",
                    "image": array_to_data_uri(cat_img),
                    "width": 512,
                    "height": 512,
                }
            )

    # 2. Mandrill natural texture benchmark
    baboon_path = (
        Path(__file__).resolve().parent.parent.parent
        / "src"
        / "batsignal"
        / "pipeline"
        / "baboon512.png"
    )
    if baboon_path.exists():
        baboon_img = cv2.imread(str(baboon_path), cv2.IMREAD_GRAYSCALE)
        if baboon_img is not None:
            samples.append(
                {
                    "id": "baboon512",
                    "name": "Mandrill Benchmark (512×512)",
                    "description": "Standard high-frequency natural texture benchmark from USC-SIPI database.",
                    "image": array_to_data_uri(baboon_img),
                    "width": 512,
                    "height": 512,
                }
            )

    # 3. Siemens Star Target
    siemens = create_synthetic_target("siemens_star", 512)
    samples.append(
        {
            "id": "siemens_star",
            "name": "Siemens Star Target",
            "description": "Standard radial MTF spoke resolution pattern for optical transfer function testing.",
            "image": array_to_data_uri(siemens),
            "width": 512,
            "height": 512,
        }
    )

    # 4. Concentric Fresnel Zone Plate
    freq_grid = create_synthetic_target("frequency_grid", 512)
    samples.append(
        {
            "id": "frequency_grid",
            "name": "Concentric Fresnel Zone Plate",
            "description": "High-fidelity radial chirp pattern with smooth quadratic phase fringes.",
            "image": array_to_data_uri(freq_grid),
            "width": 512,
            "height": 512,
        }
    )

    # 5. USAF Optical Resolution Target
    usaf = create_synthetic_target("usaf_target", 512)
    samples.append(
        {
            "id": "usaf_target",
            "name": "USAF Optical Resolution Target",
            "description": "Precision spatial frequency bar groups and optical alignment target.",
            "image": array_to_data_uri(usaf),
            "width": 512,
            "height": 512,
        }
    )

    # 6. High-Contrast Checkerboard
    checker = create_synthetic_target("checkerboard", 512)
    samples.append(
        {
            "id": "checkerboard",
            "name": "High-Contrast Checkerboard",
            "description": "32×32 binary tiles ideal for spatial filter boundary and edge analysis.",
            "image": array_to_data_uri(checker),
            "width": 512,
            "height": 512,
        }
    )

    # 7. Optical Resolution Grating
    bars = create_synthetic_target("resolution_bars", 512)
    samples.append(
        {
            "id": "resolution_bars",
            "name": "Optical Resolution Grating",
            "description": "Multi-frequency Ronchi grating target for spatial frequency response tests.",
            "image": array_to_data_uri(bars),
            "width": 512,
            "height": 512,
        }
    )

    return {"samples": samples}


@router.post("/convolution", response_model=ProcessingResponse)
async def post_convolution(req: ConvolutionRequest):
    try:
        return processing_service.run_convolution(
            req.image, req.kernel, normalize=req.normalize
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Convolution failed: {str(e)}")


@router.post("/gaussian", response_model=ProcessingResponse)
async def post_gaussian(req: GaussianRequest):
    try:
        return processing_service.run_gaussian(
            req.image, kernel_size=req.kernel_size, sigma=req.sigma
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gaussian filter failed: {str(e)}")


@router.post("/median", response_model=ProcessingResponse)
async def post_median(req: MedianRequest):
    try:
        return processing_service.run_median(req.image, kernel_size=req.kernel_size)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Median filter failed: {str(e)}")


@router.post("/sobel", response_model=ProcessingResponse)
async def post_sobel(req: SobelRequest):
    try:
        return processing_service.run_sobel(req.image)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Sobel filter failed: {str(e)}")


@router.post("/deconvolution", response_model=ProcessingResponse)
async def post_deconvolution(req: DeconvolutionRequest):
    try:
        return processing_service.run_deconvolution(
            req.image,
            mode=req.mode,
            kernel_size=req.kernel_size,
            sigma=req.sigma,
            K=req.K,
            custom_kernel_matrix=req.kernel,
        )
    except (ValueError, NotImplementedError) as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Deconvolution failed: {str(e)}")
