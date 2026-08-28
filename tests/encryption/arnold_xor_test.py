import numpy as np
from batsignal.encryption.arnold_xor import ArnoldXORKey, encrypt, decrypt

image = np.arange(64*64, dtype=np.uint8).reshape(64, 64)

key = ArnoldXORKey(-3, 123)

cipher = encrypt(image, key)
recovered = decrypt(cipher, key)

assert np.array_equal(image, recovered)

print("Arnold+XOR round trip passed!")