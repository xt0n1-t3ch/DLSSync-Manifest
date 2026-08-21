import { readFileSync } from "node:fs";
import { validateManifest } from "./lib/manifest-schema.mjs";

const schema = JSON.parse(readFileSync("manifest.schema.json", "utf8"));
const manifest = JSON.parse(readFileSync("manifest.json", "utf8"));
const result = validateManifest(schema, manifest);
if (!result.valid) {
  console.error(result.errors);
  process.exit(1);
}
console.log(`manifest schema valid: ${result.vendorCount} vendors`);
