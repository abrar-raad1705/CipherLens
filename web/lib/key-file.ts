import type { EncryptionAlgorithm, EncryptionSessionKeys } from "./encryption-session";
import type { KeyFileV2 } from "@/types/encryption";

export interface KeyFileMetadata {
  algorithm: EncryptionAlgorithm;
  version: string;
  createdAt: string;
  sourceImageName?: string;
  imageDimensions?: string;
}

export interface ParsedKeyData {
  // DRPE
  seed1?: number;
  seed2?: number;
  // Fourier
  fourierSeed?: number;
  // DCT
  dctSeed?: number;
  // Arnold
  iterations?: number;
  xorValue?: number;
  // Chaos
  chaosX0?: number;
  chaosR?: number;
  // Spectral Hybrid
  scrambleSeed?: number;
  maskSeed?: number;
  kernelSeed?: number;
  // Feistel
  feistelSeed?: number;
  feistelRounds?: number;
  // Layer 2 Key File
  isV2?: boolean;
  keyFileV2?: KeyFileV2;
  // Cross-session ciphertext package (from JSON key file)
  ciphertextPackage?: {
    real: string;
    imag?: string;
    shape: number[];
  };
}

export interface KeyFileValidationResult {
  valid: boolean;
  algorithm?: EncryptionAlgorithm;
  keys?: ParsedKeyData;
  keyFileV2?: KeyFileV2;
  metadata?: Partial<KeyFileMetadata>;
  error?: string;
  warning?: string;
  algorithmMismatch?: boolean;
}

/**
 * Normalizes algorithm name to standard EncryptionAlgorithm id.
 */
export function normalizeAlgorithmName(raw: string): EncryptionAlgorithm | null {
  const clean = raw.trim().toLowerCase().replace(/[-_\s]+/g, "");
  if (clean.includes("drpe") || clean === "4f" || clean === "coherent") return "drpe";
  if (clean.includes("fourier") || clean === "fft") return "fourier";
  if (clean.includes("dct") || clean === "cosine") return "dct";
  if (clean.includes("arnold") || clean.includes("catmap") || clean.includes("torus")) return "arnold";
  if (clean.includes("spectral") || clean.includes("hybrid")) return "spectral_hybrid";
  if (clean.includes("feistel")) return "feistel";
  return null;
}

export interface KeyPackageOptions {
  algorithm: EncryptionAlgorithm;
  keys: EncryptionSessionKeys;
  sourceImageName?: string;
  imageDimensions?: { width: number; height: number };
  // DRPE only — complex ciphertext planes for cross-session decryption
  ciphertextReal?: string;
  ciphertextImag?: string;
  ciphertextShape?: number[];
}

/**
 * Generates a JSON key package for all algorithms.
 * For DRPE this also embeds the complex ciphertext so a friend can decrypt
 * from a fresh session without the original encryption context.
 */
export function generateKeyFileJson(options: KeyPackageOptions): string {
  const { algorithm, keys, sourceImageName, imageDimensions } = options;
  const timestamp = new Date().toISOString();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const obj: Record<string, any> = {
    algorithm: algorithm.toUpperCase(),
    version: "2.0",
    timestamp,
    ...(sourceImageName ? { source_image: sourceImageName } : {}),
    ...(imageDimensions
      ? { dimensions: `${imageDimensions.width}x${imageDimensions.height}` }
      : {}),
  };

  if (algorithm === "drpe") {
    obj.seed1 = keys.seed1 ?? 1234;
    obj.seed2 = keys.seed2 ?? 5678;
    if (options.ciphertextReal && options.ciphertextImag && options.ciphertextShape) {
      obj.ciphertext_real = options.ciphertextReal;
      obj.ciphertext_imag = options.ciphertextImag;
      obj.ciphertext_shape = options.ciphertextShape;
    }
  } else if (algorithm === "fourier") {
    obj.seed = keys.fourierSeed ?? 100;
    if (options.ciphertextReal && options.ciphertextImag && options.ciphertextShape) {
      obj.ciphertext_real = options.ciphertextReal;
      obj.ciphertext_imag = options.ciphertextImag;
      obj.ciphertext_shape = options.ciphertextShape;
    }
  } else if (algorithm === "dct") {
    obj.seed = keys.dctSeed ?? 42;
    if (options.ciphertextReal && options.ciphertextShape) {
      obj.ciphertext_real = options.ciphertextReal;
      obj.ciphertext_shape = options.ciphertextShape;
    }
  } else if (algorithm === "arnold") {
    obj.iterations = keys.iterations ?? 10;
    obj.xor_value = keys.xorValue ?? 170;
  } else if (algorithm === "spectral_hybrid") {
    obj.scramble_seed = keys.scrambleSeed ?? 42;
    obj.mask_seed = keys.maskSeed ?? 99;
    obj.kernel_seed = keys.kernelSeed ?? 7;
    if (options.ciphertextReal && options.ciphertextImag && options.ciphertextShape) {
      obj.ciphertext_real = options.ciphertextReal;
      obj.ciphertext_imag = options.ciphertextImag;
      obj.ciphertext_shape = options.ciphertextShape;
    }
  } else if (algorithm === "feistel") {
    obj.seed = keys.feistelSeed ?? 42;
    obj.rounds = keys.feistelRounds ?? 8;
  }

  return JSON.stringify(obj, null, 2);
}

/**
 * Generates a Version 2 JSON Key File string.
 */
export function generateKeyFileV2(params: {
  algorithm: string;
  master_key: string;
  salt: string;
  nonce?: string | null;
  parameters?: Record<string, unknown>;
  dimensions: [number, number];
  raw_dtype: string;
  tag: string;
}): string {
  const kf: KeyFileV2 = {
    format_version: 2,
    algorithm: params.algorithm.toUpperCase(),
    created_at: new Date().toISOString(),
    master_key: params.master_key,
    salt: params.salt,
    nonce: params.nonce ?? null,
    parameters: params.parameters || {},
    dimensions: params.dimensions,
    raw_dtype: params.raw_dtype,
    authentication: {
      algorithm: "HMAC-SHA256",
      tag: params.tag,
    },
  };
  return JSON.stringify(kf, null, 2);
}

/**
 * @deprecated Use generateKeyFileJson instead. Kept for reference only.
 */
export function generateKeyFileContent(options: {
  algorithm: EncryptionAlgorithm;
  keys: EncryptionSessionKeys;
  sourceImageName?: string;
  imageDimensions?: { width: number; height: number };
}): string {
  // Delegate to JSON generator for consistency
  return generateKeyFileJson(options);
}

/**
 * Parses integer or hex number string safely.
 */
function parseNumberValue(val: string): number | null {
  const trimmed = val.trim();
  if (trimmed.startsWith("0x") || trimmed.startsWith("0X")) {
    const n = parseInt(trimmed, 16);
    return isNaN(n) ? null : n;
  }
  const n = parseInt(trimmed, 10);
  return isNaN(n) ? null : n;
}

/**
 * Parses and validates raw .txt key file string.
 */
export function parseAndValidateKeyFile(
  content: string,
  targetAlgorithm?: EncryptionAlgorithm
): KeyFileValidationResult {
  if (!content || typeof content !== "string" || content.trim().length === 0) {
    return {
      valid: false,
      error: "The key file is empty. Please select a valid .txt key file.",
    };
  }

  // Attempt JSON fallback parse if user passes JSON
  const trimmed = content.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    try {
      const json = JSON.parse(trimmed);

      // ── Detect Version 2 Structured Key File ───────────────────
      if (
        json.format_version === 2 ||
        json.format_version === "2" ||
        json.format_version === "2.0"
      ) {
        const rawAlgo = json.algorithm || json.algo || targetAlgorithm;
        const algo = rawAlgo ? normalizeAlgorithmName(String(rawAlgo)) : null;

        if (!algo) {
          return {
            valid: false,
            error: `Unrecognized algorithm '${rawAlgo}' in Version 2 key file. Supported: DRPE, Fourier, DCT, Arnold.`,
          };
        }

        if (!json.master_key || typeof json.master_key !== "string") {
          return {
            valid: false,
            error: "Invalid Version 2 key file: Missing required 'master_key'.",
          };
        }

        if (!json.salt || typeof json.salt !== "string") {
          return {
            valid: false,
            error: "Invalid Version 2 key file: Missing required 'salt'.",
          };
        }

        if (!json.authentication || !json.authentication.tag) {
          return {
            valid: false,
            error: "Invalid Version 2 key file: Missing required 'authentication.tag'.",
          };
        }

        const isMismatch = targetAlgorithm ? targetAlgorithm !== algo : false;

        const kfV2: KeyFileV2 = {
          format_version: 2,
          algorithm: algo.toUpperCase(),
          created_at: json.created_at || new Date().toISOString(),
          master_key: json.master_key,
          salt: json.salt,
          nonce: json.nonce ?? null,
          parameters: json.parameters || {},
          dimensions: json.dimensions || [512, 512],
          raw_dtype: json.raw_dtype || "complex64",
          authentication: {
            algorithm: json.authentication.algorithm || "HMAC-SHA256",
            tag: json.authentication.tag,
          },
        };

        const keys: ParsedKeyData = {
          isV2: true,
          keyFileV2: kfV2,
          iterations: json.parameters?.itr ?? json.parameters?.iterations,
        };

        return {
          valid: true,
          algorithm: algo,
          keys,
          keyFileV2: kfV2,
          metadata: {
            algorithm: algo,
            version: "2.0",
            createdAt: kfV2.created_at,
            imageDimensions: Array.isArray(kfV2.dimensions)
              ? `${kfV2.dimensions[1]}x${kfV2.dimensions[0]}`
              : undefined,
          },
          algorithmMismatch: isMismatch,
          warning: isMismatch
            ? `Key file is for ${algo.toUpperCase()}, but currently selected algorithm is ${targetAlgorithm?.toUpperCase()}.`
            : undefined,
        };
      }

      // ── Legacy v1 JSON Fallback ────────────────────────────────
      const rawAlgo = json.algorithm || json.algo || targetAlgorithm;
      const algo = rawAlgo ? normalizeAlgorithmName(String(rawAlgo)) : null;

      if (!algo) {
        return {
          valid: false,
          error: `Unrecognized algorithm '${rawAlgo}' in JSON key file. Supported: DRPE, Fourier, DCT, Arnold, Chaos, Spectral Hybrid, Feistel.`,
        };
      }

      const keys: ParsedKeyData = {
        seed1: json.seed1 ?? json.r1 ?? json.seed_1,
        seed2: json.seed2 ?? json.r2 ?? json.seed_2,
        fourierSeed: json.fourierSeed ?? json.fourier_seed ?? json.seed,
        dctSeed: json.dctSeed ?? json.dct_seed ?? json.seed,
        iterations: json.iterations ?? json.itr ?? json.iteration,
        xorValue: json.xorValue ?? json.xor_value ?? json.xor,
        chaosX0: json.x0 ?? json.chaos_x0,
        chaosR: json.r ?? json.chaos_r,
        scrambleSeed: json.scramble_seed ?? json.scrambleSeed,
        maskSeed: json.mask_seed ?? json.maskSeed,
        kernelSeed: json.kernel_seed ?? json.kernelSeed,
        feistelSeed: json.feistelSeed ?? json.feistel_seed ?? json.seed,
        feistelRounds: json.rounds ?? json.feistelRounds ?? json.feistel_rounds,
      };

      // Extract complex/real ciphertext package if present (DRPE, Fourier, DCT)
      if (
        json.ciphertext_real &&
        Array.isArray(json.ciphertext_shape)
      ) {
        keys.ciphertextPackage = {
          real: json.ciphertext_real,
          imag: json.ciphertext_imag,
          shape: json.ciphertext_shape,
        };
      }

      return validateParsedKeys(algo, keys, targetAlgorithm);
    } catch {
      // Fall through to plain text parsing
    }
  }

  // Plain-text key-value parsing
  const rawPairs: Record<string, string> = {};
  const lines = content.split(/\r?\n/);

  for (const line of lines) {
    const stripped = line.trim();
    if (!stripped || stripped.startsWith("#") || stripped.startsWith("//") || stripped.startsWith(";")) {
      continue;
    }

    // Split on first : or =
    const match = stripped.match(/^([^:=]+)[:=](.*)$/);
    if (match) {
      const key = match[1].trim().toLowerCase().replace(/[-_\s]+/g, "");
      // Remove inline comments if any
      let val = match[2].trim();
      const commentIdx = val.search(/[#;]/);
      if (commentIdx !== -1) {
        val = val.substring(0, commentIdx).trim();
      }
      // Remove surrounding quotes if any
      val = val.replace(/^["']|["']$/g, "");
      rawPairs[key] = val;
    }
  }

  if (Object.keys(rawPairs).length === 0) {
    return {
      valid: false,
      error: "Unrecognized key file format. Expected key-value pairs like 'Algorithm: DRPE' and 'Seed1: 1234'.",
    };
  }

  // Detect Algorithm
  let detectedAlgo: EncryptionAlgorithm | null = null;
  if (rawPairs["algorithm"] || rawPairs["algo"]) {
    detectedAlgo = normalizeAlgorithmName(rawPairs["algorithm"] || rawPairs["algo"]);
    if (!detectedAlgo) {
      return {
        valid: false,
        error: `Unrecognized algorithm '${rawPairs["algorithm"] || rawPairs["algo"]}'. Supported: DRPE, Fourier, DCT, Arnold.`,
      };
    }
  }

  // Extract candidate keys
  const parsedKeys: ParsedKeyData = {};

  // DRPE keys
  const s1Str = rawPairs["seed1"] || rawPairs["r1"] || rawPairs["r1seed"] || rawPairs["spatialseed"];
  if (s1Str !== undefined) {
    const val = parseNumberValue(s1Str);
    if (val !== null) parsedKeys.seed1 = val;
  }

  const s2Str = rawPairs["seed2"] || rawPairs["r2"] || rawPairs["r2seed"] || rawPairs["fourierseed"];
  if (s2Str !== undefined) {
    const val = parseNumberValue(s2Str);
    if (val !== null) parsedKeys.seed2 = val;
  }

  // Fourier keys
  const fourierSeedStr =
    rawPairs["fourierseed"] ||
    rawPairs["phaseseed"] ||
    (parsedKeys.seed1 === undefined ? rawPairs["seed"] : undefined);
  if (fourierSeedStr !== undefined) {
    const val = parseNumberValue(fourierSeedStr);
    if (val !== null) parsedKeys.fourierSeed = val;
  }

  // DCT keys
  const dctSeedStr =
    rawPairs["dctseed"] ||
    rawPairs["permutationseed"] ||
    (parsedKeys.seed1 === undefined ? rawPairs["seed"] : undefined);
  if (dctSeedStr !== undefined) {
    const val = parseNumberValue(dctSeedStr);
    if (val !== null) parsedKeys.dctSeed = val;
  }

  // Arnold keys
  const itrStr = rawPairs["iterations"] || rawPairs["iteration"] || rawPairs["itr"] || rawPairs["rounds"];
  if (itrStr !== undefined) {
    const val = parseNumberValue(itrStr);
    if (val !== null) parsedKeys.iterations = val;
  }

  const xorStr = rawPairs["xorvalue"] || rawPairs["xor"] || rawPairs["xormask"] || rawPairs["mask"];
  if (xorStr !== undefined) {
    const val = parseNumberValue(xorStr);
    if (val !== null) parsedKeys.xorValue = val;
  }

  // Infer algorithm if not explicitly stated
  if (!detectedAlgo) {
    if (parsedKeys.seed1 !== undefined && parsedKeys.seed2 !== undefined) {
      detectedAlgo = "drpe";
    } else if (parsedKeys.iterations !== undefined || parsedKeys.xorValue !== undefined) {
      detectedAlgo = "arnold";
    } else if (parsedKeys.fourierSeed !== undefined && targetAlgorithm === "fourier") {
      detectedAlgo = "fourier";
    } else if (parsedKeys.dctSeed !== undefined && targetAlgorithm === "dct") {
      detectedAlgo = "dct";
    } else if (targetAlgorithm) {
      detectedAlgo = targetAlgorithm;
    } else {
      return {
        valid: false,
        error: "Missing 'Algorithm' specification in key file. Please specify Algorithm: DRPE, Fourier, DCT, or Arnold.",
      };
    }
  }

  return validateParsedKeys(detectedAlgo, parsedKeys, targetAlgorithm, {
    version: rawPairs["version"],
    createdAt: rawPairs["timestamp"] || rawPairs["created"],
    sourceImageName: rawPairs["sourceimage"] || rawPairs["image"],
    imageDimensions: rawPairs["dimensions"],
  });
}

function validateParsedKeys(
  algo: EncryptionAlgorithm,
  keys: ParsedKeyData,
  targetAlgorithm?: EncryptionAlgorithm,
  metadata?: Partial<KeyFileMetadata>
): KeyFileValidationResult {
  const isMismatch = targetAlgorithm ? targetAlgorithm !== algo : false;

  if (algo === "drpe") {
    if (keys.seed1 === undefined) {
      return {
        valid: false,
        algorithm: algo,
        error: "Invalid DRPE key file: Missing required parameter 'Seed1'.",
      };
    }
    if (keys.seed2 === undefined) {
      return {
        valid: false,
        algorithm: algo,
        error: "Invalid DRPE key file: Missing required parameter 'Seed2'.",
      };
    }
    if (keys.seed1 < 0 || keys.seed2 < 0) {
      return {
        valid: false,
        algorithm: algo,
        error: "DRPE key seeds must be positive integer values.",
      };
    }
    return {
      valid: true,
      algorithm: algo,
      keys: { 
        seed1: keys.seed1, 
        seed2: keys.seed2,
        ...(keys.ciphertextPackage ? { ciphertextPackage: keys.ciphertextPackage } : {})
      },
      metadata,
      algorithmMismatch: isMismatch,
    };
  }

  if (algo === "fourier") {
    const seed = keys.fourierSeed ?? keys.seed1;
    if (seed === undefined) {
      return {
        valid: false,
        algorithm: algo,
        error: "Invalid Fourier key file: Missing required parameter 'FourierSeed' (or 'Seed').",
      };
    }
    if (seed < 1) {
      return {
        valid: false,
        algorithm: algo,
        error: "Fourier phase seed must be an integer >= 1.",
      };
    }
    return {
      valid: true,
      algorithm: algo,
      keys: { 
        fourierSeed: seed,
        ...(keys.ciphertextPackage ? { ciphertextPackage: keys.ciphertextPackage } : {})
      },
      metadata,
      algorithmMismatch: isMismatch,
    };
  }

  if (algo === "dct") {
    const seed = keys.dctSeed ?? keys.seed1;
    if (seed === undefined) {
      return {
        valid: false,
        algorithm: algo,
        error: "Invalid DCT key file: Missing required parameter 'DctSeed' (or 'Seed').",
      };
    }
    if (seed < 1) {
      return {
        valid: false,
        algorithm: algo,
        error: "DCT permutation seed must be an integer >= 1.",
      };
    }
    return {
      valid: true,
      algorithm: algo,
      keys: { 
        dctSeed: seed,
        ...(keys.ciphertextPackage ? { ciphertextPackage: keys.ciphertextPackage } : {})
      },
      metadata,
      algorithmMismatch: isMismatch,
    };
  }

  if (algo === "arnold") {
    if (keys.iterations === undefined) {
      return {
        valid: false,
        algorithm: algo,
        error: "Invalid Arnold key file: Missing required parameter 'Iterations'.",
      };
    }
    if (keys.iterations < 1 || keys.iterations > 50) {
      return {
        valid: false,
        algorithm: algo,
        error: "Arnold Cat Map 'Iterations' must be an integer between 1 and 50.",
      };
    }
    if (keys.xorValue === undefined) {
      return {
        valid: false,
        algorithm: algo,
        error: "Invalid Arnold key file: Missing required parameter 'XorValue'.",
      };
    }
    if (keys.xorValue < 0 || keys.xorValue > 255) {
      return {
        valid: false,
        algorithm: algo,
        error: "Arnold Cat Map 'XorValue' must be an integer between 0 and 255 (0x00 - 0xFF).",
      };
    }
    return {
      valid: true,
      algorithm: algo,
      keys: { iterations: keys.iterations, xorValue: keys.xorValue },
      metadata,
      algorithmMismatch: isMismatch,
    };
  }

  if (algo === "spectral_hybrid") {
    const ss = keys.scrambleSeed;
    const ms = keys.maskSeed;
    const ks = keys.kernelSeed;
    if (ss === undefined || ms === undefined || ks === undefined) {
      return {
        valid: false,
        algorithm: algo,
        error: "Invalid Spectral Hybrid key file: Missing required parameters 'scramble_seed', 'mask_seed', and 'kernel_seed'.",
      };
    }
    return {
      valid: true,
      algorithm: algo,
      keys: {
        scrambleSeed: ss,
        maskSeed: ms,
        kernelSeed: ks,
        ...(keys.ciphertextPackage ? { ciphertextPackage: keys.ciphertextPackage } : {}),
      },
      metadata,
      algorithmMismatch: isMismatch,
    };
  }

  if (algo === "feistel") {
    const seed = keys.feistelSeed ?? keys.seed1;
    const rounds = keys.feistelRounds;
    if (seed === undefined) {
      return {
        valid: false,
        algorithm: algo,
        error: "Invalid Feistel key file: Missing required parameter 'seed'.",
      };
    }
    if (rounds !== undefined && (rounds < 4 || rounds > 16)) {
      return {
        valid: false,
        algorithm: algo,
        error: "Feistel 'rounds' must be between 4 and 16.",
      };
    }
    return {
      valid: true,
      algorithm: algo,
      keys: { feistelSeed: seed, feistelRounds: rounds ?? 8 },
      metadata,
      algorithmMismatch: isMismatch,
    };
  }

  return {
    valid: false,
    error: `Unsupported algorithm '${algo}'.`,
  };
}

/**
 * Triggers browser download of a JSON key package file.
 */
export function downloadKeyJson(jsonStr: string, filename: string = "encryption_key.json"): void {
  if (typeof window === "undefined") return;
  const blob = new Blob([jsonStr], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * @deprecated Use downloadKeyJson instead.
 */
export function downloadKeyFile(content: string, filename: string = "encryption_key.txt"): void {
  downloadKeyJson(content, filename.replace(".txt", ".json"));
}

/**
 * Triggers browser download of image dataUri.
 */
export function downloadImage(dataUri: string, filename: string = "encrypted_image.png"): void {
  if (typeof window === "undefined" || !dataUri) return;
  const a = document.createElement("a");
  a.href = dataUri;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
