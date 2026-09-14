import numpy as np
from .convolution import convolve2d_single_channel

def gaussian_kernel_2d(kernel_size: int = 5, sigma: float = 1.0):
    radius = kernel_size // 2

    y, x = np.ogrid[-radius:radius + 1, -radius:radius + 1]
    
    kernel = np.exp(-(x**2 + y**2) / (2.0 * sigma**2))

    
    return kernel / kernel.sum()

def apply_gaussian(
    image: np.ndarray, 
    kernel_size: int = 5, 
    sigma: float = 1.0
):
    kernel = gaussian_kernel_2d(kernel_size=kernel_size, sigma=sigma)
    orig_dtype = image.dtype
    img_float = image.astype(np.float64)
    
    if img_float.ndim == 2:
        smoothed = convolve2d_single_channel(img_float, kernel)

    elif img_float.ndim == 3:
        raise ValueError(f"Expected 2D or 3D array, got shape {image.shape}")
        
    if np.issubdtype(orig_dtype, np.integer):
        return np.clip(smoothed, 0, 255).astype(orig_dtype)
    return smoothed