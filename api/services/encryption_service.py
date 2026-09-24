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
    DecryptResponseV2,
    DRPEDecryptResponse,
    DRPEEncryptResponse,
    EncryptResponseV2,
    FeistelResponse,
    FourierResponse,
    SpectralHybridResponse,
)
from api.services.utils import (
    array_to_data_uri,
    array_to_lossless_data_uri,
    dct_spectrum_to_data_uri,
    decode_image_payload,
    diff_heatmap_to_data_uri,
    extract_embedded_array,
    log_spectrum_to_data_uri,
    phase_to_data_uri,
)
from batsignal.analysis import calculate_mse, calculate_psnr, calculate_ssim
from batsignal.crypto.auth import build_canonical_metadata, compute_hmac, verify_hmac
from batsignal.crypto.chacha import generate_chacha20_nonce
from batsignal.crypto.kdf import (
    derive_chacha20_key,
    derive_dct_seed,
    derive_drpe_seeds,
    derive_fourier_seed,
    derive_hmac_key,
    generate_master_key,
    generate_salt,
)
from batsignal.crypto.keyfile import (
    AuthenticationMeta,
    KeyFileV2,
    b64url_decode,
    b64url_encode,
    parse_key_file_v2,
    serialize_key_file_v2,
)
from batsignal.encryption import (
    arnold_xor,
    chaos,
    dct,
    drpe,
    feistel,
    fourier,
    spectral_hybrid,
)


import collections
import hashlib

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

        stages = {
            "original": array_to_data_uri(img),
            "pixel_scramble": array_to_data_uri(scrambled),
            "fft_spectrum": log_spectrum_to_data_uri(fft_coeffs),
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
        stages = {
            "ciphertext": array_to_data_uri(cipher_vis),
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

    if action.lower() == "encrypt":
        feistel.validate_key(key)
        result = feistel.encrypt(img, key)
        output_vis = np.clip(result, 0, 255).astype(np.uint8)
        out_uri = array_to_data_uri(output_vis)

        # Show intermediate round stages
        h = img.shape[0]
        pad = h % 2
        half = (h + pad) // 2
        stages = {
            "original": array_to_data_uri(img),
            "left_half": array_to_data_uri(img[:half]),
            "right_half": array_to_data_uri(img[half:half*2]),
            "ciphertext": out_uri,
        }
    else:
        result = feistel.decrypt(img, key)
        output_vis = np.clip(result, 0, 255).astype(np.uint8)
        out_uri = array_to_data_uri(output_vis)

        h = img.shape[0]
        pad = h % 2
        half = (h + pad) // 2
        stages = {
            "ciphertext": array_to_data_uri(img),
            "left_half": array_to_data_uri(img[:half]),
            "right_half": array_to_data_uri(img[half:half*2]),
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


# ── Layer 2 Architecture: CSPRNG + HKDF + ChaCha20 + HMAC Authentication ──


def run_v2_encrypt(
    image_payload: str | bytes,
    algorithm: str,
    parameters: dict[str, Any] | None = None,
) -> EncryptResponseV2:
    """
    Layer 2 Cryptographic Encryption Engine:
    1. Generates 256-bit CSPRNG master key and 256-bit CSPRNG salt.
    2. Derives algorithm-specific subkeys via HKDF-SHA256 domain labels.
    3. Runs the Layer 1 engine to obtain raw mathematical ciphertext.
    4. Computes HMAC-SHA256 tag over canonical metadata and raw ciphertext.
    5. Returns lossless encrypted PNG and Version 2 structured key file.
    """
    from datetime import datetime, timezone

    t0 = time.perf_counter()
    if parameters is None:
        parameters = {}

    algo_norm = algorithm.strip().lower().replace("-", "_").replace(" ", "")
    img = decode_image_payload(image_payload)

    master_key = generate_master_key()
    salt = generate_salt()
    salt_b64 = b64url_encode(salt)

    public_params: dict[str, Any] = {}
    nonce_bytes: bytes | None = None
    nonce_b64: str | None = None

    if "drpe" in algo_norm:
        canonical_algo = "DRPE"
        seed1, seed2 = derive_drpe_seeds(master_key, salt)
        key = drpe.DRPEKey(seed1=seed1, seed2=seed2)

        r1 = drpe.generate_phase_mask(img.shape, key.seed1)
        r1_phase = np.angle(r1)

        spatial_modulated = img * r1
        fourier_plane = np.fft.fft2(spatial_modulated, norm="ortho")

        r2 = drpe.generate_phase_mask(img.shape, key.seed2)
        r2_phase = np.angle(r2)

        filtered = fourier_plane * r2
        raw_ciphertext = np.asarray(
            np.fft.ifft2(filtered, norm="ortho"), dtype=np.complex64
        )
        raw_dtype = "complex64"

        c_vis = cv2.normalize(
            np.abs(raw_ciphertext), None, 0, 255, cv2.NORM_MINMAX
        ).astype(np.uint8)

        stages = {
            "original": array_to_data_uri(img),
            "r1_phase": phase_to_data_uri(r1_phase),
            "fourier_spectrum": log_spectrum_to_data_uri(fourier_plane),
            "r2_phase": phase_to_data_uri(r2_phase),
        }

    elif "fourier" in algo_norm or "fft" in algo_norm:
        canonical_algo = "Fourier"
        seed = derive_fourier_seed(master_key, salt)

        coeffs = np.fft.fft2(img, norm="ortho")
        fft_spec_uri = log_spectrum_to_data_uri(coeffs)

        flat = coeffs.flatten()
        perm = fourier.generate_permutation(flat.size, seed)
        encrypted_flat = flat[perm]
        encrypted_coeffs = encrypted_flat.reshape(coeffs.shape)
        spec_uri = log_spectrum_to_data_uri(encrypted_coeffs)

        raw_ciphertext = np.asarray(
            np.fft.ifft2(encrypted_coeffs, norm="ortho"), dtype=np.complex64
        )
        raw_dtype = "complex64"

        c_vis = np.clip(np.round(np.real(raw_ciphertext)), 0, 255).astype(np.uint8)

        stages = {
            "original": array_to_data_uri(img),
            "fft_spectrum": fft_spec_uri,
            "permuted_spectrum": spec_uri,
        }

    elif "dct" in algo_norm or "cosine" in algo_norm:
        canonical_algo = "DCT"
        seed = derive_dct_seed(master_key, salt)

        coeffs = dct.dctn(img, norm="ortho")
        dct_basis_uri = dct_spectrum_to_data_uri(coeffs)

        flat = coeffs.flatten()
        perm = dct.generate_permutation(flat.size, seed)
        encrypted_flat = flat[perm]
        encrypted_coeffs = encrypted_flat.reshape(coeffs.shape)
        scrambled_dct_uri = dct_spectrum_to_data_uri(encrypted_coeffs)

        raw_ciphertext = np.asarray(
            dct.idctn(encrypted_coeffs, norm="ortho"), dtype=np.float32
        )
        raw_dtype = "float32"

        c_vis = np.clip(np.round(raw_ciphertext), 0, 255).astype(np.uint8)

        stages = {
            "original": array_to_data_uri(img),
            "dct_basis": dct_basis_uri,
            "scrambled_dct": scrambled_dct_uri,
        }

    elif "arnold" in algo_norm or "catmap" in algo_norm:
        canonical_algo = "Arnold"
        h, w = img.shape
        if h != w:
            min_dim = min(h, w)
            sy = (h - min_dim) // 2
            sx = (w - min_dim) // 2
            img = img[sy : sy + min_dim, sx : sx + min_dim]

        itr = int(parameters.get("itr", 10))
        public_params["itr"] = itr

        nonce_bytes = generate_chacha20_nonce()
        nonce_b64 = b64url_encode(nonce_bytes)

        chacha_key = derive_chacha20_key(master_key, salt)
        scrambled, raw_ciphertext = arnold_xor.encrypt_arnold_chacha(
            img, itr, chacha_key, nonce_bytes
        )
        raw_ciphertext = raw_ciphertext.astype(np.uint8)
        raw_dtype = "uint8"
        c_vis = raw_ciphertext

        stages = {
            "original": array_to_data_uri(img),
            "arnold_scramble": array_to_data_uri(scrambled),
        }

    else:
        raise ValueError(
            f"Unsupported algorithm '{algorithm}' for Layer 2. "
            "Supported: DRPE, Fourier, DCT, Arnold."
        )

    # Encode lossless PNG containing raw mathematical array in metadata
    c_uri = array_to_lossless_data_uri(c_vis, raw_ciphertext)
    stages["ciphertext"] = c_uri
    if canonical_algo == "Arnold":
        stages["xor_diffusion"] = c_uri

    # Cache raw array for session fast path
    _cache_cipher_array(c_uri, raw_ciphertext)

    # Compute HMAC-SHA256 authentication tag
    hmac_key = derive_hmac_key(master_key, salt)
    dimensions = list(raw_ciphertext.shape)

    canonical_meta = build_canonical_metadata(
        format_version=2,
        algorithm=canonical_algo,
        salt=salt_b64,
        nonce=nonce_b64,
        parameters=public_params,
        dimensions=dimensions,
        raw_dtype=raw_dtype,
    )

    auth_tag = compute_hmac(hmac_key, canonical_meta, raw_ciphertext.tobytes())

    key_file = KeyFileV2(
        format_version=2,
        algorithm=canonical_algo,
        created_at=datetime.now(timezone.utc).isoformat(),
        master_key=b64url_encode(master_key),
        salt=salt_b64,
        nonce=nonce_b64,
        parameters=public_params,
        dimensions=dimensions,
        raw_dtype=raw_dtype,
        authentication=AuthenticationMeta(algorithm="HMAC-SHA256", tag=auth_tag),
    )

    latency_ms = (time.perf_counter() - t0) * 1000.0

    return EncryptResponseV2(
        status="COMPLETE",
        algorithm=canonical_algo,
        ciphertext=c_uri,
        stages=stages,
        key_file=key_file.model_dump(),
        key_file_text=serialize_key_file_v2(key_file),
        metadata={
            "shape": f"{dimensions[1]}×{dimensions[0]}",
            "raw_dtype": raw_dtype,
            "format_version": 2,
        },
        latency_ms=round(latency_ms, 2),
    )


def run_v2_decrypt(
    ciphertext_payload: str | bytes,
    key_file_data: dict[str, Any] | str,
    reference_payload: str | bytes | None = None,
) -> DecryptResponseV2:
    """
    Layer 2 Cryptographic Decryption Engine:
    1. Parses and validates Version 2 JSON Key File.
    2. Extracts lossless raw array from ciphertext PNG metadata or cache.
    3. Derives HMAC key from master key and salt.
    4. Computes HMAC tag over canonical metadata and raw ciphertext.
    5. CRITICAL: If HMAC verification fails, immediately aborts with:
       'The supplied key does not match this encrypted image, or the encrypted data has been modified.'
       Decryption is NEVER executed on tampered data or wrong keys.
    6. If HMAC passes, derives algorithmic subkeys and executes Layer 1 decryption.
    """
    t0 = time.perf_counter()

    key_file = parse_key_file_v2(key_file_data)

    # Extract raw array from PNG metadata or session cache
    raw_array = extract_embedded_array(ciphertext_payload)
    if raw_array is None:
        cached = _get_cached_cipher_array(ciphertext_payload)
        if cached is not None:
            raw_array = np.asarray(cached, dtype=np.dtype(key_file.raw_dtype))
        elif key_file.raw_dtype == "uint8":
            raw_array = decode_image_payload(ciphertext_payload)
        else:
            raise ValueError(
                "Lossless raw ciphertext array could not be extracted from the uploaded image. "
                "Ensure you uploaded the original encrypted PNG file downloaded from Bat_Signal."
            )

    # Verify dimensions and raw dtype
    if list(raw_array.shape) != list(key_file.dimensions):
        raise ValueError(
            f"Ciphertext image dimensions {list(raw_array.shape)} do not match "
            f"key file dimensions {key_file.dimensions}."
        )
    if str(raw_array.dtype) != key_file.raw_dtype:
        raise ValueError(
            f"Ciphertext array dtype '{raw_array.dtype}' does not match "
            f"key file raw_dtype '{key_file.raw_dtype}'."
        )

    # Derive HMAC authentication key
    master_key = b64url_decode(key_file.master_key)
    salt = b64url_decode(key_file.salt)
    hmac_key = derive_hmac_key(master_key, salt)

    # Reconstruct canonical metadata representation
    canonical_meta = build_canonical_metadata(
        format_version=key_file.format_version,
        algorithm=key_file.algorithm,
        salt=key_file.salt,
        nonce=key_file.nonce,
        parameters=key_file.parameters,
        dimensions=key_file.dimensions,
        raw_dtype=key_file.raw_dtype,
    )

    # Verify HMAC tag in constant time
    expected_tag = compute_hmac(hmac_key, canonical_meta, raw_array.tobytes())
    if not verify_hmac(expected_tag, key_file.authentication.tag):
        raise ValueError(
            "The supplied key does not match this encrypted image, or the encrypted data has been modified."
        )

    # HMAC VERIFICATION PASSED: Proceed with Layer 1 Decryption
    algo = key_file.algorithm.upper()

    if algo == "DRPE":
        seed1, seed2 = derive_drpe_seeds(master_key, salt)
        key = drpe.DRPEKey(seed1=seed1, seed2=seed2)

        r1 = drpe.generate_phase_mask(raw_array.shape, key.seed1)
        r2 = drpe.generate_phase_mask(raw_array.shape, key.seed2)

        fourier_plane = np.fft.fft2(raw_array, norm="ortho")
        demodulated_fourier = fourier_plane * np.conj(r2)
        demodulated_spatial = np.fft.ifft2(demodulated_fourier, norm="ortho")

        recovered = np.real(demodulated_spatial * np.conj(r1))
        rec_uint8 = np.clip(np.round(recovered), 0, 255).astype(np.uint8)

        cipher_vis = cv2.normalize(
            np.abs(raw_array), None, 0, 255, cv2.NORM_MINMAX
        ).astype(np.uint8)

        stages = {
            "ciphertext": array_to_data_uri(cipher_vis),
            "r2_conj": phase_to_data_uri(np.angle(np.conj(r2))),
            "fourier_demod": log_spectrum_to_data_uri(demodulated_fourier),
            "r1_conj": phase_to_data_uri(np.angle(np.conj(r1))),
            "decrypted": array_to_data_uri(rec_uint8),
        }

    elif algo == "FOURIER":
        seed = derive_fourier_seed(master_key, salt)

        f_cipher = np.fft.fft2(raw_array, norm="ortho")
        flat = f_cipher.flatten()
        perm = fourier.generate_permutation(flat.size, seed)
        inv_perm = np.empty_like(perm)
        inv_perm[perm] = np.arange(flat.size)
        original_coeffs = flat[inv_perm].reshape(f_cipher.shape)
        result = np.asarray(np.real(np.fft.ifft2(original_coeffs, norm="ortho")))

        rec_uint8 = np.clip(np.round(result), 0, 255).astype(np.uint8)
        cipher_vis = np.clip(np.round(np.real(raw_array)), 0, 255).astype(np.uint8)

        stages = {
            "ciphertext": array_to_data_uri(cipher_vis),
            "fft_spectrum": log_spectrum_to_data_uri(f_cipher),
            "inverse_perm": log_spectrum_to_data_uri(original_coeffs),
            "decrypted": array_to_data_uri(rec_uint8),
        }

    elif algo == "DCT":
        seed = derive_dct_seed(master_key, salt)

        d_cipher = dct.dctn(raw_array, norm="ortho")
        flat = d_cipher.flatten()
        perm = dct.generate_permutation(flat.size, seed)
        inv_perm = np.empty_like(perm)
        inv_perm[perm] = np.arange(flat.size)
        original_coeffs = flat[inv_perm].reshape(d_cipher.shape)
        result = np.asarray(dct.idctn(original_coeffs, norm="ortho"))

        rec_uint8 = np.clip(np.round(result), 0, 255).astype(np.uint8)
        cipher_vis = np.clip(np.round(raw_array), 0, 255).astype(np.uint8)

        stages = {
            "ciphertext": array_to_data_uri(cipher_vis),
            "dct_coeffs": dct_spectrum_to_data_uri(d_cipher),
            "inverse_perm": dct_spectrum_to_data_uri(original_coeffs),
            "decrypted": array_to_data_uri(rec_uint8),
        }

    elif algo == "ARNOLD":
        if not key_file.nonce:
            raise ValueError(
                "Key file is missing required 'nonce' for Arnold+ChaCha20 decryption."
            )
        nonce = b64url_decode(key_file.nonce)
        chacha_key = derive_chacha20_key(master_key, salt)
        itr = int(key_file.parameters.get("itr", 10))

        unxored, rec_uint8 = arnold_xor.decrypt_arnold_chacha(
            raw_array, itr, chacha_key, nonce
        )

        stages = {
            "ciphertext": array_to_data_uri(raw_array),
            "xor_invert": array_to_data_uri(unxored),
            "inverse_arnold": array_to_data_uri(rec_uint8),
            "decrypted": array_to_data_uri(rec_uint8),
        }

    else:
        raise ValueError(f"Unsupported algorithm '{key_file.algorithm}' for decryption.")

    # Quality metrics evaluation
    quality: dict[str, Any] = {}
    diff_heatmap_uri: str | None = None

    if reference_payload:
        try:
            ref_img = decode_image_payload(reference_payload)
            if ref_img.shape == rec_uint8.shape:
                mse_val = calculate_mse(ref_img, rec_uint8)
                psnr_val = calculate_psnr(ref_img, rec_uint8)
                ssim_val = calculate_ssim(ref_img, rec_uint8)
                diff = np.abs(
                    ref_img.astype(np.float64) - rec_uint8.astype(np.float64)
                )
                diff_heatmap_uri = diff_heatmap_to_data_uri(diff)
                quality = {
                    "mse": round(mse_val, 4),
                    "psnr": round(psnr_val, 2) if not np.isinf(psnr_val) else "inf",
                    "ssim": round(ssim_val, 4),
                }
        except Exception:
            pass

    latency_ms = (time.perf_counter() - t0) * 1000.0

    return DecryptResponseV2(
        status="COMPLETE",
        algorithm=key_file.algorithm,
        decrypted_image=array_to_data_uri(rec_uint8),
        diff_heatmap=diff_heatmap_uri,
        stages=stages,
        quality=quality,
        metadata={
            "shape": f"{rec_uint8.shape[1]}×{rec_uint8.shape[0]}",
            "format_version": 2,
        },
        latency_ms=round(latency_ms, 2),
    )

