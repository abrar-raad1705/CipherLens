import numpy as np


def calculate_npcr(ciphertext1: np.ndarray, ciphertext2: np.ndarray) -> float:
    """
    Number of Pixels Change Rate (NPCR) in percentage.
    Measures percentage of different pixels between two ciphertexts.
    """
    if ciphertext1.shape != ciphertext2.shape:
        raise ValueError("Inputs must have identical shapes.")

    if np.iscomplexobj(ciphertext1):
        ciphertext1 = np.abs(ciphertext1)
    if np.iscomplexobj(ciphertext2):
        ciphertext2 = np.abs(ciphertext2)

    diff = (ciphertext1 != ciphertext2).astype(np.float64)
    npcr = (np.sum(diff) / diff.size) * 100.0
    return float(npcr)
