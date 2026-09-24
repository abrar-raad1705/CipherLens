"""
Version 2 Structured Key File specification and serialization for Bat_Signal.
Encapsulates bearer credentials (256-bit master key), public parameters,
salt, nonce, and HMAC authentication tag. Never stores derived subkeys.
"""

from __future__ import annotations

import base64
import json
from datetime import datetime, timezone
from typing import Any
from pydantic import BaseModel, Field


def b64url_encode(data: bytes) -> str:
    """Base64url encode without padding."""
    return base64.urlsafe_b64encode(data).decode("ascii").rstrip("=")


def b64url_decode(s: str) -> bytes:
    """Base64url decode with automatic padding recovery."""
    clean = s.strip()
    pad = (4 - len(clean) % 4) % 4
    return base64.urlsafe_b64decode(clean + "=" * pad)


class AuthenticationMeta(BaseModel):
    algorithm: str = "HMAC-SHA256"
    tag: str


class KeyFileV2(BaseModel):
    format_version: int = Field(2, description="Key file specification version")
    algorithm: str = Field(..., description="Target algorithm identifier (DRPE, Fourier, DCT, Arnold)")
    created_at: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat(),
        description="ISO 8601 UTC creation timestamp",
    )
    master_key: str = Field(..., description="Base64url-encoded 256-bit master key")
    salt: str = Field(..., description="Base64url-encoded 256-bit derivation salt")
    nonce: str | None = Field(None, description="Base64url-encoded 128-bit nonce for stream cipher")
    parameters: dict[str, Any] = Field(
        default_factory=dict,
        description="Public non-secret algorithm parameters (e.g. itr for Arnold)",
    )
    dimensions: list[int] = Field(..., description="[height, width] of the encrypted image")
    raw_dtype: str = Field(..., description="Data type of the raw mathematical array (complex64, float32, uint8)")
    authentication: AuthenticationMeta = Field(..., description="Authentication tag and algorithm")

    @property
    def auth_tag(self) -> str:
        return self.authentication.tag


def serialize_key_file_v2(key_file: KeyFileV2) -> str:
    """Serialize KeyFileV2 to pretty-printed JSON string."""
    return key_file.model_dump_json(indent=2)


def parse_key_file_v2(content: str | dict[str, Any]) -> KeyFileV2:
    """
    Parse and validate a Version 2 key file structure.

    :param content: JSON string or dictionary representation
    :return: Validated KeyFileV2 instance
    :raises ValueError: If structure is malformed or format version is incompatible
    """
    if isinstance(content, str):
        try:
            data = json.loads(content)
        except json.JSONDecodeError as e:
            raise ValueError(f"Malformed key file JSON: {e}") from e
    elif isinstance(content, dict):
        data = content
    else:
        raise ValueError(f"Expected str or dict for key file, got {type(content)}")

    format_version = data.get("format_version")
    if format_version != 2:
        raise ValueError(
            f"Unsupported or missing format_version: expected 2, got {format_version}"
        )

    if not data.get("master_key"):
        raise ValueError("Key file missing required 'master_key'")
    if not data.get("salt"):
        raise ValueError("Key file missing required 'salt'")
    if not data.get("algorithm"):
        raise ValueError("Key file missing required 'algorithm'")
    if not data.get("authentication") or not data["authentication"].get("tag"):
        raise ValueError("Key file missing required 'authentication.tag'")

    return KeyFileV2(**data)
