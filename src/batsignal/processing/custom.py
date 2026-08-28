import numpy as np

def apply_custom(image: np.ndarray, kernel: np.ndarray) -> np.ndarray:
    """
    Apply Custom filtering to an image.

    Parameters
    ----------
    image:
        Input image represented as a NumPy array.
    kernel:
        Input custom kernel represented as NumPy array.

    Returns
    -------
    np.ndarray:
        Filtered image.
    """
    raise NotImplementedError