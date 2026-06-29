import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { zh } from "./lib/zh-localization.mjs";

const root = path.resolve(new URL(".", import.meta.url).pathname, "..");
const classPath = path.join(root, "data/classes/classes.json");
const archetypePath = path.join(root, "data/builds/archetypes.json");
const equipmentPath = path.join(root, "data/equipment/equipment-library.json");
const simulationsPath = path.join(root, "data/generated/build-simulations.json");
const overridePath = path.join(root, "data/builds/community-build-overrides.json");
const aspectOverridePath = path.join(root, "data/aspects/community-aspect-overrides.json");
const aspectLibraryPath = path.join(root, "data/aspects/d2core-aspect-library.json");
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

const placeholderAspectNames = new Set(["暗金特效位", "神话暗金位", "空槽说明", "空槽位"]);
const equipmentNameAliases = new Map([
  ["提鲍特的意志", "迪博特的意志"],
  ["塞利格的融心", "塞利格的溶解之心"],
  ["闪烁步履", "摇曳之步"],
  ["净化光明使者", "净化之光明使者"],
  ["邪恶新月", "猎手的巅峰"],
  ["盈月", "盈月当空"],
  ["伊菲的可怖图腾", "伊菲的恐狼图腾"],
  ["雷神的祝福", "雷神之赐"],
  ["伪死之衣", "虚假死亡之衣"]
]);
const aspectNameAliases = new Map([
  ["模仿灌注威能", "效法灌注之威能"],
  ["自负威能", "嚣狂威能"],
  ["熊人恐怖威能", "恐怖熊人之威能"],
  ["变形债务威能", "变身索债之威能"],
  ["愈合石威能", "疗愈石之威能"],
  ["锯齿威能", "齿状骨刺之威能"],
  ["刺骨寒冰威能", "刺骨冰霜之威能"],
  ["晦暗治愈威能", "晦暗疗愈之威能"],
  ["平原之力威能", "平原力量之威能"],
  ["决斗者威能", "决斗家的威能"],
  ["不屈打击威能", "不屈猛击之威能"],
  ["森林之力威能", "森林力量之威能"]
]);

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

const archetypeRoutePlans = {
  barbarian: {
    weapon_core: {
      core: "旋风斩",
      bar: ["猛击", "旋风斩", "集结呐喊", "战吼", "挑战怒吼", "狂战士之怒"],
      roles: ["补怒和易伤触发", "持续主攻", "资源、移速和不可阻挡", "爆发增伤", "高压减伤", "精英和首领爆发"],
      passives: ["暴怒冲动", "震耳嗓音", "迅捷怒火", "深坑斗士", "不受约束"],
      boards: ["战争使者", "屠戮", "血怒", "武器大师", "无瑕技艺", "碎骨者"],
      glyphs: ["旋风", "愤怒", "统帅", "利用", "无畏", "领地"]
    },
    bleed_dot: {
      core: "撕裂",
      bar: ["剥皮", "撕裂", "集结呐喊", "钢铁之肤", "战吼", "狂战士之怒"],
      roles: ["流血和易伤入口", "流血主攻", "资源和不可阻挡", "屏障与保命", "爆发增伤", "狂暴窗口"],
      passives: ["割裂伤口", "血流不止", "劲力战吼", "防御姿态", "不受约束"],
      boards: ["血怒", "放血", "战争使者", "武器大师", "屠戮", "碎骨者"],
      glyphs: ["割裂", "利用", "统帅", "无畏", "愤怒", "领地"]
    },
    thorns: {
      core: "荆棘反伤",
      bar: ["狂乱", "钢铁之肤", "集结呐喊", "挑战怒吼", "战吼", "先祖召唤"],
      roles: ["攻速和减伤叠层", "屏障和荆棘承伤", "资源与不可阻挡", "拉怪承压", "增伤和仇恨窗口", "首领爆发"],
      passives: ["爆发", "坚如钢钉", "防御姿态", "震耳嗓音", "无拘怒气"],
      boards: ["战争使者", "血怒", "碎骨者", "武器大师", "屠戮", "无瑕技艺"],
      glyphs: ["领地", "无畏", "统帅", "愤怒", "复仇", "力量"]
    }
  },
  druid: {
    storm_earth: {
      core: "粉碎",
      bar: ["突进爪击", "粉碎", "大地壁垒", "挫志咆哮", "践踏", "灰熊狂怒"],
      roles: ["位移和灵力填补", "震波主攻", "屏障、解控和强固", "近战减伤", "开路和强固", "终局爆发"],
      passives: ["大地之力", "狂野冲动", "粉碎之土", "石化之力", "防御姿态"],
      boards: ["雷霆打击", "生存本能", "先祖指引", "构造板块", "大地毁灭", "恶意增强"],
      glyphs: ["守护者", "灵魂", "领地", "无畏", "天地", "利用"]
    },
    companion: {
      core: "同伴爆发",
      bar: ["风暴打击", "狼群", "剧毒藤蔓", "渡鸦", "大地壁垒", "灰熊狂怒"],
      roles: ["易伤和灵力入口", "同伴单体", "定身和毒素爆发", "范围增伤", "屏障与解控", "爆发和韧性"],
      passives: ["呼唤野性", "毒素爪击", "自然延展", "警戒", "完美风暴"],
      boards: ["同伴", "雷霆打击", "先祖指引", "生存本能", "内在野兽", "恶意增强"],
      glyphs: ["守护者", "野性", "灵魂", "领地", "无畏", "利用"]
    },
    shapeshift: {
      core: "撕碎",
      bar: ["爪击", "撕碎", "血性狂吼", "挫志咆哮", "践踏", "灰熊狂怒"],
      roles: ["变形触发", "机动主攻", "治疗和资源", "近战减伤", "强固和位移", "终局爆发"],
      passives: ["野性呼唤", "兽性狂暴", "快速变形", "自然坚毅", "防御姿态"],
      boards: ["内在野兽", "生存本能", "雷霆打击", "先祖指引", "大地毁灭", "恶意增强"],
      glyphs: ["狼化", "领地", "守护者", "无畏", "灵魂", "利用"]
    }
  },
  necromancer: {
    minion: {
      core: "仆从军团",
      bar: ["收割", "枯萎", "骷髅战士", "骷髅法师", "衰老", "亡者大军"],
      roles: ["生成亡骸和减伤", "暗影地面和增伤", "前排承伤", "远程输出", "减速与减伤", "仆从爆发"],
      passives: ["亡者复生", "精魂纽带", "邪教领袖", "骸骨收割", "死亡迫近"],
      boards: ["邪教领袖", "亡者复生", "枯萎", "血流成河", "白骨移植", "死亡气息"],
      glyphs: ["死灵法师", "控制", "利用", "骸骨", "黑暗", "领地"]
    },
    blood_overpower: {
      core: "血涌",
      bar: ["出血", "血涌", "血雾", "衰老", "亡骸卷须", "血潮"],
      roles: ["鲜血球和精魂", "压制主攻", "免疫与保命", "减伤和冷却", "聚怪和易伤", "大范围压制"],
      passives: ["拉斯玛的活力", "血之潮汐", "凝结之血", "死亡之拥", "鼓舞领袖"],
      boards: ["血流成河", "浴血而生", "死亡气息", "邪教领袖", "白骨移植", "枯萎"],
      glyphs: ["饮血者", "领地", "控制", "利用", "骸骨", "精魂"]
    },
    bone_crit: {
      core: "白骨矛",
      bar: ["白骨碎片", "白骨矛", "血雾", "衰老", "亡骸卷须", "白骨风暴"],
      roles: ["精魂和暴击入口", "穿透主攻", "免疫保命", "冷却和减伤", "聚怪易伤", "暴击和减伤"],
      passives: ["骨化精魂", "复合骨折", "开裂", "锯齿骨刺", "独立作战"],
      boards: ["白骨移植", "死亡气息", "邪教领袖", "血流成河", "枯萎", "亡者复生"],
      glyphs: ["精魂", "利用", "控制", "骸骨", "领地", "无畏"]
    },
    shadow_dot: {
      core: "枯萎",
      bar: ["分解", "枯萎", "血雾", "衰老", "亡骸卷须", "白骨风暴"],
      roles: ["暗影和精魂入口", "持续伤主攻", "免疫保命", "减伤覆盖", "聚怪触发", "终局减伤"],
      passives: ["暗影枯萎", "夺魂之镰", "死亡之拥", "恐怖收割", "死亡迫近"],
      boards: ["枯萎", "死亡气息", "邪教领袖", "白骨移植", "血流成河", "亡者复生"],
      glyphs: ["黑暗", "控制", "利用", "领地", "骸骨", "精魂"]
    }
  },
  rogue: {
    marksman: {
      core: "穿透射击",
      bar: ["穿刺飞刀", "穿透射击", "疾行斩", "暗影步", "冰霜灌注", "暗影克隆"],
      roles: ["易伤和连击点", "远程主攻", "路线和脱离", "解控与贴身", "控制增伤", "爆发复制"],
      passives: ["精准", "武器精通", "剥削手段", "敏捷", "恶意"],
      boards: ["狡诈计谋", "致命伏击", "诡诈", "无目击者", "利用弱点", "廉价射击"],
      glyphs: ["战斗", "利用", "控制", "追踪者", "流体", "无畏"]
    },
    cutthroat: {
      core: "回旋刀锋",
      bar: ["穿刺飞刀", "回旋刀锋", "疾行斩", "暗影步", "暗影灌注", "暗影克隆"],
      roles: ["易伤和连击点", "近战主攻", "穿怪位移", "解控和精英贴身", "清场爆发", "首领爆发"],
      passives: ["动量", "武器精通", "剥削手段", "坚韧", "恶意"],
      boards: ["诡诈", "利用弱点", "无目击者", "致命伏击", "狡诈计谋", "廉价射击"],
      glyphs: ["近战", "利用", "控制", "战斗", "流体", "领地"]
    },
    trap_imbue: {
      core: "毒素陷阱",
      bar: ["穿刺飞刀", "连射", "疾行斩", "毒素陷阱", "毒素灌注", "死亡陷阱"],
      roles: ["连击点和易伤", "补单体输出", "移动和拉怪", "控制与毒池", "毒素爆发", "聚怪终极"],
      passives: ["精准灌注", "陷阱精通", "剥削手段", "恶意", "肾上腺素"],
      boards: ["致命伏击", "狡诈计谋", "利用弱点", "诡诈", "无目击者", "廉价射击"],
      glyphs: ["伏击", "控制", "利用", "追踪者", "战斗", "流体"]
    }
  },
  sorcerer: {
    fire: {
      core: "火球",
      bar: ["火焰弹", "火球", "火焰护盾", "传送术", "火蛇", "炼狱烈焰"],
      roles: ["燃烧触发", "火焰主攻", "免疫保命", "位移和解控", "增伤召唤", "聚怪爆发"],
      passives: ["艾苏的凶暴", "吞噬烈焰", "元素调和", "防护结界", "玻璃大炮"],
      boards: ["燃烧本能", "火焰狂热", "元素召唤师", "静电奔涌", "冰冷命运", "灼热高温"],
      glyphs: ["火焰馈赠", "元素使", "控制", "利用", "战术家", "领地"]
    },
    frost: {
      core: "寒冰碎片",
      bar: ["冰霜弹", "寒冰碎片", "寒冰护甲", "传送术", "冰霜新星", "深度冻结"],
      roles: ["冰冷和法力入口", "易伤主攻", "屏障与资源", "位移解控", "冻结和易伤", "保命重置"],
      passives: ["雪崩", "寒霜之灾", "冰冷之触", "元素调和", "防护结界"],
      boards: ["冰冷命运", "冰瀑", "元素召唤师", "燃烧本能", "静电奔涌", "不灭导体"],
      glyphs: ["寒霜撕咬", "控制", "元素使", "利用", "战术家", "领地"]
    },
    shock: {
      core: "连锁闪电",
      bar: ["电弧鞭笞", "连锁闪电", "火焰护盾", "传送术", "闪电长矛", "不稳电流"],
      roles: ["攻速和电击触发", "弹跳主攻", "免疫保命", "位移和聚怪", "眩晕和易伤", "电击爆发"],
      passives: ["维尔的御雷术", "电能震荡", "传导", "元素调和", "玻璃大炮"],
      boards: ["静电奔涌", "不灭导体", "元素召唤师", "冰冷命运", "燃烧本能", "灼热高温"],
      glyphs: ["充能", "控制", "元素使", "利用", "战术家", "领地"]
    },
    conjuration: {
      core: "召唤爆发",
      bar: ["火焰弹", "冰刃", "寒冰护甲", "传送术", "闪电长矛", "不稳电流"],
      roles: ["燃烧触发", "冷却和易伤", "屏障防御", "位移解控", "召唤主轴", "电击爆发"],
      passives: ["召唤精通", "元素调和", "防护结界", "玻璃大炮", "维尔的御雷术"],
      boards: ["元素召唤师", "静电奔涌", "冰冷命运", "燃烧本能", "不灭导体", "冰瀑"],
      glyphs: ["元素使", "召唤师", "控制", "利用", "战术家", "领地"]
    }
  },
  spiritborn: {
    jaguar_eagle: {
      core: "羽毛齐射",
      bar: ["雷刺", "羽毛齐射", "腾空", "劫掠者", "漩涡", "猎手"],
      roles: ["活力和易伤入口", "远程主攻", "位移和规避", "美洲豹增伤", "聚怪和控制", "终极追猎"],
      passives: ["适应姿态", "活力流转", "顶点", "快速爪击", "掠食本能"],
      boards: ["显现之心", "粘性护盾", "狩猎本能", "揭露弱点", "沸腾之池", "内在活力"],
      glyphs: ["猛禽", "利用", "控制", "领地", "精神", "无畏"]
    },
    sunbird_firestorm: {
      core: "日炎风暴",
      bar: ["雷刺", "日炎风暴", "腾空", "劫掠者", "灾祸", "猎手"],
      roles: ["活力入口", "火焰风暴主攻", "位移和规避", "增伤窗口", "毒素和控制", "终极爆发"],
      passives: ["适应姿态", "活力流转", "顶点", "掠食本能", "精神调和"],
      boards: ["沸腾之池", "显现之心", "揭露弱点", "狩猎本能", "粘性护盾", "内在活力"],
      glyphs: ["火翼", "利用", "控制", "猛禽", "精神", "领地"]
    },
    gorilla: {
      core: "震地重击",
      bar: ["碎岩者", "震地重击", "腾空", "铁甲皮肤", "漩涡", "守护者"],
      roles: ["护甲和活力入口", "压制主攻", "位移", "护盾防御", "聚怪", "高压守护"],
      passives: ["适应姿态", "坚韧皮肤", "活力流转", "顶点", "防御本能"],
      boards: ["粘性护盾", "内在活力", "显现之心", "揭露弱点", "狩猎本能", "沸腾之池"],
      glyphs: ["猩猩", "无畏", "领地", "精神", "利用", "控制"]
    },
    centipede: {
      core: "毒刺扫荡",
      bar: ["凋零之拳", "毒刺扫荡", "腾空", "灾祸", "漩涡", "吞噬者"],
      roles: ["毒素入口", "持续伤主攻", "位移", "毒素爆发", "聚怪控制", "吞噬终极"],
      passives: ["适应姿态", "毒素调和", "活力流转", "顶点", "腐蚀本能"],
      boards: ["揭露弱点", "沸腾之池", "显现之心", "内在活力", "粘性护盾", "狩猎本能"],
      glyphs: ["蜈蚣", "控制", "利用", "精神", "领地", "无畏"]
    }
  },
  paladin: {
    shield_bash: {
      core: "盾击",
      bar: ["惩击", "盾击", "神圣壁垒", "冲锋", "审判光环", "天罚"],
      roles: ["资源和格挡入口", "盾牌主攻", "屏障防御", "位移和开路", "增伤与减伤", "终极爆发"],
      passives: ["神圣坚毅", "盾牌专精", "光环延展", "审判增幅", "坚定信念"],
      boards: ["圣盾壁垒", "审判者", "光环统御", "神圣远征", "殉道守护", "天罚回响"],
      glyphs: ["盾卫", "审判", "控制", "利用", "领地", "无畏"]
    },
    blessed_hammer: {
      core: "祝福之锤",
      bar: ["惩击", "祝福之锤", "神圣壁垒", "冲锋", "定罪光环", "天堂之怒"],
      roles: ["资源入口", "旋转锤主攻", "屏障防御", "位移", "光环增伤", "大范围爆发"],
      passives: ["祝福回响", "光环延展", "神圣专注", "审判增幅", "坚定信念"],
      boards: ["祝福回环", "光环统御", "审判者", "神圣远征", "圣盾壁垒", "天罚回响"],
      glyphs: ["祝福", "审判", "利用", "控制", "领地", "无畏"]
    },
    aura_juggernaut: {
      core: "光环重装",
      bar: ["惩击", "圣光打击", "神圣壁垒", "奉献", "庇护光环", "圣军化身"],
      roles: ["资源入口", "稳定主攻", "屏障防御", "地面控制", "团队减伤", "终极形态"],
      passives: ["重装信条", "光环延展", "神圣坚毅", "殉道守护", "坚定信念"],
      boards: ["光环统御", "殉道守护", "圣盾壁垒", "神圣远征", "审判者", "祝福回环"],
      glyphs: ["庇护", "盾卫", "领地", "无畏", "审判", "控制"]
    }
  },
  warlock: {
    demonology: {
      core: "恶魔军团",
      bar: ["暗影箭", "召唤恶魔", "恶魔护盾", "献祭", "恐惧诅咒", "恶魔化身"],
      roles: ["资源和暗影入口", "召唤主轴", "护盾防御", "持续伤", "控制和减伤", "终极形态"],
      passives: ["恶魔契约", "黑暗仪式", "痛苦增幅", "灵魂护盾", "毁灭预兆"],
      boards: ["恶魔契约", "深渊印记", "灵魂熔炉", "末日回响", "地狱火环", "痛苦延展"],
      glyphs: ["恶魔", "控制", "利用", "领地", "无畏", "黑暗"]
    },
    hellfire: {
      core: "地狱火",
      bar: ["火焰箭", "地狱火", "恶魔护盾", "烈焰裂隙", "燃烧诅咒", "末日陨火"],
      roles: ["燃烧入口", "火焰主攻", "护盾防御", "地面爆发", "增伤诅咒", "终极火雨"],
      passives: ["地狱灼烧", "黑暗仪式", "痛苦增幅", "灵魂护盾", "毁灭预兆"],
      boards: ["地狱火环", "末日回响", "深渊印记", "灵魂熔炉", "恶魔契约", "痛苦延展"],
      glyphs: ["地狱火", "利用", "控制", "黑暗", "领地", "无畏"]
    },
    abyss_sigils: {
      core: "深渊符印",
      bar: ["暗影箭", "深渊符印", "恶魔护盾", "虚空裂隙", "恐惧诅咒", "深渊降临"],
      roles: ["暗影入口", "符印主攻", "护盾防御", "聚怪和持续伤", "控制减伤", "终极爆发"],
      passives: ["深渊共鸣", "黑暗仪式", "灵魂护盾", "痛苦增幅", "毁灭预兆"],
      boards: ["深渊印记", "灵魂熔炉", "痛苦延展", "末日回响", "恶魔契约", "地狱火环"],
      glyphs: ["深渊", "控制", "利用", "黑暗", "领地", "无畏"]
    },
    doom_dot: {
      core: "毁灭诅咒",
      bar: ["暗影箭", "毁灭诅咒", "恶魔护盾", "痛苦印记", "恐惧诅咒", "末日仪式"],
      roles: ["暗影入口", "持续伤主轴", "护盾防御", "叠层和易伤", "控制减伤", "终局爆发"],
      passives: ["毁灭预兆", "痛苦增幅", "黑暗仪式", "灵魂护盾", "深渊共鸣"],
      boards: ["末日回响", "痛苦延展", "深渊印记", "灵魂熔炉", "恶魔契约", "地狱火环"],
      glyphs: ["毁灭", "控制", "利用", "黑暗", "领地", "无畏"]
    }
  }
};

function routePlanFor(classId, archetypeId) {
  return archetypeRoutePlans[classId]?.[archetypeId] || null;
}

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
      description: `${item.zhBuildRole || "暗金组件"}，固定词缀：${(item.zhGuaranteedAffixes || []).join(" / ") || "词缀资料整理中"}。`
  };
}

function createEquipmentIndex(items) {
  return {
    byId: new Map(items.map((item) => [item.id, item])),
    byZhName: new Map(items.map((item) => [item.zhName, item]))
  };
}

function lookupEquipmentForTarget(target, equipmentIndex) {
  if (!target || !equipmentIndex) return null;
  if (target.itemId && equipmentIndex.byId.has(target.itemId)) return equipmentIndex.byId.get(target.itemId);
  if (target.zhName && equipmentIndex.byZhName.has(target.zhName)) return equipmentIndex.byZhName.get(target.zhName);
  const alias = equipmentNameAliases.get(target.zhName);
  return alias ? equipmentIndex.byZhName.get(alias) : null;
}

function normalizeAspectName(name) {
  return String(name || "")
    .replace(/[的之·\s]/g, "")
    .replace(/威能$/, "")
    .trim();
}

function createAspectEffectIndex(overrides) {
  const byName = new Map();
  const byNormalizedName = new Map();
  for (const item of overrides?.items || []) {
    for (const name of [item.aspectName, item.zhName, item.source?.sourceChineseName]) {
      if (!name) continue;
      byName.set(name, item);
      byNormalizedName.set(normalizeAspectName(name), item);
    }
  }
  return { byName, byNormalizedName };
}

function lookupAspectEffect(aspectName, aspectIndex) {
  if (!aspectName || !aspectIndex) return null;
  const alias = aspectNameAliases.get(aspectName);
  return aspectIndex.byName.get(aspectName)
    || aspectIndex.byNormalizedName.get(normalizeAspectName(aspectName))
    || (alias ? aspectIndex.byName.get(alias) || aspectIndex.byNormalizedName.get(normalizeAspectName(alias)) : null)
    || null;
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

function playerPowerForSlot(slot) {
  const targetType = slot.target?.type;
  const targetName = slot.target?.zhName || slot.target?.name;
  const aspectName = slot.aspect?.name || "";
  if (targetType === "mythic") {
    return { displayKind: "mythic_unique_power", displayName: `${targetName || "神话暗金"}特效` };
  }
  if (targetType === "unique") {
    return { displayKind: "unique_power", displayName: `${targetName || "暗金"}特效` };
  }
  if (placeholderAspectNames.has(aspectName)) {
    return {
      displayKind: "unused_or_special_slot",
      displayName: targetName?.startsWith("不使用") ? targetName : (slot.aspect?.role || "特殊槽位说明")
    };
  }
  return { displayKind: "legendary_aspect", displayName: aspectName || "威能待来源回填" };
}

function slotPlayerDataStatus(slot, power, isCommunityReference = false) {
  if (power.displayKind === "unused_or_special_slot") {
    return isCommunityReference
      ? "社区 BD 装备栏说明该位置不占用或由双手/副手方案替代。"
      : "结构化装备栏说明该位置不占用或由其他武器方案替代。";
  }
  if (isCommunityReference) {
    if (power.displayKind === "legendary_aspect") {
      return power.powerText
        ? "社区 BD 装备位参考；威能效果来自暗黑核社区数据库，赛季强度仍需按来源核对。"
        : "社区 BD 装备位参考；威能效果、数值和赛季强度仍需按来源核对。";
    }
    return power.powerText
      ? "社区 BD 装备位参考；唯一装备固定词缀和暗金特效文本已接入，赛季强度仍需核对。"
      : "社区 BD 装备位参考；唯一装备固定词缀已接入，暗金特效数值仍需校验。";
  }
  if (power.displayKind === "legendary_aspect") {
    return power.powerText
      ? "传奇威能效果来自暗黑核社区数据库；赛季强度仍需实战校验。"
      : "传奇威能来自结构化 BD 模板；完整效果和数值需接入可靠威能库校验。";
  }
  return power.powerText
    ? "官方唯一装备固定词缀和暗金特效文本已接入；赛季强度仍需实战校验。"
    : "官方唯一装备固定词缀已接入；暗金特效完整数值仍需校验。";
}

function withPlayerPower(slot, options = {}) {
  const matchedEquipment = lookupEquipmentForTarget(slot.target, options.equipmentIndex);
  const matchedAspect = lookupAspectEffect(slot.aspect?.name, options.aspectIndex);
  const basePower = playerPowerForSlot(slot);
  const power = {
    ...basePower,
    displayName: matchedEquipment && basePower.displayKind !== "legendary_aspect"
      ? `${matchedEquipment.zhName}特效`
      : basePower.displayName,
    powerText: matchedEquipment?.zhUniquePower || matchedEquipment?.uniquePower || matchedAspect?.zhEffect || null,
    powerSourceStatus: matchedEquipment
      ? "装备库特效文本：官方 3.1.0 种子 + 社区数据库校对"
      : matchedAspect
        ? `暗黑核威能库：${matchedAspect.source?.d2coreBuild || "版本整理中"} · ${matchedAspect.zhAspectType || "类型整理中"}`
        : null,
    matchedItemId: matchedEquipment?.id || null,
    matchedAspectId: matchedAspect?.aspectId || null,
    powerAllowedSlots: matchedAspect?.zhAllowedSlots || null,
    powerCategory: matchedAspect?.zhAspectType || null
  };
  return {
    ...slot,
    target: matchedEquipment ? {
      ...slot.target,
      itemId: matchedEquipment.id,
      zhName: matchedEquipment.zhName,
      image: matchedEquipment.image || slot.target.image,
      externalImage: matchedEquipment.externalImage || slot.target.externalImage,
      description: `${matchedEquipment.zhBuildRole || slot.target.description || "暗金组件"}，固定词缀：${(matchedEquipment.zhGuaranteedAffixes || []).join(" / ") || "词缀资料整理中"}。`
    } : slot.target,
    dataStatus: slotPlayerDataStatus(slot, power, Boolean(options.communityReference)),
    aspect: {
      ...slot.aspect,
      name: power.displayKind === "legendary_aspect" ? slot.aspect.name : power.displayName,
      ...power
    }
  };
}

function gearSlotsFor({ equipmentItems, equipmentIndex, aspectIndex, classInfo, archetype, mode }) {
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
    return withPlayerPower({
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
        sourceStatus: selected ? "唯一装备固定词缀来自官方 3.1.0 补丁，暗金特效继续按来源整理" : "威能名称为构筑模板，需接入全量威能库核验"
      },
      affixes,
      tempers: temperLines(slot, archetype),
      masterwork: affixes.slice(0, 2),
      sockets: socketLines(slot),
      alternatives: alternativeFor(slot, selected, pool, archetype, usedIds, index),
      upgradePath: [
        `开荒：先用高装等${slot.group === "武器" ? "武器" : slot.zhName}和主词缀过渡。`,
        `成型：补齐${affixes.slice(0, 2).join(" / ")}。`,
        core ? "终局：该位置优先精造命中核心词缀。" : "终局：核心位稳定后再投入精造资源。"
      ],
      notes: [
        replaceable ? "可替换：先保证主词缀和抗性，再追求最优暗金。" : "不建议替换：此位承担主要伤害或循环。",
        core ? "优先在该部位投入精造资源。" : "作为成型后的补强部位。"
      ]
    }, { equipmentIndex, aspectIndex });
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
    displayTier: `${tier} 模板`,
    label: `模板参考 · 150 层 ${minutes} 分`,
    evidenceLabel: "未接入真实榜单，按官方词缀和构筑模板估算",
    sourceStatus: "template_reference",
    confidence: performance.confidence ?? 0.48,
    evidence: [
      {
        type: "official_affix_seed",
        zhLabel: "官方词缀种子",
        zhStatus: "已接入",
        zhDetail: "使用 3.1.0 补丁中的唯一装备固定词缀作为装备协同输入。"
      },
      {
        type: "leaderboard_sample",
        zhLabel: "真实榜单样本",
        zhStatus: "样本整理中",
        zhDetail: "没有同赛季 150 层通关样本时，不把速度写成已验证排行。"
      }
    ],
    note: mode === "pit_push" ? "冲层上限按单体、容错和爆发窗口评估。" : mode === "speed_farm" ? "速刷上限按清图速度和移动效率评估。" : "日常上限按稳定性和成型成本评估。"
  };
}

function classMechanicText(classInfo, archetype) {
  const mechanic = {
    barbarian: "武器专精、狂暴和战吼覆盖决定爆发窗口；缺怒气时先补资源而不是硬堆伤害。",
    druid: "灵力循环、变形/自然标签和同伴触发决定手感；防御技能用于承接高压词缀。",
    necromancer: "精魂、尸体和亡者之书取舍会改变循环；召唤流先保证仆从存活。",
    paladin: "光环、盾牌和职业资源仍待官方完整资料回填，当前按防御光环和核心技能模板处理。",
    rogue: "能量、连击点、灌注和位移窗口决定爆发节奏；高层不要在无防御时贴脸。",
    sorcerer: "法力、附魔、屏障和元素标签决定循环；屏障覆盖不足时优先降层补防御。",
    spiritborn: "活力、灵兽标签和 Spirit Hall 选择决定输出轴；机动流需要防御技能兜底。",
    warlock: "职业资源和召唤/诅咒机制仍待官方完整资料回填，当前按持续伤害与召唤模板处理。"
  };
  return `${mechanic[classInfo.id] || "职业机制待来源回填。"} 本 BD 围绕「${archetype.zhName}」展开。`;
}

function skillTreeFor({ classInfo, archetype, simBuild }) {
  const simPlan = simBuild?.guide?.skillPlan;
  const routePlan = routePlanFor(classInfo.id, archetype.id);
  const bar = routePlan?.bar?.length ? routePlan.bar : simPlan?.bar?.length ? simPlan.bar : classSkillWords[classInfo.id] || ["基础触发", "主力输出", "防御", "机动", "增伤/控制", "终极"];
  const roles = routePlan?.roles || [];
  const passives = routePlan?.passives?.length
    ? routePlan.passives
    : uniqueStrings([`${statLabels(archetype)[0]}收益`, "生命与护甲", "资源循环", "冷却缩减", "精英减伤"], 5);
  const pointOrder = [
    ["1-3", bar[0], "+1 并点强化", "先建立资源、触发或易伤入口。"],
    ["4-8", bar[1], "+5", "主力输出优先点满，保证升级和清怪速度。"],
    ["9-13", bar[2], "+1 至关键强化", "拿到第一层防御或增伤窗口。"],
    ["14-18", bar[3], "+1 至关键强化", "补移动、解控或聚怪能力。"],
    ["19-23", bar[4], "+1 至关键强化", "补齐流派标签和爆发前置条件。"],
    ["24-28", bar[5], "+1", "拿终极技能，首领和精英包留爆发。"],
    ["29-34", passives[0] || `${archetype.zhName}专精`, "+3", "围绕主词缀提高稳定伤害。"],
    ["35-42", passives[1] || "防御专精", "+3 至 +6", "补生命、护甲、减伤或屏障。"],
    ["43-50", passives[2] || "循环专精", "+3 至 +6", "解决断档，进入世界等级过渡。"],
    ["50+", passives[3] || passives[0] || "终局专精", "按装备微调", "核心暗金到位后，把临时点数转到乘区和循环。"]
  ];
  return {
    core: routePlan?.core || simPlan?.core || archetype.zhName,
    classMechanic: classMechanicText(classInfo, archetype),
    skillBar: bar.map((name, index) => ({
      slot: index + 1,
      name,
      role: roles[index] || (index === 1 ? "主攻" : index >= 4 ? "爆发/增益" : "循环/防御"),
      points: index === 1 ? 5 : 1
    })),
    pointOrder: pointOrder.map(([levelRange, skill, points, reason], index) => ({
      step: index + 1,
      levelRange,
      skill,
      points,
      reason
    })),
    passives,
    notes: simPlan?.priority || [`${bar[1]}先满，再补${bar[2]}、${bar[3]}和${passives.slice(0, 3).join(" / ")}。`]
  };
}

function routeSourceStatusFor(verificationLevel, routeType) {
  const routeName = routeType === "paragon" ? "巅峰路线" : "技能路线";
  const statuses = {
    community_reference: `${routeName}来自同赛季社区 BD 结构参考；具体点数、热修和来源更新时间仍需核对。`,
    cross_season_reference: `${routeName}来自跨赛季社区 BD 结构参考；可看执行顺序，强度需按当前赛季校准。`,
    official_seed_template: `${routeName}为官方词缀种子上的结构化模板；可用于开荒和过渡，终局细节需接入实战来源。`,
    projection_template: `${routeName}为未来赛季推演模板；仅用于预判方向，赛季落地后必须重新验证。`
  };
  return statuses[verificationLevel] || statuses.official_seed_template;
}

function paragonFor({ classInfo, archetype, simBuild }) {
  const routePlan = routePlanFor(classInfo.id, archetype.id);
  const route = routePlan?.boards?.length ? routePlan.boards : simBuild?.guide?.paragonPlan?.boardRoute || [
    "起始盘先拿主属性、护甲和生命",
    `第二盘围绕${archetype.zhName}核心标签`,
    "第三盘补资源、冷却和抗性",
    "第四盘按装备缺口补易伤、暴击或生存"
  ];
  const glyphs = routePlan?.glyphs?.length ? routePlan.glyphs : statLabels(archetype).slice(0, 4);
  const boards = route.map((goal, index) => ({
    order: index + 1,
    name: index === 0 && !routePlan ? "起始盘" : goal,
    goal: routePlan ? `${goal}：围绕${archetype.zhName}补强。` : goal,
    glyph: glyphs[index % glyphs.length] || "主属性",
    rotate: index % 2 === 0 ? "默认方向" : "向雕文孔短路旋转"
  }));
  const boardName = (index, fallback) => boards[index]?.name || fallback;
  const glyphName = (index, fallback) => glyphs[index] || fallback;
  const clickOrder = [
    [boardName(0, "起始盘"), `${glyphName(0, "主属性")}通路`, "先打开到首个雕文插槽的最短路径。"],
    [boardName(0, "起始盘"), `${glyphName(0, "主属性")}插槽`, `放入${glyphName(0, "主属性")}并补足半径属性。`],
    [boardName(0, "起始盘"), `${statLabels(archetype)[0]}稀有群`, "补护甲、生命和抗性，保证进入高层不被秒杀。"],
    [boardName(1, "第二盘"), `${boardName(1, archetype.zhName)}核心节点`, "优先拿流派乘区或核心联动。"],
    [boardName(1, "第二盘"), `${glyphName(1, "伤害")}插槽`, `放入${glyphName(1, "伤害")}并连接主伤害路线。`],
    [boardName(1, "第二盘"), `${statLabels(archetype)[1] || "精英伤害"}稀有群`, "拿主伤害标签和精英伤害。"],
    [boardName(2, "第三盘"), `${glyphName(2, "资源")}插槽`, `放入${glyphName(2, "资源")}修正循环断档。`],
    [boardName(2, "第三盘"), `${routePlan?.passives?.[2] || "资源冷却"}路线`, "修正循环断档。"],
    [boardName(3, "第四盘"), `${glyphName(3, "防御")}插槽`, "冲层前补齐抗性和护甲。"],
    [boardName(3, "第四盘"), `${statLabels(archetype)[2] || "终局补强"}收尾群`, "雕文半径满足后再补伤害小点。"]
  ];
  return {
    boardOrder: boards,
    glyphs: glyphs.map((name, index) => ({
      name,
      priority: index + 1,
      socket: boards[index]?.name || "补强盘",
      note: index === 0 ? "优先升到可触发半径" : "按装备缺口调整顺序"
    })),
    pointBands: [
      { points: 50, goal: "打开起始盘雕文孔，补生命、护甲和主属性通路。" },
      { points: 100, goal: "接入第二盘传奇节点和第二个雕文孔。" },
      { points: 150, goal: "补第三盘资源/冷却/易伤路径，修正循环断档。" },
      { points: 200, goal: "补齐防御稀有节点后再投入远端伤害小点。" }
    ],
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

function progressionFor({ mode, archetype, simBuild, gearSlots, skillTree, paragon }) {
  const levelingLines = simBuild?.guide?.leveling || [
    "1-35 级：用顺手主力技能和高装等武器开荒。",
    "35-60 级：补资源、抗性和防御，准备进入终局。",
    "60 级后：围绕核心暗金、威能、雕文等级和抗性上限重构。",
    "终局：按冲层、速刷或日常用途切换装备和打法。"
  ];
  const coreSlots = gearSlots.filter((slot) => slot.required || slot.core).slice(0, 4);
  const replaceableSlots = gearSlots.filter((slot) => slot.replaceable).slice(0, 4);
  const coreLine = coreSlots.length
    ? coreSlots.map((slot) => `${slot.zhSlotName}：${slot.target.zhName}`).join(" / ")
    : "先按装备区补齐核心暗金或核心威能";
  const replacementLine = replaceableSlots.length
    ? replaceableSlots.map((slot) => slot.zhSlotName).join(" / ")
    : "非核心部位";
  const firstSkill = skillTree.pointOrder?.[0];
  const coreSkill = skillTree.pointOrder?.[1] || firstSkill;
  const defensiveSkill = skillTree.pointOrder?.[2] || coreSkill;
  const paragonFirst = paragon.clickOrder?.[0];
  const paragonSecond = paragon.clickOrder?.[3] || paragon.clickOrder?.[1];
  const modeGoal = {
    daily: "保持容错和资源循环，优先稳定完成日常和补装备。",
    speed_farm: "压缩停顿时间，优先移动、冷却和清图效率。",
    pit_push: "牺牲部分速度换单体、防御和稳定爆发，准备挑战高层。"
  }[mode];
  const stages = [
    {
      stageId: "leveling_1_35",
      title: "1-35 级开荒",
      levelRange: "1-35",
      objective: levelingLines[0],
      gearFocus: "武器装等和主词缀优先，不强行锁死终局暗金。",
      skillFocus: firstSkill ? `${firstSkill.levelRange}：${firstSkill.skill}，${firstSkill.reason}` : "先点资源入口和主力输出。",
      paragonFocus: "未进入巅峰前先保证技能手感、抗性和资源。",
      gameplayFocus: "不要贪终局循环，优先清怪稳定和不死亡。",
      swapRule: `可用高装等传奇替代${replacementLine}。`
    },
    {
      stageId: "transition_35_60",
      title: "35-60 级过渡",
      levelRange: "35-60",
      objective: levelingLines[1],
      gearFocus: `开始保留能承载核心威能的底材；优先补${statLabels(archetype).slice(0, 3).join(" / ")}。`,
      skillFocus: coreSkill ? `${coreSkill.levelRange}：${coreSkill.skill}，${coreSkill.reason}` : "主力技能点满后补防御和资源。",
      paragonFocus: paragonFirst ? `${paragonFirst.board}：${paragonFirst.node}。` : "准备起始盘到雕文孔的路线。",
      gameplayFocus: "缺资源时先降难度刷词缀，不要硬打高压内容。",
      swapRule: "核心暗金没出时，用传奇底材和同类威能过渡。"
    },
    {
      stageId: "endgame_setup",
      title: "60+ 终局成型",
      levelRange: "60+",
      objective: levelingLines[2],
      gearFocus: coreLine,
      skillFocus: defensiveSkill ? `${defensiveSkill.levelRange}：${defensiveSkill.skill}，${defensiveSkill.reason}` : "补齐防御、资源和关键被动。",
      paragonFocus: paragonSecond ? `${paragonSecond.board}：${paragonSecond.node}。` : "先拿雕文孔、传奇节点和关键稀有节点。",
      gameplayFocus: "把抗性、护甲和防御窗口稳定后，再追求伤害精造。",
      swapRule: "硬需求位优先保留，可替换位按抗性和掉落动态调整。"
    },
    {
      stageId: "mode_specialize",
      title: `${modeProfiles[mode].zhName}专精`,
      levelRange: modeProfiles[mode].stage,
      objective: modeGoal,
      gearFocus: mode === "pit_push" ? "单体、防御、减伤和核心乘区优先。" : mode === "speed_farm" ? "移动速度、冷却缩减和起手清图效率优先。" : "资源循环、生命、抗性和低成本替换优先。",
      skillFocus: "按技能分区完成最终点法，核心暗金到位后再重分配临时点。",
      paragonFocus: "按巅峰分区补齐点数阶段，抗性和护甲不达标时提前走防御节点。",
      gameplayFocus: modeProfiles[mode].suitability,
      swapRule: "在替换矩阵中逐槽位切换，不直接改动硬需求位。"
    }
  ];
  return {
    sourceStatus: simBuild?.guide?.dataCompleteness?.skillRanks || "开荒路线为结构化模板，等待更多实战来源校准。",
    checkpoints: [
      { label: "先点技能", value: firstSkill ? `${firstSkill.levelRange} ${firstSkill.skill}` : "资源入口" },
      { label: "先拿巅峰", value: paragonFirst ? `${paragonFirst.board} ${paragonFirst.node}` : "起始盘雕文孔" },
      { label: "核心装备", value: coreLine },
      { label: "可替换位", value: replacementLine }
    ],
    stages
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

function guideFor({ season, seasonIndex, classInfo, archetype, mode, equipmentItems, equipmentIndex, aspectIndex, simBuild }) {
  const performance = simBuild || synthesizePerformance({ classInfo, archetype, mode, seasonIndex });
  const gearSlots = gearSlotsFor({ equipmentItems, equipmentIndex, aspectIndex, classInfo, archetype, mode });
  const formationDifficulty = difficultyFor({ archetype, mode, gearSlots, seasonIndex, classInfo });
  const ceiling = ceilingFor(performance, mode);
  const skillTree = skillTreeFor({ classInfo, archetype, simBuild });
  const paragon = paragonFor({ classInfo, archetype, simBuild });
  const gameplay = gameplayFor({ mode, archetype, simBuild });
  const progression = progressionFor({ mode, archetype, simBuild, gearSlots, skillTree, paragon });
  const verificationLevel = seasonIndex === 0 ? "official_seed_template" : "projection_template";
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
      name: slot.aspect.displayName || slot.aspect.name,
      displayKind: slot.aspect.displayKind,
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
      verificationLevel,
      createdAt: "2026-06-28",
      updatedAt: "2026-06-28",
      videos: [],
      changelog: [{ date: "2026-06-28", title: "初始化 BD 档案", body: "补齐装备槽位、技能顺序、巅峰路线、打法和替换件结构。" }]
    },
    coreUniques,
    coreAspects,
    gearSlots,
    skillTree: {
      ...skillTree,
      sourceStatus: routeSourceStatusFor(verificationLevel, "skill")
    },
    paragon: {
      ...paragon,
      sourceStatus: routeSourceStatusFor(verificationLevel, "paragon")
    },
    gameplay,
    progression,
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

const genericSkillStepPattern = /基础触发|基础生成|主力输出|资源\/冷却被动|生存被动|关键被动|终局重分配|终局重分配|终局|大地\/粉碎被动|强固与生存被动/;
const genericParagonNodePattern = /^(传奇节点|雕文孔|稀有节点|魔法节点|剩余魔法节点|防御稀有节点|主属性通路|资源\/冷却节点)$/;
const routeTextReplacements = [
  ["Survival Instinct", "生存本能"],
  ["Ancestral Guidance", "先祖指引"],
  ["Earthen Devastation", "大地毁灭"],
  ["Blood Begets Blood", "血生血"],
  ["Scent of Death", "死亡气息"],
  ["Earth and Sky", "大地与天空"],
  ["Thunderstruck", "雷霆震击"],
  ["Flesh-Eater", "食肉者"],
  ["Bone Graft", "白骨嫁接"],
  ["Pyro Bolts", "火焰弹"],
  ["Territorial", "领地"],
  ["Eliminator", "消灭者"],
  ["Sacrificial", "牺牲"],
  ["Dominate", "支配"],
  ["Bloodbath", "血浴"],
  ["Undaunted", "无畏"],
  ["Tectonic", "构造"],
  ["Revealing", "揭示"],
  ["In-Fighter", "贴身战士"],
  ["Convergence", "汇聚"],
  ["Fulminate", "爆震"],
  ["Colossal", "巨像"],
  ["Frailty", "脆弱"],
  ["Corporeal", "实体"],
  ["Amplify", "增幅"],
  ["Essence", "精魂"],
  ["Exploit", "剥削"],
  ["Keeper", "守护者"],
  ["Spirit", "灵魂"],
  ["Canny", "灵巧"],
  ["Turf", "地盘"],
  ["Sapping", "吸取"],
  ["Hubris", "傲慢"],
  ["Fighter", "战士"],
  ["Flesh", "血肉"],
  ["Eater", "吞噬者"]
].sort((a, b) => b[0].length - a[0].length);

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function localizeRouteText(value) {
  let text = String(value || "");
  for (const [source, target] of routeTextReplacements) {
    text = text.replace(new RegExp(`(^|[^A-Za-z])${escapeRegExp(source)}(?=$|[^A-Za-z])`, "g"), `$1${target}`);
  }
  return text;
}

function refineSkillTreeWithBase(merged, base) {
  const baseStepsByIndex = new Map((base.pointOrder || []).map((step, index) => [index, step]));
  const pointOrder = (merged.pointOrder || []).map((step, index) => {
    if (!genericSkillStepPattern.test(step.skill || "")) return step;
    const replacement = baseStepsByIndex.get(index);
    return replacement ? { ...step, skill: replacement.skill, reason: replacement.reason } : step;
  });
  const skillBar = (merged.skillBar || []).map((skill, index) => {
    if (!genericSkillStepPattern.test(skill.name || "")) return skill;
    const replacement = base.skillBar?.[index];
    return replacement ? { ...skill, name: replacement.name, role: replacement.role } : skill;
  });
  const passives = (merged.passives || []).map((passive, index) => (
    genericSkillStepPattern.test(passive || "") && base.passives?.[index] ? base.passives[index] : passive
  ));
  return {
    ...merged,
    core: genericSkillStepPattern.test(merged.core || "") ? base.core : merged.core,
    skillBar,
    pointOrder,
    passives: passives.length ? passives : base.passives
  };
}

function refineParagonWithBase(merged, base) {
  const baseStepsByIndex = new Map((base.clickOrder || []).map((step, index) => [index, step]));
  const clickOrder = (merged.clickOrder || []).map((step, index) => {
    if (!genericParagonNodePattern.test(step.node || "")) return step;
    const replacement = baseStepsByIndex.get(index);
    return replacement ? { ...step, board: replacement.board, node: replacement.node, reason: replacement.reason } : step;
  });
  return {
    ...merged,
    boardOrder: (merged.boardOrder || []).map((board) => ({
      ...board,
      name: localizeRouteText(board.name),
      goal: localizeRouteText(board.goal),
      glyph: localizeRouteText(board.glyph),
      rotate: localizeRouteText(board.rotate)
    })),
    clickOrder: clickOrder.map((step) => ({
      ...step,
      board: localizeRouteText(step.board),
      node: localizeRouteText(step.node),
      reason: localizeRouteText(step.reason)
    })),
    glyphs: (merged.glyphs || []).map((glyph) => ({
      ...glyph,
      name: localizeRouteText(glyph.name),
      socket: localizeRouteText(glyph.socket),
      note: localizeRouteText(glyph.note)
    })),
    pointBands: (merged.pointBands || []).map((band) => ({
      ...band,
      goal: localizeRouteText(band.goal)
    })),
    notes: (merged.notes || []).map(localizeRouteText)
  };
}

function guideDisplayName(guide) {
  return guide.title || `${guide.taxonomy?.seasonName || ""} ${guide.taxonomy?.className || ""} · ${guide.taxonomy?.archetypeName || ""}${guide.taxonomy?.modeName || ""}`.trim();
}

function guideCompletenessFor(guide) {
  const gearSlots = guide.gearSlots || [];
  const skillSteps = guide.skillTree?.pointOrder || [];
  const skillBar = guide.skillTree?.skillBar || [];
  const paragonSteps = guide.paragon?.clickOrder || [];
  const paragonBoards = guide.paragon?.boardOrder || [];
  const gameplay = guide.gameplay || {};
  const gameplaySections = ["opener", "loop", "boss", "defense", "speedFarm", "commonMistakes"]
    .filter((key) => gameplay[key]?.length);
  const counts = {
    gearSlots: gearSlots.length,
    requiredSlots: gearSlots.filter((slot) => slot.required).length,
    coreSlots: gearSlots.filter((slot) => slot.core || slot.required).length,
    replaceableSlots: gearSlots.filter((slot) => slot.replaceable).length,
    skillBarSkills: skillBar.length,
    skillSteps: skillSteps.length,
    paragonBoards: paragonBoards.length,
    paragonSteps: paragonSteps.length,
    gameplaySections: gameplaySections.length,
    variants: guide.variants?.length || 0,
    sourceReferences: guide.source?.references?.length || 0
  };
  const sections = {
    gear: counts.gearSlots >= slotOrder.length ? "complete" : "needs_validation",
    skills: counts.skillBarSkills >= 6 && counts.skillSteps >= 10 ? "complete" : "needs_validation",
    paragon: counts.paragonBoards >= 4 && counts.paragonSteps >= 10 ? "complete" : "needs_validation",
    gameplay: counts.gameplaySections >= 5 ? "complete" : "needs_validation",
    variants: counts.variants >= 3 && counts.replaceableSlots > 0 ? "complete" : "needs_validation",
    sources: guide.source?.verificationLevel || "official_seed_template"
  };
  const readyCount = Object.values(sections).filter((status) => status === "complete").length;
  return {
    label: `${readyCount}/5 核心分区完整`,
    counts,
    sections,
    checklist: [
      `装备 ${counts.gearSlots}/${slotOrder.length} 槽`,
      `技能 ${counts.skillSteps} 步`,
      `巅峰 ${counts.paragonSteps} 步`,
      `打法 ${counts.gameplaySections} 组`,
      `替换 ${counts.replaceableSlots} 槽`
    ],
    sourceStatus: guide.source?.verificationLevel || "official_seed_template"
  };
}

function powerKindLabel(displayKind) {
  const labels = {
    legendary_aspect: "传奇威能",
    unique_power: "暗金特效",
    mythic_unique_power: "神话暗金特效",
    unused_or_special_slot: "特殊槽位"
  };
  return labels[displayKind] || "装备联动";
}

function coreRequirementsFor(guide) {
  const slotRank = new Map(slotOrder.map((slot, index) => [slot.id, index]));
  return (guide.gearSlots || [])
    .filter((slot) => slot.required || slot.core)
    .slice()
    .sort((a, b) => (slotRank.get(a.slotId) ?? 99) - (slotRank.get(b.slotId) ?? 99))
    .map((slot) => {
      const powerName = slot.aspect?.displayName || slot.aspect?.name || slot.aspect?.role || "装备联动";
      const state = slot.required ? "硬需求" : slot.replaceable ? "可替换核心位" : "核心位";
      return {
        slotId: slot.slotId,
        zhSlotName: slot.zhSlotName,
        targetName: slot.target?.zhName || "目标装备",
        targetItemId: slot.target?.itemId || null,
        powerName,
        powerKind: powerKindLabel(slot.aspect?.displayKind),
        required: Boolean(slot.required),
        replaceable: Boolean(slot.replaceable),
        role: slot.aspect?.role || slot.priority || "构筑联动",
        sourceStatus: slot.dataStatus || slot.aspect?.sourceStatus || "资料状态校验中",
        line: `${slot.zhSlotName}：${slot.target?.zhName || "目标装备"} · ${powerName} · ${state}`
      };
    });
}

function finalizeGuide(guide) {
  const displayName = guideDisplayName(guide);
  const paragon = refineParagonWithBase(guide.paragon || {}, { clickOrder: [] });
  const baseFinalized = {
    ...guide,
    displayName,
    paragon
  };
  const coreRequirements = coreRequirementsFor(baseFinalized);
  const finalized = {
    ...baseFinalized,
    coreRequirements,
    summary: {
      ...baseFinalized.summary,
      requirements: coreRequirements
        .filter((item) => item.required)
        .map((item) => `${item.zhSlotName}：${item.targetName}`)
    }
  };
  return {
    ...finalized,
    guideCompleteness: guideCompletenessFor(finalized)
  };
}

function resolvePatchedTarget(slot, patchTarget, equipmentIndex) {
  if (!patchTarget) return slot.target;
  const nameChanged = Boolean(patchTarget.zhName && patchTarget.zhName !== slot.target.zhName);
  const matchedItem = patchTarget.zhName ? lookupEquipmentForTarget({ zhName: patchTarget.zhName, itemId: patchTarget.itemId }, equipmentIndex) : null;
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
      ? `${matchedItem.zhBuildRole || "暗金组件"}，固定词缀：${(matchedItem.zhGuaranteedAffixes || []).join(" / ") || "词缀资料整理中"}。`
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

function applyCommunityOverride(guide, override, equipmentIndex, aspectIndex) {
  const overrideLevel = communityVerificationLevel(guide, override);
  const slotOverrides = new Map((override.gearSlots || []).map((slot) => [slot.slotId, slot]));
  const gearSlots = guide.gearSlots.map((slot) => {
    const patch = slotOverrides.get(slot.slotId);
    if (!patch) return slot;
    return withPlayerPower({
      ...slot,
      required: patch.required ?? slot.required,
      core: patch.core ?? slot.core,
      replaceable: patch.replaceable ?? slot.replaceable,
      target: resolvePatchedTarget(slot, patch.target, equipmentIndex),
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
    }, { communityReference: true, equipmentIndex, aspectIndex });
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
      name: slot.aspect.displayName || slot.aspect.name,
      displayKind: slot.aspect.displayKind,
      role: slot.aspect.role,
      required: slot.required,
      replaceable: slot.replaceable
    }));
  const mergedSkillTree = refineSkillTreeWithBase({
    ...guide.skillTree,
    ...override.skillTree,
    pointOrder: override.skillTree?.pointOrder ? withSteps(override.skillTree.pointOrder) : guide.skillTree.pointOrder
  }, guide.skillTree);
  const mergedParagon = refineParagonWithBase({
    ...guide.paragon,
    ...override.paragon,
    clickOrder: override.paragon?.clickOrder ? withSteps(override.paragon.clickOrder) : guide.paragon.clickOrder,
    notes: override.paragon?.rule ? [override.paragon.rule, ...guide.paragon.notes] : guide.paragon.notes
  }, guide.paragon);
  return {
    ...guide,
    title: override.title || guide.title,
    ceiling: {
      ...guide.ceiling,
      displayTier: guide.ceiling.tier,
      label: `${guide.ceiling.tier} · 150 层 ${guide.ceiling.pit150Minutes} 分参考`,
      evidenceLabel: `${override.sourceReference.site}社区资料结构参考，速度仍需同赛季榜单校准`,
      sourceStatus: overrideLevel,
      confidence: Math.max(guide.ceiling.confidence || 0.5, 0.68),
      evidence: [
        {
          type: "community_build_reference",
          zhLabel: "社区 BD 来源",
          zhStatus: overrideLevel === "community_reference" ? "同赛季参考" : "跨赛季参考",
          zhDetail: override.sourceReference.note,
          url: override.sourceReference.url
        },
        ...(guide.ceiling.evidence || [])
      ]
    },
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
      verificationLevel: overrideLevel,
      updatedAt: override.sourceReference.asOf,
      references: [
        {
          title: override.sourceReference.referenceTitle,
          url: override.sourceReference.url,
          site: override.sourceReference.site,
          sourceSeason: override.sourceReference.sourceSeason,
          asOf: override.sourceReference.asOf,
          note: override.sourceReference.note
        }
      ],
      changelog: [
        {
          date: override.sourceReference.asOf,
          title: "接入社区 BD 覆盖",
          body: "装备槽位、核心暗金/威能、技能、巅峰和打法按社区资料页结构覆盖。"
        },
        ...guide.source.changelog
      ]
    },
    coreUniques,
    coreAspects,
    gearSlots,
    skillTree: {
      ...mergedSkillTree,
      sourceStatus: routeSourceStatusFor(overrideLevel, "skill")
    },
    paragon: {
      ...mergedParagon,
      sourceStatus: routeSourceStatusFor(overrideLevel, "paragon")
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
      ...(override.variants || []),
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

const [classes, archetypeGroups, equipment, simulations, overrides, aspectOverrides, aspectLibrary] = await Promise.all([
  readJson(classPath),
  readJson(archetypePath),
  readJson(equipmentPath),
  readJson(simulationsPath),
  readOptionalJson(overridePath, []),
  readOptionalJson(aspectOverridePath, null),
  readOptionalJson(aspectLibraryPath, null)
]);

const simMap = simulationLookup(simulations);
const expandedOverrides = expandCommunityOverrides(overrides);
const overrideMap = new Map(expandedOverrides.map((override) => [override.id, override]));
const equipmentIndex = createEquipmentIndex(equipment.items);
const aspectIndex = createAspectEffectIndex({
  items: [
    ...(aspectLibrary?.items || []),
    ...(aspectOverrides?.items || [])
  ]
});
const builds = [];

for (const [seasonIndex, season] of simulations.seasons.entries()) {
  for (const classInfo of classes) {
    const archetypes = archetypeGroups.find((group) => group.classId === classInfo.id)?.archetypes || [];
    for (const archetype of archetypes) {
      for (const mode of Object.keys(modeProfiles)) {
        const simBuild = simMap.get(`${season.id}:${classInfo.id}:${mode}:${archetype.id}`);
        const guide = guideFor({ season, seasonIndex, classInfo, archetype, mode, equipmentItems: equipment.items, equipmentIndex, aspectIndex, simBuild });
        const mergedGuide = overrideMap.has(guide.id) ? applyCommunityOverride(guide, overrideMap.get(guide.id), equipmentIndex, aspectIndex) : guide;
        builds.push(finalizeGuide(mergedGuide));
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
