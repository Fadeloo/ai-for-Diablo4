import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const PROJECT_ROOT = path.resolve(new URL(".", import.meta.url).pathname, "..");
const PATCH_URL = "https://news.blizzard.com/en-us/article/24287406/diablo-iv-patch-notes";
const OUTPUT = path.join(PROJECT_ROOT, "data/generated/official-3.1.0-guaranteed-unique-affixes.json");
const CLASS_NAMES = new Set([
  "All Classes",
  "Barbarian",
  "Druid",
  "Necromancer",
  "Paladin",
  "Rogue",
  "Sorceress",
  "Spiritborn",
  "Warlock"
]);

function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, "\n")
    .replace(/&nbsp;/g, " ")
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, "&")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function parseGuaranteedAffix(line) {
  const match = line.match(/^(?:G|g)?uaranteed Affix(?:es)?\s+([0-9-]+):\s+(.+)$/);
  if (!match) return null;
  const slotToken = match[1];
  const slots = slotToken.includes("-")
    ? (() => {
        const [from, to] = slotToken.split("-").map(Number);
        return Array.from({ length: to - from + 1 }, (_, index) => from + index);
      })()
    : [Number(slotToken)];
  return {
    slots,
    name: match[2]
  };
}

function parseItems(lines) {
  const start = lines.indexOf("All Classes");
  const end = lines.indexOf("Balance Updates");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Could not locate guaranteed unique affix section");
  }

  const items = [];
  let currentClass = "All Classes";
  let currentItem = null;
  const segment = lines.slice(start, end);

  for (let i = 0; i < segment.length; i += 1) {
    const line = segment[i];
    if (CLASS_NAMES.has(line)) {
      currentClass = line === "Sorceress" ? "Sorcerer" : line;
      currentItem = null;
      continue;
    }

    const affix = parseGuaranteedAffix(line);
    if (affix && currentItem) {
      currentItem.guaranteedAffixes.push(affix);
      continue;
    }

    const nextIsAffix = parseGuaranteedAffix(segment[i + 1] ?? "");
    if (nextIsAffix) {
      currentItem = {
        name: line,
        classRestriction: currentClass,
        guaranteedAffixes: [],
        notes: []
      };
      items.push(currentItem);
      continue;
    }

    if (currentItem) {
      currentItem.notes.push(line);
    }
  }

  return items;
}

async function main() {
  const response = await fetch(PATCH_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${PATCH_URL}: ${response.status}`);
  }
  const html = await response.text();
  const lines = stripHtml(html);
  const versionLine = lines.find((line) => line.includes("3.1.0 Build #72578"));
  const items = parseItems(lines);

  const payload = {
    generatedAt: new Date().toISOString(),
    source: {
      id: "blizzard_patch_3_1",
      url: PATCH_URL,
      versionLine
    },
    scope: "official_3_1_0_new_guaranteed_unique_affixes",
    itemCount: items.length,
    items
  };

  await mkdir(path.dirname(OUTPUT), { recursive: true });
  await writeFile(OUTPUT, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(`Wrote ${items.length} items to ${path.relative(PROJECT_ROOT, OUTPUT)}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
