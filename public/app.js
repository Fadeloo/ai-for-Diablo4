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
    mode: "pit_push"
  },
  equipmentFilters: {
    classId: "all",
    mode: "all",
    query: ""
  }
};

function $(selector) {
  return document.querySelector(selector);
}

async function loadJson(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Failed to load ${path}`);
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
    <div class="damage-total">${formatNumber(result.expectedDps)} DPS</div>
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
    .map((season) => `<option value="${season.id}">${season.label}</option>`)
    .join("");
  $("[data-sim-season]").value = state.sim.seasonId;
}

function renderSimulator() {
  const row = state.simulations.rows.find(
    (item) => item.seasonId === state.sim.seasonId && item.classId === state.sim.classId
  );
  if (!row) return;
  const mode = row.modes[state.sim.mode];
  const best = mode.topBuilds[0];
  const secondary = mode.topBuilds.slice(1);
  const items = best.recommendedItems
    .slice(0, 4)
    .map((item) => `
      <article class="sim-item">
        ${renderIcon(item, `${item.name} icon`)}
        <strong>${item.name}</strong>
        <span>${item.guaranteedAffixes.join(" / ")}</span>
      </article>
    `)
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
      <span>${row.modelStatus}</span>
    </div>
    <p class="sim-rationale">${best.rationale.join(" ")}</p>
    <div class="sim-items">${items}</div>
    <div class="sim-secondary">
      ${secondary.map((build) => `<span>${build.archetypeName} · ${build.predictedPit150Minutes} 分</span>`).join("")}
    </div>
    <p class="sim-warning">${state.simulations.warning}</p>
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
    answerQuestion();
  }, { once: true });

  renderSelectedClass();
}

function renderSelectedClass() {
  const selected = state.classes.find((item) => item.id === state.selectedClassId) ?? state.classes[0];
  const plan = state.plans.find((item) => item.classId === selected.id);
  const archetypes = state.archetypes.find((item) => item.classId === selected.id)?.archetypes ?? [];

  $("[data-class-resource]").textContent = selected.primaryResources.join(" / ");
  $("[data-class-title]").textContent = `${selected.zhName} · ${selected.displayName}`;
  $("[data-class-plan]").innerHTML = (plan?.plan ?? [])
    .map((line) => `<li>${line}</li>`)
    .join("");
  $("[data-archetypes]").innerHTML = archetypes
    .map((item) => `
      <article class="archetype">
        <strong>${item.zhName}</strong>
        <span>${item.primaryStats.join(" / ")}</span>
      </article>
    `)
    .join("");
}

function renderEquipment() {
  const { classId, mode, query } = state.equipmentFilters;
  const normalizedQuery = query.trim().toLowerCase();
  const rows = state.equipment
    .filter((item) => classId === "all" || item.classRestriction === "All Classes" || item.classRestriction.toLowerCase() === classId)
    .filter((item) => mode === "all" || item.modeFit.includes(mode))
    .filter((item) => {
      if (!normalizedQuery) return true;
      return [
        item.name,
        item.classRestriction,
        item.visualType,
        item.buildRole,
        item.categories.join(" "),
        item.guaranteedAffixes.map((affix) => affix.name).join(" ")
      ].join(" ").toLowerCase().includes(normalizedQuery);
    })
    .slice(0, 36);

  $("[data-equipment-meta]").textContent = `显示 ${rows.length} / ${state.equipment.length} 条。当前库是官方 guaranteed affix 种子，不是完整装备库。`;
  $("[data-equipment-results]").innerHTML = rows
    .map((item) => `
      <article class="equipment-card">
        ${renderIcon(item, `${item.name} icon`)}
        <div>
          <p>${item.classRestriction === "All Classes" ? "全职业" : item.classRestriction}</p>
          <h3>${item.name}</h3>
          <ul>
            ${item.guaranteedAffixes.map((affix) => `<li>${affix.name}</li>`).join("")}
          </ul>
          <span>${item.buildRole} · ${item.modeFit.map((fit) => fit.replace("_", " ")).join(" / ")}</span>
        </div>
      </article>
    `)
    .join("");
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
      <h3>${season.label}</h3>
      <p>${season.assumption}</p>
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
        <span>${source.category}</span>
        <a href="${source.url}" target="_blank" rel="noreferrer">${source.name}</a>
        <em>${source.trustLevel}</em>
      </div>
    `)
    .join("");
}

function answerQuestion() {
  const selected = state.classes.find((item) => item.id === state.selectedClassId) ?? state.classes[0];
  const row = state.simulations?.rows.find((item) => item.seasonId === state.sim.seasonId && item.classId === selected.id);
  const best = row?.modes.pit_push.topBuilds[0];
  const plan = state.plans.find((item) => item.classId === selected.id)?.plan ?? [];
  const answer = best
    ? `${selected.zhName}：当前模型冲层优先 ${best.archetypeName}，150层约 ${best.predictedPit150Minutes} 分；开荒重点是 ${plan[0] ?? "先保证资源和生存"}。`
    : `${selected.zhName}：${plan[0] ?? "先选职业，再查看开荒重点。"}`;
  $("[data-ask-answer]").textContent = answer;
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
    renderSimulator();
    renderForecast();
    answerQuestion();
  });
  $("[data-sim-class]").addEventListener("change", (event) => {
    state.sim.classId = event.target.value;
    state.selectedClassId = event.target.value;
    renderSimulator();
    renderSelectedClass();
    answerQuestion();
  });
  $("[data-sim-mode]").addEventListener("change", (event) => {
    state.sim.mode = event.target.value;
    renderSimulator();
  });

  $("[data-equipment-search]").addEventListener("input", (event) => {
    state.equipmentFilters.query = event.target.value;
    renderEquipment();
  });
  $("[data-equipment-class]").addEventListener("change", (event) => {
    state.equipmentFilters.classId = event.target.value;
    renderEquipment();
  });
  $("[data-equipment-mode]").addEventListener("change", (event) => {
    state.equipmentFilters.mode = event.target.value;
    renderEquipment();
  });

  $("[data-ask-button]").addEventListener("click", answerQuestion);
  $("[data-ask-input]").addEventListener("keydown", (event) => {
    if (event.key === "Enter") answerQuestion();
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

  $("[data-live-patch]").textContent = `${version.effectiveLiveVersion.patch} live`;
  $("[data-version-line]").textContent = `${version.effectiveLiveVersion.patch} live / ${version.publishedUpcomingVersion.patch} preview`;
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
  answerQuestion();
  bindInteractions();
}

init().catch((error) => {
  console.error(error);
  document.body.insertAdjacentHTML("afterbegin", `<p class="load-error">页面数据加载失败：${error.message}</p>`);
});
