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
const simulations = await readJson("data/generated/build-simulations.json");
const buildGuides = await readJson("data/generated/build-guides.json");
const aspectIndex = await readJson("data/generated/aspect-index.json");
const siteCoverage = await readJson("data/generated/site-coverage.json");
const iconIndex = await readJson("data/generated/d4builds-icon-index.json");

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
assert(classIds.includes("paladin") && classIds.includes("warlock"), "Lord of Hatred class roster must include Paladin and Warlock");

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
assert(aspectIndex.communityCoverage?.sourceId === "d2core_aspect_database", "Aspect index must expose community source coverage");
assert(aspectIndex.aspects.some((aspect) => aspect.dataStatus?.scope === "community_database_reference" && aspect.database?.zhEffect && aspect.database?.zhAllowedSlots?.length), "Aspect index should enrich matched aspects with community effect text and slots");
assert(aspectIndex.aspects.some((aspect) => aspect.dataStatus?.scope === "derived_from_build_gear_slots" && !aspect.database), "Aspect index must keep unmatched template aspects clearly derived-only");
assert(aspectIndex.aspects.every((aspect) => ["derived_from_build_gear_slots", "community_database_reference"].includes(aspect.dataStatus?.scope)), "Each aspect must disclose derived or community scope");
assert(aspectIndex.aspects.every((aspect) => !(aspectIndex.ignoredNames || []).includes(aspect.name)), "Aspect index must not include placeholder aspect names");
assert(aspectIndex.aspects.every((aspect) => aspect.slotUsage?.length >= 1 && aspect.buildUses?.length >= aspect.guideCount), "Each aspect needs slot usage and related builds");

assert(siteCoverage.scope === "player_site_data_coverage_and_storage_usage", "Site coverage scope mismatch");
assert(siteCoverage.buildCoverage?.total === buildGuides.builds.length, "Site coverage build count mismatch");
assert(siteCoverage.buildCoverage?.classes === classes.length, "Site coverage class count mismatch");
assert(siteCoverage.buildCoverage?.seasons === simulations.seasons.length, "Site coverage season count mismatch");
assert(siteCoverage.equipmentCoverage?.total === equipmentLibrary.items.length, "Site coverage equipment count mismatch");
assert(siteCoverage.aspectCoverage?.total === aspectIndex.aspects.length, "Site coverage aspect count mismatch");
assert(siteCoverage.sourceCoverage?.total === sources.length, "Site coverage source count mismatch");
assert(siteCoverage.storageLayers?.length >= 4, "Site coverage must describe storage layers");
assert(siteCoverage.buildCoverage.classMatrix?.length === simulations.seasons.length, "Site coverage needs per-season class matrix");
assert(siteCoverage.frontendDataContracts?.some((contract) => contract.component === "RecommendedBuildBoard"), "Site coverage must describe the build recommendation board data contract");
assert(siteCoverage.frontendDataContracts?.some((contract) => contract.component === "BuildDetailLayout"), "Site coverage must describe the build detail data contract");
assert(siteCoverage.frontendDataContracts?.some((contract) => contract.fields?.includes("gearSlots")), "Frontend data contracts must expose full build detail fields");
assert(siteCoverage.buildIntegrity?.completeGearSlotBuilds === buildGuides.builds.length, "Site coverage must prove every BD has 11 gear slots");
assert(siteCoverage.buildIntegrity?.skillRouteBuilds === buildGuides.builds.length, "Site coverage must prove every BD has skill routes");
assert(siteCoverage.buildIntegrity?.paragonRouteBuilds === buildGuides.builds.length, "Site coverage must prove every BD has paragon routes");
assert(siteCoverage.buildIntegrity?.gameplayBuilds === buildGuides.builds.length, "Site coverage must prove every BD has gameplay instructions");
assert(siteCoverage.buildIntegrity?.progressionBuilds === buildGuides.builds.length, "Site coverage must prove every BD has progression instructions");
assert(siteCoverage.buildIntegrity?.replacementBuilds === buildGuides.builds.length, "Site coverage must prove every BD has replacement data");

const guideIds = new Set();
for (const guide of buildGuides.builds) {
  assert(!guideIds.has(guide.id), `Duplicate build guide id: ${guide.id}`);
  guideIds.add(guide.id);
  assert(classIds.includes(guide.taxonomy.classId), `Unknown build guide class: ${guide.id}`);
  assert(["pit_push", "speed_farm", "daily"].includes(guide.taxonomy.mode), `Unknown build guide mode: ${guide.id}`);
  assert(guide.title && guide.summary?.oneLine, `Build guide needs Chinese title and summary: ${guide.id}`);
  assert(guide.formationDifficulty?.label && guide.formationDifficulty?.reasons?.length >= 2, `Build guide needs formation difficulty: ${guide.id}`);
  assert(guide.ceiling?.tier && typeof guide.ceiling.pit150Minutes === "number", `Build guide needs ceiling reference: ${guide.id}`);
  assert(guide.ceiling?.confidence > 0 && guide.ceiling?.sourceStatus && guide.ceiling?.evidence?.length >= 2, `Build guide needs ceiling evidence and confidence: ${guide.id}`);
  if (!["community_reference", "cross_season_reference"].includes(guide.ceiling.sourceStatus)) {
    assert(guide.ceiling.displayTier?.includes("模板") && guide.ceiling.label?.includes("模板参考"), `Template guide ceiling must be labeled as template reference: ${guide.id}`);
  }
  assert(guide.gearSlots?.length === buildGuides.slotOrder.length, `Build guide needs every gear slot: ${guide.id}`);
  assert(guide.gearSlots.every((slot) => slot.zhSlotName && typeof slot.replaceable === "boolean" && slot.target?.zhName), `Each gear slot needs replacement status and target item: ${guide.id}`);
  assert(guide.gearSlots.every((slot) => !suspiciousTransliteration.test(slot.target.zhName)), `Build guide gear names should be readable Chinese: ${guide.id}`);
  assert(guide.gearSlots.every((slot) => slot.affixes?.length >= 3 && slot.alternatives?.length >= 2), `Each gear slot needs affixes and alternatives: ${guide.id}`);
  assert(guide.gearSlots.every((slot) => slot.upgradePath?.length >= 3 && (slot.dataStatus || slot.aspect?.sourceStatus)), `Each gear slot needs upgrade path and source status: ${guide.id}`);
  assert(guide.progression?.stages?.length >= 4, `Build guide needs leveling-to-endgame progression stages: ${guide.id}`);
  assert(guide.progression?.checkpoints?.length >= 4, `Build guide needs progression checkpoints: ${guide.id}`);
  assert(guide.progression.stages.every((stage) => stage.levelRange && stage.gearFocus && stage.skillFocus && stage.paragonFocus && stage.gameplayFocus && stage.swapRule), `Each progression stage needs gear, skill, paragon, gameplay and swap rules: ${guide.id}`);
  for (const slot of guide.gearSlots) {
    verifyEquipmentReference(slot.target, `${guide.id}/${slot.slotId}`);
    for (const alternative of slot.alternatives) verifyEquipmentReference(alternative, `${guide.id}/${slot.slotId}/alternative`);
  }
  assert(guide.coreUniques?.length >= 2 || guide.coreAspects?.length >= 4, `Build guide needs core uniques/aspects: ${guide.id}`);
  for (const coreUnique of guide.coreUniques || []) {
    verifyEquipmentReference(coreUnique, `${guide.id}/coreUniques/${coreUnique.slotId}`);
    const slot = guide.gearSlots.find((item) => item.slotId === coreUnique.slotId);
    assert(slot?.target.zhName === coreUnique.zhName, `Core unique summary must match gear slot target name: ${guide.id}/${coreUnique.slotId}`);
    assert((slot?.target.itemId ?? null) === (coreUnique.itemId ?? null), `Core unique summary must match gear slot target itemId: ${guide.id}/${coreUnique.slotId}`);
  }
  assert(guide.skillTree?.skillBar?.length === 6, `Build guide needs six skill bar entries: ${guide.id}`);
  assert(guide.skillTree?.pointOrder?.length >= 10, `Build guide needs skill point order: ${guide.id}`);
  assert(guide.skillTree?.classMechanic, `Build guide needs class mechanic text: ${guide.id}`);
  assert(guide.paragon?.boardOrder?.length >= 4, `Build guide needs paragon boards: ${guide.id}`);
  assert(guide.paragon?.clickOrder?.length >= 10, `Build guide needs paragon click order: ${guide.id}`);
  assert(guide.paragon?.pointBands?.length >= 4, `Build guide needs paragon point-band transitions: ${guide.id}`);
  assert(guide.gameplay?.opener?.length && guide.gameplay?.loop?.length && guide.gameplay?.boss?.length, `Build guide needs gameplay sections: ${guide.id}`);
  assert(guide.variants?.length >= 3, `Build guide needs replacement variants: ${guide.id}`);
}

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
for (const forbidden of ["模型分", "先选目标", "rationale", "完整 BD 细节", "模型预估"]) {
  assert(!frontendText.includes(forbidden), `Frontend still contains non-guide copy: ${forbidden}`);
}
assert(frontendText.includes("renderSeasonBuildMatrix"), "BD library must render a season build matrix by class, archetype and mode");
assert(frontendText.includes("season-build-matrix"), "BD library must expose daily/speed/push comparisons before individual cards");
assert(frontendText.includes("renderRecommendedBuildBoard"), "BD library must render a class-by-mode recommended build entry board");
assert(frontendText.includes("recommended-build-board"), "BD library must expose per-class daily/speed/push entry points");
assert(frontendText.includes("guide-card__quickfacts"), "BD library cards must expose executable gear, skill, paragon and gameplay facts");
assert(frontendText.includes("技能第一步") && frontendText.includes("巅峰第一步") && frontendText.includes("打法循环"), "BD cards must preview skill, paragon and gameplay execution before detail navigation");
assert(frontendText.includes("renderEquipmentUsageMatrix"), "Equipment detail must render a usage matrix for related builds");
assert(frontendText.includes("equipment-usage-matrix"), "Equipment detail must expose class, build, mode, slot and replacement status for related builds");
assert(frontendText.includes("renderLoadoutBoard"), "BD detail must render a paper-doll loadout board");
assert(frontendText.includes("loadout-paper-doll"), "BD detail must expose a fixed 11-slot paper-doll layout");
assert(frontendText.includes("renderBuildVersionSwitcher"), "BD detail must render same-archetype daily/speed/push version switching");
assert(frontendText.includes("guide-version-tabs"), "BD detail must expose visible version tabs near the hero");
assert(frontendText.includes("renderBuildManualPanel"), "BD overview must render a copy-ready execution manual");
assert(frontendText.includes("build-manual-panel"), "BD overview must expose gear, skill, paragon and gameplay before long sections");
assert(frontendText.includes("manual-gear-row"), "BD execution manual must expose all gear slots as jump targets");
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
