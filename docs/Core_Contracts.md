# CipherLens Core Contracts

This document describes the Python interfaces under `backend/src/batsignal/`. HTTP request and response contracts are documented in [API.md](API.md).

## Image representation

Core functions accept two-dimensional `numpy.ndarray` images with shape `(height, width)`.

- Decoded input images are grayscale `uint8` arrays in the range 0-255.
- Processing results are returned as displayable arrays and normalized to PNG by the API service layer.
- Ciphertext dtype is algorithm-dependent. Complex and floating-point ciphertext must not be reduced to `uint8` before decryption.
- Decryption may return floating-point data; the service layer rounds and clips it for display.

Functions expect compatible image shapes. The API metrics service resizes a comparison target when necessary, but the core metric functions themselves do not define that HTTP-level behavior.

## Processing

The public processing functions are exported by `batsignal.processing`.

```python
import numpy as np

from batsignal.processing import (
    apply_custom_kernel,
    apply_deconvolution,
    apply_gaussian,
    apply_median_filter,
    apply_sobel,
)


def apply_custom_kernel(
    image: np.ndarray,
    kernel: np.ndarray,
) -> np.ndarray: ...


def apply_gaussian(
    image: np.ndarray,
    kernel_size: int = 5,
    sigma: float = 1.0,
) -> np.ndarray: ...


def apply_median_filter(
    image: np.ndarray,
    kernel_size: int = 3,
) -> np.ndarray: ...


def apply_sobel(image: np.ndarray) -> np.ndarray: ...


def apply_deconvolution(
    image: np.ndarray,
    mode: str = "GAUSSIAN",
    kernel: np.ndarray | None = None,
    kernel_size: int = 5,
    sigma: float = 1.0,
    K: float = 0.01,
) -> np.ndarray: ...
```

Convolution kernels must be two-dimensional. The API requires odd kernel dimensions and positive odd Gaussian/median sizes. Deconvolution accepts `GAUSSIAN` or `CUSTOM`; custom mode requires a kernel.

## Encryption

Each algorithm module exposes `encrypt` and `decrypt`. Callers should use the module's immutable key dataclass, although several modules also normalize tuple, list, integer, or dictionary forms.

| Module | Key type | Key fields | Ciphertext |
| --- | --- | --- | --- |
| `arnold_xor` | `ArnoldXORKey` | `itr`, `xor_value` | `uint8` |
| `chaos` | `ChaosKey` | `x0`, `r` | `uint8` |
| `dct` | `DCT_Key` | `seed` | floating point |
| `drpe` | `DRPEKey` | `seed1`, `seed2` | complex |
| `feistel` | `FeistelKey` | `seed`, `rounds` | `uint8` |
| `fourier` | `FourierKey` | `seed` | complex |
| `spectral_hybrid` | `SpectralHybridKey` | `scramble_seed`, `mask_seed`, `kernel_seed` | `complex128` |

Representative contract:

```python
import numpy as np


def encrypt(image: np.ndarray, key) -> np.ndarray: ...


def decrypt(ciphertext: np.ndarray, key) -> np.ndarray: ...
```

Feistel decryption additionally accepts an optional `target_shape` so an odd-height plaintext can be restored to its original dimensions.

Key validation rules include:

- Random seeds are non-negative.
- Arnold-XOR requires non-negative iterations and an XOR value from 0 through 255.
- Arnold-XOR operates on square images because the Arnold Cat Map uses one shared dimension.
- Chaos requires `0 < x0 < 1` and `3.5 <= r <= 4.0`.
- Feistel requires a non-negative seed and 4 through 16 rounds.

The same validated key used for encryption must be supplied for decryption. Exact DCT, DRPE, Fourier, and Spectral Hybrid ciphertext arrays must be retained; their visual magnitude PNGs are not lossless ciphertext containers.

## Analysis

The following functions are exported by `batsignal.analysis`:

```python
import numpy as np


def calculate_entropy(image: np.ndarray) -> float: ...


def calculate_correlation(image: np.ndarray) -> dict[str, float]: ...


def calculate_npcr(
    ciphertext1: np.ndarray,
    ciphertext2: np.ndarray,
) -> float: ...


def calculate_uaci(
    ciphertext1: np.ndarray,
    ciphertext2: np.ndarray,
) -> float: ...


def calculate_mse(
    original: np.ndarray,
    recovered: np.ndarray,
) -> float: ...


def calculate_psnr(
    original: np.ndarray,
    recovered: np.ndarray,
) -> float: ...


def calculate_ssim(
    original: np.ndarray,
    recovered: np.ndarray,
) -> float: ...
```

`calculate_correlation` returns `horizontal`, `vertical`, and `diagonal` coefficients. NPCR and UACI compare two ciphertext arrays of the same shape. MSE, PSNR, and SSIM compare a reference image with a recovered or processed image.

## Module boundaries

The numerical core remains independent of transport and UI concerns:

```text
frontend
   │ HTTP/JSON
   ▼
backend/api/routes
   ▼
backend/api/services
   ▼
batsignal.processing / encryption / analysis / io
   ▼
NumPy / SciPy / OpenCV / scikit-image / Pillow
```

Allowed dependencies:

- Core modules may depend on scientific Python libraries.
- API services may depend on schemas, serialization helpers, and core modules.
- Routes may depend on schemas and services.
- The frontend may depend on the HTTP API contract.

Disallowed dependencies:

- Core algorithms must not import FastAPI or frontend modules.
- Analysis functions must not depend on a specific encryption or processing algorithm.
- Processing and encryption modules must not depend on each other.
- Browser state must not be introduced into backend or core code.
