# CipherLens REST API Reference

The FastAPI application in `backend/api/` exposes the `batsignal` numerical engine to the Next.js frontend.

- API base URL in local development: `http://127.0.0.1:8000/api`
- Interactive OpenAPI documentation: `http://127.0.0.1:8000/docs`
- Image fields accept a base64-encoded image or a `data:image/...;base64,...` URI.
- Image responses are PNG data URIs unless a field says otherwise.

Request validation failures return `422`. Valid requests with unsupported values or unusable image/key data generally return `400`. Unexpected processing failures return `500` with a `detail` message.

## Health and samples

### `GET /api/health`

Returns service diagnostics.

```json
{
  "status": "healthy",
  "service": "CipherLens Computational Imaging Core",
  "version": "0.1.0",
  "engine": "FastAPI + NumPy/SciPy"
}
```

### `GET /api/processing/samples`

Returns the bundled Cat 512 benchmark when available, plus generated frequency-zone-plate, checkerboard, and resolution-bar samples.

```json
{
  "samples": [
    {
      "id": "cat512",
      "name": "Cat Benchmark (512×512)",
      "description": "...",
      "image": "data:image/png;base64,...",
      "width": 512,
      "height": 512
    }
  ]
}
```

## Image processing

All processing operations return the following shape:

```json
{
  "status": "COMPLETE",
  "filter": "Gaussian Blur",
  "output_image": "data:image/png;base64,...",
  "metadata": {},
  "latency_ms": 12.34
}
```

### `POST /api/processing/convolution`

Applies a custom odd-sized 2D kernel.

```json
{
  "image": "data:image/png;base64,...",
  "kernel": [[0, -1, 0], [-1, 5, -1], [0, -1, 0]],
  "normalize": false
}
```

### `POST /api/processing/gaussian`

```json
{
  "image": "data:image/png;base64,...",
  "kernel_size": 5,
  "sigma": 1.5
}
```

`kernel_size` must be a positive odd integer.

### `POST /api/processing/median`

```json
{
  "image": "data:image/png;base64,...",
  "kernel_size": 3
}
```

### `POST /api/processing/sobel`

```json
{
  "image": "data:image/png;base64,..."
}
```

Returns the normalized Sobel gradient magnitude.

### `POST /api/processing/deconvolution`

Applies Wiener deconvolution with a Gaussian or custom point-spread function.

```json
{
  "image": "data:image/png;base64,...",
  "mode": "GAUSSIAN",
  "kernel_size": 5,
  "sigma": 1.0,
  "K": 0.01,
  "kernel": null
}
```

Use `mode: "CUSTOM"` and supply `kernel` for a custom model.

## Encryption and decryption

Transform endpoints other than DRPE use an `action` field set to `"encrypt"` or `"decrypt"`. Their common response contains `status`, `algorithm`, `action`, `output_image`, visualization `stages`, `metadata`, and `latency_ms`. Fourier and Spectral Hybrid may also return `spectrum`.

### `POST /api/encryption/drpe/encrypt`

```json
{
  "image": "data:image/png;base64,...",
  "seed1": 1234,
  "seed2": 5678
}
```

The response includes the visual ciphertext, 4f pipeline stages, metadata, and the exact complex ciphertext package in `ciphertext_real`, `ciphertext_imag`, and `ciphertext_shape`.

### `POST /api/encryption/drpe/decrypt`

```json
{
  "ciphertext": "data:image/png;base64,...",
  "seed1": 1234,
  "seed2": 5678,
  "reference_image": "data:image/png;base64,..."
}
```

`reference_image` is optional. When supplied, the response can include quality metrics and a difference heatmap.

### `POST /api/encryption/fourier`

```json
{
  "image": "data:image/png;base64,...",
  "seed": 100,
  "action": "encrypt"
}
```

### `POST /api/encryption/dct`

```json
{
  "image": "data:image/png;base64,...",
  "seed": 42,
  "action": "encrypt"
}
```

### `POST /api/encryption/arnold-xor`

```json
{
  "image": "data:image/png;base64,...",
  "itr": 10,
  "xor_value": 170,
  "action": "encrypt"
}
```

### `POST /api/encryption/chaos`

```json
{
  "image": "data:image/png;base64,...",
  "x0": 0.4,
  "r": 3.99,
  "action": "encrypt"
}
```

The logistic-map key requires `0 < x0 < 1` and `3.5 <= r <= 4.0`.

### `POST /api/encryption/spectral-hybrid`

```json
{
  "image": "data:image/png;base64,...",
  "scramble_seed": 42,
  "mask_seed": 99,
  "kernel_seed": 7,
  "action": "encrypt"
}
```

### `POST /api/encryption/feistel`

```json
{
  "image": "data:image/png;base64,...",
  "seed": 42,
  "rounds": 8,
  "action": "encrypt"
}
```

The implementation accepts 4 through 16 rounds.

### Exact-ciphertext preload endpoints

The visual PNG produced by a complex or floating-point transform is not sufficient to reconstruct the exact ciphertext. CipherLens key packages therefore retain encoded numerical planes. These endpoints load those planes into the backend's process-local cache before decryption:

- `POST /api/encryption/drpe/preload`
- `POST /api/encryption/fourier/preload`
- `POST /api/encryption/dct/preload`
- `POST /api/encryption/spectral-hybrid/preload`

DRPE, Fourier, and Spectral Hybrid accept `ciphertext_real`, `ciphertext_imag`, `ciphertext_shape`, and `visual_uri`. DCT accepts `ciphertext_real`, `ciphertext_shape`, and `visual_uri`. A successful response has `status: "CACHED"`.

The cache is in memory and local to one backend process. It is not durable and is not shared between multiple workers or replicas.

## Analysis

### `POST /api/analysis/entropy`

Request: `{"image": "data:image/png;base64,..."}`

Returns Shannon entropy, the 8-bit theoretical maximum, and latency.

### `POST /api/analysis/correlation`

```json
{
  "image": "data:image/png;base64,...",
  "num_samples": 1500
}
```

Returns horizontal, vertical, and diagonal correlation coefficients plus sampled adjacent-pixel pairs.

### `POST /api/analysis/metrics`

```json
{
  "original_image": "data:image/png;base64,...",
  "target_image": "data:image/png;base64,...",
  "differential": false
}
```

Returns MSE, PSNR, and SSIM. With `differential: true`, it also returns NPCR and UACI between the supplied images.

### `POST /api/analysis/histogram`

Request: `{"image": "data:image/png;base64,..."}`

Returns 256 intensity bins, mean, standard deviation, and latency.

### `POST /api/analysis/full`

```json
{
  "plain_image": "data:image/png;base64,...",
  "cipher_image": "data:image/png;base64,...",
  "recovered_image": null,
  "diff_x": 0,
  "diff_y": 0,
  "algorithm": "DRPE",
  "key_params": {"seed1": 1234, "seed2": 5678}
}
```

`cipher_image` and `recovered_image` are optional. The response combines entropy, correlation, scatter samples, histograms, reconstruction quality, and differential statistics.

The endpoint's one-pixel differential re-encryption currently supports DRPE, Fourier, DCT, and Arnold-XOR. For other algorithm names it compares against the supplied ciphertext without running a second encryption.
