import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

export function createValidator() {
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  addFormats(ajv);
  return ajv;
}

export function validateManifest(schema, manifest) {
  const ajv = createValidator();
  const valid = ajv.validate(schema, manifest);
  return {
    valid,
    errors: valid ? "" : ajv.errorsText(ajv.errors, { separator: "\n" }),
    vendorCount: Object.keys(manifest?.vendors ?? {}).length,
  };
}
