import numpy as np
import cv2
import base64
import io
from PIL import Image

def decode_image_payload(payload):
    header, encoded = payload.split(",", 1)
    raw_bytes = base64.b64decode(encoded)
    nparr = np.frombuffer(raw_bytes, np.uint8)
    return cv2.imdecode(nparr, cv2.IMREAD_GRAYSCALE)

np.random.seed(42)
complex_array = (np.random.randn(10, 10) + 1j * np.random.randn(10, 10)).astype(np.complex128)

expected_vis = cv2.normalize(np.abs(complex_array), None, 0, 255, cv2.NORM_MINMAX).astype(np.uint8)

# Encode with PIL
pil_img = Image.fromarray(expected_vis, mode="L")
buf = io.BytesIO()
pil_img.save(buf, format="PNG", optimize=True)
b64_original = base64.b64encode(buf.getvalue()).decode('utf-8')
data_uri = f"data:image/png;base64,{b64_original}"

uploaded_vis = decode_image_payload(data_uri)
print("Exact match:", np.array_equal(uploaded_vis, expected_vis))
max_diff = np.max(np.abs(uploaded_vis.astype(int) - expected_vis.astype(int)))
print("Max diff:", max_diff)
