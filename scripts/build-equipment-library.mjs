import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { zh } from "./lib/zh-localization.mjs";

const root = path.resolve(new URL(".", import.meta.url).pathname, "..");
const uniquePath = path.join(root, "data/generated/official-3.1.0-guaranteed-unique-affixes.json");
const taxonomyPath = path.join(root, "data/equipment/affix-taxonomy.json");
const iconIndexPath = path.join(root, "data/generated/d4builds-icon-index.json");
const output = path.join(root, "data/equipment/equipment-library.json");

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function classifyAffix(name, taxonomy) {
  const rule = taxonomy.rules.find((item) => {
    if (item.match && item.match === name) return true;
    if (item.matchPrefix && name.startsWith(item.matchPrefix)) return true;
    if (item.matchSuffix && name.endsWith(item.matchSuffix)) return true;
    return false;
  });
  return rule?.categoryId ?? "uncategorized";
}

function inferVisualType(item) {
  const text = `${item.name} ${item.guaranteedAffixes.map((affix) => affix.name).join(" ")}`.toLowerCase();
  if (text.includes("weapon damage") || /(sword|staff|dirk|cleaver|blade|spear|mace|glaive|reaver|hammer|wand|bow)/.test(text)) {
    return "weapon";
  }
  if (/(ring|talisman|amulet|signet|seal|band|loop|heart|idol|stone|eye)/.test(text)) {
    return "jewelry";
  }
  if (/(helm|crown|visage|gauntlet|grip|glove|pants|tassets|boots|greaves|sabatons|chest|mail|mantle|raiment|shroud|brand|cowl|bindings|carapace)/.test(text)) {
    return "armor";
  }
  return "utility";
}

const slotLabels = {
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

function hashText(value) {
  return [...String(value)].reduce((total, char) => (total * 31 + char.charCodeAt(0)) >>> 0, 7);
}

function parseGameVersion(source) {
  const versionLine = source?.versionLine || "";
  const monthMap = {
    January: "01",
    February: "02",
    March: "03",
    April: "04",
    May: "05",
    June: "06",
    July: "07",
    August: "08",
    September: "09",
    October: "10",
    November: "11",
    December: "12"
  };
  const match = versionLine.match(/^(.+?) Build #(\d+) \(All Platforms\)—([A-Za-z]+) (\d{1,2}), (\d{4})$/);
  if (!match) {
    return {
      patch: null,
      build: null,
      platforms: "All Platforms",
      releaseDate: null,
      asOf: "2026-06-28",
      sourceId: source?.id,
      sourceUrl: source?.url
    };
  }
  const [, patch, build, month, day, year] = match;
  return {
    patch,
    build,
    platforms: "All Platforms",
    releaseDate: `${year}-${monthMap[month] ?? month}-${day.padStart(2, "0")}`,
    asOf: "2026-06-28",
    sourceId: source.id,
    sourceUrl: source.url
  };
}

function inferItemSlots(item, zhName, visualType) {
  const text = `${item.id ?? ""} ${item.name} ${zhName}`.toLowerCase();
  const matches = new Set();
  if (/visage|crown|crest|helm|hood|mask|cowl|heir|head|tuskhelm|仪容|王冠|盔|冠|兜帽|面容/.test(text)) matches.add("helm");
  if (/armor|mail|raiment|plate|shroud|soulbrand|mantle|chest|robe|brand|faith|cuirass|甲|衣|胸|披肩|烙印|法衣|罩衣|信念|外壳/.test(text)) matches.add("chest");
  if (/glove|gauntlet|grip|fist|frostburn|hand|wrap|手套|握|拳|裹手/.test(text)) matches.add("gloves");
  if (/pants|tassets|will|temerity|breeches|leg|cuisses|kilt|裤|裙甲|意志|腿甲|褶裙/.test(text)) matches.add("pants");
  if (/boot|greave|step|wake|blessing|hoove|sabatons|shoe|步|靴|护胫|苏醒|祝福|踏沙/.test(text)) matches.add("boots");
  if (/amulet|talisman|medallion|heart|pendant|stone|idol|charm|护符|项链|融心|吊坠|神像|石/.test(text)) matches.add("amulet");
  if (/ring|signet|band|loop|seal|戒指|印戒|指环|戒环/.test(text)) matches.add("ring");
  if (/shield|focus|totem|idol|fetish|orb|catalyst|book|sigil|lamp|盾|法器|神像|符印|魔典/.test(text)) matches.add("offHand");
  if (/staff|spear|polearm|scythe|bow|crossbow|glaive|hammer|maul|grandfather|oath|fields|shattered|矛|杖|弓|弩|镰|锤|祖父|誓约/.test(text)) matches.add("twoHand");
  if (/sword|dirk|dagger|blade|cleaver|axe|mace|wand|sabre|knife|剑|匕|刃|斧|魔杖|砍斧/.test(text)) matches.add("mainHand");

  if (matches.size) return [...matches];
  if (visualType === "jewelry") return hashText(item.name) % 3 === 0 ? ["amulet"] : ["ring"];
  if (visualType === "armor" || visualType === "utility") {
    return [["helm"], ["chest"], ["gloves"], ["pants"], ["boots"]][hashText(item.name) % 5];
  }
  if (visualType === "weapon") {
    return [["twoHand"], ["mainHand"], ["offHand"]][hashText(item.name) % 3];
  }
  return [];
}

function modeFit(categories) {
  const score = {
    pit_push: 0,
    speed_farm: 0,
    daily: 0
  };
  for (const category of categories) {
    if (["weapon_damage", "all_damage_multiplier", "elemental_damage_multiplier", "critical_strike", "vulnerable", "overpower"].includes(category)) score.pit_push += 2;
    if (["attack_speed", "mobility", "cooldown_reduction", "resource", "lucky_hit"].includes(category)) score.speed_farm += 2;
    if (["survivability", "resource", "mobility", "skill_rank"].includes(category)) score.daily += 2;
  }
  return Object.entries(score)
    .sort((a, b) => b[1] - a[1])
    .map(([mode]) => mode);
}

function buildRole(categories) {
  if (categories.includes("weapon_damage") || categories.includes("all_damage_multiplier")) return "damage_core";
  if (categories.includes("survivability")) return "defense_core";
  if (categories.includes("resource") || categories.includes("cooldown_reduction")) return "rotation_core";
  if (categories.includes("mobility") || categories.includes("attack_speed")) return "farm_speed";
  return "specialized";
}

async function readOptionalJson(file) {
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch {
    return null;
  }
}

const uniqueData = JSON.parse(await readFile(uniquePath, "utf8"));
const taxonomy = JSON.parse(await readFile(taxonomyPath, "utf8"));
const iconIndex = await readOptionalJson(iconIndexPath);
const externalIcons = new Map((iconIndex?.items ?? []).map((item) => [item.name, item]));
const gameVersion = parseGameVersion(uniqueData.source);
const items = uniqueData.items.map((item) => {
  const zhName = zh.itemName(item.name);
  const guaranteedAffixes = item.guaranteedAffixes.map((affix) => ({
    ...affix,
    categoryId: classifyAffix(affix.name, taxonomy)
  }));
  const categories = [...new Set(guaranteedAffixes.map((affix) => affix.categoryId))];
  const visualType = inferVisualType(item);
  const slotCandidates = inferItemSlots(item, zhName, visualType);
  const zhSlotCandidates = slotCandidates.map((slot) => slotLabels[slot] || slot);
  const externalIcon = externalIcons.get(item.name);
  return {
    id: slugify(item.name),
    name: item.name,
    zhName,
    rarity: "unique",
    classRestriction: item.classRestriction,
    zhClassRestriction: zh.classRestriction(item.classRestriction),
    visualType,
    zhVisualType: zh.visualType(visualType),
    primarySlot: slotCandidates[0] || null,
    zhPrimarySlot: zhSlotCandidates[0] || "待回填",
    slotCandidates,
    zhSlotCandidates,
    image: `./public/assets/icon-${visualType}.png`,
    externalImage: externalIcon?.iconUrl ?? null,
    externalImageSource: externalIcon?.iconUrl ? iconIndex.source : null,
    externalImageMatchType: externalIcon?.matchType ?? "none",
    guaranteedAffixes,
    zhGuaranteedAffixes: guaranteedAffixes.map((affix) => zh.affix(affix.name)),
    fullAffixRanges: [],
    zhFullAffixRanges: [],
    uniquePower: null,
    zhUniquePower: "暗金特效待来源回填",
    dropSource: {
      status: "needs_source_backfill",
      zhText: "掉落来源待来源回填"
    },
    verifiedSlot: null,
    categories,
    buildRole: buildRole(categories),
    zhBuildRole: zh.buildRole(buildRole(categories)),
    modeFit: modeFit(categories),
    zhModeFit: modeFit(categories).map((mode) => zh.mode(mode)),
    source: {
      ...uniqueData.source,
      gameVersion
    },
    gameVersion,
    dataStatus: {
      guaranteedAffixes: "official_3_1_0_patch",
      fullAffixRanges: "needs_source_backfill",
      uniquePower: "needs_source_backfill",
      dropSource: "needs_source_backfill",
      verifiedSlot: "needs_source_backfill",
      slot: slotCandidates.length ? "inferred_from_name_and_visual_type" : "inferred_or_unknown",
      icon: externalIcon?.iconUrl ? "external_url_reference" : "local_generated_fallback"
    },
    notes: item.notes
  };
});

const payload = {
  generatedAt: new Date().toISOString(),
  source: uniqueData.source,
  gameVersion,
  scope: "equipment_library_seed_from_official_unique_guaranteed_affixes",
  coverage: {
    uniquePower: 0,
    fullAffixRanges: 0,
    verifiedSlot: 0,
    dropSource: 0,
    guaranteedAffixes: items.length
  },
  limitations: [
    "This is not the full Diablo IV equipment database.",
    "Official patch notes provide guaranteed affix names but not every roll range, item slot, image, or unique power.",
    "Visual type and slot candidates are inferred for UI grouping and must be replaced by verified item slot data.",
    "External icon URLs are referenced from a third-party community source and image files are not committed to this repository."
  ],
  itemCount: items.length,
  items
};

await mkdir(path.dirname(output), { recursive: true });
await writeFile(output, `${JSON.stringify(payload, null, 2)}\n`);
console.log(`Wrote ${items.length} equipment records to ${path.relative(root, output)}`);
