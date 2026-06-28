import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { zh } from "./lib/zh-localization.mjs";

const root = path.resolve(new URL(".", import.meta.url).pathname, "..");
const classPath = path.join(root, "data/classes/classes.json");
const archetypePath = path.join(root, "data/builds/archetypes.json");
const equipmentPath = path.join(root, "data/equipment/equipment-library.json");
const simulationsPath = path.join(root, "data/generated/build-simulations.json");
const overridePath = path.join(root, "data/builds/community-build-overrides.json");
const output = path.join(root, "data/generated/build-guides.json");

const modeProfiles = {
  pit_push: {
    zhName: "冲层",
    stageTags: ["后期", "冲层"],
    stage: "终局冲层",
    suitability: "需要核心装备和雕文等级，适合挑战 150 层与高压首领。",
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
      mobility: 0.6,
      lucky_hit: 1
    }
  },
  speed_farm: {
    zhName: "速刷",
    stageTags: ["成型", "速刷"],
    stage: "成型速刷",
    suitability: "优先移动、冷却和起手效率，适合梦魇、低压天坑和材料刷取。",
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
      survivability: 0.8,
      elemental_damage_multiplier: 1.4,
      vulnerable: 1.2
    }
  },
  daily: {
    zhName: "日常",
    stageTags: ["开荒过渡", "日常"],
    stage: "开荒到日常",
    suitability: "优先容错、资源循环和操作舒适度，适合升级、补装备和日常活动。",
    weights: {
      survivability: 2.7,
      resource: 2.5,
      mobility: 2.2,
      cooldown_reduction: 2,
      skill_rank: 1.8,
      weapon_damage: 1.7,
      attack_speed: 1.5,
      all_damage_multiplier: 1.4,
      lucky_hit: 1.2,
      elemental_damage_multiplier: 1.2,
      vulnerable: 1
    }
  }
};

const slotOrder = [
  { id: "helm", zhName: "头盔", group: "防具", visualType: "armor", baseSlot: "helm" },
  { id: "chest", zhName: "胸甲", group: "防具", visualType: "armor", baseSlot: "chest" },
  { id: "gloves", zhName: "手套", group: "防具", visualType: "armor", baseSlot: "gloves" },
  { id: "pants", zhName: "裤子", group: "防具", visualType: "armor", baseSlot: "pants" },
  { id: "boots", zhName: "靴子", group: "防具", visualType: "armor", baseSlot: "boots" },
  { id: "amulet", zhName: "护符", group: "首饰", visualType: "jewelry", baseSlot: "amulet" },
  { id: "ring1", zhName: "戒指 1", group: "首饰", visualType: "jewelry", baseSlot: "ring" },
  { id: "ring2", zhName: "戒指 2", group: "首饰", visualType: "jewelry", baseSlot: "ring" },
  { id: "twoHand", zhName: "双手武器", group: "武器", visualType: "weapon", baseSlot: "twoHand" },
  { id: "mainHand", zhName: "主手", group: "武器", visualType: "weapon", baseSlot: "mainHand" },
  { id: "offHand", zhName: "副手", group: "武器", visualType: "weapon", baseSlot: "offHand" }
];

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

const classSkillWords = {
  barbarian: ["基础生成", "主力输出", "战吼增伤", "战吼减伤", "位移解控", "终极爆发"],
  druid: ["基础生成", "主力自然魔法", "防御屏障", "聚怪控制", "资源补强", "终极爆发"],
  necromancer: ["基础触发", "主力指挥", "尸体功能", "诅咒覆盖", "保命技能", "终极爆发"],
  paladin: ["基础生成", "主力圣击", "光环增益", "盾牌防御", "位移解控", "终极爆发"],
  rogue: ["基础生成", "主力输出", "位移", "灌注", "控制/陷阱", "爆发技能"],
  sorcerer: ["基础触发", "元素主攻", "屏障", "传送", "召唤/增伤", "终极爆发"],
  spiritborn: ["基础生成", "主力输出", "位移", "防御", "灵兽增益", "终极爆发"],
  warlock: ["基础触发", "主力诅咒", "召唤/符印", "防御", "资源补强", "终极爆发"]
};

function hashText(value) {
  return [...String(value)].reduce((total, char) => (total * 31 + char.charCodeAt(0)) >>> 0, 7);
}

function readJson(filePath) {
  return readFile(filePath, "utf8").then((content) => JSON.parse(content));
}

async function readOptionalJson(filePath, fallback) {
  try {
    return await readJson(filePath);
  } catch {
    return fallback;
  }
}

function isClassCompatible(item, classInfo) {
  const restriction = String(item.classRestriction || "").toLowerCase();
  return restriction === "all classes" || restriction === classInfo.id || restriction === classInfo.displayName.toLowerCase();
}

function inferItemSlots(item) {
  const text = `${item.id} ${item.name} ${item.zhName}`.toLowerCase();
  const matches = new Set();
  if (/visage|crown|crest|helm|hood|mask|cowl|heir|head|tuskhelm|仪容|王冠|盔|冠/.test(text)) matches.add("helm");
  if (/armor|mail|raiment|plate|shroud|soulbrand|mantle|chest|robe|brand|faith|甲|衣|胸|披肩|烙印/.test(text)) matches.add("chest");
  if (/glove|gauntlet|grip|fist|frostburn|hand|wrap|手套|握|拳/.test(text)) matches.add("gloves");
  if (/pants|tassets|will|temerity|breeches|leg|cuisses|裤|裙甲|意志/.test(text)) matches.add("pants");
  if (/boot|greave|step|wake|blessing|hoove|sabatons|shoe|步|护胫|苏醒|祝福/.test(text)) matches.add("boots");
  if (/amulet|talisman|medallion|heart|pendant|stone|idol|charm|护符|项链|融心|神像|石/.test(text)) matches.add("amulet");
  if (/ring|signet|band|loop|seal|戒指|印戒/.test(text)) matches.add("ring");
  if (/shield|focus|totem|idol|fetish|orb|catalyst|book|sigil|lamp|盾|法器|神像|符印/.test(text)) matches.add("offHand");
  if (/staff|spear|polearm|scythe|bow|crossbow|glaive|hammer|maul|grandfather|oath|fields|shattered|矛|杖|弓|弩|镰|锤|祖父|誓约/.test(text)) matches.add("twoHand");
  if (/sword|dirk|dagger|blade|cleaver|axe|mace|wand|sabre|knife|剑|匕|刃|斧|魔杖/.test(text)) matches.add("mainHand");

  if (matches.size) return [...matches];
  if (item.visualType === "jewelry") return hashText(item.id) % 3 === 0 ? ["amulet"] : ["ring"];
  if (item.visualType === "armor" || item.visualType === "utility") {
    return [["helm"], ["chest"], ["gloves"], ["pants"], ["boots"]][hashText(item.id) % 5];
  }
  if (item.visualType === "weapon") {
    return [["twoHand"], ["mainHand"], ["offHand"]][hashText(item.id) % 3];
  }
  return [];
}

function itemScore(item, slot, classInfo, archetype, mode) {
  const profile = modeProfiles[mode];
  const inferred = inferItemSlots(item);
  const categories = item.categories || [];
  let score = 0;
  if (isClassCompatible(item, classInfo)) score += item.classRestriction === "All Classes" ? 6 : 14;
  if (item.visualType === slot.visualType || (slot.visualType === "armor" && item.visualType === "utility")) score += 8;
  if (inferred.includes(slot.baseSlot)) score += 22;
  for (const stat of archetype.primaryStats) {
    if (categories.includes(stat)) score += 18;
    score += profile.weights[stat] ?? 0;
  }
  for (const category of categories) score += (profile.weights[category] ?? 0.35) * 5;
  if (item.modeFit?.includes(mode)) score += 6;
  if (item.zhBuildRole?.includes("核心")) score += 4;
  return score + (hashText(`${item.id}:${slot.id}:${mode}`) % 17) / 100;
}

function rankedItemsForSlot(equipmentItems, slot, classInfo, archetype, mode) {
  return equipmentItems
    .filter((item) => isClassCompatible(item, classInfo))
    .filter((item) => item.visualType === slot.visualType || (slot.visualType === "armor" && item.visualType === "utility"))
    .map((item) => ({ item, score: itemScore(item, slot, classInfo, archetype, mode) }))
    .filter((entry) => entry.score > 10)
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.item);
}

function uniqueStrings(values, max = 4) {
  return [...new Set(values.filter(Boolean))].slice(0, max);
}

function statLabels(archetype) {
  return archetype.primaryStats.map((stat) => zh.stat(stat));
}

function aspectName(slot, archetype, mode, variant = 0) {
  const primary = archetype.primaryStats[variant % archetype.primaryStats.length];
  const map = {
    weapon_damage: ["裂击威能", "重压威能"],
    primary_core_stat: ["统御威能", "灵巧威能"],
    skill_rank: ["主技能增幅威能", "专精回响威能"],
    resource: ["回能威能", "余烬循环威能"],
    critical_strike: ["精准暴击威能", "锋刃威能"],
    additive_damage: ["蚀伤威能", "积怨威能"],
    cooldown_reduction: ["急速循环威能", "冷却回转威能"],
    survivability: ["铁肤壁垒威能", "护主威能"],
    all_damage_multiplier: ["统御乘区威能", "压迫威能"],
    elemental_damage_multiplier: ["元素灌注威能", "风暴余烬威能"],
    attack_speed: ["急促威能", "连击威能"],
    overpower: ["压制威能", "血涌威能"],
    vulnerable: ["破绽威能", "易伤扩散威能"],
    thorns: ["尖刺壁垒威能", "反伤威能"],
    mobility: ["疾行威能", "游击威能"],
    lucky_hit: ["幸运触发威能", "连锁触发威能"]
  };
  const fallback = slot.group === "武器" ? ["主攻威能"] : slot.group === "首饰" ? ["增幅威能"] : ["防护威能"];
  return (map[primary] || fallback)[variant % 2];
}

function desiredAffixes(slot, archetype, item) {
  const base = statLabels(archetype);
  const defensive = slot.group === "防具" ? ["生命上限", "护甲", "全元素抗性", "冷却缩减"] : [];
  const jewelry = slot.group === "首饰" ? ["冷却缩减", "资源消耗降低", "暴击几率", "移动速度"] : [];
  const weapon = slot.group === "武器" ? ["武器伤害", "主力技能伤害", "易伤伤害", "暴击伤害"] : [];
  return uniqueStrings([...(item?.zhGuaranteedAffixes || []), ...base, ...defensive, ...jewelry, ...weapon], 5);
}

function temperLines(slot, archetype) {
  const first = statLabels(archetype)[0] || "主力伤害";
  if (slot.group === "武器") return [`${first}伤害`, "核心技能范围或命中次数"];
  if (slot.group === "首饰") return ["冷却缩减", `${first}触发收益`];
  if (slot.id === "boots") return ["移动速度", "资源生成或闪避冷却"];
  if (slot.id === "gloves") return ["攻击速度", "幸运一击或暴击"];
  return ["生命/护甲", "减伤或抗性"];
}

function socketLines(slot) {
  if (slot.group === "武器") return ["绿宝石或红宝石，按暴击/压制收益切换"];
  if (slot.group === "首饰") return ["补齐缺口抗性，冲层优先全抗"];
  return ["红宝石提高生命，黄宝石用于高压控制环境"];
}

function makeTarget(item, slot, archetype, index) {
  if (!item) {
    return {
      type: "legendary",
      itemId: null,
      zhName: `传奇${slot.zhName}`,
      image: `./public/assets/icon-${slot.visualType}.png`,
      externalImage: null,
      description: `承载「${aspectName(slot, archetype, "daily", index)}」的可替换底材。`
    };
  }
  return {
    type: "unique",
    itemId: item.id,
    zhName: item.zhName,
    image: item.image,
    externalImage: item.externalImage,
    description: `${item.zhBuildRole || "暗金组件"}，固定词缀：${(item.zhGuaranteedAffixes || []).join(" / ") || "待回填"}。`
  };
}

function alternativeFor(slot, item, pool, archetype, usedIds, index) {
  const candidates = pool.filter((candidate) => candidate.id !== item?.id && !usedIds.has(candidate.id)).slice(0, 2);
  const alternatives = candidates.map((candidate) => ({
    type: "unique",
    zhName: candidate.zhName,
    itemId: candidate.id,
    reason: `替换为${candidate.zhName}，保留${desiredAffixes(slot, archetype, candidate).slice(0, 2).join(" / ")}。`,
    tradeoff: "通常损失一部分核心联动，换取更容易成型或更高容错。"
  }));
  alternatives.push({
    type: "legendary",
    zhName: `传奇${slot.zhName} + ${aspectName(slot, archetype, "daily", index + 1)}`,
    itemId: null,
    reason: "没有核心暗金时的过渡方案。",
    tradeoff: "上限较低，但词缀和威能更容易凑齐。"
  });
  return alternatives.slice(0, 3);
}

function gearSlotsFor({ equipmentItems, classInfo, archetype, mode }) {
  const usedIds = new Set();
  return slotOrder.map((slot, index) => {
    const pool = rankedItemsForSlot(equipmentItems, slot, classInfo, archetype, mode);
    const selected = pool.find((item) => !usedIds.has(item.id)) || pool[0] || null;
    if (selected) usedIds.add(selected.id);
    const target = makeTarget(selected, slot, archetype, index);
    const required = Boolean(selected && index < 5 && itemScore(selected, slot, classInfo, archetype, mode) > 45);
    const core = required || ["twoHand", "mainHand", "amulet", "ring1"].includes(slot.id);
    const replaceable = !required && !["twoHand"].includes(slot.id);
    const affixes = desiredAffixes(slot, archetype, selected);
    return {
      slotId: slot.id,
      zhSlotName: slot.zhName,
      group: slot.group,
      priority: core ? "核心位" : "补强位",
      required,
      core,
      replaceable,
      target,
      aspect: {
        name: selected ? "暗金特效位" : aspectName(slot, archetype, mode, index),
        role: core ? "构筑联动核心" : "词缀与防御补强",
        sourceStatus: selected ? "唯一装备固定词缀来自官方 3.1.0 补丁，暗金特效待回填" : "威能名称为构筑模板，需接入全量威能库核验"
      },
      affixes,
      tempers: temperLines(slot, archetype),
      masterwork: affixes.slice(0, 2),
      sockets: socketLines(slot),
      alternatives: alternativeFor(slot, selected, pool, archetype, usedIds, index),
      notes: [
        replaceable ? "可替换：先保证主词缀和抗性，再追求最优暗金。" : "不建议替换：此位承担主要伤害或循环。",
        core ? "优先在该部位投入精造资源。" : "作为成型后的补强部位。"
      ]
    };
  });
}

function simulationLookup(simulations) {
  const map = new Map();
  for (const row of simulations.rows) {
    for (const [mode, modeData] of Object.entries(row.modes)) {
      for (const build of modeData.topBuilds || []) {
        map.set(`${row.seasonId}:${row.classId}:${mode}:${build.archetypeId}`, build);
      }
    }
  }
  return map;
}

function synthesizePerformance({ classInfo, archetype, mode, seasonIndex }) {
  const seed = classSeeds[classInfo.id] || { push: 80, speed: 80, daily: 80, volatility: 0.18 };
  const profile = modeProfiles[mode];
  const modeBase = mode === "pit_push" ? seed.push : mode === "speed_farm" ? seed.speed : seed.daily;
  const statScore = archetype.primaryStats.reduce((total, stat) => total + (profile.weights[stat] || 0.8), 0);
  const score = Math.round(Math.min(96, modeBase * 0.72 + statScore * 4.2 - seasonIndex * seed.volatility * 7));
  const predictedPit150Minutes = Number(Math.max(4.2, 22.6 - score * 0.18 + seed.volatility * 4 + (mode === "speed_farm" ? -0.4 : mode === "daily" ? 0.8 : 0)).toFixed(1));
  const confidence = Number(Math.max(0.35, 0.76 - seasonIndex * 0.1 - seed.volatility * 0.46).toFixed(2));
  return { score, predictedPit150Minutes, confidence };
}

function difficultyFor({ archetype, mode, gearSlots, seasonIndex, classInfo }) {
  let level = mode === "pit_push" ? 4 : mode === "speed_farm" ? 3 : 2;
  const hardStats = ["resource", "cooldown_reduction", "lucky_hit", "overpower"];
  level += archetype.primaryStats.some((stat) => hardStats.includes(stat)) ? 1 : 0;
  level += gearSlots.filter((slot) => slot.required).length >= 4 ? 1 : 0;
  level += classInfo.sourceStatus?.includes("needs") ? 1 : 0;
  level += seasonIndex > 0 ? 1 : 0;
  level = Math.max(1, Math.min(5, level));
  const labels = ["低", "中低", "中", "高", "极高"];
  return {
    level,
    label: labels[level - 1],
    reasons: uniqueStrings([
      `${modeProfiles[mode].zhName}版本需要${statLabels(archetype).slice(0, 2).join(" / ")}到位。`,
      gearSlots.some((slot) => slot.required) ? "存在不可替换核心位，缺件时需要先用传奇底材过渡。" : "核心位较少，开荒期可以先按词缀替换。",
      seasonIndex > 0 ? "未来赛季需要等待补丁与榜单校准。" : "S14 已接入 3.1.0 固定词缀种子。"
    ], 3)
  };
}

function ceilingFor(performance, mode) {
  const minutes = performance.predictedPit150Minutes;
  const tier = minutes <= 6.7 ? "T0" : minutes <= 7.7 ? "T1" : minutes <= 8.8 ? "T2" : "T3";
  return {
    pit150Minutes: minutes,
    tier,
    label: `${tier} · 150 层 ${minutes} 分参考`,
    note: mode === "pit_push" ? "冲层上限按单体、容错和爆发窗口评估。" : mode === "speed_farm" ? "速刷上限按清图速度和移动效率评估。" : "日常上限按稳定性和成型成本评估。"
  };
}

function skillTreeFor({ classInfo, archetype, simBuild }) {
  const simPlan = simBuild?.guide?.skillPlan;
  const bar = simPlan?.bar?.length ? simPlan.bar : classSkillWords[classInfo.id] || ["基础触发", "主力输出", "防御", "机动", "增伤/控制", "终极"];
  const pointOrder = [
    ["1-3", bar[0], "+1 并点强化", "先建立资源、触发或易伤入口。"],
    ["4-8", bar[1], "+5", "主力输出优先点满，保证升级和清怪速度。"],
    ["9-13", bar[2], "+1 至关键强化", "拿到第一层防御或增伤窗口。"],
    ["14-18", bar[3], "+1 至关键强化", "补移动、解控或聚怪能力。"],
    ["19-23", bar[4], "+1 至关键强化", "补齐流派标签和爆发前置条件。"],
    ["24-28", bar[5], "+1", "拿终极技能，首领和精英包留爆发。"],
    ["29-34", `${archetype.zhName}相关被动`, "+3", "围绕主词缀提高稳定伤害。"],
    ["35-42", "生存被动", "+3 至 +6", "补生命、护甲、减伤或屏障。"],
    ["43-50", "资源/冷却被动", "+3 至 +6", "解决断档，进入世界等级过渡。"],
    ["50+", "关键被动与技能重分配", "按装备微调", "核心暗金到位后，把临时点数转到乘区和循环。"]
  ];
  return {
    core: simPlan?.core || archetype.zhName,
    skillBar: bar.map((name, index) => ({
      slot: index + 1,
      name,
      role: index === 1 ? "主攻" : index >= 4 ? "爆发/增益" : "循环/防御",
      points: index === 1 ? 5 : 1
    })),
    pointOrder: pointOrder.map(([levelRange, skill, points, reason], index) => ({
      step: index + 1,
      levelRange,
      skill,
      points,
      reason
    })),
    passives: uniqueStrings([`${statLabels(archetype)[0]}收益`, "生命与护甲", "资源循环", "冷却缩减", "精英减伤"], 5),
    notes: simPlan?.priority || ["主力输出先满，再补防御、资源和关键被动。"]
  };
}

function paragonFor({ archetype, simBuild }) {
  const route = simBuild?.guide?.paragonPlan?.boardRoute || [
    "起始盘先拿主属性、护甲和生命",
    `第二盘围绕${archetype.zhName}核心标签`,
    "第三盘补资源、冷却和抗性",
    "第四盘按装备缺口补易伤、暴击或生存"
  ];
  const glyphs = statLabels(archetype).slice(0, 4);
  const boards = route.map((goal, index) => ({
    order: index + 1,
    name: index === 0 ? "起始盘" : `${archetype.zhName}盘 ${index}`,
    goal,
    glyph: glyphs[index % glyphs.length] || "主属性",
    rotate: index % 2 === 0 ? "默认方向" : "向雕文孔短路旋转"
  }));
  const clickOrder = [
    ["起始盘", "主属性通路", "先打开到雕文孔的最短路径。"],
    ["起始盘", "雕文孔", `插入${glyphs[0] || "主属性"}雕文。`],
    ["起始盘", "稀有节点", "补护甲、生命和抗性，保证进入高层不被秒杀。"],
    [boards[1]?.name || "第二盘", "传奇节点", "优先拿流派乘区或核心联动。"],
    [boards[1]?.name || "第二盘", "雕文孔", `插入${glyphs[1] || "伤害"}雕文。`],
    [boards[1]?.name || "第二盘", "稀有节点", "拿主伤害标签和精英伤害。"],
    [boards[2]?.name || "第三盘", "雕文孔", `插入${glyphs[2] || "资源"}雕文。`],
    [boards[2]?.name || "第三盘", "资源/冷却节点", "修正循环断档。"],
    [boards[3]?.name || "第四盘", "防御稀有节点", "冲层前补齐抗性和护甲。"],
    [boards[3]?.name || "第四盘", "剩余魔法节点", "雕文半径满足后再补伤害小点。"]
  ];
  return {
    boardOrder: boards,
    glyphs: glyphs.map((name, index) => ({
      name,
      priority: index + 1,
      socket: boards[index]?.name || "补强盘",
      note: index === 0 ? "优先升到可触发半径" : "按装备缺口调整顺序"
    })),
    clickOrder: clickOrder.map(([board, node, reason], index) => ({
      step: index + 1,
      board,
      node,
      reason
    })),
    notes: ["先雕文孔和传奇节点，再稀有节点，最后补魔法小点。", "抗性、护甲不达标时允许提前走防御节点。"]
  };
}

function gameplayFor({ mode, archetype, simBuild }) {
  const loop = simBuild?.guide?.rotation?.length ? simBuild.guide.rotation : ["先建立防御和资源", "上控制或易伤后打主力输出", "危险词缀出现时先移动", "精英和首领前保留爆发技能"];
  return {
    opener: ["进图先确认抗性、药剂和资源状态。", "遇到精英包先交控制或增伤，再进入主攻窗口。", "核心暗金触发条件没有满足时不要提前开终极。"],
    loop,
    boss: ["首领前保留终极和主要冷却。", `${archetype.zhName}的爆发窗口只在资源足够时打满。`, "转阶段优先保命和重建增益。"],
    defense: ["高层不要同时交空所有防御技能。", "地面持续伤和爆炸词缀优先躲，输出窗口可以延后。", "护甲、抗性未达标时先降层刷装备。"],
    speedFarm: mode === "speed_farm" ? ["按路线拉两到三波怪再爆发。", "低血小怪用移动技能和副伤害清掉。"] : ["速刷变体可把一件防御位换成移动或冷却威能。"],
    commonMistakes: ["缺核心位时硬打高层。", "资源不足仍连续释放主攻导致空窗。", "巅峰先点远端小点，延后了雕文孔和传奇节点。"]
  };
}

function variantsFor({ mode, gearSlots, archetype }) {
  const coreSlot = gearSlots.find((slot) => !slot.replaceable) || gearSlots[0];
  return [
    {
      name: "标准成型",
      useCase: modeProfiles[mode].suitability,
      swapOut: "无",
      swapIn: "按上方装备槽位成型",
      notes: "优先满足核心暗金、主词缀和抗性上限。"
    },
    {
      name: "缺核心暗金",
      useCase: "开荒期或刚进终局时使用。",
      swapOut: coreSlot?.target.zhName || "核心暗金",
      swapIn: `${coreSlot?.zhSlotName || "对应部位"}传奇底材 + ${aspectName(coreSlot || slotOrder[0], archetype, mode, 1)}`,
      notes: "伤害上限下降，但词缀更容易凑齐。"
    },
    {
      name: "高层生存",
      useCase: "150 层或硬核角色优先。",
      swapOut: "一处纯伤害词缀",
      swapIn: "生命、护甲、减伤或抗性",
      notes: "牺牲部分速度换稳定通关。"
    }
  ];
}

function communityVerificationLevel(guide, override) {
  const sourceSeason = override.sourceReference.sourceSeason || "";
  const currentSeasonCode = guide.taxonomy.seasonId.toUpperCase();
  return sourceSeason.includes(currentSeasonCode) ? "community_reference" : "cross_season_reference";
}

function guideFor({ season, seasonIndex, classInfo, archetype, mode, equipmentItems, simBuild }) {
  const performance = simBuild || synthesizePerformance({ classInfo, archetype, mode, seasonIndex });
  const gearSlots = gearSlotsFor({ equipmentItems, classInfo, archetype, mode });
  const formationDifficulty = difficultyFor({ archetype, mode, gearSlots, seasonIndex, classInfo });
  const ceiling = ceilingFor(performance, mode);
  const coreUniques = gearSlots
    .filter((slot) => slot.core && slot.target.type === "unique")
    .slice(0, 5)
    .map((slot) => ({
      slotId: slot.slotId,
      zhSlotName: slot.zhSlotName,
      itemId: slot.target.itemId,
      zhName: slot.target.zhName,
      image: slot.target.image,
      externalImage: slot.target.externalImage
    }));
  const coreAspects = gearSlots
    .filter((slot) => slot.core)
    .slice(0, 6)
    .map((slot) => ({
      slotId: slot.slotId,
      zhSlotName: slot.zhSlotName,
      name: slot.aspect.name,
      role: slot.aspect.role,
      required: slot.required,
      replaceable: slot.replaceable
    }));
  return {
    id: `${season.id}-${classInfo.id}-${archetype.id}-${mode}`,
    slug: `${season.id}/${classInfo.id}/${archetype.id}/${mode}`,
    title: `${season.zhLabel || zh.seasonLabel(season.label)} ${classInfo.zhName} · ${archetype.zhName}${modeProfiles[mode].zhName}`,
    asOf: "2026-06-28",
    gameVersion: {
      patch: "3.1.0",
      build: "72578",
      releaseDate: "2026-06-30",
      sourceUrl: "https://news.blizzard.com/en-us/article/24287406/diablo-iv-patch-notes"
    },
    taxonomy: {
      seasonId: season.id,
      seasonName: season.zhLabel || zh.seasonLabel(season.label),
      classId: classInfo.id,
      className: classInfo.zhName,
      archetypeId: archetype.id,
      archetypeName: archetype.zhName,
      mode,
      modeName: modeProfiles[mode].zhName,
      stage: modeProfiles[mode].stage,
      stageTags: modeProfiles[mode].stageTags,
      tags: uniqueStrings([classInfo.zhName, archetype.zhName, modeProfiles[mode].zhName, ...statLabels(archetype)], 8)
    },
    summary: {
      oneLine: `${classInfo.zhName}「${archetype.zhName}」${modeProfiles[mode].zhName} BD，围绕${statLabels(archetype).slice(0, 3).join("、")}建立伤害和循环。`,
      pros: uniqueStrings([`${statLabels(archetype)[0] || "主伤害"}收益明确`, "装备路径清晰", mode === "daily" ? "容错高" : "上限明确"], 3),
      cons: uniqueStrings([formationDifficulty.level >= 4 ? "核心件缺失时成型慢" : "后期仍需优化词缀", "巅峰精确节点待接入可审计数据源", mode === "pit_push" ? "操作窗口要求高" : "极限冲层需要切换版本"], 3),
      requirements: coreUniques.slice(0, 3).map((item) => `${item.zhSlotName}：${item.zhName}`),
      statPriority: statLabels(archetype)
    },
    formationDifficulty,
    ceiling,
    suitability: {
      leveling: mode === "daily" ? "推荐" : "可过渡",
      speedFarm: mode === "speed_farm" ? "推荐" : "需要换移动/冷却位",
      pitPush: mode === "pit_push" ? "推荐" : "需要换生存和单体位",
      bossing: archetype.primaryStats.includes("weapon_damage") || archetype.primaryStats.includes("critical_strike") ? "较强" : "中等",
      hardcore: formationDifficulty.level <= 3 ? "可用" : "需要高生存变体",
      controller: "可用，位移和指向技能较多时需要调键位",
      notes: [modeProfiles[mode].suitability]
    },
    source: {
      authorName: "Harris‘s Diablo 4",
      trust: seasonIndex === 0 ? "官方词缀种子 + 本站结构化整理" : "未来赛季推演 + 本站结构化整理",
      verificationLevel: seasonIndex === 0 ? "official_seed_template" : "projection_template",
      createdAt: "2026-06-28",
      updatedAt: "2026-06-28",
      videos: [],
      changelog: [{ date: "2026-06-28", title: "初始化 BD 档案", body: "补齐装备槽位、技能顺序、巅峰路线、打法和替换件结构。" }]
    },
    coreUniques,
    coreAspects,
    gearSlots,
    skillTree: skillTreeFor({ classInfo, archetype, simBuild }),
    paragon: paragonFor({ archetype, simBuild }),
    gameplay: gameplayFor({ mode, archetype, simBuild }),
    variants: variantsFor({ mode, gearSlots, archetype }),
    dataQuality: {
      officialFields: ["3.1.0 唯一装备固定词缀", "补丁版本和构建号"],
      communityVerified: ["图标外链引用"],
      needsValidation: ["传奇威能全量名称", "暗金特效完整文本", "巅峰节点坐标", "技能精确点数"],
      missing: ["视频实战样本", "真实赛季榜单回填"]
    }
  };
}

function withSteps(items) {
  return items.map((item, index) => ({ step: index + 1, ...item }));
}

function resolvePatchedTarget(slot, patchTarget, equipmentByZhName) {
  if (!patchTarget) return slot.target;
  const nameChanged = Boolean(patchTarget.zhName && patchTarget.zhName !== slot.target.zhName);
  const matchedItem = patchTarget.zhName ? equipmentByZhName.get(patchTarget.zhName) : null;
  const hasExplicitItemId = Object.hasOwn(patchTarget, "itemId");
  const itemId = hasExplicitItemId ? patchTarget.itemId : (matchedItem?.id ?? (nameChanged ? null : slot.target.itemId));
  let externalImage = slot.target.externalImage;
  if (Object.hasOwn(patchTarget, "externalImage")) {
    externalImage = patchTarget.externalImage;
  } else if (matchedItem?.externalImage) {
    externalImage = matchedItem.externalImage;
  } else if (nameChanged) {
    externalImage = null;
  }
  const description = patchTarget.description
    ?? (matchedItem
      ? `${matchedItem.zhBuildRole || "暗金组件"}，固定词缀：${(matchedItem.zhGuaranteedAffixes || []).join(" / ") || "待回填"}。`
      : slot.target.description);
  return {
    ...slot.target,
    ...patchTarget,
    itemId,
    image: patchTarget.image || matchedItem?.image || slot.target.image,
    externalImage,
    description
  };
}

function applyCommunityOverride(guide, override, equipmentByZhName) {
  const slotOverrides = new Map((override.gearSlots || []).map((slot) => [slot.slotId, slot]));
  const gearSlots = guide.gearSlots.map((slot) => {
    const patch = slotOverrides.get(slot.slotId);
    if (!patch) return slot;
    return {
      ...slot,
      required: patch.required ?? slot.required,
      core: patch.core ?? slot.core,
      replaceable: patch.replaceable ?? slot.replaceable,
      target: resolvePatchedTarget(slot, patch.target, equipmentByZhName),
      aspect: {
        ...slot.aspect,
        ...patch.aspect
      },
      affixes: patch.affixes || slot.affixes,
      alternatives: (patch.alternatives || slot.alternatives).map((alternative) => ({
        type: alternative.type || "community_reference",
        itemId: alternative.itemId ?? null,
        ...alternative
      })),
      notes: [
        patch.replaceable === false ? "社区参考：该位置承担核心联动，不建议替换。" : "社区参考：可按缺件和抗性替换。",
        patch.aspect?.sourceStatus || slot.aspect.sourceStatus
      ]
    };
  });
  const coreUniques = gearSlots
    .filter((slot) => slot.core && slot.target.type === "unique")
    .slice(0, 6)
    .map((slot) => ({
      slotId: slot.slotId,
      zhSlotName: slot.zhSlotName,
      itemId: slot.target.itemId,
      zhName: slot.target.zhName,
      image: slot.target.image,
      externalImage: slot.target.externalImage
    }));
  const coreAspects = gearSlots
    .filter((slot) => slot.core)
    .slice(0, 8)
    .map((slot) => ({
      slotId: slot.slotId,
      zhSlotName: slot.zhSlotName,
      name: slot.aspect.name,
      role: slot.aspect.role,
      required: slot.required,
      replaceable: slot.replaceable
    }));
  return {
    ...guide,
    title: override.title || guide.title,
    taxonomy: {
      ...guide.taxonomy,
      archetypeName: override.archetypeName || guide.taxonomy.archetypeName,
      tags: uniqueStrings([guide.taxonomy.className, override.archetypeName || guide.taxonomy.archetypeName, guide.taxonomy.modeName, "社区参考", ...guide.summary.statPriority], 8)
    },
    summary: {
      ...guide.summary,
      ...override.summary
    },
    source: {
      ...guide.source,
      authorName: `${override.sourceReference.site} 社区参考`,
      trust: "社区 BD 参考 + 官方词缀种子",
      verificationLevel: communityVerificationLevel(guide, override),
      updatedAt: override.sourceReference.asOf,
      references: [
        {
          title: override.sourceReference.referenceTitle,
          url: override.sourceReference.url,
          site: override.sourceReference.site,
          sourceSeason: override.sourceReference.sourceSeason,
          note: override.sourceReference.note
        }
      ],
      changelog: [
        {
          date: override.sourceReference.asOf,
          title: "接入社区 BD 覆盖",
          body: "装备槽位、核心暗金/威能、技能、巅峰和打法按暗黑核 Planner 示例结构覆盖。"
        },
        ...guide.source.changelog
      ]
    },
    coreUniques,
    coreAspects,
    gearSlots,
    skillTree: {
      ...guide.skillTree,
      ...override.skillTree,
      pointOrder: override.skillTree?.pointOrder ? withSteps(override.skillTree.pointOrder) : guide.skillTree.pointOrder
    },
    paragon: {
      ...guide.paragon,
      ...override.paragon,
      clickOrder: override.paragon?.clickOrder ? withSteps(override.paragon.clickOrder) : guide.paragon.clickOrder,
      notes: override.paragon?.rule ? [override.paragon.rule, ...guide.paragon.notes] : guide.paragon.notes
    },
    gameplay: {
      ...guide.gameplay,
      ...override.gameplay
    },
    variants: [
      {
        name: `${override.sourceReference.site}参考版`,
        useCase: "按社区资料页展示的构筑结构查看。",
        swapOut: "模板槽位",
        swapIn: "社区覆盖槽位",
        notes: override.sourceReference.note
      },
      ...guide.variants
    ],
    dataQuality: {
      officialFields: ["3.1.0 唯一装备固定词缀", "补丁版本和构建号"],
      communityVerified: [`${override.sourceReference.site}装备槽位`, `${override.sourceReference.site}技能/巅峰/打法结构参考`],
      needsValidation: ["S14 实战榜单校准", "暗金特效完整数值", "巅峰盘坐标"],
      missing: ["视频实战样本回填", "赛季热修后的重新评分"]
    }
  };
}

function mergeOverride(base, override) {
  const gearSlotsById = new Map((base.gearSlots || []).map((slot) => [slot.slotId, slot]));
  for (const slot of override.gearSlots || []) gearSlotsById.set(slot.slotId, slot);
  return {
    ...base,
    ...override,
    sourceReference: {
      ...base.sourceReference,
      ...override.sourceReference
    },
    summary: {
      ...base.summary,
      ...override.summary
    },
    gearSlots: [...gearSlotsById.values()],
    skillTree: {
      ...base.skillTree,
      ...override.skillTree
    },
    paragon: {
      ...base.paragon,
      ...override.paragon
    },
    gameplay: {
      ...base.gameplay,
      ...override.gameplay
    }
  };
}

function expandCommunityOverrides(rawOverrides) {
  const byId = new Map(rawOverrides.map((override) => [override.id, override]));
  return rawOverrides.map((override) => {
    if (!override.extends) return override;
    const base = byId.get(override.extends);
    if (!base) throw new Error(`Community override ${override.id} extends missing override ${override.extends}`);
    return mergeOverride(base, override);
  });
}

const [classes, archetypeGroups, equipment, simulations, overrides] = await Promise.all([
  readJson(classPath),
  readJson(archetypePath),
  readJson(equipmentPath),
  readJson(simulationsPath),
  readOptionalJson(overridePath, [])
]);

const simMap = simulationLookup(simulations);
const expandedOverrides = expandCommunityOverrides(overrides);
const overrideMap = new Map(expandedOverrides.map((override) => [override.id, override]));
const equipmentByZhName = new Map(equipment.items.map((item) => [item.zhName, item]));
const builds = [];

for (const [seasonIndex, season] of simulations.seasons.entries()) {
  for (const classInfo of classes) {
    const archetypes = archetypeGroups.find((group) => group.classId === classInfo.id)?.archetypes || [];
    for (const archetype of archetypes) {
      for (const mode of Object.keys(modeProfiles)) {
        const simBuild = simMap.get(`${season.id}:${classInfo.id}:${mode}:${archetype.id}`);
        const guide = guideFor({ season, seasonIndex, classInfo, archetype, mode, equipmentItems: equipment.items, simBuild });
        builds.push(overrideMap.has(guide.id) ? applyCommunityOverride(guide, overrideMap.get(guide.id), equipmentByZhName) : guide);
      }
    }
  }
}

const payload = {
  generatedAt: new Date().toISOString(),
  scope: "structured_build_guides_for_diablo4_guide_site",
  asOf: "2026-06-28",
  itemCount: equipment.items.length,
  buildCount: builds.length,
  seasons: simulations.seasons.map((season) => ({
    id: season.id,
    zhLabel: season.zhLabel,
    horizon: season.horizon,
    zhAssumption: season.zhAssumption
  })),
  slotOrder,
  storageDesign: {
    sourceFiles: [
      "data/classes/classes.json",
      "data/builds/archetypes.json",
      "data/equipment/equipment-library.json",
      "data/generated/build-simulations.json",
      "data/builds/community-build-overrides.json"
    ],
    generatedFile: "data/generated/build-guides.json",
    frontendUse: "前端按赛季、职业、用途筛选 build-guides；BD 详情页直接读取结构化槽位、技能、巅峰和打法字段。"
  },
  builds
};

await mkdir(path.dirname(output), { recursive: true });
await writeFile(output, `${JSON.stringify(payload, null, 2)}\n`);
console.log(`Wrote ${builds.length} build guides to ${path.relative(root, output)}`);
