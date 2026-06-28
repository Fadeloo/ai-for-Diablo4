import { access, readdir } from "node:fs/promises";
import { constants } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";

const PROJECT_ROOT = path.resolve(new URL(".", import.meta.url).pathname, "..");
const REQUIRED_FILES = [
  "package.json",
  "index.html",
  "public/styles.css",
  "public/app.js",
  "public/assets/hero-sanctuary.png",
  "public/assets/icon-weapon.png",
  "public/assets/icon-armor.png",
  "public/assets/icon-jewelry.png",
  "public/assets/icon-utility.png",
  "data/metadata/version-baseline.json",
  "data/sources/source-registry.json",
  "data/classes/classes.json",
  "data/equipment/equipment-library.json",
  "data/generated/build-simulations.json",
  "src/damage/calculate.js",
  "scripts/build-equipment-library.mjs",
  "scripts/generate-build-simulations.mjs",
  "scripts/create-item-icons.mjs",
  "scripts/verify.mjs"
];

function commandVersion(command, args) {
  try {
    return execFileSync(command, args, { encoding: "utf8" }).trim();
  } catch {
    return "not available";
  }
}

async function exists(relativePath) {
  try {
    await access(path.join(PROJECT_ROOT, relativePath), constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

const entries = await readdir(PROJECT_ROOT);
const missing = [];
for (const file of REQUIRED_FILES) {
  if (!(await exists(file))) missing.push(file);
}

console.log(JSON.stringify(
  {
    projectRoot: PROJECT_ROOT,
    topLevelEntries: entries.sort(),
    tools: {
      node: commandVersion("node", ["--version"]),
      npm: commandVersion("npm", ["--version"]),
      git: commandVersion("git", ["--version"])
    },
    credentials: {
      required: [],
      present: []
    },
    requiredFilesMissing: missing
  },
  null,
  2
));

if (missing.length) {
  process.exitCode = 1;
}
