const paths = {
  version: "./data/metadata/version-baseline.json",
  classes: "./data/classes/classes.json",
  plans: "./data/builds/season-start-plans.json",
  archetypes: "./data/builds/archetypes.json",
  uniques: "./data/generated/official-3.1.0-guaranteed-unique-affixes.json",
  categories: "./data/equipment/stat-categories.json",
  sources: "./data/sources/source-registry.json"
};

const state = {
  classes: [],
  plans: [],
  archetypes: [],
  selectedClassId: "barbarian"
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
  return `${(value * 100).toFixed(1)}%`;
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

function renderUniqueCounts(uniques) {
  const counts = uniques.items.reduce((acc, item) => {
    acc[item.classRestriction] = (acc[item.classRestriction] ?? 0) + 1;
    return acc;
  }, {});
  const max = Math.max(...Object.values(counts));
  $("[data-unique-counts]").innerHTML = Object.entries(counts)
    .map(([label, count]) => `
      <div class="count-row">
        <span>${label}</span>
        <div class="bar-track"><i class="bar-fill" style="width:${(count / max) * 100}%"></i></div>
        <strong>${count}</strong>
      </div>
    `)
    .join("");
}

function renderTaxonomy(categories) {
  $("[data-stat-taxonomy]").innerHTML = categories
    .slice(0, 10)
    .map((item) => `
      <div class="stat-pill">
        <strong>${item.zhName}</strong>
        <span>${item.calculationRole}</span>
      </div>
    `)
    .join("");
}

function renderSources(sources) {
  $("[data-source-list]").innerHTML = sources.slice(0, 6)
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
  const plan = state.plans.find((item) => item.classId === selected.id)?.plan ?? [];
  const answer = plan[0] ? `${selected.zhName}：${plan[0]}` : "先选职业，再查看开荒重点。";
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

  $("[data-ask-button]").addEventListener("click", answerQuestion);
  $("[data-ask-input]").addEventListener("keydown", (event) => {
    if (event.key === "Enter") answerQuestion();
  });
}

async function init() {
  const [version, classes, plans, archetypes, uniques, categories, sources] = await Promise.all([
    loadJson(paths.version),
    loadJson(paths.classes),
    loadJson(paths.plans),
    loadJson(paths.archetypes),
    loadJson(paths.uniques),
    loadJson(paths.categories),
    loadJson(paths.sources)
  ]);

  state.classes = classes;
  state.plans = plans;
  state.archetypes = archetypes;

  $("[data-live-patch]").textContent = `${version.effectiveLiveVersion.patch} live`;
  $("[data-version-line]").textContent = `${version.effectiveLiveVersion.patch} live / ${version.publishedUpcomingVersion.patch} preview`;
  $("[data-class-count]").textContent = classes.length;
  $("[data-unique-count]").textContent = uniques.itemCount;
  $("[data-build-count]").textContent = archetypes.reduce((total, item) => total + item.archetypes.length, 0);

  renderClasses();
  renderDamage();
  renderUniqueCounts(uniques);
  renderTaxonomy(categories);
  renderSources(sources);
  answerQuestion();
  bindInteractions();
}

init().catch((error) => {
  console.error(error);
  document.body.insertAdjacentHTML("afterbegin", `<p class="load-error">页面数据加载失败：${error.message}</p>`);
});
