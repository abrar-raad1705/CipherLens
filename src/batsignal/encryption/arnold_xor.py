from dataclasses import dataclass

import numpy as np


@dataclass(frozen=True)
class ArnoldXORKey:
    itr: int
    xor_value: int


def normalize_key(key: ArnoldXORKey | tuple | list) -> ArnoldXORKey:
    if isinstance(key, ArnoldXORKey):
        return key
    if isinstance(key, (tuple, list)):
        if len(key) == 2:
            return ArnoldXORKey(int(key[0]), int(key[1]))
        elif len(key) == 4:
            return ArnoldXORKey(int(key[2]), int(key[3]))
    raise TypeError(f"Invalid key type for Arnold+XOR: {type(key)}")


def validate_key(key: ArnoldXORKey) -> None:
    if key.itr < 0:
        raise ValueError("Iterations must be non-negative")
    if not 0 <= key.xor_value <= 255:
        raise ValueError("XOR value must be between 0 and 255")


def one_arnold_step(image: np.ndarray) -> np.ndarray:
    n = image.shape[0]
    scrambled = np.empty_like(image)

    for x in range(n):
        for y in range(n):
            x_n = (x + y) % n
            y_n = (x + 2 * y) % n
            scrambled[x_n, y_n] = image[x, y]

    return scrambled


def arnold_scramble(image: np.ndarray, itr: int) -> np.ndarray:
    img = image.copy()

    for _ in range(itr):
        img = one_arnold_step(img)

    return img


def one_reverse_arnold_step(image: np.ndarray) -> np.ndarray:
    n = image.shape[0]
    real = np.empty_like(image)

    for x in range(n):
        for y in range(n):
            x_real = (2 * x - y) % n
            y_real = (y - x) % n
            real[x_real, y_real] = image[x, y]

    return real


def arnold_unscramble(image: np.ndarray, itr: int) -> np.ndarray:
    img = image.copy()

    for _ in range(itr):
        img = one_reverse_arnold_step(img)

    return img


def xor_transform(image: np.ndarray, xor_value: int) -> np.ndarray:
    return np.bitwise_xor(image, np.uint8(xor_value))


def encrypt(image: np.ndarray, key: ArnoldXORKey | tuple | list) -> np.ndarray:
    """
    Encrypt an image using Arnold + XOR.
    """
    norm_key = normalize_key(key)
    validate_key(norm_key)
    scrambled = arnold_scramble(image, norm_key.itr)
    return xor_transform(scrambled, norm_key.xor_value)


def decrypt(ciphertext: np.ndarray, key: ArnoldXORKey | tuple | list) -> np.ndarray:
    """
    Decrypt a Arnold + XOR ciphertext.
    """
    norm_key = normalize_key(key)
    validate_key(norm_key)
    xored = xor_transform(ciphertext, norm_key.xor_value)
    return arnold_unscramble(xored, norm_key.itr)


def encrypt_arnold_chacha(
    image: np.ndarray, itr: int, chacha_key: bytes, nonce: bytes
) -> tuple[np.ndarray, np.ndarray]:
    """
    Encrypt using Arnold cat map shearing followed by ChaCha20 keystream XOR diffusion.

    :param image: 2D uint8 square image
    :param itr: Number of Arnold iterations
    :param chacha_key: 32-byte ChaCha20 key
    :param nonce: 16-byte nonce
    :return: (scrambled, ciphertext) tuple of 2D uint8 arrays
    """
    if itr < 0:
        raise ValueError("Iterations must be non-negative")
    from batsignal.crypto.chacha import apply_chacha20_xor

    scrambled = arnold_scramble(image, itr)
    ciphertext = apply_chacha20_xor(scrambled, chacha_key, nonce)
    return scrambled, ciphertext


def decrypt_arnold_chacha(
    ciphertext: np.ndarray, itr: int, chacha_key: bytes, nonce: bytes
) -> tuple[np.ndarray, np.ndarray]:
    """
    Decrypt Arnold + ChaCha20 ciphertext by inverting ChaCha20 XOR then inverse Arnold shearing.

    :param ciphertext: 2D uint8 square ciphertext
    :param itr: Number of Arnold iterations
    :param chacha_key: 32-byte ChaCha20 key
    :param nonce: 16-byte nonce
    :return: (unxored, recovered) tuple of 2D uint8 arrays
    """
    if itr < 0:
        raise ValueError("Iterations must be non-negative")
    from batsignal.crypto.chacha import apply_chacha20_xor

    unxored = apply_chacha20_xor(ciphertext, chacha_key, nonce)
    recovered = arnold_unscramble(unxored, itr)
    return unxored, recovered

