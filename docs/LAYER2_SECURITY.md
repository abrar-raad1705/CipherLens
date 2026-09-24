# Bat_Signal / CipherLens — Layer 2 Cryptographic Architecture

## 1. Overview and Design Philosophy

Bat_Signal implements a **Two-Layer Hybrid Security Architecture** designed to bridge classical optical signal processing and modern computational cryptography:

```
┌────────────────────────────────────────────────────────────────────────┐
│                   Layer 2: Modern Cryptographic Wrap                   │
│                                                                        │
│   ┌──────────────────────┐         ┌───────────────────────────────┐   │
│   │ 256-bit CSPRNG Master│ ──────> │  HKDF-SHA256 Key Derivation   │   │
│   │ Key (Bearer Token)   │         │  (Domain-Separated Subkeys)   │   │
│   └──────────────────────┘         └──────────────┬────────────────┘   │
│                                                   │                    │
│   ┌───────────────────────────────────────────────┼────────────────┐   │
│   │ Layer 1: Mathematical Optical / Chaotic Core  │                │   │
│   │                                               ▼                │   │
│   │   [DRPE 4f System]  [Fourier Phase]  [DCT Basis]  [Arnold Map] │   │
│   │   Phase Masks       Permutation      Permutation   ChaCha20    │   │
│   │   R1(x,y), R2(u,v)  Index Vector     Index Vector  Keystream   │   │
│   │                                                                │   │
│   └───────────────────────────────┬────────────────────────────────┘   │
│                                   │ Raw Array Matrix (complex64/uint8) │
│                                   ▼                                    │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │ HMAC-SHA256 Integrity Envelope & RFC 8785 Canonical Metadata   │   │
│   └───────────────────────────────┬────────────────────────────────┘   │
│                                   │                                    │
└───────────────────────────────────┼────────────────────────────────────┘
                                    ▼
                Lossless PNG Carrier (tEXt Chunks)
                                    +
                 Version 2 Structured JSON Key File
```

- **Layer 1 (Mathematical Engines)**: Preserves the exact mathematical formulations of 4f Double Random Phase Encoding (DRPE), Fourier Phase Encryption, 2D Discrete Cosine Transform (DCT) Permutation, and Arnold Cat Map Toral Automorphism.
- **Layer 2 (Cryptographic Security Infrastructure)**: Wraps Layer 1 engines with provable cryptographic primitives:
  - Cryptographically secure pseudo-random number generation (CSPRNG) via OS entropy (`os.urandom` / `secrets.token_bytes`).
  - Key derivation following RFC 5869 (HKDF-SHA256) with strict domain separation.
  - Provable diffusion via ChaCha20 keystream XOR replacing fixed single-byte XOR.
  - Authenticated encryption semantics via HMAC-SHA256 over canonical metadata (RFC 8785) and raw image buffers.
  - Version 2 structured JSON key files operating under a bearer-token credential model.

---

## 2. Key Hierarchy and Domain Separation (HKDF-SHA256)

### 2.1 Master Key and Salt
All cryptographic operations originate from a 256-bit (32-byte) master key generated using system entropy:
- **Master Key**: $K_{\text{master}} \leftarrow \text{CSPRNG}(256\text{ bits})$
- **Salt**: $S \leftarrow \text{CSPRNG}(256\text{ bits})$
- **Nonce** (for stream ciphers): $N \leftarrow \text{CSPRNG}(96\text{ or }128\text{ bits})$

### 2.2 Derivation Mechanics
Subkeys are derived using HMAC-based Extract-and-Expand Key Derivation Function (HKDF) specified in **RFC 5869** with SHA-256:

$$\text{PRK} = \text{HMAC-SHA256}(\text{salt}, K_{\text{master}})$$
$$\text{OKM} = \text{HKDF-Expand}(\text{PRK}, \text{info}, L)$$

### 2.3 Domain Separation Labels
Each cryptographic subkey uses an immutable, prefixed domain separation context string:

| Subkey Purpose | Domain Label String (`info`) | Output Length | Target Consumer |
| :--- | :--- | :--- | :--- |
| **DRPE Spatial Mask ($R_1$)** | `BatSignal/v2/DRPE/SpatialMaskSeed` | 16 bytes (128-bit int) | `drpe.py:generate_phase_mask` |
| **DRPE Fourier Mask ($R_2$)** | `BatSignal/v2/DRPE/FourierMaskSeed` | 16 bytes (128-bit int) | `drpe.py:generate_phase_mask` |
| **Fourier Permutation** | `BatSignal/v2/FOURIER/Permutation` | 16 bytes (128-bit int) | `fourier.py:generate_permutation` |
| **DCT Permutation** | `BatSignal/v2/DCT/Permutation` | 16 bytes (128-bit int) | `dct.py:generate_permutation` |
| **Arnold Iterations** | `BatSignal/v2/ARNOLD/Iterations` | 1 byte ($1 \le \text{itr} \le 16$) | `arnold_xor.py` toral rounds |
| **ChaCha20 Keystream Key** | `BatSignal/v2/ARNOLD/ChaCha20Key` | 32 bytes (256 bits) | `chacha.py` keystream generator |
| **HMAC Authentication Key** | `BatSignal/v2/HMAC/AuthKey` | 32 bytes (256 bits) | `auth.py:compute_hmac` |

This domain separation guarantees that mathematical subkeys, stream cipher keys, and authentication keys are cryptographically independent; knowledge or compromise of one subkey reveals zero information regarding any other subkey.

---

## 3. Arnold Cat Map + ChaCha20 Keystream Diffusion

In legacy systems, the Arnold Cat Map toral shearing was combined with an 8-bit constant XOR mask ($C = P \oplus K_{\text{xor}}$), leaving the cipher vulnerable to histogram and known-plaintext attacks.

Layer 2 upgrades this to **ChaCha20 Keystream Diffusion**:
1. **Keystream Generation**: Using the 256-bit derived key $K_{\text{chacha}}$ and 96-bit nonce $N$, a keystream of length $H \times W$ bytes is generated with counter $0$.
2. **Diffusion Transformation**:
   $$C(x, y) = P_{\text{arnold}}(x, y) \oplus \text{Keystream}(x, y)$$
3. **Decryption**:
   $$P_{\text{arnold}}(x, y) = C(x, y) \oplus \text{Keystream}(x, y)$$
   Followed by $k_{\text{period}} - (\text{itr} \bmod k_{\text{period}})$ inverse toral coordinate shearing steps.

---

## 4. Authentication Envelope and Integrity Verification

### 4.1 Canonical Metadata Serialization (RFC 8785)
To prevent formatting malleability, all header attributes are serialized into canonical JSON following RFC 8785:
- Deterministic lexicographical sorting of object keys.
- Strict IEEE 754 float formatting.
- Explicit UTF-8 character encoding with escaped delimiters.

Canonical metadata includes:
- `algorithm`: The algorithm name (e.g., `"DRPE"`, `"FOURIER"`, `"DCT"`, `"ARNOLD"`).
- `format_version`: Integer specification version (`2`).
- `dimensions`: `[height, width]` of the image matrix.
- `raw_dtype`: Underlying NumPy data type (`"complex64"`, `"float32"`, `"uint8"`).
- `parameters`: Public parameter dictionary (e.g. `iterations`).
- `salt`: Base64url-encoded derivation salt.
- `nonce`: Base64url-encoded nonce (if applicable).

### 4.2 HMAC-SHA256 Payload Construction
The authentication envelope binds the canonical metadata directly to the raw binary array:

$$\text{Payload} = \text{UTF-8}(\text{CanonicalJSON}) \parallel \text{RawArrayBytes}$$
$$\text{Tag} = \text{HMAC-SHA256}(K_{\text{hmac}}, \text{Payload})$$

### 4.3 Strict Verification Invariant
Before executing any Layer 1 mathematical inversion or Fourier transformations, the system recomputes the expected tag and verifies it using constant-time comparison (`hmac.compare_digest`).

If verification fails, decryption **immediately aborts** with:
```
ValueError: The supplied key does not match this encrypted image, or the encrypted data has been modified.
```
No intermediate array states or partial reconstructions are exposed to the caller.

---

## 5. Lossless Carrier Format (PNG `tEXt` Chunks)

Because optical encryptions (such as 4f DRPE) generate complex-valued wave fields ($C(u, v) \in \mathbb{C}$), rendering to standard RGB clipping destroys the imaginary component and ruins mathematical invertibility.

Layer 2 resolves this losslessly within standard PNG files:
1. **Visual Proxy**: The PNG RGB raster contains the normalized visual magnitude proxy of the ciphertext.
2. **Embedded Raw Stream**: The exact raw contiguous buffer is serialized as:
   - `batsignal_raw_b64`: Base64-encoded raw byte array.
   - `batsignal_dtype`: Exact numerical type (`"complex64"`, `"float32"`, `"uint8"`).
   - `batsignal_shape`: Dimension tuple (e.g., `"512,512"`).
   Stored losslessly in standard PNG ancillary `tEXt` chunks.
3. **Decryption Extraction**: The workbench reads the embedded `tEXt` chunk, reconstructs the `complex64` array, and achieves **perfect mathematical reconstruction ($SSIM = 1.0$)**.

---

## 6. Version 2 Key File Specification

Version 2 key files are bearer credential artifacts formatted in JSON:

```json
{
  "format_version": 2,
  "algorithm": "DRPE",
  "created_at": "2026-09-25T04:22:00.000000Z",
  "master_key": "MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY",
  "salt": "AQIDBAUGBwgJCgsMDQ4PEA",
  "nonce": null,
  "parameters": {},
  "dimensions": [512, 512],
  "raw_dtype": "complex64",
  "authentication": {
    "algorithm": "HMAC-SHA256",
    "tag": "a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90"
  }
}
```

### Key Management Rules:
- **Bearer Credential Model**: Only the high-entropy master key, salt, and nonces are stored. Subkeys are never written to disk.
- **Zero Raw Secrets in Web Storage**: Neither `localStorage` nor non-volatile browser storage stores raw master keys. Secrets exist only within tab-scoped memory (`sessionStorage` for temporary tab workflow state).
- **Backward Compatibility**: Legacy v1 `.txt` key-value files and legacy endpoints continue to function for backward compatibility.
