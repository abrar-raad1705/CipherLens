import numpy as np
import pytest

from batsignal.encryption.feistel import (
    FeistelKey,
    decrypt,
    encrypt,
    normalize_key,
    validate_key,
)


def test_feistel_encryption_decryption():
    image = np.random.randint(0, 256, (64, 64), dtype=np.uint8)
    key = FeistelKey(seed=42, rounds=6)

    cipher = encrypt(image, key)
    recovered = decrypt(cipher, key)

    assert not np.array_equal(image, cipher)
    assert np.array_equal(image, recovered)
    assert cipher.dtype == np.uint8
    assert recovered.dtype == np.uint8


def test_feistel_odd_height():
    image = np.random.randint(0, 256, (33, 40), dtype=np.uint8)
    key = FeistelKey(seed=123, rounds=4)

    cipher = encrypt(image, key)
    recovered = decrypt(cipher, key, target_shape=image.shape)

    assert recovered.shape == (33, 40)
    assert np.array_equal(image, recovered)


def test_feistel_key_normalization():
    k1 = normalize_key(FeistelKey(10, 8))
    assert k1 == FeistelKey(10, 8)

    k2 = normalize_key((5, 10))
    assert k2 == FeistelKey(5, 10)

    k3 = normalize_key({"seed": 42, "rounds": 12})
    assert k3 == FeistelKey(42, 12)


def test_feistel_key_validation():
    validate_key(FeistelKey(0, 4))
    validate_key(FeistelKey(100, 16))

    with pytest.raises(ValueError):
        validate_key(FeistelKey(-1, 8))

    with pytest.raises(ValueError):
        validate_key(FeistelKey(10, 3))

    with pytest.raises(ValueError):
        validate_key(FeistelKey(10, 17))
