"""
Service layer for quantitative cryptanalysis and image evaluation.
Delegates to batsignal.analysis and formats metrics for visualization.
"""

from __future__ import annotations

import time
from typing import Any

import cv2
import numpy as np

from api.schemas.analysis import (
    CorrelationResponse,
    EntropyResponse,
    FullAnalysisResponse,
    HistogramResponse,
    MetricsResponse,
)
from api.services.utils import (
    compute_histogram,
    decode_image_payload,
    sample_correlation_points,
)
from batsignal.analysis import (
    calculate_correlation,
    calculate_entropy,
    calculate_mse,
    calculate_npcr,
    calculate_psnr,
    calculate_ssim,
    calculate_uaci,
)
from batsignal.encryption import arnold_xor, dct, drpe, fourier


def run_entropy(image_payload: str | bytes) -> EntropyResponse:
    t0 = time.perf_counter()
    img = decode_image_payload(image_payload)
    val = calculate_entropy(img)
    latency_ms = (time.perf_counter() - t0) * 1000.0

    return EntropyResponse(
        entropy=round(float(val), 4),
        theoretical_max=8.0,
        latency_ms=round(latency_ms, 2),
    )


def run_correlation(
    image_payload: str | bytes, num_samples: int = 1500
) -> CorrelationResponse:
    t0 = time.perf_counter()
    img = decode_image_payload(image_payload)
    coeffs = calculate_correlation(img)
    scatter = sample_correlation_points(img, num_samples=num_samples)
    latency_ms = (time.perf_counter() - t0) * 1000.0

    return CorrelationResponse(
        coefficients={k: round(float(v), 4) for k, v in coeffs.items()},
        scatter_samples=scatter,
        latency_ms=round(latency_ms, 2),
    )


def run_metrics(
    original_payload: str | bytes,
    target_payload: str | bytes,
    differential: bool = False,
) -> MetricsResponse:
    t0 = time.perf_counter()
    orig = decode_image_payload(original_payload)
    target = decode_image_payload(target_payload)

    if orig.shape != target.shape:
        target = cv2.resize(
            target, (orig.shape[1], orig.shape[0]), interpolation=cv2.INTER_AREA
        )

    mse_val = float(calculate_mse(orig, target))
    psnr_val = calculate_psnr(orig, target)
    psnr_repr: float | str = "inf" if np.isinf(psnr_val) else round(float(psnr_val), 2)
    ssim_val = float(calculate_ssim(orig, target))

    npcr_val = None
    uaci_val = None
    if differential:
        npcr_val = round(float(calculate_npcr(orig, target)), 2)
        uaci_val = round(float(calculate_uaci(orig, target)), 2)

    latency_ms = (time.perf_counter() - t0) * 1000.0

    return MetricsResponse(
        mse=round(mse_val, 4),
        psnr=psnr_repr,
        ssim=round(ssim_val, 4),
        npcr=npcr_val,
        uaci=uaci_val,
        latency_ms=round(latency_ms, 2),
    )


def run_histogram(image_payload: str | bytes) -> HistogramResponse:
    t0 = time.perf_counter()
    img = decode_image_payload(image_payload)
    bins = compute_histogram(img)
    mean_val = float(np.mean(img))
    std_val = float(np.std(img))
    latency_ms = (time.perf_counter() - t0) * 1000.0

    return HistogramResponse(
        bins=bins,
        mean=round(mean_val, 2),
        std=round(std_val, 2),
        latency_ms=round(latency_ms, 2),
    )


def run_full_analysis(
    plain_payload: str | bytes,
    cipher_payload: str | bytes | None = None,
    recovered_payload: str | bytes | None = None,
    diff_x: int = 0,
    diff_y: int = 0,
    algorithm: str = "DRPE",
    key_params: dict[str, Any] | None = None,
) -> FullAnalysisResponse:
    t0 = time.perf_counter()
    plain = decode_image_payload(plain_payload)
    cipher = decode_image_payload(cipher_payload) if cipher_payload else None
    recovered = decode_image_payload(recovered_payload) if recovered_payload else None
    key_params = key_params or {}

    # 1. Entropy
    ent_plain = calculate_entropy(plain)
    ent_dict = {"plain": round(float(ent_plain), 4)}

    # 2. Correlation
    corr_plain = calculate_correlation(plain)
    corr_dict = {"plain": {k: round(float(v), 4) for k, v in corr_plain.items()}}

    # 3. Scatter Samples
    scatter_plain = sample_correlation_points(plain, num_samples=1500)
    scatter_dict = {"plain": scatter_plain}

    # 4. Histograms
    hist_plain = compute_histogram(plain)
    hists = {"plain": hist_plain}

    # Cipher metrics if cipher provided
    if cipher is not None:
        ent_cipher = calculate_entropy(cipher)
        ent_dict["cipher"] = round(float(ent_cipher), 4)

        corr_cipher = calculate_correlation(cipher)
        corr_dict["cipher"] = {k: round(float(v), 4) for k, v in corr_cipher.items()}

        scatter_cipher = sample_correlation_points(cipher, num_samples=1500)
        scatter_dict["cipher"] = scatter_cipher

        hist_cipher = compute_histogram(cipher)
        hists["cipher"] = hist_cipher

    # Recovered metrics if recovered provided
    if recovered is not None:
        ent_rec = calculate_entropy(recovered)
        ent_dict["recovered"] = round(float(ent_rec), 4)

        corr_rec = calculate_correlation(recovered)
        corr_dict["recovered"] = {k: round(float(v), 4) for k, v in corr_rec.items()}

        hist_rec = compute_histogram(recovered)
        hists["recovered"] = hist_rec

    # 5. Quality (plain vs recovered preferred, else plain vs cipher)
    eval_target = recovered if recovered is not None else cipher
    if eval_target is not None:
        if plain.shape != eval_target.shape:
            eval_target_aligned = cv2.resize(
                eval_target, (plain.shape[1], plain.shape[0]), interpolation=cv2.INTER_AREA
            )
        else:
            eval_target_aligned = eval_target

        mse_val = round(float(calculate_mse(plain, eval_target_aligned)), 4)
        p_val = calculate_psnr(plain, eval_target_aligned)
        psnr_val = "inf" if np.isinf(p_val) else round(float(p_val), 2)
        ssim_val = round(float(calculate_ssim(plain, eval_target_aligned)), 4)
    else:
        mse_val = 0.0
        psnr_val = 0.0
        ssim_val = 1.0

    quality = {"mse": mse_val, "psnr": psnr_val, "ssim": ssim_val}

    # 6. Differential Attack Simulation (NPCR / UACI) - requires cipher
    if cipher is not None:
        h, w = plain.shape
        cy = max(0, min(h - 1, diff_y))
        cx = max(0, min(w - 1, diff_x))

        alt_plain = plain.copy()
        alt_plain[cy, cx] = (int(alt_plain[cy, cx]) + 1) % 256

        algo = algorithm.upper()
        if algo == "DRPE":
            s1 = int(key_params.get("seed1", 1234))
            s2 = int(key_params.get("seed2", 5678))
            alt_cipher = drpe.encrypt(alt_plain, drpe.DRPEKey(s1, s2))
        elif algo == "FOURIER":
            s = int(key_params.get("seed", 100))
            alt_cipher = fourier.encrypt(alt_plain, fourier.FourierKey(s))
        elif algo == "DCT":
            s = int(key_params.get("seed", 42))
            alt_cipher = dct.encrypt(alt_plain, dct.DCT_Key(s))
        elif algo in ("ARNOLD_XOR", "ARNOLD-XOR"):
            itr = int(key_params.get("itr", 10))
            xor_v = int(key_params.get("xor_value", 170))
            alt_cipher = arnold_xor.encrypt(alt_plain, arnold_xor.ArnoldXORKey(itr, xor_v))
        else:
            alt_cipher = cipher

        npcr_val = round(float(calculate_npcr(cipher, alt_cipher)), 2)
        uaci_val = round(float(calculate_uaci(cipher, alt_cipher)), 2)

        differential = {
            "perturbed_pixel": f"({cx}, {cy})",
            "npcr": npcr_val,
            "uaci": uaci_val,
            "npcr_expected": 99.6,
            "uaci_expected": 33.4,
        }
    else:
        differential = {
            "perturbed_pixel": "N/A",
            "npcr": 0.0,
            "uaci": 0.0,
            "npcr_expected": 99.6,
            "uaci_expected": 33.4,
        }

    latency_ms = (time.perf_counter() - t0) * 1000.0

    return FullAnalysisResponse(
        entropy=ent_dict,
        correlation=corr_dict,
        scatter=scatter_dict,
        histograms=hists,
        quality=quality,
        differential=differential,
        latency_ms=round(latency_ms, 2),
    )
