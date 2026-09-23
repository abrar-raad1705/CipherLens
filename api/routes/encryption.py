"""
Encryption and optical cryptosystem route handlers.
Thin routing layer that validates requests and dispatches to encryption_service.
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from api.schemas.encryption import (
    ArnoldXORRequest,
    ArnoldXORResponse,
    DCTRequest,
    DCTResponse,
    DRPEDecryptRequest,
    DRPEDecryptResponse,
    DRPEEncryptRequest,
    DRPEEncryptResponse,
    DRPEPreloadRequest,
    DRPEPreloadResponse,
    FourierRequest,
    FourierResponse,
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


@router.post("/dct", response_model=DCTResponse)
async def post_dct(req: DCTRequest):
    try:
        return encryption_service.run_dct(req.image, seed=req.seed, action=req.action)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DCT cipher failed: {str(e)}")


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
