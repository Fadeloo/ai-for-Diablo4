import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { zh } from "./lib/zh-localization.mjs";

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

const guideTemplates = {
  barbarian: {
    weapon_core: {
      core: "核心武器技",
      skills: ["基础技 1 点用于触发资源与易伤", "核心输出技 5 点优先点满", "战吼类技能优先拿增伤、减伤和资源", "机动/解控技能保持 1 点并补强化", "终极技选择爆发窗口最稳定的一项", "关键被动选择强化武器伤害或狂暴收益"],
      bar: ["基础生成", "核心输出", "战吼增伤", "战吼减伤", "位移解控", "终极爆发"],
      paragon: ["起始盘先拿主属性、护甲和可达稀有节点", "第二盘走武器伤害与暴击路线", "第三盘补生存、易伤或资源循环", "雕文优先选择核心技能、武器伤害、暴击、易伤"],
      rotation: ["战吼齐开后进入爆发窗口", "用基础技或资源装备补空档", "核心输出技只在资源足够时连发", "精英和首领前保留终极技"]
    },
    bleed_dot: {
      core: "流血持续伤",
      skills: ["流血核心技 5 点优先点满", "基础技只承担触发和补资源", "战吼类技能优先拿持续时间与减伤", "位移技能用于拉开距离和重置站位", "终极技选择能延长流血窗口的一项", "关键被动选择持续伤害或流血结算收益"],
      bar: ["基础触发", "流血核心", "增伤战吼", "防御战吼", "位移", "终极"],
      paragon: ["起始盘拿持续伤害和生命", "第二盘强化流血、易伤和控制目标伤害", "第三盘补护甲、抗性和冷却", "雕文优先选择持续伤害、双手/切换武器、生存"],
      rotation: ["先上易伤或控制", "铺流血后用战吼放大结算", "移动中保持持续伤不断档", "首领战优先保命和资源循环"]
    },
    thorns: {
      core: "荆棘反伤",
      skills: ["防御技能和嘲讽类效果优先", "核心技能只保留稳定触发与清怪", "战吼点出减伤和资源", "被动优先生命、护甲、荆棘、受击收益", "终极技选择能提高站场能力的一项", "关键被动选择防御或反伤收益"],
      bar: ["拉怪", "防御", "减伤战吼", "核心清怪", "位移", "终极站场"],
      paragon: ["起始盘先拿生命、护甲和荆棘", "第二盘走受击收益和精英减伤", "第三盘补控制减免和抗性", "雕文优先选择荆棘、生命、防御、近战减伤"],
      rotation: ["主动拉怪让反伤命中更多目标", "防御技能不要同时交空", "精英词缀危险时先撤出地面效果", "首领战用核心技能补足单体"]
    }
  },
  druid: {
    storm_earth: {
      core: "风暴/大地技能",
      skills: ["主力自然魔法 5 点优先", "基础技用于资源和触发", "防御技能点出屏障或减伤", "同伴/召唤位只保留功能性", "终极技选择聚怪或爆发", "关键被动选择自然魔法联动"],
      bar: ["基础生成", "主力自然魔法", "防御", "聚怪", "资源补强", "终极"],
      paragon: ["起始盘拿意力、护甲和自然魔法伤害", "第二盘走风暴/大地联动", "第三盘补易伤、暴击或控制", "雕文优先选择自然魔法、元素伤、易伤、生存"],
      rotation: ["先聚怪或上控制", "防御技能覆盖危险窗口", "资源足够时连续释放主力技能", "精英战保留终极技"]
    },
    companion: {
      core: "同伴联动",
      skills: ["同伴技能优先补满主动效果", "主力输出技能 5 点", "防御技能点出护盾或减伤", "基础技只承担补资源", "终极技选择能放大同伴窗口的一项", "关键被动选择同伴或自然联动"],
      bar: ["基础生成", "主力输出", "同伴一", "同伴二", "防御", "终极"],
      paragon: ["起始盘拿同伴伤害和生存", "第二盘走召唤/同伴主动冷却", "第三盘补攻速和暴击", "雕文优先选择同伴、冷却、攻速、生命"],
      rotation: ["同伴主动技能错开放", "精英出现后集中爆发", "空档用主力技能清尾怪", "保持防御技能覆盖高压波次"]
    },
    shapeshift: {
      core: "变形输出",
      skills: ["主力变形技能 5 点", "基础变形技能只做触发", "防御技能点出坚韧或屏障", "机动技能用于穿怪和躲词缀", "终极技选择站场爆发", "关键被动选择变形或压制收益"],
      bar: ["基础触发", "变形主攻", "防御", "机动", "增伤", "终极"],
      paragon: ["起始盘拿生命和护甲", "第二盘走变形、压制或暴击", "第三盘补资源与抗性", "雕文优先选择变形、近战、生存、压制"],
      rotation: ["先用机动贴近精英", "防御技能开启后打满主攻窗口", "资源不足时退一步补循环", "高层优先保命，不贪完整连段"]
    }
  },
  necromancer: {
    minion: {
      core: "召唤体系",
      skills: ["召唤与仆从被动优先", "主力技能 5 点用于指挥输出", "尸体技能保留资源或爆发功能", "诅咒技能点出增伤或减伤", "终极技选择召唤爆发", "关键被动选择仆从收益"],
      bar: ["基础触发", "主力指挥", "尸体功能", "诅咒", "召唤爆发", "终极"],
      paragon: ["起始盘拿智力、生命和仆从伤害", "第二盘走召唤攻速和仆从生存", "第三盘补易伤与冷却", "雕文优先选择仆从、攻速、生存、易伤"],
      rotation: ["先补满仆从数量", "诅咒覆盖精英和首领", "尸体技能用于爆发或续航", "仆从阵亡时优先重建体系"]
    },
    blood_overpower: {
      core: "鲜血压制",
      skills: ["鲜血主力技能 5 点", "基础技补资源和压制节奏", "生存技能点出强固或治疗", "诅咒用于减伤和聚怪", "终极技选择压制窗口", "关键被动选择压制或鲜血收益"],
      bar: ["基础生成", "鲜血主攻", "强固", "诅咒", "位移/保命", "终极"],
      paragon: ["起始盘拿生命、压制和护甲", "第二盘走鲜血与强固收益", "第三盘补资源和冷却", "雕文优先选择压制、生命、强固、生存"],
      rotation: ["先建立强固和生命优势", "压制窗口打主力技能", "高压时保留防御技能", "首领战避免在无资源时开爆发"]
    },
    bone_crit: {
      core: "白骨暴击",
      skills: ["白骨主力技能 5 点", "基础技用于资源和暴击触发", "尸体技能作为资源/控制工具", "诅咒或控制技能用于易伤窗口", "终极技选择暴击爆发", "关键被动选择白骨暴击收益"],
      bar: ["基础生成", "白骨主攻", "易伤控制", "尸体功能", "保命", "终极"],
      paragon: ["起始盘拿暴击、易伤和智力", "第二盘走白骨伤害", "第三盘补资源和生存", "雕文优先选择暴击、白骨、易伤、精英伤"],
      rotation: ["先上易伤", "资源满时连续打白骨主攻", "尸体技能填补资源断档", "精英前保留控制和终极"]
    },
    shadow_dot: {
      core: "暗影持续伤",
      skills: ["暗影主力技能 5 点", "基础技补资源和触发", "尸体技能用于铺场", "诅咒技能保持覆盖", "终极技选择大范围持续伤窗口", "关键被动选择暗影持续伤"],
      bar: ["基础触发", "暗影主攻", "尸体铺场", "诅咒", "保命", "终极"],
      paragon: ["起始盘拿持续伤害和智力", "第二盘走暗影伤害与冷却", "第三盘补生存和资源", "雕文优先选择持续伤害、暗影、冷却、生存"],
      rotation: ["先铺暗影区域", "诅咒覆盖高血量目标", "边移动边保持持续伤不断", "首领战以覆盖率为第一优先"]
    }
  },
  rogue: {
    marksman: {
      core: "射手远程",
      skills: ["射手核心技能 5 点", "基础技用于资源和连击点", "位移技能点出解控", "灌注技能优先增伤", "陷阱或控制技能用于聚怪", "关键被动选择暴击或易伤收益"],
      bar: ["基础生成", "射手主攻", "位移", "灌注", "控制", "终极/爆发"],
      paragon: ["起始盘拿敏捷、暴击和易伤", "第二盘走射手伤害", "第三盘补机动和生存", "雕文优先选择射手、暴击、易伤、精英伤"],
      rotation: ["远距离起手上易伤", "灌注后打主攻技能", "位移只在危险词缀或追怪时使用", "精英前保留控制"]
    },
    cutthroat: {
      core: "近战爆发",
      skills: ["近战核心技能 5 点", "基础技用于连击点或资源", "位移技能保持 1 点并补强化", "灌注技能选择单体或范围", "防御技能点出减伤", "关键被动选择攻速或连击收益"],
      bar: ["基础生成", "近战主攻", "位移", "灌注", "防御", "爆发"],
      paragon: ["起始盘拿敏捷、近战伤和生命", "第二盘走攻速与暴击", "第三盘补抗性和控制减免", "雕文优先选择近战、攻速、暴击、生存"],
      rotation: ["攒资源或连击点", "灌注后贴脸打主攻", "打完窗口立刻撤出危险区域", "高层避免无防御贴脸"]
    },
    trap_imbue: {
      core: "陷阱/灌注",
      skills: ["陷阱技能优先冷却和控制", "灌注技能补元素伤害", "核心技能 5 点作为引爆载体", "位移技能用于布位", "终极技选择陷阱爆发", "关键被动选择幸运一击或陷阱收益"],
      bar: ["基础生成", "核心引爆", "陷阱一", "陷阱二", "灌注", "位移"],
      paragon: ["起始盘拿冷却、敏捷和控制目标伤", "第二盘走陷阱伤害", "第三盘补幸运一击和生存", "雕文优先选择陷阱、冷却、幸运一击、元素伤"],
      rotation: ["先布陷阱再拉怪", "灌注后用核心技能引爆", "冷却空档保持走位", "首领战按冷却循环打满窗口"]
    }
  },
  sorcerer: {
    fire: {
      core: "火焰输出",
      skills: ["火焰主力技能 5 点", "基础技只保留触发", "防御技能点出屏障", "机动技能保持强化", "召唤/附魔位选择增伤触发", "关键被动选择燃烧或火焰收益"],
      bar: ["基础触发", "火焰主攻", "屏障", "传送", "召唤/增伤", "终极"],
      paragon: ["起始盘拿智力、火焰伤和生命", "第二盘走燃烧/火焰乘区", "第三盘补冷却和屏障", "雕文优先选择火焰、元素、暴击、生存"],
      rotation: ["先开屏障再进输出位", "火焰主攻打满爆发窗口", "传送只用于调整站位", "高层优先保证屏障覆盖"]
    },
    frost: {
      core: "冰霜控制",
      skills: ["冰霜主力技能 5 点", "防御技能点出屏障和免控", "控制技能用于冻结和易伤", "机动技能强化", "终极技选择冰霜爆发", "关键被动选择冻结或易伤收益"],
      bar: ["基础触发", "冰霜主攻", "屏障", "冻结控制", "传送", "终极"],
      paragon: ["起始盘拿智力、易伤和生存", "第二盘走冻结目标伤害", "第三盘补冷却和抗性", "雕文优先选择冰霜、易伤、控制、生存"],
      rotation: ["先冻结或上易伤", "冰霜主攻打冻结窗口", "屏障不要断", "精英不可控时优先生存"]
    },
    shock: {
      core: "电击触发",
      skills: ["电击主力技能 5 点", "基础技或召唤用于触发幸运一击", "防御技能点出屏障", "传送用于走位和触发", "终极技选择高频爆发", "关键被动选择电击或攻速收益"],
      bar: ["基础触发", "电击主攻", "屏障", "传送", "召唤触发", "终极"],
      paragon: ["起始盘拿攻速、暴击和智力", "第二盘走电击伤害", "第三盘补幸运一击与冷却", "雕文优先选择电击、攻速、幸运一击、暴击"],
      rotation: ["先开触发技能", "用电击主攻维持高频命中", "传送处理危险地面", "终极技对精英包或首领使用"]
    },
    conjuration: {
      core: "召唤联动",
      skills: ["召唤技能优先补满核心节点", "主力技能 5 点作为主动输出", "防御技能点出屏障", "传送保持强化", "终极技选择召唤爆发", "关键被动选择召唤或元素联动"],
      bar: ["主力输出", "召唤一", "召唤二", "屏障", "传送", "终极"],
      paragon: ["起始盘拿召唤伤害和智力", "第二盘走冷却与全伤乘区", "第三盘补屏障和生存", "雕文优先选择召唤、冷却、元素伤、生存"],
      rotation: ["先铺召唤物", "屏障后进入输出窗口", "冷却好就刷新召唤主动", "首领战保持召唤覆盖率"]
    }
  },
  spiritborn: {
    jaguar_eagle: {
      core: "美洲豹/雄鹰机动",
      skills: ["主力机动输出技能 5 点", "基础技用于活力循环", "防御技能点出减伤", "位移技能强化", "终极技选择爆发或聚怪", "关键被动选择攻速或机动收益"],
      bar: ["基础生成", "主力输出", "位移", "防御", "增伤", "终极"],
      paragon: ["起始盘拿敏捷、攻速和生命", "第二盘走机动与暴击", "第三盘补活力和抗性", "雕文优先选择攻速、暴击、机动、生存"],
      rotation: ["用位移进入安全角度", "活力足够时连打主攻", "防御技能覆盖精英词缀", "速刷时优先路线和拉怪效率"]
    },
    gorilla: {
      core: "猩猩坚韧",
      skills: ["主力重击技能 5 点", "基础技用于活力循环", "防御技能优先点满关键节点", "控制技能保留聚怪", "终极技选择站场爆发", "关键被动选择强韧或压制收益"],
      bar: ["基础生成", "重击主攻", "防御", "聚怪", "增伤", "终极"],
      paragon: ["起始盘拿生命、护甲和压制", "第二盘走强韧和近战伤", "第三盘补资源与抗性", "雕文优先选择压制、生命、近战、生存"],
      rotation: ["先建立防御层", "聚怪后打主攻窗口", "危险词缀时保留防御技能", "首领战用压制窗口爆发"]
    },
    centipede: {
      core: "蜈蚣持续伤",
      skills: ["持续伤主力技能 5 点", "基础技用于活力和触发", "防御技能点出减伤", "控制或减益技能保持覆盖", "终极技选择持续伤放大", "关键被动选择毒素或持续伤收益"],
      bar: ["基础触发", "持续伤主攻", "减益", "防御", "位移", "终极"],
      paragon: ["起始盘拿持续伤害和生存", "第二盘走幸运一击与冷却", "第三盘补资源和抗性", "雕文优先选择持续伤、幸运一击、冷却、生存"],
      rotation: ["先上减益", "持续伤铺满后移动拉怪", "冷却好就刷新爆发窗口", "高层以覆盖率和站位为核心"]
    }
  }
};

function fallbackTemplate(archetype) {
  return {
    core: archetype.zhName,
    skills: ["主力输出技能 5 点优先", "基础技能只承担资源、触发或易伤", "防御技能至少 1 点并补关键强化", "机动技能保持可用", "终极技选择最稳定的爆发窗口", "关键被动根据主要词缀收益选择"],
    bar: ["基础触发", "主力输出", "防御", "机动", "增伤/控制", "终极"],
    paragon: ["起始盘先拿主属性、护甲和生命", "第二盘围绕主要伤害标签", "第三盘补资源、冷却和抗性", "雕文优先跟随主词缀类别"],
    rotation: ["先建立防御和资源", "上控制或易伤后打主力输出", "危险词缀出现时先移动", "精英和首领前保留爆发技能"]
  };
}

function classGuideTemplate(classInfo, archetype) {
  return guideTemplates[classInfo.id]?.[archetype.id] ?? fallbackTemplate(archetype);
}

function modeAdvice(mode) {
  return {
    pit_push: "冲层版本优先生存、单体和稳定爆发，允许牺牲部分移动速度。",
    speed_farm: "速刷版本优先移动、冷却和起手速度，伤害只需要覆盖当前难度阈值。",
    daily: "日常版本优先容错、资源循环和操作舒适度，不追求极限榜单速度。"
  }[mode];
}

function buildGuide({ archetype, mode, classInfo, profile, synergyItems, seasonIndex }) {
  const template = classGuideTemplate(classInfo, archetype);
  const statPriority = archetype.primaryStats.map((stat) => zh.stat(stat));
  const recommended = synergyItems.map(({ item }) => ({
    id: item.id,
    zhName: item.zhName,
    zhVisualType: item.zhVisualType,
    reason: `${item.zhBuildRole}；固定词缀命中 ${item.zhGuaranteedAffixes.join(" / ")}。`
  }));
  return {
    summary: `${classInfo.zhName}「${archetype.zhName}」${profile.zhName}方案。${modeAdvice(mode)}`,
    skillPlan: {
      core: template.core,
      bar: template.bar,
      priority: template.skills
    },
    paragonPlan: {
      boardRoute: template.paragon,
      glyphPriority: statPriority.slice(0, 4),
      rule: "先用最短路径拿到雕文孔和关键稀有节点，再按真实装备词缀补齐抗性、护甲、资源或冷却。"
    },
    gearPlan: {
      statPriority,
      slotPriority: [
        `武器：${statPriority[0] ?? "武器伤害"}、技能等级、易伤或暴击相关词缀优先。`,
        `首饰：${statPriority[1] ?? "资源循环"}、冷却、资源和乘区词缀优先。`,
        "防具：护甲、生命、抗性、冷却和关键技能等级优先。",
        "靴子与手套：移动速度、攻速、幸运一击或流派触发词缀优先。"
      ],
      recommendedItems: recommended,
      tempering: ["过渡期先补资源与生存", "终局期再追主词缀、乘区和冷却", "未接入全量淬炼/精造库前不写死单条最优词缀"]
    },
    rotation: template.rotation,
    leveling: [
      "1-35 级：不锁死终局装备，选择手感顺、范围稳定的主力技能。",
      "35-60 级：用最高装等武器和资源词缀推进难度。",
      "60 级后：围绕核心唯一装备、抗性上限和雕文等级重构。",
      "进入冲层：先保证不被秒杀，再调高伤害乘区和爆发窗口。"
    ],
    dataCompleteness: {
      equipmentAffixes: "官方 3.1.0 固定词缀已接入",
      uniquePower: "暗金特效与完整数值范围待授权数据源回填",
      skillRanks: "技能顺序为构筑模板，精确点数待游戏内/可审计数据源校准",
      paragon: "巅峰路径为路线模板，具体盘名、节点坐标和雕文半径继续按来源整理",
      prediction: seasonIndex === 0 ? "基于官方补丁资料的预测" : "未来赛季低置信度推演"
    }
  };
}

function scoreArchetype(archetype, mode, classInfo, seasonIndex, equipmentItems) {
  const classId = classInfo.id;
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
      zhName: item.zhName,
      visualType: item.visualType,
      image: item.image,
      externalImage: item.externalImage,
      guaranteedAffixes: item.guaranteedAffixes.map((affix) => affix.name),
      zhGuaranteedAffixes: item.zhGuaranteedAffixes
    })),
    evidence: [
      {
        type: "stat_priority",
        zhLabel: "词缀优先级",
        zhStatus: "结构化模板",
        zhDetail: `${profile.zhName}优先 ${archetype.primaryStats.slice(0, 3).map((stat) => zh.stat(stat)).join(" / ")}。`
      },
      {
        type: "equipment_seed",
        zhLabel: "装备协同",
        zhStatus: "官方词缀 + 社区特效",
        zhDetail: "装备协同来自官方 3.1.0 固定词缀种子，并用暗黑核社区数据库补充暗金特效、掉落来源和验证部位；完整范围词缀仍按字段状态校验。"
      }
    ],
    guide: buildGuide({ archetype, mode, classInfo, profile, synergyItems, seasonIndex })
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
        .map((archetype) => scoreArchetype(archetype, mode, classInfo, seasonIndex, equipment.items))
        .sort((a, b) => b.score - a.score);
      modes[mode] = {
        modeName: modeProfiles[mode].zhName,
        topBuilds: ranked.slice(0, 3),
        pit150SpeedPrediction: {
          bestMinutes: ranked[0]?.predictedPit150Minutes ?? null,
          classRankScore: ranked[0]?.score ?? null,
          caveat: "不是榜单结果；需要赛季开服后的真实通关和热修数据校准。"
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
  warning: "预测不是事实榜单；每个赛季开始后必须用真实通关、速刷和热修补丁数据更新。",
  zhWarning: zh.warning(),
  seasons: seasons.map((season) => ({
    ...season,
    zhLabel: zh.seasonLabel(season.label),
    zhAssumption: zh.seasonAssumption(season.assumption)
  })),
  modeProfiles,
  rows: rows.map((row) => ({
    ...row,
    zhModelStatus: zh.modelStatus(row.modelStatus),
    zhAssumption: zh.seasonAssumption(row.assumption)
  }))
};

await mkdir(path.dirname(output), { recursive: true });
await writeFile(output, `${JSON.stringify(payload, null, 2)}\n`);
console.log(`Wrote ${rows.length} class-season simulation rows to ${path.relative(root, output)}`);
