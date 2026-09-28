import numpy as np

from batsignal.encryption.dct import DCT_Key, decrypt, encrypt


def test_dct():
    image = np.arange(64 * 64, dtype=np.uint8).reshape(64, 64)
    key = DCT_Key(42)
    cipher = encrypt(image, key)
    recovered = decrypt(cipher, key)
    assert np.allclose(
        image,
        recovered,
        atol=1e-5,
    )
