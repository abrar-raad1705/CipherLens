from dataclasses import dataclass

import numpy as np


@dataclass(frozen=True)
class ArnoldXORKey:
    itr: int
    xor_value: int


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


def encrypt(image: np.ndarray, key: ArnoldXORKey) -> np.ndarray:
    """
    Encrypt an image using Arnold + XOR.
    """
    validate_key(key)
    scrambled = arnold_scramble(image, key.itr)
    return xor_transform(scrambled, key.xor_value)


def decrypt(ciphertext: np.ndarray, key: ArnoldXORKey) -> np.ndarray:
    """
    Decrypt a Arnold + XOR ciphertext.
    """
    validate_key(key)
    xored = xor_transform(ciphertext, key.xor_value)
    return arnold_unscramble(xored, key.itr)
