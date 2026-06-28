import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(new URL(".", import.meta.url).pathname, "..");
const output = path.join(root, "data/generated/aspect-index.json");

const ignoredAspectNames = new Set(["暗金特效位", "神话暗金位", "空槽说明", "空槽位"]);

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(root, relativePath), "utf8"));
}

function hashText(value) {
  return [...String(value)].reduce((total, char) => (total * 31 + char.charCodeAt(0)) >>> 0, 7);
}

function aspectId(name) {
  return `aspect-${hashText(name).toString(36)}`;
}

function countBy(items, getKey) {
  return items.reduce((counts, item) => {
    const key = getKey(item) || "unknown";
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
}

function sortedUnique(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b), "zh-CN"));
}

const buildGuides = await readJson("data/generated/build-guides.json");
const builds = buildGuides.builds || [];
const slotOrder = buildGuides.slotOrder || [];
const slotNameById = new Map(slotOrder.map((slot) => [slot.id, slot.zhName]));
const rowsByName = new Map();

for (const guide of builds) {
  for (const slot of guide.gearSlots || []) {
    const name = slot.aspect?.name;
    if (!name || ignoredAspectNames.has(name)) continue;
    const usage = {
      guideId: guide.id,
      guideTitle: guide.title,
      seasonId: guide.taxonomy.seasonId,
      seasonName: guide.taxonomy.seasonName,
      classId: guide.taxonomy.classId,
      className: guide.taxonomy.className,
      archetypeId: guide.taxonomy.archetypeId,
      archetypeName: guide.taxonomy.archetypeName,
      mode: guide.taxonomy.mode,
      modeName: guide.taxonomy.modeName,
      sourceLevel: guide.source.verificationLevel,
      slotId: slot.slotId,
      zhSlotName: slot.zhSlotName,
      targetName: slot.target?.zhName,
      targetType: slot.target?.type,
      role: slot.aspect?.role,
      sourceStatus: slot.aspect?.sourceStatus || slot.dataStatus || "来源状态待回填",
      core: Boolean(slot.core),
      required: Boolean(slot.required),
      replaceable: Boolean(slot.replaceable)
    };
    if (!rowsByName.has(name)) rowsByName.set(name, []);
    rowsByName.get(name).push(usage);
  }
}

const aspects = [...rowsByName.entries()]
  .map(([name, uses]) => {
    const slotCounts = countBy(uses, (usage) => usage.slotId);
    const slotUsage = Object.entries(slotCounts)
      .map(([slotId, count]) => {
        const slotUses = uses.filter((usage) => usage.slotId === slotId);
        return {
          slotId,
          zhSlotName: slotNameById.get(slotId) || slotUses[0]?.zhSlotName || slotId,
          count,
          coreCount: slotUses.filter((usage) => usage.core).length,
          requiredCount: slotUses.filter((usage) => usage.required).length,
          replaceableCount: slotUses.filter((usage) => usage.replaceable).length
        };
      })
      .sort((a, b) => b.count - a.count || a.zhSlotName.localeCompare(b.zhSlotName, "zh-CN"));
    const guideIds = sortedUnique(uses.map((usage) => usage.guideId));
    return {
      id: aspectId(name),
      name,
      usageCount: uses.length,
      guideCount: guideIds.length,
      classIds: sortedUnique(uses.map((usage) => usage.classId)),
      zhClasses: sortedUnique(uses.map((usage) => usage.className)),
      modes: sortedUnique(uses.map((usage) => usage.mode)),
      zhModes: sortedUnique(uses.map((usage) => usage.modeName)),
      seasons: sortedUnique(uses.map((usage) => usage.seasonId)),
      zhSeasons: sortedUnique(uses.map((usage) => usage.seasonName)),
      sourceLevels: countBy(uses, (usage) => usage.sourceLevel),
      slotUsage,
      sourceStatusSamples: sortedUnique(uses.map((usage) => usage.sourceStatus)).slice(0, 8),
      dataStatus: {
        scope: "derived_from_build_gear_slots",
        zhText: "从已结构化 BD 装备槽位汇总，不是官方全量威能库。"
      },
      buildUses: uses
        .sort((a, b) => {
          const sourceRank = { community_reference: 0, cross_season_reference: 1, official_seed_template: 2, projection_template: 3 };
          return (sourceRank[a.sourceLevel] ?? 4) - (sourceRank[b.sourceLevel] ?? 4)
            || a.className.localeCompare(b.className, "zh-CN")
            || a.modeName.localeCompare(b.modeName, "zh-CN")
            || a.guideTitle.localeCompare(b.guideTitle, "zh-CN");
        })
    };
  })
  .sort((a, b) => b.guideCount - a.guideCount || b.usageCount - a.usageCount || a.name.localeCompare(b.name, "zh-CN"));

const payload = {
  generatedAt: buildGuides.generatedAt || new Date().toISOString(),
  scope: "aspect_index_derived_from_structured_build_guides",
  asOf: buildGuides.asOf,
  sourceFile: "data/generated/build-guides.json",
  aspectCount: aspects.length,
  usageCount: aspects.reduce((total, aspect) => total + aspect.usageCount, 0),
  ignoredNames: [...ignoredAspectNames],
  limitations: [
    "This is not the full official Diablo IV legendary aspect database.",
    "Only aspects already present in structured BD gear slots are indexed.",
    "Template-generated aspect names remain marked through sourceLevels and sourceStatusSamples."
  ],
  zhLimitations: [
    "这不是官方全量传奇威能库。",
    "这里只汇总已结构化 BD 装备槽位里出现的威能。",
    "模板生成的威能名称仍通过来源状态标注，不能当作官方事实。"
  ],
  aspects
};

await mkdir(path.dirname(output), { recursive: true });
await writeFile(output, `${JSON.stringify(payload, null, 2)}\n`);
console.log(`Wrote ${aspects.length} aspects to ${path.relative(root, output)}`);
