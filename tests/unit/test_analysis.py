"""Unit tests for analysis metrics."""

import numpy as np

from batsignal.analysis import (
    calculate_correlation,
    calculate_entropy,
    calculate_mse,
    calculate_psnr,
    calculate_ssim,
)


def test_entropy():
    img = np.zeros((32, 32), dtype=np.uint8)
    assert calculate_entropy(img) == 0.0
    rand_img = np.random.randint(0, 256, (64, 64), dtype=np.uint8)
    assert calculate_entropy(rand_img) > 5.0


def test_mse_psnr_ssim():
    img = np.random.randint(0, 256, (32, 32), dtype=np.uint8)
    assert calculate_mse(img, img) == 0.0
    assert np.isinf(calculate_psnr(img, img))
    assert np.isclose(calculate_ssim(img, img), 1.0)


def test_correlation():
    img = np.tile(np.arange(32, dtype=np.uint8), (32, 1))
    corr = calculate_correlation(img)
    assert "horizontal" in corr
    assert "vertical" in corr
    assert "diagonal" in corr
