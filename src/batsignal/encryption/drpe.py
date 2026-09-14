from dataclasses import dataclass

import numpy as np
from scipy.fft import fft2, ifft2


@dataclass(frozen=True)
class DRPEKey:
    seed1: int
    seed2: int

    @property
    def seed_spatial(self) -> int:
        return self.seed1

    @property
    def seed_fourier(self) -> int:
        return self.seed2


DRPE_Key = DRPEKey


def validate_key(key: DRPEKey) -> None:
    if key.seed1 < 0 or key.seed2 < 0:
        raise ValueError("Seeds must be non-negative!")


def generate_phase_mask(shape: tuple[int, ...], seed: int) -> np.ndarray:
    rng = np.random.default_rng(seed)
    phase = rng.uniform(0.0, 2.0 * np.pi, size=shape)
    return np.exp(1j * phase)


def encrypt(image: np.ndarray, key: DRPEKey) -> np.ndarray:
    """
    Encrypt an image using Double Random Phase Encoding (DRPE).
    """
    validate_key(key)
    r1 = generate_phase_mask(image.shape, key.seed1)
    r2 = generate_phase_mask(image.shape, key.seed2)

    spatial_modulated = image * r1
    fourier_plane = fft2(spatial_modulated, norm="ortho")
    filtered = fourier_plane * r2

    return np.asarray(ifft2(filtered, norm="ortho"))


def decrypt(ciphertext: np.ndarray, key: DRPEKey) -> np.ndarray:
    """
    Decrypt a DRPE ciphertext.
    """
    validate_key(key)
    r1 = generate_phase_mask(ciphertext.shape, key.seed1)
    r2 = generate_phase_mask(ciphertext.shape, key.seed2)

    fourier_plane = fft2(ciphertext, norm="ortho")
    demodulated_fourier = fourier_plane * np.conj(r2)
    demodulated_spatial = ifft2(demodulated_fourier, norm="ortho")

    recovered = np.real(demodulated_spatial * np.conj(r1))
    return np.asarray(recovered)
