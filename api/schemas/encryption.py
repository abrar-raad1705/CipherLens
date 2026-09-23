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
    # Complex ciphertext package for cross-session decryption (included in JSON key file)
    ciphertext_real: str | None = Field(
        None, description="Base64-encoded float32 real plane of the complex ciphertext array"
    )
    ciphertext_imag: str | None = Field(
        None, description="Base64-encoded float32 imaginary plane of the complex ciphertext array"
    )
    ciphertext_shape: list[int] | None = Field(
        None, description="Shape of the ciphertext array [height, width]"
    )


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
    # Optional pre-loaded complex ciphertext package from JSON key file
    ciphertext_real: str | None = Field(
        None, description="Base64 float32 real plane (from JSON key file)"
    )
    ciphertext_imag: str | None = Field(
        None, description="Base64 float32 imaginary plane (from JSON key file)"
    )
    ciphertext_shape: list[int] | None = Field(
        None, description="Shape of the complex array [height, width]"
    )


class DRPEPreloadRequest(BaseModel):
    ciphertext_real: str = Field(..., description="Base64 float32 real plane")
    ciphertext_imag: str = Field(..., description="Base64 float32 imaginary plane")
    ciphertext_shape: list[int] = Field(..., description="[height, width]")
    # The visual PNG URI is used as the cache key (same one that was downloaded)
    visual_uri: str = Field(..., description="The ciphertext PNG data URI (used as cache key)")


class DRPEPreloadResponse(BaseModel):
    status: str = "CACHED"
    shape: list[int]
    message: str = "Complex ciphertext loaded into session cache."


class DRPEDecryptResponse(BaseModel):
    status: str = "COMPLETE"
    algorithm: str = "DRPE"
    decrypted_image: str = Field(
        ..., description="Base64 PNG data URI of recovered image"
    )
    diff_heatmap: str | None = Field(
        None, description="Base64 PNG data URI of error heatmap vs reference"
    )
    stages: dict[str, str] = Field(
        default_factory=dict,
        description="Base64 data URIs for all decryption pipeline stages",
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
    stages: dict[str, str] = Field(
        default_factory=dict,
        description="Base64 data URIs for all pipeline intermediate stages: original, fft_spectrum, permuted_spectrum, ciphertext",
    )
    metadata: dict[str, Any] = Field(default_factory=dict)
    latency_ms: float
    # Complex ciphertext package for cross-session decryption (included in JSON key file)
    ciphertext_real: str | None = Field(
        None, description="Base64-encoded float32 real plane of the complex ciphertext array"
    )
    ciphertext_imag: str | None = Field(
        None, description="Base64-encoded float32 imaginary plane of the complex ciphertext array"
    )
    ciphertext_shape: list[int] | None = Field(
        None, description="Shape of the ciphertext array [height, width]"
    )

class FourierPreloadRequest(BaseModel):
    ciphertext_real: str = Field(..., description="Base64 float32 real plane")
    ciphertext_imag: str = Field(..., description="Base64 float32 imaginary plane")
    ciphertext_shape: list[int] = Field(..., description="[height, width]")
    visual_uri: str = Field(..., description="The ciphertext PNG data URI (used as cache key)")

class FourierPreloadResponse(BaseModel):
    status: str = "CACHED"
    shape: list[int]
    message: str = "Complex ciphertext loaded into session cache."



class DCTRequest(BaseModel):
    image: str = Field(..., description="Base64 encoded image or data URI")
    seed: int = Field(42, description="DCT coefficient scrambling seed")
    action: str = Field("encrypt", description="encrypt or decrypt")


class DCTResponse(BaseModel):
    status: str = "COMPLETE"
    algorithm: str = "DCT"
    action: str
    output_image: str = Field(..., description="Base64 PNG data URI of resulting image")
    stages: dict[str, str] = Field(
        default_factory=dict,
        description="Base64 data URIs for all pipeline intermediate stages: original, dct_basis, scrambled_dct, ciphertext",
    )
    metadata: dict[str, Any] = Field(default_factory=dict)
    latency_ms: float
    # Real ciphertext package for cross-session decryption (included in JSON key file)
    ciphertext_real: str | None = Field(
        None, description="Base64-encoded float32 array of the exact DCT ciphertext"
    )
    ciphertext_shape: list[int] | None = Field(
        None, description="Shape of the ciphertext array [height, width]"
    )

class DCTPreloadRequest(BaseModel):
    ciphertext_real: str = Field(..., description="Base64 float32 real plane")
    ciphertext_shape: list[int] = Field(..., description="[height, width]")
    visual_uri: str = Field(..., description="The ciphertext PNG data URI (used as cache key)")

class DCTPreloadResponse(BaseModel):
    status: str = "CACHED"
    shape: list[int]
    message: str = "Real ciphertext loaded into session cache."



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
    stages: dict[str, str] = Field(
        default_factory=dict,
        description="Base64 data URIs for all pipeline intermediate stages: original, arnold_scramble, xor_diffusion, ciphertext",
    )
    metadata: dict[str, Any] = Field(default_factory=dict)
    latency_ms: float
