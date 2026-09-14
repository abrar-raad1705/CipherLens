import numpy as np

from batsignal.encryption.fourier import FourierKey, decrypt, encrypt


def test_fourier():
    image = np.arange(64 * 64, dtype=np.uint8).reshape(64, 64)
    key = FourierKey(10)
    cipher = encrypt(image, key)
    recovered = decrypt(cipher, key)
    assert np.allclose(
        image,
        recovered,
        atol=1e-5,
    )
