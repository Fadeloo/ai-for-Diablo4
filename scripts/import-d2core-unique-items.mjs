import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(new URL(".", import.meta.url).pathname, "..");
const outputPath = path.join(root, "data/equipment/community-unique-overrides.json");
const equipmentPath = path.join(root, "data/equipment/equipment-library.json");

const d2coreBuild = "71886";
const sourceId = "d2core_unique_item_database";
const sourcePageUrl = "https://www.d2core.com/d4/data/uniqueItem";
const dataUrls = {
  enUS: `https://cloudstorage.d2core.com/data/d4/${d2coreBuild}/uniqueItem_enUS.json?env=prod&v=9`,
  zhCN: `https://cloudstorage.d2core.com/data/d4/${d2coreBuild}/uniqueItem_zhCN.json?env=prod&v=9`
};

const manualAliases = new Map([
  ["baneofahjedden", "baneofahjadden"],
  ["mjolnicring", "mjolnicryng"]
]);

const slotByEquipType = {
  Amulet: "amulet",
  Axe: "mainHand",
  Boots: "boots",
  Bow: "twoHand",
  Chest: "chest",
  ChestArmor: "chest",
  Crossbow: "twoHand",
  Crossbow2H: "twoHand",
  Dagger: "mainHand",
  DruidOffhand: "offHand",
  Flail: "mainHand",
  Focus: "offHand",
  Glaive: "twoHand",
  Gloves: "gloves",
  Helm: "helm",
  Legs: "pants",
  Mace: "mainHand",
  Mace2H: "twoHand",
  Offhand: "offHand",
  Pants: "pants",
  Polearm: "twoHand",
  Quarterstaff: "twoHand",
  Ring: "ring",
  Scythe: "mainHand",
  Scythe2H: "twoHand",
  Shield: "offHand",
  Staff: "twoHand",
  Sword: "mainHand",
  Sword2H: "twoHand",
  Totem: "offHand",
  Wand: "mainHand",
  Axe2H: "twoHand",
  "Two-Handed Axe": "twoHand",
  "Two-Handed Mace": "twoHand",
  "Two-Handed Scythe": "twoHand",
  "Two-Handed Sword": "twoHand"
};

const zhSlotBySlot = {
  helm: "头盔",
  chest: "胸甲",
  gloves: "手套",
  pants: "裤子",
  boots: "靴子",
  amulet: "护符",
  ring: "戒指",
  twoHand: "双手武器",
  mainHand: "主手",
  offHand: "副手"
};

const dropBossLabels = {
  Andariel: "安达莉尔",
  Astaroth: "阿斯塔洛斯",
  "Beast in Ice": "冰中巨兽",
  Butcher: "屠夫",
  Duriel: "都瑞尔",
  Grigoire: "格里高列",
  "Harbinger of Hatred": "仇恨先驱",
  "Lord Zir": "齐尔领主",
  "The Infernal Hordes": "炼狱大军",
  Urivar: "乌瑞瓦",
  Varshan: "瓦尔申",
  WorldDrop: "世界掉落"
};

function normalizeName(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u00a0·・'’`\s:：,，\-—()（）【】]/g, "")
    .toLowerCase();
}

function cleanLine(value) {
  return String(value || "")
    .replace(/\{icon:bullet\}/g, "•")
    .replace(/\{\/?[a-z_]+(?::[^}]*)?\}/g, "")
    .replace(/\{\/c\}/g, "")
    .replace(/\s+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function splitAffixes(lines = []) {
  const cleaned = lines.map(cleanLine).filter(Boolean);
  const uniqueIndex = lines.findIndex((line) => /\{c_(unique|mythic)\}/.test(line));
  const index = uniqueIndex === -1 ? cleaned.length - 1 : uniqueIndex;
  return {
    fullAffixRanges: cleaned.slice(0, Math.max(0, index)),
    uniquePower: cleaned[index] || null
  };
}

function dropSource(dropBoss) {
  if (!dropBoss?.length) {
    return {
      status: "community_database_reference",
      zhText: "神话暗金：通常来自终局首领或稀有高阶掉落；暗黑核未列专属 Boss。"
    };
  }
  const labels = dropBoss.map((key) => dropBossLabels[key] || key);
  return {
    status: "community_database_reference",
    zhText: labels.length === 1 && labels[0] === "世界掉落"
      ? "世界掉落"
      : `掉落 Boss：${labels.join("、")}`,
    sourceKeys: dropBoss
  };
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.status}`);
  return response.json();
}

async function readCurrentEquipment() {
  const library = JSON.parse(await readFile(equipmentPath, "utf8"));
  return library.items || [];
}

const [equipment, enItems, zhItems] = await Promise.all([
  readCurrentEquipment(),
  fetchJson(dataUrls.enUS),
  fetchJson(dataUrls.zhCN)
]);

const enByName = new Map(enItems.map((item) => [normalizeName(item.name), item]));
const zhByKey = new Map(zhItems.map((item) => [item.key, item]));
const items = [];
const missing = [];

for (const item of equipment) {
  const normalized = normalizeName(item.name);
  const alias = manualAliases.get(normalized);
  const enItem = enByName.get(normalized) || (alias ? enByName.get(alias) : null);
  const zhItem = enItem ? zhByKey.get(enItem.key) : null;
  if (!enItem || !zhItem) {
    missing.push({ itemId: item.id, name: item.name, zhName: item.zhName });
    continue;
  }

  const slot = slotByEquipType[enItem.equipType] || null;
  const { fullAffixRanges, uniquePower } = splitAffixes(zhItem.affixesDesc);
  items.push({
    itemId: item.id,
    sourceItemKey: enItem.key,
    sourceItemId: enItem.id,
    sourceEnglishName: enItem.name,
    zhName: zhItem.name,
    isMythic: Boolean(enItem.isMythic),
    equipType: enItem.equipType,
    zhEquipType: zhItem.equipTypeName,
    verifiedSlot: slot,
    zhVerifiedSlot: zhSlotBySlot[slot] || zhItem.equipTypeName,
    fullAffixRanges,
    zhFullAffixRanges: fullAffixRanges,
    uniquePower,
    zhUniquePower: uniquePower || "暗金特效待来源回填",
    dropSource: dropSource(zhItem.dropBoss),
    baseText: cleanLine(zhItem.damage || zhItem.armor || zhItem.implict || ""),
    flavor: cleanLine(zhItem.flavor || ""),
    source: {
      sourceId,
      pageUrl: sourcePageUrl,
      dataUrl: dataUrls.zhCN,
      d2coreBuild,
      language: "zhCN",
      matchedBy: alias ? "manual_alias_to_source_english_name" : "source_english_name",
      sourceEnglishName: enItem.name,
      sourceChineseName: zhItem.name
    }
  });
}

const payload = {
  generatedAt: new Date().toISOString(),
  scope: "community_unique_item_overrides_from_d2core_database",
  source: {
    sourceId,
    url: sourcePageUrl,
    dataUrls,
    d2coreBuild,
    trustLevel: "needs_validation",
    usage: "community_unique_power_drop_source_slot_cross_check"
  },
  match: {
    equipmentCount: equipment.length,
    sourceEnglishCount: enItems.length,
    sourceChineseCount: zhItems.length,
    matchedCount: items.length,
    missingCount: missing.length,
    manualAliasCount: manualAliases.size,
    missing
  },
  items
};

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
console.log(`Wrote ${items.length} community unique overrides to ${path.relative(root, outputPath)}`);
if (missing.length) {
  console.log(`Missing ${missing.length}: ${missing.map((item) => item.name).join(", ")}`);
}
