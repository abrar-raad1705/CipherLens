"""
Storage and file management route handlers.
Provides endpoints for saving, listing, retrieving, and accessing uploaded, encrypted,
and decrypted image artifacts on the local server.
"""

from __future__ import annotations

from typing import Any
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

from api.services import storage_service
from api.services.utils import array_to_data_uri, decode_image_payload

router = APIRouter(prefix="/storage", tags=["Storage"])


class SaveImageRequest(BaseModel):
    category: str = Field(..., description="Category: uploads, encrypted, decrypted, etc.")
    name: str = Field(..., description="Original or display name of the image")
    image: str = Field(..., description="Base64 encoded image or data URI")
    metadata: dict[str, Any] = Field(default_factory=dict)


class SavedImageResponse(BaseModel):
    id: str
    name: str
    filename: str
    category: str
    path: str
    file_url: str
    data_uri: str
    width: int
    height: int
    size_bytes: int
    timestamp: int
    metadata: dict[str, Any] = Field(default_factory=dict)


@router.post("/save", response_model=SavedImageResponse)
async def post_save_image(req: SaveImageRequest):
    try:
        saved = storage_service.save_image_file(
            category=req.category,
            name=req.name,
            image_payload=req.image,
            metadata=req.metadata,
        )
        return saved
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save image to server: {str(e)}")


@router.get("/list")
async def get_saved_files(category: str | None = Query(None, description="Filter category: uploads, encrypted, decrypted")):
    try:
        files = storage_service.list_saved_files(category=category)
        return {"files": files}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list saved files: {str(e)}")


@router.get("/files/{category}/{filename}")
async def get_saved_file(category: str, filename: str):
    file_path = storage_service.get_file_path(category, filename)
    if not file_path:
        raise HTTPException(status_code=404, detail="File not found on server")
    return FileResponse(file_path, media_type="image/png")


@router.get("/load/{category}/{filename}")
async def load_saved_file_as_artifact(category: str, filename: str):
    """Return image data_uri, width, height, and metadata for client use."""
    file_path = storage_service.get_file_path(category, filename)
    if not file_path:
        raise HTTPException(status_code=404, detail="File not found on server")
    try:
        with open(file_path, "rb") as f:
            raw_bytes = f.read()
        img_arr = decode_image_payload(raw_bytes)
        data_uri = array_to_data_uri(img_arr)
        stat = file_path.stat()
        parts = file_path.stem.split("_", 1)
        orig_name = parts[1] if len(parts) > 1 else file_path.name
        return {
            "id": f"srv-{file_path.stem}",
            "name": orig_name,
            "filename": filename,
            "category": category,
            "data_uri": data_uri,
            "width": int(img_arr.shape[1]),
            "height": int(img_arr.shape[0]),
            "size_bytes": stat.st_size,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load file: {str(e)}")


class DeleteImageRequest(BaseModel):
    category: str | None = None
    filename: str | None = None
    name: str | None = None


@router.post("/delete")
async def post_delete_image(req: DeleteImageRequest):
    """Delete a saved file by category + filename, or by name match."""
    try:
        deleted = False
        if req.category and req.filename:
            deleted = storage_service.delete_saved_file(req.category, req.filename)
        if not deleted and req.name:
            deleted = storage_service.delete_saved_file_by_name(req.name)
        if not deleted and req.filename:
            deleted = storage_service.delete_saved_file_by_name(req.filename)
        return {"success": True, "deleted": deleted}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete file: {str(e)}")


@router.delete("/files/{category}/{filename}")
async def delete_saved_file(category: str, filename: str):
    """Delete a specific file from server storage."""
    deleted = storage_service.delete_saved_file(category, filename)
    if not deleted:
        deleted = storage_service.delete_saved_file_by_name(filename)
    if not deleted:
        raise HTTPException(status_code=404, detail="File not found on server")
    return {"success": True, "deleted": True}

