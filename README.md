# BAT SIGNAL

> An interactive 2D signal processing and optical image encryption laboratory.

BAT SIGNAL pairs a research-grade Python computational imaging engine with a minimalist, modern Next.js 16 laboratory interface. It provides real-time exploration of spatial filtering operators, 4f Double Random Phase Encoding (DRPE), optical phase transformations, and quantitative cryptanalysis.

---

## 1. Technology Stack

- **Frontend**: Next.js 16, TypeScript, Tailwind CSS, customized minimalist UI primitives, Motion, Lucide icons
- **Visualizations**: Native HTML Canvas (split-comparison & pixel loupe), SVG (4f optical bench diagrams), Apache ECharts (intensity histograms & correlation scatter plots)
- **Backend**: FastAPI, Uvicorn, Pydantic schemas
- **Computational Core**: Pure Python `batsignal` package (NumPy, SciPy, OpenCV, Pillow, scikit-image)

---

## 2. Quick Start & Development Commands

### Prerequisites
- Python >= 3.12 with [uv](https://github.com/astral-sh/uv)
- Node.js >= 20 with npm

### 1. Python Environment & API Server
```bash
# Sync Python dependencies
uv sync

# Run FastAPI Application Server
uv run uvicorn api.main:app --reload --port 8000
```
Interactive API docs available at `http://127.0.0.1:8000/docs`.

### 2. Next.js Frontend
```bash
# Install frontend dependencies
cd web
npm install

# Run Next.js Development Server
npm run dev
```
Laboratory interface available at `http://localhost:3000`.

---

## 3. Repository Structure

```text
Bat_Signal/
├── src/
│   └── batsignal/              # Pure computational core
│       ├── analysis/           # Entropy, correlation, NPCR, UACI, MSE, PSNR, SSIM
│       ├── encryption/         # DRPE, Fourier, DCT, Arnold-XOR
│       ├── io/                 # Image reading/writing
│       ├── processing/         # Convolution, Gaussian, Median, Sobel, Deconvolution
│       └── pipeline/           # Benchmark imagery (cat512.png)
│
├── api/                        # FastAPI REST layer
│   ├── main.py                 # FastAPI application entrypoint
│   ├── routes/                 # Thin endpoint handlers
│   │   ├── health.py
│   │   ├── processing.py
│   │   ├── encryption.py
│   │   └── analysis.py
│   ├── schemas/                # Typed Pydantic request/response models
│   └── services/               # Orchestration & centralized serialization
│
├── web/                        # Next.js 16 Laboratory UI
│   ├── app/                    # App Router pages
│   │   ├── workspace/          # Ingestion & reusable artifact manager
│   │   ├── processing/         # Spatial filtering & deconvolution
│   │   ├── encryption/         # 4f DRPE & optical transforms
│   │   └── analysis/           # Quantitative cryptanalysis & charts
│   ├── components/
│   │   ├── ui/                 # Minimalist dark UI primitives
│   │   ├── image/              # Native Canvas split-comparators & pixel inspectors
│   │   ├── encryption/         # SVG 4f optical schematics
│   │   └── analysis/           # Apache ECharts (histograms & scatter plots)
│   ├── hooks/                  # Global artifact store & API hooks
│   └── lib/api/                # Typed API client
│
├── tests/
│   ├── unit/                   # Computational core unit tests
│   └── integration/            # FastAPI integration tests
│
├── docs/
│   ├── Core_Contracts.md       # Data types and mathematical contracts
│   ├── API.md                  # REST endpoint specifications
│   └── Architecture.md         # Monorepo architecture & artifact pipeline
│
├── pyproject.toml
└── README.md
```

---

## 4. Testing

Run all unit and API integration tests:

```bash
uv run pytest tests/unit tests/integration
```

Linting:

```bash
uv run ruff check .
```

Frontend production build check:

```bash
cd web && npm run build
```
