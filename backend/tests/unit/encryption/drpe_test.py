import numpy as np

from batsignal.encryption.drpe import DRPEKey, decrypt, encrypt


def test_drpe():
    image = np.arange(64 * 64, dtype=np.uint8).reshape(64, 64)
    key = DRPEKey(10, 20)
    cipher = encrypt(image, key)
    recovered = decrypt(cipher, key)
    assert np.allclose(
        image,
        recovered,
        atol=1e-5,
    )
