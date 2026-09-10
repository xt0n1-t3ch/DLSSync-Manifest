import { test } from "node:test";
import assert from "node:assert/strict";
import { validateArchitecturePolicy } from "./architecture-policy.mjs";

const catalog = (url, entry = "bin/x64/sl.common.dll") => ({ vendors: { nvidia: { streamline_common: { releases: [{ filename: "sl.common.dll", version: "2.14.1", cdn_url: url, zip_entry: entry }] } } } });
test("refuses ARM assets even when the archive entry claims x64", () => {
  for (const arch of ["aarch64", "arm64ec", "arm64", "x86", "win32"]) {
    assert.throws(() => validateArchitecturePolicy(catalog(`https://github.com/NVIDIA-RTX/Streamline/releases/download/v2.14.1/streamline-sdk-v2.14.1-${arch}.zip`)), /architecture/);
  }
});
test("checks archive architecture and exact DLL identity", () => {
  assert.throws(() => validateArchitecturePolicy(catalog("https://example.com/sdk.zip", "native/bin/arm64/sl.common.dll")), /architecture/);
  assert.throws(() => validateArchitecturePolicy(catalog("https://example.com/sdk.zip", "bin/x64/sl.reflex.dll")), /identity/);
  assert.throws(() => validateArchitecturePolicy(catalog("https://example.com/sdk.zip", "../sl.common.dll")), /unsafe/);
  assert.doesNotThrow(() => validateArchitecturePolicy(catalog("https://github.com/NVIDIA-RTX/Streamline/releases/download/v2.14.1/streamline-sdk-v2.14.1.zip")));
});
