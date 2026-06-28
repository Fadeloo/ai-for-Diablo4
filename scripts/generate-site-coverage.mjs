import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(new URL(".", import.meta.url).pathname, "..");
const output = path.join(root, "data/generated/site-coverage.json");

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(root, relativePath), "utf8"));
}

function countBy(items, getKey) {
  return items.reduce((counts, item) => {
    const key = getKey(item) || "unknown";
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
}

const [classes, equipment, buildGuides, aspectIndex, sources] = await Promise.all([
  readJson("data/classes/classes.json"),
  readJson("data/equipment/equipment-library.json"),
  readJson("data/generated/build-guides.json"),
  readJson("data/generated/aspect-index.json"),
  readJson("data/sources/source-registry.json")
]);

const builds = buildGuides.builds || [];
const seasons = buildGuides.seasons || [];
const sourceCounts = countBy(builds, (guide) => guide.source?.verificationLevel);
const equipmentStatusCounts = {
  uniquePower: countBy(equipment.items, (item) => item.dataStatus?.uniquePower),
  fullAffixRanges: countBy(equipment.items, (item) => item.dataStatus?.fullAffixRanges),
  dropSource: countBy(equipment.items, (item) => item.dataStatus?.dropSource),
  verifiedSlot: countBy(equipment.items, (item) => item.dataStatus?.verifiedSlot),
  slot: countBy(equipment.items, (item) => item.dataStatus?.slot)
};

const classMatrix = seasons.map((season) => ({
  seasonId: season.id,
  zhLabel: season.zhLabel,
  classes: classes.map((classInfo) => {
    const classBuilds = builds.filter((guide) => guide.taxonomy.seasonId === season.id && guide.taxonomy.classId === classInfo.id);
    const archetypes = [...new Set(classBuilds.map((guide) => guide.taxonomy.archetypeName))];
    const communityCount = classBuilds.filter((guide) => guide.source?.references?.length).length;
    return {
      classId: classInfo.id,
      zhName: classInfo.zhName,
      buildCount: classBuilds.length,
      archetypeCount: archetypes.length,
      communityReferenceCount: communityCount,
      templateCount: classBuilds.length - communityCount,
      modes: countBy(classBuilds, (guide) => guide.taxonomy.mode)
    };
  })
}));

const payload = {
  generatedAt: buildGuides.generatedAt || new Date().toISOString(),
  scope: "player_site_data_coverage_and_storage_usage",
  asOf: buildGuides.asOf,
  storageLayers: [
    {
      id: "source_registry",
      zhName: "来源登记层",
      files: ["data/sources/source-registry.json"],
      frontendUse: "来源页展示可信度；导入脚本只引用已登记来源。"
    },
    {
      id: "equipment_library",
      zhName: "装备资料层",
      files: ["data/equipment/equipment-library.json"],
      frontendUse: "装备库、装备详情页和 BD 装备槽位链接。"
    },
    {
      id: "build_guides",
      zhName: "BD 档案层",
      files: ["data/generated/build-guides.json", "data/builds/community-build-overrides.json"],
      frontendUse: "BD 大厅、BD 详情、职业入口和装备相关 BD。"
    },
    {
      id: "aspect_index",
      zhName: "威能索引层",
      files: ["data/generated/aspect-index.json"],
      frontendUse: "威能索引页展示威能槽位、核心度和相关 BD。"
    },
    {
      id: "forecast_matrix",
      zhName: "预测矩阵层",
      files: ["data/generated/build-simulations.json"],
      frontendUse: "150 层参考页；不得作为已验证榜单展示。"
    }
  ],
  buildCoverage: {
    total: builds.length,
    seasons: seasons.length,
    classes: classes.length,
    byVerificationLevel: sourceCounts,
    communityReferenceCount: (sourceCounts.community_reference || 0) + (sourceCounts.cross_season_reference || 0),
    templateCount: (sourceCounts.official_seed_template || 0) + (sourceCounts.projection_template || 0),
    classMatrix
  },
  equipmentCoverage: {
    total: equipment.items.length,
    scope: equipment.scope,
    coverage: equipment.coverage,
    statusCounts: equipmentStatusCounts,
    limitations: equipment.limitations
  },
  aspectCoverage: {
    total: aspectIndex.aspects.length,
    usageCount: aspectIndex.usageCount,
    scope: aspectIndex.scope,
    limitations: aspectIndex.zhLimitations || aspectIndex.limitations,
    sourceLevels: countBy(aspectIndex.aspects, (aspect) => {
      if (aspect.sourceLevels.community_reference) return "community_reference";
      if (aspect.sourceLevels.cross_season_reference) return "cross_season_reference";
      if (aspect.sourceLevels.official_seed_template) return "official_seed_template";
      return "projection_template";
    })
  },
  sourceCoverage: {
    total: sources.length,
    byTrustLevel: countBy(sources, (source) => source.trustLevel),
    byCategory: countBy(sources, (source) => source.category)
  },
  playerFacingRules: [
    "社区来源 BD 可以展示为参考，模板 BD 必须标为模板或推演。",
    "装备库当前只声明唯一装备固定词缀种子，不声明为全量装备库。",
    "暗金特效、完整词缀范围、掉落来源和官方槽位未回填时必须显示字段状态。",
    "预测速度不能写成真实天梯结果。"
  ]
};

await mkdir(path.dirname(output), { recursive: true });
await writeFile(output, `${JSON.stringify(payload, null, 2)}\n`);
console.log(`Wrote site coverage to ${path.relative(root, output)}`);
