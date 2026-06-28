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

const version = await readJson("data/metadata/version-baseline.json");
const classes = await readJson("data/classes/classes.json");
const categories = await readJson("data/equipment/stat-categories.json");
const archetypes = await readJson("data/builds/archetypes.json");
const seasonPlans = await readJson("data/builds/season-start-plans.json");
const sources = await readJson("data/sources/source-registry.json");
const features = await readJson("data/features/feature-map.json");
const equipmentLibrary = await readJson("data/equipment/equipment-library.json");
const simulations = await readJson("data/generated/build-simulations.json");
const iconIndex = await readJson("data/generated/d4builds-icon-index.json");

assert(version.effectiveLiveVersion.patch === "3.0.4", "Expected live patch 3.0.4");
assert(version.publishedUpcomingVersion.patch === "3.1.0", "Expected upcoming patch 3.1.0");
assert(Date.parse(version.effectiveLiveVersion.releaseDate) <= Date.parse(version.asOf), "Live patch date must not be in the future");
assert(Date.parse(version.publishedUpcomingVersion.releaseDate) > Date.parse(version.asOf), "Upcoming patch should be future-dated relative to asOf");

const classIds = classes.map((item) => item.id).sort();
assert(classIds.length === 8, "Expected 8 classes");
assert(JSON.stringify(classIds) === JSON.stringify([...version.classSet].sort()), "Class set mismatch");

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
assert(features.length >= 8, "Feature map should cover core guide modules");
assert(features.some((feature) => feature.id === "equipment_database"), "Feature map must include equipment database");
assert(features.some((feature) => feature.id === "damage_calculation"), "Feature map must include damage calculation");

assert(equipmentLibrary.scope === "equipment_library_seed_from_official_unique_guaranteed_affixes", "Equipment library scope mismatch");
assert(equipmentLibrary.itemCount === equipmentLibrary.items.length, "Equipment item count mismatch");
assert(equipmentLibrary.itemCount > 100, "Equipment library seed should contain more than 100 records");
assert(equipmentLibrary.limitations.some((line) => line.includes("not the full Diablo IV equipment database")), "Equipment library must disclose incomplete scope");
assert(equipmentLibrary.items.every((item) => item.image && item.guaranteedAffixes.length > 0), "Each equipment record needs an image path and guaranteed affixes");
assert(equipmentLibrary.items.every((item) => item.zhName && !/[A-Za-z]/.test(item.zhName)), "Each equipment record needs a Chinese display name");
assert(equipmentLibrary.items.every((item) => item.zhGuaranteedAffixes?.length === item.guaranteedAffixes.length), "Each equipment affix needs a Chinese display label");
assert(equipmentLibrary.items.every((item) => item.zhGuaranteedAffixes.every((label) => !/[A-Za-z]/.test(label))), "Chinese affix labels must not contain English words");

assert(iconIndex.source.usage === "external_url_reference_only_no_asset_download", "Icon index must store URLs only");
assert(iconIndex.itemCount === equipmentLibrary.itemCount, "Icon index must cover the equipment seed");
assert(iconIndex.matchedCount === iconIndex.itemCount, "Every seeded equipment item should have an external icon URL");
assert(iconIndex.items.every((item) => item.iconUrl?.startsWith("https://sunderarmor.com/DIABLO4/Uniques/2/")), "External icon URLs must use the expected HTTPS asset host path");
assert(equipmentLibrary.items.every((item) => item.externalImage?.startsWith("https://sunderarmor.com/DIABLO4/Uniques/2/")), "Each equipment item should expose an external icon URL");

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
  }
}

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
