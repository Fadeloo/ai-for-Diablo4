import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(new URL(".", import.meta.url).pathname, "..");
const registryPath = path.join(root, "data/aspects/community-aspect-overrides.json");
const outputPath = path.join(root, "data/aspects/d2core-aspect-library.json");

function cleanEffect(value) {
  return String(value || "")
    .replace(/\{icon:bullet\}/g, "• ")
    .replace(/\{\/?u\}/g, "")
    .replace(/\{\/?c(?:_[a-z]+)?\}/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function allowedSlotsForType(typeName) {
  const map = {
    "攻击": ["手套", "护符", "戒指", "武器"],
    "防御": ["头盔", "胸甲", "裤子", "护符"],
    "资源": ["戒指"],
    "机动": ["靴子", "护符"],
    "通用": ["头盔", "胸甲", "手套", "靴子", "护符"]
  };
  return map[typeName] || [];
}

const registry = JSON.parse(await readFile(registryPath, "utf8"));
const url = registry.source?.dataUrls?.zhCN;
if (!url) throw new Error("Missing D2Core zhCN aspect data URL");

const response = await fetch(url);
if (!response.ok) throw new Error(`Failed to fetch D2Core aspect data: ${response.status} ${response.statusText}`);
const rawItems = await response.json();
if (!Array.isArray(rawItems)) throw new Error("D2Core aspect payload must be an array");

const items = rawItems
  .filter((item) => item.name && item.affixesDesc)
  .map((item) => ({
    aspectId: `d2core-${item.id}`,
    sourceItemKey: item.key,
    sourceItemId: item.id,
    zhName: item.name,
    zhEffect: cleanEffect(item.affixesDesc),
    aspectType: item.aspectType,
    zhAspectType: item.aspectTypeName || "类型待回填",
    sourceClasses: item.char || [],
    zhClassName: item.charName || "",
    zhAllowedSlots: allowedSlotsForType(item.aspectTypeName),
    iconUrl: item.icon ? `https://cloudstorage.d2core.com/data_img/d4/aspect/${item.icon}.webp` : null,
    source: {
      sourceId: registry.source.sourceId,
      pageUrl: registry.source.url,
      dataUrl: url,
      d2coreBuild: registry.source.d2coreBuild,
      language: "zhCN",
      sourceChineseName: item.name
    }
  }))
  .sort((a, b) => a.zhName.localeCompare(b.zhName, "zh-CN"));

const payload = {
  generatedAt: new Date().toISOString(),
  scope: "d2core_full_aspect_library_snapshot",
  source: registry.source,
  itemCount: items.length,
  items
};

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
console.log(`Wrote ${items.length} D2Core aspects to ${path.relative(root, outputPath)}`);
