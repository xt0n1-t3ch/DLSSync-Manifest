import { readFileSync } from "node:fs";
import { diffCatalogs } from "./lib/catalog-diff.mjs";

const beforePath = process.argv[2];
const afterPath = process.argv[3] ?? "manifest.json";
const after = JSON.parse(readFileSync(afterPath, "utf8"));

if (!beforePath) {
  const summary = diffCatalogs(null, after);
  console.log(`semantic catalog check: ${summary.after} releases`);
  process.exit(0);
}

const before = JSON.parse(readFileSync(beforePath, "utf8"));
const summary = diffCatalogs(before, after, {
  allowLargeRemoval: process.env.ALLOW_LARGE_CATALOG_REMOVAL === "1",
});
console.log(JSON.stringify(summary));
