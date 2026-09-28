"""
Pydantic schemas for processing bench endpoints.
"""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class ImagePayload(BaseModel):
    image: str = Field(..., description="Base64 encoded image or data URI")


class ConvolutionRequest(BaseModel):
    image: str = Field(..., description="Base64 encoded image or data URI")
    kernel: list[list[float]] = Field(
        ..., description="2D custom convolution kernel matrix"
    )
    normalize: bool = Field(False, description="Whether to normalize kernel sum to 1.0")


class GaussianRequest(BaseModel):
    image: str = Field(..., description="Base64 encoded image or data URI")
    kernel_size: int = Field(5, description="Odd positive kernel window dimension")
    sigma: float = Field(1.5, description="Gaussian standard deviation (sigma)")


class MedianRequest(BaseModel):
    image: str = Field(..., description="Base64 encoded image or data URI")
    kernel_size: int = Field(3, description="Odd positive window size (e.g. 3, 5, 7)")


class SobelRequest(BaseModel):
    image: str = Field(..., description="Base64 encoded image or data URI")


class DeconvolutionRequest(BaseModel):
    image: str = Field(
        ..., description="Base64 encoded image or data URI (blurred or recovered)"
    )
    mode: str = Field(
        "GAUSSIAN", description="Reversal kernel model: GAUSSIAN or CUSTOM"
    )
    kernel_size: int = Field(5, description="Original blur kernel size")
    sigma: float = Field(1.0, description="Original blur standard deviation")
    K: float = Field(
        0.01,
        description="Wiener regularization constant (signal-to-noise ratio inverse)",
    )
    kernel: list[list[float]] | None = Field(
        None, description="Custom 2D kernel matrix if mode is CUSTOM"
    )


class ProcessingResponse(BaseModel):
    status: str = "COMPLETE"
    filter: str
    output_image: str = Field(..., description="Base64 PNG data URI of processed image")
    metadata: dict[str, Any] = Field(default_factory=dict)
    latency_ms: float
