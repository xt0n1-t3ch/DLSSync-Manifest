import { readFileSync } from "node:fs";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { validateArchitecturePolicy } from "./architecture-policy.mjs";
import { validateArtifactPolicy } from "./artifact-policy.mjs";

const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);
const paths = process.argv.length > 2 ? process.argv.slice(2) : ["manifest.json", "manifest-v3.json"];
for (const path of paths) {
  const manifest = JSON.parse(readFileSync(path, "utf8"));
  const schemaName = manifest.schema_version === 3 ? "manifest-v3.schema.json" : "manifest.schema.json";
  const schema = JSON.parse(readFileSync(schemaName, "utf8"));
  if (!ajv.validate(schema, manifest)) {
    console.error(ajv.errorsText(ajv.errors, { separator: "\n" }));
    process.exit(1);
  }
  validateArchitecturePolicy(manifest);
  validateArtifactPolicy(manifest);
  console.log(`${path}: schema, x64 architecture, artifact identity and dependencies valid`);
}
