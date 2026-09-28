"""
Pydantic schemas for quantitative cryptanalysis and image metrics.
"""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class EntropyRequest(BaseModel):
    image: str = Field(..., description="Base64 encoded image or data URI")


class EntropyResponse(BaseModel):
    entropy: float = Field(..., description="Shannon entropy in bits/pixel")
    theoretical_max: float = 8.0
    latency_ms: float


class CorrelationRequest(BaseModel):
    image: str = Field(..., description="Base64 encoded image or data URI")
    num_samples: int = Field(
        1500, description="Number of adjacent pixel pairs to sample for scatter plots"
    )


class CorrelationResponse(BaseModel):
    coefficients: dict[str, float] = Field(
        ..., description="Correlation coefficients: horizontal, vertical, diagonal"
    )
    scatter_samples: dict[str, list[dict[str, float]]] = Field(
        default_factory=dict,
        description="Sampled adjacent pixel pairs for plotting H, V, D scatter graphs",
    )
    latency_ms: float


class MetricsRequest(BaseModel):
    original_image: str = Field(..., description="Reference ground-truth image")
    target_image: str = Field(..., description="Processed, decrypted or altered image")
    differential: bool = Field(
        False,
        description="Whether to compute differential attack sensitivity (NPCR/UACI)",
    )


class MetricsResponse(BaseModel):
    mse: float = Field(..., description="Mean Squared Error")
    psnr: float | str = Field(
        ..., description="Peak Signal-to-Noise Ratio (dB) or 'inf'"
    )
    ssim: float = Field(..., description="Structural Similarity Index")
    npcr: float | None = Field(None, description="Number of Pixels Change Rate (%)")
    uaci: float | None = Field(
        None, description="Unified Average Changing Intensity (%)"
    )
    latency_ms: float


class HistogramRequest(BaseModel):
    image: str = Field(..., description="Base64 encoded image or data URI")


class HistogramResponse(BaseModel):
    bins: list[int] = Field(..., description="256-bin intensity counts from 0 to 255")
    mean: float
    std: float
    latency_ms: float


class FullAnalysisRequest(BaseModel):
    plain_image: str = Field(..., description="Base64 original or processed image")
    cipher_image: str | None = Field(None, description="Optional base64 encrypted ciphertext")
    recovered_image: str | None = Field(None, description="Optional decrypted image")
    diff_x: int = Field(0, description="Perturbation pixel x coordinate")
    diff_y: int = Field(0, description="Perturbation pixel y coordinate")
    algorithm: str = Field(
        "DRPE", description="Encryption algorithm used for differential test"
    )
    key_params: dict[str, Any] = Field(default_factory=dict)


class FullAnalysisResponse(BaseModel):
    entropy: dict[str, float]
    correlation: dict[str, dict[str, float]]
    scatter: dict[str, dict[str, list[dict[str, float]]]]
    histograms: dict[str, list[int]]
    quality: dict[str, Any]
    differential: dict[str, Any]
    latency_ms: float
