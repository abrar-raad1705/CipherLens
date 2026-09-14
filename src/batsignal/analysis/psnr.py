import numpy as np

from .mse import calculate_mse


def calculate_psnr(original: np.ndarray, recovered: np.ndarray) -> float:
    """
    Peak Signal-to-Noise Ratio (PSNR) in decibels (dB).
    """
    mse = calculate_mse(original, recovered)
    if mse == 0:
        return float("inf")

    max_val = 255.0 if np.issubdtype(original.dtype, np.integer) else 1.0
    psnr = 20.0 * np.log10(max_val / np.sqrt(mse))
    return float(psnr)
