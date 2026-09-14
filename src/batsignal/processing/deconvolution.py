import numpy as np
from .gaussian import gaussian_kernel_2d

def apply_deconvolution(
    image: np.ndarray,
    mode: str = "GAUSSIAN",
    kernel: np.ndarray | None = None,
    kernel_size: int = 5,
    sigma: float = 1.0,
    K: float = 0.01,
) -> np.ndarray:
    """Apply deconvolution/restoration to an image."""
    return reverse_filter(
        image=image,
        mode=mode,
        kernel=kernel,
        kernel_size=kernel_size,
        sigma=sigma,
        K=K,
    )

def wiener_deconvolve(image: np.ndarray, kernel: np.ndarray, K: float = 0.01):
    img_h, img_w = image.shape
    k_h, k_w = kernel.shape

    kernel_padded = np.zeros((img_h, img_w), dtype=np.float64)
    kernel_padded[:k_h, :k_w] = kernel

    kernel_padded = np.roll(kernel_padded, -k_h // 2, axis=0)
    kernel_padded = np.roll(kernel_padded, -k_w // 2, axis=1)

    Y = np.fft.fft2(image.astype(np.float64))
    H = np.fft.fft2(kernel_padded)

    H_conj = np.conj(H)
    H_power = np.abs(H)**2
    W = H_conj / (H_power + K)

    X_hat = Y * W
    restored = np.fft.ifft2(X_hat)
    restored = np.real(restored)

    return np.clip(restored, 0, 255).astype(image.dtype)


def reverse_filter(
    image: np.ndarray, 
    mode: str = "GAUSSIAN", 
    kernel: np.ndarray | None = None,
    kernel_size: int = 5,
    sigma: float = 1.0,
    K: float = 0.01
) -> np.ndarray:
    """
    Unified entry point to reverse spatial filters.
    
    Parameters:
        image: 2D grayscale NumPy array.
        mode: "GAUSSIAN" or "CUSTOM".
        kernel: 2D array required when mode="CUSTOM".
        kernel_size: Used to rebuild kernel when mode="GAUSSIAN".
        sigma: Used to rebuild kernel when mode="GAUSSIAN".
        K: Regularization parameter (smaller = sharper but noisier; larger = smoother).
    """
    mode = mode.upper()

    if mode == "MEDIAN":
        raise NotImplementedError(
            "Median filtering is a non-linear rank-order sort. Discarded pixel values "
            "are completely destroyed, making analytical mathematical inversion impossible."
        )

    elif mode == "SOBEL":
        raise NotImplementedError(
            "Sobel is a derivative operator with zero DC gain. It sets constant image "
            "brightness to zero, losing baseline intensity information permanently."
        )

    elif mode == "GAUSSIAN":
        k = gaussian_kernel_2d(kernel_size=kernel_size, sigma=sigma)
        return wiener_deconvolve(image, k, K=K)

    elif mode == "CUSTOM":
        if kernel is None:
            raise ValueError("When mode is 'CUSTOM', you must supply a 2D numpy kernel.")
        return wiener_deconvolve(image, kernel, K=K)

    else:
        raise ValueError(f"Unknown mode: {mode}. Use 'GAUSSIAN' or 'CUSTOM'.")