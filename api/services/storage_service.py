"""
Local storage service for auto-saving uploaded, encrypted, and decrypted files.
Ensures saved files are persisted to disk and accessible across analysis and processing pages.
"""

from __future__ import annotations

import base64
import os
import re
import time
from pathlib import Path
from typing import Any

from api.services.utils import DATA_URI_PATTERN, array_to_data_uri, decode_image_payload

# Base storage directory located at workspace/storage
DEFAULT_STORAGE_DIR = Path(__file__).resolve().parent.parent.parent / "storage"
DEFAULT_STORAGE_DIR.mkdir(parents=True, exist_ok=True)


def get_storage_dir() -> Path:
    storage_dir = Path(os.getenv("BATSIGNAL_STORAGE_DIR", str(DEFAULT_STORAGE_DIR)))
    storage_dir.mkdir(parents=True, exist_ok=True)
    return storage_dir


def _sanitize_filename(name: str) -> str:
    # Remove invalid characters and keep it clean
    clean = re.sub(r'[^a-zA-Z0-9_\-\.]+', '_', name).strip('_')
    return clean or "image"


def save_image_file(
    category: str,
    name: str,
    image_payload: str | bytes,
    metadata: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """
    Save an image payload to local server disk and return file info with data_uri and url.
    category: 'uploads', 'encrypted', 'decrypted', etc.
    """
    storage_dir = get_storage_dir()
    cat_dir = storage_dir / category
    cat_dir.mkdir(parents=True, exist_ok=True)

    timestamp = int(time.time() * 1000)
    base_name = _sanitize_filename(Path(name).stem)
    filename = f"{timestamp}_{base_name}.png"
    file_path = cat_dir / filename

    # Decode payload to raw image array, then save as PNG
    img_arr = decode_image_payload(image_payload)
    import cv2
    cv2.imwrite(str(file_path), img_arr)

    file_size = file_path.stat().st_size
    relative_path = f"{category}/{filename}"
    data_uri = array_to_data_uri(img_arr)

    return {
        "id": f"srv-{timestamp}-{base_name}",
        "name": name,
        "filename": filename,
        "category": category,
        "path": relative_path,
        "file_url": f"/api/storage/files/{category}/{filename}",
        "data_uri": data_uri,
        "width": int(img_arr.shape[1]),
        "height": int(img_arr.shape[0]),
        "size_bytes": file_size,
        "timestamp": timestamp,
        "metadata": metadata or {},
    }


def list_saved_files(category: str | None = None) -> list[dict[str, Any]]:
    """List all saved image files from local disk."""
    storage_dir = get_storage_dir()
    items: list[dict[str, Any]] = []

    categories = [category] if category else ["uploads", "encrypted", "decrypted"]

    for cat in categories:
        cat_dir = storage_dir / cat
        if not cat_dir.exists():
            continue
        for f in cat_dir.glob("*.png"):
            try:
                stat = f.stat()
                # Parse timestamp from filename if available
                parts = f.stem.split("_", 1)
                timestamp = int(parts[0]) if parts[0].isdigit() else int(stat.st_mtime * 1000)
                orig_name = parts[1] if len(parts) > 1 else f.name
                items.append({
                    "id": f"srv-{f.stem}",
                    "name": orig_name,
                    "filename": f.name,
                    "category": cat,
                    "path": f"{cat}/{f.name}",
                    "file_url": f"/api/storage/files/{cat}/{f.name}",
                    "size_bytes": stat.st_size,
                    "timestamp": timestamp,
                })
            except Exception:
                continue

    # Sort descending by timestamp
    items.sort(key=lambda x: x["timestamp"], reverse=True)
    return items


def get_file_path(category: str, filename: str) -> Path | None:
    storage_dir = get_storage_dir()
    target = (storage_dir / category / filename).resolve()
    # Path traversal protection
    if not str(target).startswith(str(storage_dir.resolve())):
        return None
    if not target.exists() or not target.is_file():
        return None
    return target


def delete_saved_file(category: str, filename: str) -> bool:
    """Delete a saved file from disk with path traversal protection."""
    file_path = get_file_path(category, filename)
    if file_path and file_path.exists():
        try:
            file_path.unlink()
            return True
        except Exception:
            return False
    return False


def delete_saved_file_by_name(name_or_stem: str) -> bool:
    """
    Search and delete any saved file matching the artifact name or stem
    across all storage categories.
    """
    if not name_or_stem:
        return False
    storage_dir = get_storage_dir()
    deleted = False
    clean = _sanitize_filename(Path(name_or_stem).stem)
    categories = ["uploads", "encrypted", "decrypted", "analysis", "processing"]
    for cat in categories:
        cat_dir = storage_dir / cat
        if not cat_dir.exists():
            continue
        for f in cat_dir.glob("*.png"):
            parts = f.stem.split("_", 1)
            f_orig_name = parts[1] if len(parts) > 1 else f.name
            if (
                f.name == name_or_stem
                or f.stem == name_or_stem
                or f.name == f"{clean}.png"
                or f.stem.endswith(f"_{clean}")
                or f_orig_name == clean
                or f_orig_name == name_or_stem
            ):
                try:
                    f.unlink()
                    deleted = True
                except Exception:
                    pass
    return deleted

