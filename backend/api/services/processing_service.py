"""
Service layer for image processing and spatial filtering operations.
Delegates to batsignal.processing and handles serialization/deserialization.
"""

from __future__ import annotations

import time

import numpy as np

from api.schemas.processing import ProcessingResponse
from api.services.utils import array_to_data_uri, decode_image_payload
from batsignal.processing import (
    apply_custom_kernel,
    apply_deconvolution,
    apply_gaussian,
    apply_median_filter,
    apply_sobel,
)


def run_convolution(
    image_payload: str | bytes,
    kernel_matrix: list[list[float]],
    normalize: bool = False,
) -> ProcessingResponse:
    t0 = time.perf_counter()
    img = decode_image_payload(image_payload)

    kernel = np.array(kernel_matrix, dtype=np.float64)
    if kernel.ndim != 2:
        raise ValueError(f"Kernel must be a 2D matrix, got shape {kernel.shape}")
    if kernel.shape[0] % 2 == 0 or kernel.shape[1] % 2 == 0:
        raise ValueError(f"Kernel dimensions must be odd, got {kernel.shape}")

    if normalize:
        k_sum = np.sum(kernel)
        if not np.isclose(k_sum, 0.0):
            kernel = kernel / k_sum

    filtered = apply_custom_kernel(img, kernel)
    latency_ms = (time.perf_counter() - t0) * 1000.0

    return ProcessingResponse(
        filter="Custom Convolution",
        output_image=array_to_data_uri(filtered),
        metadata={
            "kernel_shape": f"{kernel.shape[0]}×{kernel.shape[1]}",
            "normalized": normalize,
            "dimensions": f"{img.shape[1]}×{img.shape[0]}",
        },
        latency_ms=round(latency_ms, 2),
    )


def run_gaussian(
    image_payload: str | bytes, kernel_size: int = 5, sigma: float = 1.5
) -> ProcessingResponse:
    t0 = time.perf_counter()
    img = decode_image_payload(image_payload)

    if kernel_size % 2 == 0 or kernel_size < 1:
        raise ValueError(
            f"Kernel size must be an odd positive integer, got {kernel_size}"
        )

    filtered = apply_gaussian(img, kernel_size=kernel_size, sigma=sigma)
    latency_ms = (time.perf_counter() - t0) * 1000.0

    return ProcessingResponse(
        filter="Gaussian Blur",
        output_image=array_to_data_uri(filtered),
        metadata={
            "kernel_size": kernel_size,
            "sigma": sigma,
            "dimensions": f"{img.shape[1]}×{img.shape[0]}",
        },
        latency_ms=round(latency_ms, 2),
    )


def run_median(image_payload: str | bytes, kernel_size: int = 3) -> ProcessingResponse:
    t0 = time.perf_counter()
    img = decode_image_payload(image_payload)

    if kernel_size % 2 == 0 or kernel_size < 1:
        raise ValueError(
            f"Kernel size must be an odd positive integer, got {kernel_size}"
        )

    filtered = apply_median_filter(img, kernel_size=kernel_size)
    latency_ms = (time.perf_counter() - t0) * 1000.0

    return ProcessingResponse(
        filter="Median Filter",
        output_image=array_to_data_uri(filtered),
        metadata={
            "kernel_size": kernel_size,
            "dimensions": f"{img.shape[1]}×{img.shape[0]}",
        },
        latency_ms=round(latency_ms, 2),
    )


def run_sobel(image_payload: str | bytes) -> ProcessingResponse:
    t0 = time.perf_counter()
    img = decode_image_payload(image_payload)

    filtered = apply_sobel(img)
    latency_ms = (time.perf_counter() - t0) * 1000.0

    return ProcessingResponse(
        filter="Sobel Gradient Magnitude",
        output_image=array_to_data_uri(filtered),
        metadata={"dimensions": f"{img.shape[1]}×{img.shape[0]}"},
        latency_ms=round(latency_ms, 2),
    )


def run_deconvolution(
    image_payload: str | bytes,
    mode: str = "GAUSSIAN",
    kernel_size: int = 5,
    sigma: float = 1.0,
    K: float = 0.01,
    custom_kernel_matrix: list[list[float]] | None = None,
) -> ProcessingResponse:
    t0 = time.perf_counter()
    img = decode_image_payload(image_payload)

    custom_k = (
        np.array(custom_kernel_matrix, dtype=np.float64)
        if custom_kernel_matrix is not None
        else None
    )

    restored = apply_deconvolution(
        img,
        mode=mode.upper(),
        kernel_size=kernel_size,
        sigma=sigma,
        K=K,
        kernel=custom_k,
    )
    latency_ms = (time.perf_counter() - t0) * 1000.0

    return ProcessingResponse(
        filter=f"Wiener Deconvolution ({mode.upper()})",
        output_image=array_to_data_uri(restored),
        metadata={
            "mode": mode.upper(),
            "kernel_size": kernel_size,
            "sigma": sigma,
            "K": K,
            "dimensions": f"{img.shape[1]}×{img.shape[0]}",
        },
        latency_ms=round(latency_ms, 2),
    )
