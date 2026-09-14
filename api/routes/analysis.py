"""
Quantitative cryptanalysis and image evaluation route handlers.
Thin routing layer that validates requests and dispatches to analysis_service.
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from api.schemas.analysis import (
    CorrelationRequest,
    CorrelationResponse,
    EntropyRequest,
    EntropyResponse,
    FullAnalysisRequest,
    FullAnalysisResponse,
    HistogramRequest,
    HistogramResponse,
    MetricsRequest,
    MetricsResponse,
)
from api.services import analysis_service

router = APIRouter(prefix="/analysis", tags=["Analysis"])


@router.post("/entropy", response_model=EntropyResponse)
async def post_entropy(req: EntropyRequest):
    try:
        return analysis_service.run_entropy(req.image)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Entropy calculation failed: {str(e)}"
        )


@router.post("/correlation", response_model=CorrelationResponse)
async def post_correlation(req: CorrelationRequest):
    try:
        return analysis_service.run_correlation(req.image, num_samples=req.num_samples)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Correlation calculation failed: {str(e)}"
        )


@router.post("/metrics", response_model=MetricsResponse)
async def post_metrics(req: MetricsRequest):
    try:
        return analysis_service.run_metrics(
            req.original_image, req.target_image, differential=req.differential
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Metrics calculation failed: {str(e)}"
        )


@router.post("/histogram", response_model=HistogramResponse)
async def post_histogram(req: HistogramRequest):
    try:
        return analysis_service.run_histogram(req.image)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Histogram calculation failed: {str(e)}"
        )


@router.post("/full", response_model=FullAnalysisResponse)
async def post_full_analysis(req: FullAnalysisRequest):
    try:
        return analysis_service.run_full_analysis(
            plain_payload=req.plain_image,
            cipher_payload=req.cipher_image,
            recovered_payload=req.recovered_image,
            diff_x=req.diff_x,
            diff_y=req.diff_y,
            algorithm=req.algorithm,
            key_params=req.key_params,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Full analysis failed: {str(e)}")
