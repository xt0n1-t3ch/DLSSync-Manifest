import { readFileSync } from "node:fs";

const beforePath = process.argv[2];
const afterPath = process.argv[3] ?? "manifest.json";
const after = JSON.parse(readFileSync(afterPath, "utf8"));

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
if (next.size === 0) throw new Error("refusing an empty catalog");
if (!beforePath) {
  console.log(`semantic catalog check: ${next.size} releases`);
  process.exit(0);
}

const before = JSON.parse(readFileSync(beforePath, "utf8"));
if (Date.parse(after.generated_at) < Date.parse(before.generated_at)) {
  throw new Error(`generated_at regressed: ${before.generated_at} -> ${after.generated_at}`);
}
const previous = releases(before);
const removed = [...previous.keys()].filter((key) => !next.has(key));
const added = [...next.keys()].filter((key) => !previous.has(key));
const changed = [...next].filter(([key, hash]) => previous.has(key) && previous.get(key) !== hash);
const removalRatio = previous.size === 0 ? 0 : removed.length / previous.size;
if (removalRatio > 0.15 && process.env.ALLOW_LARGE_CATALOG_REMOVAL !== "1") {
  throw new Error(`refusing ${(removalRatio * 100).toFixed(1)}% release removal without ALLOW_LARGE_CATALOG_REMOVAL=1`);
}
console.log(JSON.stringify({ before: previous.size, after: next.size, added: added.length, removed: removed.length, changed: changed.length }));
