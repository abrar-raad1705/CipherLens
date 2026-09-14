from dataclasses import dataclass
from scipy.fft import fft2, ifft2

import numpy as np


@dataclass(frozen=True)
class FourierKey:
    seed: int


def validate_key(key: FourierKey) -> None:
    if key.seed < 0:
        raise ValueError("Seed can't be negative!")


def generate_permutation(size: int, seed: int) -> np.ndarray:
    rng = np.random.default_rng(seed)
    return rng.permutation(size)


def encrypt(image: np.ndarray, key: FourierKey) -> np.ndarray:
    """
    Encrypt an image using Fourier transform coefficient permutation.
    """
    validate_key(key)
    coeffs = fft2(image, norm="ortho")
    flat = coeffs.flatten()

    permutation = generate_permutation(flat.size, key.seed)
    encrypted_flat = flat[permutation]
    encrypted_coeffs = encrypted_flat.reshape(coeffs.shape)

    return np.asarray(ifft2(encrypted_coeffs, norm="ortho"))


def decrypt(ciphertext: np.ndarray, key: FourierKey) -> np.ndarray:
    """
    Decrypt a Fourier ciphertext.
    """
    validate_key(key)
    encrypted_coeffs = fft2(ciphertext, norm="ortho")
    flat = encrypted_coeffs.flatten()

    permutation = generate_permutation(flat.size, key.seed)
    inverse = np.empty_like(permutation)
    inverse[permutation] = np.arange(flat.size)
    original_flat = flat[inverse]

    original_coeffs = original_flat.reshape(encrypted_coeffs.shape)
    return np.asarray(np.real(ifft2(original_coeffs, norm="ortho")))
