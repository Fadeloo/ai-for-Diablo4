# Harris's Diablo 4 网站整体实施设计

本文是继续开发前的实施基线。后续页面、数据导入、AI 分析和验证都按这里的架构推进，避免把装备库、BD、预测和说明再次挤在一个页面里。

## 1. 产品目标

Harris's Diablo 4 要做成中文暗黑 4 玩家资料站，而不是静态展示页。玩家打开站点后应能完成这些事情：

- 查版本边界：知道当前资料对应哪个正式版本、哪个预览补丁、哪些字段仍待回填。
- 查装备：按职业、部位、用途、来源状态搜索装备，进入装备详情看固定词缀、用途、来源、相关 BD。
- 抄 BD：打开完整构筑详情，看到 11 个装备位、技能加点、巅峰顺序、打法、替换件和来源。
- 做替换：缺核心暗金时能看到替换路径、优先词缀、过渡件和放弃点。
- 看预测：未来三个赛季的冲层、速刷、日常推荐必须标注预测来源、置信度和校准状态。
- 验伤害：通过伤害实验室解释词缀、乘区、暴击、压制、易伤和攻速的收益。

原则：

- 事实字段必须有来源或状态，不把预测写成事实。
- 中文优先，页面不展示内部推理、模型话术或英文残留。
- 列表负责筛选比较，详情负责完整执行信息。
- 图标和图片要服务识别装备和构筑，不做纯装饰。
- AI 只产出候选分析结果，正式资料必须经过结构化校验。

## 2. 视觉与交互方向

目标风格是暴雪官网式暗黑资料站：黑石底色、暗金强调、厚重边线、装备图标、职业视觉、分区标签和可读的数据表。它不是营销页，首页第一屏就给玩家功能入口和资料状态。

设计 token：

| Token | 值 | 用途 |
| --- | --- | --- |
| `--bg-abyss` | `#070707` | 全站背景 |
| `--bg-panel` | `#101010` | 面板和列表 |
| `--bg-stone` | `#181510` | 详情分区底 |
| `--line-bronze` | `#5f4a23` | 卡片边线 |
| `--gold` | `#d8b45a` | 标题、状态、操作 |
| `--blood` | `#9c221d` | 危险、冲层、核心提醒 |
| `--text-main` | `#f4efe5` | 主文本 |
| `--text-muted` | `#b7afa3` | 次文本 |

版式：

- 桌面端使用资料站常见的 `内容最大宽度 + 左侧筛选/列表 + 右侧详情/表格`。
- BD 详情使用顶部概要和分区页签：`总览 / 装备 / 技能 / 巅峰 / 打法 / 变体 / 来源`。
- 装备库使用 `筛选栏 + 装备网格 + 详情抽屉或独立详情区`。
- 移动端采用顶部筛选折叠、单列卡片和锚点目录。
- 详情内容不使用无限展开卡片，核心信息固定可见。

组件形态：

- 按钮用图标加短文本，主要操作用暗金描边。
- 状态用 badge：`同赛季社区参考`、`跨赛季社区参考`、`官方词缀模板`、`未来赛季推演`、`待回填`。
- 装备槽位固定网格，不因文字长短改变槽位结构。
- 每张装备卡必须有图标、本地回退图、部位、职业、用途和来源状态。

## 3. 信息架构

```text
首页 #home
  ├─ 当前版本状态
  ├─ 数据覆盖概览
  ├─ 职业 / BD / 装备 / 预测 / 伤害入口
  └─ 本轮资料边界

BD 大厅 #builds
  ├─ 筛选：赛季、全部/单职业、全部/单用途、来源状态、关键词
  ├─ 资料成熟度：社区可抄、同赛季社区、跨赛季社区、官方模板、未来推演
  ├─ 排序：冲层潜力、速刷速度、成型难度、资料可信度
  ├─ 职业流派矩阵：每个职业的流派数量、社区来源、三种用途入口和上限
  ├─ 列表：每套 BD 摘要、核心装备、标签、来源状态
  └─ 点击进入 #bd/<guideId>

BD 详情 #bd/<guideId>
  ├─ 总览：定位、强弱项、需求件、150 层参考
  ├─ 装备：11 槽位、目标件、替换件、词缀、淬炼、精造、宝石
  ├─ 技能：技能栏、加点顺序、被动、专精/职业机制
  ├─ 巅峰：盘顺序、雕文、点击顺序、补点逻辑
  ├─ 打法：起手、循环、首领、防御、速刷、错误
  ├─ 变体：缺件、速刷、高层生存、低门槛
  └─ 来源：社区/官方链接、更新时间、缺失字段

装备库 #equipment
  ├─ 筛选：职业、部位、用途、词缀、来源状态
  ├─ 装备列表：图标、名称、固定词缀、用途
  ├─ 装备详情：完整字段、来源、相关 BD
  └─ #item/<itemId> 独立装备页

威能索引 #aspects
  ├─ 筛选：职业、用途、部位、来源状态、关键词
  ├─ 威能列表：名称、常见部位、使用次数、关联 BD
  ├─ 威能详情：部位分布、核心/硬需求/可替换统计、相关 BD
  └─ #aspect/<aspectId> 独立威能页

职业开荒 #classes
  ├─ 职业定位
  ├─ 开荒阶段
  ├─ 流派轴
  ├─ 赛季切换
  ├─ 职业完整流派矩阵：日常 / 速刷 / 冲层的难度、阶段、上限、来源和核心件
  └─ 该职业可用 BD 入口

伤害实验室 #damage
  ├─ 属性输入
  ├─ 伤害乘区拆分
  ├─ 词缀对比
  └─ 从 BD 带入默认值

150 层参考 #forecast
  ├─ 未来三个赛季
  ├─ 职业速度预测
  ├─ 冲层 / 速刷 / 日常榜
  └─ 校准状态和风险

来源 #sources
  ├─ 官方来源
  ├─ 社区来源
  ├─ 图标来源
  └─ 授权、可信度和使用范围
```

## 4. 前端组件设计

当前项目是原生 HTML/CSS/JS 静态站。短期保持这个栈，先把数据和页面做完整；如果后续迁移 React/Vue，组件边界仍沿用本节。

| 组件 | 职责 | 输入 | 输出/行为 |
| --- | --- | --- | --- |
| `SiteShell` | 全站导航、当前版本、hash 路由 | `version`、路由状态 | 切换视图、移动端菜单 |
| `HomeDashboard` | 首页入口和覆盖概览 | classes/equipment/guides/sources | 跳转到核心功能页 |
| `SourceBadge` | 统一显示资料可信度 | `verificationLevel`、`dataStatus` | 中文 badge 和 tooltip |
| `BuildFilters` | BD 筛选条件 | seasons/classes/modes/sourceLevels | 更新 `state.sim` |
| `BuildAtlas` | 全职业流派矩阵 | 当前赛季筛选后的 guides | 按职业汇总流派、社区来源、用途入口和上限 |
| `BuildCard` | BD 大厅列表项 | `guide` | 进入 BD 详情 |
| `BuildDetailLayout` | BD 详情页容器 | `guideId` | 渲染分区目录和详情 |
| `BuildSummaryPanel` | 定位、难度、强弱项 | `guide.summary`、`ceiling` | 顶部摘要 |
| `BuildVersionSwitcher` | 同流派版本切换 | 当前 `guide`、同赛季同职业同流派 guides | 在详情页首屏切换日常、速刷、冲层版本，并露出同职业社区 BD |
| `GearSummaryMatrix` | 装备总表 | `guide.gearSlots` | 在装备分区顶部一次性展示 11 部位目标件、核心/替换状态、威能/暗金、词缀和操作 |
| `LoadoutStrip` | 全身装备速览 | `guide.gearSlots` | 11 个槽位快速跳到装备区 |
| `LoadoutBoard` | 纸娃娃式配装盘面 | `guide.gearSlots`、`coreUniques`、`coreAspects` | 首屏展示 11 个部位、核心/硬需求/可替换和暗金/威能 |
| `RouteOverview` | 技能和巅峰执行路线总览 | `skillTree`、`paragon` | 总览区展示 6 技能栏、加点顺序、巅峰盘和点击主线 |
| `CombatOverview` | 战斗循环总览 | `gameplay` | 总览区展示起手、主循环、首领/防御、速刷/误区 |
| `GearSlotGrid` | 11 装备位 | `guide.gearSlots` | 展示目标件和替换路径 |
| `GearSlotCard` | 单个装备槽位 | `gearSlot` | 图标、词缀、淬炼、宝石 |
| `SkillRouteMatrix` | 技能路线总表 | `guide.skillTree` | 展示 6 技能栏、等级段、技能、投入点数和加点原因 |
| `SkillRoutePanel` | 技能栏和加点 | `guide.skillTree` | 技能顺序和被动优先级 |
| `ParagonRouteMatrix` | 巅峰路线总表 | `guide.paragon` | 展示盘顺序、雕文、点数阶段和完整点击主线 |
| `ParagonRoutePanel` | 巅峰路线 | `guide.paragon` | 盘、雕文、点击顺序 |
| `GameplayPanel` | 实战操作 | `guide.gameplay` | 起手/循环/首领/防御 |
| `VariantPanel` | 替换方案 | `guide.variants` | 缺件与速刷方案 |
| `EquipmentBrowser` | 装备检索 | `equipment.items`、filters | 列表和分页 |
| `EquipmentDetailPanel` | 装备详情 | `item`、`relatedGuides` | 固定词缀、来源、相关 BD |
| `AspectBrowser` | 威能检索 | `aspect-index.aspects`、filters | 列表、详情和相关 BD |
| `AspectDetailPanel` | 威能详情 | `aspect` | 常见部位、核心度、替换状态、关联 BD |
| `ClassStartPlan` | 职业开荒 | `classes`、`season-start-plans` | 阶段路线、赛季切换和完整流派矩阵 |
| `DamageWorkbench` | 伤害计算 | 表单、`src/damage` | 期望伤害拆分 |
| `ForecastTable` | 预测矩阵 | `build-simulations` | 三赛季速度和风险 |
| `SourceRegistryView` | 来源库 | `source-registry` | 来源、可信度、使用范围 |
| `CoveragePanel` | 数据覆盖摘要 | `site-coverage` | 展示 BD/装备/来源覆盖和存储层用途 |

组件规则：

- 任何组件不得在浏览器端“编造”构筑，只能展示已生成 JSON。
- `BuildDetailLayout` 是唯一展示完整 BD 的地方，BD 大厅只保留摘要。
- `BuildVersionSwitcher` 只在同一赛季、同一职业、同一流派内切换用途版本；它不能把不同流派混在同一组里。
- `GearSummaryMatrix` 必须覆盖 11 个装备位，并能跳到对应装备卡或装备详情页。
- `SkillRouteMatrix` 和 `ParagonRouteMatrix` 必须放在各自分区顶部，先给可抄路线，再给解释卡片。
- 装备、技能、巅峰、打法都必须能单独阅读，不嵌套在同一张大卡里。
- 详情页内所有外链都显示来源站点和日期。
- 所有长文本都要在移动端换行，不能覆盖相邻装备卡。

## 5. 数据存储设计

### 5.1 当前静态 JSON 层

```text
data/
  metadata/version-baseline.json
  sources/source-registry.json
  classes/classes.json
  equipment/
    slots.json
    stat-categories.json
    affix-taxonomy.json
    equipment-library.json
  builds/
    archetypes.json
    season-start-plans.json
    community-build-overrides.json
  generated/
    official-3.1.0-guaranteed-unique-affixes.json
    d4builds-icon-index.json
    build-simulations.json
    build-guides.json
    aspect-index.json
    site-coverage.json
```

静态文件职责：

- `source-registry.json` 是所有来源的白名单。新增事实来源先登记，再导入数据。
- `equipment-library.json` 是前端装备库主数据。当前范围是官方 3.1.0 唯一装备固定词缀种子，不声明为全量装备库。
- 装备记录必须带结构化 `gameVersion`，以及 `uniquePower`、`fullAffixRanges`、`dropSource`、`verifiedSlot` 的字段级状态。缺失字段显示为待来源回填，不能让玩家误以为页面漏渲染。
- `community-build-overrides.json` 是真实社区 BD 的人工结构化入口，支持 `extends` 复用冲层、速刷、日常变体。
- `build-guides.json` 是前端 BD 主数据，只由脚本生成。
- `aspect-index.json` 从 `build-guides.json` 的装备槽位汇总威能名称、部位、核心度、替换状态和相关 BD。它不是官方全量传奇威能库。
- `build-simulations.json` 是三赛季预测矩阵，只作为参考，不作为事实榜单。
- `site-coverage.json` 是玩家页覆盖摘要，记录 BD、装备、来源、存储层和字段缺口。来源页直接读取它展示当前资料边界。

### 5.2 BD 记录契约

每套 BD 必须满足：

```json
{
  "id": "s14-necromancer-bone_crit-pit_push",
  "taxonomy": {
    "seasonId": "s14",
    "classId": "necromancer",
    "archetypeId": "bone_crit",
    "mode": "pit_push",
    "stageTags": ["后期", "冲层"]
  },
  "summary": {
    "oneLine": "一句话定位",
    "pros": ["优点"],
    "cons": ["短板"],
    "requirements": ["核心需求"],
    "statPriority": ["词缀优先级"]
  },
  "gearSlots": [],
  "skillTree": {},
  "paragon": {},
  "gameplay": {},
  "variants": [],
  "ceiling": {
    "tier": "T1",
    "displayTier": "T1 模板",
    "sourceStatus": "template_reference",
    "confidence": 0.62,
    "evidence": []
  },
  "source": {
    "verificationLevel": "community_reference",
    "references": []
  },
  "dataQuality": {}
}
```

`gearSlots` 必须固定 11 个槽位：

- `helm`
- `chest`
- `gloves`
- `pants`
- `boots`
- `amulet`
- `ring1`
- `ring2`
- `twoHand`
- `mainHand`
- `offHand`

每个槽位必须包含：

- `target`：目标装备或传奇底材。
- `aspect`：威能或特殊效果。
- `core`：是否核心件。
- `replaceable`：是否可替换。
- `affixes`：目标词缀。
- `tempers`：淬炼。
- `masterwork`：精造优先级。
- `sockets`：宝石。
- `alternatives`：至少两个替换方案。

### 5.3 装备记录契约

每件装备至少包含：

- `id`
- `name`
- `zhName`
- `slot` 或推断部位
- `visualType`
- `classRestriction`
- `rarity`
- `guaranteedAffixes`
- `zhGuaranteedAffixes`
- `categories`
- `modeFit`
- `image`
- `externalImage`
- `source`
- `gameVersion`
- `uniquePower`
- `zhUniquePower`
- `fullAffixRanges`
- `dropSource`
- `verifiedSlot`
- `dataStatus`

后续全量化时新增：

- `uniquePowerRanges`
- `codexOrBossSource`
- `tradeable`
- `seasonIntroduced`
- `patchChanges`
- `relatedBuildIds`

### 5.3 数据生命周期和使用边界

站点数据按这条链路进入玩家页面：

```text
外部来源
  -> source-registry 登记来源、日期、可信度和授权边界
  -> 原始/人工结构化数据：equipment-library、community-build-overrides、season-start-plans
  -> 生成层：build-guides、aspect-index、build-simulations、site-coverage
  -> 前端只读渲染：BD 大厅、BD 详情、装备库、威能库、职业页、预测页、来源页
```

字段使用规则：

- 玩家页面只能读取生成后的 JSON 或已登记来源的静态 JSON，不在浏览器里生成新 BD。
- 官方字段、社区字段、预测字段必须保留各自 `sourceStatus` 或 `verificationLevel`。
- 装备库当前是唯一装备固定词缀种子，页面必须持续显示全量范围缺口。
- `BuildVersionSwitcher` 使用 `seasonId + classId + archetypeId` 建组，按 `daily -> speed_farm -> pit_push` 排序；同职业其他社区 BD 只能作为“同职业可抄参考”展示。
- `aspect-index` 来自 BD 装备槽位反查，不声明为官方全量威能库。
- `site-coverage` 是来源页和首页展示资料边界的唯一摘要来源。

后续服务化时，数据库实体也沿用这些边界：

| 实体 | 主要字段 | 前端用途 |
| --- | --- | --- |
| `sources` | `id`、`url`、`trustLevel`、`asOf`、`licenseScope` | 所有事实字段的来源锚点 |
| `items` | `id`、`slot`、`uniquePower`、`affixes`、`dropSource`、字段状态 | 装备库和 BD 装备槽 |
| `aspects` | `id`、`name`、`allowedSlots`、`effect`、字段状态 | 威能索引和装备槽 |
| `builds` | `seasonId`、`classId`、`archetypeId`、`mode`、`sourceStatus` | BD 大厅、详情和职业矩阵 |
| `build_versions` | `buildId`、`mode`、`gearSlots`、`skillTree`、`paragon`、`gameplay` | 同流派版本切换 |
| `leaderboard_samples` | `seasonId`、`classId`、`tier`、`clearTime`、`sourceId` | 150 层预测校准 |
| `analysis_outputs` | `inputSnapshot`、`candidateBuildId`、`reviewStatus` | AI 候选审核，不直接展示给玩家 |

### 5.4 后端数据库演进

静态站足够本地和 GitHub Pages 使用。需要服务化时，建议按以下实体拆分：

```text
sources(id, name, url, trust_level, license_status, captured_at)
patches(id, patch, build_number, release_date, source_id)
classes(id, zh_name, resource, role, enabled_from_patch)
items(id, name, zh_name, rarity, class_id, slot_id, icon_url, source_id)
item_affixes(id, item_id, affix_id, zh_label, min_value, max_value, patch_id)
aspects(id, name, zh_name, allowed_slots, codex_source, source_id)
skills(id, class_id, name, zh_name, tag, resource_cost, cooldown, coefficient_source)
skill_edges(id, skill_id, parent_id, branch_type)
paragon_boards(id, class_id, name, zh_name, attach_points)
paragon_nodes(id, board_id, x, y, node_type, stat, value)
builds(id, season_id, class_id, archetype_id, mode, title, verification_level)
build_gear_slots(id, build_id, slot_id, item_id, aspect_id, core, replaceable)
build_skill_steps(id, build_id, step_order, level_range, action, note)
build_paragon_steps(id, build_id, step_order, board_id, glyph_id, action, note)
build_variants(id, build_id, variant_type, summary)
leaderboard_samples(id, season_id, class_id, build_id, pit_tier, clear_seconds, source_id)
analysis_runs(id, input_hash, model_version, status, created_at)
analysis_outputs(id, run_id, build_id, recommendation, confidence, evidence_json)
```

关键关系：

- 所有事实字段能追溯到 `sources`。
- 构筑主表不直接存长数组，装备、技能、巅峰用有序子表。
- `leaderboard_samples` 校准 150 层速度，不覆盖事实 BD。
- `analysis_outputs` 是候选建议池，经过验证后才能进入 `builds`。

## 6. 数据生产与 AI 分析流程

```text
来源发现
  -> source-registry 登记
  -> 1-2 个代表 BD 人工结构化
  -> build:data 生成
  -> verify 校验 11 槽位/技能/巅峰/中文/来源
  -> 本地截图检查
  -> 扩展同职业或同来源更多 BD
  -> 提交推送
```

AI 分析流程：

1. 输入：官方补丁、装备库、社区 BD、榜单样本、热修、已有伤害模型。
2. 预处理：去重、中文化、字段来源绑定、构筑归类。
3. 计算：词缀权重、装备依赖、成型难度、冲层/速刷/日常适配。
4. 生成：候选 BD、替换建议、速度预测、风险和缺失字段。
5. 校验：必须通过 JSON 契约、来源引用、中文检查和代表性截图。
6. 发布：写入 `community-build-overrides.json` 或后端正式表。

AI 输出禁止项：

- 不允许无来源生成“全量装备信息”。
- 不允许把未来赛季预测标成同赛季验证。
- 不允许输出内部思考过程。
- 不允许覆盖人工已校验来源字段。

## 7. 功能优先级

### P0：资料站基础可用

- 独立 BD 详情页可打开。
- 装备库不卡片重叠，装备详情能读。
- 真实社区 BD 至少覆盖野蛮人、德鲁伊、死灵、游侠、法师、魂灵师代表流派。
- 每套社区 BD 有 11 槽位、技能、巅峰、打法、来源。
- 来源状态和缺失字段清楚。

### P1：玩家决策能力

- 装备详情显示相关 BD。
- 职业页直接跳到该职业 BD。
- BD 详情支持分区导航和移动端锚点。
- 150 层参考页支持按职业、用途、赛季筛选。
- 伤害实验室可以从 BD 带入默认属性。

### P2：全量资料扩展

- 全量暗金和传奇威能文本。
- 技能树精确点数和职业机制。
- 巅峰盘坐标与可视化路径。
- 真实榜单样本导入和速度校准。
- 多来源差异对比。

### P3：服务化和 AI

- 后端数据库和 API。
- 来源抓取任务和审核队列。
- AI 候选分析结果管理。
- 用户收藏、对比、导出和分享。

## 8. 验收标准

每轮实现完成后必须检查：

- `npm run preflight`
- `npm run verify`
- `npm run sample`
- `node --check public/app.js`
- `node --check scripts/generate-build-guides.mjs`
- 本地页面截图：`#builds`、任一 `#bd/<guideId>`、`#equipment`、移动端。
- 敏感信息扫描：不得提交 token、cookie、私钥、个人配置。
- 数据覆盖报告：社区 BD 数量、装备数量、来源状态分布。

页面验收：

- 列表页和详情页分离。
- 装备、技能、巅峰、打法不互相覆盖。
- 所有主要文字为中文。
- 图片有回退图标。
- 预测、模板、社区参考有清晰状态标签。
- 本地静态打开可用；需要服务时使用 `npm run dev`。

## 9. 当前实施判断

截至本设计文档落地时，项目已有：

- `252` 套结构化 BD。
- `278` 条官方 3.1.0 唯一装备固定词缀种子。
- `33` 套 S14 社区来源 BD：`24` 套同赛季社区参考、`9` 套跨赛季社区参考，覆盖野蛮人、德鲁伊、死灵、游侠、法师、魂灵师的代表流派。
- `#home`、`#builds`、`#bd/<guideId>`、`#equipment`、`#item/<itemId>`、`#classes`、`#damage`、`#forecast`、`#sources` hash 路由。

不足：

- 野蛮人仍只有 1 条社区流派覆盖；德鲁伊、死灵、游侠、法师、魂灵师已有 2 条社区流派覆盖；圣骑士和术士仍是未来职业模板。
- 装备库不是全量装备数据库，必须继续导入可审计来源。
- 技能和巅峰仍是结构化路线，不是完整盘面模拟器。
- 150 层速度是参考矩阵，不是实榜结论。
- AI 分析还没有正式的候选池、审核和发布流程。

因此下一步不应继续堆首页，而应按 P0/P1 顺序推进：

1. 补死灵、游侠、法师、魂灵师代表 BD。
2. 优化装备详情和 BD 详情的阅读结构。
3. 增加装备与 BD 的双向关联。
4. 再扩展装备库、技能树和巅峰数据。

## 10. 本轮前端改造规格

本轮只做玩家可见的信息架构和组件重排，不扩写未经来源确认的事实数据。实现必须遵守以下范围：

### 10.1 BD 大厅

- 将玩家入口命名为 `BD` 和 `BD 大厅`，不再使用 `配装规划`、`候选配装`、`模拟器控制台` 等内部工程话术。
- 新增职业快速栏，按当前赛季展示每个职业的 BD 总数和社区来源数量。
- 保留赛季、职业、用途、来源状态筛选，新增排序和关键词搜索。
- BD 列表只展示摘要、强度/难度/来源和技能栏；完整装备、技能、巅峰、打法只能在 `#bd/<guideId>` 查看。

### 10.2 页面组件

本轮落地这些组件形态：

| 组件 | 页面 | 行为 |
| --- | --- | --- |
| `BuildClassRail` | `#builds` | 职业快速切换，显示职业 BD 覆盖和社区来源覆盖 |
| `BuildFilters` | `#builds` | 赛季、职业、用途、来源、排序、关键词筛选 |
| `BuildLibraryList` | `#builds` | 左侧 BD 列表，负责比较和进入详情 |
| `BuildCard` | `#builds` | 展示流派摘要、标签、资料状态和 6 技能栏 |
| `BuildDetailPage` | `#bd/<guideId>` | 继续作为唯一完整 BD 页面，展示装备、技能、巅峰、打法、变体和来源 |
| `EquipmentBrowser` | `#equipment` | 装备库入口，支持职业、用途、部位、状态和 BD 关联筛选 |
| `EquipmentDetailPage` | `#item/<itemId>` | 独立装备详情入口，可直接分享指定装备 |

### 10.3 数据读取与状态

- `#builds` 继续读取 `data/generated/build-guides.json`，筛选逻辑只基于已生成字段。
- 关键词搜索索引只包含标题、职业、流派、用途、阶段标签、需求、词缀优先级、技能、核心暗金和核心威能。
- 排序支持来源优先、150 层上限、成型难度和更新时间；排序不能改变数据质量状态。
- 浏览器端不得生成新的 BD、不得把预测写成事实、不得展示 AI 推理过程。
- `#equipment` 读取 `data/equipment/equipment-library.json` 的 `primarySlot`、`slotCandidates` 和中文部位候选；这些部位来自名称和类型推断，必须用状态 `按名称和类型推断` 展示，不能标成官方槽位。
- 装备与 BD 的关联由前端按 `gearSlots[].target.itemId` 和替换件 `alternatives[].itemId` 反查，列表优先显示已进入 BD 的装备，并在详情中展示相关 BD 链接。
- `#item/<itemId>` 必须直接打开装备详情，并重置筛选到不会隐藏该装备的状态。
- 无同赛季或跨赛季社区来源的 BD，150 层只显示 `模板参考`；只有带 `references[].url/asOf/sourceSeason` 的社区覆盖才能显示社区证据。

### 10.4 验收补充

本轮完成后除通用验收外，还要确认：

- `#builds` 页面没有旧话术：`候选配装`、`配装规划`、`先选目标`、`AI 思考`、`模型推理`。
- BD 大厅和 BD 详情是两个不同阅读层级，列表不再挤满完整攻略。
- 桌面端 `#builds`、`#bd/<guideId>`、`#equipment` 能正常渲染截图。
- 装备库仍明确显示数据边界，不声明为全量装备库。
- 装备库每条记录必须有中文部位候选，详情页必须显示部位、用途、适用场景和相关 BD。
- 装备详情必须显示暗金特效、完整词缀范围、掉落来源、官方槽位的待回填状态。
- 生成数据中不得保留 `rationale` 字段；玩家页面只展示证据、来源、状态和缺口。
