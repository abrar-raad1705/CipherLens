from pathlib import Path
from PIL import Image

import numpy as np

def load_image(path: str | Path) -> np.ndarray:
    return np.array(Image.open(path).convert("L"), dtype=np.uint8)

def save_image(image: np.ndarray, path: str | Path) -> None:
    Image.fromarray(image).save(path)