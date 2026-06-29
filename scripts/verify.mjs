import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { calculateExpectedDps } from "../src/damage/calculate.js";
import { validateBuildWeights } from "../src/build/score.js";

const PROJECT_ROOT = path.resolve(new URL(".", import.meta.url).pathname, "..");

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(PROJECT_ROOT, relativePath), "utf8"));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const genericSkillStepPattern = /^终极$|^防御$|^位移$|基础触发|基础生成|主力输出|资源\/冷却被动|生存被动|关键被动|增伤\/控制|终局重分配/;
const genericParagonNodePattern = /^(传奇节点|雕文孔|稀有节点|魔法节点|剩余魔法节点|防御稀有节点|主属性通路)$/;
const routeEnglishPattern = /[A-Za-z]{3,}/;
const placeholderAspectNames = new Set(["暗金特效位", "神话暗金位", "空槽说明", "空槽位"]);
const allowedGearSlotDataStatuses = new Set([
  "社区 BD 装备位参考；威能效果、数值和赛季强度仍需按来源核对。",
  "社区 BD 装备位参考；威能效果来自暗黑核社区数据库，赛季强度仍需按来源核对。",
  "社区 BD 装备位参考；唯一装备固定词缀已接入，暗金特效数值仍需校验。",
  "社区 BD 装备位参考；唯一装备固定词缀和暗金特效文本已接入，赛季强度仍需核对。",
  "社区 BD 装备栏说明该位置不占用或由双手/副手方案替代。",
  "官方唯一装备固定词缀已接入；暗金特效完整数值仍需校验。",
  "官方唯一装备固定词缀和暗金特效文本已接入；赛季强度仍需实战校验。",
  "传奇威能来自结构化 BD 模板；完整效果和数值需接入可靠威能库校验。",
  "传奇威能效果来自暗黑核社区数据库；赛季强度仍需实战校验。",
  "结构化装备栏说明该位置不占用或由其他武器方案替代。"
]);
const allowedRouteSourceSnippets = [
  "同赛季社区 BD 结构参考",
  "跨赛季社区 BD 结构参考",
  "官方词缀种子上的结构化模板",
  "未来赛季推演模板"
];

function mergeCommunityOverride(base, override) {
  return {
    ...base,
    ...override,
    sourceReference: {
      ...base.sourceReference,
      ...override.sourceReference
    }
  };
}

function expandCommunityOverrides(overrides) {
  const byId = new Map(overrides.map((override) => [override.id, override]));
  return overrides.map((override) => {
    if (!override.extends) return override;
    const base = byId.get(override.extends);
    assert(base, `Community override ${override.id} extends missing override ${override.extends}`);
    return mergeCommunityOverride(base, override);
  });
}

const version = await readJson("data/metadata/version-baseline.json");
const classes = await readJson("data/classes/classes.json");
const categories = await readJson("data/equipment/stat-categories.json");
const archetypes = await readJson("data/builds/archetypes.json");
const communityOverrides = await readJson("data/builds/community-build-overrides.json");
const seasonPlans = await readJson("data/builds/season-start-plans.json");
const sources = await readJson("data/sources/source-registry.json");
const features = await readJson("data/features/feature-map.json");
const equipmentLibrary = await readJson("data/equipment/equipment-library.json");
const communityUniqueOverrides = await readJson("data/equipment/community-unique-overrides.json");
const communityAspectOverrides = await readJson("data/aspects/community-aspect-overrides.json");
const d2coreAspectLibrary = await readJson("data/aspects/d2core-aspect-library.json");
const simulations = await readJson("data/generated/build-simulations.json");
const buildGuides = await readJson("data/generated/build-guides.json");
const aspectIndex = await readJson("data/generated/aspect-index.json");
const siteCoverage = await readJson("data/generated/site-coverage.json");
const iconIndex = await readJson("data/generated/d4builds-icon-index.json");

function findBuildGuide(seasonId, classId, mode, archetypeId) {
  return buildGuides.builds.find((guide) =>
    guide.taxonomy.seasonId === seasonId
    && guide.taxonomy.classId === classId
    && guide.taxonomy.mode === mode
    && guide.taxonomy.archetypeId === archetypeId
  );
}

assert(version.effectiveLiveVersion.patch === "3.0.4", "Expected live patch 3.0.4");
assert(version.publishedUpcomingVersion.patch === "3.1.0", "Expected upcoming patch 3.1.0");
assert(Date.parse(version.effectiveLiveVersion.releaseDate) <= Date.parse(version.asOf), "Live patch date must not be in the future");
assert(Date.parse(version.publishedUpcomingVersion.releaseDate) > Date.parse(version.asOf), "Upcoming patch should be future-dated relative to asOf");

const classIds = classes.map((item) => item.id).sort();
assert(classIds.length === 8, "Expected 8 classes");
assert(JSON.stringify(classIds) === JSON.stringify([...version.classSet].sort()), "Class set mismatch");
assert(classes.every((item) => item.zhName && item.displayName), "Each class needs Chinese and English names");
assert(classes.every((item) => item.primaryResources?.length >= 1), "Each class needs at least one resource/status label");
assert(classes.every((item) => item.primaryResources.every((resource) => !/pending source|source lock|Class-specific/i.test(resource))), "Class resource labels must not expose English placeholder text");
assert(classes.every((item) => item.playableStatus && item.classSourceId && item.classSourceUrl && item.asOf && item.releaseContext && item.dataConfidence), "Each class needs playable status, source and player-facing release context");
assert(classes.every((item) => sources.some((source) => source.id === item.classSourceId)), "Each class source id must exist in source registry");
assert(classIds.includes("paladin") && classIds.includes("warlock"), "Lord of Hatred class roster must include Paladin and Warlock");
for (const newClassId of ["paladin", "warlock"]) {
  const classInfo = classes.find((item) => item.id === newClassId);
  assert(classInfo.playableStatus === "official_released_expansion" && classInfo.expansion === "Lord of Hatred", `${newClassId} must be marked as a Lord of Hatred released class`);
  assert(classInfo.dataConfidence === "official_roster_mechanics_needs_validation", `${newClassId} mechanics must remain validation-bound`);
}

for (const collection of [archetypes, seasonPlans]) {
  const ids = collection.map((item) => item.classId).sort();
  assert(JSON.stringify(ids) === JSON.stringify(classIds), "Every class must have archetypes and season start plan coverage");
}

const knownCategoryIds = categories.map((item) => item.id);
for (const classArchetypes of archetypes) {
  for (const archetype of classArchetypes.archetypes) {
    const weights = Object.fromEntries(archetype.primaryStats.map((stat) => [stat, 1]));
    const validation = validateBuildWeights(weights, knownCategoryIds);
    assert(validation.ok, `Unknown stat category in ${classArchetypes.classId}/${archetype.id}: ${validation.unknown.join(", ")}`);
  }
}

assert(sources.some((source) => source.trustLevel === "official"), "Need at least one official source");
assert(sources.some((source) => source.id === version.effectiveLiveVersion.sourceId), "Live version source must be registered");
assert(sources.some((source) => source.id === version.publishedUpcomingVersion.sourceId), "Upcoming version source must be registered");
assert(sources.some((source) => source.id === "blizzard_lord_of_hatred" && source.use?.includes("class_roster") && source.use?.includes("paladin_class_confirmation") && source.use?.includes("warlock_class_confirmation")), "Official class roster source must register Paladin and Warlock confirmation");
assert(sources.some((source) => source.id === "d2core_unique_item_database" && source.use?.includes("community_unique_power_text") && source.use?.includes("community_equipment_slot_cross_check")), "D2Core unique item database source must be registered for community item fields");
assert(sources.some((source) => source.id === "d2core_aspect_database" && source.use?.includes("community_aspect_effect_text") && source.use?.includes("community_aspect_type_cross_check")), "D2Core aspect database source must be registered for community aspect fields");
assert(features.length >= 8, "Feature map should cover core guide modules");
assert(features.some((feature) => feature.id === "equipment_database"), "Feature map must include equipment database");
assert(features.some((feature) => feature.id === "damage_calculation"), "Feature map must include damage calculation");

assert(equipmentLibrary.scope === "equipment_library_seed_from_official_unique_guaranteed_affixes", "Equipment library scope mismatch");
assert(equipmentLibrary.gameVersion?.patch === "3.1.0" && equipmentLibrary.gameVersion?.build === "72578", "Equipment library needs structured game version");
assert(equipmentLibrary.coverage?.guaranteedAffixes === equipmentLibrary.items.length, "Equipment coverage must count guaranteed affixes");
assert(equipmentLibrary.coverage?.uniquePower === equipmentLibrary.items.length, "Equipment coverage must include unique powers for every seeded item");
assert(equipmentLibrary.coverage?.dropSource === equipmentLibrary.items.length, "Equipment coverage must include drop source text for every seeded item");
assert(equipmentLibrary.coverage?.verifiedSlot === equipmentLibrary.items.length, "Equipment coverage must include verified slots for every seeded item");
assert(equipmentLibrary.communityCoverage?.sourceId === "d2core_unique_item_database", "Equipment library must expose community source coverage");
assert(equipmentLibrary.itemCount === equipmentLibrary.items.length, "Equipment item count mismatch");
assert(equipmentLibrary.itemCount > 100, "Equipment library seed should contain more than 100 records");
assert(equipmentLibrary.limitations.some((line) => line.includes("not the full Diablo IV equipment database")), "Equipment library must disclose incomplete scope");
assert(communityUniqueOverrides.match?.matchedCount === equipmentLibrary.items.length, "Community unique overrides must match every seeded item");
assert(communityUniqueOverrides.items.every((item) => item.source?.sourceId === "d2core_unique_item_database"), "Every community unique override must carry the D2Core source id");
assert(equipmentLibrary.items.every((item) => item.image && item.guaranteedAffixes.length > 0), "Each equipment record needs an image path and guaranteed affixes");
assert(equipmentLibrary.items.every((item) => item.zhName && !/[A-Za-z]/.test(item.zhName)), "Each equipment record needs a Chinese display name");
assert(equipmentLibrary.items.every((item) => item.zhGuaranteedAffixes?.length === item.guaranteedAffixes.length), "Each equipment affix needs a Chinese display label");
assert(equipmentLibrary.items.every((item) => item.zhGuaranteedAffixes.every((label) => !/[A-Za-z]/.test(label))), "Chinese affix labels must not contain English words");
assert(equipmentLibrary.items.every((item) => item.primarySlot && item.zhPrimarySlot), "Each equipment record needs an inferred primary slot");
assert(equipmentLibrary.items.every((item) => item.slotCandidates?.length >= 1 && item.zhSlotCandidates?.length === item.slotCandidates.length), "Each equipment record needs Chinese slot candidates");
assert(equipmentLibrary.items.every((item) => item.verifiedSlot && item.dataStatus?.slot === "community_database_reference"), "Equipment slot status must disclose community source reference");
assert(equipmentLibrary.items.every((item) => item.gameVersion?.patch === "3.1.0" && item.gameVersion?.build === "72578"), "Each equipment record needs structured version data");
assert(equipmentLibrary.items.every((item) => Array.isArray(item.fullAffixRanges) && ["community_database_reference", "needs_source_backfill"].includes(item.dataStatus?.fullAffixRanges)), "Each equipment record must disclose affix range source status");
assert(equipmentLibrary.items.some((item) => item.dataStatus?.fullAffixRanges === "community_database_reference"), "At least representative equipment records must include community affix ranges");
assert(equipmentLibrary.items.some((item) => item.dataStatus?.fullAffixRanges === "needs_source_backfill"), "Equipment library must still disclose missing complete affix ranges where source data is incomplete");
assert(equipmentLibrary.items.every((item) => item.zhUniquePower && item.dataStatus?.uniquePower === "community_database_reference"), "Each equipment record must include community unique power text");
assert(equipmentLibrary.items.every((item) => item.dropSource?.zhText && item.dataStatus?.dropSource === "community_database_reference"), "Each equipment record must include community drop source text");
assert(equipmentLibrary.items.every((item) => item.verifiedSlot && item.dataStatus?.verifiedSlot === "community_database_reference"), "Each equipment record must include a community verified slot");
const suspiciousTransliteration = /[阿埃伊欧乌]{2,}|姆欧|特赫|克赫|恩欧|尔欧|布尔欧|弗尔|斯赫|格赫|德埃|赫埃|姆伊|普阿|斯乌|沃乌|尔伊|埃恩|德伊|斯克埃|布尔埃|特欧|姆阿|弗伊|克埃|欧恩|乌恩|伊恩弗|赫欧|阿尔埃|维阿恩|恩阿兹|欧尔德|沃埃|沃伊/;
assert(equipmentLibrary.items.every((item) => !suspiciousTransliteration.test(item.zhName)), "Equipment Chinese names should not contain obvious letter-by-letter transliteration residue");

assert(iconIndex.source.usage === "external_url_reference_only_no_asset_download", "Icon index must store URLs only");
assert(iconIndex.itemCount === equipmentLibrary.itemCount, "Icon index must cover the equipment seed");
assert(iconIndex.matchedCount === iconIndex.itemCount, "Every seeded equipment item should have an external icon URL");
assert(iconIndex.items.every((item) => item.iconUrl?.startsWith("https://sunderarmor.com/DIABLO4/Uniques/2/")), "External icon URLs must use the expected HTTPS asset host path");
assert(equipmentLibrary.items.every((item) => item.externalImage?.startsWith("https://sunderarmor.com/DIABLO4/Uniques/2/")), "Each equipment item should expose an external icon URL");
const equipmentById = new Map(equipmentLibrary.items.map((item) => [item.id, item]));

function verifyEquipmentReference(reference, context) {
  if (!reference?.itemId) return;
  const item = equipmentById.get(reference.itemId);
  assert(item, `Unknown equipment itemId in ${context}: ${reference.itemId}`);
  assert(item.zhName === reference.zhName, `Equipment itemId/name mismatch in ${context}: ${reference.itemId} is ${item.zhName}, rendered as ${reference.zhName}`);
}

assert(simulations.seasons.length === 3, "Build simulator should cover the next three season windows");
assert(simulations.seasons.every((season) => season.zhLabel && season.zhAssumption), "Each modeled season needs Chinese display text");
assert(simulations.zhWarning && !/[A-Za-z]/.test(simulations.zhWarning), "Build simulator warning needs Chinese display text");
assert(simulations.rows.length === simulations.seasons.length * classes.length, "Simulation rows must cover every class in every modeled season");
for (const row of simulations.rows) {
  assert(classIds.includes(row.classId), `Unknown simulation class: ${row.classId}`);
  assert(row.zhModelStatus && !/[A-Za-z]/.test(row.zhModelStatus), `Simulation row needs Chinese model status: ${row.classId}`);
  for (const mode of ["pit_push", "speed_farm", "daily"]) {
    const modeResult = row.modes[mode];
    assert(modeResult?.topBuilds?.length > 0, `Missing top builds for ${row.classId}/${mode}`);
    assert(typeof modeResult.topBuilds[0].predictedPit150Minutes === "number", `Missing Pit 150 prediction for ${row.classId}/${mode}`);
    assert(modeResult.topBuilds[0].recommendedItems.every((item) => item.zhName && item.zhGuaranteedAffixes?.length), `Recommended items need Chinese text for ${row.classId}/${mode}`);
    for (const build of modeResult.topBuilds) {
      assert(build.guide?.skillPlan?.priority?.length >= 6, `Build guide needs skill priorities for ${row.classId}/${mode}/${build.archetypeId}`);
      assert(build.guide?.paragonPlan?.boardRoute?.length >= 4, `Build guide needs paragon route for ${row.classId}/${mode}/${build.archetypeId}`);
      assert(build.guide?.gearPlan?.slotPriority?.length >= 4, `Build guide needs gear slot priorities for ${row.classId}/${mode}/${build.archetypeId}`);
      assert(build.guide?.rotation?.length >= 4, `Build guide needs rotation steps for ${row.classId}/${mode}/${build.archetypeId}`);
      assert(build.guide?.dataCompleteness?.equipmentAffixes, `Build guide needs data status for ${row.classId}/${mode}/${build.archetypeId}`);
    }
    const forecastGuide = findBuildGuide(row.seasonId, row.classId, mode, modeResult.topBuilds[0].archetypeId);
    assert(forecastGuide, `Forecast top build must link to a complete build guide: ${row.seasonId}/${row.classId}/${mode}/${modeResult.topBuilds[0].archetypeId}`);
    assert(forecastGuide.gearSlots?.length === 11 && forecastGuide.skillTree?.pointOrder?.length >= 18 && forecastGuide.paragon?.clickOrder?.length >= 18, `Forecast linked guide must expose gear, skill and paragon detail: ${forecastGuide.id}`);
  }
}

const archetypeCount = archetypes.reduce((total, group) => total + group.archetypes.length, 0);
const expectedBuildGuideCount = simulations.seasons.length * archetypeCount * 3;
assert(buildGuides.scope === "structured_build_guides_for_diablo4_guide_site", "Build guide scope mismatch");
assert(buildGuides.buildCount === buildGuides.builds.length, "Build guide count mismatch");
assert(buildGuides.builds.length === expectedBuildGuideCount, `Expected ${expectedBuildGuideCount} structured build guides`);
assert(buildGuides.slotOrder.length >= 11, "Build guides need full gear slot order");
assert(communityOverrides.length >= 1, "Need at least one community build override");

assert(aspectIndex.scope === "aspect_index_derived_from_structured_build_guides", "Aspect index scope mismatch");
assert(aspectIndex.aspectCount === aspectIndex.aspects.length, "Aspect index count mismatch");
assert(aspectIndex.aspectCount > 20, "Aspect index should contain structured aspect references");
assert(aspectIndex.aspects.every((aspect) => aspect.id && aspect.name && aspect.guideCount > 0 && aspect.usageCount > 0), "Each aspect needs id, name and usage counts");
assert(communityAspectOverrides.match?.matchedCount >= 10, "Community aspect overrides should reliably match representative aspect records");
assert(communityAspectOverrides.items.every((item) => item.source?.sourceId === "d2core_aspect_database" && item.zhEffect && item.zhAspectType), "Every community aspect override needs source, effect and type");
assert(d2coreAspectLibrary.scope === "d2core_full_aspect_library_snapshot", "D2Core aspect library scope mismatch");
assert(d2coreAspectLibrary.source?.sourceId === "d2core_aspect_database", "D2Core aspect library must carry the registered source id");
assert(d2coreAspectLibrary.itemCount === d2coreAspectLibrary.items.length && d2coreAspectLibrary.itemCount >= 300, "D2Core aspect library must keep the full imported aspect snapshot");
assert(d2coreAspectLibrary.items.every((item) => item.aspectId && item.zhName && item.zhEffect && item.zhAspectType && item.source?.dataUrl), "Every imported D2Core aspect needs id, Chinese name, effect, type and source URL");
assert(aspectIndex.communityCoverage?.sourceId === "d2core_aspect_database", "Aspect index must expose community source coverage");
assert(aspectIndex.aspects.some((aspect) => aspect.dataStatus?.scope === "community_database_reference" && aspect.database?.zhEffect && aspect.database?.zhAllowedSlots?.length), "Aspect index should enrich matched aspects with community effect text and slots");
assert(aspectIndex.aspects.some((aspect) => aspect.dataStatus?.scope === "derived_from_build_gear_slots" && !aspect.database), "Aspect index must keep unmatched template aspects clearly derived-only");
assert(aspectIndex.aspects.every((aspect) => ["derived_from_build_gear_slots", "community_database_reference"].includes(aspect.dataStatus?.scope)), "Each aspect must disclose derived or community scope");
assert(aspectIndex.aspects.every((aspect) => !placeholderAspectNames.has(aspect.name)), "Aspect index must not include placeholder aspect names");
assert(aspectIndex.aspects.every((aspect) => aspect.slotUsage?.length >= 1 && aspect.buildUses?.length >= aspect.guideCount), "Each aspect needs slot usage and related builds");

assert(siteCoverage.scope === "player_site_data_coverage_and_storage_usage", "Site coverage scope mismatch");
assert(siteCoverage.buildCoverage?.total === buildGuides.builds.length, "Site coverage build count mismatch");
assert(siteCoverage.buildCoverage?.classes === classes.length, "Site coverage class count mismatch");
assert(siteCoverage.buildCoverage?.seasons === simulations.seasons.length, "Site coverage season count mismatch");
assert(siteCoverage.equipmentCoverage?.total === equipmentLibrary.items.length, "Site coverage equipment count mismatch");
assert(siteCoverage.aspectCoverage?.total === aspectIndex.aspects.length, "Site coverage aspect count mismatch");
assert(siteCoverage.aspectCoverage?.sourceLibraryTotal === d2coreAspectLibrary.itemCount, "Site coverage must expose the imported D2Core aspect library count");
assert(siteCoverage.aspectCoverage?.sourceLibraryStatus === "needs_validation", "Site coverage must disclose D2Core aspect library validation status");
assert(siteCoverage.sourceCoverage?.total === sources.length, "Site coverage source count mismatch");
assert(siteCoverage.storageLayers?.length >= 4, "Site coverage must describe storage layers");
assert(siteCoverage.pageBlueprints?.length >= 8, "Site coverage must expose the player-site page blueprint");
assert(siteCoverage.pageBlueprints?.some((page) => page.route === "#bd/<guideId>" && page.requiredModules?.includes("装备") && page.requiredModules?.includes("技能") && page.requiredModules?.includes("巅峰") && page.requiredModules?.includes("打法")), "BD detail page blueprint must require equipment, skills, paragon and gameplay sections");
assert(siteCoverage.buildCoverage.classMatrix?.length === simulations.seasons.length, "Site coverage needs per-season class matrix");
assert(siteCoverage.frontendDataContracts?.some((contract) => contract.component === "RecommendedBuildBoard"), "Site coverage must describe the build recommendation board data contract");
assert(siteCoverage.frontendDataContracts?.some((contract) => contract.component === "BuildMaturityPanel" && contract.fields?.includes("source.verificationLevel")), "Site coverage must describe the build maturity panel contract");
assert(siteCoverage.frontendDataContracts?.some((contract) => contract.component === "BuildSidebarSectionLinks" && contract.fields?.includes("gearSlots") && contract.fields?.includes("skillTree.pointOrder")), "Site coverage must describe the build sidebar section links contract");
assert(siteCoverage.frontendDataContracts?.some((contract) => contract.component === "BuildDetailLayout"), "Site coverage must describe the build detail data contract");
assert(siteCoverage.frontendDataContracts?.some((contract) => contract.component === "BuildPlannerSheet" && contract.fields?.includes("gearSlots[].alternatives[0]") && contract.fields?.includes("paragon.clickOrder")), "Site coverage must describe the copy-ready build planner sheet contract");
assert(siteCoverage.frontendDataContracts?.some((contract) => contract.component === "BuildDamageModelPanel" && contract.fields?.includes("damageModel.breakdown") && contract.fields?.includes("damageModel.assumptions")), "Site coverage must describe the build damage model panel contract");
assert(siteCoverage.frontendDataContracts?.some((contract) => contract.component === "BuildFamilyNavigator" && contract.fields?.includes("taxonomy.mode") && contract.fields?.includes("ceiling.pit150Minutes") && contract.fields?.includes("source.verificationLevel")), "Site coverage must describe the build family navigator contract");
assert(siteCoverage.frontendDataContracts?.some((contract) => contract.component === "BuildModeComparison" && contract.fields?.includes("coreRequirements") && contract.fields?.includes("skillTree.pointOrder[0]") && contract.fields?.includes("paragon.clickOrder[0]") && contract.fields?.includes("gameplay.loop[0]")), "Site coverage must describe the same-archetype mode comparison contract");
assert(siteCoverage.frontendDataContracts?.some((contract) => contract.component === "BuildReadinessChecklist" && contract.fields?.includes("gearSlots[].required") && contract.fields?.includes("gearSlots[].alternatives[0]") && contract.fields?.includes("gameplay.defense[0]")), "Site coverage must describe the build readiness checklist contract");
assert(siteCoverage.frontendDataContracts?.some((contract) => contract.component === "GuideReadinessPanel" && contract.fields?.includes("source.verificationLevel") && contract.fields?.includes("dataQuality.needsValidation")), "Site coverage must describe the guide readiness panel contract");
assert(siteCoverage.frontendDataContracts?.some((contract) => contract.component === "RouteSourcePanel" && contract.fields?.includes("skillTree.sourceStatus") && contract.fields?.includes("paragon.sourceStatus")), "Site coverage must describe the skill/paragon route source panel contract");
assert(siteCoverage.frontendDataContracts?.some((contract) => contract.component === "ClassBuildMatrix" && contract.fields?.includes("skillTree.pointOrder[0]") && contract.fields?.includes("paragon.clickOrder[0]") && contract.fields?.includes("damageModel.expectedDps")), "Site coverage must describe the class build matrix contract");
assert(siteCoverage.frontendDataContracts?.some((contract) => contract.component === "ClassSeasonCoverage" && contract.fields?.includes("taxonomy.seasonId") && contract.fields?.includes("source.references")), "Site coverage must describe the class cross-season coverage contract");
assert(siteCoverage.frontendDataContracts?.some((contract) => contract.component === "ForecastTable" && contract.fields?.includes("build-guides.builds[id].formationDifficulty") && contract.fields?.includes("build-guides.builds[id].source.verificationLevel")), "Site coverage must describe the forecast-to-build-guide contract");
assert(siteCoverage.frontendDataContracts?.some((contract) => contract.fields?.includes("gearSlots")), "Frontend data contracts must expose full build detail fields");
assert(siteCoverage.frontendDataContracts?.some((contract) => contract.fields?.includes("gearSlots[].aspect.displayName") && contract.fields?.includes("gearSlots[].aspect.displayKind")), "Frontend data contracts must expose player-facing gear power display fields");
assert(siteCoverage.buildDetailComponentBlueprint?.some((contract) => contract.component === "GearSummaryMatrix" && contract.requiredFields?.includes("gearSlots[].replaceable")), "Build detail blueprint must require slot-level replacement status");
assert(siteCoverage.buildDetailComponentBlueprint?.some((contract) => contract.component === "GearSummaryMatrix" && contract.requiredFields?.includes("gearSlots[].aspect.displayName")), "Gear summary blueprint must require player-facing aspect or unique display names");
assert(siteCoverage.buildDetailComponentBlueprint?.some((contract) => contract.component === "SkillRouteMatrix" && contract.requiredFields?.includes("skillTree.pointOrder")), "Build detail blueprint must require skill point order");
assert(siteCoverage.buildDetailComponentBlueprint?.some((contract) => contract.component === "ParagonRouteMatrix" && contract.requiredFields?.includes("paragon.clickOrder")), "Build detail blueprint must require paragon click order");
assert(siteCoverage.normalizedDataBlueprint?.some((entity) => entity.entity.includes("analysis_outputs")), "Data blueprint must keep AI analysis outputs separate from player-facing data");
assert(siteCoverage.publicationWorkflow?.includes("中文化和禁用话术校验"), "Publication workflow must include Chinese copy and forbidden-copy checks");
assert(siteCoverage.playerRequirementCoverage?.some((item) => item.id === "gear_slots" && item.satisfied === buildGuides.builds.length), "Coverage must expose player requirement coverage for gear slots");
assert(siteCoverage.playerRequirementCoverage?.some((item) => item.id === "core_power_summary" && item.satisfied === buildGuides.builds.length), "Coverage must expose player requirement coverage for core powers");
assert(siteCoverage.playerRequirementCoverage?.some((item) => item.id === "skill_order" && item.satisfied === buildGuides.builds.length), "Coverage must expose player requirement coverage for skill order");
assert(siteCoverage.playerRequirementCoverage?.some((item) => item.id === "paragon_click_order" && item.satisfied === buildGuides.builds.length), "Coverage must expose player requirement coverage for paragon click order");
assert(siteCoverage.playerRequirementCoverage?.some((item) => item.id === "damage_breakdown" && item.satisfied === buildGuides.builds.length), "Coverage must expose player requirement coverage for damage breakdowns");
assert(siteCoverage.playerRequirementCoverage?.some((item) => item.id === "readiness_checklist" && item.satisfied === buildGuides.builds.length), "Coverage must expose player requirement coverage for readiness checklists");
assert(siteCoverage.playerRequirementCoverage?.some((item) => item.id === "mode_comparison" && item.satisfied === buildGuides.builds.length), "Coverage must expose player requirement coverage for daily/speed/push comparison");
assert(siteCoverage.playerRequirementCoverage?.some((item) => item.id === "source_status" && item.satisfied === buildGuides.builds.length), "Coverage must expose player requirement coverage for source status");
assert(siteCoverage.playerRequirementCoverage?.some((item) => item.id === "full_execution_bundle" && item.satisfied === buildGuides.builds.length), "Coverage must expose full executable build bundle coverage");
assert(siteCoverage.buildIntegrity?.completeGearSlotBuilds === buildGuides.builds.length, "Site coverage must prove every BD has 11 gear slots");
assert(siteCoverage.buildIntegrity?.requiredSlotBuilds === buildGuides.builds.length, "Site coverage must prove every BD has hard-required gear slots");
assert(siteCoverage.buildIntegrity?.replaceableSlotBuilds === buildGuides.builds.length, "Site coverage must prove every BD has replaceable slots");
assert(siteCoverage.buildIntegrity?.gearPowerDisplayBuilds === buildGuides.builds.length, "Site coverage must prove every BD has player-facing gear power displays");
assert(siteCoverage.buildIntegrity?.coreRequirementBuilds === buildGuides.builds.length, "Site coverage must prove every BD has core unique/aspect requirements");
assert(siteCoverage.buildIntegrity?.skillRouteBuilds === buildGuides.builds.length, "Site coverage must prove every BD has skill routes");
assert(siteCoverage.buildIntegrity?.paragonRouteBuilds === buildGuides.builds.length, "Site coverage must prove every BD has paragon routes");
assert(siteCoverage.buildIntegrity?.routeSpecificity?.genericSkillSteps === 0, "Site coverage must prove skill point routes do not expose generic placeholders");
assert(siteCoverage.buildIntegrity?.routeSpecificity?.genericSkillBarEntries === 0, "Site coverage must prove skill bars do not expose generic placeholders");
assert(siteCoverage.buildIntegrity?.routeSpecificity?.genericParagonNodes === 0, "Site coverage must prove paragon routes do not expose generic placeholders");
assert(siteCoverage.buildIntegrity?.gameplayBuilds === buildGuides.builds.length, "Site coverage must prove every BD has gameplay instructions");
assert(siteCoverage.buildIntegrity?.damageModelBuilds === buildGuides.builds.length, "Site coverage must prove every BD has damage model breakdowns");
assert(siteCoverage.buildIntegrity?.progressionBuilds === buildGuides.builds.length, "Site coverage must prove every BD has progression instructions");
assert(siteCoverage.buildIntegrity?.replacementBuilds === buildGuides.builds.length, "Site coverage must prove every BD has replacement data");
assert(siteCoverage.buildIntegrity?.readinessChecklistBuilds === buildGuides.builds.length, "Site coverage must prove every BD has readiness checklist data");
assert(siteCoverage.buildIntegrity?.sourceStatusBuilds === buildGuides.builds.length, "Site coverage must prove every BD has source status data");
assert(siteCoverage.buildIntegrity?.modeComparisonReadyBuilds === buildGuides.builds.length, "Site coverage must prove every BD can be compared across daily/speed/push versions");
assert(siteCoverage.buildIntegrity?.fullExecutionBuilds === buildGuides.builds.length, "Site coverage must prove every BD passes the full execution bundle");

const guideIds = new Set();
let uniquePowerSlotCount = 0;
let uniquePowerTextCount = 0;
let legendaryAspectSlotCount = 0;
let legendaryAspectTextCount = 0;
for (const guide of buildGuides.builds) {
  assert(!guideIds.has(guide.id), `Duplicate build guide id: ${guide.id}`);
  guideIds.add(guide.id);
  assert(classIds.includes(guide.taxonomy.classId), `Unknown build guide class: ${guide.id}`);
  assert(["pit_push", "speed_farm", "daily"].includes(guide.taxonomy.mode), `Unknown build guide mode: ${guide.id}`);
  assert(guide.title && guide.summary?.oneLine, `Build guide needs Chinese title and summary: ${guide.id}`);
  assert(guide.displayName && guide.displayName.includes(guide.taxonomy.className) && guide.displayName.includes(guide.taxonomy.archetypeName), `Build guide needs player-facing displayName: ${guide.id}`);
  assert(guide.guideCompleteness?.counts?.gearSlots === buildGuides.slotOrder.length, `Build guide completeness must count every gear slot: ${guide.id}`);
  assert(guide.guideCompleteness?.counts?.skillSteps >= 18 && guide.guideCompleteness?.counts?.paragonSteps >= 18, `Build guide completeness must count complete skill and paragon routes: ${guide.id}`);
  assert(guide.guideCompleteness?.counts?.gameplaySections >= 5 && guide.guideCompleteness?.counts?.damageBreakdown >= 7 && guide.guideCompleteness?.counts?.replaceableSlots >= 1, `Build guide completeness must count gameplay, damage and replacement coverage: ${guide.id}`);
  assert(guide.guideCompleteness?.checklist?.length >= 5, `Build guide completeness needs a player checklist: ${guide.id}`);
  assert(guide.formationDifficulty?.label && guide.formationDifficulty?.reasons?.length >= 2, `Build guide needs formation difficulty: ${guide.id}`);
  assert(guide.ceiling?.tier && typeof guide.ceiling.pit150Minutes === "number", `Build guide needs ceiling reference: ${guide.id}`);
  assert(guide.ceiling?.confidence > 0 && guide.ceiling?.sourceStatus && guide.ceiling?.evidence?.length >= 2, `Build guide needs ceiling evidence and confidence: ${guide.id}`);
  assert(guide.damageModel?.expectedDps > 0 && guide.damageModel?.hitDamage > 0, `Build guide needs expected damage model totals: ${guide.id}`);
  assert(Object.keys(guide.damageModel?.breakdown || {}).length >= 7, `Build guide needs damage model breakdown: ${guide.id}`);
  assert((guide.damageModel?.assumptions || []).length >= 3 && guide.damageModel.assumptions.some((line) => line.includes("服务器") || line.includes("结算")), `Build guide damage model needs assumptions: ${guide.id}`);
  assert((guide.damageModel?.drivers || []).length >= 3, `Build guide damage model needs player-facing drivers: ${guide.id}`);
  if (!["community_reference", "cross_season_reference"].includes(guide.ceiling.sourceStatus)) {
    assert(guide.ceiling.displayTier?.includes("模板") && guide.ceiling.label?.includes("模板参考"), `Template guide ceiling must be labeled as template reference: ${guide.id}`);
  }
  assert(guide.gearSlots?.length === buildGuides.slotOrder.length, `Build guide needs every gear slot: ${guide.id}`);
  assert(guide.gearSlots.every((slot) => slot.zhSlotName && typeof slot.replaceable === "boolean" && slot.target?.zhName), `Each gear slot needs replacement status and target item: ${guide.id}`);
  assert(guide.gearSlots.every((slot) => !suspiciousTransliteration.test(slot.target.zhName)), `Build guide gear names should be readable Chinese: ${guide.id}`);
  assert(guide.gearSlots.every((slot) => slot.affixes?.length >= 3 && slot.alternatives?.length >= 2), `Each gear slot needs affixes and alternatives: ${guide.id}`);
  assert(guide.gearSlots.every((slot) => slot.upgradePath?.length >= 3 && (slot.dataStatus || slot.aspect?.sourceStatus)), `Each gear slot needs upgrade path and source status: ${guide.id}`);
  assert(guide.gearSlots.every((slot) => allowedGearSlotDataStatuses.has(slot.dataStatus)), `Each gear slot needs a player-facing source status: ${guide.id}`);
  assert(guide.gearSlots.every((slot) => !slot.dataStatus.includes("暗金特效和范围待回填")), `Gear slot status must not use the old one-size-fits-all copy: ${guide.id}`);
  assert(guide.gearSlots.every((slot) => slot.aspect?.displayName && slot.aspect?.displayKind), `Each gear slot needs player-facing power display fields: ${guide.id}`);
  assert(guide.gearSlots.every((slot) => !placeholderAspectNames.has(slot.aspect?.displayName)), `Gear slot display names must not expose placeholder powers: ${guide.id}`);
  for (const slot of guide.gearSlots) {
    if (["unique_power", "mythic_unique_power"].includes(slot.aspect?.displayKind)) {
      uniquePowerSlotCount += 1;
      if (slot.aspect?.powerText) uniquePowerTextCount += 1;
    }
    if (slot.aspect?.displayKind === "legendary_aspect") {
      legendaryAspectSlotCount += 1;
      if (slot.aspect?.powerText) legendaryAspectTextCount += 1;
    }
  }
  assert(guide.progression?.stages?.length >= 4, `Build guide needs leveling-to-endgame progression stages: ${guide.id}`);
  assert(guide.progression?.checkpoints?.length >= 4, `Build guide needs progression checkpoints: ${guide.id}`);
  assert(guide.progression.stages.every((stage) => stage.levelRange && stage.gearFocus && stage.skillFocus && stage.paragonFocus && stage.gameplayFocus && stage.swapRule), `Each progression stage needs gear, skill, paragon, gameplay and swap rules: ${guide.id}`);
  for (const slot of guide.gearSlots) {
    verifyEquipmentReference(slot.target, `${guide.id}/${slot.slotId}`);
    for (const alternative of slot.alternatives) verifyEquipmentReference(alternative, `${guide.id}/${slot.slotId}/alternative`);
  }
  assert(guide.coreUniques?.length >= 2 || guide.coreAspects?.length >= 4, `Build guide needs core uniques/aspects: ${guide.id}`);
  assert((guide.coreAspects || []).every((aspect) => aspect.name && !placeholderAspectNames.has(aspect.name)), `Core aspect summary must use player-facing names: ${guide.id}`);
  assert(guide.coreRequirements?.length >= 4, `Build guide needs structured core requirements: ${guide.id}`);
  assert(guide.coreRequirements.every((requirement) => requirement.zhSlotName && requirement.targetName && requirement.powerName && typeof requirement.required === "boolean" && typeof requirement.replaceable === "boolean"), `Core requirements need slot, target, power and replacement state: ${guide.id}`);
  assert(guide.coreRequirements.every((requirement) => {
    const slot = guide.gearSlots.find((item) => item.slotId === requirement.slotId);
    return slot
      && slot.zhSlotName === requirement.zhSlotName
      && slot.target.zhName === requirement.targetName
      && (slot.aspect.displayName || slot.aspect.name || slot.aspect.role) === requirement.powerName;
  }), `Core requirements must match resolved gear slots: ${guide.id}`);
  assert((guide.summary.requirements || []).every((line) => guide.coreRequirements.some((requirement) => requirement.required && line === `${requirement.zhSlotName}：${requirement.targetName}`)), `Summary requirements must be derived from resolved core requirements: ${guide.id}`);
  for (const coreUnique of guide.coreUniques || []) {
    verifyEquipmentReference(coreUnique, `${guide.id}/coreUniques/${coreUnique.slotId}`);
    const slot = guide.gearSlots.find((item) => item.slotId === coreUnique.slotId);
    assert(slot?.target.zhName === coreUnique.zhName, `Core unique summary must match gear slot target name: ${guide.id}/${coreUnique.slotId}`);
    assert((slot?.target.itemId ?? null) === (coreUnique.itemId ?? null), `Core unique summary must match gear slot target itemId: ${guide.id}/${coreUnique.slotId}`);
  }
  assert(guide.skillTree?.skillBar?.length === 6, `Build guide needs six skill bar entries: ${guide.id}`);
  assert(guide.skillTree?.pointOrder?.length >= 18, `Build guide needs complete skill point order: ${guide.id}`);
  assert(allowedRouteSourceSnippets.some((snippet) => guide.skillTree?.sourceStatus?.includes(snippet)), `Build guide needs player-facing skill route source status: ${guide.id}`);
  assert(guide.skillTree.skillBar.every((skill) => !genericSkillStepPattern.test(skill.name || "")), `Build guide skill bar still contains generic placeholders: ${guide.id}`);
  assert(guide.skillTree.pointOrder.every((step) => !genericSkillStepPattern.test(step.skill || "")), `Build guide skill point order still contains generic placeholders: ${guide.id}`);
  assert(guide.skillTree.pointOrder.every((step) => !String(step.reason || "").includes("补足完整")), `Build guide skill route reason still exposes generation copy: ${guide.id}`);
  assert(guide.skillTree?.classMechanic, `Build guide needs class mechanic text: ${guide.id}`);
  assert(guide.paragon?.boardOrder?.length >= 4, `Build guide needs paragon boards: ${guide.id}`);
  assert(guide.paragon?.clickOrder?.length >= 18, `Build guide needs complete paragon click order: ${guide.id}`);
  assert(allowedRouteSourceSnippets.some((snippet) => guide.paragon?.sourceStatus?.includes(snippet)), `Build guide needs player-facing paragon route source status: ${guide.id}`);
  assert(guide.paragon.clickOrder.every((step) => !genericParagonNodePattern.test(step.node || "")), `Build guide paragon route still contains generic click nodes: ${guide.id}`);
  assert(guide.paragon.clickOrder.every((step) => !String(step.reason || "").includes("补足完整")), `Build guide paragon route reason still exposes generation copy: ${guide.id}`);
  assert(guide.paragon.boardOrder.every((board) => !routeEnglishPattern.test([board.name, board.glyph, board.goal].join(" "))), `Build guide paragon boards must be localized to Chinese: ${guide.id}`);
  assert(guide.paragon.clickOrder.every((step) => !routeEnglishPattern.test([step.board, step.node, step.reason].join(" "))), `Build guide paragon click route must be localized to Chinese: ${guide.id}`);
  assert((guide.paragon.glyphs || []).every((glyph) => !routeEnglishPattern.test([glyph.name, glyph.socket, glyph.note].join(" "))), `Build guide paragon glyphs must be localized to Chinese: ${guide.id}`);
  assert(guide.paragon?.pointBands?.length >= 4, `Build guide needs paragon point-band transitions: ${guide.id}`);
  assert(guide.gameplay?.opener?.length && guide.gameplay?.loop?.length && guide.gameplay?.boss?.length, `Build guide needs gameplay sections: ${guide.id}`);
  assert(guide.variants?.length >= 3, `Build guide needs replacement variants: ${guide.id}`);
}
assert(uniquePowerSlotCount > 0 && uniquePowerTextCount / uniquePowerSlotCount >= 0.98, `At least 98% of unique/mythic gear slots need power text, got ${uniquePowerTextCount}/${uniquePowerSlotCount}`);
assert(legendaryAspectSlotCount > 0 && legendaryAspectTextCount / legendaryAspectSlotCount >= 0.4, `At least 40% of legendary aspect slots need community effect text, got ${legendaryAspectTextCount}/${legendaryAspectSlotCount}`);

for (const override of expandCommunityOverrides(communityOverrides)) {
  const guide = buildGuides.builds.find((item) => item.id === override.id);
  assert(guide, `Community override target missing from generated guides: ${override.id}`);
  assert(guide.source?.references?.some((reference) => reference.url === override.sourceReference.url && reference.asOf && reference.sourceSeason), `Community override source reference missing date or season: ${override.id}`);
  assert(guide.dataQuality?.communityVerified?.length >= 1, `Community override needs community data quality marker: ${override.id}`);
}

const frontendText = [
  await readFile(path.join(PROJECT_ROOT, "index.html"), "utf8"),
  await readFile(path.join(PROJECT_ROOT, "public/app.js"), "utf8")
].join("\n");
for (const forbidden of ["模型分", "先选目标", "rationale", "完整 BD 细节", "模型预估", "AI 思考", "模型推理", "候选配装", "配装规划", "配置速查", "完整技能", "完整巅峰", "完整打法", "看完整", "先按这几步", "路线待校准", "待回填", "资料校验中", "资料待校准"]) {
  assert(!frontendText.includes(forbidden), `Frontend still contains non-guide copy: ${forbidden}`);
}
assert(frontendText.includes("renderSeasonBuildMatrix"), "BD library must render a season build matrix by class, archetype and mode");
assert(frontendText.includes("season-build-matrix"), "BD library must expose daily/speed/push comparisons before individual cards");
assert(frontendText.includes("renderRecommendedBuildBoard"), "BD library must render a class-by-mode recommended build entry board");
assert(frontendText.includes("recommended-build-board"), "BD library must expose per-class daily/speed/push entry points");
assert(frontendText.includes("recommendedDirectoryGuidesForCurrentFilters"), "BD recommendation board must use a best-available guide pool instead of hiding classes without current source matches");
assert(frontendText.includes("is-fallback"), "BD recommendation board must visibly mark best-available fallback entries");
assert(frontendText.includes("renderBuildMaturityPanel") && frontendText.includes("build-maturity-panel"), "BD library must expose source maturity before guide cards");
assert(frontendText.includes("build-list-entry-actions") && frontendText.includes("guideSectionUrl(guide, \"gear\")"), "BD sidebar list must link directly to gear, skills, paragon and gameplay sections");
assert(frontendText.includes("renderClassModeCard"), "Class page must render detailed per-mode build cards");
assert(frontendText.includes("renderClassRosterStatus") && frontendText.includes("class-roster-status"), "Class page must expose official class roster and mechanics validation status");
assert(frontendText.includes("classPlayableLabel") && frontendText.includes("classConfidenceLabel"), "Class page must translate class status into player-facing Chinese");
assert(frontendText.includes("class-mode-card__facts") && frontendText.includes("class-mode-card__route") && frontendText.includes("class-mode-card__actions"), "Class build matrix must expose difficulty, stage, ceiling, route preview and section entry links");
assert(frontendText.includes("renderClassBuildFamilySummary") && frontendText.includes("class-build-family__summary") && frontendText.includes("关键部位"), "Class build matrix must expose family-level gear, ceiling and replacement summaries");
assert(frontendText.includes("renderClassArchetypeDecisionTable") && frontendText.includes("class-archetype-decision") && frontendText.includes("流派对照榜") && frontendText.includes("damageModel?.expectedDps"), "Class page must expose an archetype decision table with damage, ceiling, difficulty and replacement tradeoffs");
assert(frontendText.includes("renderClassSeasonCoverage"), "Class page must render cross-season build coverage");
assert(frontendText.includes("class-season-coverage-panel") && frontendText.includes("class-season-coverage-cell"), "Class cross-season coverage must expose season blocks and mode cells");
assert(frontendText.includes("guide-card__quickfacts"), "BD library cards must expose executable gear, skill, paragon and gameplay facts");
assert(frontendText.includes("guide-card__loadout-preview") && frontendText.includes("关键部位配装预览"), "BD library cards must preview multiple gear slots before detail navigation");
assert(frontendText.includes("renderGuideSectionLinks") && frontendText.includes("guide-section-link-row"), "BD library cards must link directly to gear, skill, paragon and gameplay sections");
assert(frontendText.includes("compact-guide-actions"), "BD default recommendation view must expose section links on priority guide cards");
assert(frontendText.includes("技能第一步") && frontendText.includes("巅峰第一步") && frontendText.includes("打法循环"), "BD cards must preview skill, paragon and gameplay execution before detail navigation");
assert(frontendText.includes("renderEquipmentUsageMatrix"), "Equipment detail must render a usage matrix for related builds");
assert(frontendText.includes("equipment-usage-matrix"), "Equipment detail must expose class, build, mode, slot and replacement status for related builds");
assert(frontendText.includes("renderEquipmentUsageOverview") && frontendText.includes("equipment-usage-overview"), "Equipment detail must summarize related build usage before the full matrix");
assert(frontendText.includes("equipment-usage-actions") && frontendText.includes("guideSectionUrl(guide, \"skills\")") && frontendText.includes("guideSectionUrl(guide, \"paragon\")"), "Equipment usage matrix must link to gear, skills and paragon sections");
assert(frontendText.includes("renderAspectUsageOverview") && frontendText.includes("aspect-usage-overview"), "Aspect detail must summarize related build usage before the full list");
assert(frontendText.includes("aspect-use-card") && frontendText.includes("guideSectionUrl({ id: use.guideId }, \"skills\")") && frontendText.includes("guideSectionUrl({ id: use.guideId }, \"paragon\")"), "Aspect usage list must link to gear, skills and paragon sections");
assert(frontendText.includes("execution-proof-strip") && frontendText.includes("完整可执行 BD") && frontendText.includes("三用途对比"), "Sources page must render executable BD proof summary");
assert(frontendText.includes("requirement-coverage-grid") && frontendText.includes("BD 执行信息覆盖"), "Sources page must render player-facing BD requirement coverage");
assert(frontendText.includes("renderLoadoutBoard"), "BD detail must render a paper-doll loadout board");
assert(frontendText.includes("renderGuideReadinessPanel") && frontendText.includes("guide-readiness__actions"), "BD detail must expose copy-readiness and section actions");
assert(frontendText.includes("renderRouteSourcePanel") && frontendText.includes("route-source-panel__actions"), "BD skill/paragon detail pages must expose route source state and section actions");
assert(frontendText.includes("loadout-paper-doll"), "BD detail must expose a fixed 11-slot paper-doll layout");
assert(frontendText.includes("renderBuildVersionSwitcher"), "BD detail must render same-archetype daily/speed/push version switching");
assert(frontendText.includes("sameClassBuildFamilies"), "BD detail must group same-season same-class build families");
assert(frontendText.includes("guide-version-tabs"), "BD detail must expose visible daily/speed/push version tabs");
assert(frontendText.includes("guide-family-matrix") && frontendText.includes("guide-family-card") && frontendText.includes("guide-family-mode"), "BD detail must expose same-class archetype families with mode, difficulty, ceiling and source state");
assert(frontendText.includes("renderCurrentArchetypeComparison") && frontendText.includes("guide-mode-comparison") && frontendText.includes("guide-mode-row"), "BD detail must expose a same-archetype daily/speed/push comparison table");
assert(frontendText.includes("技能第一步") || frontendText.includes("skillTree.pointOrder?.[0]"), "Same-archetype comparison must expose skill route entry points");
assert(frontendText.includes("firstParagon") && frontendText.includes("gameplay?.loop"), "Same-archetype comparison must expose paragon and gameplay entry points");
assert(frontendText.includes("renderGuideCopyOverview"), "BD hero must render a copy overview before long sections");
assert(frontendText.includes("guide-copy-overview") && frontendText.includes("抄作业速览"), "BD copy overview must expose gear, skills, paragon, gameplay and replacement entry points");
assert(frontendText.includes("renderGuideHeroExecutionStrip") && frontendText.includes("guide-hero-execution") && frontendText.includes("BD 首屏执行速览"), "BD detail hero must expose immediate gear, skill, paragon and gameplay execution facts");
assert(frontendText.includes("guide-hero-execution__actions") && frontendText.includes("BD 配置") && frontendText.includes("打法分区"), "BD detail hero execution strip must link to planner, gear, skills, paragon and gameplay sections");
assert(frontendText.includes("renderGuideHeroModeTabs") && frontendText.includes("guide-hero-modes") && frontendText.includes("同流派用途版本切换"), "BD detail hero must expose daily/speed/push version switching before long sections");
assert(frontendText.includes("buildVersionModeOrder.map((mode)") && frontendText.includes("guideCeilingTier(item)") && frontendText.includes("guideSourceLabel(item)"), "BD hero mode tabs must expose mode, ceiling, difficulty and source state");
assert(frontendText.includes("renderGuideSectionDirectory") && frontendText.includes("guide-section-directory"), "BD overview must expose a section directory for gear, skills, paragon, gameplay, variants and sources");
assert(frontendText.includes("renderBuildReadinessChecklist") && frontendText.includes("build-checklist"), "BD overview must expose a readiness checklist for gear, replacement, skill, paragon, gameplay and source checks");
assert(frontendText.includes("装备硬需求") && frontendText.includes("可替换部位") && frontendText.includes("技能起步") && frontendText.includes("巅峰起步") && frontendText.includes("打法窗口"), "BD readiness checklist must expose actionable player checklist groups");
assert(frontendText.includes("guide.guideCompleteness"), "BD detail must read generated completeness data");
assert(frontendText.includes("renderBuildPlannerSheet"), "BD detail must expose a dedicated copy-ready planner sheet section");
assert(frontendText.includes("planner-sheet") && frontendText.includes("planner-gear-row") && frontendText.includes("planner-skillbar") && frontendText.includes("planner-boards") && frontendText.includes("planner-gameplay"), "BD planner sheet must expose gear, skill, paragon and gameplay in one execution view");
assert(frontendText.includes("planner-loadout-overview") && frontendText.includes("配置页 11 部位装备图标速览") && frontendText.includes("renderLoadoutStrip(guide)"), "BD planner sheet must expose an 11-slot icon loadout overview before the detailed gear table");
assert(frontendText.includes("renderPlannerRouteOverview") && frontendText.includes("planner-route-overview") && frontendText.includes("技能加点前 3 步") && frontendText.includes("巅峰点击前 3 步") && frontendText.includes("打法起手"), "BD planner sheet must expose a copy-ready skill, paragon and gameplay route overview before long tables");
assert(frontendText.includes("技能页") && frontendText.includes("巅峰页") && frontendText.includes("打法页"), "BD planner route overview must link to dedicated skill, paragon and gameplay detail sections");
assert(frontendText.includes("planner: () => renderGuideDetailSection(\"BD 配置\"") && !frontendText.includes("${renderBuildManualPanel(guide)}") && !frontendText.includes("${renderBuildDamageModel(guide)}\n    `, \"planner\")"), "BD planner section must be a focused configuration page, not a mixed manual or damage page");
assert(frontendText.includes("[\"planner\", \"配置\"]"), "BD section navigation must include the dedicated planner sheet section");
assert(frontendText.includes("const defaultGuideSection = \"planner\""), "BD detail default route must open the copy-ready planner section");
assert(frontendText.includes("selectedGuideSection: \"planner\""), "Initial BD detail state must default to the planner section");
assert(frontendText.includes("guideSectionUrl(guide, defaultGuideSection)"), "BD guideUrl must link directly to the planner section instead of a generic overview");
assert(frontendText.includes("renderBuildDamageModel") && frontendText.includes("damage-model-panel") && frontendText.includes("[\"damage\", \"伤害\"]"), "BD detail must expose a dedicated damage breakdown section");
assert(!frontendText.includes("${renderBuildDossier(guide)}"), "BD hero must stay lightweight and not render the old dense dossier block");
assert(frontendText.includes("renderCoreRequirementList") && frontendText.includes("core-requirement-list"), "BD sidebar must render structured core requirements from resolved gear slots");
assert(frontendText.includes("gearPowerDisplay"), "BD detail must render concrete unique/aspect power labels instead of visible placeholder labels");
assert(frontendText.includes("guideSectionUrl"), "BD section navigation must link to stable section URLs");
assert(frontendText.includes("guide-section-page"), "BD detail must render the active section as a dedicated detail page");
assert(frontendText.includes("renderGuideActiveSection"), "BD detail must render one active guide section instead of concentrating every section on one page");
assert(frontendText.includes("renderGuideSectionSwitcher") && frontendText.includes("guide-section-switcher"), "BD active section pages must expose in-content section switching");
assert(frontendText.includes("guideDetailSectionOrder"), "BD detail must define a stable full-section reading order");
assert(frontendText.includes("renderProgressionPlan"), "BD detail must render leveling-to-endgame progression");
assert(frontendText.includes("progression-plan"), "BD detail must expose progression stages and checkpoints");
assert(frontendText.includes("renderGearSummaryMatrix"), "BD gear section must render a complete 11-slot gear summary matrix");
assert(frontendText.includes("gear-summary-matrix"), "BD gear section must expose target items, replacement status and affix direction before long cards");
assert(frontendText.includes("renderRouteOverview"), "BD overview must render skill and paragon execution route overview");
assert(frontendText.includes("route-overview__skillbar"), "BD overview must expose the six-skill route overview");
assert(frontendText.includes("renderSkillRouteMatrix"), "BD skill section must render a readable skill point-order matrix");
assert(frontendText.includes("skill-route-matrix"), "BD skill section must expose level range, skill, points and reason before long notes");
assert(frontendText.includes("renderParagonRouteMatrix"), "BD paragon section must render a readable paragon click-order matrix");
assert(frontendText.includes("paragon-route-matrix"), "BD paragon section must expose board order, glyphs and click route before long notes");
assert(frontendText.includes("renderGameplayOverview"), "BD overview must render combat loop overview");
assert(frontendText.includes("combat-overview__grid"), "BD overview must expose opener, loop, defense and mistakes");
assert(frontendText.includes("renderCombatFlowMatrix"), "BD gameplay section must render a stage-based combat flow matrix");
assert(frontendText.includes("combat-flow-matrix"), "BD gameplay section must expose opener, loop, boss, defense, speed and mistakes before long notes");
assert(frontendText.includes("renderReplacementMatrix"), "BD variants section must render an all-slot replacement matrix");
assert(frontendText.includes("replacement-matrix"), "BD variants section must expose replacement status, first alternative and tradeoff for every slot");

const generatedText = [
  await readFile(path.join(PROJECT_ROOT, "data/generated/build-simulations.json"), "utf8"),
  await readFile(path.join(PROJECT_ROOT, "data/generated/build-guides.json"), "utf8")
].join("\n");
assert(!generatedText.includes("\"rationale\""), "Generated player data must not expose rationale fields");

const sample = calculateExpectedDps({
  weaponDamage: 1000,
  skillCoefficient: 1,
  primaryStat: 1000,
  additiveBonuses: [0.5],
  multiplicativeBonuses: [0.2],
  critical: { chance: 0.5, damageMultiplier: 0 },
  vulnerable: { uptime: 1, damageMultiplier: 0 },
  overpower: { chance: 0, damageMultiplier: 0 },
  attacksPerSecond: 1
});
assert(Math.abs(sample.expectedDps - 5400) < 0.0001, `Unexpected sample DPS: ${sample.expectedDps}`);

const generatedPath = "data/generated/official-3.1.0-guaranteed-unique-affixes.json";
if (existsSync(path.join(PROJECT_ROOT, generatedPath))) {
  const generated = await readJson(generatedPath);
  assert(generated.itemCount > 100, "Generated unique affix seed should contain more than 100 items");
  assert(generated.items.every((item) => item.guaranteedAffixes.length > 0), "Each generated item needs guaranteed affixes");
}

for (const frontendFile of [
  "index.html",
  "public/styles.css",
  "public/app.js",
  "public/assets/hero-sanctuary.png",
  "public/assets/icon-weapon.png",
  "public/assets/icon-armor.png",
  "public/assets/icon-jewelry.png",
  "public/assets/icon-utility.png"
]) {
  assert(existsSync(path.join(PROJECT_ROOT, frontendFile)), `Missing frontend file: ${frontendFile}`);
}

console.log("verify ok");
