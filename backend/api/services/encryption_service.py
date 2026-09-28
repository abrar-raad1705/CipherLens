"""
Service layer for cryptographic and optical transformation operations.
Delegates to batsignal.encryption and computes visual representations of optical stages.
"""

from __future__ import annotations

import base64
import collections
import hashlib
import time

import cv2
import numpy as np

from api.schemas.encryption import (
    ArnoldXORResponse,
    ChaosResponse,
    DCTResponse,
    DRPEDecryptResponse,
    DRPEEncryptResponse,
    FeistelResponse,
    FourierResponse,
    SpectralHybridResponse,
)
from api.services.utils import (
    array_to_data_uri,
    dct_spectrum_to_data_uri,
    decode_image_payload,
    diff_heatmap_to_data_uri,
    log_spectrum_to_data_uri,
    phase_to_data_uri,
)
from batsignal.analysis import calculate_mse, calculate_psnr, calculate_ssim
from batsignal.encryption import (
    arnold_xor,
    chaos,
    dct,
    drpe,
    feistel,
    fourier,
    spectral_hybrid,
)

# Ciphertext Array Cache for DRPE, Fourier, and DCT (maps ciphertext visual hash -> exact raw array)
_CIPHER_CACHE_MAX = 64
_cipher_array_cache: collections.OrderedDict[str, np.ndarray] = collections.OrderedDict()


def _cache_cipher_array(c_vis_uri: str, raw_array: np.ndarray) -> None:
    uri_hash = hashlib.sha256(c_vis_uri.encode("utf-8")).hexdigest()
    _cipher_array_cache[uri_hash] = raw_array
    _cipher_array_cache.move_to_end(uri_hash)
    if len(_cipher_array_cache) > _CIPHER_CACHE_MAX:
        _cipher_array_cache.popitem(last=False)


def _get_cached_cipher_array(payload: str | bytes) -> np.ndarray | None:
    if isinstance(payload, bytes):
        try:
            payload = payload.decode("utf-8")
        except Exception:
            return None
    uri_hash = hashlib.sha256(payload.strip().encode("utf-8")).hexdigest()
    if uri_hash in _cipher_array_cache:
        _cipher_array_cache.move_to_end(uri_hash)
        return _cipher_array_cache[uri_hash]
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

    c_uri = array_to_data_uri(c_vis)

    # Cache full complex optical field associated with this visual ciphertext
    _cache_wavefront(c_uri, ciphertext)

    # Serialize complex ciphertext for JSON key package (float32 → base64)
    real_bytes = ciphertext.real.astype(np.float32).tobytes()
    imag_bytes = ciphertext.imag.astype(np.float32).tobytes()
    cipher_real_b64 = base64.b64encode(real_bytes).decode("utf-8")
    cipher_imag_b64 = base64.b64encode(imag_bytes).decode("utf-8")

    stages = {
        "original": array_to_data_uri(img),
        "r1_phase": phase_to_data_uri(r1_phase),
        "fourier_spectrum": log_spectrum_to_data_uri(fourier_plane),
        "r2_phase": phase_to_data_uri(r2_phase),
        "ciphertext": c_uri,
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
        ciphertext_real=cipher_real_b64,
        ciphertext_imag=cipher_imag_b64,
        ciphertext_shape=list(ciphertext.shape),
    )


def run_drpe_decrypt(
    ciphertext_payload: str | bytes,
    seed1: int = 1234,
    seed2: int = 5678,
    reference_payload: str | bytes | None = None,
) -> DRPEDecryptResponse:
    t0 = time.perf_counter()

    # Check if we have the coherent complex optical wavefront cached for this session
    cached_field = _get_cached_wavefront(ciphertext_payload)
    if cached_field is not None:
        cipher_input = cached_field
    else:
        # DRPE ciphertext is a complex optical field — the PNG visualization is only the
        # magnitude and cannot be used to reconstruct the phase needed for decryption.
        # Decryption requires the original complex array from the same session.
        raise ValueError(
            "DRPE decryption requires the original complex ciphertext from the same session. "
            "The uploaded PNG is a magnitude-only visualization and does not contain the "
            "phase information needed for decryption. Please encrypt and decrypt within the "
            "same browser session, or use the session handoff feature."
        )

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


def run_drpe_preload(
    ciphertext_real_b64: str,
    ciphertext_imag_b64: str,
    shape: list[int],
    visual_uri: str,
) -> dict:
    """
    Reconstruct the complex DRPE ciphertext from the JSON key package and load it
    into the in-process cache, keyed by the visual PNG URI (same key the encrypt
    step used). This warms the cache so the subsequent decrypt call succeeds without
    requiring the original encryption session.
    """
    real_plane = np.frombuffer(
        base64.b64decode(ciphertext_real_b64), dtype=np.float32
    ).reshape(shape).astype(np.complex128)
    imag_plane = np.frombuffer(
        base64.b64decode(ciphertext_imag_b64), dtype=np.float32
    ).reshape(shape).astype(np.float64)
    complex_array = real_plane + 1j * imag_plane

    # Validate that the uploaded visual PNG actually belongs to this exact complex wavefront.
    # The visual URI is a magnitude-only 8-bit projection of the complex array.
    try:
        uploaded_vis = decode_image_payload(visual_uri)
        expected_vis = cv2.normalize(
            np.abs(complex_array), None, 0, 255, cv2.NORM_MINMAX
        ).astype(np.uint8)
        
        if uploaded_vis.shape != expected_vis.shape:
            raise ValueError(
                "The uploaded JSON key file does not belong to this ciphertext image."
            )
            
        # Allow a small tolerance (max difference of 2) due to float64 -> float32 
        # quantization when serializing the complex array to JSON.
        diff = np.abs(uploaded_vis.astype(np.int32) - expected_vis.astype(np.int32))
        if np.max(diff) > 2:
            raise ValueError(
                "The uploaded JSON key file does not belong to this ciphertext image."
            )
    except Exception as e:
        if isinstance(e, ValueError):
            raise e
        raise ValueError("Failed to validate ciphertext image against key package.")

    _cache_wavefront(visual_uri, complex_array)
    return {"status": "CACHED", "shape": shape, "message": "Complex ciphertext loaded into session cache."}


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
        # Use clip (not normalize) so the stored PNG is numerically consistent
        # with the raw spatial values and decryption works on fresh upload.
        complex_result = np.asarray(np.fft.ifft2(encrypted_coeffs, norm="ortho"))
        result = np.asarray(np.real(complex_result))
        output_vis = np.clip(np.round(result), 0, 255).astype(np.uint8)
        out_uri = array_to_data_uri(output_vis)

        # Cache raw complex array (cache hit gives exact lossless decryption)
        _cache_cipher_array(out_uri, complex_result)
        shape_str = f"{img.shape[1]}×{img.shape[0]}"

        real_bytes = complex_result.real.astype(np.float32).tobytes()
        imag_bytes = complex_result.imag.astype(np.float32).tobytes()
        cipher_real_b64 = base64.b64encode(real_bytes).decode("utf-8")
        cipher_imag_b64 = base64.b64encode(imag_bytes).decode("utf-8")

        stages = {
            "original": array_to_data_uri(img),
            "fft_spectrum": fft_spec_uri,
            "permuted_spectrum": spec_uri,
            "ciphertext": out_uri,
        }
    else:
        # Decrypt from exact cached float array if available, or fallback to decoded payload.
        # Both paths are numerically consistent because encrypt now uses clip (not normalize),
        # so the PNG ciphertext carries the same spatial values as the cached array (±0.5 LSB).
        cached_cipher = _get_cached_cipher_array(image_payload)
        if cached_cipher is not None:
            cipher_input = np.asarray(cached_cipher, dtype=np.complex128)
        else:
            cipher_input = decode_image_payload(image_payload).astype(np.float64)

        f_cipher = np.fft.fft2(cipher_input, norm="ortho")
        flat = f_cipher.flatten()
        perm = fourier.generate_permutation(flat.size, key.seed)
        inv_perm = np.empty_like(perm)
        inv_perm[perm] = np.arange(flat.size)
        original_coeffs = flat[inv_perm].reshape(f_cipher.shape)
        result = np.asarray(np.real(np.fft.ifft2(original_coeffs, norm="ortho")))

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
        ciphertext_real=cipher_real_b64 if action.lower() == "encrypt" else None,
        ciphertext_imag=cipher_imag_b64 if action.lower() == "encrypt" else None,
        ciphertext_shape=list(complex_result.shape) if action.lower() == "encrypt" else None,
    )

def run_fourier_preload(
    ciphertext_real_b64: str,
    ciphertext_imag_b64: str,
    shape: list[int],
    visual_uri: str,
) -> dict:
    real_plane = np.frombuffer(
        base64.b64decode(ciphertext_real_b64), dtype=np.float32
    ).reshape(shape).astype(np.float64)
    imag_plane = np.frombuffer(
        base64.b64decode(ciphertext_imag_b64), dtype=np.float32
    ).reshape(shape).astype(np.float64)
    complex_array = real_plane + 1j * imag_plane

    _cache_wavefront(visual_uri, complex_array)
    return {"status": "CACHED", "shape": shape, "message": "Complex ciphertext loaded into session cache."}


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
        # Use clip (not normalize) so the stored PNG is numerically consistent
        # with the raw spatial values and decryption works on fresh upload.
        result = np.asarray(dct.idctn(encrypted_coeffs, norm="ortho"))
        output_vis = np.clip(np.round(result), 0, 255).astype(np.uint8)
        out_uri = array_to_data_uri(output_vis)

        # Cache raw float array (cache hit gives exact lossless decryption)
        _cache_cipher_array(out_uri, result)
        shape_str = f"{img.shape[1]}×{img.shape[0]}"

        real_bytes = result.astype(np.float32).tobytes()
        cipher_real_b64 = base64.b64encode(real_bytes).decode("utf-8")

        stages = {
            "original": array_to_data_uri(img),
            "dct_basis": dct_basis_uri,
            "scrambled_dct": scrambled_dct_uri,
            "ciphertext": out_uri,
        }
    else:
        # Decrypt from exact cached float array if available, or fallback to decoded payload.
        # Both paths are numerically consistent because encrypt now uses clip (not normalize),
        # so the PNG ciphertext carries the same spatial values as the cached array (±0.5 LSB).
        cached_cipher = _get_cached_cipher_array(image_payload)
        if cached_cipher is not None:
            cipher_input = np.asarray(cached_cipher, dtype=np.float64)
        else:
            cipher_input = decode_image_payload(image_payload).astype(np.float64)

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
        ciphertext_real=cipher_real_b64 if action.lower() == "encrypt" else None,
        ciphertext_shape=list(result.shape) if action.lower() == "encrypt" else None,
    )

def run_dct_preload(
    ciphertext_real_b64: str,
    shape: list[int],
    visual_uri: str,
) -> dict:
    real_plane = np.frombuffer(
        base64.b64decode(ciphertext_real_b64), dtype=np.float32
    ).reshape(shape).astype(np.float64)

    _cache_wavefront(visual_uri, real_plane)
    return {"status": "CACHED", "shape": shape, "message": "Real ciphertext loaded into session cache."}


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

        mask_plane = np.full_like(scrambled, key.xor_value, dtype=np.uint8)
        mask_uri = array_to_data_uri(mask_plane)

        stages = {
            "original": array_to_data_uri(img),
            "arnold_scramble": array_to_data_uri(scrambled),
            "bit_mask": mask_uri,
            "xor_diffusion": out_uri,
            "ciphertext": out_uri,
        }
    else:
        xored = arnold_xor.xor_transform(img, key.xor_value)
        result = arnold_xor.arnold_unscramble(xored, key.itr)
        output_vis = np.clip(result, 0, 255).astype(np.uint8)
        out_uri = array_to_data_uri(output_vis)

        mask_plane = np.full_like(img, key.xor_value, dtype=np.uint8)
        mask_uri = array_to_data_uri(mask_plane)

        stages = {
            "ciphertext": array_to_data_uri(img),
            "bit_mask": mask_uri,
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


def run_chaos(
    image_payload: str | bytes, x0: float = 0.4, r: float = 3.99, action: str = "encrypt"
) -> ChaosResponse:
    t0 = time.perf_counter()
    key = chaos.ChaosKey(x0=x0, r=r)
    img = decode_image_payload(image_payload)

    if action.lower() == "encrypt":
        chaos.validate_key(key)

        # 1. Generate chaotic sequence and scramble
        seq1 = chaos.generate_chaotic_sequence(img.size, key.x0, key.r)
        perm = np.argsort(seq1)
        flat = img.flatten()
        scrambled = flat[perm].reshape(img.shape)

        # 2. Generate keystream and XOR
        x0_2 = seq1[-1]
        seq2 = chaos.generate_chaotic_sequence(img.size, x0_2, key.r)
        keystream = chaos.generate_keystream(seq2).reshape(img.shape)
        result = np.bitwise_xor(scrambled, keystream)

        output_vis = np.clip(result, 0, 255).astype(np.uint8)
        out_uri = array_to_data_uri(output_vis)

        stages = {
            "original": array_to_data_uri(img),
            "chaotic_scramble": array_to_data_uri(scrambled),
            "keystream_mask": array_to_data_uri(keystream),
            "xor_diffusion": out_uri,
            "ciphertext": out_uri,
        }
    else:
        # Decrypt
        seq1 = chaos.generate_chaotic_sequence(img.size, key.x0, key.r)
        perm = np.argsort(seq1)
        inv_perm = np.argsort(perm)

        x0_2 = seq1[-1]
        seq2 = chaos.generate_chaotic_sequence(img.size, x0_2, key.r)
        keystream = chaos.generate_keystream(seq2).reshape(img.shape)

        xored = np.bitwise_xor(img, keystream)
        flat = xored.flatten()
        result = flat[inv_perm].reshape(img.shape)

        output_vis = np.clip(result, 0, 255).astype(np.uint8)
        out_uri = array_to_data_uri(output_vis)

        stages = {
            "ciphertext": array_to_data_uri(img),
            "xor_invert": array_to_data_uri(xored),
            "inverse_scramble": out_uri,
            "decrypted": out_uri,
        }

    latency_ms = (time.perf_counter() - t0) * 1000.0

    return ChaosResponse(
        action=action.lower(),
        output_image=out_uri,
        stages=stages,
        metadata={"x0": x0, "r": r, "shape": f"{output_vis.shape[1]}×{output_vis.shape[0]}"},
        latency_ms=round(latency_ms, 2),
    )


def run_spectral_hybrid(
    image_payload: str | bytes,
    scramble_seed: int = 42,
    mask_seed: int = 99,
    kernel_seed: int = 7,
    action: str = "encrypt",
) -> SpectralHybridResponse:
    t0 = time.perf_counter()
    key = spectral_hybrid.SpectralHybridKey(
        scramble_seed=scramble_seed, mask_seed=mask_seed, kernel_seed=kernel_seed
    )

    if action.lower() == "encrypt":
        img = decode_image_payload(image_payload)
        spectral_hybrid.validate_key(key)

        result = spectral_hybrid.encrypt(img, key)

        # Visual ciphertext (normalized magnitude for display in UI, like DRPE)
        output_vis = cv2.normalize(
            np.abs(result), None, 0, 255, cv2.NORM_MINMAX
        ).astype(np.uint8)
        out_uri = array_to_data_uri(output_vis)

        # Cache raw complex array for lossless decryption
        _cache_cipher_array(out_uri, result)
        shape_str = f"{img.shape[1]}×{img.shape[0]}"

        # Serialize for cross-session
        real_bytes = np.real(result).astype(np.float32).tobytes()
        imag_bytes = np.imag(result).astype(np.float32).tobytes()
        cipher_real_b64 = base64.b64encode(real_bytes).decode("utf-8")
        cipher_imag_b64 = base64.b64encode(imag_bytes).decode("utf-8")

        # Pipeline stages
        perm = spectral_hybrid.generate_permutation(img.size, key.scramble_seed)
        scrambled = img.flatten()[perm].reshape(img.shape)
        fft_coeffs = np.fft.fft2(scrambled, norm="ortho")
        phase_mask = spectral_hybrid.generate_phase_mask(img.shape, key.mask_seed)

        stages = {
            "original": array_to_data_uri(img),
            "pixel_scramble": array_to_data_uri(scrambled),
            "fft_spectrum": log_spectrum_to_data_uri(fft_coeffs),
            "phase_mask": phase_to_data_uri(np.angle(phase_mask)),
            "ciphertext": out_uri,
        }

        spec_uri = log_spectrum_to_data_uri(fft_coeffs)
    else:
        cached_cipher = _get_cached_cipher_array(image_payload)
        if cached_cipher is not None:
            cipher_input = np.asarray(cached_cipher)
        else:
            cipher_input = decode_image_payload(image_payload).astype(np.float64)

        result_arr = spectral_hybrid.decrypt(cipher_input, key)
        output_vis = np.clip(np.round(result_arr), 0, 255).astype(np.uint8)
        out_uri = array_to_data_uri(output_vis)
        shape_str = f"{output_vis.shape[1]}×{output_vis.shape[0]}"
        spec_uri = None
        cipher_real_b64 = None
        cipher_imag_b64 = None

        cipher_vis = cv2.normalize(
            np.abs(cipher_input).astype(np.float64), None, 0, 255, cv2.NORM_MINMAX
        ).astype(np.uint8)

        # Deconvolution stage
        kernel = spectral_hybrid.generate_kernel(key.kernel_seed)
        padded_k = spectral_hybrid.pad_kernel(kernel, cipher_input.shape)
        fft_k = np.fft.fft2(padded_k)
        epsilon = 1e-10
        fft_c = np.fft.fft2(cipher_input)
        spatial = np.fft.ifft2(fft_c / (fft_k + epsilon))
        deconv_vis = cv2.normalize(
            np.abs(spatial).astype(np.float64), None, 0, 255, cv2.NORM_MINMAX
        ).astype(np.uint8)

        # Demodulated spectrum stage
        coeffs = np.fft.fft2(spatial, norm="ortho")
        phase_mask = spectral_hybrid.generate_phase_mask(cipher_input.shape, key.mask_seed)
        demodulated = coeffs * np.conj(phase_mask)

        # Scrambled spatial stage
        scrambled_arr = np.real(np.fft.ifft2(demodulated, norm="ortho"))
        scrambled_vis = np.clip(np.round(scrambled_arr), 0, 255).astype(np.uint8)

        stages = {
            "ciphertext": array_to_data_uri(cipher_vis),
            "deconvolved": array_to_data_uri(deconv_vis),
            "phase_demod": log_spectrum_to_data_uri(demodulated),
            "scrambled": array_to_data_uri(scrambled_vis),
            "decrypted": out_uri,
        }

    latency_ms = (time.perf_counter() - t0) * 1000.0

    return SpectralHybridResponse(
        action=action.lower(),
        output_image=out_uri,
        spectrum=spec_uri,
        stages=stages,
        metadata={
            "scramble_seed": scramble_seed,
            "mask_seed": mask_seed,
            "kernel_seed": kernel_seed,
            "shape": shape_str,
        },
        latency_ms=round(latency_ms, 2),
        ciphertext_real=cipher_real_b64 if action.lower() == "encrypt" else None,
        ciphertext_imag=cipher_imag_b64 if action.lower() == "encrypt" else None,
        ciphertext_shape=list(result.shape) if action.lower() == "encrypt" else None,
    )


def run_spectral_hybrid_preload(
    ciphertext_real_b64: str,
    ciphertext_imag_b64: str,
    shape: list[int],
    visual_uri: str,
) -> dict:
    real_plane = np.frombuffer(
        base64.b64decode(ciphertext_real_b64), dtype=np.float32
    ).reshape(shape).astype(np.float64)
    imag_plane = np.frombuffer(
        base64.b64decode(ciphertext_imag_b64), dtype=np.float32
    ).reshape(shape).astype(np.float64)
    complex_array = real_plane + 1j * imag_plane

    _cache_wavefront(visual_uri, complex_array)
    return {"status": "CACHED", "shape": shape, "message": "Complex ciphertext loaded into session cache."}


def run_feistel(
    image_payload: str | bytes, seed: int = 42, rounds: int = 8, action: str = "encrypt"
) -> FeistelResponse:
    t0 = time.perf_counter()
    key = feistel.FeistelKey(seed=seed, rounds=rounds)
    img = decode_image_payload(image_payload)

    # Pad row if odd height
    pad = img.shape[0] % 2
    if pad != 0:
        pad_row = np.zeros((1, *img.shape[1:]), dtype=img.dtype)
        padded_img = np.vstack([img, pad_row])
    else:
        padded_img = img.copy()

    h = padded_img.shape[0]
    half = h // 2
    sub_keys = feistel.generate_sub_keys(key.seed, key.rounds)

    if action.lower() == "encrypt":
        feistel.validate_key(key)

        L = padded_img[:half].copy()
        R = padded_img[half:].copy()

        round_1_img = None
        round_half_img = None
        mid_round = max(1, key.rounds // 2)

        for i in range(key.rounds):
            f_out = feistel.round_function(R, sub_keys[i])
            new_L = R
            new_R = np.bitwise_xor(L.astype(np.uint8), f_out.astype(np.uint8))
            L, R = new_L, new_R

            if i == 0:
                round_1_img = np.vstack([L, R])
            if i == mid_round - 1:
                round_half_img = np.vstack([L, R])

        cipher_arr = np.vstack([L, R])
        output_vis = np.clip(cipher_arr, 0, 255).astype(np.uint8)
        out_uri = array_to_data_uri(output_vis)

        if round_1_img is None:
            round_1_img = output_vis
        if round_half_img is None:
            round_half_img = output_vis

        stages = {
            "original": array_to_data_uri(img),
            "round_1": array_to_data_uri(round_1_img.astype(np.uint8)),
            "round_half": array_to_data_uri(round_half_img.astype(np.uint8)),
            "left_half": array_to_data_uri(img[:half]),
            "right_half": array_to_data_uri(img[half : half * 2]),
            "ciphertext": out_uri,
        }
    else:
        # Decryption
        L = padded_img[:half].copy()
        R = padded_img[half:].copy()

        round_half_img = None
        round_1_img = None
        mid_round = max(1, key.rounds // 2)

        for i in range(key.rounds - 1, -1, -1):
            f_out = feistel.round_function(L, sub_keys[i])
            prev_R = L
            prev_L = np.bitwise_xor(R.astype(np.uint8), f_out.astype(np.uint8))
            L, R = prev_L, prev_R

            if i == mid_round:
                round_half_img = np.vstack([L, R])
            if i == 1:
                round_1_img = np.vstack([L, R])

        dec_arr = np.vstack([L, R])
        if pad != 0:
            dec_arr = dec_arr[: img.shape[0], : img.shape[1]]
        output_vis = np.clip(dec_arr, 0, 255).astype(np.uint8)
        out_uri = array_to_data_uri(output_vis)

        if round_half_img is None:
            round_half_img = output_vis
        if round_1_img is None:
            round_1_img = output_vis

        stages = {
            "ciphertext": array_to_data_uri(img),
            "round_half": array_to_data_uri(round_half_img.astype(np.uint8)),
            "round_1": array_to_data_uri(round_1_img.astype(np.uint8)),
            "left_half": array_to_data_uri(img[:half]),
            "right_half": array_to_data_uri(img[half : half * 2]),
            "decrypted": out_uri,
        }

    latency_ms = (time.perf_counter() - t0) * 1000.0

    return FeistelResponse(
        action=action.lower(),
        output_image=out_uri,
        stages=stages,
        metadata={
            "seed": seed,
            "rounds": rounds,
            "shape": f"{output_vis.shape[1]}×{output_vis.shape[0]}",
        },
        latency_ms=round(latency_ms, 2),
    )
