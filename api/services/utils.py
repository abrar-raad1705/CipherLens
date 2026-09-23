"""
Centralized serialization and imaging utilities for Bat Signal API.
"""

from __future__ import annotations

import base64
import io
import re

import cv2
import numpy as np
import zlib
from PIL import Image, PngImagePlugin

DATA_URI_PATTERN = re.compile(r"^data:image/[a-zA-Z0-9.+_-]+;base64,")
WAVEFRONT_CHUNK_KEY = "cipherlens_wavefront"


def decode_image_payload(payload: str | bytes, max_dim: int = 1024) -> np.ndarray:
    """
    Decode a base64 data URI, raw base64 string, or raw image bytes into a
    2D grayscale uint8 numpy array.
    """
    if isinstance(payload, str):
        cleaned = DATA_URI_PATTERN.sub("", payload.strip())
        raw_bytes = base64.b64decode(cleaned)
    elif isinstance(payload, bytes):
        raw_bytes = payload
    else:
        raise ValueError(f"Unsupported image payload type: {type(payload)}")

    nparr = np.frombuffer(raw_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_GRAYSCALE)
    if img is None:
        raise ValueError("Failed to decode image data into 2D grayscale array.")

    h, w = img.shape
    if max_dim and (h > max_dim or w > max_dim):
        scale = max_dim / max(h, w)
        new_w, new_h = int(round(w * scale)), int(round(h * scale))
        img = cv2.resize(img, (new_w, new_h), interpolation=cv2.INTER_AREA)

    return img.astype(np.uint8)


def extract_embedded_array(payload: str | bytes) -> np.ndarray | None:
    """
    Extract embedded raw numpy array (complex or float) from PNG metadata chunk if present.
    Allows 100% stateless recovery without relying on server memory/cache.
    """
    try:
        if isinstance(payload, str):
            cleaned = DATA_URI_PATTERN.sub("", payload.strip())
            raw_bytes = base64.b64decode(cleaned)
        elif isinstance(payload, bytes):
            raw_bytes = payload
        else:
            return None

        pil_img = Image.open(io.BytesIO(raw_bytes))
        chunk_b64 = pil_img.text.get(WAVEFRONT_CHUNK_KEY)
        if not chunk_b64:
            return None

        decompressed = zlib.decompress(base64.b64decode(chunk_b64))
        raw_arr = np.load(io.BytesIO(decompressed), allow_pickle=False)
        return raw_arr
    except Exception:
        return None


def array_to_data_uri(
    image_array: np.ndarray, embedded_array: np.ndarray | None = None
) -> str:
    """
    Convert a 2D numpy array to a base64 encoded PNG data URI.
    Optionally embeds the exact raw mathematical array (downcasted to complex64/float32 for compact size)
    into PNG tEXt metadata chunk for 100% lossless, stateless decryption.
    """
    if image_array.ndim != 2:
        raise ValueError(f"Expected 2D image array, got shape {image_array.shape}")

    if image_array.dtype != np.uint8:
        norm = cv2.normalize(
            image_array.astype(np.float64), None, 0, 255, cv2.NORM_MINMAX
        )
        img_uint8 = np.clip(norm, 0, 255).astype(np.uint8)
    else:
        img_uint8 = image_array

    pil_img = Image.fromarray(img_uint8, mode="L")

    pnginfo = None
    if embedded_array is not None:
        try:
            arr_to_embed = embedded_array
            if np.iscomplexobj(arr_to_embed):
                arr_to_embed = arr_to_embed.astype(np.complex64)
            elif np.issubdtype(arr_to_embed.dtype, np.floating) and arr_to_embed.dtype == np.float64:
                arr_to_embed = arr_to_embed.astype(np.float32)

            bio = io.BytesIO()
            np.save(bio, arr_to_embed, allow_pickle=False)
            compressed = zlib.compress(bio.getvalue(), level=6)
            b64_str = base64.b64encode(compressed).decode("ascii")
            pnginfo = PngImagePlugin.PngInfo()
            pnginfo.add_text(WAVEFRONT_CHUNK_KEY, b64_str)
        except Exception:
            pnginfo = None

    buf = io.BytesIO()
    if pnginfo is not None:
        pil_img.save(buf, format="PNG", pnginfo=pnginfo, optimize=False)
    else:
        pil_img.save(buf, format="PNG", optimize=True)

    b64 = base64.b64encode(buf.getvalue()).decode("utf-8")
    return f"data:image/png;base64,{b64}"


def phase_to_data_uri(phase_array: np.ndarray) -> str:
    """
    Render phase values in radians [-pi, pi] using an optical colormap (compact JPEG format).
    """
    norm_phase = ((phase_array + np.pi) / (2.0 * np.pi) * 255.0).astype(np.uint8)
    colored = cv2.applyColorMap(norm_phase, cv2.COLORMAP_CIVIDIS)
    pil_img = Image.fromarray(cv2.cvtColor(colored, cv2.COLOR_BGR2RGB))
    buf = io.BytesIO()
    pil_img.save(buf, format="JPEG", quality=85)
    b64 = base64.b64encode(buf.getvalue()).decode("utf-8")
    return f"data:image/jpeg;base64,{b64}"


def log_spectrum_to_data_uri(complex_array: np.ndarray) -> str:
    """
    Render centered 2D Fourier spectrum using logarithmic magnitude (compact JPEG format).
    """
    magnitude = np.abs(complex_array)
    shifted = np.fft.fftshift(magnitude)
    log_spec = np.log1p(shifted)
    norm = cv2.normalize(log_spec, None, 0, 255, cv2.NORM_MINMAX).astype(np.uint8)
    colored = cv2.applyColorMap(norm, cv2.COLORMAP_INFERNO)
    pil_img = Image.fromarray(cv2.cvtColor(colored, cv2.COLOR_BGR2RGB))
    buf = io.BytesIO()
    pil_img.save(buf, format="JPEG", quality=85)
    b64 = base64.b64encode(buf.getvalue()).decode("utf-8")
    return f"data:image/jpeg;base64,{b64}"


def dct_spectrum_to_data_uri(dct_array: np.ndarray) -> str:
    """
    Render 2D DCT coefficient spectrum using logarithmic magnitude (compact JPEG format).
    """
    magnitude = np.abs(dct_array)
    log_spec = np.log1p(magnitude)
    norm = cv2.normalize(log_spec, None, 0, 255, cv2.NORM_MINMAX).astype(np.uint8)
    colored = cv2.applyColorMap(norm, cv2.COLORMAP_INFERNO)
    pil_img = Image.fromarray(cv2.cvtColor(colored, cv2.COLOR_BGR2RGB))
    buf = io.BytesIO()
    pil_img.save(buf, format="JPEG", quality=85)
    b64 = base64.b64encode(buf.getvalue()).decode("utf-8")
    return f"data:image/jpeg;base64,{b64}"


def diff_heatmap_to_data_uri(diff_array: np.ndarray) -> str:
    """
    Render absolute error difference heatmap.
    """
    diff_norm = cv2.normalize(
        diff_array.astype(np.float64), None, 0, 255, cv2.NORM_MINMAX
    ).astype(np.uint8)
    colored = cv2.applyColorMap(diff_norm, cv2.COLORMAP_TURBO)
    pil_img = Image.fromarray(cv2.cvtColor(colored, cv2.COLOR_BGR2RGB))
    buf = io.BytesIO()
    pil_img.save(buf, format="PNG", optimize=True)
    b64 = base64.b64encode(buf.getvalue()).decode("utf-8")
    return f"data:image/png;base64,{b64}"


def create_synthetic_target(
    target_type: str = "frequency_grid", size: int = 512
) -> np.ndarray:
    """
    Generate precision synthetic computational-imaging test benchmarks.
    """
    y, x = np.ogrid[:size, :size]
    center = size / 2.0
    r = np.sqrt((x - center) ** 2 + (y - center) ** 2)

    if target_type == "frequency_grid":
        # High-fidelity Fresnel zone plate with quadratic radial chirp and apodized window
        k = 0.0018
        chirp = 127.5 * (1.0 + np.cos(k * (r**2)))
        window = np.clip((center - r) / 16.0, 0.0, 1.0)
        pattern = chirp * window + 24.0 * (1.0 - window)
        pattern[r < 2.5] = 255
        return np.clip(pattern, 0, 255).astype(np.uint8)

    elif target_type == "siemens_star":
        # Classic Siemens star MTF resolution benchmark with 36 radial spokes and concentric guide rings
        angle = np.arctan2(y - center, x - center)
        spokes = 36
        star = 127.5 * (1.0 + np.sign(np.sin(spokes * angle)) * 0.92)
        for ring_r in [60, 120, 180, 235]:
            star[np.abs(r - ring_r) < 1.5] = 255
        star[r < 5] = 255
        star[r > center - 4] = 16
        return np.clip(star, 0, 255).astype(np.uint8)

    elif target_type == "usaf_target":
        # USAF / optical resolution target with orthogonal 3-bar groups and concentric alignment rings
        chart = np.full((size, size), 245, dtype=np.uint8)
        for cr in [20, 40, 75, 120, 175, 230]:
            mask = np.abs(r - cr) < 1.2
            chart[mask] = 25
        c_int = int(center)
        chart[c_int, max(0, c_int - 30) : min(size, c_int + 31)] = 20
        chart[max(0, c_int - 30) : min(size, c_int + 31), c_int] = 20
        frequencies = [
            (35, 35, 14, 45, 8, True),
            (35, 100, 9, 36, 6, True),
            (35, 155, 6, 28, 4, True),
            (35, 200, 4, 20, 3, True),
            (size - 85, 35, 45, 14, 8, False),
            (size - 75, 100, 36, 9, 6, False),
            (size - 65, 155, 28, 6, 4, False),
            (size - 55, 200, 20, 4, 3, False),
        ]
        for bx, by, bw, bh, sp, horiz in frequencies:
            for b_idx in range(3):
                if horiz:
                    y0 = by + b_idx * (bh + sp)
                    chart[y0 : y0 + bh, bx : bx + bw] = 20
                else:
                    x0 = bx + b_idx * (bw + sp)
                    chart[by : by + bh, x0 : x0 + bw] = 20
        return np.clip(chart, 0, 255).astype(np.uint8)

    elif target_type == "checkerboard":
        tile = 32
        board = ((x // tile) + (y // tile)) % 2
        img = (board * 255).astype(np.uint8)
        img[:2, :] = 128
        img[-2:, :] = 128
        img[:, :2] = 128
        img[:, -2:] = 128
        return img

    elif target_type == "gradient_ramp":
        ramp = (x / size) * 200.0 + 55.0 * np.sin(2.0 * np.pi * y / 64.0)
        return np.clip(ramp, 0, 255).astype(np.uint8)

    elif target_type == "resolution_bars":
        img = np.full((size, size), 220, dtype=np.uint8)
        frequencies = [2, 4, 8, 16, 32, 64]
        h_step = size // (len(frequencies) + 1)
        for i, freq in enumerate(frequencies):
            y_start = (i + 1) * h_step - 20
            y_end = y_start + 40
            bars = (np.sin(2 * np.pi * x[0] * freq / size) > 0) * 255
            img[y_start:y_end, :] = bars.astype(np.uint8)
        return img

    return np.zeros((size, size), dtype=np.uint8)


def sample_correlation_points(
    image: np.ndarray, num_samples: int = 1500, seed: int = 42
) -> dict[str, list[dict[str, float]]]:
    """
    Sample adjacent pixel pairs for Horizontal, Vertical, and Diagonal scatter plots.
    """
    rng = np.random.default_rng(seed)
    h, w = image.shape
    img = np.real(image).astype(np.float64)

    y_h = rng.integers(0, h, size=num_samples)
    x_h = rng.integers(0, w - 1, size=num_samples)
    horiz_pts = [
        {
            "x": round(float(img[y_h[i], x_h[i]]), 2),
            "y": round(float(img[y_h[i], x_h[i] + 1]), 2),
        }
        for i in range(num_samples)
    ]

    y_v = rng.integers(0, h - 1, size=num_samples)
    x_v = rng.integers(0, w, size=num_samples)
    vert_pts = [
        {
            "x": round(float(img[y_v[i], x_v[i]]), 2),
            "y": round(float(img[y_v[i] + 1, x_v[i]]), 2),
        }
        for i in range(num_samples)
    ]

    y_d = rng.integers(0, h - 1, size=num_samples)
    x_d = rng.integers(0, w - 1, size=num_samples)
    diag_pts = [
        {
            "x": round(float(img[y_d[i], x_d[i]]), 2),
            "y": round(float(img[y_d[i] + 1, x_d[i] + 1]), 2),
        }
        for i in range(num_samples)
    ]

    return {
        "horizontal": horiz_pts,
        "vertical": vert_pts,
        "diagonal": diag_pts,
    }


def compute_histogram(image: np.ndarray) -> list[int]:
    """
    Compute 256-bin intensity histogram [0..255].
    """
    if image.dtype != np.uint8:
        norm = cv2.normalize(
            np.real(image).astype(np.float64), None, 0, 255, cv2.NORM_MINMAX
        )
        arr = np.clip(norm, 0, 255).astype(np.uint8)
    else:
        arr = image
    hist, _ = np.histogram(arr, bins=256, range=(0, 256))
    return [int(c) for c in hist]
