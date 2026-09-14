# Bat Signal Repository & System Architecture

## 1. Architectural Principles

Bat Signal implements a strict **three-tier architecture** with unambiguous separation between Presentation, Application API, and Scientific Computation:

```text
                    ┌─────────────────────────┐
                    │     Next.js 16 (web)    │
                    │   Minimalist Lab UI     │
                    └────────────┬────────────┘
                                 │
                                 │ HTTP / JSON / Base64 URIs
                                 ▼
                    ┌─────────────────────────┐
                    │      FastAPI (api)      │
                    │   Application REST API  │
                    └────────────┬────────────┘
                                 │
                                 │ Python Objects / NumPy arrays
                                 ▼
                    ┌─────────────────────────┐
                    │   BatSignal Core (src)  │
                    │    Pure Python Engine   │
                    ├─────────────────────────┤
                    │ processing              │
                    │ encryption              │
                    │ analysis                │
                    │ io                      │
                    └─────────────────────────┘
```

### Separation of Concerns
1. **Computational Core (`src/batsignal/`)**: Pure Python numerical packages (`processing`, `encryption`, `analysis`, `io`). Has zero dependencies on FastAPI, web frameworks, or UI state. Remains the computational source of truth.
2. **Application / REST Layer (`api/`)**: Built on FastAPI. Validates requests via Pydantic schemas, centralizes image encoding/decoding, orchestrates laboratory routines through dedicated service modules, and returns typed responses.
3. **Presentation Layer (`web/`)**: Next.js 16 application with TypeScript, Tailwind CSS, customized minimalist UI primitives, Native Canvas for split comparisons and inspection, SVG technical diagrams, and Apache ECharts for quantitative metrics.

---

## 2. Reusable Experiment Artifact Pipeline

Images and experimental results are modeled as **first-class reusable artifacts** rather than disposable page-local state:

```text
       Ingest Image (Upload / Benchmark)
                     │
                     ▼
           Artifact: "cat512"
                     │
         [Send to Processing Lab]
                     ▼
             Apply Gaussian Blur
                     │
                     ▼
       Artifact: "cat512 [Gaussian]"
                     │
         [Promote to Encryption Lab]
                     ▼
               4f DRPE Encrypt
                     │
                     ▼
    Artifact: "cat512 [DRPE Ciphertext]"
                     │
         [Promote to Analysis Lab]
                     ▼
      Quantitative Cryptanalysis (H, r, NPCR)
```

The global `WorkspaceProvider` retains artifacts across page navigations, allowing continuous experiment pipelining across all benches.

---

## 3. Visualization Hierarchy

1. **Native HTML Canvas**: Used for high-frequency pixel rendering, interactive before/after split sliders, and hover pixel coordinate and intensity loupe inspection.
2. **SVG Diagrams**: Used for technical schematics, such as the 4f coherent optical system (Laser $\rightarrow L_1 \rightarrow R_1 \rightarrow L_2 \rightarrow R_2 \rightarrow$ Detector) and pipeline graphs.
3. **Apache ECharts**: Used for quantitative charting including 256-bin histograms and adjacent pixel pair correlation scatter graphs.
