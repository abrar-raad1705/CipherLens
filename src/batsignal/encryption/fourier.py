import numpy as np


def encrypt(
    image: np.ndarray,
    key,
) -> np.ndarray:
    """
    Encrypt an image using Fourier.
    """
    raise NotImplementedError


def decrypt(
    ciphertext: np.ndarray,
    key,
) -> np.ndarray:
    """
    Decrypt a Fourier ciphertext.
    """
    raise NotImplementedError