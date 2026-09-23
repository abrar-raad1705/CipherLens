import { generateKeyFileJson } from "./web/lib/key-file.ts";

const str = generateKeyFileJson({
    algorithm: "drpe",
    keys: { seed1: 1234, seed2: 5678 },
    ciphertextReal: "REAL_DATA",
    ciphertextImag: "IMAG_DATA",
    ciphertextShape: [512, 512]
});
console.log(str);
