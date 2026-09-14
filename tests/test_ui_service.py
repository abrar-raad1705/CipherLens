"""
Unit and integration tests for the BAT SIGNAL UI Service layer.
"""

import numpy as np

from batsignal.ui.service import LaboratorySession, create_synthetic_target


def test_session_initialization():
    sess = LaboratorySession()
    summary = sess.get_summary()
    assert summary["width"] > 0
    assert summary["height"] > 0
    assert "dimensions" in summary
    assert "original_preview" in summary
    assert summary["original_preview"].startswith("data:image/png;base64,")


def test_synthetic_targets():
    grid = create_synthetic_target("frequency_grid", 256)
    assert grid.shape == (256, 256)
    assert grid.dtype == np.uint8

    checker = create_synthetic_target("checkerboard", 256)
    assert checker.shape == (256, 256)
    assert checker.dtype == np.uint8


def test_spatial_filters():
    sess = LaboratorySession()

    # Gaussian
    res_gauss = sess.apply_filter("GAUSSIAN", {"kernel_size": 5, "sigma": 1.5})
    assert res_gauss["status"] == "COMPLETE"
    assert res_gauss["processed_image"].startswith("data:image/png;base64,")

    # Sobel
    res_sobel = sess.apply_filter("SOBEL", {})
    assert res_sobel["status"] == "COMPLETE"

    # Median
    res_median = sess.apply_filter("MEDIAN", {"kernel_size": 3})
    assert res_median["status"] == "COMPLETE"

    # Custom Kernel
    sharpen_k = [[0, -1, 0], [-1, 5, -1], [0, -1, 0]]
    res_custom = sess.apply_filter("CUSTOM", {"kernel": sharpen_k, "normalize": False})
    assert res_custom["status"] == "COMPLETE"


def test_deconvolution():
    sess = LaboratorySession()
    # Convolve with Gaussian first
    sess.apply_filter("GAUSSIAN", {"kernel_size": 5, "sigma": 1.0})
    res_deconv = sess.apply_restoration(mode="GAUSSIAN", K=0.01)
    assert res_deconv["status"] == "COMPLETE"
    assert "quality" in res_deconv
    assert res_deconv["quality"]["ssim"] > 0.5


def test_drpe_optical_stages():
    sess = LaboratorySession()
    res = sess.run_drpe(seed1=1234, seed2=5678)
    assert res["status"] == "COMPLETE"
    stages = res["stages"]
    assert "original" in stages
    assert "r1_phase" in stages
    assert "fourier_spectrum" in stages
    assert "r2_phase" in stages
    assert "ciphertext" in stages

    # Test decryption with exact key
    dec = sess.run_decryption("DRPE", {"seed1": 1234, "seed2": 5678})
    assert dec["status"] == "COMPLETE"
    assert dec["quality"]["ssim"] > 0.99

    # Test decryption with wrong key (perturbed seed)
    dec_wrong = sess.run_decryption("DRPE", {"seed1": 1235, "seed2": 5678})
    assert dec_wrong["status"] == "COMPLETE"
    # Recovered image with wrong key should have high MSE and low SSIM
    assert dec_wrong["quality"]["mse"] > 1000.0


def test_fourier_and_dct():
    sess = LaboratorySession()

    # Fourier
    res_f = sess.run_fourier(seed=100)
    assert res_f["status"] == "COMPLETE"
    dec_f = sess.run_decryption("FOURIER", {"seed": 100})
    assert dec_f["quality"]["ssim"] > 0.99

    # DCT
    res_d = sess.run_dct(seed=42)
    assert res_d["status"] == "COMPLETE"
    dec_d = sess.run_decryption("DCT", {"seed": 42})
    assert dec_d["quality"]["ssim"] > 0.99


def test_arnold_xor():
    sess = LaboratorySession()
    res_a = sess.run_arnold_xor(itr=5, xor_value=0xAA)
    assert res_a["status"] == "COMPLETE"
    dec_a = sess.run_decryption("ARNOLD_XOR", {"itr": 5, "xor_value": 0xAA})
    assert dec_a["quality"]["ssim"] == 1.0


def test_cryptanalysis():
    sess = LaboratorySession()
    sess.run_drpe(seed1=1234, seed2=5678)
    analysis = sess.run_analysis(diff_x=0, diff_y=0)

    assert "entropy" in analysis
    assert analysis["entropy"]["cipher"] > 7.0
    assert "correlation" in analysis
    assert "scatter" in analysis
    assert len(analysis["scatter"]["plain"]["horizontal"]) > 0
    assert "differential" in analysis
    assert "histograms" in analysis
    assert len(analysis["histograms"]["plain"]) == 256


def test_benchmark_matrix():
    sess = LaboratorySession()
    bench = sess.run_benchmark()
    assert "results" in bench
    assert len(bench["results"]) == 4
    for r in bench["results"]:
        assert "name" in r
        assert "entropy" in r
        assert "psnr" in r
        assert "ssim" in r
        assert r["ssim"] > 0.95
