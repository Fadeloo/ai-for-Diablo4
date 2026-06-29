const paths = {
  version: "./data/metadata/version-baseline.json",
  classes: "./data/classes/classes.json",
  plans: "./data/builds/season-start-plans.json",
  archetypes: "./data/builds/archetypes.json",
  uniques: "./data/generated/official-3.1.0-guaranteed-unique-affixes.json",
  equipment: "./data/equipment/equipment-library.json",
  simulations: "./data/generated/build-simulations.json",
  buildGuides: "./data/generated/build-guides.json",
  aspectIndex: "./data/generated/aspect-index.json",
  coverage: "./data/generated/site-coverage.json",
  categories: "./data/equipment/stat-categories.json",
  sources: "./data/sources/source-registry.json"
};

const viewIds = ["home", "builds", "bd", "equipment", "aspects", "classes", "damage", "forecast", "sources"];
const routeAliases = {
  simulator: "builds"
};

const state = {
  classes: [],
  plans: [],
  archetypes: [],
  equipment: [],
  aspects: [],
  simulations: null,
  buildGuides: null,
  coverage: null,
  activeView: "home",
  selectedGuideId: null,
  selectedGuideSection: "overview",
  pendingGuideSlotTarget: null,
  selectedClassId: "barbarian",
  selectedEquipmentId: null,
  selectedAspectId: null,
  sim: {
    seasonId: "s14",
    classId: "all",
    mode: "all",
    buildIndex: 0,
    sourceQuality: "community",
    query: "",
    sort: "source",
    view: "recommended",
    visible: 18
  },
  equipmentFilters: {
    classId: "all",
    mode: "all",
    slot: "all",
    status: "all",
    related: "all",
    query: "",
    visible: 24
  },
  aspectFilters: {
    classId: "all",
    mode: "all",
    slot: "all",
    source: "all",
    query: "",
    visible: 32
  }
};

const relatedGuideCache = new Map();

const statLabels = {
  weapon_damage: "武器伤害",
  primary_core_stat: "主属性",
  skill_rank: "技能等级",
  resource: "资源循环",
  critical_strike: "暴击",
  additive_damage: "加伤池",
  cooldown_reduction: "冷却缩减",
  survivability: "生存",
  all_damage_multiplier: "全伤害乘区",
  elemental_damage_multiplier: "元素伤害乘区",
  attack_speed: "攻击速度",
  overpower: "压制",
  vulnerable: "易伤",
  thorns: "荆棘",
  mobility: "机动性",
  lucky_hit: "幸运一击",
  uncategorized: "未分类"
};

const resourceLabels = {
  Fury: "怒气",
  Spirit: "灵力",
  Essence: "精魂",
  Corpses: "亡骸",
  Energy: "能量",
  "Combo Points": "连击点数",
  Mana: "法力",
  Vigor: "活力"
};

const sourceLabels = {
  blizzard_patch_3_0: "《暗黑破坏神 IV》3.0 补丁说明",
  blizzard_patch_3_1: "《暗黑破坏神 IV》3.1.0 补丁说明",
  blizzard_season_death_awakening: "死亡觉醒赛季官方介绍",
  blizzard_lord_of_hatred: "《憎恨之王》官方资料",
  maxroll_damage_guide: "Maxroll 暗黑4深度伤害机制指南",
  wowhead_damage_buckets: "Wowhead 暗黑4伤害乘区指南",
  mobalytics_diablo4_builds: "Mobalytics 暗黑4构筑资料",
  d4builds_database: "D4Builds 数据库",
  d4builds_sunderarmor_icons: "D4Builds 唯一装备图标引用",
  d4lf_repo: "d4lf 开源工具仓库",
  d2core_unique_item_database: "暗黑核暗金数据库",
  d2core_aspect_database: "暗黑核传奇威能数据库"
};

const sourceCategoryLabels = {
  official_patch_notes: "官方补丁说明",
  official_season_overview: "官方赛季说明",
  official_expansion_overview: "官方资料片说明",
  community_mechanics: "社区机制资料",
  community_build_guide: "社区构筑资料",
  community_database: "社区数据库",
  community_visual_reference: "社区图标引用",
  open_source_tooling: "开源工具"
};

const trustLabels = {
  official: "官方",
  community_verified: "社区验证",
  needs_validation: "待验证",
  needs_license_review: "需授权确认"
};

const dataStatusLabels = {
  official_3_1_0_patch: "官方 3.1.0 补丁",
  community_database_reference: "社区数据库参考",
  needs_source_backfill: "待数据源回填",
  inferred_or_unknown: "推断或未知",
  inferred_from_name_and_visual_type: "按名称和类型推断",
  external_url_reference: "外部地址引用",
  local_generated_fallback: "本地回退图标"
};

const dataStatusFieldLabels = {
  guaranteedAffixes: "固定词缀",
  fullAffixRanges: "完整词缀范围",
  uniquePower: "暗金特效",
  dropSource: "掉落来源",
  verifiedSlot: "官方槽位",
  slot: "装备槽位",
  icon: "图标来源"
};

const verificationLevelLabels = {
  community_reference: "同赛季社区参考",
  cross_season_reference: "跨赛季社区参考",
  official_seed_template: "官方词缀结构化模板",
  projection_template: "未来赛季推演模板"
};

const sourceQualityOptions = [
  {
    id: "all",
    label: "全部 BD",
    shortLabel: "全部",
    description: "同时显示社区来源、结构化模板和推演记录。"
  },
  {
    id: "community",
    label: "社区可抄",
    shortLabel: "实战可抄",
    description: "同赛季或跨赛季社区来源，优先用于抄作业。"
  },
  {
    id: "community_reference",
    label: "同赛季社区参考",
    shortLabel: "同赛季社区",
    description: "当前赛季社区构筑来源，可信度最高。"
  },
  {
    id: "cross_season_reference",
    label: "跨赛季社区参考",
    shortLabel: "跨赛季参考",
    description: "旧赛季社区构筑迁移，需要按补丁调整。"
  },
  {
    id: "official_seed_template",
    label: "官方词缀模板",
    shortLabel: "官方模板",
    description: "基于官方词缀种子生成，等待实战回填。"
  },
  {
    id: "projection_template",
    label: "未来赛季推演",
    shortLabel: "未来推演",
    description: "用于赛季预判，不等同已验证 BD。"
  }
];

const modeLabels = {
  pit_push: "冲层",
  speed_farm: "速刷",
  daily: "日常"
};

const buildVersionModeOrder = ["daily", "speed_farm", "pit_push"];

function $(selector) {
  return document.querySelector(selector);
}

function $$(selector) {
  return [...document.querySelectorAll(selector)];
}

async function loadJson(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`无法加载 ${path}`);
  return response.json();
}

function parseRoute(route) {
  const clean = (route || "home").replace(/^#/, "") || "home";
  if (clean.startsWith("bd/")) {
    const [, guideId, sectionId] = clean.match(/^bd\/([^/]+)\/?([^/]*)?/) || [];
    return {
      view: "bd",
      guideId: decodeURIComponent(guideId || ""),
      sectionId: sectionId ? decodeURIComponent(sectionId) : null,
      itemId: null,
      aspectId: null
    };
  }
  if (clean.startsWith("item/")) {
    return {
      view: "equipment",
      guideId: null,
      itemId: decodeURIComponent(clean.slice(5)),
      aspectId: null
    };
  }
  if (clean.startsWith("aspect/")) {
    return {
      view: "aspects",
      guideId: null,
      itemId: null,
      aspectId: decodeURIComponent(clean.slice(7))
    };
  }
  const normalized = routeAliases[clean] || clean;
  return {
    view: viewIds.includes(normalized) ? normalized : "home",
    guideId: null,
    itemId: null,
    aspectId: null
  };
}

function normalizeView(viewId) {
  return parseRoute(viewId).view;
}

function navView(viewId) {
  return viewId === "bd" ? "builds" : viewId;
}

function setView(route, options = {}) {
  const parsed = parseRoute(route);
  const normalized = parsed.view;
  state.activeView = normalized;
  if (parsed.guideId) {
    if (state.selectedGuideId !== parsed.guideId) state.selectedGuideSection = "overview";
    state.selectedGuideId = parsed.guideId;
    if (parsed.sectionId && guideDetailSectionOrder.includes(parsed.sectionId)) {
      state.selectedGuideSection = parsed.sectionId;
    } else if (!parsed.sectionId) {
      state.selectedGuideSection = "overview";
    }
  }
  if (parsed.itemId) {
    state.selectedEquipmentId = parsed.itemId;
    state.equipmentFilters = {
      ...state.equipmentFilters,
      classId: "all",
      mode: "all",
      slot: "all",
      status: "all",
      related: "all",
      query: "",
      visible: Math.max(state.equipmentFilters.visible, 24)
    };
  }
  if (parsed.aspectId) {
    state.selectedAspectId = parsed.aspectId;
    state.aspectFilters = {
      ...state.aspectFilters,
      classId: "all",
      mode: "all",
      slot: "all",
      source: "all",
      query: "",
      visible: Math.max(state.aspectFilters.visible, 32)
    };
  }
  document.body.dataset.view = normalized;

  document.querySelectorAll(".view[data-view]").forEach((view) => {
    view.classList.toggle("is-active", view.dataset.view === normalized);
  });
  document.querySelectorAll("[data-view-link]").forEach((link) => {
    const target = normalizeView(link.getAttribute("href")?.replace("#", "") || "home");
    if (navView(target) === navView(normalized)) {
      link.setAttribute("aria-current", "page");
    } else {
      link.removeAttribute("aria-current");
    }
  });

  if (normalized === "bd") renderBuildGuideDetail();
  if (normalized === "equipment") {
    syncEquipmentFilterControls();
    renderEquipment();
  }
  if (normalized === "aspects") {
    syncAspectFilterControls();
    renderAspects();
  }

  const desiredHash = parsed.itemId
    ? `#item/${encodeURIComponent(parsed.itemId)}`
    : parsed.aspectId
    ? `#aspect/${encodeURIComponent(parsed.aspectId)}`
    : normalized === "bd" && state.selectedGuideId
    ? `#bd/${encodeURIComponent(state.selectedGuideId)}${parsed.sectionId ? `/${encodeURIComponent(parsed.sectionId)}` : ""}`
    : `#${normalized}`;
  if (options.replaceHash && window.location.hash !== desiredHash) {
    history.replaceState(null, "", desiredHash);
  }
  const detailFocusSelector = parsed.itemId ? "[data-equipment-detail]" : parsed.aspectId ? "[data-aspect-detail]" : null;
  if (normalized === "bd" && parsed.sectionId) {
    requestAnimationFrame(() => {
      const slotTarget = state.pendingGuideSlotTarget ? $(`[data-gear-slot-card="${state.pendingGuideSlotTarget}"]`) : null;
      const target = slotTarget || $(`[data-guide-section="${parsed.sectionId}"]`);
      if (target) scrollToGuideTarget(target);
      state.pendingGuideSlotTarget = null;
    });
  } else if (detailFocusSelector) {
    requestAnimationFrame(() => {
      const target = $(detailFocusSelector);
      if (target) target.scrollIntoView({ block: "start" });
    });
  } else {
    window.scrollTo(0, 0);
  }
}

function bindNavigation() {
  window.addEventListener("hashchange", () => setView(window.location.hash.slice(1)));
  setView(window.location.hash.slice(1) || "home", { replaceHash: true });
}

function formatNumber(value) {
  return new Intl.NumberFormat("zh-CN", { maximumFractionDigits: 0 }).format(value);
}

function percent(value) {
  return `${(value * 100).toFixed(0)}%`;
}

function iconSource(item) {
  return item.externalImage || item.image || `./public/assets/icon-${item.visualType || "weapon"}.png`;
}

function fallbackIcon(item) {
  return item.image || `./public/assets/icon-${item.visualType || "weapon"}.png`;
}

function renderIcon(item, alt) {
  return `<img src="${iconSource(item)}" data-fallback="${fallbackIcon(item)}" alt="${alt}">`;
}

function itemName(item) {
  return item.zhName || item.name || item.id || "未知装备";
}

function normalizeAffixName(affix) {
  if (typeof affix === "string") return affix;
  return affix.zhName || affix.name || "待回填词缀";
}

function itemAffixes(item) {
  if (item.zhGuaranteedAffixes?.length) return item.zhGuaranteedAffixes;
  return item.guaranteedAffixes?.map(normalizeAffixName) || [];
}

function statLabel(value) {
  return statLabels[value] || value;
}

function resourceLabel(value) {
  return resourceLabels[value] || value;
}

function statusLabel(value) {
  return dataStatusLabels[value] || value;
}

function className(classId) {
  if (classId === "all") return "全部职业";
  return state.classes.find((item) => item.id === classId)?.zhName ?? classId;
}

function modeName(modeId) {
  if (modeId === "all") return "全部用途";
  return modeLabels[modeId] || modeId;
}

function equipmentClassLabel(item) {
  return item.zhClassRestriction || (item.classRestriction === "All Classes" ? "全职业" : item.classRestriction);
}

function equipmentTypeLabel(item) {
  if (item.zhSlotCandidates?.length) return item.zhSlotCandidates.join(" / ");
  return item.zhPrimarySlot || item.zhVisualType || item.visualType || "装备";
}

function versionLineLabel(value) {
  const monthMap = {
    January: "01",
    February: "02",
    March: "03",
    April: "04",
    May: "05",
    June: "06",
    July: "07",
    August: "08",
    September: "09",
    October: "10",
    November: "11",
    December: "12"
  };
  const match = value?.match(/^(.+?) Build #(\d+) \(All Platforms\)—([A-Za-z]+) (\d{1,2}), (\d{4})$/);
  if (!match) return value || "来源版本待回填";
  const [, patch, build, month, day, year] = match;
  return `${patch} 构建 #${build}（全平台）— ${year}-${monthMap[month] ?? month}-${day.padStart(2, "0")}`;
}

const displayTextReplacements = [
  ["Survival Instinct", "生存本能"],
  ["Ancestral Guidance", "先祖指引"],
  ["Earthen Devastation", "大地毁灭"],
  ["Blood Begets Blood", "血生血"],
  ["Scent of Death", "死亡气息"],
  ["Earth and Sky", "大地与天空"],
  ["Spirit Halls", "灵魂殿堂"],
  ["Spirit Hall", "灵魂殿堂"],
  ["Thunderstruck", "雷霆震击"],
  ["Flesh-Eater", "食肉者"],
  ["Bone Graft", "白骨嫁接"],
  ["Dash Claw", "突进爪击"],
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
  ["Eater", "吞噬者"],
  ["End Game", "终局"],
  ["Endgame", "终局"],
  ["Starter", "起步"],
  ["Mythic", "神话"],
  ["Pushing", "冲层"],
  ["Push", "冲层"],
  ["Speed Farm", "速刷"],
  ["Speedfarm", "速刷"],
  ["Hardcore", "硬核"],
  ["Budget", "低成本"],
  ["Controller", "手柄"],
  ["Bossing", "首领"],
  ["Leveling", "升级"],
  ["Paragon", "巅峰"],
  ["FAQ", "常见问题"]
].sort((a, b) => b[0].length - a[0].length);

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function displayText(value) {
  let text = String(value || "");
  for (const [source, target] of displayTextReplacements) {
    text = text.replace(new RegExp(`(^|[^A-Za-z])${escapeRegExp(source)}(?=$|[^A-Za-z])`, "g"), `$1${target}`);
  }
  return text.replace(/作为\s+终局\s+核心/g, "作为终局核心");
}

function listItems(items) {
  return (items || []).map((item) => `<li>${displayText(item)}</li>`).join("");
}

function bindImageFallbacks(root) {
  root?.querySelectorAll("img[data-fallback]").forEach((img) => {
    const useFallback = () => {
      if (img.src.endsWith(img.dataset.fallback)) return;
      img.src = img.dataset.fallback;
    };
    if (img.complete && img.naturalWidth === 0) {
      useFallback();
      return;
    }
    img.addEventListener("error", () => {
      useFallback();
    }, { once: true });
  });
}

function scrollToGuideTarget(target) {
  if (!target) return;
  const headerHeight = $("[data-header]")?.getBoundingClientRect().height || 0;
  const top = target.getBoundingClientRect().top + window.scrollY - headerHeight - 18;
  (document.scrollingElement || document.documentElement).scrollTo({
    top: Math.max(0, top),
    behavior: "instant"
  });
}

function calculateDamage(form) {
  const data = Object.fromEntries(new FormData(form).entries());
  const weaponDamage = Number(data.weaponDamage);
  const skillCoefficient = Number(data.skillCoefficient);
  const primaryStat = Number(data.primaryStat);
  const additiveFactor = 1 + Number(data.additive) / 100;
  const independentMultiplier = 1 + Number(data.multiplier) / 100;
  const criticalFactor = 1 + (Number(data.critChance) / 100) * (1.5 - 1);
  const vulnerableFactor = 1 + (Number(data.vulnerableUptime) / 100) * (1.2 - 1);
  const primaryStatFactor = 1 + primaryStat / 1000;
  const baseSkillDamage = weaponDamage * skillCoefficient;
  const hitDamage =
    baseSkillDamage *
    primaryStatFactor *
    additiveFactor *
    independentMultiplier *
    criticalFactor *
    vulnerableFactor;
  const expectedDps = hitDamage * Number(data.aps);

  return {
    expectedDps,
    breakdown: {
      "基础技能伤害": baseSkillDamage,
      "主属性乘区": primaryStatFactor,
      "加伤池": additiveFactor,
      "独立乘区": independentMultiplier,
      "暴击期望": criticalFactor,
      "易伤期望": vulnerableFactor
    }
  };
}

function renderDamage() {
  const form = $("[data-damage-form]");
  const output = $("[data-damage-output]");
  const result = calculateDamage(form);
  const rows = Object.entries(result.breakdown)
    .map(([label, value]) => {
      const normalized = label === "基础技能伤害" ? Math.min(value / 4000, 1) : Math.min((value - 1) / 1.5, 1);
      const display = label === "基础技能伤害" ? formatNumber(value) : percent(value);
      return `
        <div class="breakdown-row">
          <span>${label}</span>
          <div class="bar-track"><i class="bar-fill" style="width:${Math.max(normalized * 100, 4)}%"></i></div>
          <strong>${display}</strong>
        </div>
      `;
    })
    .join("");

  output.innerHTML = `
    <div class="damage-total">${formatNumber(result.expectedDps)} 每秒伤害</div>
    ${rows}
  `;
}

function renderSelects() {
  const classOptions = state.classes
    .map((item) => `<option value="${item.id}">${item.zhName}</option>`)
    .join("");
  $("[data-sim-class]").innerHTML = `<option value="all">全部职业</option>${classOptions}`;
  $("[data-sim-class]").value = state.sim.classId;
  $("[data-equipment-class]").innerHTML = `<option value="all">全部职业</option><option value="All Classes">全职业</option>${classOptions}`;
  const aspectClass = $("[data-aspect-class]");
  if (aspectClass) {
    aspectClass.innerHTML = `<option value="all">全部职业</option>${classOptions}`;
    aspectClass.value = state.aspectFilters.classId;
  }

  $("[data-sim-season]").innerHTML = state.simulations.seasons
    .map((season) => `<option value="${season.id}">${season.zhLabel || season.label}</option>`)
    .join("");
  $("[data-sim-season]").value = state.sim.seasonId;
  const sourceSelect = $("[data-sim-source]");
  if (sourceSelect) {
    sourceSelect.innerHTML = sourceQualityOptions
      .map((option) => `<option value="${option.id}">${option.label}</option>`)
      .join("");
    sourceSelect.value = state.sim.sourceQuality;
  }
  const classSeason = $("[data-class-season]");
  if (classSeason) {
    classSeason.innerHTML = state.simulations.seasons
      .map((season) => `<option value="${season.id}">${season.zhLabel || season.label}</option>`)
      .join("");
    classSeason.value = state.sim.seasonId;
  }

  const slotSelect = $("[data-equipment-slot]");
  if (slotSelect) {
    const seenSlots = new Set();
    const slotOptions = (state.buildGuides?.slotOrder || [])
      .filter((slot) => {
        if (!slot.baseSlot || seenSlots.has(slot.baseSlot)) return false;
        seenSlots.add(slot.baseSlot);
        return true;
      })
      .map((slot) => `<option value="${slot.baseSlot}">${slot.baseSlot === "ring" ? "戒指" : slot.zhName}</option>`)
      .join("");
    slotSelect.innerHTML = `<option value="all">全部部位</option>${slotOptions}`;
  }
  const statusSelect = $("[data-equipment-status]");
  if (statusSelect) {
    statusSelect.innerHTML = `
      <option value="all">全部状态</option>
      <option value="community_database_reference">社区数据库参考</option>
      <option value="needs_source_backfill">完整范围待回填</option>
      <option value="official_3_1_0_patch">官方固定词缀</option>
      <option value="external_url_reference">外部图标</option>
    `;
  }
  const relatedSelect = $("[data-equipment-related]");
  if (relatedSelect) {
    relatedSelect.innerHTML = `
      <option value="all">全部关联</option>
      <option value="used">已进入 BD</option>
      <option value="unused">暂无 BD 使用</option>
    `;
  }
  const aspectSlot = $("[data-aspect-slot]");
  if (aspectSlot) {
    const slotOptions = (state.buildGuides?.slotOrder || [])
      .map((slot) => `<option value="${slot.id}">${slot.zhName}</option>`)
      .join("");
    aspectSlot.innerHTML = `<option value="all">全部部位</option>${slotOptions}`;
  }
}

function allBuildGuides() {
  return state.buildGuides?.builds || [];
}

function guideUrl(guide) {
  return `#bd/${encodeURIComponent(guide.id)}`;
}

function guideSectionUrl(guide, sectionId) {
  return `#bd/${encodeURIComponent(guide.id)}/${encodeURIComponent(sectionId)}`;
}

function itemUrl(itemOrId) {
  const id = typeof itemOrId === "string" ? itemOrId : itemOrId?.id;
  return id ? `#item/${encodeURIComponent(id)}` : "#equipment";
}

function aspectUrl(aspectOrId) {
  const id = typeof aspectOrId === "string" ? aspectOrId : aspectOrId?.id;
  return id ? `#aspect/${encodeURIComponent(id)}` : "#aspects";
}

function syncEquipmentFilterControls() {
  const search = $("[data-equipment-search]");
  const classSelect = $("[data-equipment-class]");
  const mode = $("[data-equipment-mode]");
  const slot = $("[data-equipment-slot]");
  const status = $("[data-equipment-status]");
  const related = $("[data-equipment-related]");
  if (search) search.value = state.equipmentFilters.query;
  if (classSelect) classSelect.value = state.equipmentFilters.classId;
  if (mode) mode.value = state.equipmentFilters.mode;
  if (slot) slot.value = state.equipmentFilters.slot;
  if (status) status.value = state.equipmentFilters.status;
  if (related) related.value = state.equipmentFilters.related;
}

function syncAspectFilterControls() {
  const search = $("[data-aspect-search]");
  const classSelect = $("[data-aspect-class]");
  const mode = $("[data-aspect-mode]");
  const slot = $("[data-aspect-slot]");
  const source = $("[data-aspect-source]");
  if (search) search.value = state.aspectFilters.query;
  if (classSelect) classSelect.value = state.aspectFilters.classId;
  if (mode) mode.value = state.aspectFilters.mode;
  if (slot) slot.value = state.aspectFilters.slot;
  if (source) source.value = state.aspectFilters.source;
}

function filteredGuides() {
  const rows = baseFilteredGuides()
    .filter((guide) => guideMatchesSourceQuality(guide, state.sim.sourceQuality));

  const sorters = {
    source: sortGuidesForPlayer,
    ceiling: (a, b) => a.ceiling.pit150Minutes - b.ceiling.pit150Minutes || sortGuidesForPlayer(a, b),
    difficulty: (a, b) => a.formationDifficulty.level - b.formationDifficulty.level || sortGuidesForPlayer(a, b),
    updated: (a, b) => String(b.source.updatedAt || "").localeCompare(String(a.source.updatedAt || "")) || sortGuidesForPlayer(a, b)
  };

  return rows.sort(sorters[state.sim.sort] || sorters.source);
}

function buildGuideSearchText(guide) {
  return [
    guide.title,
    guide.taxonomy.className,
    guide.taxonomy.archetypeName,
    guide.taxonomy.modeName,
    guide.taxonomy.stage,
    ...(guide.taxonomy.tags || []),
    ...(guide.summary.requirements || []),
    ...(guide.summary.statPriority || []),
    (guide.skillTree?.skillBar || []).map((skill) => skill.name).join(" "),
    (guide.coreUniques || []).map((item) => item.zhName).join(" "),
    (guide.coreAspects || []).map((aspect) => aspect.name).join(" ")
  ].join(" ").toLowerCase();
}

function guideSourceLabel(guide) {
  return verificationLevelLabels[guide.source.verificationLevel] || (guide.source.references?.length ? "社区参考" : "结构化模板");
}

function guideSourceRank(guide) {
  const ranks = {
    community_reference: 0,
    cross_season_reference: 1,
    official_seed_template: 2,
    projection_template: 3
  };
  return ranks[guide.source.verificationLevel] ?? 4;
}

function sourceQualityOption(id) {
  return sourceQualityOptions.find((option) => option.id === id) || sourceQualityOptions[0];
}

function guideMatchesSourceQuality(guide, sourceQuality) {
  if (sourceQuality === "all") return true;
  if (sourceQuality === "community") {
    return ["community_reference", "cross_season_reference"].includes(guide.source.verificationLevel);
  }
  if (sourceQuality === "structured") {
    return !["community_reference", "cross_season_reference"].includes(guide.source.verificationLevel);
  }
  return guide.source.verificationLevel === sourceQuality;
}

function guideMatchesBuildQuery(guide, query) {
  return !query || buildGuideSearchText(guide).includes(query);
}

function baseFilteredGuides() {
  const query = normalizedText(state.sim.query);
  return allBuildGuides()
    .filter((guide) => guide.taxonomy.seasonId === state.sim.seasonId)
    .filter((guide) => state.sim.classId === "all" || guide.taxonomy.classId === state.sim.classId)
    .filter((guide) => state.sim.mode === "all" || guide.taxonomy.mode === state.sim.mode)
    .filter((guide) => guideMatchesBuildQuery(guide, query));
}

function sortGuidesForPlayer(a, b) {
  return guideSourceRank(a) - guideSourceRank(b)
    || a.ceiling.pit150Minutes - b.ceiling.pit150Minutes
    || a.formationDifficulty.level - b.formationDifficulty.level;
}

function buildVersionModeIndex(mode) {
  const index = buildVersionModeOrder.indexOf(mode);
  return index === -1 ? buildVersionModeOrder.length : index;
}

function sortBuildVersions(a, b) {
  return buildVersionModeIndex(a.taxonomy.mode) - buildVersionModeIndex(b.taxonomy.mode)
    || guideSourceRank(a) - guideSourceRank(b)
    || a.ceiling.pit150Minutes - b.ceiling.pit150Minutes;
}

function sameArchetypeVersions(guide) {
  return allBuildGuides()
    .filter((item) => item.taxonomy.seasonId === guide.taxonomy.seasonId)
    .filter((item) => item.taxonomy.classId === guide.taxonomy.classId)
    .filter((item) => item.taxonomy.archetypeId === guide.taxonomy.archetypeId)
    .sort(sortBuildVersions);
}

function sameClassCommunityGuides(guide) {
  return allBuildGuides()
    .filter((item) => item.taxonomy.seasonId === guide.taxonomy.seasonId)
    .filter((item) => item.taxonomy.classId === guide.taxonomy.classId)
    .filter((item) => item.taxonomy.archetypeId !== guide.taxonomy.archetypeId)
    .filter((item) => ["community_reference", "cross_season_reference"].includes(item.source.verificationLevel))
    .sort(sortGuidesForPlayer)
    .slice(0, 6);
}

function guideVersionMeta(guide) {
  const tier = guide.ceiling.displayTier || guide.ceiling.tier;
  const clearTime = Number.isFinite(guide.ceiling.pit150Minutes) ? `150 层 ${guide.ceiling.pit150Minutes} 分` : guide.ceiling.label;
  return `${guide.formationDifficulty.label}成型 · ${guide.taxonomy.stage} · ${tier} · ${clearTime}`;
}

function renderBuildVersionSwitcher(guide) {
  const versions = sameArchetypeVersions(guide);
  const relatedGuides = sameClassCommunityGuides(guide);
  const versionLabels = versions.map((item) => item.taxonomy.modeName).join(" / ");
  return `
    <section class="guide-version-switcher" aria-label="同流派版本切换">
      <header>
        <div>
          <span>同流派版本</span>
          <strong>${displayText(guide.taxonomy.archetypeName)} · ${versionLabels}</strong>
        </div>
        <em>当前：${guide.taxonomy.modeName} · ${guideSourceLabel(guide)}</em>
      </header>
      <div class="guide-version-tabs">
        ${versions.map((item) => `
          <a class="guide-version-tab ${item.id === guide.id ? "is-active" : ""}" href="${guideUrl(item)}"${item.id === guide.id ? " aria-current=\"page\"" : ""}>
            <span>${item.taxonomy.modeName}</span>
            <strong>${displayText(item.title || item.taxonomy.archetypeName)}</strong>
            <em>${guideVersionMeta(item)}</em>
          </a>
        `).join("")}
      </div>
      ${relatedGuides.length ? `
        <div class="guide-related-builds">
          <strong>同职业可抄社区 BD</strong>
          <div class="guide-related-strip">
            ${relatedGuides.map((item) => `
              <a class="guide-related-build" href="${guideUrl(item)}">
                <span>${item.taxonomy.modeName} · ${guideSourceLabel(item)}</span>
                <strong>${displayText(item.taxonomy.archetypeName)}</strong>
                <em>${guideVersionMeta(item)}</em>
              </a>
            `).join("")}
          </div>
        </div>
      ` : ""}
    </section>
  `;
}

function bestGuideForClassMode(classId, mode) {
  return allBuildGuides()
    .filter((guide) => guide.taxonomy.seasonId === state.sim.seasonId)
    .filter((guide) => guide.taxonomy.classId === classId)
    .filter((guide) => guide.taxonomy.mode === mode)
    .sort(sortGuidesForPlayer)[0] || null;
}

function syncBuildFilterControls() {
  const season = $("[data-sim-season]");
  const classSelect = $("[data-sim-class]");
  const mode = $("[data-sim-mode]");
  const source = $("[data-sim-source]");
  const search = $("[data-build-search]");
  const sort = $("[data-build-sort]");
  if (season) season.value = state.sim.seasonId;
  if (classSelect) classSelect.value = state.sim.classId;
  if (mode) mode.value = state.sim.mode;
  if (source) source.value = state.sim.sourceQuality;
  if (search) search.value = state.sim.query;
  if (sort) sort.value = state.sim.sort;
}

function openBuildLibrary(filters) {
  state.sim = {
    ...state.sim,
    ...filters,
    buildIndex: 0,
    visible: 18
  };
  state.selectedClassId = state.sim.classId;
  syncBuildFilterControls();
  renderSimulator();
  renderForecast();
  renderSelectedClass();
  if (window.location.hash === "#builds") {
    setView("builds", { replaceHash: true });
  } else {
    window.location.hash = "#builds";
  }
}

function normalizedText(value) {
  return String(value || "").trim().toLowerCase();
}

function guideUsesItem(guide, item) {
  const itemId = item.id;
  const zhName = normalizedText(item.zhName);
  const englishName = normalizedText(item.name);
  return guide.gearSlots.some((slot) => {
    const targetNames = [slot.target?.zhName, slot.target?.name].map(normalizedText);
    if (slot.target?.itemId === itemId) return true;
    if (targetNames.includes(zhName) || targetNames.includes(englishName)) return true;
    return (slot.alternatives || []).some((alternative) => {
      const alternativeNames = [alternative.zhName, alternative.name].map(normalizedText);
      return alternative.itemId === itemId || alternativeNames.includes(zhName) || alternativeNames.includes(englishName);
    });
  });
}

function itemMatchesReference(reference, item) {
  const itemId = item.id;
  const zhName = normalizedText(item.zhName);
  const englishName = normalizedText(item.name);
  const referenceNames = [reference?.zhName, reference?.name].map(normalizedText);
  return reference?.itemId === itemId || referenceNames.includes(zhName) || referenceNames.includes(englishName);
}

function guideItemUsages(guide, item) {
  const usages = [];
  for (const slot of guide.gearSlots || []) {
    if (itemMatchesReference(slot.target, item)) {
      usages.push({
        slotName: slot.zhSlotName,
        useType: "目标装备",
        status: gearSlotStatus(slot),
        aspect: gearPowerDisplay(slot)
      });
    }
    for (const alternative of slot.alternatives || []) {
      if (itemMatchesReference(alternative, item)) {
        usages.push({
          slotName: slot.zhSlotName,
          useType: "替换方案",
          status: slot.required ? "替换需谨慎" : "可替换",
          aspect: displayText(`${alternative.reason || ""} ${alternative.tradeoff || ""}`.trim())
        });
      }
    }
  }
  return usages;
}

function allRelatedGuidesForItem(item) {
  if (!item?.id) return [];
  if (relatedGuideCache.has(item.id)) return relatedGuideCache.get(item.id);
  const guides = allBuildGuides()
    .filter((guide) => guideUsesItem(guide, item))
    .sort(sortGuidesForPlayer);
  relatedGuideCache.set(item.id, guides);
  return guides;
}

function relatedGuidesForItem(item, limit = 6) {
  return allRelatedGuidesForItem(item).slice(0, limit);
}

function relatedGuideCount(item) {
  return allRelatedGuidesForItem(item).length;
}

function sortEquipmentForPlayer(a, b) {
  return relatedGuideCount(b) - relatedGuideCount(a)
    || String(equipmentTypeLabel(a)).localeCompare(String(equipmentTypeLabel(b)), "zh-CN")
    || String(itemName(a)).localeCompare(String(itemName(b)), "zh-CN");
}

function renderGuideMiniLinks(guides, emptyText) {
  if (!guides.length) return `<p class="empty-copy">${emptyText}</p>`;
  return `
    <div class="guide-mini-list">
      ${guides.map((guide) => `
        <a class="guide-mini-link" href="${guideUrl(guide)}">
          <span>${guide.taxonomy.className} · ${guide.taxonomy.modeName}</span>
          <strong>${guide.taxonomy.archetypeName}</strong>
          <em>${guideSourceLabel(guide)} · ${guide.ceiling.displayTier || guide.ceiling.tier} · ${guide.ceiling.pit150Minutes} 分</em>
        </a>
      `).join("")}
    </div>
  `;
}

function renderEquipmentUsageMatrix(item) {
  const guides = allRelatedGuidesForItem(item);
  if (!guides.length) {
    return `<p class="empty-copy">当前装备还没有进入已结构化 BD；后续资料回填后会自动关联。</p>`;
  }
  return `
    <div class="equipment-usage-matrix">
      <div class="equipment-usage-row equipment-usage-row--head" aria-hidden="true">
        <span>职业 / 流派</span>
        <span>用途 / 阶段</span>
        <span>使用部位</span>
        <span>定位</span>
        <span>上限 / 来源</span>
        <span>操作</span>
      </div>
      ${guides.map((guide) => {
        const usages = guideItemUsages(guide, item);
        return `
          <article class="equipment-usage-row">
            <div>
              <span class="equipment-usage-label">职业 / 流派</span>
              <strong>${guide.taxonomy.className} · ${guide.taxonomy.archetypeName}</strong>
              <em>${guide.taxonomy.seasonName}</em>
            </div>
            <div>
              <span class="equipment-usage-label">用途 / 阶段</span>
              <strong>${guide.taxonomy.modeName}</strong>
              <em>${guide.taxonomy.stage}</em>
            </div>
            <div>
              <span class="equipment-usage-label">使用部位</span>
              ${usages.map((usage) => `<b>${usage.slotName} · ${usage.useType}</b>`).join("")}
            </div>
            <div>
              <span class="equipment-usage-label">定位</span>
              ${usages.map((usage) => `<strong>${usage.status}</strong><em>${usage.aspect}</em>`).join("")}
            </div>
            <div>
              <span class="equipment-usage-label">上限 / 来源</span>
              <strong>${guide.ceiling.displayTier || guide.ceiling.tier} · ${guide.ceiling.pit150Minutes} 分</strong>
              <em>${guideSourceLabel(guide)}</em>
            </div>
            <a href="${guideUrl(guide)}">查看 BD</a>
          </article>
        `;
      }).join("")}
    </div>
  `;
}

function renderTags(tags, limit = 8) {
  return (tags || []).slice(0, limit).map((tag) => `<span>${tag}</span>`).join("");
}

function renderCoreUniques(guide, limit = 4) {
  return guide.coreUniques.slice(0, limit)
    .map((item) => `
      <a class="mini-item" href="${item.itemId ? itemUrl(item.itemId) : "#equipment"}">
        ${renderIcon(item, `${item.zhName}图标`)}
        <b>${item.zhName}</b>
      </a>
    `)
    .join("");
}

function renderCoreAspects(guide, limit = 8) {
  return (guide.gearSlots || [])
    .filter((slot) => slot.core || slot.required)
    .slice(0, limit)
    .map((slot) => `
      <span class="mini-aspect">
        <b>${slot.zhSlotName}</b>
        <strong>${gearPowerDisplay(slot)}</strong>
        <em>${slot.replaceable ? "可替换" : "核心"}</em>
      </span>
    `)
    .join("");
}

function renderBuildDossier(guide) {
  const coreSlots = (guide.gearSlots || [])
    .filter((slot) => slot.required || slot.core)
    .slice(0, 6);
  const aspectSlots = (guide.gearSlots || [])
    .filter((slot) => slot.core || slot.required)
    .filter((slot) => slot.aspect?.name || slot.aspect?.role)
    .slice(0, 6);
  const skillNames = (guide.skillTree?.skillBar || []).map((skill) => skill.name);
  const paragonSteps = (guide.paragon?.clickOrder || []).slice(0, 4);
  const loopLines = [
    ...(guide.gameplay?.opener || []).slice(0, 1),
    ...(guide.gameplay?.loop || []).slice(0, 2),
    ...(guide.gameplay?.defense || []).slice(0, 1)
  ].filter(Boolean);
  const replaceableCount = (guide.gearSlots || []).filter((slot) => slot.replaceable).length;
  const requiredCount = (guide.gearSlots || []).filter((slot) => slot.required).length;
  return `
    <section class="build-dossier" aria-label="BD 首屏速查">
      <article class="build-dossier-card build-dossier-card--gear">
        <span>核心装备</span>
        <div>
          ${coreSlots.map((slot) => `
            <button type="button" data-guide-jump="gear" data-gear-slot-target="${slot.slotId}">
              <b>${slot.zhSlotName}</b>
              <strong>${displayText(slot.target.zhName)}</strong>
              <em>${gearSlotStatus(slot)}</em>
            </button>
          `).join("")}
        </div>
      </article>
      <article class="build-dossier-card">
        <span>核心威能 / 暗金</span>
        <ul>
          ${aspectSlots.map((slot) => `<li><b>${slot.zhSlotName}</b><strong>${gearPowerDisplay(slot)}</strong></li>`).join("")}
        </ul>
      </article>
      <article class="build-dossier-card build-dossier-card--skills">
        <span>六技能栏</span>
        <p>${skillNames.map(displayText).join(" / ")}</p>
      </article>
      <article class="build-dossier-card">
        <span>巅峰起步</span>
        <ol>
          ${paragonSteps.map((step) => `<li>${displayText(step.board)} · ${displayText(step.node)}</li>`).join("")}
        </ol>
      </article>
      <article class="build-dossier-card">
        <span>打法节奏</span>
        <ol>
          ${loopLines.map((line) => `<li>${displayText(line)}</li>`).join("")}
        </ol>
      </article>
      <article class="build-dossier-card">
        <span>替换状态</span>
        <p>${replaceableCount} 个部位可替换，${requiredCount} 个硬需求；缺件先看“替换”分区，再降层测试循环。</p>
      </article>
    </section>
  `;
}

function renderSourceReferences(guide) {
  const references = guide.source.references || [];
  if (!references.length) {
    return `<p>当前 BD 由本站结构化数据生成，等待社区实战和榜单回填。</p>`;
  }
  return `
    <div class="reference-list">
      ${references.map((reference) => `
        <article>
          <strong>${reference.site} · ${reference.title}</strong>
          <span>${reference.sourceSeason} · ${reference.asOf || "日期待回填"}</span>
          <p>${reference.note}</p>
          <a href="${reference.url}" target="_blank" rel="noreferrer">查看来源页面</a>
        </article>
      `).join("")}
    </div>
  `;
}

function renderSuitability(guide) {
  const entries = [
    ["开荒", guide.suitability?.leveling],
    ["速刷", guide.suitability?.speedFarm],
    ["冲层", guide.suitability?.pitPush],
    ["首领", guide.suitability?.bossing],
    ["硬核", guide.suitability?.hardcore],
    ["手柄", guide.suitability?.controller]
  ];
  return `
    <div class="suitability-grid">
      ${entries.map(([label, value]) => `
        <article>
          <strong>${label}</strong>
          <span>${displayText(value || "待评估")}</span>
        </article>
      `).join("")}
    </div>
    ${guide.suitability?.notes?.length ? `<p class="guide-note">${displayText(guide.suitability.notes.join(" "))}</p>` : ""}
  `;
}

function renderCeilingEvidence(guide) {
  const evidence = guide.ceiling?.evidence || [];
  if (!evidence.length) return `<p class="empty-copy">150 层参考仍待榜单或实战样本校准。</p>`;
  return `
    <div class="evidence-list">
      ${evidence.map((item) => `
        <article>
          <strong>${item.zhLabel || item.label || "证据"}</strong>
          <span>${item.zhStatus || item.status || "待校准"}</span>
          <p>${item.zhDetail || item.detail || ""}</p>
          ${item.url ? `<a href="${item.url}" target="_blank" rel="noreferrer">查看来源</a>` : ""}
        </article>
      `).join("")}
    </div>
  `;
}

function renderBuildLibraryCard(guide) {
  const skills = guide.skillTree?.skillBar || [];
  const firstSkillStep = guide.skillTree?.pointOrder?.[0];
  const firstParagonStep = guide.paragon?.clickOrder?.[0];
  const firstLoop = guide.gameplay?.loop?.[0] || guide.gameplay?.opener?.[0];
  const replaceableCount = guide.gearSlots.filter((slot) => slot.replaceable).length;
  const requiredCount = guide.gearSlots.filter((slot) => slot.required).length;
  return `
    <article class="guide-card">
      <div class="guide-card__head">
        <div>
          <p class="panel-kicker">${guide.taxonomy.className} · ${guide.taxonomy.modeName}</p>
          <h3>${guide.taxonomy.archetypeName}</h3>
        </div>
        <strong>${guide.ceiling.displayTier || guide.ceiling.tier}</strong>
      </div>
      <p>${guide.summary.oneLine}</p>
      <div class="guide-card__tags">${renderTags(guide.taxonomy.stageTags)}</div>
      <div class="source-pill">${guideSourceLabel(guide)}</div>
      <div class="guide-card__skillbar" aria-label="技能栏">
        ${skills.map((skill) => `<span><b>${skill.slot}</b>${skill.name}</span>`).join("")}
      </div>
      <div class="guide-card__metrics">
        <span><b>${guide.formationDifficulty.label}</b>成型难度</span>
        <span><b>${guide.ceiling.pit150Minutes} 分</b>${["community_reference", "cross_season_reference"].includes(guide.ceiling.sourceStatus) ? "150 层参考" : "模板参考"}</span>
        <span><b>${guide.gearSlots.length}</b>装备位置</span>
      </div>
      <div class="guide-card__quickfacts" aria-label="BD 可执行摘要">
        <article>
          <span>核心件</span>
          <strong>${guideCoreLine(guide)}</strong>
        </article>
        <article>
          <span>装备替换</span>
          <strong>${replaceableCount} 可替换 / ${requiredCount} 硬需求</strong>
        </article>
        <article>
          <span>技能第一步</span>
          <strong>${firstSkillStep ? `${displayText(firstSkillStep.levelRange)} · ${displayText(firstSkillStep.skill)}` : "待来源回填"}</strong>
        </article>
        <article>
          <span>巅峰第一步</span>
          <strong>${firstParagonStep ? `${displayText(firstParagonStep.board)} · ${displayText(firstParagonStep.node)}` : "待来源回填"}</strong>
        </article>
        <article>
          <span>打法循环</span>
          <strong>${displayText(firstLoop || "待来源回填")}</strong>
        </article>
        <article>
          <span>资料状态</span>
          <strong>${guideSourceLabel(guide)}</strong>
        </article>
      </div>
      <div class="guide-card__items">${renderCoreUniques(guide, 3)}</div>
      <a class="button button-secondary" href="${guideUrl(guide)}">查看完整 BD</a>
    </article>
  `;
}

function groupGuidesByClass(guides) {
  const grouped = new Map();
  for (const guide of guides) {
    if (!grouped.has(guide.taxonomy.classId)) grouped.set(guide.taxonomy.classId, []);
    grouped.get(guide.taxonomy.classId).push(guide);
  }
  return [...grouped.values()].sort((a, b) => {
    const aClass = a[0]?.taxonomy.className || "";
    const bClass = b[0]?.taxonomy.className || "";
    return aClass.localeCompare(bClass, "zh-CN");
  });
}

function renderBuildAtlas(guides) {
  const groups = groupGuidesByClass(guides);
  if (!groups.length) return "";
  return `
    <section class="build-atlas" aria-label="职业流派矩阵">
      <div class="section-title">
        <h4>职业流派矩阵</h4>
        <span>每个职业的用途、成型难度和 150 层参考</span>
      </div>
      <div class="build-atlas-grid">
        ${groups.map((classGuides) => {
          const first = classGuides[0];
          const communityCount = classGuides.filter((guide) => guide.source.references?.length).length;
          const archetypeNames = [...new Set(classGuides.map((guide) => guide.taxonomy.archetypeName))];
          const bestByMode = Object.keys(modeLabels)
            .map((mode) => classGuides.filter((guide) => guide.taxonomy.mode === mode).sort(sortGuidesForPlayer)[0])
            .filter(Boolean);
          const hardest = classGuides.reduce((max, guide) => Math.max(max, guide.formationDifficulty.level || 0), 0);
          return `
            <article class="atlas-class-card">
              <header>
                <div>
                  <strong>${first.taxonomy.className}</strong>
                  <span>${classGuides.length} 套 · ${archetypeNames.length} 个流派 · ${communityCount} 社区参考</span>
                </div>
                <em>最高难度 ${hardest}/5</em>
              </header>
              <div class="atlas-mode-list">
                ${bestByMode.map((guide) => `
                  <a href="${guideUrl(guide)}">
                    <span>${guide.taxonomy.modeName}</span>
                    <strong>${guide.taxonomy.archetypeName}</strong>
                    <em>${guide.formationDifficulty.label} · ${guide.ceiling.displayTier || guide.ceiling.tier} · ${guide.ceiling.pit150Minutes} 分</em>
                  </a>
                `).join("")}
              </div>
              <div class="atlas-archetypes">
                ${archetypeNames.slice(0, 8).map((name) => `<span>${name}</span>`).join("")}
              </div>
            </article>
          `;
        }).join("")}
      </div>
    </section>
  `;
}

function groupGuidesByArchetype(guides) {
  const grouped = new Map();
  for (const guide of guides) {
    const key = `${guide.taxonomy.classId}:${guide.taxonomy.archetypeId}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(guide);
  }
  return [...grouped.values()].sort((a, b) => {
    const classCompare = (a[0]?.taxonomy.className || "").localeCompare(b[0]?.taxonomy.className || "", "zh-CN");
    if (classCompare) return classCompare;
    return (a[0]?.taxonomy.archetypeName || "").localeCompare(b[0]?.taxonomy.archetypeName || "", "zh-CN");
  });
}

function renderSeasonBuildModeCell(guide, mode) {
  if (!guide) {
    return `
      <div class="season-build-mode-cell is-empty">
        <span>${modeLabels[mode] || mode}</span>
        <strong>待回填</strong>
        <em>当前筛选下暂无 BD</em>
      </div>
    `;
  }
  return `
    <a class="season-build-mode-cell" href="${guideUrl(guide)}">
      <span>${guide.taxonomy.modeName} · ${guideSourceLabel(guide)}</span>
      <strong>${guide.formationDifficulty.label}成型 · ${guide.taxonomy.stage}</strong>
      <em>${guide.ceiling.displayTier || guide.ceiling.tier} · ${guide.ceiling.pit150Minutes} 分</em>
      <small>${guideCoreLine(guide)}</small>
    </a>
  `;
}

function renderSeasonBuildMatrix(guides) {
  const groups = groupGuidesByArchetype(guides);
  if (!groups.length) return "";
  return `
    <section class="season-build-matrix" aria-label="赛季流派对照矩阵">
      <div class="section-title">
        <h4>赛季流派对照矩阵</h4>
        <span>按职业和流派比较日常、速刷、冲层版本</span>
      </div>
      <div class="season-build-matrix__table">
        <div class="season-build-matrix__row season-build-matrix__row--head" aria-hidden="true">
          <span>职业 / 流派</span>
          ${buildVersionModeOrder.map((mode) => `<span>${modeLabels[mode] || mode}</span>`).join("")}
        </div>
        ${groups.map((archetypeGuides) => {
          const first = archetypeGuides[0];
          const guidesByMode = new Map(archetypeGuides.map((guide) => [guide.taxonomy.mode, guide]));
          const communityCount = archetypeGuides.filter((guide) => guide.source.references?.length).length;
          return `
            <article class="season-build-matrix__row">
              <header>
                <span>${first.taxonomy.className}</span>
                <strong>${first.taxonomy.archetypeName}</strong>
                <em>${archetypeGuides.length} 个用途 · ${communityCount} 社区来源</em>
              </header>
              ${buildVersionModeOrder.map((mode) => renderSeasonBuildModeCell(guidesByMode.get(mode), mode)).join("")}
            </article>
          `;
        }).join("")}
      </div>
    </section>
  `;
}

function directoryGuidesForCurrentFilters() {
  const query = normalizedText(state.sim.query);
  return allBuildGuides()
    .filter((guide) => guide.taxonomy.seasonId === state.sim.seasonId)
    .filter((guide) => state.sim.classId === "all" || guide.taxonomy.classId === state.sim.classId)
    .filter((guide) => guideMatchesBuildQuery(guide, query))
    .filter((guide) => guideMatchesSourceQuality(guide, state.sim.sourceQuality))
    .sort(sortGuidesForPlayer);
}

function recommendedDirectoryGuidesForCurrentFilters() {
  const query = normalizedText(state.sim.query);
  return allBuildGuides()
    .filter((guide) => guide.taxonomy.seasonId === state.sim.seasonId)
    .filter((guide) => state.sim.classId === "all" || guide.taxonomy.classId === state.sim.classId)
    .filter((guide) => guideMatchesBuildQuery(guide, query))
    .sort(sortGuidesForPlayer);
}

function renderRecommendedBuildCell(guide, mode) {
  if (!guide) {
    return `
      <div class="recommended-build-cell is-empty">
        <span>${modeLabels[mode] || mode}</span>
        <strong>待回填</strong>
        <em>当前来源筛选下暂无可展示 BD</em>
      </div>
    `;
  }
  const firstSkillStep = guide.skillTree?.pointOrder?.[0];
  const firstParagonStep = guide.paragon?.clickOrder?.[0];
  const isFallback = !guideMatchesSourceQuality(guide, state.sim.sourceQuality);
  const sourceText = isFallback
    ? `暂无${sourceQualityOption(state.sim.sourceQuality).shortLabel} · ${guideSourceLabel(guide)}`
    : guideSourceLabel(guide);
  return `
    <a class="recommended-build-cell ${isFallback ? "is-fallback" : ""}" href="${guideUrl(guide)}">
      <span>${guide.taxonomy.modeName} · ${sourceText}</span>
      <strong>${guide.taxonomy.archetypeName}</strong>
      <em>${guide.formationDifficulty.label}成型 · ${guide.taxonomy.stage} · ${guide.ceiling.displayTier || guide.ceiling.tier} · ${guide.ceiling.pit150Minutes} 分</em>
      <small>核心：${guideCoreLine(guide)}</small>
      <small>技能：${firstSkillStep ? `${displayText(firstSkillStep.levelRange)} ${displayText(firstSkillStep.skill)}` : "待来源回填"}</small>
      <small>巅峰：${firstParagonStep ? `${displayText(firstParagonStep.board)} ${displayText(firstParagonStep.node)}` : "待来源回填"}</small>
    </a>
  `;
}

function renderRecommendedBuildBoard(guides) {
  const classRows = (state.sim.classId === "all" ? state.classes : state.classes.filter((item) => item.id === state.sim.classId))
    .map((classInfo) => {
      const classGuides = guides.filter((guide) => guide.taxonomy.classId === classInfo.id);
      const archetypes = [...new Set(classGuides.map((guide) => guide.taxonomy.archetypeName))];
      const communityCount = classGuides.filter((guide) => guide.source.references?.length).length;
      const fallbackCount = classGuides.filter((guide) => !guideMatchesSourceQuality(guide, state.sim.sourceQuality)).length;
      const modes = new Map(buildVersionModeOrder.map((mode) => [
        mode,
        classGuides.filter((guide) => guide.taxonomy.mode === mode).sort(sortGuidesForPlayer)[0] || null
      ]));
      return {
        classInfo,
        classGuides,
        archetypes,
        communityCount,
        fallbackCount,
        modes
      };
    })
    .filter((row) => row.classGuides.length || state.sim.query === "");

  if (!classRows.length) return "";

  return `
    <section class="recommended-build-board" aria-label="本赛季抄作业入口">
      <div class="section-title">
        <h4>本赛季抄作业入口</h4>
        <span>每个职业按日常、速刷、冲层给出可进入完整 BD 的版本</span>
      </div>
      <div class="recommended-build-table">
        <div class="recommended-build-row recommended-build-row--head" aria-hidden="true">
          <span>职业</span>
          ${buildVersionModeOrder.map((mode) => `<span>${modeLabels[mode] || mode}</span>`).join("")}
        </div>
        ${classRows.map((row) => `
          <article class="recommended-build-row">
            <header>
              <span>${row.classInfo.zhName}</span>
              <strong>${row.archetypes.length} 个流派 · ${row.classGuides.length} 套 BD</strong>
              <em>${row.communityCount} 套社区来源 · ${row.fallbackCount} 套最佳可用补位 · ${row.archetypes.slice(0, 5).join(" / ") || "待回填"}</em>
            </header>
            ${buildVersionModeOrder.map((mode) => renderRecommendedBuildCell(row.modes.get(mode), mode)).join("")}
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function renderBuildClassRail() {
  const rail = $("[data-build-class-rail]");
  if (!rail) return;
  const seasonGuides = allBuildGuides().filter((guide) => guide.taxonomy.seasonId === state.sim.seasonId);
  const allCommunityCount = seasonGuides.filter((guide) => guide.source.references?.length).length;
  const allTab = `
    <button class="build-class-tab" type="button" data-build-class-id="all" aria-selected="${state.sim.classId === "all"}">
      <span>全部</span>
      <strong>${seasonGuides.length} 套</strong>
      <em>${allCommunityCount} 社区</em>
    </button>
  `;
  rail.innerHTML = allTab + state.classes.map((item) => {
    const classGuides = seasonGuides.filter((guide) => guide.taxonomy.classId === item.id);
    const communityCount = classGuides.filter((guide) => guide.source.references?.length).length;
    return `
      <button class="build-class-tab" type="button" data-build-class-id="${item.id}" aria-selected="${item.id === state.sim.classId}">
        <span>${item.zhName}</span>
        <strong>${classGuides.length} 套</strong>
        <em>${communityCount} 社区</em>
      </button>
    `;
  }).join("");
}

function renderBuildSourceRail() {
  const rail = $("[data-build-source-rail]");
  if (!rail) return;
  const baseGuides = baseFilteredGuides().sort(sortGuidesForPlayer);
  rail.innerHTML = sourceQualityOptions.map((option) => {
    const sourceGuides = baseGuides.filter((guide) => guideMatchesSourceQuality(guide, option.id));
    const bestGuide = sourceGuides[0];
    const isActive = state.sim.sourceQuality === option.id;
    return `
      <button class="build-source-card" type="button" data-build-source-quality="${option.id}" aria-selected="${isActive}" ${sourceGuides.length ? "" : "disabled"}>
        <span>${option.shortLabel}</span>
        <strong>${sourceGuides.length}</strong>
        <em>${bestGuide ? `${bestGuide.taxonomy.className} · ${bestGuide.taxonomy.archetypeName}` : "暂无匹配"}</em>
        <small>${option.description}</small>
      </button>
    `;
  }).join("");
}

function renderBuildViewTabs(guides) {
  const tabs = [
    {
      id: "recommended",
      label: "推荐入口",
      description: "每个职业按日常、速刷、冲层进入完整 BD。"
    },
    {
      id: "matrix",
      label: "流派矩阵",
      description: "按职业和流派比较用途版本。"
    },
    {
      id: "list",
      label: "完整列表",
      description: "查看当前筛选下的全部 BD 卡片。"
    }
  ];
  return `
    <nav class="build-view-tabs" aria-label="BD 大厅视图">
      ${tabs.map((tab) => `
        <button type="button" data-build-view="${tab.id}" aria-selected="${state.sim.view === tab.id}">
          <span>${tab.label}</span>
          <strong>${tab.id === "list" ? `${guides.length} 套` : tab.id === "matrix" ? `${new Set(guides.map((guide) => guide.taxonomy.archetypeId)).size} 流派` : "入口"}</strong>
          <em>${tab.description}</em>
        </button>
      `).join("")}
    </nav>
  `;
}

function renderBuildListView(guides) {
  const rows = guides.slice(0, state.sim.visible);
  return `
    <section class="build-result-section" aria-label="完整 BD 列表">
      <div class="section-title">
        <h4>完整 BD 列表</h4>
        <span>显示 ${rows.length} / ${guides.length} 套，列表只做筛选和进入详情</span>
      </div>
      <div class="guide-card-grid">
        ${rows.map(renderBuildLibraryCard).join("")}
      </div>
      ${rows.length < guides.length ? `
        <button class="button button-secondary build-more" type="button" data-build-more>显示更多 BD</button>
      ` : ""}
    </section>
  `;
}

function renderBuildViewContent(guides, recommendedGuides) {
  if (state.sim.view === "matrix") {
    return `
      ${renderBuildAtlas(guides)}
      ${renderSeasonBuildMatrix(guides)}
    `;
  }
  if (state.sim.view === "list") {
    return renderBuildListView(guides);
  }
  const priorityGuides = guides.slice(0, Math.min(12, state.sim.visible));
  return `
    ${renderRecommendedBuildBoard(recommendedGuides)}
    ${priorityGuides.length ? `<section class="build-result-section" aria-label="当前筛选下优先 BD">
      <div class="section-title">
        <h4>优先查看</h4>
        <span>按来源、上限和成型难度排序，展开完整列表可看全部 ${guides.length} 套</span>
      </div>
      <div class="compact-guide-grid">
        ${priorityGuides.map((guide) => `
          <a class="compact-guide-card" href="${guideUrl(guide)}">
            <span>${guide.taxonomy.className} · ${guide.taxonomy.modeName} · ${guideSourceLabel(guide)}</span>
            <strong>${guide.taxonomy.archetypeName}</strong>
            <em>${guide.formationDifficulty.label}成型 · ${guide.taxonomy.stage} · ${guide.ceiling.displayTier || guide.ceiling.tier} · ${guide.ceiling.pit150Minutes} 分</em>
            <small>${guideCoreLine(guide)}</small>
          </a>
        `).join("")}
      </div>
    </section>` : `<section class="build-result-section" aria-label="当前来源无列表">
      <div class="empty-panel">
        <p class="panel-kicker">当前来源没有列表结果</p>
        <h3>上方矩阵已用最佳可用资料补位</h3>
        <p>这些补位 BD 仍可打开完整详情，页面会标明社区、跨赛季、官方模板或未来推演状态。</p>
      </div>
    </section>`}
  `;
}

function renderSimulator() {
  const guides = filteredGuides();
  const recommendedGuides = recommendedDirectoryGuidesForCurrentFilters();
  const selected = guides[state.sim.buildIndex] || guides[0] || null;
  const listRows = guides.slice(0, 30);
  renderBuildClassRail();
  renderBuildSourceRail();
  if (!guides.some((guide) => guide.id === state.selectedGuideId)) {
    state.selectedGuideId = selected?.id || null;
  }

  $("[data-build-list]").innerHTML = `
    <div class="build-list-title">
      <span>${className(state.sim.classId)} · ${modeName(state.sim.mode)} · ${sourceQualityOption(state.sim.sourceQuality).shortLabel}</span>
      <strong>${guides.length} 套 BD</strong>
      <em>${guides.filter((guide) => guide.source.references?.length).length} 套社区来源</em>
    </div>
    ${listRows.map((guide, index) => `
      <a class="build-list-link guide-link" href="${guideUrl(guide)}" aria-selected="${index === state.sim.buildIndex}">
        <span>${String(index + 1).padStart(2, "0")}</span>
        <strong>${guide.taxonomy.archetypeName}</strong>
        <em>${guideSourceLabel(guide)} · ${guide.taxonomy.stageTags.join(" / ")} · 成型${guide.formationDifficulty.label} · ${guide.ceiling.displayTier || guide.ceiling.tier} · ${guide.ceiling.pit150Minutes} 分</em>
      </a>
    `).join("")}
    ${listRows.length < guides.length ? `<div class="build-list-foot">还有 ${guides.length - listRows.length} 套，请用右侧完整列表或继续筛选。</div>` : ""}
  `;

  if (!guides.length && !recommendedGuides.length) {
    $("[data-sim-result]").innerHTML = `
      <div class="empty-panel">
        <p class="panel-kicker">没有匹配 BD</p>
        <h3>调整赛季、职业或用途</h3>
        <p>当前筛选条件没有找到构筑档案。</p>
      </div>
    `;
    return;
  }

  const modeLabel = modeName(state.sim.mode);
  const communityCount = guides.filter((guide) => guide.source.references?.length).length;
  const topGuide = guides[0] || recommendedGuides[0];
  $("[data-sim-result]").innerHTML = `
    <div class="library-head">
      <div>
        <p class="panel-kicker">BD 大厅</p>
        <h3>${className(state.sim.classId)} · ${modeLabel} · ${sourceQualityOption(state.sim.sourceQuality).label}</h3>
        <p>按资料来源、成型难度、适用阶段和上限比较流派。社区可抄优先用于实战，模板和未来推演只作为赛季预判或数据缺口提示。</p>
      </div>
      <div class="library-stats">
        <span><b>${guides.length}</b>套流派</span>
        <span><b>${communityCount}</b>社区参考</span>
        <span><b>${topGuide?.ceiling.label || "待回填"}</b>最高参考</span>
      </div>
    </div>
    ${renderBuildViewTabs(guides)}
    ${renderBuildViewContent(guides, recommendedGuides)}
  `;
  bindImageFallbacks($("[data-sim-result]"));
}

function renderTargetLink(target) {
  if (!target?.itemId) return `<strong>${target?.zhName || "待回填装备"}</strong>`;
  return `<a href="${itemUrl(target.itemId)}">${target.zhName}</a>`;
}

function gearSlotStatus(slot) {
  if (slot.required) return "硬需求";
  if (slot.replaceable) return "可替换";
  return "核心位";
}

function gearSlotFlags(slot) {
  const flags = [];
  if (slot.required) flags.push("硬需求");
  else if (slot.core) flags.push("核心位");
  if (slot.replaceable) flags.push("可替换");
  else flags.push("固定核心");
  return flags;
}

function gearSlotStateClass(slot) {
  if (slot.required) return "is-required";
  if (slot.replaceable) return "is-replaceable";
  return slot.core ? "is-core" : "is-support";
}

function gearAspectDisplay(slot) {
  const aspectName = slot.aspect?.name || "威能待回填";
  const fallback = slot.aspect?.role || aspectName;
  return displayText(ignoredAspectDisplayNames.has(aspectName) ? fallback : aspectName);
}

function gearPowerDisplay(slot) {
  const targetType = slot.target?.type;
  if (targetType === "mythic" || targetType === "unique") {
    const prefix = targetType === "mythic" ? "神话暗金" : "暗金";
    return `${prefix}：${displayText(slot.target.zhName || slot.target.name || "装备待回填")}`;
  }
  const aspectName = slot.aspect?.name || "";
  if (aspectName && !ignoredAspectDisplayNames.has(aspectName)) {
    return `威能：${displayText(aspectName)}`;
  }
  return displayText(slot.aspect?.role || "威能待来源回填");
}

function renderGearSummaryMatrix(guide) {
  return `
    <section class="gear-summary-matrix" aria-label="完整配装总表">
      <header>
        <div>
          <span>完整配装总表</span>
          <strong>11 个装备位置、核心件、替换状态和词缀方向</strong>
        </div>
        <em>${guideSourceLabel(guide)} · ${guide.gameVersion.patch} 构建 #${guide.gameVersion.build}</em>
      </header>
      <div class="gear-summary-table">
        <div class="gear-summary-row gear-summary-row--head" aria-hidden="true">
          <span>位置</span>
          <span>目标装备</span>
          <span>核心 / 替换</span>
          <span>威能或暗金</span>
          <span>词缀优先级</span>
          <span>操作</span>
        </div>
        ${guide.gearSlots.map((slot) => {
          const affixes = (slot.affixes || []).slice(0, 3).map(displayText);
          const alternatives = slot.alternatives || [];
          return `
            <article class="gear-summary-row ${gearSlotStateClass(slot)}">
              <div class="gear-summary-slot">
                ${renderIcon(slot.target, `${slot.zhSlotName}${slot.target.zhName}图标`)}
                <div>
                  <span>${slot.zhSlotName}</span>
                  <strong>${slot.priority}</strong>
                </div>
              </div>
              <div class="gear-summary-cell gear-summary-target">
                <span class="gear-summary-label">目标装备</span>
                ${renderTargetLink(slot.target)}
                <em>${displayText(slot.target.description || "装备说明待来源回填")}</em>
              </div>
              <div class="gear-summary-cell">
                <span class="gear-summary-label">核心 / 替换</span>
                <div class="gear-summary-badges">
                  ${gearSlotFlags(slot).map((flag) => `<b>${flag}</b>`).join("")}
                </div>
                <em>${alternatives.length} 个替换方案</em>
              </div>
              <div class="gear-summary-cell">
                <span class="gear-summary-label">威能或暗金</span>
                <strong>${gearPowerDisplay(slot)}</strong>
                <em>${displayText(slot.aspect?.role || "作用待来源回填")}</em>
              </div>
              <div class="gear-summary-cell">
                <span class="gear-summary-label">词缀优先级</span>
                <p>${affixes.length ? affixes.join(" / ") : "词缀待来源回填"}</p>
              </div>
              <div class="gear-summary-actions">
                <button type="button" data-guide-jump="gear" data-gear-slot-target="${slot.slotId}">看明细</button>
                ${slot.target?.itemId ? `<a href="${itemUrl(slot.target.itemId)}">装备页</a>` : ""}
              </div>
            </article>
          `;
        }).join("")}
      </div>
    </section>
  `;
}

function renderGearSlot(slot) {
  const upgradePath = slot.upgradePath || [];
  const sourceStatus = slot.aspect?.sourceStatus || slot.dataStatus || "资料状态待回填";
  const alternatives = (slot.alternatives || []).map((alt) => {
    const name = alt.itemId ? `<a href="${itemUrl(alt.itemId)}">${alt.zhName}</a>` : `<b>${alt.zhName}</b>`;
    return `<li>${name}<span>${displayText(`${alt.reason} ${alt.tradeoff}`)}</span></li>`;
  }).join("");
  return `
    <article class="gear-slot-card ${slot.core ? "is-core" : ""}" data-gear-slot-card="${slot.slotId}">
      <div class="gear-slot-card__top">
        <span>${slot.zhSlotName}</span>
        <strong>${gearSlotStatus(slot)}</strong>
      </div>
      <div class="gear-slot-card__main">
        ${renderIcon(slot.target, `${slot.target.zhName}图标`)}
        <div>
          <h4>${renderTargetLink(slot.target)}</h4>
          <p>${displayText(slot.target.description)}</p>
        </div>
      </div>
      <div class="gear-slot-card__flags">
        <span>${slot.priority}</span>
        <span>${gearPowerDisplay(slot)}</span>
        <span>${displayText(slot.aspect.role)}</span>
      </div>
      <dl class="gear-lines">
        <div><dt>数据状态</dt><dd>${displayText(sourceStatus)}</dd></div>
        <div><dt>词缀</dt><dd>${slot.affixes.map(displayText).join(" / ")}</dd></div>
        <div><dt>淬炼</dt><dd>${slot.tempers.map(displayText).join(" / ")}</dd></div>
        <div><dt>精造</dt><dd>${slot.masterwork.map(displayText).join(" / ")}</dd></div>
        <div><dt>宝石</dt><dd>${slot.sockets.map(displayText).join(" / ")}</dd></div>
      </dl>
      ${upgradePath.length ? `
        <div class="slot-upgrade-path">
          <strong>成型顺序</strong>
          <ol>${upgradePath.map((step) => `<li>${step}</li>`).join("")}</ol>
        </div>
      ` : ""}
      <div class="slot-alternatives">
        <strong>替换方案</strong>
        <ul>${alternatives}</ul>
      </div>
      ${slot.notes?.length ? `<p class="slot-note">${displayText(slot.notes.join(" "))}</p>` : ""}
    </article>
  `;
}

function renderAlternativeTarget(alternative) {
  if (!alternative) return `<strong>没有登记替换件</strong>`;
  return alternative.itemId ? `<a href="${itemUrl(alternative.itemId)}">${alternative.zhName}</a>` : `<strong>${alternative.zhName}</strong>`;
}

function renderReplacementMatrix(guide) {
  return `
    <section class="replacement-matrix" aria-label="全槽位替换矩阵">
      <header>
        <div>
          <span>全槽位替换矩阵</span>
          <strong>11 个部位的可替换性、首选替换和代价</strong>
        </div>
        <em>${guide.gearSlots.filter((slot) => slot.replaceable).length} 可替换 · ${guide.gearSlots.filter((slot) => slot.required).length} 硬需求</em>
      </header>
      <div class="replacement-table">
        <div class="replacement-row replacement-row--head" aria-hidden="true">
          <span>部位</span>
          <span>当前目标</span>
          <span>首选替换</span>
          <span>代价 / 触发条件</span>
          <span>操作</span>
        </div>
        ${guide.gearSlots.map((slot) => {
          const alternative = (slot.alternatives || [])[0];
          return `
            <article class="replacement-row ${gearSlotStateClass(slot)}">
              <div class="replacement-slot">
                <span>${slot.zhSlotName}</span>
                <strong>${gearSlotStatus(slot)}</strong>
              </div>
              <div>
                <b class="replacement-label">当前目标</b>
                ${renderTargetLink(slot.target)}
                <em>${gearPowerDisplay(slot)}</em>
              </div>
              <div>
                <b class="replacement-label">首选替换</b>
                ${renderAlternativeTarget(alternative)}
                <em>${(slot.alternatives || []).length} 个可选方案</em>
              </div>
              <div>
                <b class="replacement-label">代价 / 触发条件</b>
                <p>${displayText(alternative ? `${alternative.reason || ""} ${alternative.tradeoff || ""}`.trim() : "没有可替换方案，优先保留当前部位。")}</p>
              </div>
              <button type="button" data-guide-jump="gear" data-gear-slot-target="${slot.slotId}">看部位</button>
            </article>
          `;
        }).join("")}
      </div>
    </section>
  `;
}

const loadoutBoardOrder = [
  "helm",
  "chest",
  "gloves",
  "pants",
  "boots",
  "amulet",
  "ring1",
  "ring2",
  "twoHand",
  "mainHand",
  "offHand"
];

const loadoutBoardSlotClasses = {
  helm: "helm",
  chest: "chest",
  gloves: "gloves",
  pants: "pants",
  boots: "boots",
  amulet: "amulet",
  ring1: "ring-1",
  ring2: "ring-2",
  twoHand: "two-hand",
  mainHand: "main-hand",
  offHand: "off-hand"
};

function renderLoadoutBoardSlot(slot) {
  if (!slot) return "";
  return `
    <button class="loadout-board-slot loadout-board-slot--${loadoutBoardSlotClasses[slot.slotId] || slot.slotId} ${gearSlotStateClass(slot)}" type="button" data-guide-jump="gear" data-gear-slot-target="${slot.slotId}">
      ${renderIcon(slot.target, `${slot.zhSlotName}${slot.target.zhName}图标`)}
      <span>${slot.zhSlotName}</span>
      <strong>${displayText(slot.target.zhName)}</strong>
      <em>${gearSlotStatus(slot)} · ${gearPowerDisplay(slot)}</em>
    </button>
  `;
}

function renderLoadoutBoard(guide) {
  const slotsById = new Map(guide.gearSlots.map((slot) => [slot.slotId, slot]));
  const requiredCount = guide.gearSlots.filter((slot) => slot.required).length;
  const replaceableCount = guide.gearSlots.filter((slot) => slot.replaceable).length;
  const coreCount = guide.gearSlots.filter((slot) => slot.core || slot.required).length;
  const coreUniques = (guide.coreUniques || []).slice(0, 3).map((item) => item.zhName);
  const coreAspects = (guide.coreAspects || [])
    .map((aspect) => aspect.name)
    .filter((name) => !ignoredAspectDisplayNames.has(name))
    .slice(0, 4);
  return `
    <section class="loadout-board" aria-label="纸娃娃式全身装备盘面">
      <header class="loadout-board__header">
        <div>
          <span>全身装备盘面</span>
          <strong>${guide.taxonomy.className} · ${guide.taxonomy.archetypeName}</strong>
        </div>
        <div class="loadout-board__counts" aria-label="装备状态统计">
          <em>${coreCount} 核心</em>
          <em>${requiredCount} 硬需求</em>
          <em>${replaceableCount} 可替换</em>
        </div>
      </header>
      <div class="loadout-paper-doll">
        <div class="loadout-board-center">
          <span>${guide.taxonomy.modeName}</span>
          <strong>${guide.ceiling.displayTier || guide.ceiling.tier}</strong>
          <p>${guide.formationDifficulty.label}成型 · ${guide.taxonomy.stage}</p>
          <small>${guideSourceLabel(guide)}</small>
          <div>
            ${(coreUniques.length ? coreUniques : ["核心暗金待回填"]).map((name) => `<b>${name}</b>`).join("")}
            ${coreAspects.map((name) => `<b>${name}</b>`).join("")}
          </div>
        </div>
        ${loadoutBoardOrder.map((slotId) => renderLoadoutBoardSlot(slotsById.get(slotId))).join("")}
      </div>
      <p class="loadout-board__note">点击任意装备位跳到装备详情区，查看词缀、淬炼、精造、宝石和替换方案。</p>
    </section>
  `;
}

function renderLoadoutStrip(guide) {
  return `
    <div class="loadout-strip" aria-label="全身装备速览">
      ${guide.gearSlots.map((slot) => `
        <button class="loadout-slot ${slot.required ? "is-required" : slot.core ? "is-core" : ""}" type="button" data-guide-jump="gear" data-gear-slot-target="${slot.slotId}">
          ${renderIcon(slot.target, `${slot.zhSlotName}${slot.target.zhName}图标`)}
          <span>${slot.zhSlotName}</span>
          <strong>${slot.target.zhName}</strong>
          <em>${gearSlotStatus(slot)}</em>
        </button>
      `).join("")}
    </div>
  `;
}

function renderBuildManualPanel(guide) {
  const skillSteps = (guide.skillTree?.pointOrder || []).slice(0, 10);
  const paragonSteps = (guide.paragon?.clickOrder || []).slice(0, 10);
  const flowSections = [
    ["起手", guide.gameplay?.opener || []],
    ["主循环", guide.gameplay?.loop || []],
    ["首领", guide.gameplay?.boss || []],
    ["防御", guide.gameplay?.defense || []],
    ["速刷", guide.gameplay?.speedFarm || []],
    ["避坑", guide.gameplay?.commonMistakes || []]
  ];
  return `
    <section class="build-manual-panel" aria-label="BD 执行手册">
      <header>
        <div>
          <span>BD 执行手册</span>
          <strong>装备、技能、巅峰和打法一次看完</strong>
        </div>
        <em>${guide.taxonomy.seasonName} · ${guide.taxonomy.className} · ${guide.taxonomy.archetypeName}</em>
      </header>
      <div class="build-manual-grid">
        <article class="build-manual-block build-manual-block--gear">
          <div class="build-manual-block__title">
            <strong>全身装备位</strong>
            <span>${guide.gearSlots.length} 个位置</span>
          </div>
          <div class="manual-gear-list">
            ${guide.gearSlots.map((slot) => `
              <button class="manual-gear-row ${gearSlotStateClass(slot)}" type="button" data-guide-jump="gear" data-gear-slot-target="${slot.slotId}">
                <span>${slot.zhSlotName}</span>
                <strong>${displayText(slot.target.zhName)}</strong>
                <em>${gearSlotStatus(slot)} · ${gearPowerDisplay(slot)}</em>
                <b>${(slot.alternatives || []).length} 替换</b>
              </button>
            `).join("")}
          </div>
        </article>
        <article class="build-manual-block">
          <div class="build-manual-block__title">
            <strong>技能加点</strong>
            <span>${skillSteps.length} 步</span>
          </div>
          <ol class="manual-step-list">
            ${skillSteps.map((step) => `
              <li>
                <span>${step.step}</span>
                <div>
                  <strong>${displayText(step.levelRange)} · ${displayText(step.skill)}</strong>
                  <p>${displayText(step.points)} · ${displayText(step.reason)}</p>
                </div>
              </li>
            `).join("")}
          </ol>
        </article>
        <article class="build-manual-block">
          <div class="build-manual-block__title">
            <strong>巅峰点击</strong>
            <span>${paragonSteps.length} 步</span>
          </div>
          <ol class="manual-step-list">
            ${paragonSteps.map((step) => `
              <li>
                <span>${step.step}</span>
                <div>
                  <strong>${displayText(step.board)} · ${displayText(step.node)}</strong>
                  <p>${displayText(step.reason)}</p>
                </div>
              </li>
            `).join("")}
          </ol>
        </article>
        <article class="build-manual-block">
          <div class="build-manual-block__title">
            <strong>打法流程</strong>
            <span>6 个阶段</span>
          </div>
          <div class="manual-flow-list">
            ${flowSections.map(([title, lines]) => `
              <div>
                <strong>${title}</strong>
                <p>${displayText((lines || [])[0] || "待来源回填")}</p>
              </div>
            `).join("")}
          </div>
        </article>
      </div>
    </section>
  `;
}

function renderExecutionPlan(guide) {
  const requiredSlots = guide.gearSlots.filter((slot) => slot.required).slice(0, 4);
  const skillSteps = (guide.skillTree?.pointOrder || []).slice(0, 3);
  const paragonSteps = (guide.paragon?.clickOrder || []).slice(0, 3);
  const loopSteps = (guide.gameplay?.loop || []).slice(0, 3);
  return `
    <div class="execution-plan">
      <article>
        <span>1</span>
        <div>
          <strong>先凑核心位</strong>
          <p>${requiredSlots.length ? requiredSlots.map((slot) => `${slot.zhSlotName}：${slot.target.zhName}`).join("；") : "先按装备区补齐核心暗金或核心威能。"}</p>
        </div>
      </article>
      <article>
        <span>2</span>
        <div>
          <strong>技能先按等级段点</strong>
          <p>${skillSteps.map((step) => `${step.levelRange} ${step.skill}`).join("；")}</p>
        </div>
      </article>
      <article>
        <span>3</span>
        <div>
          <strong>巅峰先走关键节点</strong>
          <p>${paragonSteps.map((step) => `${step.board}：${step.node}`).join("；")}</p>
        </div>
      </article>
      <article>
        <span>4</span>
        <div>
          <strong>按循环打，不齐装先降层</strong>
          <p>${loopSteps.join("；")}</p>
        </div>
      </article>
    </div>
  `;
}

function renderRouteOverview(guide) {
  const skillTree = guide.skillTree || {};
  const paragon = guide.paragon || {};
  const skillSteps = (skillTree.pointOrder || []).slice(0, 10);
  const paragonSteps = (paragon.clickOrder || []).slice(0, 10);
  return `
    <section class="route-overview" aria-label="技能加点和巅峰点击总览">
      <header class="route-overview__head">
        <div>
          <span>执行路线总览</span>
          <strong>技能先成型，巅峰先拿雕文孔和传奇节点</strong>
        </div>
        <div>
          <button type="button" data-guide-jump="skills">看技能分区</button>
          <button type="button" data-guide-jump="paragon">看巅峰分区</button>
        </div>
      </header>
      <div class="route-overview__skillbar" aria-label="技能栏">
        ${(skillTree.skillBar || []).map((skill) => `
          <article>
            <span>${skill.slot}</span>
            <strong>${displayText(skill.name)}</strong>
            <em>${displayText(skill.role)} · ${skill.points} 点</em>
          </article>
        `).join("")}
      </div>
      <div class="route-overview__grid">
        <article class="route-overview-panel">
          <header>
            <strong>技能加点顺序</strong>
            <span>${skillSteps.length} 步</span>
          </header>
          <ol class="route-mini-list">
            ${skillSteps.map((step) => `
              <li>
                <span>${step.step}</span>
                <div>
                  <strong>${displayText(step.levelRange)} · ${displayText(step.skill)}</strong>
                  <p>${displayText(step.points)}。${displayText(step.reason)}</p>
                </div>
              </li>
            `).join("")}
          </ol>
        </article>
        <article class="route-overview-panel">
          <header>
            <strong>巅峰点击顺序</strong>
            <span>${paragonSteps.length} 步</span>
          </header>
          <ol class="route-mini-list">
            ${paragonSteps.map((step) => `
              <li>
                <span>${step.step}</span>
                <div>
                  <strong>${displayText(step.board)} · ${displayText(step.node)}</strong>
                  <p>${displayText(step.reason)}</p>
                </div>
              </li>
            `).join("")}
          </ol>
        </article>
      </div>
      <div class="route-board-lane" aria-label="巅峰盘和雕文顺序">
        ${(paragon.boardOrder || []).map((board) => `
          <article>
            <span>${board.order}</span>
            <strong>${displayText(board.name)}</strong>
            <em>${displayText(board.glyph)} · ${displayText(board.rotate)}</em>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function renderGameplayOverview(guide) {
  const gameplay = guide.gameplay || {};
  const panels = [
    {
      title: "起手",
      kicker: "进场到第一轮爆发",
      lines: gameplay.opener || []
    },
    {
      title: "主循环",
      kicker: "常规清怪和精英包",
      lines: gameplay.loop || []
    },
    {
      title: "首领 / 防御",
      kicker: "高压窗口和保命",
      lines: [...(gameplay.boss || []).slice(0, 2), ...(gameplay.defense || []).slice(0, 3)]
    },
    {
      title: "速刷 / 避坑",
      kicker: "低层效率和常见错误",
      lines: [...(gameplay.speedFarm || []).slice(0, 2), ...(gameplay.commonMistakes || []).slice(0, 3)]
    }
  ];
  return `
    <section class="combat-overview" aria-label="战斗循环总览">
      <header class="combat-overview__head">
        <div>
          <span>战斗循环总览</span>
          <strong>起手、循环、防御和常见错误</strong>
        </div>
        <button type="button" data-guide-jump="gameplay">看完整打法</button>
      </header>
      <div class="combat-overview__grid">
        ${panels.map((panel) => `
          <article>
            <header>
              <span>${panel.kicker}</span>
              <strong>${panel.title}</strong>
            </header>
            <ol>
              ${panel.lines.map((line, index) => `
                <li>
                  <span>${index + 1}</span>
                  <p>${displayText(line)}</p>
                </li>
              `).join("")}
            </ol>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function renderProgressionPlan(progression) {
  if (!progression?.stages?.length) {
    return `<p class="empty-copy">开荒到成型路线待来源回填。</p>`;
  }
  return `
    <section class="progression-plan" aria-label="开荒到成型路线">
      <header class="progression-plan__head">
        <div>
          <span>开荒到成型路线</span>
          <strong>从升级、过渡、终局到用途专精</strong>
        </div>
        <em>${displayText(progression.sourceStatus || "结构化路线")}</em>
      </header>
      <div class="progression-checkpoints" aria-label="关键检查点">
        ${(progression.checkpoints || []).map((checkpoint) => `
          <article>
            <span>${displayText(checkpoint.label)}</span>
            <strong>${displayText(checkpoint.value)}</strong>
          </article>
        `).join("")}
      </div>
      <div class="progression-stage-table">
        <div class="progression-stage-row progression-stage-row--head" aria-hidden="true">
          <span>阶段</span>
          <span>目标</span>
          <span>装备</span>
          <span>技能 / 巅峰</span>
          <span>打法和替换</span>
        </div>
        ${progression.stages.map((stage) => `
          <article class="progression-stage-row">
            <div class="progression-stage-title">
              <span>${displayText(stage.levelRange)}</span>
              <strong>${displayText(stage.title)}</strong>
            </div>
            <div>
              <b class="progression-label">目标</b>
              <p>${displayText(stage.objective)}</p>
            </div>
            <div>
              <b class="progression-label">装备</b>
              <p>${displayText(stage.gearFocus)}</p>
            </div>
            <div>
              <b class="progression-label">技能 / 巅峰</b>
              <p>${displayText(stage.skillFocus)}</p>
              <em>${displayText(stage.paragonFocus)}</em>
            </div>
            <div>
              <b class="progression-label">打法和替换</b>
              <p>${displayText(stage.gameplayFocus)}</p>
              <em>${displayText(stage.swapRule)}</em>
            </div>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function renderGuideDetailSection(title, subtitle, body, key) {
  return `
    <section class="guide-section" data-guide-section="${key}">
      <div class="section-title">
        <h4>${title}</h4>
        <span>${subtitle}</span>
      </div>
      ${body}
    </section>
  `;
}

function renderSkillRouteMatrix(skillTree) {
  const steps = skillTree.pointOrder || [];
  return `
    <section class="route-matrix skill-route-matrix" aria-label="技能加点路线总表">
      <header class="route-matrix__head">
        <div>
          <span>技能路线总表</span>
          <strong>${displayText(skillTree.core || "核心技能待来源回填")} · ${steps.length} 步加点</strong>
        </div>
        <em>技能栏、等级段、投入点数和加点原因</em>
      </header>
      <div class="route-matrix-skillbar" aria-label="六技能栏">
        ${(skillTree.skillBar || []).map((skill) => `
          <article>
            <span>${skill.slot}</span>
            <strong>${displayText(skill.name)}</strong>
            <em>${displayText(skill.role)} · ${skill.points} 点</em>
          </article>
        `).join("")}
      </div>
      <div class="route-step-table skill-step-table">
        <div class="route-step-row route-step-row--head" aria-hidden="true">
          <span>顺序</span>
          <span>等级段</span>
          <span>技能</span>
          <span>点数</span>
          <span>原因</span>
        </div>
        ${steps.map((step) => `
          <article class="route-step-row">
            <span class="route-step-index">${step.step}</span>
            <div>
              <b class="route-step-label">等级段</b>
              <strong>${displayText(step.levelRange)}</strong>
            </div>
            <div>
              <b class="route-step-label">技能</b>
              <strong>${displayText(step.skill)}</strong>
            </div>
            <div>
              <b class="route-step-label">点数</b>
              <em>${displayText(step.points)}</em>
            </div>
            <div>
              <b class="route-step-label">原因</b>
              <p>${displayText(step.reason)}</p>
            </div>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function renderSkillTree(skillTree) {
  return `
    ${renderSkillRouteMatrix(skillTree)}
    <div class="skill-layout">
      <div class="skill-side-panel">
        <div class="skill-bar-large">
          ${skillTree.skillBar.map((skill) => `
            <article>
              <span>${skill.slot}</span>
              <strong>${displayText(skill.name)}</strong>
              <em>${displayText(skill.role)} · ${skill.points} 点</em>
            </article>
          `).join("")}
        </div>
        <div class="route-note-card">
          <strong>职业机制</strong>
          <p>${displayText(skillTree.classMechanic || "职业机制待来源回填，先按技能栏和装备触发条件执行。")}</p>
        </div>
        <div class="route-note-card">
          <strong>被动优先级</strong>
          <p>${(skillTree.passives || []).map(displayText).join(" / ")}</p>
        </div>
      </div>
      <div class="route-main-panel">
        <ol class="timeline-list">
          ${skillTree.pointOrder.map((item) => `
            <li>
              <span>${item.step}</span>
              <div><strong>${displayText(item.levelRange)} · ${displayText(item.skill)}</strong><p>${displayText(item.points)}。${displayText(item.reason)}</p></div>
            </li>
          `).join("")}
        </ol>
        ${skillTree.notes?.length ? `
          <div class="route-note-card">
            <strong>加点规则</strong>
            <ul>${listItems(skillTree.notes)}</ul>
          </div>
        ` : ""}
      </div>
    </div>
  `;
}

function renderParagonRouteMatrix(paragon) {
  const boards = paragon.boardOrder || [];
  const steps = paragon.clickOrder || [];
  return `
    <section class="route-matrix paragon-route-matrix" aria-label="巅峰点击路线总表">
      <header class="route-matrix__head">
        <div>
          <span>巅峰路线总表</span>
          <strong>${boards.length} 张盘 · ${steps.length} 步点击顺序</strong>
        </div>
        <em>先雕文孔和传奇节点，再补稀有、魔法与属性门槛</em>
      </header>
      <div class="paragon-board-table" aria-label="巅峰盘和雕文顺序">
        ${boards.map((board) => `
          <article>
            <span>${board.order}</span>
            <div>
              <strong>${displayText(board.name)}</strong>
              <em>${displayText(board.glyph)} · ${displayText(board.rotate)}</em>
              <p>${displayText(board.goal)}</p>
            </div>
          </article>
        `).join("")}
      </div>
      ${paragon.pointBands?.length ? `
        <div class="route-band-strip" aria-label="巅峰点数阶段">
          ${paragon.pointBands.map((band) => `
            <article>
              <strong>${band.points} 点</strong>
              <span>${displayText(band.goal)}</span>
            </article>
          `).join("")}
        </div>
      ` : ""}
      <div class="route-step-table paragon-step-table">
        <div class="route-step-row route-step-row--head" aria-hidden="true">
          <span>顺序</span>
          <span>盘面</span>
          <span>点击目标</span>
          <span>原因</span>
        </div>
        ${steps.map((step) => `
          <article class="route-step-row">
            <span class="route-step-index">${step.step}</span>
            <div>
              <b class="route-step-label">盘面</b>
              <strong>${displayText(step.board)}</strong>
            </div>
            <div>
              <b class="route-step-label">点击目标</b>
              <strong>${displayText(step.node)}</strong>
            </div>
            <div>
              <b class="route-step-label">原因</b>
              <p>${displayText(step.reason)}</p>
            </div>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function renderParagon(paragon) {
  return `
    ${renderParagonRouteMatrix(paragon)}
    <div class="paragon-layout">
      <div class="paragon-side-panel">
        <div class="paragon-boards">
          ${paragon.boardOrder.map((board) => `
            <article>
              <span>${board.order}</span>
              <strong>${displayText(board.name)}</strong>
              <p>${displayText(board.goal)}</p>
              <em>${displayText(board.glyph)} · ${displayText(board.rotate)}</em>
            </article>
          `).join("")}
        </div>
        ${paragon.glyphs?.length ? `
          <div class="glyph-grid">
            ${paragon.glyphs.map((glyph) => `
              <article>
                <strong>${glyph.priority}. ${displayText(glyph.name)}</strong>
                <span>${displayText(glyph.socket)}</span>
                <p>${displayText(glyph.note)}</p>
              </article>
            `).join("")}
          </div>
        ` : ""}
      </div>
      <div class="route-main-panel">
        ${paragon.pointBands?.length ? `
          <div class="point-band-grid">
            ${paragon.pointBands.map((band) => `
              <article>
                <strong>${band.points} 点</strong>
                <span>${displayText(band.goal)}</span>
              </article>
            `).join("")}
          </div>
        ` : ""}
        <ol class="timeline-list">
          ${paragon.clickOrder.map((item) => `
            <li>
              <span>${item.step}</span>
              <div><strong>${displayText(item.board)} · ${displayText(item.node)}</strong><p>${displayText(item.reason)}</p></div>
            </li>
          `).join("")}
        </ol>
        ${paragon.notes?.length ? `
          <div class="route-note-card">
            <strong>巅峰规则</strong>
            <ul>${listItems(paragon.notes)}</ul>
          </div>
        ` : ""}
      </div>
    </div>
  `;
}

function combatFlowSections(gameplay) {
  return [
    {
      title: "起手",
      timing: "进场到第一轮爆发",
      focus: "先建立核心增伤、资源和安全位置，再进入主循环。",
      lines: gameplay.opener || []
    },
    {
      title: "主循环",
      timing: "常规清怪和精英包",
      focus: "按资源、冷却和核心技能窗口循环，避免空转关键爆发。",
      lines: gameplay.loop || []
    },
    {
      title: "首领",
      timing: "单体和高血量目标",
      focus: "把爆发留给易伤、控制或增伤窗口，失误时先保命。",
      lines: gameplay.boss || []
    },
    {
      title: "防御",
      timing: "高压、低血和危险词缀",
      focus: "防御技能优先覆盖危险窗口，不为多打一轮牺牲生存。",
      lines: gameplay.defense || []
    },
    {
      title: "速刷",
      timing: "低层、日常和材料效率",
      focus: "压缩停顿时间，保持位移、聚怪和主攻技能节奏。",
      lines: gameplay.speedFarm || []
    },
    {
      title: "常见错误",
      timing: "最容易掉层或降速的点",
      focus: "优先避免资源断档、防御真空和错误装备触发顺序。",
      lines: gameplay.commonMistakes || []
    }
  ];
}

function renderCombatFlowMatrix(gameplay) {
  const sections = combatFlowSections(gameplay);
  return `
    <section class="combat-flow-matrix" aria-label="打法流程总表">
      <header class="combat-flow-matrix__head">
        <div>
          <span>打法流程总表</span>
          <strong>起手、主循环、首领、防御、速刷和常见错误</strong>
        </div>
        <em>先按阶段执行，再看下方详细说明</em>
      </header>
      <div class="combat-flow-table">
        <div class="combat-flow-row combat-flow-row--head" aria-hidden="true">
          <span>阶段</span>
          <span>执行动作</span>
          <span>重点</span>
        </div>
        ${sections.map((section) => `
          <article class="combat-flow-row">
            <div class="combat-flow-phase">
              <span>${section.title}</span>
              <strong>${section.timing}</strong>
            </div>
            <ol>
              ${(section.lines || []).map((line, index) => `
                <li>
                  <b>${index + 1}</b>
                  <p>${displayText(line)}</p>
                </li>
              `).join("")}
            </ol>
            <p class="combat-flow-focus">${section.focus}</p>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function renderGameplay(gameplay) {
  const blocks = [
    ["起手", gameplay.opener],
    ["循环", gameplay.loop],
    ["首领", gameplay.boss],
    ["防御", gameplay.defense],
    ["速刷", gameplay.speedFarm],
    ["常见错误", gameplay.commonMistakes]
  ];
  return `
    ${renderCombatFlowMatrix(gameplay)}
    <div class="gameplay-grid">
      ${blocks.map(([title, lines]) => `
        <article>
          <h5>${title}</h5>
          <ol>${listItems(lines)}</ol>
        </article>
      `).join("")}
    </div>
  `;
}

const guideDetailSectionOrder = ["overview", "progression", "gear", "skills", "paragon", "gameplay", "variants", "sources"];

function renderGuideSectionByKey(guide, activeSection = state.selectedGuideSection || "overview") {
  const sectionRenderers = {
    overview: () => renderGuideDetailSection("总览", "定位、强弱项和适用阶段", `
      ${renderBuildVersionSwitcher(guide)}
      ${renderBuildManualPanel(guide)}
      ${renderExecutionPlan(guide)}
      ${renderRouteOverview(guide)}
      ${renderGameplayOverview(guide)}
      ${renderSuitability(guide)}
      <div class="core-item-strip">${renderCoreUniques(guide, 5)}</div>
      <div class="core-aspect-strip">${renderCoreAspects(guide)}</div>
      <div class="guide-two-col">
        <article>
          <h5>优点</h5>
          <ul>${listItems(guide.summary.pros)}</ul>
        </article>
        <article>
          <h5>短板</h5>
          <ul>${listItems(guide.summary.cons)}</ul>
        </article>
      </div>
      <div class="guide-two-col">
        <article>
          <h5>成型难度</h5>
          <ul>${listItems(guide.formationDifficulty.reasons)}</ul>
        </article>
        <article>
          <h5>150 层证据</h5>
          ${renderCeilingEvidence(guide)}
        </article>
      </div>
    `, "overview"),
    progression: () => renderGuideDetailSection("开荒到成型", "升级、过渡、终局和用途专精", renderProgressionPlan(guide.progression), "progression"),
    gear: () => renderGuideDetailSection("全身装备", "每个位置、替换件和精造方向", `
      ${renderLoadoutBoard(guide)}
      ${renderGearSummaryMatrix(guide)}
      ${renderLoadoutStrip(guide)}
      <div class="gear-slot-grid">${guide.gearSlots.map(renderGearSlot).join("")}</div>
    `, "gear"),
    skills: () => renderGuideDetailSection("技能加点", `${guide.skillTree.core} · 按等级段执行`, renderSkillTree(guide.skillTree), "skills"),
    paragon: () => renderGuideDetailSection("巅峰点击顺序", "先雕文孔和传奇节点，再补稀有与魔法节点", renderParagon(guide.paragon), "paragon"),
    gameplay: () => renderGuideDetailSection("打法", "起手、循环、首领、防御和常见错误", renderGameplay(guide.gameplay), "gameplay"),
    variants: () => renderGuideDetailSection("替换与变体", "缺件、冲层和高容错版本", `
      ${renderReplacementMatrix(guide)}
      <div class="variant-grid">
        ${guide.variants.map((variant) => `
          <article>
            <h5>${variant.name}</h5>
            <p>${displayText(variant.useCase)}</p>
            <dl>
              <div><dt>换下</dt><dd>${displayText(variant.swapOut)}</dd></div>
              <div><dt>换上</dt><dd>${displayText(variant.swapIn)}</dd></div>
            </dl>
            <span>${displayText(variant.notes)}</span>
          </article>
        `).join("")}
      </div>
    `, "variants"),
    sources: () => renderGuideDetailSection("来源与状态", `${guide.gameVersion.patch} 构建 #${guide.gameVersion.build}`, `
      <div class="source-status-grid">
        <article><strong>作者</strong><span>${guide.source.authorName}</span></article>
        <article><strong>数据状态</strong><span>${guideSourceLabel(guide)}</span></article>
        <article><strong>更新时间</strong><span>${guide.source.updatedAt}</span></article>
        <article><strong>预测状态</strong><span>${guide.ceiling.evidenceLabel || "待实战样本校准"}</span></article>
        <article><strong>已确认</strong><span>${guide.dataQuality.officialFields.join(" / ")}</span></article>
        <article><strong>社区校验</strong><span>${guide.dataQuality.communityVerified.join(" / ")}</span></article>
        <article><strong>待补全</strong><span>${guide.dataQuality.needsValidation.join(" / ")}</span></article>
        <article><strong>缺失字段</strong><span>${guide.dataQuality.missing.join(" / ")}</span></article>
      </div>
      ${renderSourceReferences(guide)}
      <div class="source-actions">
        <a href="${guide.gameVersion.sourceUrl}" target="_blank" rel="noreferrer">查看官方补丁来源</a>
      </div>
    `, "sources")
  };
  return (sectionRenderers[activeSection] || sectionRenderers.overview)();
}

function renderGuideActiveSection(guide) {
  return `
    <div class="guide-section-page" data-active-guide-section="${state.selectedGuideSection}">
      ${renderGuideSectionByKey(guide)}
    </div>
  `;
}

function renderGuideAllSections(guide) {
  return guideDetailSectionOrder.map((sectionKey) => renderGuideSectionByKey(guide, sectionKey)).join("");
}

function renderBuildGuideDetail() {
  const panel = $("[data-build-guide-detail]");
  if (!panel) return;
  const guide = allBuildGuides().find((item) => item.id === state.selectedGuideId) || allBuildGuides()[0];
  if (!guide) {
    panel.innerHTML = `
      <div class="empty-panel">
        <p class="panel-kicker">BD 未加载</p>
        <h3>没有可展示的构筑档案</h3>
      </div>
    `;
    return;
  }
  state.selectedGuideId = guide.id;

  const navItems = [
    ["overview", "总览"],
    ["progression", "开荒"],
    ["gear", "装备"],
    ["skills", "技能"],
    ["paragon", "巅峰"],
    ["gameplay", "打法"],
    ["variants", "替换"],
    ["sources", "来源"]
  ];

  panel.innerHTML = `
    <div class="guide-detail-shell">
      <header class="guide-hero" data-guide-section="overview">
        <a class="guide-back" href="#builds">返回 BD 大厅</a>
        <div class="guide-hero__main">
          <div>
            <p class="panel-kicker">${guide.taxonomy.seasonName} · ${guide.taxonomy.className} · ${guide.taxonomy.modeName}</p>
            <h2>${guide.taxonomy.archetypeName}</h2>
            <p>${guide.summary.oneLine}</p>
            <div class="guide-card__tags">${renderTags(guide.taxonomy.tags)}</div>
            <div class="source-pill">${guideSourceLabel(guide)} · ${guide.source.trust}</div>
          </div>
          <div class="guide-hero__score">
            <strong>${guide.ceiling.displayTier || guide.ceiling.tier}</strong>
            <span>${guide.ceiling.label}</span>
            <em>${Math.round((guide.ceiling.confidence || 0) * 100)}% 置信度</em>
          </div>
        </div>
        <div class="guide-kpi-grid">
          <span><b>${guide.formationDifficulty.label}</b>成型难度</span>
          <span><b>${guide.taxonomy.stage}</b>适用阶段</span>
          <span><b>${guide.gearSlots.length}</b>装备位置</span>
          <span><b>${guide.coreUniques.length}</b>核心暗金</span>
        </div>
        ${renderBuildDossier(guide)}
      </header>

      <div class="guide-detail-layout">
        <aside class="guide-sidebar">
          <nav class="guide-section-nav" aria-label="BD 分区导航">
            ${navItems.map(([key, label]) => `
              <a href="${guideSectionUrl(guide, key)}" data-guide-jump="${key}" aria-selected="${state.selectedGuideSection === key}"${state.selectedGuideSection === key ? " aria-current=\"page\"" : ""}>${label}</a>
            `).join("")}
          </nav>
          <div class="guide-sidebar-card">
            <strong>资料状态</strong>
            <span>${guideSourceLabel(guide)}</span>
            <p>${guide.ceiling.evidenceLabel || guide.ceiling.label}</p>
          </div>
          <div class="guide-sidebar-card">
            <strong>核心需求</strong>
            <ul>${listItems(guide.summary.requirements?.length ? guide.summary.requirements : ["核心装备待来源回填"])}</ul>
          </div>
        </aside>

        <div class="guide-main-sections">
          ${renderGuideActiveSection(guide)}
        </div>
      </div>
    </div>
  `;
  bindImageFallbacks(panel);
}

function renderClasses() {
  const rail = $("[data-class-rail]");
  rail.innerHTML = state.classes
    .map((item) => `
      <button class="class-button" type="button" data-class-id="${item.id}" aria-selected="${item.id === state.selectedClassId}">
        ${item.zhName}
      </button>
    `)
    .join("");
  renderSelectedClass();
}

const classModeOrder = ["daily", "speed_farm", "pit_push"];
const ignoredAspectDisplayNames = new Set(["暗金特效位", "神话暗金位", "空槽说明", "空槽位"]);

function classSeasonGuides(classId) {
  return allBuildGuides()
    .filter((guide) => guide.taxonomy.seasonId === state.sim.seasonId)
    .filter((guide) => guide.taxonomy.classId === classId)
    .sort((a, b) => {
      const archetypeCompare = a.taxonomy.archetypeName.localeCompare(b.taxonomy.archetypeName, "zh-CN");
      if (archetypeCompare) return archetypeCompare;
      return classModeOrder.indexOf(a.taxonomy.mode) - classModeOrder.indexOf(b.taxonomy.mode);
    });
}

function guideCoreLine(guide) {
  const uniqueNames = (guide.coreUniques || []).map((item) => item.zhName);
  const aspectNames = (guide.coreAspects || [])
    .map((aspect) => aspect.name)
    .filter((name) => !ignoredAspectDisplayNames.has(name));
  const combined = [...uniqueNames, ...aspectNames].slice(0, 4);
  return combined.length ? combined.join(" / ") : "核心件待来源回填";
}

function renderClassSeasonSummary(selected, guides) {
  const communityCount = guides.filter((guide) => guide.source.references?.length).length;
  const archetypeCount = new Set(guides.map((guide) => guide.taxonomy.archetypeId)).size;
  const bestPush = guides
    .filter((guide) => guide.taxonomy.mode === "pit_push")
    .sort(sortGuidesForPlayer)[0];
  const easiest = guides
    .filter((guide) => guide.taxonomy.mode === "daily")
    .sort((a, b) => a.formationDifficulty.level - b.formationDifficulty.level || sortGuidesForPlayer(a, b))[0];
  return `
    <div class="class-season-summary">
      <article><strong>${guides.length}</strong><span>当前赛季 BD</span></article>
      <article><strong>${archetypeCount}</strong><span>流派轴</span></article>
      <article><strong>${communityCount}</strong><span>社区来源</span></article>
      <article><strong>${bestPush ? `${bestPush.taxonomy.archetypeName} · ${bestPush.ceiling.displayTier || bestPush.ceiling.tier}` : "待回填"}</strong><span>冲层上限</span></article>
      <article><strong>${easiest ? `${easiest.taxonomy.archetypeName} · ${easiest.formationDifficulty.label}` : "待回填"}</strong><span>低门槛入口</span></article>
      <article><strong>${selected.primaryResources.map(resourceLabel).join(" / ")}</strong><span>职业资源</span></article>
    </div>
  `;
}

function renderClassBuildMatrix(selected, archetypes, guides) {
  const guidesByArchetype = new Map();
  for (const guide of guides) {
    if (!guidesByArchetype.has(guide.taxonomy.archetypeId)) guidesByArchetype.set(guide.taxonomy.archetypeId, []);
    guidesByArchetype.get(guide.taxonomy.archetypeId).push(guide);
  }
  return `
    <section class="class-build-panel">
      <div class="section-title">
        <h4>${selected.zhName}完整流派矩阵</h4>
        <span>${state.simulations.seasons.find((season) => season.id === state.sim.seasonId)?.zhLabel || "当前赛季"}</span>
      </div>
      ${renderClassSeasonSummary(selected, guides)}
      <div class="class-build-family-list">
        ${archetypes.map((archetype) => {
          const archetypeGuides = guidesByArchetype.get(archetype.id) || [];
          return `
            <article class="class-build-family">
              <header>
                <div>
                  <strong>${archetypeGuides[0]?.taxonomy.archetypeName || archetype.zhName}</strong>
                  <span>${archetype.primaryStats.map(statLabel).join(" / ")}</span>
                </div>
                <em>${archetypeGuides.filter((guide) => guide.source.references?.length).length} 社区参考</em>
              </header>
              <div class="class-build-mode-grid">
                ${classModeOrder.map((mode) => {
                  const guide = archetypeGuides.find((item) => item.taxonomy.mode === mode);
                  if (!guide) {
                    return `
                      <div class="class-mode-card is-empty">
                        <span>${modeName(mode)}</span>
                        <strong>待回填</strong>
                        <em>暂无结构化 BD</em>
                      </div>
                    `;
                  }
                  return `
                    <a class="class-mode-card" href="${guideUrl(guide)}">
                      <span>${guide.taxonomy.modeName}</span>
                      <strong>${guide.formationDifficulty.label} · ${guide.taxonomy.stage}</strong>
                      <em>${guide.ceiling.label}</em>
                      <p>${guideSourceLabel(guide)}</p>
                      <small>${guideCoreLine(guide)}</small>
                    </a>
                  `;
                }).join("")}
              </div>
            </article>
          `;
        }).join("")}
      </div>
    </section>
  `;
}

function renderSelectedClass() {
  const selected = state.classes.find((item) => item.id === state.selectedClassId) ?? state.classes[0];
  const plan = state.plans.find((item) => item.classId === selected.id);
  const archetypes = state.archetypes.find((item) => item.classId === selected.id)?.archetypes ?? [];
  const classGuides = classSeasonGuides(selected.id);
  const modeShortcuts = Object.keys(modeLabels)
    .map((mode) => ({ mode, guide: bestGuideForClassMode(selected.id, mode) }));
  const communityGuides = allBuildGuides()
    .filter((guide) => guide.taxonomy.seasonId === state.sim.seasonId)
    .filter((guide) => guide.taxonomy.classId === selected.id)
    .filter((guide) => guide.source.verificationLevel === "community_reference" || guide.source.verificationLevel === "cross_season_reference")
    .sort(sortGuidesForPlayer)
    .slice(0, 4);

  document.querySelectorAll("[data-class-id]").forEach((button) => {
    button.setAttribute("aria-selected", String(button.dataset.classId === selected.id));
  });
  const classSeason = $("[data-class-season]");
  if (classSeason) classSeason.value = state.sim.seasonId;
  $("[data-class-resource]").textContent = selected.primaryResources.map(resourceLabel).join(" / ");
  $("[data-class-title]").textContent = selected.zhName;
  $("[data-class-plan]").innerHTML = (plan?.plan ?? [])
    .map((line) => `<li>${line}</li>`)
    .join("");
  $("[data-archetypes]").innerHTML = archetypes
    .map((item) => `
      <article class="archetype">
        <strong>${item.zhName}</strong>
        <span>${item.primaryStats.map(statLabel).join(" / ")}</span>
      </article>
    `)
    .join("");
  $("[data-class-builds]").innerHTML = `
      <section class="class-build-panel">
        <div class="section-title">
          <h4>${selected.zhName} BD 入口</h4>
          <span>${state.simulations.seasons.find((season) => season.id === state.sim.seasonId)?.zhLabel || "当前赛季"}</span>
        </div>
        <div class="class-build-actions">
          ${modeShortcuts.map(({ mode, guide }) => `
            <a class="class-build-chip" href="#builds" data-build-filter-class="${selected.id}" data-build-filter-mode="${mode}" data-build-filter-source="all">
              <span>${modeName(mode)}</span>
              <strong>${guide?.taxonomy.archetypeName || "待回填"}</strong>
              <em>${guide ? guideSourceLabel(guide) : "暂无可用 BD"}</em>
            </a>
          `).join("")}
        </div>
        ${renderGuideMiniLinks(communityGuides, "该职业还没有同赛季或跨赛季社区 BD，后续导入后会显示在这里。")}
      </section>
      ${renderClassBuildMatrix(selected, archetypes, classGuides)}
    `;
}

function filteredEquipmentRows() {
  const { classId, mode, slot, status, related, query } = state.equipmentFilters;
  const normalizedQuery = query.trim().toLowerCase();
  return state.equipment
    .filter((item) => classId === "all" || item.classRestriction === "All Classes" || item.classRestriction.toLowerCase() === classId)
    .filter((item) => mode === "all" || item.modeFit.includes(mode))
    .filter((item) => slot === "all" || item.slotCandidates?.includes(slot))
    .filter((item) => status === "all" || Object.values(item.dataStatus || {}).includes(status))
    .filter((item) => {
      if (related === "all") return true;
      const count = relatedGuideCount(item);
      return related === "used" ? count > 0 : count === 0;
    })
    .filter((item) => {
      if (!normalizedQuery) return true;
      return [
        item.name,
        item.zhName,
        item.classRestriction,
        item.zhClassRestriction,
        item.visualType,
        item.zhVisualType,
        item.primarySlot,
        item.zhPrimarySlot,
        item.zhCommunityEquipType,
        item.communityBaseText,
        item.zhUniquePower,
        item.dropSource?.zhText,
        (item.zhFullAffixRanges || []).join(" "),
        (item.slotCandidates || []).join(" "),
        (item.zhSlotCandidates || []).join(" "),
        item.buildRole,
        item.zhBuildRole,
        item.categories.join(" "),
        item.guaranteedAffixes.map(normalizeAffixName).join(" "),
        (item.zhGuaranteedAffixes ?? []).join(" ")
      ].join(" ").toLowerCase().includes(normalizedQuery);
    })
    .sort(sortEquipmentForPlayer);
}

function renderEquipment() {
  const filtered = filteredEquipmentRows();
  const rows = filtered.slice(0, state.equipmentFilters.visible);
  if (!filtered.some((item) => item.id === state.selectedEquipmentId)) {
    state.selectedEquipmentId = rows.find((item) => relatedGuideCount(item) > 0)?.id ?? rows[0]?.id ?? null;
  }
  const selected = state.equipment.find((item) => item.id === state.selectedEquipmentId) ?? rows[0];

  $("[data-equipment-meta]").textContent =
    `显示 ${rows.length} / ${filtered.length} 条，资料库总计 ${state.equipment.length} 条。列表优先显示已进入 BD 的装备，点击后查看验证部位、暗金特效、掉落来源、词缀和相关 BD。`;
  $("[data-equipment-results]").innerHTML = rows
    .map((item) => {
      const relatedCount = relatedGuideCount(item);
      return `
      <button class="equipment-row" type="button" data-equipment-id="${item.id}" aria-selected="${item.id === selected?.id}">
        ${renderIcon(item, `${itemName(item)}图标`)}
        <span>
          <small>${equipmentClassLabel(item)} · ${equipmentTypeLabel(item)}</small>
          <strong>${itemName(item)}</strong>
          <em>${item.zhBuildRole || item.buildRole} · ${(item.zhModeFit || item.modeFit).join(" / ")} · ${relatedCount} 套 BD</em>
        </span>
        <b>${relatedCount ? "关联" : "查看"}</b>
      </button>
    `;
    })
    .join("");
  const moreButton = $("[data-equipment-more]");
  moreButton.hidden = rows.length >= filtered.length;
  renderEquipmentDetail(selected);
  bindImageFallbacks($("[data-equipment-results]"));
}

function renderEquipmentDetail(item) {
  const panel = $("[data-equipment-detail]");
  if (!item) {
    panel.innerHTML = `
      <div class="empty-panel">
        <p class="panel-kicker">没有匹配装备</p>
        <h3>调整筛选条件</h3>
        <p>当前职业、用途或搜索词没有命中装备。</p>
      </div>
    `;
    return;
  }

  const affixes = item.guaranteedAffixes
    .map((affix, index) => {
      const label = itemAffixes(item)[index] || normalizeAffixName(affix);
      const slots = Array.isArray(affix.slots) ? affix.slots.join(" / ") : "待回填";
      return `
        <li>
          <strong>${label}</strong>
          <span>槽位 ${slots} · ${statLabel(affix.categoryId || "uncategorized")}</span>
        </li>
      `;
    })
    .join("");
  const rangeAffixes = (item.zhFullAffixRanges || item.fullAffixRanges || [])
    .map((line) => `<li><strong>${displayText(line)}</strong><span>${statusLabel(item.dataStatus?.fullAffixRanges)}</span></li>`)
    .join("");
  const statuses = Object.entries(item.dataStatus || {})
    .map(([key, value]) => `
      <div class="status-row">
        <span>${dataStatusFieldLabels[key] || key}</span>
        <strong>${statusLabel(value)}</strong>
      </div>
    `)
    .join("");
  const relatedGuides = relatedGuidesForItem(item);
  const versionInfo = item.gameVersion || item.source?.gameVersion;
  const platformText = versionInfo?.platforms === "All Platforms" ? "全平台" : (versionInfo?.platforms || "全平台");
  const versionText = versionInfo?.patch
    ? `${versionInfo.patch} 构建 #${versionInfo.build}（${platformText}）— ${versionInfo.releaseDate || "日期待回填"}`
    : versionLineLabel(item.source.versionLine);
  const communitySource = item.communitySource;
  const sourceName = communitySource?.sourceId ? (sourceLabels[communitySource.sourceId] || communitySource.sourceId) : "社区来源待回填";

  panel.innerHTML = `
    <div class="equipment-detail-hero">
      ${renderIcon(item, `${itemName(item)}图标`)}
      <div>
        <p class="panel-kicker">${equipmentClassLabel(item)} · ${equipmentTypeLabel(item)}</p>
        <h3>${itemName(item)}</h3>
        <p>${item.isMythic ? "神话暗金" : "暗金"} · ${item.zhCommunityEquipType || item.zhPrimarySlot || item.zhBuildRole || item.buildRole}</p>
      </div>
    </div>
    <div class="tag-row">${(item.zhModeFit || item.modeFit).map((fit) => `<span>${fit}</span>`).join("")}</div>
    <section class="detail-section">
      <div class="section-title">
        <h4>装备位置与用途</h4>
        <span>${statusLabel(item.dataStatus?.slot)}</span>
      </div>
      <div class="equipment-info-grid">
        <article><strong>验证部位</strong><span>${equipmentTypeLabel(item)}</span></article>
        <article><strong>装备类型</strong><span>${item.zhCommunityEquipType || item.zhVisualType || "待回填"}</span></article>
        <article><strong>职业限制</strong><span>${equipmentClassLabel(item)}</span></article>
        <article><strong>构筑用途</strong><span>${item.zhBuildRole || item.buildRole}</span></article>
        <article><strong>适用场景</strong><span>${(item.zhModeFit || item.modeFit).join(" / ")}</span></article>
        <article><strong>基础数值</strong><span>${item.communityBaseText || "待来源回填"}</span></article>
      </div>
    </section>
    <section class="detail-section">
      <div class="section-title">
        <h4>暗金特效与掉落</h4>
        <span>${sourceName}</span>
      </div>
      <div class="unique-power-panel">
        <article>
          <strong>特效</strong>
          <p>${displayText(item.zhUniquePower || "暗金特效待来源回填")}</p>
        </article>
        <article>
          <strong>掉落</strong>
          <p>${displayText(item.dropSource?.zhText || "掉落来源待来源回填")}</p>
        </article>
      </div>
    </section>
    <section class="detail-section">
      <div class="section-title">
        <h4>完整范围词缀</h4>
        <span>${statusLabel(item.dataStatus?.fullAffixRanges)}</span>
      </div>
      ${rangeAffixes
        ? `<ul class="affix-list affix-list--ranges">${rangeAffixes}</ul>`
        : `<p class="missing-data-note">当前来源未提供完整范围词缀；下方仍保留官方 3.1.0 补丁中的固定词缀种子。</p>`}
    </section>
    <section class="detail-section">
      <div class="section-title">
        <h4>官方固定词缀</h4>
        <span>${item.guaranteedAffixes.length} 条</span>
      </div>
      <ul class="affix-list">${affixes}</ul>
    </section>
    <section class="detail-section">
      <div class="section-title">
        <h4>数据状态</h4>
        <span>资料完整度</span>
      </div>
      <div class="status-grid">${statuses}</div>
    </section>
    <section class="detail-section">
      <div class="section-title">
        <h4>BD 使用矩阵</h4>
        <span>${relatedGuideCount(item)} 套</span>
      </div>
      ${renderEquipmentUsageMatrix(item)}
    </section>
    <section class="detail-section">
      <div class="section-title">
        <h4>相关 BD 快捷入口</h4>
        <span>${relatedGuides.length} 套优先展示</span>
      </div>
      ${renderGuideMiniLinks(relatedGuides, "当前装备还没有进入已结构化 BD；后续资料回填后会自动关联。")}
    </section>
    <section class="detail-section">
      <div class="section-title">
        <h4>来源</h4>
        <span>${sourceName}</span>
      </div>
      <p>官方固定词缀：${versionText}</p>
      ${communitySource ? `<p>暗金特效、掉落和验证部位：${sourceName} · 数据版本 ${communitySource.d2coreBuild || "待回填"}</p>` : ""}
      <div class="source-actions">
        <a href="${itemUrl(item)}">打开独立装备页</a>
        <a href="${item.source.url}" target="_blank" rel="noreferrer">查看补丁来源</a>
        ${communitySource?.pageUrl ? `<a href="${communitySource.pageUrl}" target="_blank" rel="noreferrer">查看装备来源</a>` : ""}
        ${item.externalImage ? `<a href="${item.externalImage}" target="_blank" rel="noreferrer">查看图标来源</a>` : ""}
      </div>
    </section>
  `;
  bindImageFallbacks(panel);
}

function sourceLevelText(level) {
  return verificationLevelLabels[level] || level;
}

function aspectSourceLabel(aspect) {
  const levels = aspect.sourceLevels || {};
  if (levels.community_reference) return "同赛季社区参考";
  if (levels.cross_season_reference) return "跨赛季社区参考";
  if (levels.official_seed_template) return "官方词缀模板";
  return "推演模板";
}

function aspectSearchText(aspect) {
  return [
    aspect.name,
    aspect.canonicalName,
    aspect.database?.zhEffect,
    aspect.database?.zhAspectType,
    ...(aspect.database?.zhAllowedSlots || []),
    ...(aspect.zhClasses || []),
    ...(aspect.zhModes || []),
    ...(aspect.zhSeasons || []),
    ...(aspect.slotUsage || []).map((slot) => slot.zhSlotName).join(" "),
    ...(aspect.sourceStatusSamples || []),
    ...(aspect.buildUses || []).map((use) => `${use.guideTitle} ${use.className} ${use.archetypeName} ${use.modeName} ${use.zhSlotName} ${use.role}`).join(" ")
  ].join(" ").toLowerCase();
}

function aspectMatchesSource(aspect, source) {
  if (source === "all") return true;
  const levels = aspect.sourceLevels || {};
  if (source === "community") return Boolean(levels.community_reference || levels.cross_season_reference);
  if (source === "template") return Boolean(levels.official_seed_template || levels.projection_template);
  return Boolean(levels[source]);
}

function filteredAspectRows() {
  const { classId, mode, slot, source, query } = state.aspectFilters;
  const normalizedQuery = query.trim().toLowerCase();
  return state.aspects
    .filter((aspect) => classId === "all" || aspect.classIds?.includes(classId))
    .filter((aspect) => mode === "all" || aspect.modes?.includes(mode))
    .filter((aspect) => slot === "all" || aspect.slotUsage?.some((item) => item.slotId === slot))
    .filter((aspect) => aspectMatchesSource(aspect, source))
    .filter((aspect) => !normalizedQuery || aspectSearchText(aspect).includes(normalizedQuery))
    .sort((a, b) => {
      const sourceRank = (aspect) => aspect.sourceLevels?.community_reference ? 0 : aspect.sourceLevels?.cross_season_reference ? 1 : 2;
      return sourceRank(a) - sourceRank(b)
        || b.guideCount - a.guideCount
        || b.usageCount - a.usageCount
        || a.name.localeCompare(b.name, "zh-CN");
    });
}

function renderAspects() {
  const filtered = filteredAspectRows();
  const rows = filtered.slice(0, state.aspectFilters.visible);
  if (!filtered.some((aspect) => aspect.id === state.selectedAspectId)) {
    state.selectedAspectId = rows[0]?.id || null;
  }
  const selected = state.aspects.find((aspect) => aspect.id === state.selectedAspectId) ?? rows[0];

  $("[data-aspect-meta]").textContent =
    `显示 ${rows.length} / ${filtered.length} 条，索引总计 ${state.aspects.length} 条。已匹配的条目会显示威能效果、类型和可用部位；未匹配条目继续标注为 BD 派生。`;
  $("[data-aspect-results]").innerHTML = rows
    .map((aspect) => {
      const topSlots = (aspect.slotUsage || []).slice(0, 3).map((slot) => `${slot.zhSlotName} ${slot.count}`).join(" / ");
      const aspectName = aspect.canonicalName || aspect.name;
      const sourceTag = aspect.database ? `${aspect.database.zhAspectType} · 暗黑核` : aspectSourceLabel(aspect);
      return `
        <button class="aspect-row" type="button" data-aspect-id="${aspect.id}" aria-selected="${aspect.id === selected?.id}">
          <span>
            <small>${sourceTag} · ${topSlots || "部位待回填"}</small>
            <strong>${aspectName}</strong>
            <em>${aspect.guideCount} 套 BD · ${aspect.usageCount} 次使用 · ${(aspect.zhClasses || []).slice(0, 4).join(" / ")}</em>
          </span>
          <b>${aspect.guideCount}</b>
        </button>
      `;
    })
    .join("");
  const moreButton = $("[data-aspect-more]");
  moreButton.hidden = rows.length >= filtered.length;
  renderAspectDetail(selected);
}

function renderAspectDetail(aspect) {
  const panel = $("[data-aspect-detail]");
  if (!aspect) {
    panel.innerHTML = `
      <div class="empty-panel">
        <p class="panel-kicker">没有匹配威能</p>
        <h3>调整筛选条件</h3>
        <p>当前职业、用途、部位或关键词没有命中威能。</p>
      </div>
    `;
    return;
  }

  const levelRows = Object.entries(aspect.sourceLevels || {})
    .map(([level, count]) => `<span>${sourceLevelText(level)} ${count}</span>`)
    .join("");
  const database = aspect.database;
  const aspectName = aspect.canonicalName || aspect.name;
  const slotRows = (aspect.slotUsage || []).map((slot) => `
    <article>
      <strong>${slot.zhSlotName}</strong>
      <span>${slot.count} 次使用</span>
      <p>${slot.coreCount} 次核心位，${slot.requiredCount} 次硬需求，${slot.replaceableCount} 次可替换。</p>
    </article>
  `).join("");
  const uses = (aspect.buildUses || []).slice(0, 20).map((use) => `
    <a class="aspect-use-link" href="${guideUrl({ id: use.guideId })}">
      <span>${use.seasonName} · ${use.className} · ${use.modeName}</span>
      <strong>${use.archetypeName}</strong>
      <em>${use.zhSlotName} · ${use.required ? "硬需求" : use.replaceable ? "可替换" : "核心位"} · ${use.role}</em>
    </a>
  `).join("");

  panel.innerHTML = `
    <div class="aspect-detail-hero">
      ${database?.iconUrl ? `<img src="${database.iconUrl}" alt="${aspectName}图标">` : `<span class="aspect-detail-icon-fallback">威</span>`}
      <div>
        <p class="panel-kicker">${database ? `${database.zhAspectType} · ${sourceLabels[database.sourceId] || database.sourceId}` : `${aspectSourceLabel(aspect)} · ${aspect.zhModes.join(" / ")}`}</p>
        <h3>${aspectName}</h3>
        ${aspectName !== aspect.name ? `<p class="aspect-alias">本站槽位名：${aspect.name}</p>` : ""}
        <p>${aspect.dataStatus?.zhText || "从 BD 装备槽位汇总。"}</p>
      </div>
      <div class="aspect-score">
        <strong>${aspect.guideCount}</strong>
        <span>关联 BD</span>
      </div>
    </div>
    <div class="tag-row">${levelRows}</div>
    <section class="detail-section">
      <div class="section-title">
        <h4>威能效果</h4>
        <span>${database ? "社区数据库参考" : "待可审计来源"}</span>
      </div>
      ${database ? `
        <div class="aspect-effect-panel">
          <article>
            <strong>效果</strong>
            <p>${displayText(database.zhEffect)}</p>
          </article>
          <article>
            <strong>可用部位</strong>
            <p>${(database.zhAllowedSlots || []).join(" / ") || "来源未列出"}</p>
          </article>
        </div>
      ` : `<p class="missing-data-note">该威能名称来自 BD 槽位汇总，尚未可靠匹配到完整威能数据库；暂不展示具体效果，避免误配。</p>`}
    </section>
    <section class="detail-section">
      <div class="section-title">
        <h4>常见部位</h4>
        <span>${aspect.usageCount} 次使用</span>
      </div>
      <div class="aspect-slot-grid">${slotRows}</div>
    </section>
    <section class="detail-section">
      <div class="section-title">
        <h4>适用职业与用途</h4>
        <span>${aspect.zhSeasons.join(" / ")}</span>
      </div>
      <div class="equipment-info-grid">
        <article><strong>职业</strong><span>${aspect.zhClasses.join(" / ")}</span></article>
        <article><strong>用途</strong><span>${aspect.zhModes.join(" / ")}</span></article>
        <article><strong>威能类型</strong><span>${database?.zhAspectType || "待来源回填"}</span></article>
        <article><strong>数据范围</strong><span>${aspect.dataStatus?.zhText || "从 BD 汇总"}</span></article>
        <article><strong>来源样本</strong><span>${database ? (sourceLabels[database.sourceId] || database.sourceId) : ((aspect.sourceStatusSamples || []).slice(0, 3).join(" / ") || "待回填")}</span></article>
      </div>
    </section>
    <section class="detail-section">
      <div class="section-title">
        <h4>相关 BD</h4>
        <span>最多显示 20 条</span>
      </div>
      <div class="aspect-use-list">${uses}</div>
    </section>
    <section class="detail-section">
      <div class="section-title">
        <h4>数据边界</h4>
        <span>${database ? "已匹配效果" : "不是全量威能库"}</span>
      </div>
      <p>${aspect.dataStatus?.zhText || "该条目由结构化 BD 汇总。"} ${database ? "该效果仍按社区来源展示，后续应以游戏内截图或官方资料继续校验。" : "后续需要接入官方或可审计的完整传奇威能数据库后，才能展示完整效果、数值范围和掉落位置。"}</p>
      ${database?.pageUrl ? `<div class="source-actions"><a href="${database.pageUrl}" target="_blank" rel="noreferrer">查看威能来源</a></div>` : ""}
    </section>
  `;
}

function renderForecast() {
  const season = state.simulations.seasons.find((item) => item.id === state.sim.seasonId) ?? state.simulations.seasons[0];
  const rows = state.simulations.rows
    .filter((item) => item.seasonId === season.id)
    .map((item) => {
      const push = item.modes.pit_push.topBuilds[0];
      const speed = item.modes.speed_farm.topBuilds[0];
      const daily = item.modes.daily.topBuilds[0];
      return { item, push, speed, daily };
    })
    .sort((a, b) => a.push.predictedPit150Minutes - b.push.predictedPit150Minutes);

  $("[data-forecast-board]").innerHTML = `
    <div class="forecast-header">
      <h3>${season.zhLabel || season.label}</h3>
      <p>${season.zhAssumption || season.assumption}</p>
    </div>
    <div class="forecast-table">
      <div class="forecast-row forecast-row-head">
        <span>职业</span><span>冲层</span><span>速刷</span><span>日常</span><span>150层参考</span>
      </div>
      ${rows.map(({ item, push, speed, daily }) => `
        <div class="forecast-row">
          <strong>${item.zhName}</strong>
          <span>${push.archetypeName}</span>
          <span>${speed.archetypeName}</span>
          <span>${daily.archetypeName}</span>
          <em>${push.predictedPit150Minutes} 分参考</em>
        </div>
      `).join("")}
    </div>
  `;
}

function renderSources(sources) {
  renderCoverage();
  $("[data-source-list]").innerHTML = sources.slice(0, 8)
    .map((source) => `
      <div class="source-row">
        <span>${sourceCategoryLabels[source.category] || source.category}</span>
        <a href="${source.url}" target="_blank" rel="noreferrer">${sourceLabels[source.id] || source.name}</a>
        <em>${trustLabels[source.trustLevel] || source.trustLevel}</em>
      </div>
    `)
    .join("");
}

function renderCoverage() {
  const panel = $("[data-source-coverage]");
  const coverage = state.coverage;
  if (!panel || !coverage) return;
  const buildCoverage = coverage.buildCoverage;
  const equipmentCoverage = coverage.equipmentCoverage;
  const aspectCoverage = coverage.aspectCoverage;
  const sourceCoverage = coverage.sourceCoverage;
  const sourceLevels = buildCoverage.byVerificationLevel || {};
  const buildIntegrity = coverage.buildIntegrity || {};
  const routeSpecificity = buildIntegrity.routeSpecificity || {};
  const frontendContracts = coverage.frontendDataContracts || [];
  panel.innerHTML = `
    <section class="coverage-panel">
      <div class="section-title">
        <h4>数据覆盖与使用方式</h4>
        <span>${coverage.asOf || "日期待回填"}</span>
      </div>
      <div class="coverage-grid">
        <article>
          <strong>${buildCoverage.total}</strong>
          <span>BD 档案</span>
          <p>${buildCoverage.communityReferenceCount} 套社区参考，${buildCoverage.templateCount} 套模板或推演。</p>
        </article>
        <article>
          <strong>${equipmentCoverage.total}</strong>
          <span>装备种子</span>
          <p>固定词缀已接入；暗金特效、完整范围、掉落来源和官方槽位仍待回填。</p>
        </article>
        <article>
          <strong>${aspectCoverage.total}</strong>
          <span>威能索引</span>
          <p>${aspectCoverage.usageCount} 次 BD 槽位使用记录；该索引不是官方全量威能库。</p>
        </article>
        <article>
          <strong>${sourceCoverage.total}</strong>
          <span>登记来源</span>
          <p>${sourceCoverage.byTrustLevel.official || 0} 个官方来源，${sourceCoverage.byTrustLevel.community_verified || 0} 个社区验证来源。</p>
        </article>
        <article>
          <strong>${sourceLevels.community_reference || 0}</strong>
          <span>同赛季社区 BD</span>
          <p>${sourceLevels.cross_season_reference || 0} 套跨赛季参考必须继续等实战校准。</p>
        </article>
        <article>
          <strong>${buildIntegrity.completeGearSlotBuilds || 0}</strong>
          <span>完整 11 槽 BD</span>
          <p>开荒 ${buildIntegrity.progressionBuilds || 0} 套、技能 ${buildIntegrity.skillRouteBuilds || 0} 套、巅峰 ${buildIntegrity.paragonRouteBuilds || 0} 套、打法 ${buildIntegrity.gameplayBuilds || 0} 套通过结构校验。</p>
        </article>
        <article>
          <strong>${(routeSpecificity.genericSkillSteps || 0) + (routeSpecificity.genericSkillBarEntries || 0) + (routeSpecificity.genericParagonNodes || 0)}</strong>
          <span>路线占位项</span>
          <p>技能栏 ${routeSpecificity.genericSkillBarEntries || 0}、加点 ${routeSpecificity.genericSkillSteps || 0}、巅峰点击 ${routeSpecificity.genericParagonNodes || 0} 个泛化占位。</p>
        </article>
      </div>
      <div class="storage-layer-grid">
        ${coverage.storageLayers.map((layer) => `
          <article>
            <strong>${layer.zhName}</strong>
            <span>${layer.files.join(" / ")}</span>
            <p>${layer.frontendUse}</p>
          </article>
        `).join("")}
      </div>
      <div class="data-contract-grid">
        ${frontendContracts.map((contract) => `
          <article>
            <strong>${contract.zhName}</strong>
            <span>${contract.source}</span>
            <p>${contract.frontendUse}</p>
            <em>${(contract.fields || []).join(" / ")}</em>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function bindInteractions() {
  const form = $("[data-damage-form]");
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    renderDamage();
  });
  form.addEventListener("input", renderDamage);

  $("[data-sim-season]").addEventListener("change", (event) => {
    state.sim.seasonId = event.target.value;
    state.sim.buildIndex = 0;
    state.sim.visible = 18;
    renderSimulator();
    renderForecast();
    renderSelectedClass();
  });
  $("[data-class-season]").addEventListener("change", (event) => {
    state.sim.seasonId = event.target.value;
    state.sim.buildIndex = 0;
    state.sim.visible = 18;
    syncBuildFilterControls();
    renderSimulator();
    renderForecast();
    renderSelectedClass();
  });
  $("[data-sim-class]").addEventListener("change", (event) => {
    state.sim.classId = event.target.value;
    if (event.target.value !== "all") state.selectedClassId = event.target.value;
    state.sim.buildIndex = 0;
    state.sim.visible = 18;
    renderSimulator();
    if (event.target.value !== "all") renderSelectedClass();
  });
  $("[data-sim-mode]").addEventListener("change", (event) => {
    state.sim.mode = event.target.value;
    state.sim.buildIndex = 0;
    state.sim.visible = 18;
    renderSimulator();
  });
  $("[data-sim-source]").addEventListener("change", (event) => {
    state.sim.sourceQuality = event.target.value;
    state.sim.buildIndex = 0;
    state.sim.visible = 18;
    renderSimulator();
  });
  $("[data-build-source-rail]").addEventListener("click", (event) => {
    const button = event.target.closest("[data-build-source-quality]");
    if (!button || button.disabled) return;
    state.sim.sourceQuality = button.dataset.buildSourceQuality;
    state.sim.buildIndex = 0;
    state.sim.visible = 18;
    syncBuildFilterControls();
    renderSimulator();
  });
  $("[data-build-sort]").addEventListener("change", (event) => {
    state.sim.sort = event.target.value;
    state.sim.buildIndex = 0;
    state.sim.visible = 18;
    renderSimulator();
  });
  $("[data-build-search]").addEventListener("input", (event) => {
    state.sim.query = event.target.value;
    state.sim.buildIndex = 0;
    state.sim.visible = 18;
    renderSimulator();
  });
  $("[data-build-class-rail]").addEventListener("click", (event) => {
    const button = event.target.closest("[data-build-class-id]");
    if (!button) return;
    state.sim.classId = button.dataset.buildClassId;
    if (button.dataset.buildClassId !== "all") state.selectedClassId = button.dataset.buildClassId;
    state.sim.buildIndex = 0;
    state.sim.visible = 18;
    syncBuildFilterControls();
    renderSimulator();
    if (button.dataset.buildClassId !== "all") renderSelectedClass();
  });
  $("[data-class-rail]").addEventListener("click", (event) => {
    const button = event.target.closest("[data-class-id]");
    if (!button) return;
    state.selectedClassId = button.dataset.classId;
    renderSelectedClass();
  });

  $("[data-equipment-search]").addEventListener("input", (event) => {
    state.equipmentFilters.query = event.target.value;
    state.equipmentFilters.visible = 24;
    state.selectedEquipmentId = null;
    renderEquipment();
  });
  $("[data-equipment-class]").addEventListener("change", (event) => {
    state.equipmentFilters.classId = event.target.value;
    state.equipmentFilters.visible = 24;
    state.selectedEquipmentId = null;
    renderEquipment();
  });
  $("[data-equipment-mode]").addEventListener("change", (event) => {
    state.equipmentFilters.mode = event.target.value;
    state.equipmentFilters.visible = 24;
    state.selectedEquipmentId = null;
    renderEquipment();
  });
  $("[data-equipment-slot]").addEventListener("change", (event) => {
    state.equipmentFilters.slot = event.target.value;
    state.equipmentFilters.visible = 24;
    state.selectedEquipmentId = null;
    renderEquipment();
  });
  $("[data-equipment-status]").addEventListener("change", (event) => {
    state.equipmentFilters.status = event.target.value;
    state.equipmentFilters.visible = 24;
    state.selectedEquipmentId = null;
    renderEquipment();
  });
  $("[data-equipment-related]").addEventListener("change", (event) => {
    state.equipmentFilters.related = event.target.value;
    state.equipmentFilters.visible = 24;
    state.selectedEquipmentId = null;
    renderEquipment();
  });
  $("[data-equipment-results]").addEventListener("click", (event) => {
    const button = event.target.closest("[data-equipment-id]");
    if (!button) return;
    state.selectedEquipmentId = button.dataset.equipmentId;
    const hash = itemUrl(state.selectedEquipmentId);
    if (window.location.hash === hash) {
      renderEquipment();
    } else {
      window.location.hash = hash;
    }
    $("[data-equipment-detail]")?.scrollTo(0, 0);
  });
  $("[data-equipment-more]").addEventListener("click", () => {
    state.equipmentFilters.visible += 24;
    renderEquipment();
  });
  $("[data-aspect-search]").addEventListener("input", (event) => {
    state.aspectFilters.query = event.target.value;
    state.aspectFilters.visible = 32;
    state.selectedAspectId = null;
    renderAspects();
  });
  $("[data-aspect-class]").addEventListener("change", (event) => {
    state.aspectFilters.classId = event.target.value;
    state.aspectFilters.visible = 32;
    state.selectedAspectId = null;
    renderAspects();
  });
  $("[data-aspect-mode]").addEventListener("change", (event) => {
    state.aspectFilters.mode = event.target.value;
    state.aspectFilters.visible = 32;
    state.selectedAspectId = null;
    renderAspects();
  });
  $("[data-aspect-slot]").addEventListener("change", (event) => {
    state.aspectFilters.slot = event.target.value;
    state.aspectFilters.visible = 32;
    state.selectedAspectId = null;
    renderAspects();
  });
  $("[data-aspect-source]").addEventListener("change", (event) => {
    state.aspectFilters.source = event.target.value;
    state.aspectFilters.visible = 32;
    state.selectedAspectId = null;
    renderAspects();
  });
  $("[data-aspect-results]").addEventListener("click", (event) => {
    const button = event.target.closest("[data-aspect-id]");
    if (!button) return;
    state.selectedAspectId = button.dataset.aspectId;
    const hash = aspectUrl(state.selectedAspectId);
    if (window.location.hash === hash) {
      renderAspects();
    } else {
      window.location.hash = hash;
    }
    $("[data-aspect-detail]")?.scrollTo(0, 0);
  });
  $("[data-aspect-more]").addEventListener("click", () => {
    state.aspectFilters.visible += 32;
    renderAspects();
  });

  document.addEventListener("click", (event) => {
    const viewButton = event.target.closest("[data-build-view]");
    if (viewButton) {
      state.sim.view = viewButton.dataset.buildView;
      state.sim.visible = 18;
      renderSimulator();
      return;
    }

    const buildMoreButton = event.target.closest("[data-build-more]");
    if (buildMoreButton) {
      state.sim.visible += 18;
      renderSimulator();
      return;
    }

    const filterLink = event.target.closest("[data-build-filter-class]");
    if (filterLink) {
      event.preventDefault();
      openBuildLibrary({
        classId: filterLink.dataset.buildFilterClass,
        mode: filterLink.dataset.buildFilterMode,
        sourceQuality: filterLink.dataset.buildFilterSource || "all"
      });
      return;
    }

    const button = event.target.closest("[data-guide-jump]");
    if (!button) return;
    if (button.matches("a[href]")) {
      if (button.dataset.gearSlotTarget) {
        state.pendingGuideSlotTarget = button.dataset.gearSlotTarget;
      }
      return;
    }
    state.selectedGuideSection = button.dataset.guideJump || "overview";
    $$(".guide-section-nav [data-guide-jump]").forEach((navButton) => {
      navButton.setAttribute("aria-selected", String(navButton.dataset.guideJump === state.selectedGuideSection));
    });
    if (state.activeView === "bd" && state.selectedGuideId) {
      history.replaceState(null, "", `#bd/${encodeURIComponent(state.selectedGuideId)}/${encodeURIComponent(state.selectedGuideSection)}`);
      renderBuildGuideDetail();
    }
    if (button.dataset.gearSlotTarget) {
      state.pendingGuideSlotTarget = button.dataset.gearSlotTarget;
      requestAnimationFrame(() => {
        const target = $(`[data-gear-slot-card="${button.dataset.gearSlotTarget}"]`);
        scrollToGuideTarget(target);
      });
      return;
    }
    requestAnimationFrame(() => {
      const section = $(`[data-guide-section="${state.selectedGuideSection}"]`);
      scrollToGuideTarget(section);
    });
  });
}

async function init() {
  const [version, classes, plans, archetypes, uniques, equipment, simulations, buildGuides, aspectIndex, coverage, sources] = await Promise.all([
    loadJson(paths.version),
    loadJson(paths.classes),
    loadJson(paths.plans),
    loadJson(paths.archetypes),
    loadJson(paths.uniques),
    loadJson(paths.equipment),
    loadJson(paths.simulations),
    loadJson(paths.buildGuides),
    loadJson(paths.aspectIndex),
    loadJson(paths.coverage),
    loadJson(paths.sources)
  ]);

  state.classes = classes;
  state.plans = plans;
  state.archetypes = archetypes;
  state.equipment = equipment.items;
  state.aspects = aspectIndex.aspects;
  state.simulations = simulations;
  state.buildGuides = buildGuides;
  state.coverage = coverage;

  $("[data-live-patch]").textContent = `${version.effectiveLiveVersion.patch} 当前`;
  $("[data-version-line]").textContent = `${version.effectiveLiveVersion.patch} 当前 / ${version.publishedUpcomingVersion.patch} 预览`;
  $("[data-class-count]").textContent = classes.length;
  $("[data-unique-count]").textContent = uniques.itemCount;
  $("[data-build-count]").textContent = buildGuides.buildCount || archetypes.reduce((total, item) => total + item.archetypes.length, 0);

  renderSelects();
  renderSimulator();
  renderClasses();
  renderDamage();
  renderEquipment();
  renderAspects();
  renderForecast();
  renderSources(sources);
  bindInteractions();
  bindNavigation();
}

init().catch((error) => {
  console.error(error);
  document.body.insertAdjacentHTML("afterbegin", `<p class="load-error">页面数据加载失败：${error.message}</p>`);
});
