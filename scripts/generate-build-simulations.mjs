import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(new URL(".", import.meta.url).pathname, "..");
const classPath = path.join(root, "data/classes/classes.json");
const archetypePath = path.join(root, "data/builds/archetypes.json");
const equipmentPath = path.join(root, "data/equipment/equipment-library.json");
const output = path.join(root, "data/generated/build-simulations.json");

const seasons = [
  {
    id: "s14",
    label: "S14 Death Awakening",
    horizon: "2026-06-30 season launch",
    confidenceOffset: 0,
    assumption: "Official 3.1.0 notes are available; class power still needs live leaderboard validation."
  },
  {
    id: "s15",
    label: "S15 projection",
    horizon: "next season after S14",
    confidenceOffset: -0.1,
    assumption: "Speculative: assumes follow-up balance tones down obvious S14 outliers and rewards resilient archetypes."
  },
  {
    id: "s16",
    label: "S16 projection",
    horizon: "two seasons after S14",
    confidenceOffset: -0.18,
    assumption: "Speculative: assumes new seasonal mechanic rotates some speed-farm winners but core stat priorities remain useful."
  }
];

const modeProfiles = {
  pit_push: {
    zhName: "冲层",
    weights: {
      weapon_damage: 3,
      all_damage_multiplier: 3,
      elemental_damage_multiplier: 2.8,
      critical_strike: 2.4,
      vulnerable: 2.4,
      overpower: 2.2,
      survivability: 2.1,
      skill_rank: 2,
      cooldown_reduction: 1.4,
      resource: 1.1,
      attack_speed: 1,
      mobility: 0.6
    }
  },
  speed_farm: {
    zhName: "速刷",
    weights: {
      mobility: 3,
      attack_speed: 2.8,
      cooldown_reduction: 2.5,
      resource: 2.3,
      weapon_damage: 1.8,
      all_damage_multiplier: 1.6,
      critical_strike: 1.5,
      lucky_hit: 1.4,
      skill_rank: 1.2,
      survivability: 0.8
    }
  },
  daily: {
    zhName: "日常",
    weights: {
      survivability: 2.7,
      resource: 2.5,
      mobility: 2.2,
      cooldown_reduction: 2,
      skill_rank: 1.8,
      weapon_damage: 1.7,
      attack_speed: 1.5,
      all_damage_multiplier: 1.4,
      lucky_hit: 1.2
    }
  }
};

const classSeeds = {
  barbarian: { push: 87, speed: 76, daily: 82, volatility: 0.12 },
  druid: { push: 82, speed: 77, daily: 80, volatility: 0.16 },
  necromancer: { push: 86, speed: 72, daily: 84, volatility: 0.14 },
  paladin: { push: 84, speed: 73, daily: 85, volatility: 0.22 },
  rogue: { push: 81, speed: 90, daily: 82, volatility: 0.12 },
  sorcerer: { push: 83, speed: 86, daily: 79, volatility: 0.15 },
  spiritborn: { push: 88, speed: 88, daily: 83, volatility: 0.18 },
  warlock: { push: 85, speed: 78, daily: 86, volatility: 0.23 }
};

function scoreArchetype(archetype, mode, classId, seasonIndex, equipmentItems) {
  const profile = modeProfiles[mode];
  const seed = classSeeds[classId] ?? { push: 80, speed: 80, daily: 80, volatility: 0.18 };
  const modeBase = mode === "pit_push" ? seed.push : mode === "speed_farm" ? seed.speed : seed.daily;
  const statScore = archetype.primaryStats.reduce((total, stat) => total + (profile.weights[stat] ?? 0.8), 0);
  const classItems = equipmentItems.filter((item) => item.classRestriction === "All Classes" || item.classRestriction.toLowerCase() === classId);
  const synergyItems = classItems
    .map((item) => ({
      item,
      score: item.categories.reduce((total, category) => total + (profile.weights[category] ?? 0), 0)
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);
  const synergyScore = synergyItems.reduce((total, entry) => total + entry.score, 0) / 4;
  const uncertaintyPenalty = seasonIndex * seed.volatility * 8;
  const score = Math.round(Math.min(98, modeBase * 0.72 + statScore * 3.1 + synergyScore * 0.42 - uncertaintyPenalty));
  const pit150Minutes = Math.max(
    3.8,
    22.4 - score * 0.18 + seed.volatility * 4 + (mode === "speed_farm" ? -0.55 : mode === "daily" ? 0.65 : 0)
  );
  return {
    archetypeId: archetype.id,
    archetypeName: archetype.zhName,
    score,
    predictedPit150Minutes: Number(pit150Minutes.toFixed(1)),
    confidence: Number(Math.max(0.35, 0.78 - seasonIndex * 0.11 - seed.volatility * 0.5).toFixed(2)),
    keyStats: archetype.primaryStats,
    recommendedItems: synergyItems.map(({ item }) => ({
      id: item.id,
      name: item.name,
      visualType: item.visualType,
      image: item.image,
      externalImage: item.externalImage,
      guaranteedAffixes: item.guaranteedAffixes.map((affix) => affix.name)
    })),
    rationale: [
      `${profile.zhName}模型优先 ${archetype.primaryStats.slice(0, 3).join(" / ")}。`,
      `装备协同来自官方 3.1.0 guaranteed affix 种子，完整暗金特效仍待回填。`
    ]
  };
}

const classes = JSON.parse(await readFile(classPath, "utf8"));
const archetypeGroups = JSON.parse(await readFile(archetypePath, "utf8"));
const equipment = JSON.parse(await readFile(equipmentPath, "utf8"));
const rows = [];

for (const [seasonIndex, season] of seasons.entries()) {
  for (const classInfo of classes) {
    const archetypes = archetypeGroups.find((group) => group.classId === classInfo.id)?.archetypes ?? [];
    const modes = {};
    for (const mode of Object.keys(modeProfiles)) {
      const ranked = archetypes
        .map((archetype) => scoreArchetype(archetype, mode, classInfo.id, seasonIndex, equipment.items))
        .sort((a, b) => b.score - a.score);
      modes[mode] = {
        modeName: modeProfiles[mode].zhName,
        topBuilds: ranked.slice(0, 3),
        pit150SpeedPrediction: {
          bestMinutes: ranked[0]?.predictedPit150Minutes ?? null,
          classRankScore: ranked[0]?.score ?? null,
          caveat: "Not a leaderboard result. This is a model estimate pending live clear data."
        }
      };
    }
    rows.push({
      seasonId: season.id,
      seasonLabel: season.label,
      horizon: season.horizon,
      classId: classInfo.id,
      className: classInfo.displayName,
      zhName: classInfo.zhName,
      modes,
      assumption: season.assumption,
      modelStatus: season.id === "s14" ? "official_patch_informed_prediction" : "speculative_prediction"
    });
  }
}

const payload = {
  generatedAt: new Date().toISOString(),
  scope: "next_three_season_build_and_pit150_prediction_matrix",
  warning: "Predictions are model output, not facts. Update with live leaderboard and patch data after each season starts.",
  seasons,
  modeProfiles,
  rows
};

await mkdir(path.dirname(output), { recursive: true });
await writeFile(output, `${JSON.stringify(payload, null, 2)}\n`);
console.log(`Wrote ${rows.length} class-season simulation rows to ${path.relative(root, output)}`);
