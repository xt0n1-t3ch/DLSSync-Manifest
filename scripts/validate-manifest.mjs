import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { readJson } from "./read-json.mjs";

const manifestPath = process.argv[2] ?? "manifest.json";
const schemaPath = process.argv[3] ?? "manifest.schema.json";
const schema = readJson(schemaPath);
const manifest = readJson(manifestPath);
const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);
if (!ajv.validate(schema, manifest)) {
  console.error(`::error::manifest validation failed for ${manifestPath}: ${ajv.errorsText(ajv.errors, { separator: "\n" })}`);
  process.exit(1);
}
console.log(`manifest schema valid: ${Object.keys(manifest.vendors).length} vendors`);
