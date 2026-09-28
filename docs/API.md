# CipherLens REST API Reference

The CipherLens API is a high-performance REST application layer built on FastAPI that interfaces the Next.js laboratory frontend with the computational Python imaging library (`batsignal`).

Base URL: `http://127.0.0.1:8000/api`
Interactive OpenAPI Docs: `http://127.0.0.1:8000/docs`

---

## 1. Health & Benchmark Diagnostics

### `GET /api/health`
Retrieves API operational status and computational library availability.

**Response `200 OK`**:
```json
{
  "status": "healthy",
  "service": "CipherLens Computational Imaging Core",
  "version": "0.1.0",
  "engine": "FastAPI + NumPy/SciPy"
}
```

### `GET /api/processing/samples`
Supplies standard research benchmarks (Cat 512, Synthetic Frequency Zone Plate, High-Contrast Checkerboard, Optical Resolution Grating) formatted as base64 PNG data URIs.

---

## 2. Spatial Image Processing Bench

### `POST /api/processing/convolution`
Executes spatial 2D discrete convolution with a custom kernel matrix.

**Request Body**:
```json
{
  "image": "data:image/png;base64,...",
  "kernel": [[0, -1, 0], [-1, 5, -1], [0, -1, 0]],
  "normalize": false
}
```

**Response `200 OK`**:
```json
{
  "status": "COMPLETE",
  "filter": "Custom Convolution",
  "output_image": "data:image/png;base64,...",
  "metadata": {
    "kernel_shape": "3×3",
    "normalized": false,
    "dimensions": "512×512"
  },
  "latency_ms": 14.2
}
```

### `POST /api/processing/gaussian`
Applies 2D Gaussian kernel smoothing.

**Request Body**:
```json
{
  "image": "data:image/png;base64,...",
  "kernel_size": 5,
  "sigma": 1.5
}
```

### `POST /api/processing/median`
Applies non-linear 2D rank-order median filtering.

**Request Body**:
```json
{
  "image": "data:image/png;base64,...",
  "kernel_size": 3
}
```

### `POST /api/processing/sobel`
Computes gradient vector magnitude: $|G| = \sqrt{G_x^2 + G_y^2}$.

### `POST /api/processing/deconvolution`
Executes analytical Wiener deconvolution filter restoration.

**Request Body**:
```json
{
  "image": "data:image/png;base64,...",
  "mode": "GAUSSIAN",
  "kernel_size": 5,
  "sigma": 1.0,
  "K": 0.01
}
```

---

## 3. Optical Cryptosystems Bench

### `POST /api/encryption/drpe/encrypt`
Executes Double Random Phase Encoding (DRPE) through a simulated 4f coherent optical system:
$$C(x, y) = \mathcal{F}^{-1}\left\{ \mathcal{F}\left[ f(x,y) R_1(x,y) \right] R_2(u,v) \right\}$$

**Request Body**:
```json
{
  "image": "data:image/png;base64,...",
  "seed1": 1234,
  "seed2": 5678
}
```

**Response `200 OK`**:
```json
{
  "status": "COMPLETE",
  "algorithm": "DRPE",
  "ciphertext": "data:image/png;base64,...",
  "stages": {
    "original": "data:image/png;base64,...",
    "r1_phase": "data:image/png;base64,...",
    "fourier_spectrum": "data:image/png;base64,...",
    "r2_phase": "data:image/png;base64,...",
    "ciphertext": "data:image/png;base64,..."
  },
  "metadata": {
    "seed1": 1234,
    "seed2": 5678,
    "shape": "512×512",
    "complex_stats": { ... }
  },
  "latency_ms": 28.5
}
```

### `POST /api/encryption/drpe/decrypt`
Decodes DRPE ciphertext using conjugate Fourier and spatial phase keys:
$$\hat{f}(x, y) = \mathcal{F}^{-1}\left\{ \mathcal{F}[C(x,y)] R_2^*(u,v) \right\} R_1^*(x,y)$$

### `POST /api/encryption/fourier`
Applies Fourier domain coordinate shuffling with pseudorandom permutation seeds.

### `POST /api/encryption/dct`
Applies Discrete Cosine Transform 2D block coefficient scrambling.

### `POST /api/encryption/arnold-xor`
Applies periodic Arnold Cat Map matrix scrambling combined with dynamic bitwise XOR mask.

---

## 4. Quantitative Cryptanalysis Bench

### `POST /api/analysis/entropy`
Computes Shannon information entropy:
$$H(m) = -\sum_{i=0}^{255} p(m_i) \log_2 p(m_i)$$
Theoretical maximum for 8-bit uniform noise: $8.0000$ bits/pixel.

### `POST /api/analysis/correlation`
Computes Pearson correlation coefficients across horizontal, vertical, and diagonal adjacent pixel pairs:
$$r_{xy} = \frac{\sum (x_i - \bar{x})(y_i - \bar{y})}{\sqrt{\sum (x_i - \bar{x})^2 \sum (y_i - \bar{y})^2}}$$
Also returns coordinate samples $(x_i, y_i)$ for interactive scatter plots.

### `POST /api/analysis/metrics`
Evaluates reconstruction fidelity (MSE, PSNR, SSIM) and optional differential sensitivity metrics (NPCR, UACI).

### `POST /api/analysis/histogram`
Computes 256-bin intensity counts from $0$ to $255$.

### `POST /api/analysis/full`
Unified cryptanalysis endpoint returning combined entropy, correlation, scatter samples, histograms, differential sensitivity, and recovery fidelity.
