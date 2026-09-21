"""
Service and orchestration layer for BAT SIGNAL Computational Imaging Laboratory.
Maintains global laboratory state, computes optical phase and frequency visualizations,
orchestrates filtering and encryption, and computes quantitative cryptanalysis.
"""

from __future__ import annotations

import base64
import io
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import cv2
import numpy as np
from PIL import Image

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
from batsignal.processing import (
    apply_custom_kernel,
    apply_deconvolution,
    apply_gaussian,
    apply_median_filter,
    apply_sobel,
)


def array_to_base64_png(image_array: np.ndarray) -> str:
    """Convert a 2D uint8 numpy array to a base64 encoded PNG data URI."""
    if image_array.ndim != 2:
        raise ValueError(f"Expected 2D image array, got shape {image_array.shape}")

    if image_array.dtype != np.uint8:
        # Normalize float/int to uint8
        norm = cv2.normalize(
            image_array.astype(np.float64), None, 0, 255, cv2.NORM_MINMAX
        )
        img_uint8 = np.clip(norm, 0, 255).astype(np.uint8)
    else:
        img_uint8 = image_array

    pil_img = Image.fromarray(img_uint8, mode="L")
    buf = io.BytesIO()
    pil_img.save(buf, format="PNG", optimize=True)
    b64 = base64.b64encode(buf.getvalue()).decode("utf-8")
    return f"data:image/png;base64,{b64}"


def phase_to_base64_png(phase_array: np.ndarray) -> str:
    """
    Render phase values in radians [-pi, pi] using a cyclic optical phase colormap
    with cyan, violet, and deep blue hues.
    """
    # Normalize [-pi, pi] to [0, 255]
    norm_phase = ((phase_array + np.pi) / (2.0 * np.pi) * 255.0).astype(np.uint8)
    # Apply COLORMAP_TWILIGHT_SHIFTED or COLORMAP_CIVIDIS
    colored = cv2.applyColorMap(norm_phase, cv2.COLORMAP_CIVIDIS)
    pil_img = Image.fromarray(cv2.cvtColor(colored, cv2.COLOR_BGR2RGB))
    buf = io.BytesIO()
    pil_img.save(buf, format="PNG", optimize=True)
    b64 = base64.b64encode(buf.getvalue()).decode("utf-8")
    return f"data:image/png;base64,{b64}"


def log_spectrum_to_base64_png(complex_array: np.ndarray) -> str:
    """
    Render centered 2D Fourier spectrum using logarithmic magnitude: log(1 + |F(u, v)|).
    """
    magnitude = np.abs(complex_array)
    # 2D fftshift
    shifted = np.fft.fftshift(magnitude)
    log_spec = np.log1p(shifted)
    norm = cv2.normalize(log_spec, None, 0, 255, cv2.NORM_MINMAX).astype(np.uint8)

    # Render with deep violet/cyan astronomical/optical colormap
    colored = cv2.applyColorMap(norm, cv2.COLORMAP_INFERNO)
    pil_img = Image.fromarray(cv2.cvtColor(colored, cv2.COLOR_BGR2RGB))
    buf = io.BytesIO()
    pil_img.save(buf, format="PNG", optimize=True)
    b64 = base64.b64encode(buf.getvalue()).decode("utf-8")
    return f"data:image/png;base64,{b64}"


def dct_spectrum_to_base64_png(dct_array: np.ndarray) -> str:
    """
    Render 2D DCT coefficient spectrum using logarithmic magnitude: log(1 + |C(u, v)|).
    """
    magnitude = np.abs(dct_array)
    log_spec = np.log1p(magnitude)
    norm = cv2.normalize(log_spec, None, 0, 255, cv2.NORM_MINMAX).astype(np.uint8)
    colored = cv2.applyColorMap(norm, cv2.COLORMAP_INFERNO)
    pil_img = Image.fromarray(cv2.cvtColor(colored, cv2.COLOR_BGR2RGB))
    buf = io.BytesIO()
    pil_img.save(buf, format="PNG", optimize=True)
    b64 = base64.b64encode(buf.getvalue()).decode("utf-8")
    return f"data:image/png;base64,{b64}"


def error_heatmap_to_base64_png(diff_array: np.ndarray) -> str:
    """Render absolute error difference heatmap."""
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
    """Generate precision synthetic computational-imaging test benchmarks."""
    y, x = np.ogrid[:size, :size]
    center = size / 2.0

    if target_type == "frequency_grid":
        # Concentric chirp & multi-frequency zone plate
        r = np.sqrt((x - center) ** 2 + (y - center) ** 2)
        pattern = 127.5 * (1.0 + np.sin(0.002 * (r**2)))
        # Radial crosshairs
        pattern[int(center) - 1 : int(center) + 2, :] = 255
        pattern[:, int(center) - 1 : int(center) + 2] = 255
        return np.clip(pattern, 0, 255).astype(np.uint8)

    elif target_type == "checkerboard":
        # 32x32 block checkerboard
        tile = 32
        board = ((x // tile) + (y // tile)) % 2
        return (board * 255).astype(np.uint8)

    elif target_type == "gradient_ramp":
        # 2D combined linear & sinusoidal ramp
        ramp = (x / size) * 200.0 + 55.0 * np.sin(2.0 * np.pi * y / 64.0)
        return np.clip(ramp, 0, 255).astype(np.uint8)

    elif target_type == "resolution_bars":
        # Optical bar target
        img = np.full((size, size), 200, dtype=np.uint8)
        frequencies = [2, 4, 8, 16, 32, 64]
        h_step = size // (len(frequencies) + 1)
        for i, freq in enumerate(frequencies):
            y_start = (i + 1) * h_step - 20
            y_end = y_start + 40
            bars = (np.sin(2 * np.pi * x[0] * freq / size) > 0) * 255
            img[y_start:y_end, :] = bars.astype(np.uint8)
        return img

    else:
        return np.zeros((size, size), dtype=np.uint8)


def sample_correlation_points(
    image: np.ndarray, num_samples: int = 2000, seed: int = 42
) -> dict[str, list[dict[str, float]]]:
    """Sample adjacent pixel pairs for H, V, and D scatter plots."""
    rng = np.random.default_rng(seed)
    h, w = image.shape
    img = np.real(image).astype(np.float64)

    # Horizontal (x, y) vs (x, y+1)
    y_h = rng.integers(0, h, size=num_samples)
    x_h = rng.integers(0, w - 1, size=num_samples)
    horiz_pts = [
        {"x": float(img[y_h[i], x_h[i]]), "y": float(img[y_h[i], x_h[i] + 1])}
        for i in range(num_samples)
    ]

    # Vertical (x, y) vs (x+1, y)
    y_v = rng.integers(0, h - 1, size=num_samples)
    x_v = rng.integers(0, w, size=num_samples)
    vert_pts = [
        {"x": float(img[y_v[i], x_v[i]]), "y": float(img[y_v[i] + 1, x_v[i]])}
        for i in range(num_samples)
    ]

    # Diagonal (x, y) vs (x+1, y+1)
    y_d = rng.integers(0, h - 1, size=num_samples)
    x_d = rng.integers(0, w - 1, size=num_samples)
    diag_pts = [
        {"x": float(img[y_d[i], x_d[i]]), "y": float(img[y_d[i] + 1, x_d[i] + 1])}
        for i in range(num_samples)
    ]

    return {
        "horizontal": horiz_pts,
        "vertical": vert_pts,
        "diagonal": diag_pts,
    }


def compute_histogram(image: np.ndarray) -> list[int]:
    """Compute 256-bin intensity histogram."""
    if image.dtype != np.uint8:
        norm = cv2.normalize(
            np.real(image).astype(np.float64), None, 0, 255, cv2.NORM_MINMAX
        )
        arr = np.clip(norm, 0, 255).astype(np.uint8)
    else:
        arr = image
    hist, _ = np.histogram(arr, bins=256, range=(0, 256))
    return [int(c) for c in hist]


@dataclass
class LaboratorySession:
    """Maintains active state across all benches in the research laboratory."""

    # Active Image State
    image_name: str = "cat512.png"
    original_image: np.ndarray = field(
        default_factory=lambda: np.zeros((512, 512), dtype=np.uint8)
    )

    # Processing Bench State
    processed_image: np.ndarray | None = None
    processing_meta: dict[str, Any] = field(default_factory=dict)

    # Encryption Bench State
    ciphertext: np.ndarray | None = None
    ciphertext_vis: np.ndarray | None = None
    encryption_meta: dict[str, Any] = field(default_factory=dict)

    # DRPE Optical Stages (for interactive pipeline exploration)
    drpe_stages: dict[str, str] = field(default_factory=dict)

    # Decryption State
    decrypted_image: np.ndarray | None = None
    decryption_meta: dict[str, Any] = field(default_factory=dict)

    # Deconvolution / Restoration State
    restored_image: np.ndarray | None = None
    restoration_meta: dict[str, Any] = field(default_factory=dict)

    def __post_init__(self):
        # Load default cat512.png if available
        pkg_cat = Path(__file__).resolve().parent.parent / "pipeline" / "cat512.png"
        if pkg_cat.exists():
            img = cv2.imread(str(pkg_cat), cv2.IMREAD_GRAYSCALE)
            if img is not None:
                self.original_image = img
                self.image_name = "cat512.png"
        else:
            self.original_image = create_synthetic_target("frequency_grid", 512)
            self.image_name = "frequency_grid.png"

        self.processed_image = self.original_image.copy()

    def set_image(self, image: np.ndarray, name: str) -> dict[str, Any]:
        """Update the active global image state."""
        if image.ndim != 2:
            raise ValueError(f"Grayscale image required, got shape {image.shape}")

        self.original_image = image.astype(np.uint8)
        self.image_name = name
        self.processed_image = self.original_image.copy()
        self.processing_meta = {"filter": "Pass-through (Original)", "params": {}}
        self.ciphertext = None
        self.ciphertext_vis = None
        self.encryption_meta = {}
        self.drpe_stages = {}
        self.decrypted_image = None
        self.decryption_meta = {}
        self.restored_image = None
        self.restoration_meta = {}

        return self.get_summary()

    def get_summary(self) -> dict[str, Any]:
        """Get laboratory instrument readouts and metadata."""
        h, w = self.original_image.shape
        mean_val = float(np.mean(self.original_image))
        std_val = float(np.std(self.original_image))
        entropy_val = calculate_entropy(self.original_image)

        return {
            "image_name": self.image_name,
            "dimensions": f"{w} × {h}",
            "width": w,
            "height": h,
            "color_mode": "GRAYSCALE (uint8)",
            "pixel_count": w * h,
            "mean_intensity": round(mean_val, 2),
            "std_intensity": round(std_val, 2),
            "entropy": round(entropy_val, 4),
            "has_processed": self.processed_image is not None,
            "has_ciphertext": self.ciphertext is not None,
            "has_decrypted": self.decrypted_image is not None,
            "has_restored": self.restored_image is not None,
            "original_preview": array_to_base64_png(self.original_image),
        }

    # =========================================================================
    # CONVOLUTION & PROCESSING BENCH
    # =========================================================================

    def apply_filter(self, filter_type: str, params: dict[str, Any]) -> dict[str, Any]:
        """Execute spatial filter (Gaussian, Median, Sobel, Custom Kernel)."""
        t0 = time.perf_counter()
        img = self.original_image

        filter_name = filter_type.upper()
        if filter_name == "GAUSSIAN":
            k_size = int(params.get("kernel_size", 5))
            sigma = float(params.get("sigma", 1.5))
            if k_size % 2 == 0 or k_size < 1:
                raise ValueError("Kernel size must be an odd positive integer.")
            result = apply_gaussian(img, kernel_size=k_size, sigma=sigma)
            meta = {"filter": "Gaussian", "kernel_size": k_size, "sigma": sigma}

        elif filter_name == "MEDIAN":
            k_size = int(params.get("kernel_size", 3))
            if k_size % 2 == 0 or k_size < 1:
                raise ValueError("Kernel size must be an odd positive integer.")
            result = apply_median_filter(img, kernel_size=k_size)
            meta = {"filter": "Median", "kernel_size": k_size}

        elif filter_name == "SOBEL":
            result = apply_sobel(img)
            meta = {"filter": "Sobel Magnitude"}

        elif filter_name == "CUSTOM":
            raw_matrix = params.get("kernel")
            if not raw_matrix:
                raise ValueError("A custom 2D kernel matrix is required.")
            kernel = np.array(raw_matrix, dtype=np.float64)
            if kernel.ndim != 2:
                raise ValueError(f"Kernel must be 2D, got shape {kernel.shape}")
            if kernel.shape[0] % 2 == 0 or kernel.shape[1] % 2 == 0:
                raise ValueError("Kernel dimensions must be odd.")

            if params.get("normalize", False):
                k_sum = np.sum(kernel)
                if not np.isclose(k_sum, 0.0):
                    kernel = kernel / k_sum

            result = apply_custom_kernel(img, kernel)
            meta = {
                "filter": "Custom Kernel",
                "kernel_shape": f"{kernel.shape[0]}×{kernel.shape[1]}",
            }

        elif filter_name == "RESET":
            result = img.copy()
            meta = {"filter": "Pass-through (Original)"}

        else:
            raise ValueError(f"Unknown filter mode: {filter_type}")

        latency_ms = (time.perf_counter() - t0) * 1000.0
        meta["latency_ms"] = round(latency_ms, 2)

        self.processed_image = result
        self.processing_meta = meta

        # Clear downstream encryption results to maintain state integrity
        self.ciphertext = None
        self.ciphertext_vis = None
        self.decrypted_image = None
        self.drpe_stages = {}

        return {
            "status": "COMPLETE",
            "metadata": meta,
            "original_image": array_to_base64_png(self.original_image),
            "processed_image": array_to_base64_png(self.processed_image),
        }

    def apply_restoration(
        self, mode: str = "GAUSSIAN", K: float = 0.01, params: dict | None = None
    ) -> dict[str, Any]:
        """Execute Wiener deconvolution image restoration."""
        t0 = time.perf_counter()
        target = (
            self.decrypted_image
            if self.decrypted_image is not None
            else self.processed_image
        )
        if target is None:
            target = self.original_image

        params = params or {}
        k_size = int(params.get("kernel_size", 5))
        sigma = float(params.get("sigma", 1.0))

        restored = apply_deconvolution(
            target,
            mode=mode.upper(),
            kernel_size=k_size,
            sigma=sigma,
            K=K,
        )

        latency_ms = (time.perf_counter() - t0) * 1000.0
        meta = {
            "mode": mode,
            "K": K,
            "kernel_size": k_size,
            "sigma": sigma,
            "latency_ms": round(latency_ms, 2),
        }

        self.restored_image = restored
        self.restoration_meta = meta

        # Quality metrics original vs restored
        mse = calculate_mse(self.original_image, restored)
        psnr = calculate_psnr(self.original_image, restored)
        ssim = calculate_ssim(self.original_image, restored)

        return {
            "status": "COMPLETE",
            "metadata": meta,
            "restored_image": array_to_base64_png(restored),
            "quality": {
                "mse": round(mse, 4),
                "psnr": round(psnr, 2) if not np.isinf(psnr) else "inf",
                "ssim": round(ssim, 4),
            },
        }

    # =========================================================================
    # ENCRYPTION BENCH
    # =========================================================================

    def run_drpe(self, seed1: int = 1234, seed2: int = 5678) -> dict[str, Any]:
        """
        Execute Double Random Phase Encoding (DRPE) and generate optical stages:
        1. Original / Input image
        2. R1 spatial random phase mask
        3. Modulated Fourier plane spectrum (log magnitude)
        4. R2 Fourier random phase mask
        5. Complex ciphertext
        """
        t0 = time.perf_counter()
        img = (
            self.processed_image
            if self.processed_image is not None
            else self.original_image
        )

        key = drpe.DRPEKey(seed1=seed1, seed2=seed2)
        drpe.validate_key(key)

        # 1. R1 phase mask
        r1 = drpe.generate_phase_mask(img.shape, key.seed1)
        r1_phase = np.angle(r1)

        # 2. Spatial modulation & Fourier transform
        spatial_modulated = img * r1
        fourier_plane = np.fft.fft2(spatial_modulated, norm="ortho")

        # 3. R2 phase mask
        r2 = drpe.generate_phase_mask(img.shape, key.seed2)
        r2_phase = np.angle(r2)

        # 4. Frequency modulation & Inverse Fourier transform
        filtered = fourier_plane * r2
        ciphertext = np.fft.ifft2(filtered, norm="ortho")

        # Visual ciphertext
        c_vis = cv2.normalize(np.abs(ciphertext), None, 0, 255, cv2.NORM_MINMAX).astype(
            np.uint8
        )

        latency_ms = (time.perf_counter() - t0) * 1000.0

        # Encode optical stages to base64
        stages = {
            "original": array_to_base64_png(img),
            "r1_phase": phase_to_base64_png(r1_phase),
            "fourier_spectrum": log_spectrum_to_base64_png(fourier_plane),
            "r2_phase": phase_to_base64_png(r2_phase),
            "ciphertext": array_to_base64_png(c_vis),
        }

        self.ciphertext = ciphertext
        self.ciphertext_vis = c_vis
        self.drpe_stages = stages
        self.encryption_meta = {
            "method": "DRPE",
            "seed1": seed1,
            "seed2": seed2,
            "latency_ms": round(latency_ms, 2),
            "complex_stats": {
                "real_min": round(float(np.real(ciphertext).min()), 4),
                "real_max": round(float(np.real(ciphertext).max()), 4),
                "imag_min": round(float(np.imag(ciphertext).min()), 4),
                "imag_max": round(float(np.imag(ciphertext).max()), 4),
            },
        }

        return {
            "status": "COMPLETE",
            "metadata": self.encryption_meta,
            "stages": stages,
            "ciphertext_vis": stages["ciphertext"],
        }

    def run_fourier(self, seed: int = 100) -> dict[str, Any]:
        """Execute Fourier coefficient scrambling encryption."""
        t0 = time.perf_counter()
        img = (
            self.processed_image
            if self.processed_image is not None
            else self.original_image
        )

        key = fourier.FourierKey(seed=seed)
        fourier.validate_key(key)

        unpermuted_coeffs = np.fft.fft2(img, norm="ortho")
        flat = unpermuted_coeffs.flatten()
        perm = fourier.generate_permutation(flat.size, key.seed)
        encrypted_flat = flat[perm]
        encrypted_coeffs = encrypted_flat.reshape(unpermuted_coeffs.shape)
        ciphertext = np.asarray(np.fft.ifft2(encrypted_coeffs, norm="ortho"))

        c_vis = cv2.normalize(
            np.real(ciphertext), None, 0, 255, cv2.NORM_MINMAX
        ).astype(np.uint8)
        c_uri = array_to_base64_png(c_vis)

        spec_vis = log_spectrum_to_base64_png(encrypted_coeffs)
        fft_spec_vis = log_spectrum_to_base64_png(unpermuted_coeffs)

        latency_ms = (time.perf_counter() - t0) * 1000.0

        self.ciphertext = ciphertext
        self.ciphertext_vis = c_vis
        self.encryption_meta = {
            "method": "Fourier",
            "seed": seed,
            "latency_ms": round(latency_ms, 2),
        }

        stages = {
            "original": array_to_base64_png(img),
            "fft_spectrum": fft_spec_vis,
            "permuted_spectrum": spec_vis,
            "ciphertext": c_uri,
        }

        return {
            "status": "COMPLETE",
            "metadata": self.encryption_meta,
            "stages": stages,
            "ciphertext_vis": c_uri,
            "spectrum_vis": spec_vis,
        }

    def run_dct(self, seed: int = 42) -> dict[str, Any]:
        """Execute Discrete Cosine Transform (DCT) permutation encryption."""
        t0 = time.perf_counter()
        img = (
            self.processed_image
            if self.processed_image is not None
            else self.original_image
        )

        key = dct.DCT_Key(seed=seed)
        dct.validate_key(key)

        coeffs = dct.dctn(img, norm="ortho")
        flat = coeffs.flatten()
        perm = dct.generate_permutation(flat.size, key.seed)
        encrypted_flat = flat[perm]
        encrypted_coeffs = encrypted_flat.reshape(coeffs.shape)
        ciphertext = np.asarray(dct.idctn(encrypted_coeffs, norm="ortho"))

        c_vis = cv2.normalize(
            np.real(ciphertext), None, 0, 255, cv2.NORM_MINMAX
        ).astype(np.uint8)
        c_uri = array_to_base64_png(c_vis)

        latency_ms = (time.perf_counter() - t0) * 1000.0

        self.ciphertext = ciphertext
        self.ciphertext_vis = c_vis
        self.encryption_meta = {
            "method": "DCT",
            "seed": seed,
            "latency_ms": round(latency_ms, 2),
        }

        stages = {
            "original": array_to_base64_png(img),
            "dct_basis": dct_spectrum_to_base64_png(coeffs),
            "scrambled_dct": dct_spectrum_to_base64_png(encrypted_coeffs),
            "ciphertext": c_uri,
        }

        return {
            "status": "COMPLETE",
            "metadata": self.encryption_meta,
            "stages": stages,
            "ciphertext_vis": c_uri,
        }

    def run_arnold_xor(self, itr: int = 10, xor_value: int = 0xAA) -> dict[str, Any]:
        """Execute Arnold Cat Map permutation + Bitwise XOR mask."""
        t0 = time.perf_counter()
        img = (
            self.processed_image
            if self.processed_image is not None
            else self.original_image
        )

        # Arnold requires square matrix (NxN)
        h, w = img.shape
        if h != w:
            # Center crop to square
            min_dim = min(h, w)
            start_y = (h - min_dim) // 2
            start_x = (w - min_dim) // 2
            img_square = img[start_y : start_y + min_dim, start_x : start_x + min_dim]
        else:
            img_square = img

        key = arnold_xor.ArnoldXORKey(itr=itr, xor_value=xor_value)
        arnold_xor.validate_key(key)

        scrambled = arnold_xor.arnold_scramble(img_square, key.itr)
        ciphertext = arnold_xor.xor_transform(scrambled, key.xor_value)
        c_vis = np.clip(ciphertext, 0, 255).astype(np.uint8)
        c_uri = array_to_base64_png(c_vis)

        latency_ms = (time.perf_counter() - t0) * 1000.0

        self.ciphertext = ciphertext
        self.ciphertext_vis = ciphertext
        self.encryption_meta = {
            "method": "Arnold-XOR",
            "itr": itr,
            "xor_value": xor_value,
            "latency_ms": round(latency_ms, 2),
            "square_cropped": h != w,
        }

        stages = {
            "original": array_to_base64_png(img_square),
            "arnold_scramble": array_to_base64_png(scrambled),
            "xor_diffusion": c_uri,
            "ciphertext": c_uri,
        }

        return {
            "status": "COMPLETE",
            "metadata": self.encryption_meta,
            "stages": stages,
            "ciphertext_vis": c_uri,
        }

    # =========================================================================
    # DECRYPTION & KEY SENSITIVITY
    # =========================================================================

    def run_decryption(self, method: str, key_params: dict[str, Any]) -> dict[str, Any]:
        """
        Execute decryption with specified key parameters.
        Test correct vs altered/wrong key to show keyspace sensitivity.
        """
        if self.ciphertext is None:
            raise ValueError(
                "No ciphertext available to decrypt. Please run encryption first."
            )

        t0 = time.perf_counter()
        method = method.upper()

        if method == "DRPE":
            seed1 = int(key_params.get("seed1", 1234))
            seed2 = int(key_params.get("seed2", 5678))
            recovered = drpe.decrypt(
                self.ciphertext, drpe.DRPEKey(seed1=seed1, seed2=seed2)
            )

        elif method == "FOURIER":
            seed = int(key_params.get("seed", 100))
            recovered = fourier.decrypt(self.ciphertext, fourier.FourierKey(seed=seed))

        elif method == "DCT":
            seed = int(key_params.get("seed", 42))
            recovered = dct.decrypt(self.ciphertext, dct.DCT_Key(seed=seed))

        elif method in ("ARNOLD_XOR", "ARNOLD-XOR"):
            itr = int(key_params.get("itr", 10))
            xor_val = int(key_params.get("xor_value", 0xAA))
            recovered = arnold_xor.decrypt(
                self.ciphertext, arnold_xor.ArnoldXORKey(itr=itr, xor_value=xor_val)
            )

        else:
            raise ValueError(f"Unknown decryption method: {method}")

        # Post-process recovered image to uint8
        rec_uint8 = np.clip(np.real(recovered), 0, 255).astype(np.uint8)
        latency_ms = (time.perf_counter() - t0) * 1000.0

        self.decrypted_image = rec_uint8
        self.decryption_meta = {
            "method": method,
            "key_params": key_params,
            "latency_ms": round(latency_ms, 2),
        }

        # Compare against input image (processed or original, matched shape)
        ref_img = (
            self.processed_image
            if self.processed_image is not None
            else self.original_image
        )
        if ref_img.shape != rec_uint8.shape:
            # Handle square-cropped images from Arnold-XOR
            h, w = ref_img.shape
            min_dim = min(h, w)
            sy, sx = (h - min_dim) // 2, (w - min_dim) // 2
            ref_img = ref_img[sy : sy + min_dim, sx : sx + min_dim]

        mse = calculate_mse(ref_img, rec_uint8)
        psnr = calculate_psnr(ref_img, rec_uint8)
        ssim = calculate_ssim(ref_img, rec_uint8)

        # Difference map
        diff = np.abs(ref_img.astype(np.float64) - rec_uint8.astype(np.float64))

        return {
            "status": "COMPLETE",
            "metadata": self.decryption_meta,
            "decrypted_image": array_to_base64_png(rec_uint8),
            "diff_heatmap": error_heatmap_to_base64_png(diff),
            "quality": {
                "mse": round(mse, 4),
                "psnr": round(psnr, 2) if not np.isinf(psnr) else "inf",
                "ssim": round(ssim, 4),
            },
        }

    # =========================================================================
    # QUANTITATIVE ANALYSIS BENCH
    # =========================================================================

    def run_analysis(self, diff_x: int = 0, diff_y: int = 0) -> dict[str, Any]:
        """
        Compute full quantitative research cryptanalysis:
        - Information Entropy
        - Adjacent Pixel Correlation (Horizontal, Vertical, Diagonal)
        - Correlation Scatter Samples (2000 pairs each for plaintext and ciphertext)
        - NPCR & UACI (Differential attack sensitivity to single-pixel perturbation)
        - Quality Metrics (MSE, PSNR, SSIM)
        - 256-bin Intensity Histograms
        """
        ref_img = (
            self.processed_image
            if self.processed_image is not None
            else self.original_image
        )
        cipher = self.ciphertext if self.ciphertext is not None else ref_img

        # Entropy
        entropy_plain = calculate_entropy(ref_img)
        entropy_cipher = calculate_entropy(cipher)

        # Correlation
        corr_plain = calculate_correlation(ref_img)
        corr_cipher = calculate_correlation(cipher)

        # Scatter samples
        scatter_plain = sample_correlation_points(ref_img, num_samples=1500)
        scatter_cipher = sample_correlation_points(cipher, num_samples=1500)

        # Histograms
        hist_plain = compute_histogram(ref_img)
        hist_cipher = compute_histogram(cipher)
        hist_decrypted = (
            compute_histogram(self.decrypted_image)
            if self.decrypted_image is not None
            else []
        )

        # Differential attack (NPCR / UACI)
        # Apply 1-pixel change to ref_img at coordinate (diff_y, diff_x)
        h, w = ref_img.shape
        cy = max(0, min(h - 1, diff_y))
        cx = max(0, min(w - 1, diff_x))

        alt_img = ref_img.copy()
        alt_img[cy, cx] = (int(alt_img[cy, cx]) + 1) % 256

        # Encrypt altered image using current method & key
        method = self.encryption_meta.get("method", "DRPE")
        if method == "DRPE":
            s1 = self.encryption_meta.get("seed1", 1234)
            s2 = self.encryption_meta.get("seed2", 5678)
            alt_cipher = drpe.encrypt(alt_img, drpe.DRPEKey(s1, s2))
        elif method == "FOURIER":
            s = self.encryption_meta.get("seed", 100)
            alt_cipher = fourier.encrypt(alt_img, fourier.FourierKey(s))
        elif method == "DCT":
            s = self.encryption_meta.get("seed", 42)
            alt_cipher = dct.encrypt(alt_img, dct.DCT_Key(s))
        elif method == "Arnold-XOR":
            itr = self.encryption_meta.get("itr", 10)
            xor_v = self.encryption_meta.get("xor_value", 0xAA)
            alt_cipher = arnold_xor.encrypt(
                alt_img, arnold_xor.ArnoldXORKey(itr, xor_v)
            )
        else:
            alt_cipher = cipher

        # If shapes match, calculate NPCR & UACI
        if cipher.shape == alt_cipher.shape:
            npcr_val = calculate_npcr(cipher, alt_cipher)
            uaci_val = calculate_uaci(cipher, alt_cipher)
        else:
            npcr_val = 0.0
            uaci_val = 0.0

        # Quality metrics (Original vs Decrypted / Restored)
        comp_target = (
            self.decrypted_image if self.decrypted_image is not None else cipher
        )
        if ref_img.shape == comp_target.shape:
            mse_val = calculate_mse(ref_img, comp_target)
            psnr_val = calculate_psnr(ref_img, comp_target)
            ssim_val = calculate_ssim(ref_img, comp_target)
        else:
            mse_val = 0.0
            psnr_val = 0.0
            ssim_val = 0.0

        return {
            "entropy": {
                "plain": round(entropy_plain, 4),
                "cipher": round(entropy_cipher, 4),
                "theoretical_ideal": 8.0000,
            },
            "correlation": {
                "plain": {k: round(v, 4) for k, v in corr_plain.items()},
                "cipher": {k: round(v, 4) for k, v in corr_cipher.items()},
            },
            "scatter": {
                "plain": scatter_plain,
                "cipher": scatter_cipher,
            },
            "differential": {
                "perturbed_coord": f"({cx}, {cy})",
                "npcr": round(npcr_val, 2),
                "uaci": round(uaci_val, 2),
                "ideal_npcr": 99.61,
                "ideal_uaci": 33.46,
            },
            "quality": {
                "mse": round(mse_val, 4),
                "psnr": round(psnr_val, 2) if not np.isinf(psnr_val) else "inf",
                "ssim": round(ssim_val, 4),
            },
            "histograms": {
                "plain": hist_plain,
                "cipher": hist_cipher,
                "decrypted": hist_decrypted,
            },
        }

    # =========================================================================
    # MULTI-ALGORITHM BENCHMARK MATRIX
    # =========================================================================

    def run_benchmark(self) -> dict[str, Any]:
        """
        Execute comprehensive comparative evaluation across all 4 encryption algorithms:
        Arnold+XOR, DCT, Fourier, and DRPE on current image.
        """
        img = (
            self.processed_image
            if self.processed_image is not None
            else self.original_image
        )
        h, w = img.shape

        # Make sure square for Arnold
        if h != w:
            min_dim = min(h, w)
            sy, sx = (h - min_dim) // 2, (w - min_dim) // 2
            test_img = img[sy : sy + min_dim, sx : sx + min_dim]
        else:
            test_img = img

        alt_img = test_img.copy()
        alt_img[0, 0] = (int(alt_img[0, 0]) + 1) % 256

        algorithms = [
            {
                "id": "arnold_xor",
                "name": "Arnold-XOR",
                "domain": "Spatial (Toral Automorphism)",
                "key_desc": "itr=10, xor=0xAA",
                "encrypt_fn": lambda im: arnold_xor.encrypt(
                    im, arnold_xor.ArnoldXORKey(10, 0xAA)
                ),
                "decrypt_fn": lambda c: arnold_xor.decrypt(
                    c, arnold_xor.ArnoldXORKey(10, 0xAA)
                ),
            },
            {
                "id": "dct",
                "name": "DCT Permutation",
                "domain": "Frequency (Cosine Transform)",
                "key_desc": "seed=42",
                "encrypt_fn": lambda im: dct.encrypt(im, dct.DCT_Key(42)),
                "decrypt_fn": lambda c: dct.decrypt(c, dct.DCT_Key(42)),
            },
            {
                "id": "fourier",
                "name": "Fourier Scrambling",
                "domain": "Frequency (DFT)",
                "key_desc": "seed=100",
                "encrypt_fn": lambda im: fourier.encrypt(im, fourier.FourierKey(100)),
                "decrypt_fn": lambda c: fourier.decrypt(c, fourier.FourierKey(100)),
            },
            {
                "id": "drpe",
                "name": "DRPE Optical",
                "domain": "Dual Phase-Space (Optical 4f)",
                "key_desc": "s1=1234, s2=5678",
                "encrypt_fn": lambda im: drpe.encrypt(im, drpe.DRPEKey(1234, 5678)),
                "decrypt_fn": lambda c: drpe.decrypt(c, drpe.DRPEKey(1234, 5678)),
            },
        ]

        results = []
        for algo in algorithms:
            t0 = time.perf_counter()
            c1 = algo["encrypt_fn"](test_img)
            enc_time = (time.perf_counter() - t0) * 1000.0

            c2 = algo["encrypt_fn"](alt_img)

            t1 = time.perf_counter()
            dec = algo["decrypt_fn"](c1)
            dec_time = (time.perf_counter() - t1) * 1000.0

            # Normalization for preview
            c_vis = cv2.normalize(np.real(c1), None, 0, 255, cv2.NORM_MINMAX).astype(
                np.uint8
            )
            dec_vis = np.clip(np.real(dec), 0, 255).astype(np.uint8)

            # Analysis metrics
            ent = calculate_entropy(c1)
            corr = calculate_correlation(c1)
            npcr_val = calculate_npcr(c1, c2)
            uaci_val = calculate_uaci(c1, c2)
            mse_val = calculate_mse(test_img, dec_vis)
            psnr_val = calculate_psnr(test_img, dec_vis)
            ssim_val = calculate_ssim(test_img, dec_vis)

            results.append(
                {
                    "id": algo["id"],
                    "name": algo["name"],
                    "domain": algo["domain"],
                    "key": algo["key_desc"],
                    "entropy": round(ent, 4),
                    "h_corr": round(corr["horizontal"], 4),
                    "v_corr": round(corr["vertical"], 4),
                    "d_corr": round(corr["diagonal"], 4),
                    "npcr": round(npcr_val, 2),
                    "uaci": round(uaci_val, 2),
                    "mse": round(mse_val, 4),
                    "psnr": round(psnr_val, 2) if not np.isinf(psnr_val) else "inf",
                    "ssim": round(ssim_val, 4),
                    "enc_time_ms": round(enc_time, 2),
                    "dec_time_ms": round(dec_time, 2),
                    "ciphertext_preview": array_to_base64_png(c_vis),
                    "decrypted_preview": array_to_base64_png(dec_vis),
                }
            )

        return {
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
            "image_name": self.image_name,
            "dimensions": f"{test_img.shape[1]} × {test_img.shape[0]}",
            "results": results,
        }
