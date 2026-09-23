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
# 64-bit complex array
complex_array_64 = (np.random.randn(512, 512) + 1j * np.random.randn(512, 512)).astype(np.complex128)

# Encrypt step calculates magnitude on 64-bit
cipher_vis = cv2.normalize(np.abs(complex_array_64), None, 0, 255, cv2.NORM_MINMAX).astype(np.uint8)

# Encode with PIL (simulate frontend/backend datauri)
pil_img = Image.fromarray(cipher_vis, mode="L")
buf = io.BytesIO()
pil_img.save(buf, format="PNG", optimize=True)
data_uri = f"data:image/png;base64,{base64.b64encode(buf.getvalue()).decode('utf-8')}"
uploaded_vis = decode_image_payload(data_uri)

# Now simulate serialization to float32
real_32 = complex_array_64.real.astype(np.float32)
imag_32 = complex_array_64.imag.astype(np.float32)

# Simulate preload step reconstructing from float32
complex_array_32 = real_32 + 1j * imag_32

# Calculate expected_vis on 32-bit!
expected_vis = cv2.normalize(np.abs(complex_array_32), None, 0, 255, cv2.NORM_MINMAX).astype(np.uint8)

print("Exact match:", np.array_equal(uploaded_vis, expected_vis))
max_diff = np.max(np.abs(uploaded_vis.astype(int) - expected_vis.astype(int)))
print("Max diff:", max_diff)
num_diffs = np.sum(uploaded_vis != expected_vis)
print("Number of differing pixels:", num_diffs)
