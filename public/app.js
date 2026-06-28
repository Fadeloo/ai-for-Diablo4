const paths = {
  version: "./data/metadata/version-baseline.json",
  classes: "./data/classes/classes.json",
  plans: "./data/builds/season-start-plans.json",
  archetypes: "./data/builds/archetypes.json",
  uniques: "./data/generated/official-3.1.0-guaranteed-unique-affixes.json",
  equipment: "./data/equipment/equipment-library.json",
  simulations: "./data/generated/build-simulations.json",
  categories: "./data/equipment/stat-categories.json",
  sources: "./data/sources/source-registry.json"
};

const viewIds = ["home", "builds", "equipment", "classes", "damage", "forecast", "sources"];
const routeAliases = {
  simulator: "builds"
};

const state = {
  classes: [],
  plans: [],
  archetypes: [],
  equipment: [],
  simulations: null,
  activeView: "home",
  selectedClassId: "barbarian",
  selectedEquipmentId: null,
  sim: {
    seasonId: "s14",
    classId: "barbarian",
    mode: "pit_push",
    buildIndex: 0
  },
  equipmentFilters: {
    classId: "all",
    mode: "all",
    query: "",
    visible: 48
  }
};

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
  Vigor: "活力",
  "Class-specific resource pending source lock": "职业资源待资料锁定"
};

const sourceLabels = {
  blizzard_patch_3_0: "《暗黑破坏神 IV》3.0 补丁说明",
  blizzard_patch_3_1: "《暗黑破坏神 IV》3.1.0 补丁说明",
  blizzard_season_death_awakening: "死亡觉醒赛季官方介绍",
  maxroll_damage_guide: "Maxroll 暗黑4深度伤害机制指南",
  wowhead_damage_buckets: "Wowhead 暗黑4伤害乘区指南",
  d4builds_database: "D4Builds 数据库",
  d4builds_sunderarmor_icons: "D4Builds 唯一装备图标引用",
  d4lf_repo: "d4lf 开源工具仓库"
};

const sourceCategoryLabels = {
  official_patch_notes: "官方补丁说明",
  official_season_overview: "官方赛季说明",
  community_mechanics: "社区机制资料",
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
  needs_source_backfill: "待数据源回填",
  inferred_or_unknown: "推断或未知",
  external_url_reference: "外部地址引用"
};

const dataStatusFieldLabels = {
  guaranteedAffixes: "固定词缀",
  fullAffixRanges: "完整词缀范围",
  uniquePower: "暗金特效",
  slot: "装备槽位",
  icon: "图标来源"
};

const modeLabels = {
  pit_push: "冲层",
  speed_farm: "速刷",
  daily: "日常"
};

function $(selector) {
  return document.querySelector(selector);
}

async function loadJson(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`无法加载 ${path}`);
  return response.json();
}

function normalizeView(viewId) {
  const normalized = routeAliases[viewId] || viewId;
  return viewIds.includes(normalized) ? normalized : "home";
}

function setView(viewId, options = {}) {
  const normalized = normalizeView(viewId);
  state.activeView = normalized;
  document.body.dataset.view = normalized;

  document.querySelectorAll(".view[data-view]").forEach((view) => {
    view.classList.toggle("is-active", view.dataset.view === normalized);
  });
  document.querySelectorAll("[data-view-link]").forEach((link) => {
    const target = normalizeView(link.getAttribute("href")?.replace("#", "") || "home");
    if (target === normalized) {
      link.setAttribute("aria-current", "page");
    } else {
      link.removeAttribute("aria-current");
    }
  });

  if (options.replaceHash && window.location.hash !== `#${normalized}`) {
    history.replaceState(null, "", `#${normalized}`);
  }
  window.scrollTo(0, 0);
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
  return state.classes.find((item) => item.id === classId)?.zhName ?? classId;
}

function modeName(modeId) {
  return modeLabels[modeId] || modeId;
}

function equipmentClassLabel(item) {
  return item.zhClassRestriction || (item.classRestriction === "All Classes" ? "全职业" : item.classRestriction);
}

function equipmentTypeLabel(item) {
  return item.zhVisualType || item.visualType || "装备";
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

function listItems(items) {
  return (items || []).map((item) => `<li>${item}</li>`).join("");
}

function bindImageFallbacks(root) {
  root?.querySelectorAll("img[data-fallback]").forEach((img) => {
    img.addEventListener("error", () => {
      if (img.src.endsWith(img.dataset.fallback)) return;
      img.src = img.dataset.fallback;
    }, { once: true });
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
  $("[data-sim-class]").innerHTML = classOptions;
  $("[data-sim-class]").value = state.sim.classId;
  $("[data-equipment-class]").innerHTML = `<option value="all">全部职业</option><option value="All Classes">全职业</option>${classOptions}`;

  $("[data-sim-season]").innerHTML = state.simulations.seasons
    .map((season) => `<option value="${season.id}">${season.zhLabel || season.label}</option>`)
    .join("");
  $("[data-sim-season]").value = state.sim.seasonId;
}

function renderSimulator() {
  const row = state.simulations.rows.find(
    (item) => item.seasonId === state.sim.seasonId && item.classId === state.sim.classId
  );
  if (!row) return;
  const mode = row.modes[state.sim.mode];
  if (!mode.topBuilds[state.sim.buildIndex]) state.sim.buildIndex = 0;
  const best = mode.topBuilds[state.sim.buildIndex] ?? mode.topBuilds[0];
  const guide = best.guide;

  $("[data-build-candidates]").innerHTML = `
    <div class="side-panel-title">
      <span>${row.zhName} · ${mode.modeName}</span>
      <strong>${mode.topBuilds.length} 套候选</strong>
    </div>
    ${mode.topBuilds.map((build, index) => `
      <button class="build-candidate" type="button" data-build-index="${index}" aria-selected="${index === state.sim.buildIndex}">
        <span>${String(index + 1).padStart(2, "0")}</span>
        <strong>${build.archetypeName}</strong>
        <em>${build.predictedPit150Minutes} 分 · 置信度 ${percent(build.confidence)}</em>
      </button>
    `).join("")}
  `;

  const recommendedItems = best.recommendedItems
    .slice(0, 6)
    .map((item) => `
      <article class="sim-item">
        ${renderIcon(item, `${itemName(item)}图标`)}
        <div>
          <strong>${itemName(item)}</strong>
          <span>${itemAffixes(item).join(" / ") || "词缀待回填"}</span>
        </div>
      </article>
    `)
    .join("");
  const gearReasons = guide.gearPlan.recommendedItems
    .map((item) => `
      <li>
        <strong>${item.zhName}</strong>
        <span>${item.zhVisualType} · ${item.reason}</span>
      </li>
    `)
    .join("");
  const dataCompleteness = Object.values(guide.dataCompleteness)
    .map((line) => `<span>${line}</span>`)
    .join("");

  $("[data-sim-result]").innerHTML = `
    <div class="detail-head">
      <div>
        <p class="panel-kicker">${className(row.classId)} · ${modeName(state.sim.mode)}</p>
        <h3>${best.archetypeName}</h3>
      </div>
      <div class="score-tile">
        <strong>${best.predictedPit150Minutes}</strong>
        <span>150层分钟</span>
      </div>
    </div>
    <div class="stat-strip">
      <span>模型分 ${best.score}</span>
      <span>置信度 ${percent(best.confidence)}</span>
      <span>${row.zhModelStatus || row.modelStatus}</span>
    </div>
    <p class="detail-summary">${guide.summary}</p>
    <p class="detail-rationale">${best.rationale.join(" ")}</p>
    <section class="detail-section">
      <div class="section-title">
        <h4>关键装备</h4>
        <span>推荐优先级</span>
      </div>
      <div class="sim-items">${recommendedItems}</div>
    </section>
    <section class="detail-section">
      <div class="section-title">
        <h4>技能加点</h4>
        <span>${guide.skillPlan.core}</span>
      </div>
      <div class="skill-bar">${guide.skillPlan.bar.map((skill) => `<span>${skill}</span>`).join("")}</div>
      <ol class="compact-list">${listItems(guide.skillPlan.priority)}</ol>
    </section>
    <section class="detail-section two-column-detail">
      <article>
        <div class="section-title">
          <h4>巅峰路线</h4>
          <span>盘面模板</span>
        </div>
        <ol class="compact-list">${listItems(guide.paragonPlan.boardRoute)}</ol>
        <p>${guide.paragonPlan.rule}</p>
        <div class="tag-row">${guide.paragonPlan.glyphPriority.map((tag) => `<span>${tag}</span>`).join("")}</div>
      </article>
      <article>
        <div class="section-title">
          <h4>装备策略</h4>
          <span>词缀优先级</span>
        </div>
        <div class="tag-row">${guide.gearPlan.statPriority.map((tag) => `<span>${tag}</span>`).join("")}</div>
        <ol class="compact-list">${listItems(guide.gearPlan.slotPriority)}</ol>
      </article>
    </section>
    <section class="detail-section two-column-detail">
      <article>
        <div class="section-title">
          <h4>装备命中理由</h4>
          <span>当前推荐</span>
        </div>
        <ul class="gear-reason-list">${gearReasons}</ul>
      </article>
      <article>
        <div class="section-title">
          <h4>打法与开荒</h4>
          <span>循环/迁移</span>
        </div>
        <ol class="compact-list">${listItems(guide.rotation)}</ol>
        <ol class="compact-list muted-list">${listItems(guide.leveling)}</ol>
      </article>
    </section>
    <section class="detail-section">
      <div class="section-title">
        <h4>数据完整度</h4>
        <span>可审计边界</span>
      </div>
      <div class="data-badges">${dataCompleteness}</div>
      <p class="sim-warning">${state.simulations.zhWarning || state.simulations.warning}</p>
    </section>
  `;
  bindImageFallbacks($("[data-sim-result]"));
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

function renderSelectedClass() {
  const selected = state.classes.find((item) => item.id === state.selectedClassId) ?? state.classes[0];
  const plan = state.plans.find((item) => item.classId === selected.id);
  const archetypes = state.archetypes.find((item) => item.classId === selected.id)?.archetypes ?? [];

  document.querySelectorAll("[data-class-id]").forEach((button) => {
    button.setAttribute("aria-selected", String(button.dataset.classId === selected.id));
  });
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
}

function filteredEquipmentRows() {
  const { classId, mode, query } = state.equipmentFilters;
  const normalizedQuery = query.trim().toLowerCase();
  return state.equipment
    .filter((item) => classId === "all" || item.classRestriction === "All Classes" || item.classRestriction.toLowerCase() === classId)
    .filter((item) => mode === "all" || item.modeFit.includes(mode))
    .filter((item) => {
      if (!normalizedQuery) return true;
      return [
        item.name,
        item.zhName,
        item.classRestriction,
        item.zhClassRestriction,
        item.visualType,
        item.zhVisualType,
        item.buildRole,
        item.zhBuildRole,
        item.categories.join(" "),
        item.guaranteedAffixes.map(normalizeAffixName).join(" "),
        (item.zhGuaranteedAffixes ?? []).join(" ")
      ].join(" ").toLowerCase().includes(normalizedQuery);
    });
}

function renderEquipment() {
  const filtered = filteredEquipmentRows();
  const rows = filtered.slice(0, state.equipmentFilters.visible);
  if (!filtered.some((item) => item.id === state.selectedEquipmentId)) {
    state.selectedEquipmentId = rows[0]?.id ?? null;
  }
  const selected = state.equipment.find((item) => item.id === state.selectedEquipmentId) ?? rows[0];

  $("[data-equipment-meta]").textContent =
    `显示 ${rows.length} / ${filtered.length} 条，资料库总计 ${state.equipment.length} 条。点击左侧装备，右侧查看完整来源、用途、状态和词缀。`;
  $("[data-equipment-results]").innerHTML = rows
    .map((item) => `
      <button class="equipment-row" type="button" data-equipment-id="${item.id}" aria-selected="${item.id === selected?.id}">
        ${renderIcon(item, `${itemName(item)}图标`)}
        <span>
          <small>${equipmentClassLabel(item)} · ${equipmentTypeLabel(item)}</small>
          <strong>${itemName(item)}</strong>
          <em>${item.zhBuildRole || item.buildRole} · ${(item.zhModeFit || item.modeFit).join(" / ")}</em>
        </span>
        <b>查看</b>
      </button>
    `)
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
  const statuses = Object.entries(item.dataStatus || {})
    .map(([key, value]) => `
      <div class="status-row">
        <span>${dataStatusFieldLabels[key] || key}</span>
        <strong>${statusLabel(value)}</strong>
      </div>
    `)
    .join("");

  panel.innerHTML = `
    <div class="equipment-detail-hero">
      ${renderIcon(item, `${itemName(item)}图标`)}
      <div>
        <p class="panel-kicker">${equipmentClassLabel(item)} · ${equipmentTypeLabel(item)}</p>
        <h3>${itemName(item)}</h3>
        <p>${item.zhBuildRole || item.buildRole}</p>
      </div>
    </div>
    <div class="tag-row">${(item.zhModeFit || item.modeFit).map((fit) => `<span>${fit}</span>`).join("")}</div>
    <section class="detail-section">
      <div class="section-title">
        <h4>固定词缀</h4>
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
        <h4>来源</h4>
        <span>${item.source.id}</span>
      </div>
      <p>${versionLineLabel(item.source.versionLine)}</p>
      <div class="source-actions">
        <a href="${item.source.url}" target="_blank" rel="noreferrer">查看补丁来源</a>
        ${item.externalImage ? `<a href="${item.externalImage}" target="_blank" rel="noreferrer">查看图标来源</a>` : ""}
      </div>
    </section>
  `;
  bindImageFallbacks(panel);
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
        <span>职业</span><span>冲层</span><span>速刷</span><span>日常</span><span>150层预测</span>
      </div>
      ${rows.map(({ item, push, speed, daily }) => `
        <div class="forecast-row">
          <strong>${item.zhName}</strong>
          <span>${push.archetypeName}</span>
          <span>${speed.archetypeName}</span>
          <span>${daily.archetypeName}</span>
          <em>${push.predictedPit150Minutes} 分 · ${percent(push.confidence)}</em>
        </div>
      `).join("")}
    </div>
  `;
}

function renderSources(sources) {
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
    renderSimulator();
    renderForecast();
  });
  $("[data-sim-class]").addEventListener("change", (event) => {
    state.sim.classId = event.target.value;
    state.selectedClassId = event.target.value;
    state.sim.buildIndex = 0;
    renderSimulator();
    renderSelectedClass();
  });
  $("[data-sim-mode]").addEventListener("change", (event) => {
    state.sim.mode = event.target.value;
    state.sim.buildIndex = 0;
    renderSimulator();
  });
  $("[data-build-candidates]").addEventListener("click", (event) => {
    const button = event.target.closest("[data-build-index]");
    if (!button) return;
    state.sim.buildIndex = Number(button.dataset.buildIndex);
    renderSimulator();
  });

  $("[data-class-rail]").addEventListener("click", (event) => {
    const button = event.target.closest("[data-class-id]");
    if (!button) return;
    state.selectedClassId = button.dataset.classId;
    renderSelectedClass();
  });

  $("[data-equipment-search]").addEventListener("input", (event) => {
    state.equipmentFilters.query = event.target.value;
    state.equipmentFilters.visible = 48;
    state.selectedEquipmentId = null;
    renderEquipment();
  });
  $("[data-equipment-class]").addEventListener("change", (event) => {
    state.equipmentFilters.classId = event.target.value;
    state.equipmentFilters.visible = 48;
    state.selectedEquipmentId = null;
    renderEquipment();
  });
  $("[data-equipment-mode]").addEventListener("change", (event) => {
    state.equipmentFilters.mode = event.target.value;
    state.equipmentFilters.visible = 48;
    state.selectedEquipmentId = null;
    renderEquipment();
  });
  $("[data-equipment-results]").addEventListener("click", (event) => {
    const button = event.target.closest("[data-equipment-id]");
    if (!button) return;
    state.selectedEquipmentId = button.dataset.equipmentId;
    renderEquipment();
    $("[data-equipment-detail]")?.scrollTo(0, 0);
  });
  $("[data-equipment-more]").addEventListener("click", () => {
    state.equipmentFilters.visible += 48;
    renderEquipment();
  });
}

async function init() {
  const [version, classes, plans, archetypes, uniques, equipment, simulations, sources] = await Promise.all([
    loadJson(paths.version),
    loadJson(paths.classes),
    loadJson(paths.plans),
    loadJson(paths.archetypes),
    loadJson(paths.uniques),
    loadJson(paths.equipment),
    loadJson(paths.simulations),
    loadJson(paths.sources)
  ]);

  state.classes = classes;
  state.plans = plans;
  state.archetypes = archetypes;
  state.equipment = equipment.items;
  state.simulations = simulations;

  $("[data-live-patch]").textContent = `${version.effectiveLiveVersion.patch} 当前`;
  $("[data-version-line]").textContent = `${version.effectiveLiveVersion.patch} 当前 / ${version.publishedUpcomingVersion.patch} 预览`;
  $("[data-class-count]").textContent = classes.length;
  $("[data-unique-count]").textContent = uniques.itemCount;
  $("[data-build-count]").textContent = archetypes.reduce((total, item) => total + item.archetypes.length, 0);

  renderSelects();
  renderSimulator();
  renderClasses();
  renderDamage();
  renderEquipment();
  renderForecast();
  renderSources(sources);
  bindInteractions();
  bindNavigation();
}

init().catch((error) => {
  console.error(error);
  document.body.insertAdjacentHTML("afterbegin", `<p class="load-error">页面数据加载失败：${error.message}</p>`);
});
