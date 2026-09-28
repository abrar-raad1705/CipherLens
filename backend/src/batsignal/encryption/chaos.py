from dataclasses import dataclass

import numpy as np


@dataclass(frozen=True)
class ChaosKey:
    x0: float
    r: float


Chaos_Key = ChaosKey


def normalize_key(key: ChaosKey | tuple | list | dict) -> ChaosKey:
    if isinstance(key, ChaosKey):
        return key
    if isinstance(key, (tuple, list)) and len(key) == 2:
        return ChaosKey(float(key[0]), float(key[1]))
    if isinstance(key, dict) and "x0" in key and "r" in key:
        return ChaosKey(float(key["x0"]), float(key["r"]))
    raise TypeError(f"Invalid key type for Chaos: {type(key)}")


def validate_key(key: ChaosKey) -> None:
    if not (0.0 < key.x0 < 1.0):
        raise ValueError("x0 must be between 0 and 1 exclusive")
    if not (3.5 <= key.r <= 4.0):
        raise ValueError("r must be between 3.5 and 4.0 inclusive")


def generate_chaotic_sequence(length: int, x0: float, r: float) -> np.ndarray:
    """
    Generate a chaotic sequence using the logistic map:
    x_{n+1} = r * x_n * (1 - x_n)

    Discards the first 100 transient values for stability.
    Returns an array of `length` float values in (0, 1).
    """
    x = float(x0)
    for _ in range(100):
        x = r * x * (1.0 - x)

    seq = np.empty(length, dtype=np.float64)
    for i in range(length):
        x = r * x * (1.0 - x)
        seq[i] = x

    return seq


def generate_keystream(sequence: np.ndarray) -> np.ndarray:
    """
    Convert a chaotic sequence to a uint8 keystream clamped to 255.
    """
    return np.clip(np.floor(sequence * 256.0), 0, 255).astype(np.uint8)


def encrypt(image: np.ndarray, key: ChaosKey | tuple | list | dict) -> np.ndarray:
    """
    Encrypt an image using Logistic Chaos Map Cipher.
    """
    norm_key = normalize_key(key)
    validate_key(norm_key)

    img = np.asarray(image, dtype=np.uint8)
    seq1 = generate_chaotic_sequence(img.size, norm_key.x0, norm_key.r)
    permutation = np.argsort(seq1)

    flat = img.flatten()
    scrambled = flat[permutation]

    x0_2 = float(seq1[-1])
    seq2 = generate_chaotic_sequence(img.size, x0_2, norm_key.r)
    keystream = generate_keystream(seq2)

    encrypted_flat = np.bitwise_xor(scrambled, keystream)
    return encrypted_flat.reshape(img.shape)


def decrypt(ciphertext: np.ndarray, key: ChaosKey | tuple | list | dict) -> np.ndarray:
    """
    Decrypt a Logistic Chaos Map ciphertext.
    """
    norm_key = normalize_key(key)
    validate_key(norm_key)

    cipher = np.asarray(ciphertext, dtype=np.uint8)
    seq1 = generate_chaotic_sequence(cipher.size, norm_key.x0, norm_key.r)
    permutation = np.argsort(seq1)

    x0_2 = float(seq1[-1])
    seq2 = generate_chaotic_sequence(cipher.size, x0_2, norm_key.r)
    keystream = generate_keystream(seq2)

    flat = cipher.flatten()
    scrambled = np.bitwise_xor(flat, keystream)

    inverse_perm = np.argsort(permutation)
    unscrambled = scrambled[inverse_perm]

    return unscrambled.reshape(cipher.shape)
