# PhaseLock — Complete Project Scope & Step-by-Step Implementation Guide

## 1. Project Information

**Project Name:** Bat_Signal

**Course:** CSE_220

**Group Members:**
| Roll | Name |
|---|---|
| 2305121 | Muhab |
| 2305149 | Abrar |

---

# 2. Project Goal
Bat_Signal is a web-based experimental platform that connects 2D Signal & Linear Systems concepts with image encryption and image processing.

The project combines:
- 2D spatial convolution
- 2D frequency-domain analysis
- Fourier transforms
- image filtering
- image encryption
- image decryption
- key sensitivity
- statistical/security analysis
- computational performance analysis
- visual comparison of experimental results

# 3. Main Research Questions

### Questions
1. How does a spatial-domain method compare with transform-domain methods?
2. How sensitive is DRPE to small changes in its phase keys?
3. How does image resolution affect processing time?
4. How does spatial filtering change the frequency characteristics of an image?
5. How do the four encryption methods compare in terms of statistical properties and computational cost?
6. How does preprocessing the image with different 2D filters affect the characteristics of DRPE encryption?


# 4. Important Design Principle

The system would be built as a modular pipeline.

A filter produces an image.

An encryption algorithm receives an image.

Therefore:

```text
Original Image
      |
      v
Filter / Preprocessing
      |
      v
Processed Image
      |
      v
Encryption Algorithm
      |
      v
Ciphertext
```
The encryption algorithm does **not** need to know which filter was used.
This keeps the implementation simple and modular.

---

# 5. Complete System Architecture

```text
                         ORIGINAL IMAGE
                              |
                              v
                 ┌──────────────────────────┐
                 │     2D CONVOLUTION LAB   │
                 │                          │
                 │  Select preprocessing:   │
                 │                          │
                 │   ┌──────────────────┐   │
                 │   │ No Filter        │   │
                 │   │ Gaussian         │   │
                 │   │ Sobel            │   │
                 │   │ Custom 2D Kernel │   │
                 │   └──────────────────┘   │
                 │                          │
                 └────────────┬─────────────┘
                              |
                              v
                       PROCESSED IMAGE
                              |
                              v
                 ┌──────────────────────────┐
                 │      ENCRYPTION LAB      │
                 │                          │
                 │  Select encryption:      │
                 │                          │
                 │   ┌──────────────────┐   │
                 │   │ Arnold + XOR     │   │
                 │   │ DCT              │   │
                 │   │ Fourier          │   │
                 │   │ DRPE             │   │
                 │   └──────────────────┘   │
                 │                          │
                 └────────────┬─────────────┘
                              |
                              v
                         CIPHERTEXT
                              |
                              v
                         DECRYPTION
                              |
                              v
                       RECOVERED IMAGE
                              |
                              v
                    ┌──────────────────┐
                    │     ANALYSIS     │
                    │                  │
                    │ Entropy          │
                    │ Histogram        │
                    │ Correlation      │
                    │ NPCR / UACI      │
                    │ MSE / PSNR       │
                    │ SSIM             │
                    │ Processing Time  │
                    └────────┬─────────┘
                             |
                             v
                         COMPARISON
```
---

# 6. Lab_1: Convolution Lab

## Purpose

The first lab demonstrates how a 2D signal can be modified using spatial filtering.

For an image \(f(x,y)\) and kernel \(h(x,y)\):

>\[
g(x,y)=f(x,y)*h(x,y)
\]*

where `*` represents 2D convolution.

The output is simply another image.


## Filter Options

The Convolution Lab will provide four choices.

### No Filter:
The original image is passed directly.

Purpose:

- Baseline
- Reference for all experiments

---

### Gaussian Filter:
Gaussian filtering smooths the image.

Example 3x3 kernel:

```text
1/16 *

[ 1  2  1 ]
[ 2  4  2 ]
[ 1  2  1 ]
```

Purpose:

- Smoothing
- Noise reduction
- Suppression of high-frequency detail
---

### Sobel Filter:
Sobel is a derivative-based edge detector.

```text
Horizontal Sobel:
[ -1   0   1 ]
[ -2   0   2 ]
[ -1   0   1 ]

Vertical Sobel:
[ -1  -2  -1 ]
[  0   0   0 ]
[  1   2   1 ]
```

The system support:
- Combined gradient magnitude

Purpose:

- Edge detection
- Emphasis of rapid intensity changes
- High-frequency feature extraction

---

### Custom 2D Kernel:
The user can enter their own convolution kernel.

Supported sizes:

- 3x3

Example:

```text
[ 1   0  -1 ]
[ 2   3  -2 ]
[ 1   0  -1 ]
```

The system applies:

\[
g(x,y)=f(x,y)*h(x,y)
\]

This demonstrates a user-defined 2D Linear Shift-Invariant system.
The custom kernel must remain a fixed kernel during one convolution operation.

---

# 7. Convolution Lab UI

The page should contain:

```text
Upload Image
     |
     v
Select Filter
     |
     +--> No Filter
     +--> Gaussian
     +--> Sobel
     +--> Custom Kernel
     (Choose Any one of above)
                |
                v
        Kernel Input Matrix
                |
                v
        [ Apply Convolution ]
                |
                v
      +---------------------+
      | Original | Filtered |
      +---------------------+
                |
                v
        Processing Time
                |
                v
       [ Send to Encryption ]
```

The user should be able to see:

- Original image
- Selected filter
- Kernel
- Filtered image
- Processing time
- Histogram
- Frequency spectrum

---

# 8. Lab_2: Encryption Lab

Four encryption methods will be implemented.

## Method 1 — Arnold Cat Map + XOR

```text
Image
  |
  v
Arnold Cat Map
  |
  v
Pixel Scrambling
  |
  v
XOR
  |
  v
Ciphertext
```

Purpose:

- Spatial-domain baseline
- Pixel permutation
- Additional XOR value transformation
---

## Method 2 — DCT-Based Encryption

```text
Image
  |
  v
2D DCT
  |
  v
Coefficient Transformation
  |
  v
Inverse DCT
  |
  v
Ciphertext
```

The exact coefficient transformation should be simple, deterministic, key-controlled, and documented.

Purpose:

- Transform-domain comparison
- Compare DCT with Fourier-based approaches

---

## Method 3 — Fourier-Domain Encryption

A simpler Fourier-domain encryption method will be implemented as a comparison against DRPE.

Pipeline:

```text
Image
  |
  v
2D FFT
  |
  v
Key-controlled Fourier coefficient manipulation
  |
  v
2D IFFT
  |
  v
Ciphertext
```

Purpose:

- Basic Fourier-domain baseline
- Compare a simpler Fourier method against DRPE

---

## Method 4 — DRPE

```text
Image
     |
     v
Random Phase Mask K1
     |
     v
2D FFT
     |
     v
Random Phase Mask K2
     |
     v
2D IFFT
     |
     v
Ciphertext
```
>The implementation must preserve the information required for correct decryption.

---

# 9. Encryption Lab UI

```text
Convolution_Lab Output Image / New Image
     |
     v
Select Encryption Algorithm
     |
     +--> Arnold + XOR
     +--> DCT
     +--> Fourier
     +--> DRPE
     |
     v
Configure / Generate Key
     |
     v
[ Encrypt ]
     |
     v
Ciphertext
     |
     +--> Histogram
     +--> Frequency Spectrum
     +--> Encryption Time
     |
     v
[ Decrypt ]
```

---

# 10. Ciphertext Display

For every encryption method, display:

- Original/input image
- Ciphertext
- Ciphertext histogram
- Optional frequency spectrum
- Encryption time
- Key information where appropriate


>The system should not claim the ciphertext is secure because it looks random.
>Instead, visual appearance should be supported by quantitative metrics.

---

# 11. Lab_3: Decryption Lab

Every encryption method must support decryption.
```text
Ciphertext
    |
    v
   Key
    |
    v
Recovered Image
```
The project will demonstrate three DRPE key conditions.

## Correct Key

Expected:

- Very low MSE
- High PSNR
- High SSIM
- Visually accurate reconstruction

---

## Minor Key Change

Use:

\[
K'=K+\epsilon
\]

Show:

- Recovered image
- MSE
- PSNR
- SSIM

---

## Completely Wrong Key

Expected:

- Poor reconstruction
- Low PSNR
- Low SSIM
- High MSE

---

# 12. Lab_4: Prepocessing_DRPE Experiment

The main research experiment connects the Convolution Lab and Encryption Lab.

The original image is processed using different preprocessing conditions.

Each resulting image is then encrypted using the same DRPE setup.

```text
                  ORIGINAL IMAGE
                       |
       +---------+-----+-----+--------+
       |         |           |        |
       v         v           v        v
   Unfiltered  Gaussian    Sobel    Custom
       |         |           |        |
       +---------+-----+-----+--------+
                       |
                       v
            Each Processed Image
                       |
                       v
                     DRPE
                       |
                       v
                  Ciphertext
                       |
                       v
                    Decrypt
                       |
                       v
                    Metrics
                       |
                       v
                   Comparison
```

This answers the Question:

> **How does preprocessing the image with different 2D filters affect the characteristics of DRPE encryption?**

The controlled variables should include:

- Same source image
- Same image resolution
- Same DRPE implementation
- Same DRPE keys
- Same experimental environment

---

# 13. Analysis Module

The analysis module will calculate the following.

## Entropy

\[
H=-\sum_i p_i\log_2(p_i)
\]

For an 8-bit image, the theoretical maximum entropy is 8 bits/pixel.

---

## Histogram

Display:

- Original histogram
- Filtered histogram
- Ciphertext histogram
- Recovered-image histogram

---

## Pixel Correlation

Calculate:

- Horizontal correlation
- Vertical correlation
- Diagonal correlation

A natural image normally has strong neighboring-pixel correlation.

Encrypted images should ideally have correlation closer to zero.

---

## NPCR

Number of Pixels Change Rate.

Used to measure how strongly a small plaintext change affects the ciphertext.

---

## UACI

Unified Average Changing Intensity.

Used to measure average intensity changes between two ciphertexts.

---

# 14. Reconstruction Metrics

For original vs recovered image:

## MSE

\[
MSE=
\frac{1}{MN}
\sum_{x=1}^{M}
\sum_{y=1}^{N}
(I(x,y)-I'(x,y))^2
\]

Lower is better.

## PSNR

\[
PSNR=
10\log_{10}
\left(
\frac{MAX_I^2}{MSE}
\right)
\]

Higher is better.

## SSIM

Structural Similarity Index.

Used to measure structural similarity between original and recovered images.

---

# 15. Key Sensitivity Experiment

DRPE keys will be modified progressively.

Example:

\[
10^{-1},10^{-2},10^{-3},...,10^{-10}
\]

For each perturbation:

```text
Modify Key
    |
    v
Decrypt
    |
    v
Calculate MSE / PSNR / SSIM
    |
    v
Store Result
```

Generate:

- PSNR vs key perturbation
- SSIM vs key perturbation
- MSE vs key perturbation

This gives a quantitative key-sensitivity demonstration.

---

# 16. Performance Analysis

Measure:

- Convolution time
- Encryption time
- Decryption time
- Total processing time

Recommended image sizes:

- 256 × 256
- 512 × 512
- 1024 × 1024

Generate:

\[
Processing\ Time\ vs.\ Image\ Resolution
\]

---

# 17. Lab_5: Four-Algorithm Comparison

Use the same input image and controlled conditions to compare:

1. Arnold + XOR
2. DCT
3. Fourier
4. DRPE

Comparison metrics:

| Metric | Arnold + XOR | DCT | Fourier | DRPE |
|---|---:|---:|---:|---:|
| Entropy | ✓ | ✓ | ✓ | ✓ |
| Histogram | ✓ | ✓ | ✓ | ✓ |
| Horizontal Correlation | ✓ | ✓ | ✓ | ✓ |
| Vertical Correlation | ✓ | ✓ | ✓ | ✓ |
| Diagonal Correlation | ✓ | ✓ | ✓ | ✓ |
| NPCR | ✓ | ✓ | ✓ | ✓ |
| UACI | ✓ | ✓ | ✓ | ✓ |
| MSE | ✓ | ✓ | ✓ | ✓ |
| PSNR | ✓ | ✓ | ✓ | ✓ |
| SSIM | ✓ | ✓ | ✓ | ✓ |
| Encryption Time | ✓ | ✓ | ✓ | ✓ |
| Decryption Time | ✓ | ✓ | ✓ | ✓ |
| Key Sensitivity | — | — | — | ✓ |
>this will calculate which one is best is what case and which is worse
>The best output number will be in green, worst in red and rest in gray
---


# A. Presentation

The final demonstration should follow this story.

## Part 1 — Signal Processing

Upload an image.

Show:

```text
Original
   |
   +--> Gaussian
   +--> Sobel
   +--> Custom Kernel
```
---

## Part 2 — Encryption

Use an image.

Compare:

```text
Arnold + XOR
DCT
Fourier
DRPE
```

Show ciphertexts.

---

## Part 5 — Decryption

Show:
```text
Correct Key
Minor Key Error
Wrong Key
```
Compare recovered images.

---

## Part 6 — Preprocessing_DRPE
Show:

```text
Original → DRPE
Gaussian → DRPE
Sobel → DRPE
Custom Kernel → DRPE
```

Compare:

- Entropy
- Correlation
- NPCR
- UACI
- PSNR
- SSIM
- Time

Answer:

> How does preprocessing affect DRPE characteristics?

---

## Part 7 — Encryption Comparison

Show:

```text
Arnold + XOR
DCT
Fourier
DRPE
```

and discuss the trade-offs between:

- security-related metrics
- reconstruction quality
- key sensitivity
- computational cost
---

# B. Final Scope Checklist

## Signal Processing

- [x] No filter
- [x] Gaussian
- [x] Sobel
- [x] Custom 2D kernel

## Encryption

- [x] Arnold Cat Map + XOR
- [x] DCT
- [x] Fourier-domain method
- [x] DRPE

## Decryption

- [x] Correct key
- [x] Minor key modification
- [x] Completely wrong key

## Analysis

- [x] Entropy
- [x] Histogram
- [x] Horizontal correlation
- [x] Vertical correlation
- [x] Diagonal correlation
- [x] NPCR
- [x] UACI
- [x] MSE
- [x] PSNR
- [x] SSIM
- [x] Key sensitivity
- [x] Processing time

# C. Conclusions
>Preprocessing affects the input signal presented to DRPE by modifying its spatial and frequency-domain characteristics. However, because DRPE applies random phase modulation and Fourier-domain processing, these changes may not translate directly into large improvements in ciphertext security metrics. The experiments show which preprocessing operations produce measurable changes in entropy, pixel correlation, differential characteristics, reconstruction quality, and computational cost. Therefore, preprocessing should be evaluated as a signal-processing operation rather than assumed to improve encryption security.That's a much stronger scientific answer than saying: "Gaussian makes DRPE more secure." Because we aren't assuming the result—we're measuring it. And this is exactly why our project is interesting.
