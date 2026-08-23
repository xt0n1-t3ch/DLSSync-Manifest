import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { createValidator, validateManifest } from "../scripts/lib/manifest-schema.mjs";

const schema = JSON.parse(readFileSync(new URL("../manifest.schema.json", import.meta.url), "utf8"));

const validRelease = () => ({
  version: "3.7.0",
  version_packed: 844708148740096,
  filename: "nvngx_dlss.dll",
  sha256: "a".repeat(64),
  size_bytes: 1024,
  signed: true,
  released_at: "2026-01-01T00:00:00Z",
  source: "https://github.com/example/repo/releases/tag/v3.7.0",
  cdn_url: "https://github.com/example/repo/releases/download/v3.7.0/nvngx_dlss.dll",
});

const validManifest = (release = validRelease()) => ({
  schema_version: 2,
  generated_at: "2026-01-01T00:00:00Z",
  vendors: { nvidia: { dlss_sr: { latest: release.version, releases: [release] } } },
});

test("createValidator accepts date-time formats via ajv-formats", () => {
  const ajv = createValidator();

  assert.equal(ajv.validate({ type: "string", format: "date-time" }, "2026-01-01T00:00:00Z"), true);
  assert.equal(ajv.validate({ type: "string", format: "date-time" }, "not-a-date"), false);
});

test("validateManifest accepts a minimal valid manifest and counts vendors", () => {
  const result = validateManifest(schema, validManifest());

  assert.equal(result.errors, "");
  assert.equal(result.valid, true);
  assert.equal(result.vendorCount, 1);
});

test("validateManifest accepts the committed manifest", () => {
  const manifest = JSON.parse(readFileSync(new URL("../manifest.json", import.meta.url), "utf8"));
  const result = validateManifest(schema, manifest);

  assert.equal(result.errors, "");
  assert.ok(result.vendorCount > 0);
});

test("validateManifest accepts the md5 hash fallback", () => {
  const release = { ...validRelease(), sha256: "b".repeat(32), hash_algorithm: "md5" };

  assert.equal(validateManifest(schema, validManifest(release)).valid, true);
});

test("validateManifest rejects a wrong schema_version", () => {
  const manifest = { ...validManifest(), schema_version: 3 };
  const result = validateManifest(schema, manifest);

  assert.equal(result.valid, false);
  assert.match(result.errors, /schema_version/);
});

test("validateManifest rejects an empty vendors map", () => {
  const result = validateManifest(schema, { ...validManifest(), vendors: {} });

  assert.equal(result.valid, false);
  assert.match(result.errors, /vendors/);
});

test("validateManifest rejects a release missing required fields", () => {
  const { sha256, ...release } = validRelease();
  const result = validateManifest(schema, validManifest({ ...release, version: "3.7.0" }));

  assert.equal(result.valid, false);
  assert.match(result.errors, /sha256/);
});

test("validateManifest rejects a non-dll filename", () => {
  const result = validateManifest(schema, validManifest({ ...validRelease(), filename: "dlss.zip" }));

  assert.equal(result.valid, false);
  assert.match(result.errors, /filename/);
});

test("validateManifest rejects a non-https cdn_url", () => {
  const release = { ...validRelease(), cdn_url: "http://example.com/nvngx_dlss.dll" };
  const result = validateManifest(schema, validManifest(release));

  assert.equal(result.valid, false);
  assert.match(result.errors, /cdn_url/);
});

test("validateManifest rejects unknown top-level properties", () => {
  const result = validateManifest(schema, { ...validManifest(), mirror_url: "https://example.com" });

  assert.equal(result.valid, false);
  assert.match(result.errors, /must NOT have additional properties/);
});

test("validateManifest rejects an unknown channel", () => {
  const result = validateManifest(schema, validManifest({ ...validRelease(), channel: "beta" }));

  assert.equal(result.valid, false);
  assert.match(result.errors, /channel/);
});

test("validateManifest reports every error when several are present", () => {
  const result = validateManifest(schema, {
    schema_version: 2,
    generated_at: "yesterday",
    vendors: { NVIDIA: { dlss_sr: { latest: "3.7.0", releases: [validRelease()] } } },
  });

  assert.equal(result.valid, false);
  assert.ok(result.errors.split("\n").length > 1);
});
