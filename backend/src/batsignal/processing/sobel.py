import numpy as np

from .convolution import convolve2d_single_channel


def sobel_kernels():
    # Detects vertical edges (horizontal rate of change: dI/dx)
    kx = np.array([[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]], dtype=np.float64)

    # Detects horizontal edges (vertical rate of change: dI/dy)
    ky = np.array([[-1, -2, -1], [0, 0, 0], [1, 2, 1]], dtype=np.float64)

    return kx, ky


def apply_sobel(image: np.ndarray):
    orig_dtype = image.dtype
    img_float = image.astype(np.float64)

    kx, ky = sobel_kernels()

    gx = convolve2d_single_channel(img_float, kx)
    gy = convolve2d_single_channel(img_float, ky)

    magnitude = np.hypot(gx, gy)

    max_val = magnitude.max()
    if max_val > 0:
        magnitude = (magnitude / max_val) * 255.0

    if np.issubdtype(orig_dtype, np.integer):
        return np.clip(magnitude, 0, 255).astype(orig_dtype)
    return magnitude
