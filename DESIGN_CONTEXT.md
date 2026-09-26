# Bat_Signal Design & Architecture Context

This document captures the design philosophy, UI/UX conventions, layout patterns, and implementation guidelines established during the refactoring of the Cryptographic Laboratory & Encryption workspace. 

When applying updates to other pages (such as **Decryption**, **Image Processing / Convolution**, **Quantitative Analysis**, or **Playground**), adhere strictly to the standards documented here to ensure complete architectural and visual consistency.

---

## 1. Core Visual Language & Aesthetic Philosophy

* **Scientific Instrument / Cryptographic Workstation**: The interface should feel like a high-end physics lab or signal analysis console (inspired by MATLAB, Linear, Blender, and high-density precision CAD workstations).
* **Dark-Mode First & Low Eye Strain**:
  * Dark theme background palette: `#0C0C0C` / `#101010` (outer canvas), `#141414` / `#161616` (cards & containers), `#242424` / `#282828` (borders & dividers).
  * Light theme background palette: `#FAFAF8` / `#FFFFFF`, `#E5E5DE` / `#E8E8E3` (subtle borders).
* **Vertical Space Efficiency**:
  * High information density without visual clutter.
  * Reduce excessive paddings and margins so primary data and canvases remain visible above the fold without unnecessary scrolling.
* **Eliminate Redundancy**:
  * Avoid duplicate actions (e.g., no separate "minimize" button when an "exit" button exists in modal/fullscreen viewports).
  * Header/topbar should stay minimal: active target image pill + theme toggle. No promotional or extraneous shortcut buttons in the top navbar.

---

## 2. Page Structure & Layout Hierarchy

Every analytical workbench page follows this three-tier vertical flow:

```
┌────────────────────────────────────────────────────────────────────────┐
│ 1. COMPACT HEADER: Category kicker, Title, Subtitle                    │
├────────────────────────────────────────────────────────────────────────┤
│ 2. MODULE / ALGORITHM SELECTOR CARDS (Compact, single-row grid)        │
├───────────────────────────────────────────────────────┬────────────────┤
│ 3. PRIMARY HERO WORKBENCH VIEWPORT                    │ METRICS / INFO │
│    - Multi-mode segmented tabs (Original, Encrypted,  │ SIDEBAR        │
│      Split, Side-by-Side, Difference, 3D Topography)  │ - Latency      │
│    - Execution Pipeline Flow                          │ - Entropy/NPCR │
│    - Canvas / Spectrogram / Visual Display            │ - Key Params   │
│    (~72-75% flex width)                               │ (~260-280px)   │
└───────────────────────────────────────────────────────┴────────────────┘
```

### A. Compact Header Section
* **Category Kicker**: Uppercase monospace label with tracking (e.g., `CRYPTOGRAPHIC LABORATORY`, `SIGNAL CONVOLUTION SUITE`).
* **Title & Subtitle**: Tight vertical spacing (~20–25% shorter than boilerplate templates).
* **Divider**: Subtle 1px border (`border-[#E8E8E3] dark:border-[#242424]`).

### B. Module / Algorithm Selector Cards
* Single horizontal grid (e.g., 4 cards for DRPE, Fourier Phase, DCT, Arnold Cat Map).
* **Card Height**: Short and compact with reduced internal padding (`p-3` or `py-2.5 px-3.5`).
* **Selected State**:
  * Blue outline: `border-blue-500 dark:border-blue-400`
  * Active glow / background tint: `ring-1 ring-blue-500/20 bg-blue-500/5 dark:bg-blue-500/10`
* **Inactive State**: Muted border with hover transition (`hover:border-[#D0D0C8] dark:hover:border-[#333333]`).

### C. Two-Column Asymmetric Workbench Grid
* **Left Column (Hero Viewport)**: Takes majority width (`flex-1` / 72–75%).
* **Right Column (Metrics Sidebar)**: Consistent fixed-width (`w-72` to `w-80` / 260–280px) ensuring top and bottom edges strictly align with the left viewport.

---

## 3. Pipeline Flow & Execution Diagram Conventions

### A. Continuous Line Beam (No Disconnected Arrows)
* **Single Unbroken Rail**: The pipeline connector is **one continuous track** extending from the center of the first node (`Original`) to the center of the last node (`Ciphertext` or output).
* **Continuous Fill Animation**:
  * When executing or selecting stages, the active blue line fills **continuously from left to right** across the entire pipeline (`transition-[width] duration-700 ease-out`).
  * **DO NOT** animate each segment individually or in parallel. It must feel like an optical light beam propagating from source to output.
  * During execution (`isExecuting = true`), a coherent continuous wavefront sweeps across the entire rail (`animate-pipeline-beam-continuous` / `animate-pipeline-continuous-fill`).

### B. Node Representation & Typography
* **Nodes**: Circular preview badges (`w-12 h-12` rounded-full with solid background and `z-10`) positioned over the continuous rail (`z-0`) so the beam passes seamlessly behind them.
* **Under-Node Labels**:
  * **Keep only the primary mathematical / domain identifier**: `f(x, y)`, `Spatial Phase`, `Frequency Plane`, `Fourier Phase`, `g(x, y)`.
  * **Do NOT add redundant subtitle lines** (e.g., remove repetitive `SOURCE · ORIGINAL`, `MASK 01 · R1`, etc.).
  * Font: Default sans-serif (`text-[11px] sm:text-xs tracking-tight`). Active: `text-blue-600 dark:text-blue-400 font-semibold`; Inactive: `text-[#6F6F6A] dark:text-[#A0A09B]`.

### C. Floating Connector Labels (Operations between stages)
* Positioned directly above the connector beam at the midpoint between adjacent nodes.
* **Unboxed Design**: **Do not box out the terms**. No borders, no pill backgrounds, no badges, no drop-shadow boxes.
* **Typography**: Identical sans-serif font family and styling as `f(x, y)` (`text-[11px] sm:text-xs tracking-tight transition-colors whitespace-nowrap`).
* Active state highlights in blue (`text-blue-600 dark:text-blue-400 font-medium`).
* **Canonical Operation Terms**:
  * **DRPE**: `Mask 01` → `FFT` → `Mask 02` → `IFFT`
  * **Fourier Phase**: `FFT` → `Permutation` → `IFFT`
  * **DCT**: `DCT` → `Permutation` → `IDCT` *(Inverse Discrete Cosine Transform)*
  * **Arnold Cat Map**: `Pixel Scrambling` → `Bit Mask` → `XOR Diffusion`
  * **Spectral Hybrid**: `Pixel Permute` → `FFT Transform` → `Phase Mask` → `Kernel Convolve`
  * **Feistel Cipher**: `Round 1 Mixing` → `Iterative Rounds` → `Final Avalanche`

---

## 4. Viewport, Comparison & Canvas Controls

### A. Segmented Mode Switchers
* Low-profile segmented tab buttons with subtle active indicator:
  `Original` | `Encrypted` | `Split` | `Side by Side` | `Difference` | `3D Topography`
* Active tab: `bg-white dark:bg-[#202020] border-[#D0D0C8] dark:border-[#383838] text-[#181818] dark:text-[#F2F2F0] font-medium`.

### B. Shimmer & State Transitions
* When re-rendering WebGL or switching views, avoid jarring text like `"Rendering WebGL..."`.
* Use a subtle ambient **shimmer overlay** across the canvas window.

### C. Fullscreen & Modal Workbenches
* Fullscreen mode includes a single clean **Exit** button (`Esc` or top-right button).
* Remove unnecessary minimize or dual close buttons.

---

## 5. 3D Topography Viewer Standards

* **Hero Staging**:
  * 3D terrain is enlarged (~20% larger than default), centered vertically with reduced empty space above.
  * Controlled lower camera angle (`controls.maxPolarAngle = Math.PI / 2 - 0.04`, target at `(0, 10, 0)`).
* **Background Axis & Floor Grid**:
  * Grid lines must be **clearly visible and distinguishable**, not washed out or invisible.
  * **Center Reference Axes**: `#5a5a5a` (dark mode) / `#787870` (light mode).
  * **Grid Floor Lines**: `#383838` (dark mode) / `#c0c0b8` (light mode).
  * Material opacity: `~0.75` so coordinate reference lines ground the 3D surface firmly.
* **Colormap / Colorway Selector**:
  * Dropdown options must have appropriate z-index (`z-50`) to render in front of the WebGL canvas, never behind it.
  * Option labels must fit on **a single horizontal line** (e.g. `Signal Emerald`, `Plasma Heat`, `Viridis Spectrum`, `Monochrome`).
  * Include a small color swatch gradient icon next to each colormap option.
* **HUD & Floating Controls**:
  * Interaction hint: small translucent HUD in the bottom-left corner with centered text (`Drag mouse to rotate 360° · Scroll to zoom`).
  * Height scale slider: Floating control with site-wide blue accent slider (`#2563EB` / `bg-blue-500`) and numeric readout (`40×`).

---

## 6. Global Navigation & Topbar

* **Clean Header**:
  * Left: Brand / Logo + Breadcrumbs / Page name.
  * Center/Right: Target image thumbnail pill (`cat.jpeg (736×736) | Change Image`) + Theme toggle (Sun / Moon).
  * Do NOT clutter the top header with extra action buttons (like Playground or secondary links). Keep navigation in the sidebar or mobile menu.

---

## 7. Quick Checklist for Future Pages

When implementing or refactoring other workbench pages:
1. [ ] Header vertical spacing compressed by ~25% with category kicker.
2. [ ] Hero visualization has prominence over sidebars (75% / 25% distribution).
3. [ ] If a multi-stage pipeline is used, lines fill **continuously** from node 0 to N.
4. [ ] Connector labels are **unboxed** and share the exact typography of node text (`f(x, y)`).
5. [ ] WebGL 3D views feature high-contrast visible floor axis grids and proper z-index overlays.
6. [ ] Colorway / colormap dropdown text stays on a single line.
7. [ ] Sliders and active elements use the primary site blue accent (`#2563EB` / `rgb(37 99 235)`).
8. [ ] No redundant buttons (e.g., no minimize button if exit button exists, no playground button in topbar).
