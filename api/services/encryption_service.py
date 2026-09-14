"""
Service layer for cryptographic and optical transformation operations.
Delegates to batsignal.encryption and computes visual representations of optical stages.
"""

from __future__ import annotations

import time

import cv2
import numpy as np

from api.schemas.encryption import (
    ArnoldXORResponse,
    DCTResponse,
    DRPEDecryptResponse,
    DRPEEncryptResponse,
    FourierResponse,
)
from api.services.utils import (
    array_to_data_uri,
    decode_image_payload,
    diff_heatmap_to_data_uri,
    log_spectrum_to_data_uri,
    phase_to_data_uri,
)
from batsignal.analysis import calculate_mse, calculate_psnr, calculate_ssim
from batsignal.encryption import arnold_xor, dct, drpe, fourier


def run_drpe_encrypt(
    image_payload: str | bytes, seed1: int = 1234, seed2: int = 5678
) -> DRPEEncryptResponse:
    t0 = time.perf_counter()
    img = decode_image_payload(image_payload)

    key = drpe.DRPEKey(seed1=seed1, seed2=seed2)
    drpe.validate_key(key)

    # 1. Spatial phase mask R1
    r1 = drpe.generate_phase_mask(img.shape, key.seed1)
    r1_phase = np.angle(r1)

    # 2. Spatial modulation & Fourier transform
    spatial_modulated = img * r1
    fourier_plane = np.fft.fft2(spatial_modulated, norm="ortho")

    # 3. Fourier phase mask R2
    r2 = drpe.generate_phase_mask(img.shape, key.seed2)
    r2_phase = np.angle(r2)

    # 4. Frequency modulation & Inverse Fourier transform
    filtered = fourier_plane * r2
    ciphertext = np.fft.ifft2(filtered, norm="ortho")

    # Visual ciphertext magnitude
    c_vis = cv2.normalize(np.abs(ciphertext), None, 0, 255, cv2.NORM_MINMAX).astype(
        np.uint8
    )

    latency_ms = (time.perf_counter() - t0) * 1000.0

    stages = {
        "original": array_to_data_uri(img),
        "r1_phase": phase_to_data_uri(r1_phase),
        "fourier_spectrum": log_spectrum_to_data_uri(fourier_plane),
        "r2_phase": phase_to_data_uri(r2_phase),
        "ciphertext": array_to_data_uri(c_vis),
    }

    metadata = {
        "seed1": seed1,
        "seed2": seed2,
        "shape": f"{img.shape[1]}×{img.shape[0]}",
        "complex_stats": {
            "real_min": round(float(np.real(ciphertext).min()), 4),
            "real_max": round(float(np.real(ciphertext).max()), 4),
            "imag_min": round(float(np.imag(ciphertext).min()), 4),
            "imag_max": round(float(np.imag(ciphertext).max()), 4),
        },
    }

    return DRPEEncryptResponse(
        ciphertext=stages["ciphertext"],
        stages=stages,
        metadata=metadata,
        latency_ms=round(latency_ms, 2),
    )


def run_drpe_decrypt(
    ciphertext_payload: str | bytes,
    seed1: int = 1234,
    seed2: int = 5678,
    reference_payload: str | bytes | None = None,
) -> DRPEDecryptResponse:
    t0 = time.perf_counter()
    cipher_img = decode_image_payload(ciphertext_payload)

    # Re-generate phase masks for decryption
    key = drpe.DRPEKey(seed1=seed1, seed2=seed2)
    drpe.validate_key(key)

    # DRPE Decryption: F^-1 [ F(C) * R2^* ] * R1^*
    recovered = drpe.decrypt(cipher_img, key)
    rec_uint8 = np.clip(np.real(recovered), 0, 255).astype(np.uint8)

    latency_ms = (time.perf_counter() - t0) * 1000.0

    quality = {}
    diff_heatmap_uri = None

    if reference_payload:
        try:
            ref_img = decode_image_payload(reference_payload)
            if ref_img.shape == rec_uint8.shape:
                mse_val = calculate_mse(ref_img, rec_uint8)
                psnr_val = calculate_psnr(ref_img, rec_uint8)
                ssim_val = calculate_ssim(ref_img, rec_uint8)
                diff = np.abs(ref_img.astype(np.float64) - rec_uint8.astype(np.float64))
                diff_heatmap_uri = diff_heatmap_to_data_uri(diff)
                quality = {
                    "mse": round(mse_val, 4),
                    "psnr": round(psnr_val, 2) if not np.isinf(psnr_val) else "inf",
                    "ssim": round(ssim_val, 4),
                }
        except Exception:
            pass

    return DRPEDecryptResponse(
        decrypted_image=array_to_data_uri(rec_uint8),
        diff_heatmap=diff_heatmap_uri,
        quality=quality,
        metadata={
            "seed1": seed1,
            "seed2": seed2,
            "shape": f"{rec_uint8.shape[1]}×{rec_uint8.shape[0]}",
        },
        latency_ms=round(latency_ms, 2),
    )


def run_fourier(
    image_payload: str | bytes, seed: int = 100, action: str = "encrypt"
) -> FourierResponse:
    t0 = time.perf_counter()
    img = decode_image_payload(image_payload)
    key = fourier.FourierKey(seed=seed)

    if action.lower() == "encrypt":
        result = fourier.encrypt(img, key)
        output_vis = cv2.normalize(
            np.real(result), None, 0, 255, cv2.NORM_MINMAX
        ).astype(np.uint8)
        f_coeffs = np.fft.fft2(result, norm="ortho")
        spec_uri = log_spectrum_to_data_uri(f_coeffs)
    else:
        result = fourier.decrypt(img, key)
        output_vis = np.clip(np.real(result), 0, 255).astype(np.uint8)
        spec_uri = None

    latency_ms = (time.perf_counter() - t0) * 1000.0

    return FourierResponse(
        action=action.lower(),
        output_image=array_to_data_uri(output_vis),
        spectrum=spec_uri,
        metadata={"seed": seed, "shape": f"{img.shape[1]}×{img.shape[0]}"},
        latency_ms=round(latency_ms, 2),
    )


def run_dct(
    image_payload: str | bytes, seed: int = 42, action: str = "encrypt"
) -> DCTResponse:
    t0 = time.perf_counter()
    img = decode_image_payload(image_payload)
    key = dct.DCT_Key(seed=seed)

    if action.lower() == "encrypt":
        result = dct.encrypt(img, key)
        output_vis = cv2.normalize(
            np.real(result), None, 0, 255, cv2.NORM_MINMAX
        ).astype(np.uint8)
    else:
        result = dct.decrypt(img, key)
        output_vis = np.clip(np.real(result), 0, 255).astype(np.uint8)

    latency_ms = (time.perf_counter() - t0) * 1000.0

    return DCTResponse(
        action=action.lower(),
        output_image=array_to_data_uri(output_vis),
        metadata={"seed": seed, "shape": f"{img.shape[1]}×{img.shape[0]}"},
        latency_ms=round(latency_ms, 2),
    )


def run_arnold_xor(
    image_payload: str | bytes,
    itr: int = 10,
    xor_value: int = 170,
    action: str = "encrypt",
) -> ArnoldXORResponse:
    t0 = time.perf_counter()
    img = decode_image_payload(image_payload)

    # Center-crop if non-square
    h, w = img.shape
    cropped = False
    if h != w:
        min_dim = min(h, w)
        sy = (h - min_dim) // 2
        sx = (w - min_dim) // 2
        img = img[sy : sy + min_dim, sx : sx + min_dim]
        cropped = True

    key = arnold_xor.ArnoldXORKey(itr=itr, xor_value=xor_value)

    if action.lower() == "encrypt":
        result = arnold_xor.encrypt(img, key)
    else:
        result = arnold_xor.decrypt(img, key)

    output_vis = np.clip(result, 0, 255).astype(np.uint8)
    latency_ms = (time.perf_counter() - t0) * 1000.0

    return ArnoldXORResponse(
        action=action.lower(),
        output_image=array_to_data_uri(output_vis),
        metadata={
            "itr": itr,
            "xor_value": xor_value,
            "shape": f"{output_vis.shape[1]}×{output_vis.shape[0]}",
            "square_cropped": cropped,
        },
        latency_ms=round(latency_ms, 2),
    )
