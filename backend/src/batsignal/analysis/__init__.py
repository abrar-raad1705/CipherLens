"""
Analysis metrics module for CipherLens.
"""

from __future__ import annotations

import sys

from . import (
    correlation,
    entropy,
    mse,
    npcr,
    psnr,
    ssim,
    uaci,
)
from .correlation import calculate_correlation
from .entropy import calculate_entropy
from .mse import calculate_mse
from .npcr import calculate_npcr
from .psnr import calculate_psnr
from .ssim import calculate_ssim
from .uaci import calculate_uaci

# Backwards-compatible module aliases
Correlation = correlation
Entropy = entropy
MSE = mse
NPCR = npcr
PSNR = psnr
SSIM = ssim
UACI = uaci

sys.modules["batsignal.analysis.correlation"] = correlation
sys.modules["batsignal.analysis.entropy"] = entropy
sys.modules["batsignal.analysis.mse"] = mse
sys.modules["batsignal.analysis.npcr"] = npcr
sys.modules["batsignal.analysis.psnr"] = psnr
sys.modules["batsignal.analysis.ssim"] = ssim
sys.modules["batsignal.analysis.uaci"] = uaci

__all__ = [
    "calculate_correlation",
    "calculate_entropy",
    "calculate_mse",
    "calculate_npcr",
    "calculate_psnr",
    "calculate_ssim",
    "calculate_uaci",
    "correlation",
    "entropy",
    "mse",
    "npcr",
    "psnr",
    "ssim",
    "uaci",
    "Correlation",
    "Entropy",
    "MSE",
    "NPCR",
    "PSNR",
    "SSIM",
    "UACI",
]
