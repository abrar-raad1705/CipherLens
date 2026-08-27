import numpy as np


def encrypt(
    image: np.ndarray,
    key,
) -> np.ndarray:
    """
    Encrypt an image using Arnold + XOR.
    """
    raise NotImplementedError


def decrypt(
    ciphertext: np.ndarray,
    key,
) -> np.ndarray:
    """
    Decrypt a Arnold + XOR ciphertext.
    """
    raise NotImplementedError