import { readFileSync } from "node:fs";

const publicKeyHex = "e9dd0828f9ee5ecb72e0a811723a79c6e5373ca1c20bd5b255d68a2b3928fcd3";
const manifestPath = process.argv[2] ?? "manifest.json";
const signaturePath = process.argv[3] ?? `${manifestPath}.sig`;
const signatureHex = readFileSync(signaturePath, "utf8").trim();

if (!/^[0-9a-fA-F]{128}$/.test(signatureHex)) {
  console.error(`::error::${signaturePath} must be a 128-character Ed25519 signature hex string`);
  process.exit(1);
}

const publicKey = Buffer.from(publicKeyHex, "hex");
const base64Url = (buffer) =>
  buffer.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const verificationKey = await crypto.subtle.importKey(
  "jwk",
  { kty: "OKP", crv: "Ed25519", x: base64Url(publicKey) },
  { name: "Ed25519" },
  false,
  ["verify"],
);
const manifest = readFileSync(manifestPath);
const signature = Buffer.from(signatureHex, "hex");

if (!(await crypto.subtle.verify({ name: "Ed25519" }, verificationKey, signature, manifest))) {
  console.error(`::error::${signaturePath} does not verify ${manifestPath} against the production public key`);
  process.exit(1);
}

console.log(`${signaturePath} verifies ${manifestPath} against the production public key`);
