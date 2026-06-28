import { calculateExpectedDps } from "../src/damage/calculate.js";
import { summarizeGearScore } from "../src/build/score.js";
import { zh } from "./lib/zh-localization.mjs";

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

const breakdownLabels = {
  baseSkillDamage: "基础技能伤害",
  primaryStatFactor: "主属性乘区",
  additiveFactor: "加伤池",
  independentMultiplier: "独立乘区",
  criticalFactor: "暴击期望",
  vulnerableFactor: "易伤期望",
  overpowerFactor: "压制期望"
};

const output = {
  伤害样例: {
    期望每秒伤害: sampleDamage.expectedDps,
    单次命中: {
      最终伤害: sampleDamage.hit.finalDamage,
      拆分: Object.fromEntries(
        Object.entries(sampleDamage.hit.breakdown).map(([key, value]) => [breakdownLabels[key] ?? key, value])
      ),
      假设: sampleDamage.hit.assumptions
    }
  },
  装备评分样例: {
    总分: sampleGear.totalScore,
    词缀: sampleGear.scoredAffixes.map((affix) => ({
      名称: zh.affix(affix.name),
      分类: zh.stat(affix.categoryId),
      归一化数值: affix.normalizedValue,
      得分: affix.score
    }))
  }
};

console.log(JSON.stringify(output, null, 2));
