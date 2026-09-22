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
    dct_spectrum_to_data_uri,
    decode_image_payload,
    diff_heatmap_to_data_uri,
    extract_embedded_array,
    log_spectrum_to_data_uri,
    phase_to_data_uri,
)
from batsignal.analysis import calculate_mse, calculate_psnr, calculate_ssim
from batsignal.encryption import arnold_xor, dct, drpe, fourier


import collections
import hashlib

# Ciphertext Array Cache for DRPE, Fourier, and DCT (maps visual URI hash & pixel hash -> exact raw array)
_CIPHER_CACHE_MAX = 64
_cipher_array_cache: collections.OrderedDict[str, np.ndarray] = collections.OrderedDict()
_cipher_pixel_cache: collections.OrderedDict[str, np.ndarray] = collections.OrderedDict()


def _cache_cipher_array(c_vis_uri: str, raw_array: np.ndarray, c_vis_pixels: np.ndarray | None = None) -> None:
    uri_hash = hashlib.sha256(c_vis_uri.encode("utf-8")).hexdigest()
    _cipher_array_cache[uri_hash] = raw_array
    _cipher_array_cache.move_to_end(uri_hash)
    if len(_cipher_array_cache) > _CIPHER_CACHE_MAX:
        _cipher_array_cache.popitem(last=False)

    if c_vis_pixels is not None:
        pix_hash = hashlib.sha256(c_vis_pixels.tobytes()).hexdigest()
        _cipher_pixel_cache[pix_hash] = raw_array
        _cipher_pixel_cache.move_to_end(pix_hash)
        if len(_cipher_pixel_cache) > _CIPHER_CACHE_MAX:
            _cipher_pixel_cache.popitem(last=False)


def _get_cached_cipher_array(payload: str | bytes, decoded_pixels: np.ndarray | None = None) -> np.ndarray | None:
    if isinstance(payload, bytes):
        try:
            payload = payload.decode("utf-8")
        except Exception:
            payload = ""
    if payload:
        uri_hash = hashlib.sha256(payload.strip().encode("utf-8")).hexdigest()
        if uri_hash in _cipher_array_cache:
            _cipher_array_cache.move_to_end(uri_hash)
            return _cipher_array_cache[uri_hash]

    if decoded_pixels is not None:
        pix_hash = hashlib.sha256(decoded_pixels.tobytes()).hexdigest()
        if pix_hash in _cipher_pixel_cache:
            _cipher_pixel_cache.move_to_end(pix_hash)
            return _cipher_pixel_cache[pix_hash]

    return None


# Backward compatibility aliases
_cache_wavefront = _cache_cipher_array
_get_cached_wavefront = _get_cached_cipher_array


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

    # Visual ciphertext magnitude for display in UI
    c_vis = cv2.normalize(np.abs(ciphertext), None, 0, 255, cv2.NORM_MINMAX).astype(
        np.uint8
    )

    latency_ms = (time.perf_counter() - t0) * 1000.0

    c_uri = array_to_data_uri(c_vis, embedded_array=ciphertext)
    c_vis_uri = array_to_data_uri(c_vis)

    # Cache full complex optical field associated with this visual ciphertext (both URI & pixel hash)
    _cache_wavefront(c_uri, ciphertext, c_vis)

    stages = {
        "original": array_to_data_uri(img),
        "r1_phase": phase_to_data_uri(r1_phase),
        "fourier_spectrum": log_spectrum_to_data_uri(fourier_plane),
        "r2_phase": phase_to_data_uri(r2_phase),
        "ciphertext": c_vis_uri,
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
        ciphertext=c_uri,
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

    # 1. First priority: extract embedded mathematical wavefront from PNG metadata chunk (100% stateless!)
    embedded_field = extract_embedded_array(ciphertext_payload)

    # 2. Second priority: check server memory cache by URI / pixel content
    decoded_img = None
    if embedded_field is not None:
        cipher_input = embedded_field
        is_intensity_only = False
    else:
        decoded_img = decode_image_payload(ciphertext_payload)
        cached_field = _get_cached_wavefront(ciphertext_payload, decoded_img)
        if cached_field is not None:
            cipher_input = cached_field
            is_intensity_only = False
        else:
            cipher_input = decoded_img
            is_intensity_only = True

    # Re-generate phase masks for decryption
    key = drpe.DRPEKey(seed1=seed1, seed2=seed2)
    drpe.validate_key(key)

    # DRPE Decryption: F^-1 [ F(C) * R2^* ] * R1^*
    r1 = drpe.generate_phase_mask(cipher_input.shape, key.seed1)
    r2 = drpe.generate_phase_mask(cipher_input.shape, key.seed2)

    fourier_plane = np.fft.fft2(cipher_input, norm="ortho")
    demodulated_fourier = fourier_plane * np.conj(r2)
    demodulated_spatial = np.fft.ifft2(demodulated_fourier, norm="ortho")

    recovered = np.real(demodulated_spatial * np.conj(r1))

    if is_intensity_only:
        # Intensity-only upload (no phase info): normalize the recovered wavefront to full 8-bit dynamic range
        rec_uint8 = cv2.normalize(recovered, None, 0, 255, cv2.NORM_MINMAX).astype(np.uint8)
    else:
        # Exact complex field: recovered real values directly match the original grayscale intensity
        rec_uint8 = np.clip(np.round(recovered), 0, 255).astype(np.uint8)

    latency_ms = (time.perf_counter() - t0) * 1000.0

    cipher_vis = cv2.normalize(np.abs(cipher_input), None, 0, 255, cv2.NORM_MINMAX).astype(np.uint8)
    stages = {
        "ciphertext": array_to_data_uri(cipher_vis),
        "r2_conj": phase_to_data_uri(np.angle(np.conj(r2))),
        "fourier_demod": log_spectrum_to_data_uri(demodulated_fourier),
        "r1_conj": phase_to_data_uri(np.angle(np.conj(r1))),
        "decrypted": array_to_data_uri(rec_uint8),
    }

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
        stages=stages,
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
    key = fourier.FourierKey(seed=seed)

    if action.lower() == "encrypt":
        img = decode_image_payload(image_payload)
        fourier.validate_key(key)

        # 1. Unpermuted 2D Fourier transform
        coeffs = np.fft.fft2(img, norm="ortho")
        fft_spec_uri = log_spectrum_to_data_uri(coeffs)

        # 2. Key-based permutation of frequency coefficients
        flat = coeffs.flatten()
        perm = fourier.generate_permutation(flat.size, key.seed)
        encrypted_flat = flat[perm]
        encrypted_coeffs = encrypted_flat.reshape(coeffs.shape)
        spec_uri = log_spectrum_to_data_uri(encrypted_coeffs)

        # 3. Inverse 2D Fourier transform to spatial ciphertext
        result = np.asarray(np.fft.ifft2(encrypted_coeffs, norm="ortho"))
        output_vis = cv2.normalize(
            np.real(result), None, 0, 255, cv2.NORM_MINMAX
        ).astype(np.uint8)
        out_uri = array_to_data_uri(output_vis, embedded_array=result)
        out_vis_uri = array_to_data_uri(output_vis)

        # Cache raw complex transform array
        _cache_cipher_array(out_uri, result, output_vis)
        shape_str = f"{img.shape[1]}×{img.shape[0]}"

        stages = {
            "original": array_to_data_uri(img),
            "fft_spectrum": fft_spec_uri,
            "permuted_spectrum": spec_uri,
            "ciphertext": out_vis_uri,
        }
    else:
        # Decrypt from embedded array if present (100% stateless), or cached array, or decoded payload
        embedded_cipher = extract_embedded_array(image_payload)
        if embedded_cipher is not None:
            cipher_input = embedded_cipher
            cached_cipher = embedded_cipher
        else:
            decoded_img = decode_image_payload(image_payload)
            cached_cipher = _get_cached_cipher_array(image_payload, decoded_img)
            if cached_cipher is not None:
                cipher_input = cached_cipher
            else:
                cipher_input = decoded_img

        f_cipher = np.fft.fft2(cipher_input, norm="ortho")
        flat = f_cipher.flatten()
        perm = fourier.generate_permutation(flat.size, key.seed)
        inv_perm = np.empty_like(perm)
        inv_perm[perm] = np.arange(flat.size)
        original_coeffs = flat[inv_perm].reshape(f_cipher.shape)
        result = np.asarray(np.real(np.fft.ifft2(original_coeffs, norm="ortho")))

        if cached_cipher is None:
            output_vis = cv2.normalize(result, None, 0, 255, cv2.NORM_MINMAX).astype(np.uint8)
        else:
            output_vis = np.clip(np.round(result), 0, 255).astype(np.uint8)
        spec_uri = None
        out_uri = array_to_data_uri(output_vis)
        shape_str = f"{output_vis.shape[1]}×{output_vis.shape[0]}"

        cipher_vis = cv2.normalize(np.real(cipher_input), None, 0, 255, cv2.NORM_MINMAX).astype(np.uint8)
        stages = {
            "ciphertext": array_to_data_uri(cipher_vis),
            "fft_spectrum": log_spectrum_to_data_uri(f_cipher),
            "inverse_perm": log_spectrum_to_data_uri(original_coeffs),
            "decrypted": out_uri,
        }

    latency_ms = (time.perf_counter() - t0) * 1000.0

    return FourierResponse(
        action=action.lower(),
        output_image=out_uri,
        spectrum=spec_uri,
        stages=stages,
        metadata={"seed": seed, "shape": shape_str},
        latency_ms=round(latency_ms, 2),
    )


def run_dct(
    image_payload: str | bytes, seed: int = 42, action: str = "encrypt"
) -> DCTResponse:
    t0 = time.perf_counter()
    key = dct.DCT_Key(seed=seed)

    if action.lower() == "encrypt":
        img = decode_image_payload(image_payload)
        dct.validate_key(key)

        # 1. Unpermuted 2D DCT transform
        coeffs = dct.dctn(img, norm="ortho")
        dct_basis_uri = dct_spectrum_to_data_uri(coeffs)

        # 2. Key-based permutation of DCT coefficients
        flat = coeffs.flatten()
        perm = dct.generate_permutation(flat.size, key.seed)
        encrypted_flat = flat[perm]
        encrypted_coeffs = encrypted_flat.reshape(coeffs.shape)
        scrambled_dct_uri = dct_spectrum_to_data_uri(encrypted_coeffs)

        # 3. Inverse 2D DCT to spatial ciphertext
        result = np.asarray(dct.idctn(encrypted_coeffs, norm="ortho"))
        output_vis = cv2.normalize(
            np.real(result), None, 0, 255, cv2.NORM_MINMAX
        ).astype(np.uint8)
        out_uri = array_to_data_uri(output_vis, embedded_array=result)
        out_vis_uri = array_to_data_uri(output_vis)

        # Cache raw float DCT transform array
        _cache_cipher_array(out_uri, result, output_vis)
        shape_str = f"{img.shape[1]}×{img.shape[0]}"

        stages = {
            "original": array_to_data_uri(img),
            "dct_basis": dct_basis_uri,
            "scrambled_dct": scrambled_dct_uri,
            "ciphertext": out_vis_uri,
        }
    else:
        # Decrypt from embedded array if present (100% stateless), or cached array, or decoded payload
        embedded_cipher = extract_embedded_array(image_payload)
        if embedded_cipher is not None:
            cipher_input = embedded_cipher
        else:
            decoded_img = decode_image_payload(image_payload)
            cached_cipher = _get_cached_cipher_array(image_payload, decoded_img)
            if cached_cipher is not None:
                cipher_input = cached_cipher
            else:
                cipher_input = decoded_img

        d_cipher = dct.dctn(cipher_input, norm="ortho")
        flat = d_cipher.flatten()
        perm = dct.generate_permutation(flat.size, key.seed)
        inv_perm = np.empty_like(perm)
        inv_perm[perm] = np.arange(flat.size)
        original_coeffs = flat[inv_perm].reshape(d_cipher.shape)
        result = np.asarray(dct.idctn(original_coeffs, norm="ortho"))

        output_vis = np.clip(np.round(result), 0, 255).astype(np.uint8)
        out_uri = array_to_data_uri(output_vis)
        shape_str = f"{output_vis.shape[1]}×{output_vis.shape[0]}"

        cipher_vis = cv2.normalize(np.real(cipher_input), None, 0, 255, cv2.NORM_MINMAX).astype(np.uint8)
        stages = {
            "ciphertext": array_to_data_uri(cipher_vis),
            "dct_coeffs": dct_spectrum_to_data_uri(d_cipher),
            "inverse_perm": dct_spectrum_to_data_uri(original_coeffs),
            "decrypted": out_uri,
        }

    latency_ms = (time.perf_counter() - t0) * 1000.0

    return DCTResponse(
        action=action.lower(),
        output_image=out_uri,
        stages=stages,
        metadata={"seed": seed, "shape": shape_str},
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
    arnold_xor.validate_key(key)

    if action.lower() == "encrypt":
        scrambled = arnold_xor.arnold_scramble(img, key.itr)
        result = arnold_xor.xor_transform(scrambled, key.xor_value)
        output_vis = np.clip(result, 0, 255).astype(np.uint8)
        out_uri = array_to_data_uri(output_vis)

        stages = {
            "original": array_to_data_uri(img),
            "arnold_scramble": array_to_data_uri(scrambled),
            "xor_diffusion": out_uri,
            "ciphertext": out_uri,
        }
    else:
        xored = arnold_xor.xor_transform(img, key.xor_value)
        result = arnold_xor.arnold_unscramble(xored, key.itr)
        output_vis = np.clip(result, 0, 255).astype(np.uint8)
        out_uri = array_to_data_uri(output_vis)
        stages = {
            "ciphertext": array_to_data_uri(img),
            "xor_invert": array_to_data_uri(xored),
            "inverse_arnold": out_uri,
            "decrypted": out_uri,
        }

    latency_ms = (time.perf_counter() - t0) * 1000.0

    return ArnoldXORResponse(
        action=action.lower(),
        output_image=out_uri,
        stages=stages,
        metadata={
            "itr": itr,
            "xor_value": xor_value,
            "shape": f"{output_vis.shape[1]}×{output_vis.shape[0]}",
            "square_cropped": cropped,
        },
        latency_ms=round(latency_ms, 2),
    )
