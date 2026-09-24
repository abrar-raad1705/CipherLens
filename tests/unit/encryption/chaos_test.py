import numpy as np

from batsignal.encryption.chaos import ChaosKey, decrypt, encrypt


def test_chaos():
    image = np.arange(64 * 64, dtype=np.uint8).reshape(64, 64)
    key = ChaosKey(0.35, 3.9)
    cipher = encrypt(image, key)
    recovered = decrypt(cipher, key)
    assert np.array_equal(image, recovered)
