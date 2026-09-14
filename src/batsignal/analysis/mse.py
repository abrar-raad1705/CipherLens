import numpy as np


def calculate_mse(original: np.ndarray, recovered: np.ndarray) -> float:
    """
    Mean Squared Error (MSE) between original and recovered image.
    """
    if original.shape != recovered.shape:
        raise ValueError("Inputs must have identical shapes.")

    orig = original.astype(np.float64)
    rec = recovered.astype(np.float64)

    mse = np.mean((orig - rec) ** 2)
    return float(mse)
