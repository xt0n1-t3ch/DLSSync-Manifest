import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { promisify } from "node:util";

const run = promisify(execFile);
const repoRoot = new URL("..", import.meta.url).pathname;

async function runScript(script, args = [], env = {}) {
  try {
    const { stdout } = await run("node", [script, ...args], {
      cwd: repoRoot,
      env: { ...process.env, ...env },
      maxBuffer: 10 * 1024 * 1024,
    });
    return { code: 0, stdout, stderr: "" };
  } catch (error) {
    return { code: error.code, stdout: error.stdout, stderr: error.stderr };
  }
}

const catalog = (releases, generatedAt) => ({
  schema_version: 2,
  generated_at: generatedAt,
  vendors: { nvidia: { dlss_sr: { latest: releases[0]?.version ?? "0", releases } } },
});

function writeTempCatalog(name, manifest) {
  const path = join(mkdtempSync(join(tmpdir(), "dlssync-cli-")), name);
  writeFileSync(path, JSON.stringify(manifest));
  return path;
}

test("validate-manifest reports the committed manifest as valid", async () => {
  const result = await runScript("scripts/validate-manifest.mjs");

  assert.equal(result.code, 0);
  assert.match(result.stdout, /manifest schema valid: \d+ vendors/);
});

test("verify-manifest-signature verifies the committed detached signature", async () => {
  const result = await runScript(".github/scripts/verify-manifest-signature.mjs", [
    "manifest.json",
    "manifest.json.sig",
  ]);

  assert.equal(result.code, 0);
  assert.match(result.stdout, /verifies manifest\.json against the production public key/);
});

test("verify-manifest-signature fails on a malformed signature file", async () => {
  const path = join(mkdtempSync(join(tmpdir(), "dlssync-sig-")), "bad.sig");
  writeFileSync(path, "not-a-signature\n");

  const result = await runScript(".github/scripts/verify-manifest-signature.mjs", [
    "manifest.json",
    path,
  ]);

  assert.equal(result.code, 1);
  assert.match(result.stderr, /must be a 128-character Ed25519 signature hex string/);
});

test("semantic-diff summarises the committed catalog without a baseline", async () => {
  const result = await runScript("scripts/semantic-diff.mjs");

  assert.equal(result.code, 0);
  assert.match(result.stdout, /semantic catalog check: \d+ releases/);
});

test("semantic-diff prints a json summary against a baseline", async () => {
  const release = {
    version: "3.7.0",
    filename: "nvngx_dlss.dll",
    sha256: "a".repeat(64),
  };
  const before = writeTempCatalog("before.json", catalog([release], "2026-01-01T00:00:00Z"));
  const after = writeTempCatalog(
    "after.json",
    catalog([release, { ...release, version: "3.8.0" }], "2026-02-01T00:00:00Z"),
  );

  const result = await runScript("scripts/semantic-diff.mjs", [before, after]);

  assert.equal(result.code, 0);
  assert.deepEqual(JSON.parse(result.stdout), {
    before: 1,
    after: 2,
    added: 1,
    removed: 0,
    changed: 0,
  });
});

test("semantic-diff refuses a large removal unless the override is set", async () => {
  const releases = Array.from({ length: 10 }, (_, index) => ({
    version: `3.${index}.0`,
    filename: "nvngx_dlss.dll",
    sha256: "a".repeat(64),
  }));
  const before = writeTempCatalog("before.json", catalog(releases, "2026-01-01T00:00:00Z"));
  const after = writeTempCatalog(
    "after.json",
    catalog(releases.slice(0, 5), "2026-02-01T00:00:00Z"),
  );

  const refused = await runScript("scripts/semantic-diff.mjs", [before, after]);
  assert.equal(refused.code, 1);
  assert.match(refused.stderr, /refusing 50.0% release removal/);

  const allowed = await runScript("scripts/semantic-diff.mjs", [before, after], {
    ALLOW_LARGE_CATALOG_REMOVAL: "1",
  });
  assert.equal(allowed.code, 0);
  assert.equal(JSON.parse(allowed.stdout).removed, 5);
});
