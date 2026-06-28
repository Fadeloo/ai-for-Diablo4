import { calculateExpectedDps } from "../src/damage/calculate.js";
import { summarizeGearScore } from "../src/build/score.js";

const sampleDamage = calculateExpectedDps({
  weaponDamage: 1800,
  skillCoefficient: 1.35,
  primaryStat: 1200,
  additiveBonuses: [0.45, 0.3],
  multiplicativeBonuses: [0.2, 0.15],
  critical: { chance: 0.35, damageMultiplier: 0.25 },
  vulnerable: { uptime: 0.7, damageMultiplier: 0.15 },
  overpower: { chance: 0.03, damageMultiplier: 0.5 },
  attacksPerSecond: 1.25
});

const sampleGear = summarizeGearScore(
  [
    { name: "Weapon Damage", categoryId: "weapon_damage", normalizedValue: 1 },
    { name: "Critical Strike Chance", categoryId: "critical_strike", normalizedValue: 0.8 },
    { name: "Movement Speed", categoryId: "mobility", normalizedValue: 0.5 }
  ],
  {
    weapon_damage: 10,
    critical_strike: 6,
    mobility: 4
  }
);

console.log(JSON.stringify({ sampleDamage, sampleGear }, null, 2));
