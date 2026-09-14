"""
Processing module for Bat_Signal.
"""

from __future__ import annotations

import sys

from . import (
    convolution,
    custom_kernel,
    deconvolution,
    gaussian,
    median,
    sobel,
)
from .convolution import convolve2d_single_channel
from .custom_kernel import apply_custom_kernel
from .deconvolution import apply_deconvolution, reverse_filter, wiener_deconvolve
from .gaussian import apply_gaussian, gaussian_kernel_2d
from .median import apply_median_filter
from .sobel import apply_sobel, sobel_kernels

# Backwards-compatible aliases
Convolution = convolution
Custom_Kernel = custom_kernel
Deconvolution = deconvolution
Gaussian = gaussian
Median = median
Sobel = sobel

sys.modules["batsignal.processing.gaussian"] = gaussian
sys.modules["batsignal.processing.deconvolution"] = deconvolution
sys.modules["batsignal.processing.sobel"] = sobel
sys.modules["batsignal.processing.median"] = median
sys.modules["batsignal.processing.custom_kernel"] = custom_kernel
sys.modules["batsignal.processing.convolution"] = convolution

__all__ = [
    "convolve2d_single_channel",
    "apply_custom_kernel",
    "apply_deconvolution",
    "reverse_filter",
    "wiener_deconvolve",
    "apply_gaussian",
    "gaussian_kernel_2d",
    "apply_median_filter",
    "apply_sobel",
    "sobel_kernels",
    "gaussian",
    "deconvolution",
    "sobel",
    "median",
    "custom_kernel",
    "convolution",
    "Gaussian",
    "Deconvolution",
    "Sobel",
    "Median",
    "Custom_Kernel",
    "Convolution",
]
