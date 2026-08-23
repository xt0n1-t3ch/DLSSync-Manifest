import assert from "node:assert/strict";
import { test } from "node:test";
import { collectReleases, diffCatalogs, MAX_REMOVAL_RATIO } from "../scripts/lib/catalog-diff.mjs";

const release = (filename, version, sha256) => ({ filename, version, sha256 });

const catalog = (releases, generatedAt = "2026-01-01T00:00:00Z") => ({
  generated_at: generatedAt,
  vendors: { nvidia: { dlss_sr: { releases } } },
});

test("collectReleases keys releases by vendor, family, filename and version", () => {
  const map = collectReleases({
    vendors: {
      nvidia: { dlss_sr: { releases: [release("nvngx_dlss.dll", "3.7.0", "aaa")] } },
      intel: { xess_sr: { releases: [release("libxess.dll", "2.0.0", "bbb")] } },
    },
  });

  assert.deepEqual(
    [...map.entries()],
    [
      ["nvidia/dlss_sr/nvngx_dlss.dll/3.7.0", "aaa"],
      ["intel/xess_sr/libxess.dll/2.0.0", "bbb"],
    ],
  );
});

test("collectReleases tolerates missing vendors, families and releases", () => {
  assert.equal(collectReleases({}).size, 0);
  assert.equal(collectReleases({ vendors: { nvidia: { dlss_sr: {} } } }).size, 0);
  assert.equal(collectReleases({ vendors: { nvidia: {} } }).size, 0);
});

test("collectReleases keeps the last hash for duplicate keys", () => {
  const map = collectReleases(
    catalog([release("nvngx_dlss.dll", "3.7.0", "aaa"), release("nvngx_dlss.dll", "3.7.0", "bbb")]),
  );

  assert.equal(map.size, 1);
  assert.equal(map.get("nvidia/dlss_sr/nvngx_dlss.dll/3.7.0"), "bbb");
});

test("diffCatalogs rejects an empty catalog", () => {
  assert.throws(() => diffCatalogs(null, catalog([])), /refusing an empty catalog/);
});

test("diffCatalogs counts every release as added when there is no baseline", () => {
  const summary = diffCatalogs(
    null,
    catalog([release("nvngx_dlss.dll", "3.7.0", "aaa"), release("nvngx_dlss.dll", "3.8.0", "bbb")]),
  );

  assert.deepEqual(summary, { before: 0, after: 2, added: 2, removed: 0, changed: 0 });
});

test("diffCatalogs reports added, removed and changed releases", () => {
  const before = catalog([
    release("nvngx_dlss.dll", "3.7.0", "aaa"),
    release("nvngx_dlss.dll", "3.8.0", "bbb"),
  ]);
  const after = catalog(
    [
      release("nvngx_dlss.dll", "3.7.0", "aaa"),
      release("nvngx_dlss.dll", "3.8.0", "changed"),
      release("nvngx_dlss.dll", "3.9.0", "ccc"),
    ],
    "2026-02-01T00:00:00Z",
  );

  assert.deepEqual(diffCatalogs(before, after), {
    before: 2,
    after: 3,
    added: 1,
    removed: 0,
    changed: 1,
  });
});

test("diffCatalogs rejects a regressed generated_at", () => {
  const before = catalog([release("nvngx_dlss.dll", "3.7.0", "aaa")], "2026-02-01T00:00:00Z");
  const after = catalog([release("nvngx_dlss.dll", "3.7.0", "aaa")], "2026-01-01T00:00:00Z");

  assert.throws(() => diffCatalogs(before, after), /generated_at regressed/);
});

test("diffCatalogs accepts an unchanged generated_at", () => {
  const releases = [release("nvngx_dlss.dll", "3.7.0", "aaa")];

  assert.equal(diffCatalogs(catalog(releases), catalog(releases)).removed, 0);
});

test("diffCatalogs rejects removals above the allowed ratio", () => {
  const before = catalog(
    Array.from({ length: 10 }, (_, index) => release("nvngx_dlss.dll", `3.${index}.0`, "aaa")),
  );
  const after = catalog(
    Array.from({ length: 8 }, (_, index) => release("nvngx_dlss.dll", `3.${index}.0`, "aaa")),
  );

  assert.ok(2 / 10 > MAX_REMOVAL_RATIO);
  assert.throws(() => diffCatalogs(before, after), /refusing 20.0% release removal/);
});

test("diffCatalogs allows large removals when explicitly opted in", () => {
  const before = catalog(
    Array.from({ length: 10 }, (_, index) => release("nvngx_dlss.dll", `3.${index}.0`, "aaa")),
  );
  const after = catalog([release("nvngx_dlss.dll", "3.0.0", "aaa")]);

  assert.deepEqual(diffCatalogs(before, after, { allowLargeRemoval: true }), {
    before: 10,
    after: 1,
    added: 0,
    removed: 9,
    changed: 0,
  });
});

test("diffCatalogs allows removals at the ratio boundary", () => {
  const before = catalog(
    Array.from({ length: 20 }, (_, index) => release("nvngx_dlss.dll", `3.${index}.0`, "aaa")),
  );
  const after = catalog(
    Array.from({ length: 17 }, (_, index) => release("nvngx_dlss.dll", `3.${index}.0`, "aaa")),
  );

  assert.equal(diffCatalogs(before, after).removed, 3);
});
