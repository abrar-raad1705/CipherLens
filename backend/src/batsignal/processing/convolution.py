import numpy as np


def convolve2d_single_channel(channel: np.ndarray, kernel: np.ndarray):
    k_h, k_w = kernel.shape
    pad_h, pad_w = k_h // 2, k_w // 2

    padded = np.pad(channel, ((pad_h, pad_h), (pad_w, pad_w)), mode="reflect")

    kernel_flipped = np.flip(kernel)

    h, w = channel.shape
    output = np.zeros((h, w), dtype=np.float64)

    for i in range(h):
        for j in range(w):
            region = padded[i : i + k_h, j : j + k_w]
            output[i, j] = np.sum(region * kernel_flipped)

    return output
