# CipherLens

CipherLens is an interactive laboratory for studying two-dimensional signals through image processing, transform-domain encryption, decryption, and quantitative cryptanalysis. It was developed as a **CSE220: Signals and Linear Systems Sessional** project.

The repository is organized as two independently deployable applications:

- `frontend/` - Next.js 16 and TypeScript user interface
- `backend/` - FastAPI REST API and the Python numerical engine

## Features

- Custom 2D convolution, Gaussian and median filtering, Sobel edge detection, and Wiener deconvolution
- DRPE, Fourier, DCT, Arnold-XOR, chaos, Feistel, and spectral-hybrid encryption workflows
- Matching decryption workflows and downloadable key files
- Entropy, adjacent-pixel correlation, histogram, MSE, PSNR, SSIM, NPCR, and UACI analysis
- Interactive pixel inspection, split comparison, 3D image topography, charts, and optical pipeline diagrams
- Built-in benchmark and synthetic test images

## Architecture

```text
Browser
   |
   | HTTPS / JSON and image data URIs
   v
frontend/                         backend/
Next.js 16                        FastAPI
   |                                 |
   | NEXT_PUBLIC_API_URL             v
   +--------------------------> src/batsignal/
                                  NumPy/SciPy/OpenCV engine
```

The frontend knows the backend only through `NEXT_PUBLIC_API_URL`. The backend accepts browser requests only from the origins configured in `CORS_ORIGINS`, so the two applications can be hosted on different domains without sharing a filesystem or process.

## Repository layout

```text
CipherLens/
├── frontend/                  # Independently deployable Next.js application
│   ├── app/                   # Pages and layouts
│   ├── components/            # UI, charts, image viewers, and diagrams
│   ├── hooks/                 # Workspace and operation state
│   ├── lib/api/               # Typed FastAPI client
│   ├── public/                # Images used by the live interface
│   ├── Dockerfile
│   └── package.json
├── backend/                   # Independently deployable Python application
│   ├── api/                   # Routes, schemas, and services
│   ├── src/batsignal/         # Processing, encryption, I/O, and analysis core
│   ├── tests/                 # Unit and API integration tests
│   ├── Dockerfile
│   ├── pyproject.toml
│   └── uv.lock
├── docs/                      # API, architecture, and core contracts
└── README.md
```

## Local development

### Prerequisites

- Python 3.12 or newer
- [uv](https://docs.astral.sh/uv/)
- Node.js 20 or newer
- npm

### 1. Start the backend

```bash
cd backend
uv sync
uv run uvicorn api.main:app --reload --host 0.0.0.0 --port 8000
```

The API is available at `http://127.0.0.1:8000`; interactive OpenAPI documentation is at `http://127.0.0.1:8000/docs`.

### 2. Start the frontend

In a second terminal:

```bash
cd frontend
cp .env.example .env.local
npm ci
npm run dev
```

Open `http://localhost:3000`.

## Environment variables

### Frontend

| Variable | Required in production | Description |
| --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | Yes | Public backend origin, for example `https://api.example.com`. It is embedded at build time. |

### Backend

| Variable | Required in production | Description |
| --- | --- | --- |
| `CORS_ORIGINS` | Yes | Comma-separated frontend origins, for example `https://cipherlens.example.com,https://www.cipherlens.example.com`. |

Do not add a trailing slash to either origin. Never place secrets in a `NEXT_PUBLIC_` variable.

## Quality checks

Backend:

```bash
cd backend
uv run pytest
uv run ruff check .
```

Frontend:

```bash
cd frontend
npm run lint
npm run build
```

## Documentation

- [REST API reference](docs/API.md)
- [Architecture](docs/Architecture.md)
- [Core contracts](docs/Core_Contracts.md)

## Team

| Name | Roll | GitHub |
| --- | --- | --- |
| Abrar Ryan | 2305149 | [abrar-raad1705](https://github.com/abrar-raad1705) |
| Muhab Ahmed Abir | 2305121 | [Muhab2004](https://github.com/Muhab2004) |

## Academic context

- **Course:** CSE220 - Signals and Linear Systems Sessional
- **Project:** CipherLens
