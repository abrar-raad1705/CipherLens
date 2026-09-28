import numpy as np


def calculate_correlation(image: np.ndarray) -> dict[str, float]:
    """
    Calculate Pearson correlation coefficients between adjacent pixels
    in horizontal, vertical, and diagonal directions.
    """
    # If image is complex, take magnitude
    if np.iscomplexobj(image):
        image = np.abs(image)
    # If image is multichannel/color, compute on 2D grayscale or flatten channels
    img = image.astype(np.float64)
    if img.ndim == 3:
        img = 0.2989 * img[:, :, 0] + 0.5870 * img[:, :, 1] + 0.1140 * img[:, :, 2]

    def _pearson(x: np.ndarray, y: np.ndarray) -> float:
        x_flat = x.ravel()
        y_flat = y.ravel()
        cov = np.cov(x_flat, y_flat)
        std_prod = np.std(x_flat, ddof=1) * np.std(y_flat, ddof=1)
        if std_prod == 0:
            return 0.0
        return float(cov[0, 1] / std_prod)

    # Adjacent pixel pairs: (x, y)
    h_x, h_y = img[:, :-1], img[:, 1:]
    v_x, v_y = img[:-1, :], img[1:, :]
    d_x, d_y = img[:-1, :-1], img[1:, 1:]

    return {
        "horizontal": _pearson(h_x, h_y),
        "vertical": _pearson(v_x, v_y),
        "diagonal": _pearson(d_x, d_y),
    }
