from dataclasses import dataclass

import numpy as np
from scipy.signal import fftconvolve


@dataclass(frozen=True)
class SpectralHybridKey:
    scramble_seed: int
    mask_seed: int
    kernel_seed: int


SpectralHybrid_Key = SpectralHybridKey


def normalize_key(
    key: SpectralHybridKey | tuple | list | dict,
) -> SpectralHybridKey:
    if isinstance(key, SpectralHybridKey):
        return key
    if isinstance(key, (tuple, list)) and len(key) == 3:
        return SpectralHybridKey(int(key[0]), int(key[1]), int(key[2]))
    if isinstance(key, dict):
        scramble = key.get("scramble_seed", key.get("scrambleSeed"))
        mask = key.get("mask_seed", key.get("maskSeed"))
        kernel = key.get("kernel_seed", key.get("kernelSeed"))
        if scramble is not None and mask is not None and kernel is not None:
            return SpectralHybridKey(int(scramble), int(mask), int(kernel))
    raise TypeError(f"Invalid key type for Spectral Hybrid: {type(key)}")


def validate_key(key: SpectralHybridKey) -> None:
    if key.scramble_seed < 0 or key.mask_seed < 0 or key.kernel_seed < 0:
        raise ValueError("Seeds must be non-negative!")


def generate_permutation(size: int, seed: int) -> np.ndarray:
    rng = np.random.default_rng(seed)
    return rng.permutation(size)


def generate_phase_mask(shape: tuple[int, ...], seed: int) -> np.ndarray:
    rng = np.random.default_rng(seed)
    return np.exp(1j * 2 * np.pi * rng.random(shape))


def generate_kernel(seed: int, size: int = 3) -> np.ndarray:
    rng = np.random.default_rng(seed)
    kernel = rng.random((size, size))
    return kernel / kernel.sum()


def pad_kernel(kernel: np.ndarray, shape: tuple[int, ...]) -> np.ndarray:
    kh, kw = kernel.shape
    padded = np.zeros(shape, dtype=np.float64)
    padded[:kh, :kw] = kernel
    padded = np.roll(padded, -(kh // 2), axis=0)
    padded = np.roll(padded, -(kw // 2), axis=1)
    return padded


def encrypt(
    image: np.ndarray, key: SpectralHybridKey | tuple | list | dict
) -> np.ndarray:
    """
    Encrypt an image using Spectral Hybrid cipher.
    """
    norm_key = normalize_key(key)
    validate_key(norm_key)

    flat = image.flatten()
    permutation = generate_permutation(flat.size, norm_key.scramble_seed)
    scrambled = flat[permutation].reshape(image.shape)

    coeffs = np.fft.fft2(scrambled, norm="ortho")
    phase_mask = generate_phase_mask(image.shape, norm_key.mask_seed)
    modulated = coeffs * phase_mask

    spatial = np.fft.ifft2(modulated, norm="ortho")

    kernel = generate_kernel(norm_key.kernel_seed)
    padded_k = pad_kernel(kernel, image.shape)
    fft_k = np.fft.fft2(padded_k)
    fft_sp = np.fft.fft2(spatial)

    ciphertext = np.fft.ifft2(fft_sp * fft_k)

    return np.asarray(ciphertext, dtype=np.complex128)


def decrypt(
    ciphertext: np.ndarray, key: SpectralHybridKey | tuple | list | dict
) -> np.ndarray:
    """
    Decrypt a Spectral Hybrid ciphertext.
    """
    norm_key = normalize_key(key)
    validate_key(norm_key)

    kernel = generate_kernel(norm_key.kernel_seed)
    padded_k = pad_kernel(kernel, ciphertext.shape)
    fft_k = np.fft.fft2(padded_k)
    epsilon = 1e-10

    fft_c = np.fft.fft2(ciphertext)
    spatial = np.fft.ifft2(fft_c / (fft_k + epsilon))

    coeffs = np.fft.fft2(spatial, norm="ortho")
    phase_mask = generate_phase_mask(ciphertext.shape, norm_key.mask_seed)
    demodulated = coeffs * np.conj(phase_mask)

    scrambled = np.real(np.fft.ifft2(demodulated, norm="ortho"))

    flat = scrambled.flatten()
    permutation = generate_permutation(flat.size, norm_key.scramble_seed)
    inverse = np.empty_like(permutation)
    inverse[permutation] = np.arange(flat.size)
    original_flat = flat[inverse]

    return np.asarray(original_flat.reshape(ciphertext.shape), dtype=np.float64)
