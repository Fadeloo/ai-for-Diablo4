import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(new URL(".", import.meta.url).pathname, "..");
const output = path.join(root, "data/generated/aspect-index.json");
const communityOverridePath = path.join(root, "data/aspects/community-aspect-overrides.json");

const ignoredAspectNames = new Set(["暗金特效位", "神话暗金位", "空槽说明", "空槽位"]);

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(root, relativePath), "utf8"));
}

async function readOptionalJson(relativePath) {
  try {
    return await readJson(relativePath);
  } catch {
    return null;
  }
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
const communityOverrides = await readOptionalJson("data/aspects/community-aspect-overrides.json");
const builds = buildGuides.builds || [];
const slotOrder = buildGuides.slotOrder || [];
const slotNameById = new Map(slotOrder.map((slot) => [slot.id, slot.zhName]));
const communityByAspectId = new Map((communityOverrides?.items || []).map((item) => [item.aspectId, item]));
const communityByAspectName = new Map((communityOverrides?.items || []).map((item) => [item.aspectName, item]));
const rowsByName = new Map();

for (const guide of builds) {
  for (const slot of guide.gearSlots || []) {
    const name = slot.aspect?.name;
    if (slot.aspect?.displayKind && slot.aspect.displayKind !== "legendary_aspect") continue;
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
    const id = aspectId(name);
    const community = communityByAspectId.get(id) || communityByAspectName.get(name) || null;
    return {
      id,
      name,
      canonicalName: community?.zhName || name,
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
      database: community ? {
        sourceId: community.source.sourceId,
        sourceName: community.source.sourceChineseName,
        sourceEnglishName: community.source.sourceEnglishName,
        pageUrl: community.source.pageUrl,
        dataUrl: community.source.dataUrl,
        d2coreBuild: community.source.d2coreBuild,
        zhAspectType: community.zhAspectType,
        aspectType: community.aspectType,
        zhEffect: community.zhEffect,
        zhAllowedSlots: community.zhAllowedSlots,
        iconUrl: community.iconUrl,
        matchedBy: community.source.matchedBy
      } : null,
      dataStatus: {
        scope: community ? "community_database_reference" : "derived_from_build_gear_slots",
        zhText: community
          ? "威能效果、类型和可用部位来自暗黑核社区数据库；关联 BD 来自本站结构化 BD。"
          : "从已结构化 BD 装备槽位汇总，不是官方全量威能库。"
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
  communityCoverage: communityOverrides ? {
    sourceId: communityOverrides.source.sourceId,
    sourceUrl: communityOverrides.source.url,
    matchedCount: communityOverrides.match.matchedCount,
    missingCount: communityOverrides.match.missingCount,
    ambiguousCount: communityOverrides.match.ambiguousCount,
    sourceChineseCount: communityOverrides.match.sourceChineseCount,
    d2coreBuild: communityOverrides.source.d2coreBuild,
    generatedAt: communityOverrides.generatedAt
  } : null,
  aspectCount: aspects.length,
  usageCount: aspects.reduce((total, aspect) => total + aspect.usageCount, 0),
  limitations: [
    "This is not the full official Diablo IV legendary aspect database.",
    "Only aspects already present in structured BD gear slots are indexed.",
    "Matched aspect effects are attributed to a community database.",
    "Template-generated or ambiguous aspect names remain marked through sourceLevels and sourceStatusSamples."
  ],
  zhLimitations: [
    "这不是官方全量传奇威能库。",
    "这里只汇总已结构化 BD 装备槽位里出现的威能。",
    "已匹配的威能效果标注为社区数据库参考。",
    "模板生成或歧义威能名称仍通过来源状态标注，不能当作官方事实。"
  ],
  aspects
};

await mkdir(path.dirname(output), { recursive: true });
await writeFile(output, `${JSON.stringify(payload, null, 2)}\n`);
console.log(`Wrote ${aspects.length} aspects to ${path.relative(root, output)}`);
