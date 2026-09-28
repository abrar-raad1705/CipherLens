"""
Integration test suite for CipherLens FastAPI REST endpoints.
"""

import pytest
from starlette.testclient import TestClient

from api.main import app
from api.services.utils import array_to_data_uri, create_synthetic_target


@pytest.fixture(scope="module")
def client():
    return TestClient(app)


@pytest.fixture(scope="module")
def sample_image_uri():
    img = create_synthetic_target("checkerboard", 64)
    return array_to_data_uri(img)


# =============================================================================
# HEALTH & SAMPLES
# =============================================================================


def test_health_endpoint(client):
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert "version" in data


def test_samples_endpoint(client):
    res = client.get("/api/processing/samples")
    assert res.status_code == 200
    data = res.json()
    assert "samples" in data
    assert len(data["samples"]) >= 3
    sample = data["samples"][0]
    assert "id" in sample
    assert "image" in sample
    assert sample["image"].startswith("data:image/png;base64,")


# =============================================================================
# PROCESSING BENCH
# =============================================================================


def test_convolution_endpoint(client, sample_image_uri):
    kernel = [
        [0.0, -1.0, 0.0],
        [-1.0, 5.0, -1.0],
        [0.0, -1.0, 0.0],
    ]
    res = client.post(
        "/api/processing/convolution",
        json={"image": sample_image_uri, "kernel": kernel, "normalize": False},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "COMPLETE"
    assert data["output_image"].startswith("data:image/png;base64,")
    assert "latency_ms" in data


def test_gaussian_endpoint(client, sample_image_uri):
    res = client.post(
        "/api/processing/gaussian",
        json={"image": sample_image_uri, "kernel_size": 5, "sigma": 1.2},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "COMPLETE"
    assert data["filter"] == "Gaussian Blur"
    assert data["output_image"].startswith("data:image/png;base64,")


def test_median_endpoint(client, sample_image_uri):
    res = client.post(
        "/api/processing/median",
        json={"image": sample_image_uri, "kernel_size": 3},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "COMPLETE"
    assert data["filter"] == "Median Filter"


def test_sobel_endpoint(client, sample_image_uri):
    res = client.post(
        "/api/processing/sobel",
        json={"image": sample_image_uri},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "COMPLETE"
    assert data["filter"] == "Sobel Gradient Magnitude"


def test_deconvolution_endpoint(client, sample_image_uri):
    res = client.post(
        "/api/processing/deconvolution",
        json={
            "image": sample_image_uri,
            "mode": "GAUSSIAN",
            "kernel_size": 5,
            "sigma": 1.0,
            "K": 0.01,
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "COMPLETE"
    assert "Wiener Deconvolution" in data["filter"]


# =============================================================================
# ENCRYPTION BENCH
# =============================================================================


def test_drpe_lifecycle(client, sample_image_uri):
    # 1. Encrypt
    enc_res = client.post(
        "/api/encryption/drpe/encrypt",
        json={"image": sample_image_uri, "seed1": 1234, "seed2": 5678},
    )
    assert enc_res.status_code == 200
    enc_data = enc_res.json()
    assert enc_data["status"] == "COMPLETE"
    assert "stages" in enc_data
    assert "r1_phase" in enc_data["stages"]
    assert "fourier_spectrum" in enc_data["stages"]
    assert "r2_phase" in enc_data["stages"]
    assert "ciphertext" in enc_data["stages"]

    ciphertext_uri = enc_data["ciphertext"]

    # 2. Decrypt with correct key
    dec_res = client.post(
        "/api/encryption/drpe/decrypt",
        json={
            "ciphertext": ciphertext_uri,
            "seed1": 1234,
            "seed2": 5678,
            "reference_image": sample_image_uri,
        },
    )
    assert dec_res.status_code == 200
    dec_data = dec_res.json()
    assert dec_data["status"] == "COMPLETE"
    assert dec_data["decrypted_image"].startswith("data:image/png;base64,")


def test_fourier_endpoint(client, sample_image_uri):
    res = client.post(
        "/api/encryption/fourier",
        json={"image": sample_image_uri, "seed": 42, "action": "encrypt"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["algorithm"] == "Fourier"
    assert data["output_image"].startswith("data:image/png;base64,")
    assert "stages" in data
    assert "original" in data["stages"]
    assert "fft_spectrum" in data["stages"]
    assert "permuted_spectrum" in data["stages"]
    assert "ciphertext" in data["stages"]


def test_dct_endpoint(client, sample_image_uri):
    res = client.post(
        "/api/encryption/dct",
        json={"image": sample_image_uri, "seed": 42, "action": "encrypt"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["algorithm"] == "DCT"
    assert data["output_image"].startswith("data:image/png;base64,")
    assert "stages" in data
    assert "original" in data["stages"]
    assert "dct_basis" in data["stages"]
    assert "scrambled_dct" in data["stages"]
    assert "ciphertext" in data["stages"]


def test_arnold_xor_endpoint(client, sample_image_uri):
    res = client.post(
        "/api/encryption/arnold-xor",
        json={
            "image": sample_image_uri,
            "itr": 3,
            "xor_value": 170,
            "action": "encrypt",
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert data["algorithm"] == "Arnold-XOR"
    assert data["output_image"].startswith("data:image/png;base64,")
    assert "stages" in data
    assert "original" in data["stages"]
    assert "arnold_scramble" in data["stages"]
    assert "bit_mask" in data["stages"]
    assert "xor_diffusion" in data["stages"]
    assert "ciphertext" in data["stages"]
    # Verify bit mask is distinct from ciphertext and scrambled image
    assert data["stages"]["bit_mask"] != data["stages"]["ciphertext"]
    assert data["stages"]["bit_mask"] != data["stages"]["arnold_scramble"]


def test_spectral_hybrid_endpoint(client, sample_image_uri):
    res = client.post(
        "/api/encryption/spectral-hybrid",
        json={
            "image": sample_image_uri,
            "scramble_seed": 42,
            "mask_seed": 99,
            "kernel_seed": 7,
            "action": "encrypt",
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert data["algorithm"] == "Spectral-Hybrid"
    assert data["output_image"].startswith("data:image/png;base64,")
    assert "stages" in data
    assert "original" in data["stages"]
    assert "pixel_scramble" in data["stages"]
    assert "fft_spectrum" in data["stages"]
    assert "phase_mask" in data["stages"]
    assert "ciphertext" in data["stages"]
    # Verify each stage is unique
    stages_list = [
        data["stages"]["original"],
        data["stages"]["pixel_scramble"],
        data["stages"]["fft_spectrum"],
        data["stages"]["phase_mask"],
        data["stages"]["ciphertext"],
    ]
    assert len(set(stages_list)) == len(stages_list)


def test_feistel_endpoint(client, sample_image_uri):
    res = client.post(
        "/api/encryption/feistel",
        json={
            "image": sample_image_uri,
            "seed": 42,
            "rounds": 8,
            "action": "encrypt",
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert data["algorithm"] == "Feistel"
    assert data["output_image"].startswith("data:image/png;base64,")
    assert "stages" in data
    assert "original" in data["stages"]
    assert "round_1" in data["stages"]
    assert "round_half" in data["stages"]
    assert "ciphertext" in data["stages"]
    stages_list = [
        data["stages"]["original"],
        data["stages"]["round_1"],
        data["stages"]["round_half"],
        data["stages"]["ciphertext"],
    ]
    assert len(set(stages_list)) == len(stages_list)


# =============================================================================
# ANALYSIS BENCH
# =============================================================================


def test_entropy_endpoint(client, sample_image_uri):
    res = client.post("/api/analysis/entropy", json={"image": sample_image_uri})
    assert res.status_code == 200
    data = res.json()
    assert "entropy" in data
    assert 0.0 <= data["entropy"] <= 8.0


def test_correlation_endpoint(client, sample_image_uri):
    res = client.post(
        "/api/analysis/correlation",
        json={"image": sample_image_uri, "num_samples": 200},
    )
    assert res.status_code == 200
    data = res.json()
    assert "coefficients" in data
    assert "horizontal" in data["coefficients"]
    assert "vertical" in data["coefficients"]
    assert "diagonal" in data["coefficients"]
    assert "scatter_samples" in data


def test_metrics_endpoint(client, sample_image_uri):
    res = client.post(
        "/api/analysis/metrics",
        json={
            "original_image": sample_image_uri,
            "target_image": sample_image_uri,
            "differential": True,
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert data["mse"] == 0.0
    assert data["ssim"] == 1.0


def test_histogram_endpoint(client, sample_image_uri):
    res = client.post("/api/analysis/histogram", json={"image": sample_image_uri})
    assert res.status_code == 200
    data = res.json()
    assert len(data["bins"]) == 256


# =============================================================================
# INVALID INPUTS
# =============================================================================


def test_invalid_base64_payload(client):
    res = client.post(
        "/api/processing/sobel",
        json={"image": "not_valid_base64_or_image"},
    )
    assert res.status_code in (400, 422)


def test_invalid_gaussian_even_kernel(client, sample_image_uri):
    res = client.post(
        "/api/processing/gaussian",
        json={"image": sample_image_uri, "kernel_size": 4, "sigma": 1.0},
    )
    assert res.status_code == 400
    assert "odd" in res.json()["detail"].lower()


def test_invalid_json_body(client):
    res = client.post("/api/processing/gaussian", json={})
    assert res.status_code == 422
