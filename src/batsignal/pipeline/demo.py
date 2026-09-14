import os
import cv2
import numpy as np

# 1. Processing Modules
from batsignal.processing.gaussian import apply_gaussian
from batsignal.processing.deconvolution import apply_deconvolution  # update path if named differently

# 2. Encryption Algorithms (Contract Section 3)
from batsignal.encryption import arnold_xor
from batsignal.encryption import dct
from batsignal.encryption import fourier
from batsignal.encryption import drpe

# 3. Analysis Metrics (Contract Section 4)
from batsignal.analysis import (
    calculate_entropy,
    calculate_correlation,
    calculate_npcr,
    calculate_uaci,
    calculate_mse,
    calculate_psnr,
    calculate_ssim,
)


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
        "DCT":        {"module": dct,        "key": 42},
        "Fourier":    {"module": fourier,    "key": 100},
        "DRPE":       {"module": drpe,       "key": (1234, 5678)},
    }

    report_lines = [
        "=" * 80,
        f"{'Algorithm':<15} | {'Entropy':<8} | {'H-Corr':<8} | {'NPCR (%)':<9} | {'MSE':<8} | {'PSNR (dB)':<10} | {'SSIM':<6}",
        "-" * 80,
    ]

    for name, config in algorithms.items():
        module = config["module"]
        key = config["key"]

        # 3. Encrypt
        ciphertext1 = module.encrypt(blurred, key)
        ciphertext2 = module.encrypt(blurred_alt, key)

        # Ciphertext visual output (normalized if complex/float)
        c_vis = cv2.normalize(np.real(ciphertext1), None, 0, 255, cv2.NORM_MINMAX).astype(np.uint8)
        cv2.imwrite(os.path.join(output_dir, f"02_{name}_ciphertext.png"), c_vis)

        # 4. Decrypt
        decrypted = module.decrypt(ciphertext1, key)
        cv2.imwrite(os.path.join(output_dir, f"03_{name}_decrypted.png"), decrypted)

        # 5. Deconvolution (Restoration)
        restored = apply_deconvolution(decrypted)
        cv2.imwrite(os.path.join(output_dir, f"04_{name}_final_restored.png"), restored)

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
            f"{name:<15} | {entropy:<8.4f} | {corr['horizontal']:<8.4f} | {npcr:<9.2f} | {mse:<8.2f} | {psnr:<10.2f} | {ssim:<6.4f}"
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
    run_full_pipeline("cat512.png")