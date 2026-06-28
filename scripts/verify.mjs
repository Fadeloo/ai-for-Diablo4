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

console.log("verify ok");
