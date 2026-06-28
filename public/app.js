const paths = {
  version: "./data/metadata/version-baseline.json",
  classes: "./data/classes/classes.json",
  plans: "./data/builds/season-start-plans.json",
  archetypes: "./data/builds/archetypes.json",
  uniques: "./data/generated/official-3.1.0-guaranteed-unique-affixes.json",
  equipment: "./data/equipment/equipment-library.json",
  simulations: "./data/generated/build-simulations.json",
  buildGuides: "./data/generated/build-guides.json",
  categories: "./data/equipment/stat-categories.json",
  sources: "./data/sources/source-registry.json"
};

const viewIds = ["home", "builds", "bd", "equipment", "classes", "damage", "forecast", "sources"];
const routeAliases = {
  simulator: "builds"
};

const state = {
  classes: [],
  plans: [],
  archetypes: [],
  equipment: [],
  simulations: null,
  buildGuides: null,
  activeView: "home",
  selectedGuideId: null,
  selectedClassId: "barbarian",
  selectedEquipmentId: null,
  sim: {
    seasonId: "s14",
    classId: "barbarian",
    mode: "pit_push",
    buildIndex: 0,
    sourceQuality: "all"
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

function parseRoute(route) {
  const clean = (route || "home").replace(/^#/, "") || "home";
  if (clean.startsWith("bd/")) {
    return {
      view: "bd",
      guideId: decodeURIComponent(clean.slice(3))
    };
  }
  const normalized = routeAliases[clean] || clean;
  return {
    view: viewIds.includes(normalized) ? normalized : "home",
    guideId: null
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
  if (parsed.guideId) state.selectedGuideId = parsed.guideId;
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

  const desiredHash = normalized === "bd" && state.selectedGuideId
    ? `#bd/${encodeURIComponent(state.selectedGuideId)}`
    : `#${normalized}`;
  if (options.replaceHash && window.location.hash !== desiredHash) {
    history.replaceState(null, "", desiredHash);
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

function allBuildGuides() {
  return state.buildGuides?.builds || [];
}

function guideUrl(guide) {
  return `#bd/${encodeURIComponent(guide.id)}`;
}

function filteredGuides() {
  return allBuildGuides()
    .filter((guide) => guide.taxonomy.seasonId === state.sim.seasonId)
    .filter((guide) => guide.taxonomy.classId === state.sim.classId)
    .filter((guide) => guide.taxonomy.mode === state.sim.mode)
    .filter((guide) => {
      if (state.sim.sourceQuality === "community") return Boolean(guide.source.references?.length);
      if (state.sim.sourceQuality === "structured") return !guide.source.references?.length;
      return true;
    })
    .sort((a, b) => a.ceiling.pit150Minutes - b.ceiling.pit150Minutes || a.formationDifficulty.level - b.formationDifficulty.level);
}

function guideSourceLabel(guide) {
  return guide.source.references?.length ? "社区参考" : "结构化模板";
}

function renderTags(tags, limit = 8) {
  return (tags || []).slice(0, limit).map((tag) => `<span>${tag}</span>`).join("");
}

function renderCoreUniques(guide, limit = 4) {
  return guide.coreUniques.slice(0, limit)
    .map((item) => `
      <span class="mini-item">
        ${renderIcon(item, `${item.zhName}图标`)}
        <b>${item.zhName}</b>
      </span>
    `)
    .join("");
}

function renderCoreAspects(guide, limit = 8) {
  return guide.coreAspects.slice(0, limit)
    .map((aspect) => `
      <span class="mini-aspect">
        <b>${aspect.zhSlotName}</b>
        <strong>${aspect.name}</strong>
        <em>${aspect.replaceable ? "可替换" : "核心"}</em>
      </span>
    `)
    .join("");
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
          <span>${reference.sourceSeason}</span>
          <p>${reference.note}</p>
          <a href="${reference.url}" target="_blank" rel="noreferrer">查看来源页面</a>
        </article>
      `).join("")}
    </div>
  `;
}

function renderBuildLibraryCard(guide) {
  return `
    <article class="guide-card">
      <div class="guide-card__head">
        <div>
          <p class="panel-kicker">${guide.taxonomy.className} · ${guide.taxonomy.modeName}</p>
          <h3>${guide.taxonomy.archetypeName}</h3>
        </div>
        <strong>${guide.ceiling.tier}</strong>
      </div>
      <p>${guide.summary.oneLine}</p>
      <div class="guide-card__tags">${renderTags(guide.taxonomy.stageTags)}</div>
      <div class="source-pill">${guideSourceLabel(guide)}</div>
      <div class="guide-card__metrics">
        <span><b>${guide.formationDifficulty.label}</b>成型难度</span>
        <span><b>${guide.ceiling.pit150Minutes} 分</b>150 层参考</span>
        <span><b>${guide.gearSlots.length}</b>装备位置</span>
      </div>
      <div class="guide-card__items">${renderCoreUniques(guide, 3)}</div>
      <a class="button button-secondary" href="${guideUrl(guide)}">查看完整 BD</a>
    </article>
  `;
}

function renderSimulator() {
  const guides = filteredGuides();
  const selected = guides[state.sim.buildIndex] || guides[0] || null;
  if (!guides.some((guide) => guide.id === state.selectedGuideId)) {
    state.selectedGuideId = selected?.id || null;
  }

  $("[data-build-candidates]").innerHTML = `
    <div class="side-panel-title">
      <span>${className(state.sim.classId)} · ${modeName(state.sim.mode)}</span>
      <strong>${guides.length} 套 BD</strong>
    </div>
    ${guides.map((guide, index) => `
      <a class="build-candidate guide-link" href="${guideUrl(guide)}" aria-selected="${index === state.sim.buildIndex}">
        <span>${String(index + 1).padStart(2, "0")}</span>
        <strong>${guide.taxonomy.archetypeName}</strong>
        <em>${guideSourceLabel(guide)} · ${guide.taxonomy.stageTags.join(" / ")} · 成型${guide.formationDifficulty.label} · ${guide.ceiling.tier}</em>
      </a>
    `).join("")}
  `;

  if (!guides.length) {
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
  $("[data-sim-result]").innerHTML = `
    <div class="library-head">
      <div>
        <p class="panel-kicker">BD 大厅</p>
        <h3>${className(state.sim.classId)} · ${modeLabel}</h3>
        <p>每张卡进入独立 BD 详情页，详情页按装备、技能、巅峰、打法和替换件分区阅读。</p>
      </div>
      <div class="library-stats">
        <span><b>${guides.length}</b>套流派</span>
        <span><b>${guides.filter((guide) => guide.source.references?.length).length}</b>社区参考</span>
        <span><b>${guides[0].ceiling.label}</b>最高参考</span>
      </div>
    </div>
    <div class="guide-card-grid">
      ${guides.map(renderBuildLibraryCard).join("")}
    </div>
  `;
  bindImageFallbacks($("[data-sim-result]"));
}

function renderGearSlot(slot) {
  return `
    <article class="gear-slot-card ${slot.core ? "is-core" : ""}">
      <div class="gear-slot-card__top">
        <span>${slot.zhSlotName}</span>
        <strong>${slot.replaceable ? "可替换" : "核心不可替换"}</strong>
      </div>
      <div class="gear-slot-card__main">
        ${renderIcon(slot.target, `${slot.target.zhName}图标`)}
        <div>
          <h4>${slot.target.zhName}</h4>
          <p>${slot.target.description}</p>
        </div>
      </div>
      <div class="gear-slot-card__flags">
        <span>${slot.priority}</span>
        <span>${slot.aspect.name}</span>
      </div>
      <dl class="gear-lines">
        <div><dt>词缀</dt><dd>${slot.affixes.join(" / ")}</dd></div>
        <div><dt>淬炼</dt><dd>${slot.tempers.join(" / ")}</dd></div>
        <div><dt>精造</dt><dd>${slot.masterwork.join(" / ")}</dd></div>
        <div><dt>宝石</dt><dd>${slot.sockets.join(" / ")}</dd></div>
      </dl>
      <div class="slot-alternatives">
        <strong>替换方案</strong>
        <ul>${slot.alternatives.map((alt) => `<li><b>${alt.zhName}</b><span>${alt.reason} ${alt.tradeoff}</span></li>`).join("")}</ul>
      </div>
    </article>
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

function renderSkillTree(skillTree) {
  return `
    <div class="skill-layout">
      <div class="skill-bar-large">
        ${skillTree.skillBar.map((skill) => `
          <article>
            <span>${skill.slot}</span>
            <strong>${skill.name}</strong>
            <em>${skill.role} · ${skill.points} 点</em>
          </article>
        `).join("")}
      </div>
      <ol class="timeline-list">
        ${skillTree.pointOrder.map((item) => `
          <li>
            <span>${item.step}</span>
            <div><strong>${item.levelRange} · ${item.skill}</strong><p>${item.points}。${item.reason}</p></div>
          </li>
        `).join("")}
      </ol>
    </div>
  `;
}

function renderParagon(paragon) {
  return `
    <div class="paragon-layout">
      <div class="paragon-boards">
        ${paragon.boardOrder.map((board) => `
          <article>
            <span>${board.order}</span>
            <strong>${board.name}</strong>
            <p>${board.goal}</p>
            <em>${board.glyph} · ${board.rotate}</em>
          </article>
        `).join("")}
      </div>
      <ol class="timeline-list">
        ${paragon.clickOrder.map((item) => `
          <li>
            <span>${item.step}</span>
            <div><strong>${item.board} · ${item.node}</strong><p>${item.reason}</p></div>
          </li>
        `).join("")}
      </ol>
    </div>
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
            <div class="source-pill">${guide.source.trust}</div>
          </div>
          <div class="guide-hero__score">
            <strong>${guide.ceiling.tier}</strong>
            <span>${guide.ceiling.label}</span>
          </div>
        </div>
        <div class="guide-kpi-grid">
          <span><b>${guide.formationDifficulty.label}</b>成型难度</span>
          <span><b>${guide.taxonomy.stage}</b>适用阶段</span>
          <span><b>${guide.gearSlots.length}</b>装备位置</span>
          <span><b>${guide.coreUniques.length}</b>核心暗金</span>
        </div>
      </header>

      <nav class="guide-section-nav" aria-label="BD 分区导航">
        ${navItems.map(([key, label]) => `<button type="button" data-guide-jump="${key}">${label}</button>`).join("")}
      </nav>

      ${renderGuideDetailSection("核心装备", "暗金与威能", `
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
      `, "overview")}

      ${renderGuideDetailSection("全身装备", "每个位置、替换件和精造方向", `
        <div class="gear-slot-grid">${guide.gearSlots.map(renderGearSlot).join("")}</div>
      `, "gear")}

      ${renderGuideDetailSection("技能加点", `${guide.skillTree.core} · 按等级段执行`, renderSkillTree(guide.skillTree), "skills")}

      ${renderGuideDetailSection("巅峰点击顺序", "先雕文孔和传奇节点，再补稀有与魔法节点", renderParagon(guide.paragon), "paragon")}

      ${renderGuideDetailSection("打法", "起手、循环、首领、防御和常见错误", renderGameplay(guide.gameplay), "gameplay")}

      ${renderGuideDetailSection("替换与变体", "缺件、冲层和高容错版本", `
        <div class="variant-grid">
          ${guide.variants.map((variant) => `
            <article>
              <h5>${variant.name}</h5>
              <p>${variant.useCase}</p>
              <dl>
                <div><dt>换下</dt><dd>${variant.swapOut}</dd></div>
                <div><dt>换上</dt><dd>${variant.swapIn}</dd></div>
              </dl>
              <span>${variant.notes}</span>
            </article>
          `).join("")}
        </div>
      `, "variants")}

      ${renderGuideDetailSection("来源与状态", `${guide.gameVersion.patch} 构建 #${guide.gameVersion.build}`, `
        <div class="source-status-grid">
          <article><strong>作者</strong><span>${guide.source.authorName}</span></article>
          <article><strong>更新时间</strong><span>${guide.source.updatedAt}</span></article>
          <article><strong>已确认</strong><span>${guide.dataQuality.officialFields.join(" / ")}</span></article>
          <article><strong>待补全</strong><span>${guide.dataQuality.needsValidation.join(" / ")}</span></article>
        </div>
        ${renderSourceReferences(guide)}
        <div class="source-actions">
          <a href="${guide.gameVersion.sourceUrl}" target="_blank" rel="noreferrer">查看官方补丁来源</a>
        </div>
      `, "sources")}
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
  $("[data-sim-source]").addEventListener("change", (event) => {
    state.sim.sourceQuality = event.target.value;
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

  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-guide-jump]");
    if (!button) return;
    const section = $(`[data-guide-section="${button.dataset.guideJump}"]`);
    section?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

async function init() {
  const [version, classes, plans, archetypes, uniques, equipment, simulations, buildGuides, sources] = await Promise.all([
    loadJson(paths.version),
    loadJson(paths.classes),
    loadJson(paths.plans),
    loadJson(paths.archetypes),
    loadJson(paths.uniques),
    loadJson(paths.equipment),
    loadJson(paths.simulations),
    loadJson(paths.buildGuides),
    loadJson(paths.sources)
  ]);

  state.classes = classes;
  state.plans = plans;
  state.archetypes = archetypes;
  state.equipment = equipment.items;
  state.simulations = simulations;
  state.buildGuides = buildGuides;

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
  renderForecast();
  renderSources(sources);
  bindInteractions();
  bindNavigation();
}

init().catch((error) => {
  console.error(error);
  document.body.insertAdjacentHTML("afterbegin", `<p class="load-error">页面数据加载失败：${error.message}</p>`);
});
