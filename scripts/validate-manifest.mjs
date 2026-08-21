import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { fail, readJson } from "./lib/manifest-io.mjs";

const schema = readJson("manifest.schema.json");
const manifest = readJson("manifest.json");
const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);
if (!ajv.validate(schema, manifest)) {
  fail(ajv.errorsText(ajv.errors, { separator: "\n" }));
}
console.log(`manifest schema valid: ${Object.keys(manifest.vendors).length} vendors`);
