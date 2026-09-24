"""
Encryption and optical cryptosystem route handlers.
Thin routing layer that validates requests and dispatches to encryption_service.
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from api.schemas.encryption import (
    ArnoldXORRequest,
    ArnoldXORResponse,
    ChaosRequest,
    ChaosResponse,
    DCTPreloadRequest,
    DCTPreloadResponse,
    DCTRequest,
    DCTResponse,
    DecryptRequestV2,
    DecryptResponseV2,
    DRPEDecryptRequest,
    DRPEDecryptResponse,
    DRPEEncryptRequest,
    DRPEEncryptResponse,
    DRPEPreloadRequest,
    DRPEPreloadResponse,
    EncryptRequestV2,
    EncryptResponseV2,
    FeistelRequest,
    FeistelResponse,
    FourierPreloadRequest,
    FourierPreloadResponse,
    FourierRequest,
    FourierResponse,
    SpectralHybridPreloadRequest,
    SpectralHybridPreloadResponse,
    SpectralHybridRequest,
    SpectralHybridResponse,
)
from api.services import encryption_service

router = APIRouter(prefix="/encryption", tags=["Encryption"])


@router.post("/drpe/encrypt", response_model=DRPEEncryptResponse)
async def post_drpe_encrypt(req: DRPEEncryptRequest):
    try:
        return encryption_service.run_drpe_encrypt(
            req.image, seed1=req.seed1, seed2=req.seed2
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DRPE encryption failed: {str(e)}")


@router.post("/drpe/decrypt", response_model=DRPEDecryptResponse)
async def post_drpe_decrypt(req: DRPEDecryptRequest):
    try:
        return encryption_service.run_drpe_decrypt(
            req.ciphertext,
            seed1=req.seed1,
            seed2=req.seed2,
            reference_payload=req.reference_image,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DRPE decryption failed: {str(e)}")


@router.post("/drpe/preload", response_model=DRPEPreloadResponse)
async def post_drpe_preload(req: DRPEPreloadRequest):
    """Warm the DRPE cache from a JSON key package so decryption works cross-session."""
    try:
        result = encryption_service.run_drpe_preload(
            req.ciphertext_real,
            req.ciphertext_imag,
            req.ciphertext_shape,
            req.visual_uri,
        )
        return DRPEPreloadResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"DRPE preload failed: {str(e)}")


@router.post("/fourier", response_model=FourierResponse)
async def post_fourier(req: FourierRequest):
    try:
        return encryption_service.run_fourier(
            req.image, seed=req.seed, action=req.action
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Fourier transform cipher failed: {str(e)}"
        )


@router.post("/fourier/preload", response_model=FourierPreloadResponse)
async def post_fourier_preload(req: FourierPreloadRequest):
    try:
        result = encryption_service.run_fourier_preload(
            req.ciphertext_real,
            req.ciphertext_imag,
            req.ciphertext_shape,
            req.visual_uri,
        )
        return FourierPreloadResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Fourier preload failed: {str(e)}")


@router.post("/dct", response_model=DCTResponse)
async def post_dct(req: DCTRequest):
    try:
        return encryption_service.run_dct(req.image, seed=req.seed, action=req.action)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DCT cipher failed: {str(e)}")


@router.post("/dct/preload", response_model=DCTPreloadResponse)
async def post_dct_preload(req: DCTPreloadRequest):
    try:
        result = encryption_service.run_dct_preload(
            req.ciphertext_real,
            req.ciphertext_shape,
            req.visual_uri,
        )
        return DCTPreloadResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"DCT preload failed: {str(e)}")


@router.post("/arnold-xor", response_model=ArnoldXORResponse)
async def post_arnold_xor(req: ArnoldXORRequest):
    try:
        return encryption_service.run_arnold_xor(
            req.image, itr=req.itr, xor_value=req.xor_value, action=req.action
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Arnold-XOR cipher failed: {str(e)}"
        )


@router.post("/chaos", response_model=ChaosResponse)
async def post_chaos(req: ChaosRequest):
    try:
        return encryption_service.run_chaos(
            req.image, x0=req.x0, r=req.r, action=req.action
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chaos cipher failed: {str(e)}")


@router.post("/spectral-hybrid", response_model=SpectralHybridResponse)
async def post_spectral_hybrid(req: SpectralHybridRequest):
    try:
        return encryption_service.run_spectral_hybrid(
            req.image,
            scramble_seed=req.scramble_seed,
            mask_seed=req.mask_seed,
            kernel_seed=req.kernel_seed,
            action=req.action,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Spectral Hybrid cipher failed: {str(e)}"
        )


@router.post("/spectral-hybrid/preload", response_model=SpectralHybridPreloadResponse)
async def post_spectral_hybrid_preload(req: SpectralHybridPreloadRequest):
    try:
        result = encryption_service.run_spectral_hybrid_preload(
            req.ciphertext_real,
            req.ciphertext_imag,
            req.ciphertext_shape,
            req.visual_uri,
        )
        return SpectralHybridPreloadResponse(**result)
    except Exception as e:
        raise HTTPException(
            status_code=400, detail=f"Spectral Hybrid preload failed: {str(e)}"
        )


@router.post("/feistel", response_model=FeistelResponse)
async def post_feistel(req: FeistelRequest):
    try:
        return encryption_service.run_feistel(
            req.image, seed=req.seed, rounds=req.rounds, action=req.action
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Feistel cipher failed: {str(e)}")


# ── Layer 2 Route Handlers ──────────────────────────────────────────

@router.post("/v2/encrypt", response_model=EncryptResponseV2)
async def post_v2_encrypt(req: EncryptRequestV2):
    try:
        return encryption_service.run_v2_encrypt(
            req.image, algorithm=req.algorithm, parameters=req.parameters
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Encryption failed: {str(e)}")


@router.post("/v2/decrypt", response_model=DecryptResponseV2)
async def post_v2_decrypt(req: DecryptRequestV2):
    try:
        return encryption_service.run_v2_decrypt(
            req.ciphertext,
            key_file_data=req.key_file,
            reference_payload=req.reference_image,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Decryption failed: {str(e)}")


