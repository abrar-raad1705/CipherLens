# CipherLens Architecture

## System boundaries

CipherLens is a monorepo containing two independently runnable applications and one Python computational package.

```text
┌─────────────────────────────┐
│ frontend/                   │
│ Next.js 16 + React 19       │
│ Pages, workspace, charts    │
└──────────────┬──────────────┘
               │ HTTP/JSON and PNG data URIs
               │ NEXT_PUBLIC_API_URL
               ▼
┌─────────────────────────────┐
│ backend/api/                │
│ FastAPI routes and services │
└──────────────┬──────────────┘
               │ NumPy arrays and key objects
               ▼
┌─────────────────────────────┐
│ backend/src/batsignal/      │
│ Scientific computation      │
│ processing / encryption     │
│ analysis / io               │
└─────────────────────────────┘
```

The frontend and backend share no runtime filesystem. The browser receives the backend origin through `NEXT_PUBLIC_API_URL`; the backend permits configured browser origins through `CORS_ORIGINS`.

## Frontend

The Next.js App Router application provides four user-facing work areas:

- Overview and image selection
- Image processing
- Encryption and decryption
- Cryptanalysis

`WorkspaceProvider` keeps image artifacts in an in-memory client store for the current page session. It fetches benchmark presets from the backend and lets pages promote generated images into later workflows. Targeted handoffs to the analysis page use `sessionStorage`; artifacts are intentionally not persisted to a database or browser `localStorage`.

Visualization responsibilities are split by medium:

- HTML Canvas renders image inspection and before/after comparisons.
- Three.js renders image topography and 3D correlation/phase views.
- Apache ECharts renders intensity histograms.
- SVG/React markup renders the optical bench diagram.

The frontend API layer under `frontend/lib/api/` is the only application boundary that needs the backend URL.

## Backend API

The FastAPI application follows a route-schema-service structure:

```text
backend/api/
├── main.py       # Application, CORS, and router registration
├── routes/       # HTTP endpoints and error mapping
├── schemas/      # Pydantic request/response contracts
└── services/     # Serialization and computational orchestration
```

Routes validate JSON with Pydantic and delegate work to services. Services decode image data, call the pure `batsignal` functions, encode results as PNG data URIs, and attach visualization metadata and latency.

Most requests are stateless. DRPE, Fourier, DCT, and Spectral Hybrid are exceptions: their display PNGs lose exact numerical ciphertext information, so the encryption service maintains a process-local in-memory cache keyed by the visual ciphertext. Key packages can repopulate that cache through preload endpoints.

This cache has two operational consequences:

- It is cleared when the backend process restarts.
- It is not shared across workers or replicas; deployments using these cross-session decryptions should use one worker or introduce shared ciphertext storage.

## Computational core

`backend/src/batsignal/` contains framework-independent numerical code:

- `processing/`: convolution, Gaussian and median filtering, Sobel gradients, and Wiener deconvolution
- `encryption/`: Arnold-XOR, Chaos, DCT, DRPE, Feistel, Fourier, and Spectral Hybrid algorithms
- `analysis/`: entropy, correlation, MSE, PSNR, SSIM, NPCR, and UACI
- `io/`: image loading and saving helpers
- `pipeline/`: the bundled Cat 512 benchmark asset

The core accepts NumPy arrays and key objects. It does not import FastAPI or frontend code.

## Experiment data flow

```text
Upload or benchmark image
          │
          ▼
   Workspace artifact
          │
          ├──► Processing ──► processed artifact
          │
          ├──► Encryption ──► ciphertext + key package
          │                         │
          │                         ▼
          │                    Decryption
          │
          └────────────────────────► Analysis
```

Images cross the HTTP boundary as PNG data URIs. Exact floating-point or complex ciphertext planes needed for later decryption are base64-encoded separately in downloadable key data and restored through the preload endpoints.

## Build and test boundaries

- `frontend/package.json` and `frontend/package-lock.json` define the Node.js application.
- `backend/pyproject.toml` and `backend/uv.lock` define the Python application.
- Each application has its own Dockerfile and build context.
- Backend unit and integration tests live under `backend/tests/`.
