"""
ChaCha20 stream cipher utilities for Bat_Signal Layer 2.
Replaces legacy constant-byte XOR with full 256-bit ChaCha20 keystream diffusion.
"""

from __future__ import annotations

import secrets
import numpy as np
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms


def generate_chacha20_nonce() -> bytes:
    """Generate a fresh 16-byte cryptographically random nonce."""
    return secrets.token_bytes(16)


def chacha20_keystream(key: bytes, nonce: bytes, length: int) -> bytes:
    """
    Generate `length` bytes of raw ChaCha20 keystream.
    This is equivalent to encrypting an all-zero buffer with ChaCha20.
    """
    if len(key) != 32:
        raise ValueError(f"ChaCha20 key must be exactly 32 bytes, got {len(key)}")
    if len(nonce) != 16:
        raise ValueError(f"ChaCha20 nonce must be exactly 16 bytes, got {len(nonce)}")

    cipher = Cipher(algorithms.ChaCha20(key, nonce), mode=None)
    encryptor = cipher.encryptor()
    return encryptor.update(b"\x00" * length)


def apply_chacha20_xor(data: np.ndarray, key: bytes, nonce: bytes) -> np.ndarray:
    """
    Apply ChaCha20 keystream XOR to a 2D uint8 numpy array.
    Symmetric operation: applying twice returns the original input.

    :param data: 2D uint8 numpy array
    :param key: 32-byte ChaCha20 key
    :param nonce: 16-byte nonce
    :return: 2D uint8 numpy array of the same shape
    """
    if len(key) != 32:
        raise ValueError(f"ChaCha20 key must be exactly 32 bytes, got {len(key)}")
    if len(nonce) != 16:
        raise ValueError(f"ChaCha20 nonce must be exactly 16 bytes, got {len(nonce)}")

    orig_shape = data.shape
    arr_uint8 = np.ascontiguousarray(data, dtype=np.uint8)
    total_bytes = arr_uint8.size

    cipher = Cipher(algorithms.ChaCha20(key, nonce), mode=None)
    encryptor = cipher.encryptor()
    xored_bytes = encryptor.update(arr_uint8.tobytes())

    return np.frombuffer(xored_bytes, dtype=np.uint8).reshape(orig_shape)
