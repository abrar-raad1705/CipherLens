"""
Key Derivation Function (KDF) module for Bat_Signal Layer 2.
Implements HKDF-SHA-256 with domain-separated context labels to derive
deterministic algorithmic subkeys from a 256-bit CSPRNG master key and salt.
"""

from __future__ import annotations

import secrets
from typing import Final
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.hkdf import HKDF

# Domain separation context labels (RFC 5869)
LABEL_DRPE_SEED1: Final[bytes] = b"BatSignal/v2/DRPE/Seed1"
LABEL_DRPE_SEED2: Final[bytes] = b"BatSignal/v2/DRPE/Seed2"
LABEL_FOURIER_PERM: Final[bytes] = b"BatSignal/v2/FOURIER/Permutation"
LABEL_DCT_PERM: Final[bytes] = b"BatSignal/v2/DCT/Permutation"
LABEL_ARNOLD_PARAMS: Final[bytes] = b"BatSignal/v2/ARNOLD/Parameters"
LABEL_CHACHA20_KEY: Final[bytes] = b"BatSignal/v2/XOR/ChaCha20-Key"
LABEL_HMAC_KEY: Final[bytes] = b"BatSignal/v2/AUTH/HMAC-Key"

MASTER_KEY_BYTES: Final[int] = 32
SALT_BYTES: Final[int] = 32
NONCE_BYTES: Final[int] = 16


def generate_master_key() -> bytes:
    """Generate 32 cryptographically secure random bytes for master key."""
    return secrets.token_bytes(MASTER_KEY_BYTES)


def generate_salt() -> bytes:
    """Generate 32 cryptographically secure random bytes for HKDF salt."""
    return secrets.token_bytes(SALT_BYTES)


def generate_nonce() -> bytes:
    """Generate 16 cryptographically secure random bytes for ChaCha20 nonce."""
    return secrets.token_bytes(NONCE_BYTES)


def hkdf_derive(master_key: bytes, salt: bytes, info: bytes, length: int) -> bytes:
    """
    Derive subkey material using HKDF-SHA-256.

    :param master_key: 32-byte CSPRNG master key
    :param salt: 32-byte salt
    :param info: Domain separation context label
    :param length: Output byte length
    :return: Derived byte sequence
    """
    if len(master_key) < 32:
        raise ValueError("Master key must be at least 32 bytes (256 bits).")
    if len(salt) < 16:
        raise ValueError("Salt must be at least 16 bytes.")

    hkdf = HKDF(
        algorithm=hashes.SHA256(),
        length=length,
        salt=salt,
        info=info,
    )
    return hkdf.derive(master_key)


def derive_drpe_seeds(master_key: bytes, salt: bytes) -> tuple[int, int]:
    """
    Derive 128-bit integer seeds for DRPE spatial (R1) and Fourier (R2) phase masks.
    """
    raw_s1 = hkdf_derive(master_key, salt, LABEL_DRPE_SEED1, 16)
    raw_s2 = hkdf_derive(master_key, salt, LABEL_DRPE_SEED2, 16)
    seed1 = int.from_bytes(raw_s1, byteorder="big")
    seed2 = int.from_bytes(raw_s2, byteorder="big")
    return seed1, seed2


def derive_fourier_seed(master_key: bytes, salt: bytes) -> int:
    """
    Derive 128-bit integer seed for Fourier frequency coefficient permutation.
    """
    raw_seed = hkdf_derive(master_key, salt, LABEL_FOURIER_PERM, 16)
    return int.from_bytes(raw_seed, byteorder="big")


def derive_dct_seed(master_key: bytes, salt: bytes) -> int:
    """
    Derive 128-bit integer seed for DCT basis coefficient permutation.
    """
    raw_seed = hkdf_derive(master_key, salt, LABEL_DCT_PERM, 16)
    return int.from_bytes(raw_seed, byteorder="big")


def derive_arnold_params(master_key: bytes, salt: bytes) -> bytes:
    """
    Derive 16 bytes for Arnold parameter binding.
    """
    return hkdf_derive(master_key, salt, LABEL_ARNOLD_PARAMS, 16)


def derive_chacha20_key(master_key: bytes, salt: bytes) -> bytes:
    """
    Derive 256-bit (32-byte) key for ChaCha20 keystream XOR diffusion.
    """
    return hkdf_derive(master_key, salt, LABEL_CHACHA20_KEY, 32)


def derive_hmac_key(master_key: bytes, salt: bytes) -> bytes:
    """
    Derive 256-bit (32-byte) key for HMAC-SHA256 authentication and integrity.
    """
    return hkdf_derive(master_key, salt, LABEL_HMAC_KEY, 32)
