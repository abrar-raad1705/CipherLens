import numpy as np


def apply_median_filter(image: np.ndarray, kernel_size: int = 3):

    if image.ndim != 2:
        raise ValueError(f"Expected a 2D grayscale image, got shape {image.shape}")

    if kernel_size % 2 == 0 or kernel_size < 1:
        raise ValueError(
            f"kernel_size must be an odd positive integer, got {kernel_size}"
        )

    h, w = image.shape
    radius = kernel_size // 2

    padded = np.pad(image, ((radius, radius), (radius, radius)), mode="reflect")

    output = np.zeros((h, w), dtype=image.dtype)

    for i in range(h):
        for j in range(w):
            window = padded[i : i + kernel_size, j : j + kernel_size]
            output[i, j] = np.median(window)

    return output
