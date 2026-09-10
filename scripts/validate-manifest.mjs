import { readFileSync } from "node:fs";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { validateArchitecturePolicy } from "./architecture-policy.mjs";

const schema = JSON.parse(readFileSync("manifest.schema.json", "utf8"));
const manifest = JSON.parse(readFileSync("manifest.json", "utf8"));
const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);
if (!ajv.validate(schema, manifest)) {
  console.error(ajv.errorsText(ajv.errors, { separator: "\n" }));
  process.exit(1);
}
console.log(`manifest schema valid: ${Object.keys(manifest.vendors).length} vendors`);
validateArchitecturePolicy(manifest);
console.log("x64 architecture and archive identity policy valid");
