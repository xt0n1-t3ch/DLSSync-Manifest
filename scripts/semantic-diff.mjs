import { readJson } from "./read-json.mjs";

const beforePath = process.argv[2];
const afterPath = process.argv[3] ?? "manifest.json";
const after = readJson(afterPath);

function fail(message) {
  console.error(`::error::${message}`);
  process.exit(1);
}

function releases(manifest) {
  const result = new Map();
  for (const [vendor, families] of Object.entries(manifest.vendors ?? {})) {
    for (const [family, entry] of Object.entries(families)) {
      for (const release of entry.releases ?? []) {
        result.set(`${vendor}/${family}/${release.filename}/${release.version}`, release.sha256);
      }
    }
  }
  return result;
}

const next = releases(after);
if (next.size === 0) fail("refusing an empty catalog");
if (!beforePath) {
  console.log(`semantic catalog check: ${next.size} releases`);
  process.exit(0);
}

const before = readJson(beforePath);
const afterGeneratedAt = Date.parse(after.generated_at);
const beforeGeneratedAt = Date.parse(before.generated_at);
if (Number.isNaN(afterGeneratedAt)) {
  fail(`invalid generated_at in ${afterPath}: ${after.generated_at}`);
}
if (Number.isNaN(beforeGeneratedAt)) {
  fail(`invalid generated_at in ${beforePath}: ${before.generated_at}`);
}
if (afterGeneratedAt < beforeGeneratedAt) {
  fail(`generated_at regressed: ${before.generated_at} -> ${after.generated_at}`);
}
const previous = releases(before);
const removed = [...previous.keys()].filter((key) => !next.has(key));
const added = [...next.keys()].filter((key) => !previous.has(key));
const changed = [...next].filter(([key, hash]) => previous.has(key) && previous.get(key) !== hash);
const removalRatio = previous.size === 0 ? 0 : removed.length / previous.size;
if (removalRatio > 0.15 && process.env.ALLOW_LARGE_CATALOG_REMOVAL !== "1") {
  fail(`refusing ${(removalRatio * 100).toFixed(1)}% release removal without ALLOW_LARGE_CATALOG_REMOVAL=1`);
}
console.log(JSON.stringify({ before: previous.size, after: next.size, added: added.length, removed: removed.length, changed: changed.length }));
if (changed.length > 0) {
  const keys = changed.slice(0, 20).map(([key]) => key);
  const remaining = changed.length - keys.length;
  console.warn(`::warning::hash changed for published release keys: ${keys.join(", ")}${remaining > 0 ? ` (+${remaining} more)` : ""}`);
}
