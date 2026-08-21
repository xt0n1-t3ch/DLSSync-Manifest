import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  PRODUCTION_PUBLIC_KEY_HEX,
  base64Url,
  importVerificationKey,
  isSignatureHex,
  verifySignature,
} from "../scripts/lib/signature.mjs";

const manifestUrl = new URL("../manifest.json", import.meta.url);

async function signWithFreshKey(bytes) {
  const { privateKey, publicKey } = await crypto.subtle.generateKey({ name: "Ed25519" }, true, [
    "sign",
    "verify",
  ]);
  const signature = await crypto.subtle.sign({ name: "Ed25519" }, privateKey, bytes);
  const jwk = await crypto.subtle.exportKey("jwk", publicKey);
  const publicKeyHex = Buffer.from(jwk.x.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString(
    "hex",
  );
  return { signatureHex: Buffer.from(signature).toString("hex"), publicKeyHex };
}

test("isSignatureHex accepts exactly 128 hex characters in either case", () => {
  assert.equal(isSignatureHex("a".repeat(128)), true);
  assert.equal(isSignatureHex("A".repeat(128)), true);
  assert.equal(isSignatureHex("a".repeat(127)), false);
  assert.equal(isSignatureHex("a".repeat(129)), false);
  assert.equal(isSignatureHex(`${"a".repeat(127)}z`), false);
  assert.equal(isSignatureHex(""), false);
});

test("base64Url emits unpadded url-safe base64", () => {
  const encoded = base64Url(Buffer.from([0xfb, 0xff, 0xfe, 0x00]));

  assert.equal(encoded, "-__-AA");
  assert.doesNotMatch(encoded, /[+/=]/);
});

test("importVerificationKey returns a verify-only Ed25519 key", async () => {
  const key = await importVerificationKey(PRODUCTION_PUBLIC_KEY_HEX);

  assert.equal(key.algorithm.name, "Ed25519");
  assert.deepEqual(key.usages, ["verify"]);
  assert.equal(key.extractable, false);
});

test("verifySignature accepts the committed manifest and detached signature", async () => {
  const manifest = readFileSync(manifestUrl);
  const signatureHex = readFileSync(new URL("../manifest.json.sig", import.meta.url), "utf8").trim();

  assert.equal(await verifySignature(manifest, signatureHex), true);
});

test("verifySignature rejects a tampered manifest", async () => {
  const tampered = Buffer.concat([readFileSync(manifestUrl), Buffer.from(" ")]);
  const signatureHex = readFileSync(new URL("../manifest.json.sig", import.meta.url), "utf8").trim();

  assert.equal(await verifySignature(tampered, signatureHex), false);
});

test("verifySignature rejects a malformed signature without importing a key", async () => {
  assert.equal(await verifySignature(Buffer.from("payload"), "deadbeef"), false);
});

test("verifySignature accepts a signature made by the matching key", async () => {
  const payload = Buffer.from("catalog bytes");
  const { signatureHex, publicKeyHex } = await signWithFreshKey(payload);

  assert.equal(await verifySignature(payload, signatureHex, publicKeyHex), true);
});

test("verifySignature rejects a valid signature from a foreign key", async () => {
  const payload = Buffer.from("catalog bytes");
  const { signatureHex } = await signWithFreshKey(payload);

  assert.equal(await verifySignature(payload, signatureHex), false);
});
