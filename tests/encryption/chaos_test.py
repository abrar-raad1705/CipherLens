import numpy as np
import pytest

from batsignal.encryption.chaos import (
    ChaosKey,
    decrypt,
    encrypt,
    generate_chaotic_sequence,
    generate_keystream,
    normalize_key,
    validate_key,
)


def test_chaos_encryption_decryption():
    image = np.arange(64 * 64, dtype=np.uint8).reshape(64, 64)
    key = ChaosKey(x0=0.35, r=3.9)
    cipher = encrypt(image, key)
    recovered = decrypt(cipher, key)

    assert not np.array_equal(image, cipher)
    assert np.array_equal(image, recovered)
    assert cipher.dtype == np.uint8
    assert recovered.dtype == np.uint8


def test_chaos_non_square():
    image = np.random.randint(0, 256, (32, 48), dtype=np.uint8)
    key = ChaosKey(x0=0.42, r=3.85)
    cipher = encrypt(image, key)
    recovered = decrypt(cipher, key)

    assert cipher.shape == (32, 48)
    assert np.array_equal(image, recovered)


def test_chaos_key_normalization():
    k1 = normalize_key(ChaosKey(0.1, 3.7))
    assert k1 == ChaosKey(0.1, 3.7)

    k2 = normalize_key((0.2, 3.8))
    assert k2 == ChaosKey(0.2, 3.8)

    k3 = normalize_key([0.3, 3.9])
    assert k3 == ChaosKey(0.3, 3.9)

    k4 = normalize_key({"x0": 0.4, "r": 3.95})
    assert k4 == ChaosKey(0.4, 3.95)

    with pytest.raises(TypeError):
        normalize_key("invalid")


def test_chaos_key_validation():
    # Valid
    validate_key(ChaosKey(0.001, 3.5))
    validate_key(ChaosKey(0.999, 4.0))

    # Invalid x0
    with pytest.raises(ValueError, match="x0"):
        validate_key(ChaosKey(0.0, 3.9))

    with pytest.raises(ValueError, match="x0"):
        validate_key(ChaosKey(1.0, 3.9))

    with pytest.raises(ValueError, match="x0"):
        validate_key(ChaosKey(-0.1, 3.9))

    # Invalid r
    with pytest.raises(ValueError, match="r"):
        validate_key(ChaosKey(0.5, 3.49))

    with pytest.raises(ValueError, match="r"):
        validate_key(ChaosKey(0.5, 4.01))


def test_generate_chaotic_sequence_and_keystream():
    seq = generate_chaotic_sequence(1000, 0.4, 3.9)
    assert len(seq) == 1000
    assert np.all(seq > 0.0) and np.all(seq < 1.0)

    keystream = generate_keystream(seq)
    assert keystream.shape == (1000,)
    assert keystream.dtype == np.uint8
    assert np.all(keystream >= 0) and np.all(keystream <= 255)
