"""
Pydantic schemas for encryption and optical transformation endpoints.
"""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class DRPEEncryptRequest(BaseModel):
    image: str = Field(..., description="Base64 encoded plaintext image or data URI")
    seed1: int = Field(
        1234, description="Primary random phase seed for spatial plane R1"
    )
    seed2: int = Field(
        5678, description="Secondary random phase seed for Fourier plane R2"
    )


class DRPEEncryptResponse(BaseModel):
    status: str = "COMPLETE"
    algorithm: str = "DRPE"
    ciphertext: str = Field(
        ..., description="Base64 PNG data URI of complex ciphertext magnitude"
    )
    stages: dict[str, str] = Field(
        ...,
        description="Base64 data URIs for all 4f stages: original, r1_phase, fourier_spectrum, r2_phase, ciphertext",
    )
    metadata: dict[str, Any] = Field(default_factory=dict)
    latency_ms: float


class DRPEDecryptRequest(BaseModel):
    ciphertext: str = Field(
        ...,
        description="Base64 encoded ciphertext magnitude or original complex session reference",
    )
    seed1: int = Field(1234, description="Spatial phase mask seed")
    seed2: int = Field(5678, description="Fourier phase mask seed")
    reference_image: str | None = Field(
        None,
        description="Optional original plaintext for difference heatmap and PSNR/SSIM evaluation",
    )


class DRPEDecryptResponse(BaseModel):
    status: str = "COMPLETE"
    algorithm: str = "DRPE"
    decrypted_image: str = Field(
        ..., description="Base64 PNG data URI of recovered image"
    )
    diff_heatmap: str | None = Field(
        None, description="Base64 PNG data URI of error heatmap vs reference"
    )
    quality: dict[str, Any] = Field(default_factory=dict)
    metadata: dict[str, Any] = Field(default_factory=dict)
    latency_ms: float


class FourierRequest(BaseModel):
    image: str = Field(..., description="Base64 encoded image or data URI")
    seed: int = Field(100, description="Random permutation seed")
    action: str = Field("encrypt", description="encrypt or decrypt")


class FourierResponse(BaseModel):
    status: str = "COMPLETE"
    algorithm: str = "Fourier"
    action: str
    output_image: str = Field(..., description="Base64 PNG data URI of resulting image")
    spectrum: str | None = Field(
        None, description="Base64 Fourier log magnitude spectrum"
    )
    metadata: dict[str, Any] = Field(default_factory=dict)
    latency_ms: float


class DCTRequest(BaseModel):
    image: str = Field(..., description="Base64 encoded image or data URI")
    seed: int = Field(42, description="DCT coefficient scrambling seed")
    action: str = Field("encrypt", description="encrypt or decrypt")


class DCTResponse(BaseModel):
    status: str = "COMPLETE"
    algorithm: str = "DCT"
    action: str
    output_image: str = Field(..., description="Base64 PNG data URI of resulting image")
    metadata: dict[str, Any] = Field(default_factory=dict)
    latency_ms: float


class ArnoldXORRequest(BaseModel):
    image: str = Field(..., description="Base64 encoded image or data URI")
    itr: int = Field(10, description="Number of Arnold Cat Map iterations")
    xor_value: int = Field(
        170, description="Bitwise XOR mask value [0..255] (default 0xAA = 170)"
    )
    action: str = Field("encrypt", description="encrypt or decrypt")


class ArnoldXORResponse(BaseModel):
    status: str = "COMPLETE"
    algorithm: str = "Arnold-XOR"
    action: str
    output_image: str = Field(..., description="Base64 PNG data URI of resulting image")
    metadata: dict[str, Any] = Field(default_factory=dict)
    latency_ms: float
