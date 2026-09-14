"""
Unit tests for the BAT SIGNAL FastAPI REST API endpoints.
"""

from starlette.testclient import TestClient

from batsignal.ui.app import app

client = TestClient(app)


def test_api_session():
    res = client.get("/api/session")
    assert res.status_code == 200
    data = res.json()
    assert "image_name" in data
    assert "dimensions" in data
    assert "original_preview" in data


def test_api_samples():
    res = client.get("/api/samples")
    assert res.status_code == 200
    data = res.json()
    assert "samples" in data
    assert len(data["samples"]) >= 4


def test_api_load_sample():
    res = client.post("/api/load-sample", json={"sample_id": "frequency_grid"})
    assert res.status_code == 200
    data = res.json()
    assert "frequency_grid" in data["image_name"]


def test_api_filter():
    res = client.post(
        "/api/process/filter",
        json={"filter_type": "GAUSSIAN", "kernel_size": 5, "sigma": 1.5},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "COMPLETE"
    assert "processed_image" in data


def test_api_restore():
    res = client.post("/api/process/restore", json={"mode": "GAUSSIAN", "K": 0.01})
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "COMPLETE"
    assert "restored_image" in data


def test_api_encrypt_drpe_and_decrypt():
    res = client.post("/api/encrypt/drpe", json={"seed1": 1234, "seed2": 5678})
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "COMPLETE"
    assert "stages" in data
    assert "ciphertext" in data["stages"]

    # Decrypt
    dec_res = client.post(
        "/api/decrypt",
        json={"method": "DRPE", "key_params": {"seed1": 1234, "seed2": 5678}},
    )
    assert dec_res.status_code == 200
    dec_data = dec_res.json()
    assert dec_data["status"] == "COMPLETE"
    assert "decrypted_image" in dec_data


def test_api_analysis():
    res = client.get("/api/analysis?diff_x=0&diff_y=0")
    assert res.status_code == 200
    data = res.json()
    assert "entropy" in data
    assert "correlation" in data
    assert "scatter" in data
    assert "differential" in data


def test_api_benchmark():
    res = client.get("/api/benchmark")
    assert res.status_code == 200
    data = res.json()
    assert "results" in data
    assert len(data["results"]) == 4


def test_serve_html_index():
    res = client.get("/")
    assert res.status_code == 200
    assert "BAT SIGNAL" in res.text
    assert "Computational Imaging Laboratory" in res.text
