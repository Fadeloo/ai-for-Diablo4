function toFraction(value, label) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    throw new TypeError(`${label} 必须是数字`);
  }
  return Math.abs(value) > 1 ? value / 100 : value;
}

function sumFractions(values = [], label = "bonus") {
  return values.reduce((total, value, index) => total + toFraction(value, `${label}[${index}]`), 0);
}

function productMultipliers(values = [], label = "multiplier") {
  return values.reduce((total, value, index) => total * (1 + toFraction(value, `${label}[${index}]`)), 1);
}

function expectedEventFactor({ chance = 0, uptime, baseMultiplier = 1, extraMultiplier = 0 }, label) {
  const eventRate = toFraction(uptime ?? chance, `${label}.chance`);
  const base = typeof baseMultiplier === "number" ? baseMultiplier : 1;
  const extra = 1 + toFraction(extraMultiplier, `${label}.extraMultiplier`);
  return 1 + eventRate * (base * extra - 1);
}

export function calculateHitDamage(input) {
  const weaponDamage = Number(input.weaponDamage ?? 0);
  const skillCoefficient = Number(input.skillCoefficient ?? 1);
  if (weaponDamage <= 0) {
    throw new RangeError("武器伤害必须大于 0");
  }
  if (skillCoefficient <= 0) {
    throw new RangeError("技能系数必须大于 0");
  }

  const baseSkillDamage = weaponDamage * skillCoefficient;
  const primaryStatFactor = 1 + Number(input.primaryStat ?? 0) / 1000;
  const additiveFactor = 1 + sumFractions(input.additiveBonuses, "additiveBonuses");
  const independentMultiplier = productMultipliers(input.multiplicativeBonuses, "multiplicativeBonuses");

  const criticalFactor = expectedEventFactor(
    {
      chance: input.critical?.chance ?? 0,
      baseMultiplier: input.critical?.baseMultiplier ?? 1.5,
      extraMultiplier: input.critical?.damageMultiplier ?? 0
    },
    "critical"
  );
  const vulnerableFactor = expectedEventFactor(
    {
      uptime: input.vulnerable?.uptime ?? 0,
      baseMultiplier: input.vulnerable?.baseMultiplier ?? 1.2,
      extraMultiplier: input.vulnerable?.damageMultiplier ?? 0
    },
    "vulnerable"
  );
  const overpowerFactor = expectedEventFactor(
    {
      chance: input.overpower?.chance ?? 0,
      baseMultiplier: input.overpower?.baseMultiplier ?? 1.5,
      extraMultiplier: input.overpower?.damageMultiplier ?? 0
    },
    "overpower"
  );

  const finalDamage =
    baseSkillDamage *
    primaryStatFactor *
    additiveFactor *
    independentMultiplier *
    criticalFactor *
    vulnerableFactor *
    overpowerFactor;

  return {
    finalDamage,
    breakdown: {
      baseSkillDamage,
      primaryStatFactor,
      additiveFactor,
      independentMultiplier,
      criticalFactor,
      vulnerableFactor,
      overpowerFactor
    },
    assumptions: [
      "主属性按常见的每 10 点主属性提高 1% 技能伤害模型处理。",
      "暴击、易伤和压制按事件期望乘区建模。",
      "单技能隐藏系数、上限、快照机制和服务器结算顺序仍需要游戏内验证。"
    ]
  };
}

export function calculateExpectedDps(input) {
  const hit = calculateHitDamage(input);
  const attacksPerSecond = Number(input.attacksPerSecond ?? 1);
  if (attacksPerSecond <= 0) {
    throw new RangeError("每秒攻击次数必须大于 0");
  }
  return {
    expectedDps: hit.finalDamage * attacksPerSecond,
    hit
  };
}
