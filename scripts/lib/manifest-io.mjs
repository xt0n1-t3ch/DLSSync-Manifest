import { readFileSync } from "node:fs";

export const readBytes = (path) => readFileSync(path);

export const readText = (path) => readFileSync(path, "utf8");

export const readJson = (path) => JSON.parse(readText(path));

// Errors surface as workflow annotations under Actions and as plain text locally.
export function fail(message) {
  console.error(process.env.GITHUB_ACTIONS === "true" ? `::error::${message}` : message);
  process.exit(1);
}
