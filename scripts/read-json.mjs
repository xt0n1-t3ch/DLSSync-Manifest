import { readFileSync } from "node:fs";

function reportReadError(path, error) {
  const detail = error?.code === "ENOENT"
    ? "file not found"
    : `could not read file: ${error.message}`;
  console.error(`::error::${path}: ${detail}`);
  process.exit(1);
}

export function readFile(path, encoding) {
  try {
    return readFileSync(path, encoding);
  } catch (error) {
    reportReadError(path, error);
  }
}

export function readJson(path) {
  const contents = readFile(path, "utf8");
  try {
    return JSON.parse(contents);
  } catch (error) {
    console.error(`::error::${path}: malformed JSON: ${error.message}`);
    process.exit(1);
  }
}
