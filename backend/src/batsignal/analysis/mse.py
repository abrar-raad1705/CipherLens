import numpy as np


def calculate_mse(original: np.ndarray, recovered: np.ndarray) -> float:
    """
    Mean Squared Error (MSE) between original and recovered image.
    """
    if original.shape != recovered.shape:
        raise ValueError("Inputs must have identical shapes.")

    if np.iscomplexobj(original):
        original = np.abs(original)
    if np.iscomplexobj(recovered):
        recovered = np.abs(recovered)

    orig = original.astype(np.float64)
    rec = recovered.astype(np.float64)

    mse = np.mean((orig - rec) ** 2)
    return float(mse)
