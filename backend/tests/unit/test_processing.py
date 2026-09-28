"""Unit tests for processing algorithms."""

import numpy as np

from batsignal.processing import (
    apply_custom_kernel,
    apply_gaussian,
    apply_median_filter,
    apply_sobel,
)


def test_gaussian_shape_and_range():
    img = np.random.randint(0, 256, (64, 64), dtype=np.uint8)
    res = apply_gaussian(img, kernel_size=5, sigma=1.0)
    assert res.shape == (64, 64)
    assert res.dtype == np.uint8


def test_median_filter():
    img = np.zeros((32, 32), dtype=np.uint8)
    img[16, 16] = 255
    res = apply_median_filter(img, kernel_size=3)
    assert res[16, 16] == 0


def test_sobel():
    img = np.zeros((32, 32), dtype=np.uint8)
    img[:, 16:] = 255
    res = apply_sobel(img)
    assert res.shape == (32, 32)
    assert res[:, 15:17].max() > 0


def test_custom_kernel():
    img = np.ones((32, 32), dtype=np.uint8) * 100
    kernel = np.array([[0, 0, 0], [0, 1, 0], [0, 0, 0]], dtype=np.float64)
    res = apply_custom_kernel(img, kernel)
    assert np.allclose(res, img)
