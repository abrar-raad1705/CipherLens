import assert from "node:assert";

// Implementation tests for Key File specification & validation
import {
  generateKeyFileContent,
  parseAndValidateKeyFile,
  normalizeAlgorithmName,
} from "../lib/key-file.ts";

console.log("▶ Running Key File test suite...\n");

// 1. normalizeAlgorithmName tests
{
  assert.strictEqual(normalizeAlgorithmName("drpe"), "drpe");
  assert.strictEqual(normalizeAlgorithmName("4F DRPE"), "drpe");
  assert.strictEqual(normalizeAlgorithmName("fourier"), "fourier");
  assert.strictEqual(normalizeAlgorithmName("Fourier Phase"), "fourier");
  assert.strictEqual(normalizeAlgorithmName("fft"), "fourier");
  assert.strictEqual(normalizeAlgorithmName("dct"), "dct");
  assert.strictEqual(normalizeAlgorithmName("DCT Permutation"), "dct");
  assert.strictEqual(normalizeAlgorithmName("arnold"), "arnold");
  assert.strictEqual(normalizeAlgorithmName("Arnold Cat Map"), "arnold");
  assert.strictEqual(normalizeAlgorithmName("unknown-algo"), null);
  console.log("✓ normalizeAlgorithmName passed");
}

// 2. DRPE Key File Generation & Parsing
{
  const generated = generateKeyFileContent({
    algorithm: "drpe",
    keys: { seed1: 1234, seed2: 5678 },
    sourceImageName: "cat512.png",
    imageDimensions: { width: 512, height: 512 },
  });

  assert(generated.includes("Algorithm: DRPE"));
  assert(generated.includes("Seed1: 1234"));
  assert(generated.includes("Seed2: 5678"));
  assert(generated.includes("Source-Image: cat512.png"));

  const parsed = parseAndValidateKeyFile(generated, "drpe");
  assert.strictEqual(parsed.valid, true);
  assert.strictEqual(parsed.algorithm, "drpe");
  assert.strictEqual(parsed.keys?.seed1, 1234);
  assert.strictEqual(parsed.keys?.seed2, 5678);
  console.log("✓ DRPE generate & parse passed");
}

// 3. Fourier Key File Generation & Parsing
{
  const generated = generateKeyFileContent({
    algorithm: "fourier",
    keys: { fourierSeed: 789 },
    sourceImageName: "test.png",
  });

  const parsed = parseAndValidateKeyFile(generated, "fourier");
  assert.strictEqual(parsed.valid, true);
  assert.strictEqual(parsed.algorithm, "fourier");
  assert.strictEqual(parsed.keys?.fourierSeed, 789);
  console.log("✓ Fourier generate & parse passed");
}

// 4. DCT Key File Generation & Parsing
{
  const generated = generateKeyFileContent({
    algorithm: "dct",
    keys: { dctSeed: 42 },
    sourceImageName: "lens.png",
  });

  const parsed = parseAndValidateKeyFile(generated, "dct");
  assert.strictEqual(parsed.valid, true);
  assert.strictEqual(parsed.algorithm, "dct");
  assert.strictEqual(parsed.keys?.dctSeed, 42);
  console.log("✓ DCT generate & parse passed");
}

// 5. Arnold Key File Generation & Parsing
{
  const generated = generateKeyFileContent({
    algorithm: "arnold",
    keys: { iterations: 15, xorValue: 204 },
    sourceImageName: "recon.png",
  });

  const parsed = parseAndValidateKeyFile(generated, "arnold");
  assert.strictEqual(parsed.valid, true);
  assert.strictEqual(parsed.algorithm, "arnold");
  assert.strictEqual(parsed.keys?.iterations, 15);
  assert.strictEqual(parsed.keys?.xorValue, 204);
  console.log("✓ Arnold generate & parse passed");
}

// 6. Tolerant key parsing with alternate delimiters and hex values
{
  const rawContent = `
    # Custom exported key
    algo = arnold
    iterations = 20
    xor_value = 0xAA # Hexadecimal mask (170 in decimal)
  `;

  const parsed = parseAndValidateKeyFile(rawContent, "arnold");
  assert.strictEqual(parsed.valid, true);
  assert.strictEqual(parsed.algorithm, "arnold");
  assert.strictEqual(parsed.keys?.iterations, 20);
  assert.strictEqual(parsed.keys?.xorValue, 170);
  console.log("✓ Tolerant parsing with hex & alternate delimiters passed");
}

// 7. Error Handling: Empty Key File
{
  const empty = parseAndValidateKeyFile("");
  assert.strictEqual(empty.valid, false);
  assert(empty.error?.includes("empty"));

  const whitespace = parseAndValidateKeyFile("   \n\n   ");
  assert.strictEqual(whitespace.valid, false);
  console.log("✓ Empty file error handling passed");
}

// 8. Error Handling: Missing parameters
{
  const missingSeed2 = `
    Algorithm: DRPE
    Seed1: 1234
  `;
  const parsed = parseAndValidateKeyFile(missingSeed2, "drpe");
  assert.strictEqual(parsed.valid, false);
  assert(parsed.error?.includes("Missing required parameter 'Seed2'"));
  console.log("✓ Missing parameter error handling passed");
}

// 9. Error Handling: Out of range values
{
  const outOfRangeArnold = `
    Algorithm: Arnold
    Iterations: 999
    XorValue: 170
  `;
  const parsed = parseAndValidateKeyFile(outOfRangeArnold, "arnold");
  assert.strictEqual(parsed.valid, false);
  assert(parsed.error?.includes("must be an integer between 1 and 50"));

  const invalidXor = `
    Algorithm: Arnold
    Iterations: 10
    XorValue: 500
  `;
  const parsedXor = parseAndValidateKeyFile(invalidXor, "arnold");
  assert.strictEqual(parsedXor.valid, false);
  assert(parsedXor.error?.includes("must be an integer between 0 and 255"));
  console.log("✓ Out of range parameter validation passed");
}

// 10. Algorithm Mismatch Detection
{
  const drpeKey = `
    Algorithm: DRPE
    Seed1: 1000
    Seed2: 2000
  `;
  const parsed = parseAndValidateKeyFile(drpeKey, "fourier");
  assert.strictEqual(parsed.valid, true);
  assert.strictEqual(parsed.algorithm, "drpe");
  assert.strictEqual(parsed.algorithmMismatch, true);
  console.log("✓ Algorithm mismatch detection passed");
}

// 11. JSON format fallback
{
  const jsonKey = JSON.stringify({
    algorithm: "drpe",
    seed1: 4321,
    seed2: 8765,
  });
  const parsed = parseAndValidateKeyFile(jsonKey, "drpe");
  assert.strictEqual(parsed.valid, true);
  assert.strictEqual(parsed.algorithm, "drpe");
  assert.strictEqual(parsed.keys?.seed1, 4321);
  assert.strictEqual(parsed.keys?.seed2, 8765);
  console.log("✓ JSON fallback parsing passed");
}

console.log("\n All 11 Key File test suites passed successfully!\n");
