import os

import cv2

# 3. Analysis Metrics (Contract Section 4)
from batsignal.analysis import (
    calculate_correlation,
    calculate_entropy,
    calculate_mse,
    calculate_npcr,
    calculate_psnr,
    calculate_ssim,
    calculate_uaci,
)

# 2. Encryption Algorithms (Contract Section 3)
from batsignal.encryption import arnold_xor, dct, drpe, fourier

# 1. Processing Modules
from batsignal.processing.gaussian import apply_gaussian


def run_full_pipeline(input_image_path: str, output_dir: str = "output"):
    os.makedirs(output_dir, exist_ok=True)

    # 1. Load input image (Grayscale uint8 per Section 1)
    image = cv2.imread(input_image_path, cv2.IMREAD_GRAYSCALE)
    if image is None:
        raise FileNotFoundError(f"Failed to read image at '{input_image_path}'")

    cv2.imwrite(os.path.join(output_dir, "00_original.png"), image)

    # 2. Gaussian Convolution
    blurred = apply_gaussian(image)
    cv2.imwrite(os.path.join(output_dir, "01_gaussian_convolved.png"), blurred)

    # Pre-calculate slightly modified image to evaluate NPCR and UACI
    blurred_alt = blurred.copy()
    blurred_alt[0, 0] = (int(blurred_alt[0, 0]) + 1) % 256

    # Algorithms under test
    algorithms = {
        "Arnold_XOR": {"module": arnold_xor, "key": (3, 5, 10, 0xAA)},
        "DCT": {"module": dct, "key": 42},
        "Fourier": {"module": fourier, "key": 100},
        "DRPE": {"module": drpe, "key": (1234, 5678)},
    }

    report_lines = [
        "=" * 92,
        f"{'Algorithm':<15} | {'Entropy':<8} | {'H-Corr':<8} | {'NPCR (%)':<9} | {'UACI (%)':<9} | {'MSE':<8} | {'PSNR (dB)':<10} | {'SSIM':<6}",
        "-" * 92,
    ]

    for name, config in algorithms.items():
        module = config["module"]
        key = config["key"]

        # 4. Encryption (convolved input -> ciphertext1)
        ciphertext1 = module.encrypt(blurred, key)

        # 5. Differential encryption (simulate 1-pixel change for NPCR/UACI)
        blurred_mod = blurred.copy()
        blurred_mod[0, 0] = (int(blurred_mod[0, 0]) + 1) % 256
        ciphertext2 = module.encrypt(blurred_mod, key)

        decrypted = module.decrypt(ciphertext1, key)

        # 6. Analysis Metrics (per Section 5 contracts)
        # Ciphertext metrics
        entropy = calculate_entropy(ciphertext1)
        corr = calculate_correlation(ciphertext1)
        npcr = calculate_npcr(ciphertext1, ciphertext2)
        uaci = calculate_uaci(ciphertext1, ciphertext2)

        # Decryption / Quality metrics (comparing convolved input vs decrypted)
        mse = calculate_mse(blurred, decrypted)
        psnr = calculate_psnr(blurred, decrypted)
        ssim = calculate_ssim(blurred, decrypted)

        report_lines.append(
            f"{name:<15} | {entropy:<8.4f} | {corr['horizontal']:<8.4f} | {npcr:<9.2f} | {uaci:<9.2f} | {mse:<8.2f} | {psnr:<10.2f} | {ssim:<6.4f}"
        )

    report_lines.append("=" * 80)
    report_text = "\n".join(report_lines)

    # Print to console and save to a text report
    print(report_text)
    report_file = os.path.join(output_dir, "analysis_report.txt")
    with open(report_file, "w") as f:
        f.write(report_text)

    print(f"\n[+] Processing complete. Images and report written to ./{output_dir}/")


if __name__ == "__main__":
    img_path = os.path.join(os.path.dirname(__file__), "cat512.png")
    run_full_pipeline(img_path)
