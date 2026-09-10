import test from "node:test";
import assert from "node:assert/strict";
import { validateArtifactPolicy } from "./artifact-policy.mjs";

function fixture() {
  const release = { version: "1.2.3.4", filename: "game.dll", hash_algorithm: "sha256", sha256: "a".repeat(64), size_bytes: 100,
    cdn_url: "https://example.com/sdk.zip", zip_entry: "bin/x64/game.dll" };
  release.artifact = { id: "b".repeat(64), family: "example", filename: release.filename, file_version: release.version,
    architecture: "x64", source_url: release.cdn_url, archive_entry: release.zip_entry,
    hash: { algorithm: "sha256", digest: release.sha256 }, size_bytes: "100", signature_status: "not_checked",
    observed_publisher: null, dependencies: [] };
  return { vendors: { nvidia: { example: { releases: [release] } } } };
}

test("rejects false architecture, mismatched file identity, and unresolved dependencies", () => {
  for (const change of [a => a.architecture = "arm64", a => a.filename = "another.dll", a => a.dependencies = ["missing"], a => a.signature_status = "verified"]) {
    const manifest = fixture();
    change(manifest.vendors.nvidia.example.releases[0].artifact);
    assert.throws(() => validateArtifactPolicy(manifest));
  }
  assert.doesNotThrow(() => validateArtifactPolicy(fixture()));
});

test("never describes an MD5 digest as SHA-256", () => {
  const manifest = fixture();
  const release = manifest.vendors.nvidia.example.releases[0];
  delete release.artifact;
  release.sha256 = "a".repeat(32);
  assert.throws(() => validateArtifactPolicy(manifest));
  release.hash_algorithm = "md5";
  assert.doesNotThrow(() => validateArtifactPolicy(manifest));
});
