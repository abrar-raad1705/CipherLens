import type { EncryptionAlgorithm, EncryptionSessionKeys } from "./encryption-session";

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
  // DRPE cross-session ciphertext package (from JSON key file)
  ciphertextPackage?: {
    real: string;
    imag: string;
    shape: number[];
  };
}

export interface KeyFileValidationResult {
  valid: boolean;
  algorithm?: EncryptionAlgorithm;
  keys?: ParsedKeyData;
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
  } else if (algorithm === "dct") {
    obj.seed = keys.dctSeed ?? 42;
  } else if (algorithm === "arnold") {
    obj.iterations = keys.iterations ?? 10;
    obj.xor_value = keys.xorValue ?? 170;
  }

  return JSON.stringify(obj, null, 2);
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
      const rawAlgo = json.algorithm || json.algo || targetAlgorithm;
      const algo = rawAlgo ? normalizeAlgorithmName(String(rawAlgo)) : null;

      if (!algo) {
        return {
          valid: false,
          error: `Unrecognized algorithm '${rawAlgo}' in JSON key file. Supported: DRPE, Fourier, DCT, Arnold.`,
        };
      }

      const keys: ParsedKeyData = {
        seed1: json.seed1 ?? json.r1 ?? json.seed_1,
        seed2: json.seed2 ?? json.r2 ?? json.seed_2,
        fourierSeed: json.fourierSeed ?? json.fourier_seed ?? json.seed,
        dctSeed: json.dctSeed ?? json.dct_seed ?? json.seed,
        iterations: json.iterations ?? json.itr ?? json.iteration,
        xorValue: json.xorValue ?? json.xor_value ?? json.xor,
      };

      // Extract DRPE complex ciphertext package if present
      if (
        algo === "drpe" &&
        json.ciphertext_real &&
        json.ciphertext_imag &&
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
      keys: { fourierSeed: seed },
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
      keys: { dctSeed: seed },
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
