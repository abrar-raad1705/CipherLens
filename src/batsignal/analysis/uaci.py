import numpy as np


def calculate_uaci(ciphertext1: np.ndarray, ciphertext2: np.ndarray) -> float:
    """
    Unified Average Changing Intensity (UACI) in percentage.
    Measures the average intensity of differences between two ciphertexts.
    """
    if ciphertext1.shape != ciphertext2.shape:
        raise ValueError("Inputs must have identical shapes.")

    c1 = ciphertext1.astype(np.float64)
    c2 = ciphertext2.astype(np.float64)

    # Determine dynamic range max value F (usually 255 for uint8)
    max_val = 255.0 if np.issubdtype(ciphertext1.dtype, np.integer) else 1.0

    abs_diff = np.abs(c1 - c2)
    uaci = (np.sum(abs_diff) / (max_val * c1.size)) * 100.0
    return float(uaci)
