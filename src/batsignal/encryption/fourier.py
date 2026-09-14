from dataclasses import dataclass

import numpy as np
from scipy.fft import fft2, ifft2


@dataclass(frozen=True)
class FourierKey:
    seed: int


def normalize_key(key: FourierKey | int) -> FourierKey:
    if isinstance(key, FourierKey):
        return key
    if isinstance(key, int):
        return FourierKey(key)
    raise TypeError(f"Invalid key type for Fourier: {type(key)}")


def validate_key(key: FourierKey) -> None:
    if key.seed < 0:
        raise ValueError("Seed can't be negative!")


def generate_permutation(size: int, seed: int) -> np.ndarray:
    rng = np.random.default_rng(seed)
    return rng.permutation(size)


def encrypt(image: np.ndarray, key: FourierKey | int) -> np.ndarray:
    """
    Encrypt an image using Fourier transform coefficient permutation.
    """
    norm_key = normalize_key(key)
    validate_key(norm_key)
    coeffs = fft2(image, norm="ortho")
    flat = coeffs.flatten()

    permutation = generate_permutation(flat.size, norm_key.seed)
    encrypted_flat = flat[permutation]
    encrypted_coeffs = encrypted_flat.reshape(coeffs.shape)

    return np.asarray(ifft2(encrypted_coeffs, norm="ortho"))


def decrypt(ciphertext: np.ndarray, key: FourierKey | int) -> np.ndarray:
    """
    Decrypt a Fourier ciphertext.
    """
    norm_key = normalize_key(key)
    validate_key(norm_key)
    encrypted_coeffs = fft2(ciphertext, norm="ortho")
    flat = encrypted_coeffs.flatten()

    permutation = generate_permutation(flat.size, norm_key.seed)
    inverse = np.empty_like(permutation)
    inverse[permutation] = np.arange(flat.size)
    original_flat = flat[inverse]

    original_coeffs = original_flat.reshape(encrypted_coeffs.shape)
    return np.asarray(np.real(ifft2(original_coeffs, norm="ortho")))
