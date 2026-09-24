from dataclasses import dataclass

import numpy as np
from scipy.fft import dctn, idctn


@dataclass(frozen=True)
class FeistelKey:
    seed: int
    rounds: int = 16


def normalize_key(key: FeistelKey | tuple | list | int | dict) -> FeistelKey:
    if isinstance(key, FeistelKey):
        return key
    if isinstance(key, (tuple, list)):
        if len(key) == 2:
            return FeistelKey(int(key[0]), int(key[1]))
        if len(key) == 1:
            return FeistelKey(int(key[0]))
    if isinstance(key, int):
        return FeistelKey(key)
    if isinstance(key, dict):
        return FeistelKey(int(key["seed"]), int(key.get("rounds", 16)))
    raise TypeError(f"Invalid key type for Feistel: {type(key)}")


def validate_key(key: FeistelKey) -> None:
    if key.seed < 0:
        raise ValueError("Seed can't be negative!")
    if not (4 <= key.rounds <= 16):
        raise ValueError("Rounds must be between 4 and 16!")


def generate_sub_keys(seed: int, rounds: int) -> list[int]:
    rng = np.random.default_rng(seed)
    return rng.integers(0, 2**31, size=rounds).tolist()


def round_function(half_image: np.ndarray, sub_key: int) -> np.ndarray:
    coeffs = dctn(half_image, norm="ortho")
    flat = coeffs.flatten()

    permutation = np.random.default_rng(sub_key).permutation(flat.size)
    scrambled_flat = flat[permutation]
    scrambled_coeffs = scrambled_flat.reshape(coeffs.shape)

    idct_result = idctn(scrambled_coeffs, norm="ortho")
    return np.clip(idct_result, 0, 255).astype(np.uint8)


def encrypt(image: np.ndarray, key: FeistelKey | tuple | list | int | dict) -> np.ndarray:
    """
    Encrypt an image using a Feistel block cipher with DCT round function.
    """
    norm_key = normalize_key(key)
    validate_key(norm_key)

    img = image.copy()
    if img.shape[0] % 2 != 0:
        pad_row = np.zeros((1, *img.shape[1:]), dtype=img.dtype)
        img = np.vstack([img, pad_row])

    half = img.shape[0] // 2
    L = img[:half].copy()
    R = img[half:].copy()

    sub_keys = generate_sub_keys(norm_key.seed, norm_key.rounds)

    for i in range(norm_key.rounds):
        f_out = round_function(R, sub_keys[i])
        new_L = R
        new_R = np.bitwise_xor(L.astype(np.uint8), f_out.astype(np.uint8))
        L, R = new_L, new_R

    ciphertext = np.vstack([L, R])
    return ciphertext.astype(np.uint8)


def decrypt(
    ciphertext: np.ndarray,
    key: FeistelKey | tuple | list | int | dict,
    target_shape: tuple[int, ...] | None = None,
) -> np.ndarray:
    """
    Decrypt a Feistel ciphertext.
    """
    norm_key = normalize_key(key)
    validate_key(norm_key)

    img = ciphertext.copy()
    if img.shape[0] % 2 != 0:
        pad_row = np.zeros((1, *img.shape[1:]), dtype=img.dtype)
        img = np.vstack([img, pad_row])

    half = img.shape[0] // 2
    L = img[:half].copy()
    R = img[half:].copy()

    sub_keys = generate_sub_keys(norm_key.seed, norm_key.rounds)

    for i in range(norm_key.rounds - 1, -1, -1):
        f_out = round_function(L, sub_keys[i])
        prev_R = L
        prev_L = np.bitwise_xor(R.astype(np.uint8), f_out.astype(np.uint8))
        L, R = prev_L, prev_R

    decrypted = np.vstack([L, R])
    if target_shape is not None:
        decrypted = decrypted[: target_shape[0], : target_shape[1]]
    return decrypted.astype(np.uint8)
