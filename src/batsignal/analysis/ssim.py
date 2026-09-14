import numpy as np


def calculate_ssim(original: np.ndarray, recovered: np.ndarray) -> float:
    """
    Structural Similarity Index (SSIM) between original and recovered images.
    """
    if original.shape != recovered.shape:
        raise ValueError("Inputs must have identical shapes.")

    orig = original.astype(np.float64)
    rec = recovered.astype(np.float64)

    max_val = 255.0 if np.issubdtype(original.dtype, np.integer) else 1.0
    c1 = (0.01 * max_val) ** 2
    c2 = (0.03 * max_val) ** 2

    mu_x = np.mean(orig)
    mu_y = np.mean(rec)

    sigma_x_sq = np.var(orig, ddof=1)
    sigma_y_sq = np.var(rec, ddof=1)
    sigma_xy = np.cov(orig.ravel(), rec.ravel())[0, 1]

    numerator = (2.0 * mu_x * mu_y + c1) * (2.0 * sigma_xy + c2)
    denominator = (mu_x**2 + mu_y**2 + c1) * (sigma_x_sq + sigma_y_sq + c2)

    return float(numerator / denominator)
