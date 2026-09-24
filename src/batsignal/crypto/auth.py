"""
Authentication and integrity verification utilities for Bat_Signal Layer 2.
Implements canonical metadata serialization and HMAC-SHA256 authentication
binding public parameters, salt, nonces, and the raw mathematical ciphertext payload.
"""

from __future__ import annotations

import hmac
import hashlib
import json
from typing import Any


def build_canonical_metadata(
    format_version: int,
    algorithm: str,
    salt: str,
    nonce: str | None,
    parameters: dict[str, Any],
    dimensions: list[int] | tuple[int, ...],
    raw_dtype: str,
) -> bytes:
    """
    Serializes canonical metadata into deterministic, whitespace-free JSON
    with strictly sorted keys according to canonical JSON conventions (RFC 8785).

    :param format_version: Format version (e.g. 2)
    :param algorithm: Canonical algorithm name (e.g. "DRPE", "Fourier", "DCT", "Arnold")
    :param salt: Base64url encoded salt
    :param nonce: Base64url encoded nonce or None
    :param parameters: Public parameters dict (e.g. {"itr": 10})
    :param dimensions: [height, width] image dimensions
    :param raw_dtype: Raw array dtype ("complex64", "float32", "uint8")
    :return: Canonical UTF-8 JSON bytes
    """
    meta_dict = {
        "algorithm": algorithm.upper(),
        "dimensions": [int(d) for d in dimensions],
        "format_version": int(format_version),
        "nonce": nonce if nonce is not None else None,
        "parameters": parameters if parameters is not None else {},
        "raw_dtype": str(raw_dtype).lower(),
        "salt": str(salt),
    }

    return json.dumps(
        meta_dict,
        sort_keys=True,
        separators=(",", ":"),
        ensure_ascii=True,
    ).encode("utf-8")


def compute_hmac(
    hmac_key: bytes,
    canonical_meta: bytes,
    raw_ciphertext_bytes: bytes,
) -> str:
    """
    Compute HMAC-SHA256 authentication tag over canonical metadata and raw ciphertext bytes.

    Tag is computed over:
        canonical_meta + b"|RAW_CIPHERTEXT|" + raw_ciphertext_bytes

    :param hmac_key: 32-byte derived HMAC key
    :param canonical_meta: Canonical metadata JSON bytes
    :param raw_ciphertext_bytes: Raw mathematical ciphertext array bytes
    :return: Hexadecimal HMAC-SHA256 tag
    """
    if len(hmac_key) != 32:
        raise ValueError(f"HMAC key must be exactly 32 bytes, got {len(hmac_key)}")

    payload = canonical_meta + b"|RAW_CIPHERTEXT|" + raw_ciphertext_bytes
    return hmac.new(hmac_key, payload, hashlib.sha256).hexdigest()


def verify_hmac(expected_tag: str, actual_tag: str) -> bool:
    """
    Constant-time comparison of expected and received HMAC tags.
    Tolerates 'hmac:' prefix or case variations.

    :param expected_tag: Tag computed by verification logic
    :param actual_tag: Tag provided in key file
    :return: True if tags match, False otherwise
    """
    cleaned_expected = expected_tag.strip().lower()
    cleaned_actual = actual_tag.strip().lower()

    if cleaned_expected.startswith("hmac:"):
        cleaned_expected = cleaned_expected[5:]
    if cleaned_actual.startswith("hmac:"):
        cleaned_actual = cleaned_actual[5:]

    return hmac.compare_digest(cleaned_expected, cleaned_actual)
