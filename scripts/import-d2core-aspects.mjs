import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(new URL(".", import.meta.url).pathname, "..");
const aspectIndexPath = path.join(root, "data/generated/aspect-index.json");
const outputPath = path.join(root, "data/aspects/community-aspect-overrides.json");

const d2coreBuild = "71886";
const sourceId = "d2core_aspect_database";
const sourcePageUrl = "https://www.d2core.com/d4/data/legendary";
const dataUrls = {
  enUS: `https://cloudstorage.d2core.com/data/d4/${d2coreBuild}/aspect_enUS.json?env=prod&v=9`,
  zhCN: `https://cloudstorage.d2core.com/data/d4/${d2coreBuild}/aspect_zhCN.json?env=prod&v=9`
};

const aspectSlotLabels = {
  Defensive: ["头盔", "胸甲", "裤子", "护符"],
  Offensive: ["手套", "护符", "戒指", "武器"],
  Resource: ["戒指"],
  Utility: ["头盔", "胸甲", "手套", "靴子", "护符"],
  Mobility: ["靴子", "护符"]
};

function normalizeAspectName(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[之的·・'’`\s:：,，\-—()（）【】]/g, "")
    .toLowerCase();
}

function cleanLine(value) {
  return String(value || "")
    .replace(/\{icon:bullet\}/g, "•")
    .replace(/\{\/?[a-z_]+(?::[^}]*)?\}/g, "")
    .replace(/\{\/c\}/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/\s+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.status}`);
  return response.json();
}

const [aspectIndex, enItems, zhItems] = await Promise.all([
  JSON.parse(await readFile(aspectIndexPath, "utf8")),
  fetchJson(dataUrls.enUS),
  fetchJson(dataUrls.zhCN)
]);

const zhByKey = new Map(zhItems.map((item) => [item.key, item]));
const enByKey = new Map(enItems.map((item) => [item.key, item]));
const zhByNormalizedName = new Map();
for (const item of zhItems) {
  const key = normalizeAspectName(item.name);
  if (!zhByNormalizedName.has(key)) zhByNormalizedName.set(key, []);
  zhByNormalizedName.get(key).push(item);
}

const items = [];
const missing = [];
const ambiguous = [];

for (const aspect of aspectIndex.aspects || []) {
  const hits = zhByNormalizedName.get(normalizeAspectName(aspect.name)) || [];
  if (hits.length !== 1) {
    const target = {
      aspectId: aspect.id,
      aspectName: aspect.name,
      guideCount: aspect.guideCount,
      usageCount: aspect.usageCount
    };
    if (hits.length > 1) ambiguous.push({ ...target, candidates: hits.map((item) => item.name) });
    else missing.push(target);
    continue;
  }

  const zhItem = hits[0];
  const enItem = enByKey.get(zhItem.key);
  items.push({
    aspectId: aspect.id,
    aspectName: aspect.name,
    sourceItemKey: zhItem.key,
    sourceItemId: zhItem.id,
    sourceEnglishName: enItem?.name || null,
    zhName: zhItem.name,
    aspectType: zhItem.aspectType,
    zhAspectType: zhItem.aspectTypeName,
    sourceClasses: zhItem.char || [],
    zhClassName: zhItem.charName || "全职业",
    zhEffect: cleanLine(zhItem.affixesDesc),
    enEffect: cleanLine(enItem?.affixesDesc || ""),
    zhAllowedSlots: aspectSlotLabels[zhItem.aspectType] || [],
    iconUrl: zhItem.icon ? `https://cloudstorage.d2core.com/data_img/d4/aspect/${zhItem.icon}.webp` : null,
    source: {
      sourceId,
      pageUrl: sourcePageUrl,
      dataUrl: dataUrls.zhCN,
      d2coreBuild,
      language: "zhCN",
      matchedBy: "normalized_chinese_name",
      sourceChineseName: zhItem.name,
      sourceEnglishName: enItem?.name || null
    }
  });
}

const payload = {
  generatedAt: new Date().toISOString(),
  scope: "community_aspect_overrides_from_d2core_database",
  source: {
    sourceId,
    url: sourcePageUrl,
    dataUrls,
    d2coreBuild,
    trustLevel: "needs_validation",
    usage: "community_aspect_effect_type_slot_cross_check"
  },
  match: {
    aspectIndexCount: aspectIndex.aspects?.length || 0,
    sourceEnglishCount: enItems.length,
    sourceChineseCount: zhItems.length,
    matchedCount: items.length,
    missingCount: missing.length,
    ambiguousCount: ambiguous.length,
    missing,
    ambiguous
  },
  items
};

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
console.log(`Wrote ${items.length} community aspect overrides to ${path.relative(root, outputPath)}`);
console.log(`Missing ${missing.length}, ambiguous ${ambiguous.length}`);
