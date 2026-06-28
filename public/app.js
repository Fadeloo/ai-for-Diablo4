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

const state = {
  classes: [],
  plans: [],
  archetypes: [],
  equipment: [],
  simulations: null,
  selectedClassId: "barbarian",
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

function $(selector) {
  return document.querySelector(selector);
}

async function loadJson(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`无法加载 ${path}`);
  return response.json();
}

function formatNumber(value) {
  return new Intl.NumberFormat("zh-CN", { maximumFractionDigits: 0 }).format(value);
}

function percent(value) {
  return `${(value * 100).toFixed(0)}%`;
}

function iconSource(item) {
  return item.externalImage || item.image || `./public/assets/icon-${item.visualType}.png`;
}

function fallbackIcon(item) {
  return item.image || `./public/assets/icon-${item.visualType}.png`;
}

function renderIcon(item, alt) {
  return `<img src="${iconSource(item)}" data-fallback="${fallbackIcon(item)}" alt="${alt}">`;
}

function itemName(item) {
  return item.zhName || item.name;
}

function itemAffixes(item) {
  return item.zhGuaranteedAffixes || item.guaranteedAffixes?.map((affix) => affix.zhName || affix.name) || [];
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
  const match = value.match(/^(.+?) Build #(\d+) \(All Platforms\)—([A-Za-z]+) (\d{1,2}), (\d{4})$/);
  if (!match) return value;
  const [, patch, build, month, day, year] = match;
  return `${patch} 构建 #${build}（全平台）— ${year}-${monthMap[month] ?? month}-${day.padStart(2, "0")}`;
}

function listItems(items) {
  return items.map((item) => `<li>${item}</li>`).join("");
}

function bindImageFallbacks(root) {
  root.querySelectorAll("img[data-fallback]").forEach((img) => {
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

function className(classId) {
  return state.classes.find((item) => item.id === classId)?.zhName ?? classId;
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
  const best = mode.topBuilds[state.sim.buildIndex] ?? mode.topBuilds[0];
  const items = best.recommendedItems
    .slice(0, 4)
    .map((item) => `
      <article class="sim-item">
        ${renderIcon(item, `${itemName(item)}图标`)}
        <strong>${itemName(item)}</strong>
        <span>${itemAffixes(item).join(" / ")}</span>
      </article>
    `)
    .join("");
  const buildTabs = mode.topBuilds
    .map((build, index) => `
      <button class="build-tab" type="button" data-build-index="${index}" aria-selected="${build.archetypeId === best.archetypeId}">
        <strong>${build.archetypeName}</strong>
        <span>${build.predictedPit150Minutes} 分 · ${percent(build.confidence)}</span>
      </button>
    `)
    .join("");
  const guide = best.guide;
  const dataCompleteness = Object.values(guide.dataCompleteness)
    .map((line) => `<span>${line}</span>`)
    .join("");

  $("[data-sim-result]").innerHTML = `
    <div class="sim-head">
      <div>
        <p class="panel-kicker">${row.zhName} · ${mode.modeName}</p>
        <h3>${best.archetypeName}</h3>
      </div>
      <div class="sim-score">
        <strong>${best.predictedPit150Minutes}</strong>
        <span>150层分钟</span>
      </div>
    </div>
    <div class="sim-forecast-line">
      <span>模型分 ${best.score}</span>
      <span>置信度 ${percent(best.confidence)}</span>
      <span>${row.zhModelStatus || row.modelStatus}</span>
    </div>
    <div class="build-tabs">${buildTabs}</div>
    <p class="sim-rationale">${best.rationale.join(" ")}</p>
    <div class="sim-items">${items}</div>
    <section class="build-manual" aria-label="构筑详情">
      <div class="manual-summary">
        <h4>构筑手册</h4>
        <p>${guide.summary}</p>
      </div>
      <div class="manual-grid">
        <article>
          <h5>技能加点</h5>
          <p class="manual-kicker">${guide.skillPlan.core}</p>
          <div class="skill-bar">${guide.skillPlan.bar.map((skill) => `<span>${skill}</span>`).join("")}</div>
          <ol>${listItems(guide.skillPlan.priority)}</ol>
        </article>
        <article>
          <h5>巅峰路线</h5>
          <ol>${listItems(guide.paragonPlan.boardRoute)}</ol>
          <p>${guide.paragonPlan.rule}</p>
          <div class="tag-row">${guide.paragonPlan.glyphPriority.map((tag) => `<span>${tag}</span>`).join("")}</div>
        </article>
        <article>
          <h5>装备策略</h5>
          <ol>${listItems(guide.gearPlan.slotPriority)}</ol>
          <div class="gear-picks">
            ${guide.gearPlan.recommendedItems.map((item) => `<span>${item.zhName}：${item.reason}</span>`).join("")}
          </div>
        </article>
        <article>
          <h5>打法循环</h5>
          <ol>${listItems(guide.rotation)}</ol>
          <h5>开荒迁移</h5>
          <ol>${listItems(guide.leveling)}</ol>
        </article>
      </div>
      <div class="data-badges">${dataCompleteness}</div>
    </section>
    <p class="sim-warning">${state.simulations.zhWarning || state.simulations.warning}</p>
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

  rail.addEventListener("click", (event) => {
    const button = event.target.closest("[data-class-id]");
    if (!button) return;
    state.selectedClassId = button.dataset.classId;
    renderSelectedClass();
    renderClasses();
  }, { once: true });

  renderSelectedClass();
}

function renderSelectedClass() {
  const selected = state.classes.find((item) => item.id === state.selectedClassId) ?? state.classes[0];
  const plan = state.plans.find((item) => item.classId === selected.id);
  const archetypes = state.archetypes.find((item) => item.classId === selected.id)?.archetypes ?? [];

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

function renderEquipment() {
  const { classId, mode, query } = state.equipmentFilters;
  const normalizedQuery = query.trim().toLowerCase();
  const filtered = state.equipment
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
        item.guaranteedAffixes.map((affix) => affix.name).join(" "),
        (item.zhGuaranteedAffixes ?? []).join(" ")
      ].join(" ").toLowerCase().includes(normalizedQuery);
    });
  const rows = filtered.slice(0, state.equipmentFilters.visible);

  $("[data-equipment-meta]").textContent = `显示 ${rows.length} / ${filtered.length} 条，资料库总计 ${state.equipment.length} 条。展开卡片可查看来源、用途、数据状态和图标引用。`;
  $("[data-equipment-results]").innerHTML = rows
    .map((item) => `
      <details class="equipment-card">
        <summary>
          ${renderIcon(item, `${itemName(item)}图标`)}
          <span>
            <small>${item.zhClassRestriction || (item.classRestriction === "All Classes" ? "全职业" : item.classRestriction)} · ${item.zhVisualType || item.visualType}</small>
            <strong>${itemName(item)}</strong>
            <em>${item.zhBuildRole || item.buildRole} · ${(item.zhModeFit || item.modeFit).join(" / ")}</em>
          </span>
        </summary>
        <div class="equipment-detail">
          <section>
            <h4>固定词缀</h4>
            <ul>
              ${item.guaranteedAffixes.map((affix, index) => `
                <li>
                  <strong>${itemAffixes(item)[index]}</strong>
                  <span>槽位 ${affix.slots.join(" / ")} · ${statLabel(affix.categoryId)}</span>
                </li>
              `).join("")}
            </ul>
          </section>
          <section>
            <h4>配装用途</h4>
            <p>${item.zhBuildRole || item.buildRole}</p>
            <div class="tag-row">${(item.zhModeFit || item.modeFit).map((fit) => `<span>${fit}</span>`).join("")}</div>
          </section>
          <section>
            <h4>数据状态</h4>
            <p>固定词缀：${statusLabel(item.dataStatus.guaranteedAffixes)}</p>
            <p>完整词缀范围：${statusLabel(item.dataStatus.fullAffixRanges)}</p>
            <p>暗金特效：${statusLabel(item.dataStatus.uniquePower)}</p>
            <p>装备槽位：${statusLabel(item.dataStatus.slot)}</p>
          </section>
          <section>
            <h4>来源</h4>
            <p>${versionLineLabel(item.source.versionLine)}</p>
            <a href="${item.source.url}" target="_blank" rel="noreferrer">查看补丁来源</a>
            ${item.externalImage ? `<a href="${item.externalImage}" target="_blank" rel="noreferrer">查看图标来源</a>` : ""}
          </section>
        </div>
      </details>
    `)
    .join("");
  const moreButton = $("[data-equipment-more]");
  moreButton.hidden = rows.length >= filtered.length;
  bindImageFallbacks($("[data-equipment-results]"));
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
  const header = $("[data-header]");
  const updateHeader = () => header.classList.toggle("is-solid", window.scrollY > 24);
  window.addEventListener("scroll", updateHeader, { passive: true });
  updateHeader();

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
  $("[data-sim-result]").addEventListener("click", (event) => {
    const button = event.target.closest("[data-build-index]");
    if (!button) return;
    state.sim.buildIndex = Number(button.dataset.buildIndex);
    renderSimulator();
  });

  $("[data-equipment-search]").addEventListener("input", (event) => {
    state.equipmentFilters.query = event.target.value;
    state.equipmentFilters.visible = 48;
    renderEquipment();
  });
  $("[data-equipment-class]").addEventListener("change", (event) => {
    state.equipmentFilters.classId = event.target.value;
    state.equipmentFilters.visible = 48;
    renderEquipment();
  });
  $("[data-equipment-mode]").addEventListener("change", (event) => {
    state.equipmentFilters.mode = event.target.value;
    state.equipmentFilters.visible = 48;
    renderEquipment();
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
}

init().catch((error) => {
  console.error(error);
  document.body.insertAdjacentHTML("afterbegin", `<p class="load-error">页面数据加载失败：${error.message}</p>`);
});
