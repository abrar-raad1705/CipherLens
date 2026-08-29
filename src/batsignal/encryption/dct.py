from dataclasses import dataclass

import numpy as np
from scipy.fft import dctn, idctn


@dataclass(frozen=True)
class DCT_Key:
    seed: int


def validate_key(key: DCT_Key) -> None:
    if key.seed < 0:
        raise ValueError("Seed can't be negative!")


def generate_permutation(size: int, seed: int) -> np.ndarray:
    rng = np.random.default_rng(seed)
    return rng.permutation(size)


def encrypt(image: np.ndarray, key: DCT_Key) -> np.ndarray:
    """
    Encrypt an image using DCT.
    """
    validate_key(key)
    coeffs = dctn(image, norm="ortho")
    flat = coeffs.flatten()

    permutation = generate_permutation(flat.size, key.seed)
    encrypted_flat = flat[permutation]
    encrypted_coeffs = encrypted_flat.reshape(coeffs.shape)

    return np.asarray(idctn(encrypted_coeffs, norm="ortho"))


def decrypt(ciphertext: np.ndarray, key: DCT_Key) -> np.ndarray:
    """
    Decrypt a DCT ciphertext.
    """
    validate_key(key)
    encrypted_coeffs = dctn(ciphertext, norm="ortho")
    flat = encrypted_coeffs.flatten()

    permutation = generate_permutation(flat.size, key.seed)
    inverse = np.empty_like(permutation)
    inverse[permutation] = np.arange(flat.size)
    original_flat = flat[inverse]

    original_coeffs = original_flat.reshape(encrypted_coeffs.shape)
    return np.asarray(idctn(original_coeffs, norm="ortho"))
