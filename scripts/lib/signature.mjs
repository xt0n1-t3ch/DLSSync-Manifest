export const PRODUCTION_PUBLIC_KEY_HEX =
  "e9dd0828f9ee5ecb72e0a811723a79c6e5373ca1c20bd5b255d68a2b3928fcd3";

export function isSignatureHex(value) {
  return /^[0-9a-fA-F]{128}$/.test(value);
}

export function base64Url(buffer) {
  return buffer.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function importVerificationKey(publicKeyHex) {
  return crypto.subtle.importKey(
    "jwk",
    { kty: "OKP", crv: "Ed25519", x: base64Url(Buffer.from(publicKeyHex, "hex")) },
    { name: "Ed25519" },
    false,
    ["verify"],
  );
}

export async function verifySignature(manifestBytes, signatureHex, publicKeyHex = PRODUCTION_PUBLIC_KEY_HEX) {
  if (!isSignatureHex(signatureHex)) return false;
  const key = await importVerificationKey(publicKeyHex);
  return crypto.subtle.verify(
    { name: "Ed25519" },
    key,
    Buffer.from(signatureHex, "hex"),
    manifestBytes,
  );
}
