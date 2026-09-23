import numpy as np
import cv2

np.random.seed(42)
c1 = (np.random.randn(512, 512) + 1j * np.random.randn(512, 512)).astype(np.complex128)
c2 = (np.random.randn(512, 512) + 1j * np.random.randn(512, 512)).astype(np.complex128)

v1 = cv2.normalize(np.abs(c1), None, 0, 255, cv2.NORM_MINMAX).astype(np.uint8)
v2 = cv2.normalize(np.abs(c2), None, 0, 255, cv2.NORM_MINMAX).astype(np.uint8)

diff = np.abs(v1.astype(np.int32) - v2.astype(np.int32))
print("Max diff:", np.max(diff))
print("Mean diff:", np.mean(diff))
