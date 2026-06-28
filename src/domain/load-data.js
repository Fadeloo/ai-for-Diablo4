import { readFile } from "node:fs/promises";
import path from "node:path";

export async function readJson(projectRoot, relativePath) {
  const filePath = path.join(projectRoot, relativePath);
  const text = await readFile(filePath, "utf8");
  return JSON.parse(text);
}

export function projectRootFrom(importMetaUrl) {
  return path.resolve(new URL(".", importMetaUrl).pathname, "..");
}
