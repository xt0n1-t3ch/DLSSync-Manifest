import { readFileSync } from "node:fs";
import { isSignatureHex, verifySignature } from "../../scripts/lib/signature.mjs";

const manifestPath = process.argv[2] ?? "manifest.json";
const signaturePath = process.argv[3] ?? `${manifestPath}.sig`;
const signatureHex = readFileSync(signaturePath, "utf8").trim();

if (!isSignatureHex(signatureHex)) {
  console.error(`::error::${signaturePath} must be a 128-character Ed25519 signature hex string`);
  process.exit(1);
}

if (!(await verifySignature(readFileSync(manifestPath), signatureHex))) {
  console.error(
    `::error::${signaturePath} does not verify ${manifestPath} against the production public key`,
  );
  process.exit(1);
}

console.log(`${signaturePath} verifies ${manifestPath} against the production public key`);
