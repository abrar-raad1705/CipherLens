import numpy as np
import pytest

from batsignal.encryption.spectral_hybrid import (
    SpectralHybridKey,
    decrypt,
    encrypt,
    normalize_key,
    validate_key,
)


def test_spectral_hybrid_encryption_decryption():
    image = np.random.randint(0, 256, (64, 64), dtype=np.uint8)
    key = SpectralHybridKey(scramble_seed=42, mask_seed=99, kernel_seed=7)

    cipher = encrypt(image, key)
    recovered = decrypt(cipher, key)
    recovered_vis = np.clip(np.round(recovered), 0, 255).astype(np.uint8)

    assert cipher.dtype == np.complex128
    # Round-trip recovery check
    assert np.allclose(image, recovered_vis, atol=2)


def test_spectral_hybrid_key_normalization():
    k1 = normalize_key(SpectralHybridKey(10, 20, 30))
    assert k1 == SpectralHybridKey(10, 20, 30)

    k2 = normalize_key((1, 2, 3))
    assert k2 == SpectralHybridKey(1, 2, 3)

    k3 = normalize_key({"scramble_seed": 5, "mask_seed": 6, "kernel_seed": 7})
    assert k3 == SpectralHybridKey(5, 6, 7)


def test_spectral_hybrid_key_validation():
    validate_key(SpectralHybridKey(0, 0, 0))

    with pytest.raises(ValueError):
        validate_key(SpectralHybridKey(-1, 0, 0))
