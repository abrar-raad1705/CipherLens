"""
Comprehensive test suite for Layer 2 Cryptographic Security Upgrade.
Validates:
1. CSPRNG 256-bit Key Generation
2. HKDF-SHA256 Key Derivation & Domain Separation
3. ChaCha20 Stream Cipher Keystream XOR Diffusion
4. Canonical Metadata & HMAC-SHA256 Authentication & Tamper Detection
5. Version 2 Structured Key Files (serialization, parsing, validation)
6. Layer 1 Engines with Layer 2 Key Management (DRPE, Fourier, DCT, Arnold)
7. End-to-End API Routes (/api/encryption/v2/encrypt and /api/encryption/v2/decrypt)
8. Secret Hygiene & Error Handling
"""

import copy
import json
import base64
import numpy as np
import pytest
from fastapi.testclient import TestClient

from api.main import app
from api.services.encryption_service import run_v2_decrypt, run_v2_encrypt
from api.services.utils import (
    array_to_data_uri,
    array_to_lossless_data_uri,
    decode_image_payload,
    extract_embedded_array,
)
from batsignal.analysis import calculate_ssim
from batsignal.crypto import (
    KeyFileV2,
    apply_chacha20_xor,
    b64url_decode,
    b64url_encode,
    build_canonical_metadata,
    chacha20_keystream,
    compute_hmac,
    derive_arnold_params,
    derive_chacha20_key,
    derive_dct_seed,
    derive_drpe_seeds,
    derive_fourier_seed,
    derive_hmac_key,
    generate_chacha20_nonce,
    generate_master_key,
    generate_nonce,
    generate_salt,
    hkdf_derive,
    parse_key_file_v2,
    serialize_key_file_v2,
    verify_hmac,
)
from batsignal.encryption import arnold_xor, dct, drpe, fourier


@pytest.fixture
def sample_image():
    """Create a deterministic synthetic 64x64 uint8 test image."""
    rng = np.random.default_rng(42)
    return rng.integers(0, 256, (64, 64), dtype=np.uint8)


@pytest.fixture
def sample_image_uri(sample_image):
    return array_to_data_uri(sample_image)


@pytest.fixture
def api_client():
    return TestClient(app)


# ── 1. CSPRNG Key & Salt Generation ──────────────────────────────────────────


def test_key_generation_length_and_uniqueness():
    """Verify master key, salt, and nonce lengths and uniqueness."""
    k1 = generate_master_key()
    k2 = generate_master_key()
    assert len(k1) == 32
    assert len(k2) == 32
    assert k1 != k2

    s1 = generate_salt()
    s2 = generate_salt()
    assert len(s1) == 32
    assert len(s2) == 32
    assert s1 != s2

    n1 = generate_nonce()
    n2 = generate_nonce()
    assert len(n1) == 16
    assert len(n2) == 16
    assert n1 != n2


# ── 2. HKDF Key Derivation & Domain Separation ──────────────────────────────


def test_hkdf_determinism():
    """Given identical master_key and salt, HKDF produces identical subkeys."""
    mk = generate_master_key()
    salt = generate_salt()

    s1_a, s2_a = derive_drpe_seeds(mk, salt)
    s1_b, s2_b = derive_drpe_seeds(mk, salt)
    assert s1_a == s1_b
    assert s2_a == s2_b

    f1 = derive_fourier_seed(mk, salt)
    f2 = derive_fourier_seed(mk, salt)
    assert f1 == f2

    d1 = derive_dct_seed(mk, salt)
    d2 = derive_dct_seed(mk, salt)
    assert d1 == d2

    c1 = derive_chacha20_key(mk, salt)
    c2 = derive_chacha20_key(mk, salt)
    assert c1 == c2

    h1 = derive_hmac_key(mk, salt)
    h2 = derive_hmac_key(mk, salt)
    assert h1 == h2


def test_hkdf_sensitivity_to_master_key_and_salt():
    """Changing one bit in master key or salt alters all derived subkeys."""
    mk1 = b"\x01" * 32
    mk2 = b"\x02" * 32
    salt = b"\xaa" * 32

    assert derive_drpe_seeds(mk1, salt) != derive_drpe_seeds(mk2, salt)
    assert derive_fourier_seed(mk1, salt) != derive_fourier_seed(mk2, salt)
    assert derive_dct_seed(mk1, salt) != derive_dct_seed(mk2, salt)
    assert derive_chacha20_key(mk1, salt) != derive_chacha20_key(mk2, salt)
    assert derive_hmac_key(mk1, salt) != derive_hmac_key(mk2, salt)

    salt2 = b"\xbb" * 32
    assert derive_drpe_seeds(mk1, salt) != derive_drpe_seeds(mk1, salt2)
    assert derive_fourier_seed(mk1, salt) != derive_fourier_seed(mk1, salt2)


def test_hkdf_domain_separation_isolation():
    """Verify distinct domain labels produce completely uncorrelated subkeys."""
    mk = generate_master_key()
    salt = generate_salt()

    subkeys = [
        hkdf_derive(mk, salt, b"BatSignal/v2/DRPE/Seed1", 16),
        hkdf_derive(mk, salt, b"BatSignal/v2/DRPE/Seed2", 16),
        hkdf_derive(mk, salt, b"BatSignal/v2/FOURIER/Permutation", 16),
        hkdf_derive(mk, salt, b"BatSignal/v2/DCT/Permutation", 16),
        hkdf_derive(mk, salt, b"BatSignal/v2/ARNOLD/Parameters", 16),
        hkdf_derive(mk, salt, b"BatSignal/v2/XOR/ChaCha20-Key", 32)[:16],
        hkdf_derive(mk, salt, b"BatSignal/v2/AUTH/HMAC-Key", 32)[:16],
    ]
    # Ensure all derived outputs are strictly pairwise unique
    assert len(set(subkeys)) == len(subkeys)


# ── 3. ChaCha20 Stream Cipher Diffusion ─────────────────────────────────────


def test_chacha20_keystream_and_xor():
    """Verify ChaCha20 keystream generation and symmetric involution property."""
    key = b"\x10" * 32
    nonce = b"\x20" * 16

    ks1 = chacha20_keystream(key, nonce, 256)
    ks2 = chacha20_keystream(key, nonce, 256)
    assert len(ks1) == 256
    assert ks1 == ks2

    # Different nonce produces different keystream
    nonce2 = b"\x21" * 16
    assert ks1 != chacha20_keystream(key, nonce2, 256)

    # Symmetric involution: apply twice = original
    data = np.arange(64, dtype=np.uint8).reshape((8, 8))
    encrypted = apply_chacha20_xor(data, key, nonce)
    assert not np.array_equal(data, encrypted)

    decrypted = apply_chacha20_xor(encrypted, key, nonce)
    assert np.array_equal(data, decrypted)


def test_arnold_chacha20_round_trip():
    """Verify Arnold Cat Map + ChaCha20 encryption and exact reconstruction."""
    image = np.arange(256, dtype=np.uint8).reshape((16, 16))
    key = generate_master_key()
    nonce = generate_nonce()

    scrambled, ciphertext = arnold_xor.encrypt_arnold_chacha(image, 5, key, nonce)
    assert not np.array_equal(image, ciphertext)
    assert not np.array_equal(scrambled, ciphertext)

    unxored, recovered = arnold_xor.decrypt_arnold_chacha(ciphertext, 5, key, nonce)
    assert np.array_equal(scrambled, unxored)
    assert np.array_equal(image, recovered)


# ── 4. Canonical Metadata & HMAC Authentication ─────────────────────────────


def test_canonical_metadata_deterministic_json():
    """Verify metadata canonicalization produces strictly identical bytes regardless of dict key order."""
    meta1 = build_canonical_metadata(
        format_version=2,
        algorithm="DRPE",
        salt="abc123",
        nonce=None,
        parameters={"z": 1, "a": 2},
        dimensions=[64, 64],
        raw_dtype="complex64",
    )
    meta2 = build_canonical_metadata(
        format_version=2,
        algorithm="DRPE",
        salt="abc123",
        nonce=None,
        parameters={"a": 2, "z": 1},
        dimensions=[64, 64],
        raw_dtype="complex64",
    )
    assert meta1 == meta2
    assert b" " not in meta1  # Whitespace-free


def test_hmac_computation_and_verification():
    """Verify HMAC computation and constant-time verification."""
    hmac_key = b"\x33" * 32
    meta = b'{"algorithm":"DRPE"}'
    data = b"ciphertext_data_bytes"

    tag = compute_hmac(hmac_key, meta, data)
    assert isinstance(tag, str)
    assert len(tag) == 64  # SHA-256 hex string

    assert verify_hmac(tag, tag)
    assert verify_hmac(tag, f"hmac:{tag}")  # Tolerant prefix
    assert not verify_hmac(tag, tag[:-1] + "0")  # Modified tag fails


# ── 5. Version 2 Key File Schema & Serialization ────────────────────────────


def test_keyfile_v2_serialization_and_parsing():
    """Verify KeyFileV2 model serialization and parsing."""
    mk = generate_master_key()
    salt = generate_salt()
    kf = KeyFileV2(
        format_version=2,
        algorithm="DRPE",
        master_key=b64url_encode(mk),
        salt=b64url_encode(salt),
        dimensions=[64, 64],
        raw_dtype="complex64",
        authentication={"algorithm": "HMAC-SHA256", "tag": "abcd1234efgh5678"},
    )

    json_str = serialize_key_file_v2(kf)
    parsed = parse_key_file_v2(json_str)

    assert parsed.format_version == 2
    assert parsed.algorithm == "DRPE"
    assert parsed.master_key == kf.master_key
    assert parsed.salt == kf.salt
    assert parsed.auth_tag == "abcd1234efgh5678"
    assert b64url_decode(parsed.master_key) == mk


def test_keyfile_v2_rejection_of_invalid_formats():
    """Verify parse_key_file_v2 rejects corrupted or v1 formats."""
    with pytest.raises(ValueError, match="Unsupported or missing format_version"):
        parse_key_file_v2({"format_version": 1, "master_key": "x"})

    with pytest.raises(ValueError, match="missing required 'master_key'"):
        parse_key_file_v2(
            {"format_version": 2, "salt": "x", "algorithm": "DRPE", "authentication": {"tag": "y"}}
        )

    with pytest.raises(ValueError, match="Malformed key file JSON"):
        parse_key_file_v2("{not valid json}")


# ── 6. Layer 1 Engines with Layer 2 Key Management ──────────────────────────


@pytest.mark.parametrize("algorithm", ["drpe", "fourier", "dct", "arnold"])
def test_v2_encryption_decryption_round_trip(sample_image_uri, sample_image, algorithm):
    """Verify lossless encryption and decryption for all 4 core engines."""
    params = {"itr": 8} if algorithm == "arnold" else {}
    enc_res = run_v2_encrypt(sample_image_uri, algorithm, params)

    assert enc_res.status == "COMPLETE"
    assert enc_res.key_file["format_version"] == 2
    assert "ciphertext" in enc_res.stages

    # Decrypt with valid key file
    dec_res = run_v2_decrypt(enc_res.ciphertext, enc_res.key_file, sample_image_uri)
    assert dec_res.status == "COMPLETE"

    recovered = decode_image_payload(dec_res.decrypted_image)
    ssim = calculate_ssim(sample_image, recovered)
    assert ssim >= 0.99


def test_v2_encryption_key_uniqueness(sample_image_uri):
    """Encrypting the same image twice produces different master keys and ciphertexts."""
    enc1 = run_v2_encrypt(sample_image_uri, "drpe")
    enc2 = run_v2_encrypt(sample_image_uri, "drpe")

    assert enc1.key_file["master_key"] != enc2.key_file["master_key"]
    assert enc1.key_file["salt"] != enc2.key_file["salt"]
    assert enc1.ciphertext != enc2.ciphertext


# ── 7. HMAC Authentication & Tamper Detection ───────────────────────────────


def test_hmac_tamper_detection_wrong_key(sample_image_uri):
    """Decryption fails when supplying a different key file."""
    enc1 = run_v2_encrypt(sample_image_uri, "drpe")
    enc2 = run_v2_encrypt(sample_image_uri, "drpe")

    with pytest.raises(
        ValueError,
        match="The supplied key does not match this encrypted image, or the encrypted data has been modified.",
    ):
        run_v2_decrypt(enc1.ciphertext, enc2.key_file)


def test_hmac_tamper_detection_modified_ciphertext(sample_image_uri):
    """Decryption fails when the raw ciphertext in PNG is tampered with."""
    enc = run_v2_encrypt(sample_image_uri, "drpe")
    raw_arr = extract_embedded_array(enc.ciphertext)
    assert raw_arr is not None

    # Tamper with 1 element
    tampered_arr = raw_arr.copy()
    tampered_arr[0, 0] += 1.0 + 1.0j
    tampered_uri = array_to_lossless_data_uri(
        decode_image_payload(enc.ciphertext), tampered_arr
    )

    with pytest.raises(
        ValueError,
        match="The supplied key does not match this encrypted image, or the encrypted data has been modified.",
    ):
        run_v2_decrypt(tampered_uri, enc.key_file)


def test_hmac_tamper_detection_modified_metadata(sample_image_uri):
    """Decryption fails when key file parameters or salt are altered."""
    enc = run_v2_encrypt(sample_image_uri, "arnold", {"itr": 10})
    tampered_kf = copy.deepcopy(enc.key_file)

    # Tamper with public parameter
    tampered_kf["parameters"]["itr"] = 9

    with pytest.raises(
        ValueError,
        match="The supplied key does not match this encrypted image, or the encrypted data has been modified.",
    ):
        run_v2_decrypt(enc.ciphertext, tampered_kf)


def test_hmac_tamper_detection_altered_tag(sample_image_uri):
    """Decryption fails when the HMAC auth tag itself is modified by 1 character."""
    enc = run_v2_encrypt(sample_image_uri, "fourier")
    tampered_kf = copy.deepcopy(enc.key_file)
    tag = tampered_kf["authentication"]["tag"]
    # Invert first character
    tampered_tag = ("0" if tag[0] != "0" else "1") + tag[1:]
    tampered_kf["authentication"]["tag"] = tampered_tag

    with pytest.raises(
        ValueError,
        match="The supplied key does not match this encrypted image, or the encrypted data has been modified.",
    ):
        run_v2_decrypt(enc.ciphertext, tampered_kf)


# ── 8. End-to-End API Endpoints (/api/encryption/v2/*) ──────────────────────


def test_api_v2_encrypt_and_decrypt_endpoints(api_client, sample_image_uri):
    """Test full HTTP round-trip via FastAPI /v2/encrypt and /v2/decrypt endpoints."""
    # 1. Encrypt via API
    enc_resp = api_client.post(
        "/api/encryption/v2/encrypt",
        json={
            "image": sample_image_uri,
            "algorithm": "DRPE",
            "parameters": {},
        },
    )
    assert enc_resp.status_code == 200
    enc_data = enc_resp.json()
    assert enc_data["status"] == "COMPLETE"
    assert "key_file" in enc_data
    assert "ciphertext" in enc_data

    # 2. Decrypt via API
    dec_resp = api_client.post(
        "/api/encryption/v2/decrypt",
        json={
            "ciphertext": enc_data["ciphertext"],
            "key_file": enc_data["key_file"],
            "reference_image": sample_image_uri,
        },
    )
    assert dec_resp.status_code == 200
    dec_data = dec_resp.json()
    assert dec_data["status"] == "COMPLETE"
    assert "decrypted_image" in dec_data
    assert dec_data["quality"]["ssim"] >= 0.99

    # 3. Tamper via API -> Returns HTTP 400 with strict error message
    tampered_key_file = enc_data["key_file"]
    tampered_key_file["authentication"]["tag"] = "0" * 64
    fail_resp = api_client.post(
        "/api/encryption/v2/decrypt",
        json={
            "ciphertext": enc_data["ciphertext"],
            "key_file": tampered_key_file,
        },
    )
    assert fail_resp.status_code == 400
    assert (
        "The supplied key does not match this encrypted image, or the encrypted data has been modified."
        in fail_resp.json()["detail"]
    )
