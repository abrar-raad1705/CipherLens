import assert from "node:assert/strict";
import {
  generateKeyFileV2,
  parseAndValidateKeyFile,
  generateKeyFileJson,
} from "../lib/key-file.ts";

console.log("Starting Key File v2 & v1 test suite...\n");

// Test 1: generateKeyFileV2 outputs valid JSON matching KeyFileV2 schema
{
  const v2String = generateKeyFileV2({
    algorithm: "drpe",
    master_key: "MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY",
    salt: "MDEyMzQ1Njc4OWFiY2RlZg",
    nonce: "MDEyMzQ1Njc4OWFi",
    parameters: { test_param: 123 },
    dimensions: [256, 256],
    raw_dtype: "complex64",
    tag: "abcdef1234567890abcdef1234567890",
  });

  const parsedJson = JSON.parse(v2String);
  assert.equal(parsedJson.format_version, 2, "format_version should be 2");
  assert.equal(parsedJson.algorithm, "DRPE", "algorithm should be uppercase DRPE");
  assert.equal(parsedJson.master_key, "MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY");
  assert.equal(parsedJson.salt, "MDEyMzQ1Njc4OWFiY2RlZg");
  assert.equal(parsedJson.nonce, "MDEyMzQ1Njc4OWFi");
  assert.deepEqual(parsedJson.dimensions, [256, 256]);
  assert.equal(parsedJson.raw_dtype, "complex64");
  assert.equal(parsedJson.authentication.tag, "abcdef1234567890abcdef1234567890");
  assert.equal(parsedJson.authentication.algorithm, "HMAC-SHA256");
  console.log("✓ Test 1 Passed: generateKeyFileV2 schema validation");
}

// Test 2: parseAndValidateKeyFile parses valid v2 key file
{
  const v2String = generateKeyFileV2({
    algorithm: "arnold",
    master_key: "AQIDBAUGBwgJCgsMDQ4PEBESExQVFhcYGRobHB0eHyA",
    salt: "AQIDBAUGBwgJCgsMDQ4PEA",
    nonce: "AQIDBAUGBwgJ",
    parameters: { iterations: 10 },
    dimensions: [128, 128],
    raw_dtype: "uint8",
    tag: "deadbeefcafebabe1234567890abcdef",
  });

  const res = parseAndValidateKeyFile(v2String, "arnold");
  assert.equal(res.valid, true, "Should be valid");
  assert.equal(res.algorithm, "arnold", "Algorithm should match");
  assert.ok(res.keyFileV2, "keyFileV2 should be populated");
  assert.equal(res.keyFileV2.format_version, 2);
  assert.equal(res.keyFileV2.algorithm, "ARNOLD");
  assert.equal(res.keyFileV2.authentication.tag, "deadbeefcafebabe1234567890abcdef");
  assert.equal(res.keys?.isV2, true);
  console.log("✓ Test 2 Passed: parseAndValidateKeyFile successfully parses v2 file");
}

// Test 3: parseAndValidateKeyFile detects algorithm mismatch
{
  const v2String = generateKeyFileV2({
    algorithm: "fourier",
    master_key: "AQIDBAUGBwgJCgsMDQ4PEBESExQVFhcYGRobHB0eHyA",
    salt: "AQIDBAUGBwgJCgsMDQ4PEA",
    dimensions: [64, 64],
    raw_dtype: "complex64",
    tag: "feedfacefeedface1234567890abcdef",
  });

  const res = parseAndValidateKeyFile(v2String, "dct");
  assert.equal(res.valid, true, "Key file itself is structurally valid");
  assert.equal(res.algorithmMismatch, true, "algorithmMismatch flag should be true");
  assert.ok(res.warning, "Should contain warning about algorithm mismatch");
  console.log("✓ Test 3 Passed: parseAndValidateKeyFile detects algorithm mismatch");
}

// Test 4: parseAndValidateKeyFile rejects malformed v2 keys
{
  // Missing master_key
  const badKey1 = JSON.stringify({
    format_version: 2,
    algorithm: "DRPE",
    salt: "AQIDBAUGBwgJCgsMDQ4PEA",
    authentication: { tag: "1234" },
  });
  const res1 = parseAndValidateKeyFile(badKey1);
  assert.equal(res1.valid, false);
  assert.match(res1.error || "", /master_key/);

  // Missing salt
  const badKey2 = JSON.stringify({
    format_version: 2,
    algorithm: "DRPE",
    master_key: "AQIDBAUGBwgJCgsMDQ4PEBESExQVFhcYGRobHB0eHyA",
    authentication: { tag: "1234" },
  });
  const res2 = parseAndValidateKeyFile(badKey2);
  assert.equal(res2.valid, false);
  assert.match(res2.error || "", /salt/);

  // Missing authentication tag
  const badKey3 = JSON.stringify({
    format_version: 2,
    algorithm: "DRPE",
    master_key: "AQIDBAUGBwgJCgsMDQ4PEBESExQVFhcYGRobHB0eHyA",
    salt: "AQIDBAUGBwgJCgsMDQ4PEA",
  });
  const res3 = parseAndValidateKeyFile(badKey3);
  assert.equal(res3.valid, false);
  assert.match(res3.error || "", /tag/);

  // Unrecognized algorithm
  const badKey4 = JSON.stringify({
    format_version: 2,
    algorithm: "UNKNOWN_CIPHER",
    master_key: "AQIDBAUGBwgJCgsMDQ4PEBESExQVFhcYGRobHB0eHyA",
    salt: "AQIDBAUGBwgJCgsMDQ4PEA",
    authentication: { tag: "1234" },
  });
  const res4 = parseAndValidateKeyFile(badKey4);
  assert.equal(res4.valid, false);
  assert.match(res4.error || "", /Unrecognized algorithm/);

  console.log("✓ Test 4 Passed: parseAndValidateKeyFile rejects invalid v2 keys");
}

// Test 5: parseAndValidateKeyFile preserves legacy v1 JSON fallback
{
  const v1Json = generateKeyFileJson({
    algorithm: "drpe",
    keys: { seed1: 1234, seed2: 5678 },
    sourceImageName: "test.png",
  });

  const res = parseAndValidateKeyFile(v1Json, "drpe");
  assert.equal(res.valid, true);
  assert.equal(res.algorithm, "drpe");
  assert.equal(res.keys?.seed1, 1234);
  assert.equal(res.keys?.seed2, 5678);
  console.log("✓ Test 5 Passed: Legacy v1 JSON compatibility preserved");
}

// Test 6: parseAndValidateKeyFile preserves legacy v1 .txt key-value fallback
{
  const legacyTxt = [
    "--- BATSIGNAL ENCRYPTION KEY FILE ---",
    "Algorithm: FOURIER",
    "Version: 1.0",
    "Phase Seed: 9876",
  ].join("\n");

  const res = parseAndValidateKeyFile(legacyTxt, "fourier");
  assert.equal(res.valid, true);
  assert.equal(res.algorithm, "fourier");
  assert.equal(res.keys?.fourierSeed, 9876);
  console.log("✓ Test 6 Passed: Legacy v1 TXT key-value compatibility preserved");
}

console.log("\nAll key file test cases passed successfully!");
