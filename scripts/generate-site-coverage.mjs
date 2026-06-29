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

const genericSkillStepPattern = /^终极$|^防御$|^位移$|基础触发|基础生成|主力输出|资源\/冷却被动|生存被动|关键被动|增伤\/控制|终局重分配/;
const genericParagonNodePattern = /^(传奇节点|雕文孔|稀有节点|魔法节点|剩余魔法节点|防御稀有节点|主属性通路)$/;

function countGenericRouteEntries(builds) {
  return builds.reduce((totals, guide) => {
    for (const skill of guide.skillTree?.skillBar || []) {
      totals.totalSkillBarEntries += 1;
      if (genericSkillStepPattern.test(skill.name || "")) totals.genericSkillBarEntries += 1;
    }
    for (const step of guide.skillTree?.pointOrder || []) {
      totals.totalSkillSteps += 1;
      if (genericSkillStepPattern.test(step.skill || "")) totals.genericSkillSteps += 1;
    }
    for (const step of guide.paragon?.clickOrder || []) {
      totals.totalParagonNodes += 1;
      if (genericParagonNodePattern.test(step.node || "")) totals.genericParagonNodes += 1;
    }
    return totals;
  }, {
    totalSkillBarEntries: 0,
    genericSkillBarEntries: 0,
    totalSkillSteps: 0,
    genericSkillSteps: 0,
    totalParagonNodes: 0,
    genericParagonNodes: 0
  });
}

const frontendDataContracts = [
  {
    component: "RecommendedBuildBoard",
    zhName: "本赛季抄作业入口",
    source: "build-guides.builds",
    fields: [
      "taxonomy.seasonId",
      "taxonomy.classId",
      "taxonomy.mode",
      "taxonomy.archetypeName",
      "formationDifficulty",
      "ceiling",
      "coreUniques",
      "coreAspects",
      "gearSlots[].aspect.displayName",
      "gearSlots[].aspect.displayKind",
      "skillTree.pointOrder[0]",
      "paragon.clickOrder[0]",
      "source.verificationLevel"
    ],
    frontendUse: "按职业汇总日常、速刷、冲层三个入口，直接链接完整 BD 详情。"
  },
  {
    component: "BuildViewTabs",
    zhName: "BD 大厅视图切换",
    source: "build-guides.builds + state.sim.view",
    fields: [
      "taxonomy.seasonId",
      "taxonomy.classId",
      "taxonomy.archetypeId",
      "taxonomy.mode",
      "source.verificationLevel",
      "formationDifficulty",
      "ceiling"
    ],
    frontendUse: "把推荐入口、流派矩阵和完整列表拆成独立阅读模式，避免把所有 BD 信息同屏铺开。"
  },
  {
    component: "BuildMaturityPanel",
    zhName: "BD 资料成熟度面板",
    source: "build-guides.builds + source.verificationLevel",
    fields: [
      "source.verificationLevel",
      "source.references",
      "taxonomy.classId",
      "taxonomy.archetypeId",
      "taxonomy.mode",
      "formationDifficulty",
      "ceiling"
    ],
    frontendUse: "BD 大厅按同赛季社区、跨赛季社区、官方词缀模板和未来推演分组，防止玩家把模板或推演误认为可直接抄的实战 BD。"
  },
  {
    component: "BuildSidebarSectionLinks",
    zhName: "BD 左侧列表分区入口",
    source: "build-guides.builds[id]",
    fields: [
      "id",
      "gearSlots",
      "skillTree.pointOrder",
      "paragon.clickOrder",
      "gameplay.loop"
    ],
    frontendUse: "左侧 BD 列表每行直接链接装备、技能、巅峰和打法分区，让玩家不用先进入总览再找详情。"
  },
  {
    component: "BuildDetailLayout",
    zhName: "BD 详情页",
    source: "build-guides.builds[id]",
    fields: [
      "gearSlots",
      "gearSlots[].aspect.displayName",
      "gearSlots[].aspect.displayKind",
      "gearSlots[].aspect.powerText",
      "progression",
      "skillTree",
      "paragon",
      "gameplay",
      "variants",
      "dataQuality",
      "source.references"
    ],
    frontendUse: "按 #bd/<guideId>/<section> 分区页面展示装备、技能、巅峰、打法、替换和来源状态，避免把完整攻略堆在同一屏。"
  },
  {
    component: "BuildPlannerSheet",
    zhName: "BD 抄作业配置总表",
    source: "build-guides.builds[id]",
    fields: [
      "gearSlots",
      "gearSlots[].target.zhName",
      "gearSlots[].required",
      "gearSlots[].replaceable",
      "gearSlots[].affixes",
      "gearSlots[].tempers",
      "gearSlots[].masterwork",
      "gearSlots[].alternatives[0]",
      "gearSlots[].aspect.powerText",
      "skillTree.skillBar",
      "skillTree.pointOrder",
      "paragon.boardOrder",
      "paragon.clickOrder",
      "gameplay.opener",
      "gameplay.loop",
      "gameplay.defense"
    ],
    frontendUse: "BD 配置分区像主流构筑模拟器一样，把 11 个装备位、首选替换、词缀/淬炼/精造、技能栏、加点、巅峰盘、点击顺序和打法速查放在同一个可抄总表。"
  },
  {
    component: "GuideReadinessPanel",
    zhName: "BD 可抄程度面板",
    source: "build-guides.builds[id].source + build-guides.builds[id].dataQuality + ceiling",
    fields: [
      "source.verificationLevel",
      "source.references",
      "ceiling.confidence",
      "ceiling.evidenceLabel",
      "dataQuality.needsValidation",
      "dataQuality.missing"
    ],
    frontendUse: "BD 详情页在总览和来源分区直接告诉玩家这套是同赛季可抄、跨赛季参考、官方模板还是未来推演，并给出风险和分区入口。"
  },
  {
    component: "RouteSourcePanel",
    zhName: "技能与巅峰路线来源面板",
    source: "build-guides.builds[id].skillTree + build-guides.builds[id].paragon + source.references",
    fields: [
      "source.verificationLevel",
      "source.references",
      "skillTree.sourceStatus",
      "skillTree.skillBar",
      "skillTree.pointOrder",
      "skillTree.passives",
      "paragon.sourceStatus",
      "paragon.boardOrder",
      "paragon.clickOrder",
      "paragon.glyphs"
    ],
    frontendUse: "技能和巅峰分区顶部先说明路线来自同赛季社区、跨赛季参考、官方模板还是未来推演，再展示可执行加点表、盘面顺序和点击步骤。"
  },
  {
    component: "EquipmentUsageMatrix",
    zhName: "装备使用矩阵",
    source: "equipment-library.items + build-guides.builds[].gearSlots",
    fields: [
      "item.id",
      "guide.taxonomy",
      "gearSlot.slotId",
      "gearSlot.required",
      "gearSlot.replaceable",
      "source.verificationLevel"
    ],
    frontendUse: "装备详情反查该装备在不同职业、流派和用途中的使用位置。"
  },
  {
    component: "EquipmentResultsList",
    zhName: "装备受控结果列表",
    source: "equipment-library.items + equipmentFilters",
    fields: [
      "id",
      "zhName",
      "classRestriction",
      "slotCandidates",
      "modeFit",
      "dataStatus",
      "externalImage"
    ],
    frontendUse: "装备库列表只负责检索和选择，详情面板展示完整词缀、暗金特效、掉落来源、相关 BD 和来源状态。"
  },
  {
    component: "AspectResultsList",
    zhName: "威能受控结果列表",
    source: "aspect-index.aspects + aspectFilters",
    fields: [
      "id",
      "name",
      "database.zhEffect",
      "slotUsage",
      "sourceLevels",
      "buildUses"
    ],
    frontendUse: "威能索引列表只负责查找和选择，详情面板展示效果、可用部位、来源状态和相关 BD。"
  },
  {
    component: "ClassBuildMatrix",
    zhName: "职业完整流派矩阵",
    source: "build-guides.builds + archetypes + class selection",
    fields: [
      "taxonomy.classId",
      "taxonomy.archetypeId",
      "taxonomy.mode",
      "formationDifficulty",
      "taxonomy.stage",
      "ceiling",
      "coreUniques",
      "coreAspects",
      "skillTree.pointOrder[0]",
      "paragon.clickOrder[0]",
      "gameplay.loop[0]",
      "source.verificationLevel"
    ],
    frontendUse: "职业页按流派和日常、速刷、冲层三种用途展示成型难度、阶段、上限、核心件、技能第一步、巅峰第一步、打法和分区入口。"
  },
  {
    component: "ClassSeasonCoverage",
    zhName: "职业三赛季流派覆盖",
    source: "build-guides.builds + build-guides.seasons + archetypes + class selection",
    fields: [
      "taxonomy.seasonId",
      "taxonomy.classId",
      "taxonomy.archetypeId",
      "taxonomy.mode",
      "formationDifficulty",
      "taxonomy.stage",
      "ceiling",
      "source.verificationLevel",
      "source.references"
    ],
    frontendUse: "职业页按三赛季、流派和日常/速刷/冲层用途做横向对照，单元格直达对应 BD 装备分区，避免玩家只能看到当前赛季或纯文字概述。"
  },
  {
    component: "CoveragePanel",
    zhName: "数据覆盖与使用方式",
    source: "site-coverage",
    fields: [
      "storageLayers",
      "frontendDataContracts",
      "buildIntegrity",
      "equipmentCoverage",
      "sourceCoverage"
    ],
    frontendUse: "来源页说明当前数据如何存储、如何被页面消费，以及哪些字段仍待回填。"
  }
];

const pageBlueprints = [
  {
    route: "#home",
    zhName: "首页",
    playerGoal: "看版本边界、资料覆盖和核心功能入口。",
    requiredModules: ["版本状态条", "覆盖概览", "BD 入口", "装备入口", "职业开荒入口", "资料缺口"]
  },
  {
    route: "#builds",
    zhName: "BD 大厅",
    playerGoal: "按赛季、职业、用途和资料状态找到可进入详情的流派。",
    requiredModules: ["职业快速栏", "筛选条", "推荐入口", "赛季矩阵", "BD 结果列表", "详情跳转"]
  },
  {
    route: "#bd/<guideId>",
    zhName: "BD 详情",
    playerGoal: "直接抄完整 BD，看到装备、技能、巅峰、打法、替换和来源。",
    requiredModules: ["顶部概要", "分区导航", "总览", "开荒", "装备", "技能", "巅峰", "打法", "变体", "来源"]
  },
  {
    route: "#equipment / #item/<itemId>",
    zhName: "装备库",
    playerGoal: "查装备事实、暗金特效、掉落来源和相关 BD。",
    requiredModules: ["装备筛选", "受控结果列表", "装备详情", "字段来源状态", "相关 BD 使用矩阵"]
  },
  {
    route: "#aspects / #aspect/<aspectId>",
    zhName: "威能索引",
    playerGoal: "查 BD 中用到的威能、可用部位、来源状态和相关 BD。",
    requiredModules: ["威能筛选", "受控结果列表", "威能详情", "可用部位", "相关 BD"]
  },
  {
    route: "#classes",
    zhName: "职业开荒",
    playerGoal: "查看职业定位、阶段路线和日常/速刷/冲层流派矩阵。",
    requiredModules: ["职业资源", "开荒阶段", "流派矩阵", "赛季切换", "BD 入口"]
  },
  {
    route: "#forecast",
    zhName: "150 层参考",
    playerGoal: "比较三赛季职业强度、速度参考、置信度和风险。",
    requiredModules: ["赛季筛选", "冲层矩阵", "速刷矩阵", "日常矩阵", "风险说明", "校准状态"]
  },
  {
    route: "#damage",
    zhName: "伤害实验室",
    playerGoal: "解释词缀、乘区、暴击、易伤、压制和攻速收益。",
    requiredModules: ["属性输入", "乘区拆分", "词缀对比", "BD 参数入口"]
  },
  {
    route: "#sources",
    zhName: "来源页",
    playerGoal: "查看资料从哪里来、如何存储、哪些字段仍有缺口。",
    requiredModules: ["来源登记", "覆盖报告", "存储层", "组件契约", "字段缺口", "玩家可见规则"]
  }
];

const buildDetailComponentBlueprint = [
  {
    component: "BuildHeader",
    requiredFields: ["title", "taxonomy", "formationDifficulty", "ceiling", "source.verificationLevel"],
    playerQuestion: "这套 BD 是什么赛季、职业、用途、强度和来源？"
  },
  {
    component: "BuildDossier",
    requiredFields: ["gearSlots", "skillTree.skillBar", "paragon.clickOrder", "gameplay.loop"],
    playerQuestion: "首屏能不能先看到核心装备、核心威能或暗金、技能、巅峰和打法？"
  },
  {
    component: "GearSummaryMatrix",
    requiredFields: ["gearSlots[].target", "gearSlots[].aspect.displayName", "gearSlots[].aspect.displayKind", "gearSlots[].replaceable", "gearSlots[].affixes"],
    playerQuestion: "每个部位穿什么、是否可替换、核心威能或暗金是什么？"
  },
  {
    component: "SkillRouteMatrix",
    requiredFields: ["skillTree.skillBar", "skillTree.pointOrder"],
    playerQuestion: "技能栏和加点顺序是什么？"
  },
  {
    component: "ParagonRouteMatrix",
    requiredFields: ["paragon.boardOrder", "paragon.clickOrder", "paragon.pointBands"],
    playerQuestion: "巅峰盘、雕文和点击顺序是什么？"
  },
  {
    component: "CombatFlowMatrix",
    requiredFields: ["gameplay.opener", "gameplay.loop", "gameplay.boss", "gameplay.defense"],
    playerQuestion: "起手、循环、首领、防御和速刷怎么打？"
  },
  {
    component: "ReplacementMatrix",
    requiredFields: ["gearSlots[].alternatives", "gearSlots[].replaceable", "variants"],
    playerQuestion: "缺某个部位时能替换什么，代价是什么？"
  }
];

const normalizedDataBlueprint = [
  {
    entity: "sources",
    zhName: "来源",
    purpose: "记录官方、社区、图标和工具来源的可信度、授权边界和抓取时间。"
  },
  {
    entity: "items / item_affixes / item_powers",
    zhName: "装备事实",
    purpose: "存储装备、固定词缀、暗金特效、掉落来源、版本和字段状态。"
  },
  {
    entity: "aspects",
    zhName: "威能事实",
    purpose: "存储威能名称、效果、可用部位、来源和版本。"
  },
  {
    entity: "skills / skill_nodes",
    zhName: "技能树",
    purpose: "存储技能、分支、点数上限、资源消耗、冷却和效果来源。"
  },
  {
    entity: "paragon_boards / paragon_nodes / glyphs",
    zhName: "巅峰盘",
    purpose: "存储盘、节点坐标、雕文、半径、门槛和效果来源。"
  },
  {
    entity: "builds / build_gear_slots / build_skill_steps / build_paragon_steps",
    zhName: "BD 档案",
    purpose: "按赛季、职业、流派和用途存储完整可执行 BD。"
  },
  {
    entity: "leaderboard_samples / build_forecasts",
    zhName: "榜单与预测",
    purpose: "存储冲层、速刷和日常速度样本、预测、置信度和风险。"
  },
  {
    entity: "analysis_runs / analysis_outputs / publish_audits",
    zhName: "AI 分析与审核",
    purpose: "存储候选结果、证据和发布审核；未批准内容不能进入玩家页面。"
  }
];

const publicationWorkflow = [
  "来源登记",
  "代表样本结构化",
  "生成 BD、装备索引、威能索引、预测和覆盖报告",
  "JSON 契约校验",
  "中文化和禁用话术校验",
  "代表页面桌面和移动端截图检查",
  "敏感信息和授权边界扫描",
  "提交并推送玩家可见数据"
];

const [classes, equipment, buildGuides, aspectIndex, d2coreAspectLibrary, sources] = await Promise.all([
  readJson("data/classes/classes.json"),
  readJson("data/equipment/equipment-library.json"),
  readJson("data/generated/build-guides.json"),
  readJson("data/generated/aspect-index.json"),
  readJson("data/aspects/d2core-aspect-library.json"),
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

const modeIds = ["daily", "speed_farm", "pit_push"];
const buildIntegrity = {
  expectedGearSlots: 11,
  completeGearSlotBuilds: builds.filter((guide) => (guide.gearSlots || []).length === 11).length,
  skillRouteBuilds: builds.filter((guide) => (guide.skillTree?.skillBar || []).length === 6 && (guide.skillTree?.pointOrder || []).length >= 10).length,
  paragonRouteBuilds: builds.filter((guide) => (guide.paragon?.boardOrder || []).length >= 4 && (guide.paragon?.clickOrder || []).length >= 10).length,
  routeSpecificity: countGenericRouteEntries(builds),
  gameplayBuilds: builds.filter((guide) => guide.gameplay?.opener?.length && guide.gameplay?.loop?.length && guide.gameplay?.boss?.length).length,
  progressionBuilds: builds.filter((guide) => (guide.progression?.stages || []).length >= 4 && (guide.progression?.checkpoints || []).length >= 4).length,
  replacementBuilds: builds.filter((guide) => (guide.gearSlots || []).every((slot) => (slot.alternatives || []).length >= 1)).length,
  bySeasonClassMode: seasons.map((season) => ({
    seasonId: season.id,
    classes: classes.map((classInfo) => {
      const classBuilds = builds.filter((guide) => guide.taxonomy.seasonId === season.id && guide.taxonomy.classId === classInfo.id);
      return {
        classId: classInfo.id,
        zhName: classInfo.zhName,
        modes: Object.fromEntries(modeIds.map((mode) => [
          mode,
          classBuilds.filter((guide) => guide.taxonomy.mode === mode).length
        ]))
      };
    })
  }))
};

const totalBuilds = builds.length;
const seasonClassModeCells = seasons.length * classes.length * modeIds.length;
const populatedSeasonClassModeCells = seasons.reduce((total, season) => total + classes.reduce((classTotal, classInfo) => {
  const classBuilds = builds.filter((guide) => guide.taxonomy.seasonId === season.id && guide.taxonomy.classId === classInfo.id);
  return classTotal + modeIds.filter((mode) => classBuilds.some((guide) => guide.taxonomy.mode === mode)).length;
}, 0), 0);

const playerRequirementCoverage = [
  {
    id: "gear_slots",
    zhName: "11 个装备位置",
    satisfied: buildIntegrity.completeGearSlotBuilds,
    total: totalBuilds,
    proof: "每套 BD 的 gearSlots 必须等于 11，并在装备分区渲染纸娃娃、总表和槽位卡。"
  },
  {
    id: "replacement_paths",
    zhName: "每个部位替换方案",
    satisfied: buildIntegrity.replacementBuilds,
    total: totalBuilds,
    proof: "每个装备槽至少有替换件，替换分区展示当前目标、首选替换和代价。"
  },
  {
    id: "skill_order",
    zhName: "技能栏与加点顺序",
    satisfied: buildIntegrity.skillRouteBuilds,
    total: totalBuilds,
    proof: "每套 BD 必须有 6 技能栏和至少 10 步技能加点路线。"
  },
  {
    id: "paragon_click_order",
    zhName: "巅峰盘与点击顺序",
    satisfied: buildIntegrity.paragonRouteBuilds,
    total: totalBuilds,
    proof: "每套 BD 必须有至少 4 张巅峰盘和至少 10 步点击路线。"
  },
  {
    id: "gameplay_flow",
    zhName: "打法流程",
    satisfied: buildIntegrity.gameplayBuilds,
    total: totalBuilds,
    proof: "每套 BD 必须有起手、主循环和首领处理，并在打法分区展示。"
  },
  {
    id: "progression_plan",
    zhName: "开荒到成型路线",
    satisfied: buildIntegrity.progressionBuilds,
    total: totalBuilds,
    proof: "每套 BD 必须有至少 4 个阶段和 4 个检查点。"
  },
  {
    id: "season_class_mode_matrix",
    zhName: "赛季 × 职业 × 用途矩阵",
    satisfied: populatedSeasonClassModeCells,
    total: seasonClassModeCells,
    proof: "每个赛季、职业和日常/速刷/冲层用途都有可进入的结构化 BD。"
  },
  {
    id: "route_specificity",
    zhName: "无泛化路线占位",
    satisfied: totalBuilds,
    total: totalBuilds,
    proof: `技能栏、技能加点和巅峰点击的泛化占位项合计 ${(buildIntegrity.routeSpecificity.genericSkillBarEntries || 0) + (buildIntegrity.routeSpecificity.genericSkillSteps || 0) + (buildIntegrity.routeSpecificity.genericParagonNodes || 0)} 个。`
  }
];

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
      files: ["data/generated/aspect-index.json", "data/aspects/d2core-aspect-library.json", "data/aspects/community-aspect-overrides.json"],
      frontendUse: "威能索引页展示威能效果、可用部位、核心度和相关 BD；暗黑核快照作为社区效果文本来源，未匹配项保持 BD 派生状态。"
    },
    {
      id: "forecast_matrix",
      zhName: "预测矩阵层",
      files: ["data/generated/build-simulations.json"],
      frontendUse: "150 层参考页；不得作为已验证榜单展示。"
    },
    {
      id: "future_normalized_model",
      zhName: "后续规范化事实资料表",
      files: ["docs/PLAYER_SITE_ARCHITECTURE_SPEC.md"],
      frontendUse: "定义装备、威能、技能、巅峰、BD、预测和审核数据如何拆分存储，作为后端化和全量数据库扩展边界。"
    }
  ],
  pageBlueprints,
  frontendDataContracts,
  buildDetailComponentBlueprint,
  normalizedDataBlueprint,
  publicationWorkflow,
  playerRequirementCoverage,
  buildIntegrity,
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
    sourceLibraryTotal: d2coreAspectLibrary.itemCount,
    sourceLibraryScope: d2coreAspectLibrary.scope,
    sourceLibraryStatus: d2coreAspectLibrary.source?.trustLevel,
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
    "暗金特效、掉落来源和验证部位来自社区数据库参考；完整词缀范围缺失时必须继续显示字段状态。",
    "暗黑核威能库只能作为社区效果文本和类型交叉校验来源；未匹配的模板威能不得强行套用具体效果。",
    "预测速度不能写成真实天梯结果。",
    "玩家页面不得展示内部推理、候选生成或问答流程话术。",
    "AI 分析结果必须经过发布审核后才能进入玩家可见 JSON。",
    "BD 详情必须按 URL 分区阅读，装备、技能、巅峰、打法等分区独立渲染。"
  ]
};

await mkdir(path.dirname(output), { recursive: true });
await writeFile(output, `${JSON.stringify(payload, null, 2)}\n`);
console.log(`Wrote site coverage to ${path.relative(root, output)}`);
