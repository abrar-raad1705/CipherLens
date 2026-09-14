import numpy as np
from .convolution import convolve2d_single_channel

def apply_custom_kernel(
    image: np.ndarray,
    kernel: np.ndarray
):

    if image.ndim != 2:
        raise ValueError(f"Expected a 2D grayscale image, got shape {image.shape}")
    if kernel.ndim != 2:
        raise ValueError(f"Expected a 2D kernel matrix, got shape {kernel.shape}")
    
    k_h, k_w = kernel.shape
    if k_h % 2 == 0 or k_w % 2 == 0:
        raise ValueError(f"Kernel dimensions must be odd, got ({k_h}, {k_w})")

    orig_dtype = image.dtype
    img_float = image.astype(np.float64)
    kernel_float = kernel.astype(np.float64)

    filtered = convolve2d_single_channel(img_float, kernel_float)

    kernel_sum = np.sum(kernel_float)

    if not np.isclose(kernel_sum, 0.0, atol=1e-3):
        result = np.clip(filtered, 0, 255)

    else:
        result = np.abs(filtered)
        max_val = result.max()
        if max_val > 0:
            result = (result / max_val) * 255.0

    if np.issubdtype(orig_dtype, np.integer):
        return result.astype(orig_dtype)
    return result