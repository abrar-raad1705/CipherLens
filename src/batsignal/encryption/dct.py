import numpy as np


def encrypt(
    image: np.ndarray,
    key,
) -> np.ndarray:
    """
    Encrypt an image using DCT.
    """
    raise NotImplementedError


def decrypt(
    ciphertext: np.ndarray,
    key,
) -> np.ndarray:
    """
    Decrypt a DCT ciphertext.
    """
    raise NotImplementedError