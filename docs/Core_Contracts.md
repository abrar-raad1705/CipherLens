# Bat_Signal Core Contracts

## 1. Image Representation

Normal input and recovered images:

```python
numpy.ndarray
```

```text
dtype: uint8
shape: (height, width)
value range: 0–255
image type: grayscale
```

Ciphertext:

```python
numpy.ndarray
```

Ciphertext dtype may be algorithm-dependent. Do not force transform-domain ciphertext into `uint8`.

---

## 2. Processing Contracts

### Gaussian

```python
import numpy as np


def apply_gaussian(image: np.ndarray) -> np.ndarray: ...
```

### Sobel

```python
import numpy as np


def apply_sobel(image: np.ndarray) -> np.ndarray: ...
```

### Custom 2D Kernel

```python
import numpy as np


def apply_custom_kernel(
    image: np.ndarray,
    kernel: np.ndarray,
) -> np.ndarray: ...
```

---

## 3. Encryption Contracts

Every encryption algorithm must expose:

```python
def encrypt(image: np.ndarray, key) -> np.ndarray: ...


def decrypt(ciphertext: np.ndarray, key) -> np.ndarray: ...
```

### Arnold + XOR

```python
def encrypt(image: np.ndarray, key) -> np.ndarray: ...


def decrypt(ciphertext: np.ndarray, key) -> np.ndarray: ...
```

### DCT

```python
def encrypt(image: np.ndarray, key) -> np.ndarray: ...


def decrypt(ciphertext: np.ndarray, key) -> np.ndarray: ...
```

### Fourier

```python
def encrypt(image: np.ndarray, key) -> np.ndarray: ...


def decrypt(ciphertext: np.ndarray, key) -> np.ndarray: ...
```

### DRPE

```python
def encrypt(image: np.ndarray, key) -> np.ndarray: ...


def decrypt(ciphertext: np.ndarray, key) -> np.ndarray: ...
```

---

## 4. Analysis Contracts

### Entropy

```python
import numpy as np


def calculate_entropy(image: np.ndarray) -> float: ...
```

### Correlation

```python
import numpy as np


def calculate_correlation(
    image: np.ndarray,
) -> dict[str, float]: ...
```

Expected result:

```python
{
    "horizontal": ...,
    "vertical": ...,
    "diagonal": ...,
}
```

### NPCR

```python
import numpy as np


def calculate_npcr(
    ciphertext1: np.ndarray,
    ciphertext2: np.ndarray,
) -> float: ...
```

### UACI

```python
import numpy as np


def calculate_uaci(
    ciphertext1: np.ndarray,
    ciphertext2: np.ndarray,
) -> float: ...
```

### MSE

```python
import numpy as np


def calculate_mse(
    original: np.ndarray,
    recovered: np.ndarray,
) -> float: ...
```

### PSNR

```python
import numpy as np


def calculate_psnr(
    original: np.ndarray,
    recovered: np.ndarray,
) -> float: ...
```

### SSIM

```python
import numpy as np


def calculate_ssim(
    original: np.ndarray,
    recovered: np.ndarray,
) -> float: ...
```

---

## 5. Module Boundaries

### Processing → Encryption

```python
processed_image: np.ndarray
```

```python
ciphertext = encrypt(processed_image, key)
```

### Encryption → Decryption

```python
recovered = decrypt(ciphertext, key)
```

### Decryption → Analysis

```python
mse = calculate_mse(processed_image, recovered)
psnr = calculate_psnr(processed_image, recovered)
ssim = calculate_ssim(processed_image, recovered)
```

### Ciphertext → Analysis

```python
entropy = calculate_entropy(ciphertext)
correlation = calculate_correlation(ciphertext)
```

NPCR/UACI:

```python
npcr = calculate_npcr(ciphertext1, ciphertext2)
uaci = calculate_uaci(ciphertext1, ciphertext2)
```

---

## 6. Dependency Rules

```text
pipeline
   ↓
processing / encryption / analysis
   ↓
NumPy / OpenCV / SciPy / scikit-image
```

Allowed:

```text
processing → scientific libraries
encryption → scientific libraries
analysis   → scientific libraries
pipeline   → processing/encryption/analysis
```

Not allowed:

```text
processing → encryption
encryption → processing
analysis → specific encryption algorithm
analysis → specific processing algorithm
algorithm → pipeline
algorithm → FastAPI
algorithm → frontend
```

---

## 7. Ownership

### Person 1

```text
processing/
analysis/
```

### Person 2

```text
encryption/
```

### Shared

```text
io/
pipeline/
tests/
```
