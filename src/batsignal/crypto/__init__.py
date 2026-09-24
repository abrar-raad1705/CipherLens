"""
Bat_Signal Layer 2 Cryptographic Package.
Provides CSPRNG master key generation, HKDF-SHA256 key hierarchy derivation,
ChaCha20 keystream XOR diffusion, HMAC-SHA256 integrity verification, and
Version 2 structured key file serialization.
"""

from batsignal.crypto.auth import (
    build_canonical_metadata,
    compute_hmac,
    verify_hmac,
)
from batsignal.crypto.chacha import (
    apply_chacha20_xor,
    chacha20_keystream,
    generate_chacha20_nonce,
)
from batsignal.crypto.kdf import (
    derive_arnold_params,
    derive_chacha20_key,
    derive_dct_seed,
    derive_drpe_seeds,
    derive_fourier_seed,
    derive_hmac_key,
    generate_master_key,
    generate_nonce,
    generate_salt,
    hkdf_derive,
)
from batsignal.crypto.keyfile import (
    AuthenticationMeta,
    KeyFileV2,
    b64url_decode,
    b64url_encode,
    parse_key_file_v2,
    serialize_key_file_v2,
)

__all__ = [
    "generate_master_key",
    "generate_salt",
    "generate_nonce",
    "hkdf_derive",
    "derive_drpe_seeds",
    "derive_fourier_seed",
    "derive_dct_seed",
    "derive_arnold_params",
    "derive_chacha20_key",
    "derive_hmac_key",
    "generate_chacha20_nonce",
    "chacha20_keystream",
    "apply_chacha20_xor",
    "build_canonical_metadata",
    "compute_hmac",
    "verify_hmac",
    "b64url_encode",
    "b64url_decode",
    "AuthenticationMeta",
    "KeyFileV2",
    "serialize_key_file_v2",
    "parse_key_file_v2",
]
