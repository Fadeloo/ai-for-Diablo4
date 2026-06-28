# Harris's Diablo 4 玩家资料站重构设计

本文是正式改页面和数据结构前的执行设计。后续实现必须先对齐这里的页面信息架构、组件边界、数据契约和验收门禁，再进入代码改造。

## 1. 结论

Harris's Diablo 4 要重构成中文暗黑 4 玩家资料站，而不是“配装选择器”或“AI 问答工具”。玩家路径应是：

```text
首页看版本和入口
  -> BD 大厅筛选职业/赛季/用途
  -> 打开完整 BD 详情
  -> 按装备、技能、巅峰、打法、替换方案执行
  -> 需要时跳到装备库、职业开荒、伤害实验室或来源页
```

前端禁止展示内部思考、模型推理、候选分析过程、让用户“先选目标再问构筑”的话术。AI 只能在离线数据生产流程里输出候选结果，经来源校验后进入正式 BD 数据。

当前代码已经有 hash 路由和结构化 BD 数据，但页面还需要继续把“模拟器/候选列表”的表达改成主流游戏资料站的“列表页 + 详情页 + 数据库页”模式。

## 2. 外部参考结论

本轮调研参考了这些公开页面和可抓取结构：

- 暗黑核首页：站点定位包含暗黑 4 攻略、数据库、技能模拟、世界地图、交易市场等功能，说明它是工具型玩家社区，而不是单文章页。
  来源：https://www.d2core.com/
- D4Guides 首页和构筑页：一级导航包含 `Builds`、`Build Planner`、`Database`、`Guides`、`Loot Table`、`Bosses`。构筑详情页包含 `Overview`、`Gear Stats`、`Skill Tree`、`Paragon & Glyphs`、赛季系统、雇佣兵、笔记、视频等段落；装备位展示图标、宝石/符文、词缀、暗金或威能效果、掉落来源。
  来源：https://d4guides.gg/en/loh/ 和 https://d4guides.gg/en/loh/build/spiritborn-verseuchter-schwarm-pestilent-swarm-8c19f210
- Maxroll 构筑页：构筑攻略按 `Equipment`、`Skills`、`Paragon`、`Mercenary`、`FAQ & Mechanics`、`Summary`、`Changelog` 分段；巅峰不仅列盘，还列雕文优先级、低巅峰点过渡和机制注意事项。
  来源：https://maxroll.gg/d4/build-guides/pulverize-druid-guide
- Mobalytics 构筑页：构筑页强调装备、技能循环、职业机制、变体和来源作者/更新时间，适合借鉴“可抄作业”的 BD 信息层级。
  来源：https://mobalytics.gg/diablo-4/builds

借鉴原则：

- 借鉴信息结构和组件模式，不复制第三方文本、图片、样式或受版权保护的素材。
- 详情页优先展示可执行信息：装备槽、加点、巅峰、打法、替换。
- 列表页只做筛选、比较和进入详情，不承载完整 BD。
- 数据库页和构筑页互相跳转。

## 3. 产品范围

### 3.1 必做功能

| 功能 | 玩家问题 | 页面 |
| --- | --- | --- |
| BD 大厅 | 我这个赛季某职业该玩哪些流派？ | `#builds` |
| BD 详情 | 这套 BD 每个部位穿什么，技能巅峰怎么点？ | `#bd/<guideId>` |
| 装备库 | 这个暗金/威能有什么用，哪些 BD 用它？ | `#equipment`，后续 `#item/<itemId>` |
| 职业开荒 | 这个职业从 1 级到终局怎么过渡？ | `#classes` |
| 150 层参考 | 哪些职业冲层/速刷/日常强？ | `#forecast` |
| 伤害实验室 | 词缀取舍为什么这么选？ | `#damage` |
| 来源库 | 这条资料从哪里来，可信度如何？ | `#sources` |

### 3.2 不应该出现在玩家页面的内容

- “AI 思考中”“模型推理”“候选分析”“先选目标再生成”等流程说明。
- 没有来源或数据状态的断言。
- 把未来赛季推演写成已验证事实。
- 把官方词缀种子伪装成全量装备库。
- 在列表页里塞完整 BD 长文。

## 4. 信息架构

```text
SiteShell
  ├─ #home 首页
  │   ├─ 版本边界：当前正式版本 / 预览版本 / 数据更新时间
  │   ├─ 覆盖概览：职业、BD、社区来源 BD、装备种子、缺口
  │   └─ 功能入口：BD、装备、职业、伤害、150 层、来源
  ├─ #builds BD 大厅
  │   ├─ 职业快速栏
  │   ├─ 筛选条：赛季 / 职业 / 用途 / 资料状态 / 阶段 / 关键词
  │   ├─ 排序：强度 / 成型难度 / 150 层参考 / 更新时间 / 来源等级
  │   └─ BD 卡片列表
  ├─ #bd/<guideId> BD 详情
  │   ├─ 顶部概要
  │   ├─ 粘性分区导航
  │   ├─ 总览
  │   ├─ 装备
  │   ├─ 技能
  │   ├─ 巅峰
  │   ├─ 打法
  │   ├─ 变体
  │   ├─ 来源
  │   └─ 更新记录
  ├─ #equipment 装备库
  │   ├─ 筛选和搜索
  │   ├─ 装备列表
  │   ├─ 详情面板
  │   └─ 后续独立装备页 #item/<itemId>
  ├─ #classes 职业开荒
  │   ├─ 职业资源与定位
  │   ├─ 开荒阶段
  │   ├─ 终局流派矩阵
  │   └─ 该职业社区 BD 入口
  ├─ #damage 伤害实验室
  │   ├─ 属性输入
  │   ├─ 乘区拆分
  │   ├─ 词缀对比
  │   └─ 从 BD 带入参数
  ├─ #forecast 150 层参考
  │   ├─ 当前赛季真实/待校准状态
  │   ├─ 未来三赛季推演
  │   └─ 职业速度、冲层、速刷、日常矩阵
  └─ #sources 来源库
      ├─ 官方来源
      ├─ 社区 BD 来源
      ├─ 图标来源
      └─ 授权和可信度状态
```

## 5. 页面设计

### 5.1 首页

首页不是营销页，也不是大段说明。首屏必须直接给玩家入口和数据边界。

模块：

- 品牌标题：`Harris's Diablo 4`
- 版本状态条：当前正式版本、预览补丁、数据更新时间。
- 覆盖数字：总 BD、社区来源 BD、装备种子、真实社区流派数。
- 入口按钮：`查 BD`、`查装备`、`看职业开荒`。
- 当前缺口：用小状态条展示“装备库不是全量”“预测未校准”等，不放大成正文。

### 5.2 BD 大厅

目标是让玩家先找到流派，不在这里读完整攻略。

布局：

```text
职业图标栏
筛选条
排序/视图切换
BD 卡片网格
```

BD 卡片字段：

- 职业、赛季、用途、阶段。
- 流派名和一句话定位。
- 强度层级、150 层参考、成型难度、适用阶段。
- 核心技能图标 6 个。
- 核心暗金/威能最多 4 个。
- 来源状态 badge。
- 明确按钮：`查看完整 BD`。

BD 大厅必须提供资料成熟度筛选：

- `社区可抄`：同赛季或跨赛季社区来源，优先用于实战。
- `同赛季社区参考`：当前赛季社区 BD，可信度最高。
- `跨赛季社区参考`：旧赛季 BD 迁移，需要按补丁和装备变化调整。
- `官方词缀模板`：只说明官方装备词缀种子可形成的结构化模板。
- `未来赛季推演`：只用于预判，不等同已验证事实。

不再使用这些玩家可见命名：

- `候选配装`
- `配装规划`
- `模拟器控制台`
- `先选目标`
- `AI 推荐`

### 5.3 BD 详情

这是最重要的页面，必须达到主流 BD 站可执行标准。

顶部概要：

- 标题：`S14 魂灵师 · 日炎风暴冲层`
- 职业、赛季、用途、阶段、更新时间。
- 来源状态：同赛季社区参考 / 跨赛季参考 / 模板 / 推演。
- 成型难度、冲层上限、速刷效率、开荒可用性。
- 核心技能栏 6 个。
- 核心暗金与威能摘要。

分区导航：

```text
总览 | 装备 | 技能 | 巅峰 | 打法 | 变体 | 来源 | 更新
```

总览分区：

- 一句话定位。
- 优点、短板。
- 成型条件。
- 适用阶段：开荒、成型、冲层、速刷、日常、首领、硬核。
- 资源循环或职业机制说明。

装备分区：

必须固定展示 11 个槽位：

```text
头盔 / 胸甲 / 手套 / 裤子 / 靴子
护符 / 戒指 1 / 戒指 2
双手武器 / 主手 / 副手
```

每个槽位字段：

- 目标装备或传奇底材。
- 暗金特效或威能名称。
- 是否核心、是否硬需求、是否可替换。
- 推荐词缀：必需、强推荐、可选。
- 淬炼、精造、宝石、符文或赛季系统。
- 掉落/来源。
- 替代方案，至少给出原因和代价。
- 数据状态：官方 / 社区 / 推断 / 待回填。

装备视觉：

- 桌面端必须有纸娃娃式 11 槽位装备盘面，并保留每个槽位的明细卡片。
- 移动端单列卡片，卡片内信息分块，不能重叠。
- 图标必须有本地回退图。

技能分区：

- 总览区必须提供技能/巅峰执行路线总览，玩家进入 BD 后能直接看到技能栏、加点顺序和巅峰点击主线。
- 6 个技能栏位。
- 职业机制：如魂灵师 Spirit Hall、法师附魔、死灵亡者之书等。
- 加点顺序：开荒阶段、成型阶段、终局调整。
- 被动优先级。
- 可替换技能和触发条件。
- 资料不足时标明“技能点精确路线待来源回填”，不能伪装成完整盘面。

巅峰分区：

- 巅峰盘顺序。
- 雕文优先级。
- 点击顺序：按 `step` 展示。
- 低巅峰点过渡：50/100/150/200 点。
- 稀有节点属性门槛。
- 后续视觉盘面：盘旋转、节点坐标、雕文半径。

打法分区：

- 总览区必须提供战斗循环总览，玩家进入 BD 后能直接看到起手、主循环、防御、速刷和常见错误。
- 起手。
- 常规循环。
- 精英/首领。
- 防御保命。
- 速刷路线。
- 常见错误。

变体分区：

- Starter：缺关键暗金。
- Speed：速刷改法。
- Push：冲层改法。
- Safe/Hardcore：高容错改法。
- Budget：低成本替代。

来源分区：

- 官方补丁来源。
- 社区 BD 来源。
- 作者、更新时间、来源赛季。
- 本站整理日期。
- 待补全字段。
- 不同来源冲突时的取舍说明。

### 5.4 装备库

装备库不是 BD 列表的附属品，必须成为独立数据库页。

列表字段：

- 图标、中文名、英文名。
- 职业限制、部位、稀有度。
- 关键固定词缀。
- 适用 BD 数量。
- 来源状态。

详情字段：

- 大图标和基础信息。
- 固定词缀、完整词缀范围、暗金特效。
- 掉落来源。
- 适用职业和流派。
- 相关 BD。
- 图标来源和授权状态。
- 数据缺口。

近期静态站阶段可以继续使用右侧详情面板；后续增加 `#item/<itemId>` 独立装备页。

### 5.5 职业开荒

职业页不做“先选职业再问”。它应像职业专题页：

- 职业资源。
- 开荒强势技能。
- 掉落决策：拿到哪些暗金/威能后切换流派。
- 赛季阶段：1-50、50-70、T1-T4、终局。
- 赛季切换：同一职业能在 S14、S15、S16 三季之间查看不同 BD 矩阵。
- 完整流派矩阵：每个流派按日常、速刷、冲层三种用途分列，展示成型难度、阶段、150 层参考、来源状态和核心装备/威能。
- 该职业所有社区来源 BD，并能直接进入 `#bd/<guideId>` 详情页。
- 缺口：该职业尚未导入的主流流派。

### 5.6 150 层参考

该页保留预测能力，但必须显示为参考矩阵，而不是事实榜。

字段：

- 赛季。
- 职业。
- 最佳冲层 BD、最佳速刷 BD、最佳日常 BD。
- 150 层时间参考。
- 置信度。
- 校准状态：真实榜单 / 社区样本 / 模板推演 / 未来赛季推演。
- 风险：补丁、热修、赛季机制、装备缺口。

## 6. 前端组件架构

当前项目是原生 HTML/CSS/JS 静态站，短期不引入框架。先把 `public/app.js` 拆成模块化渲染层，后续迁移 React/Vue 时沿用同样组件边界。

建议目录：

```text
public/
  app.js
  styles.css
  js/
    routes.js
    state.js
    data-repository.js
    labels.js
    components/
      site-shell.js
      source-badge.js
      build-filters.js
      build-card.js
      build-detail.js
      gear-slot-card.js
      skill-route-panel.js
      paragon-route-panel.js
      gameplay-panel.js
      equipment-browser.js
      equipment-detail.js
      class-guide.js
      forecast-table.js
      damage-workbench.js
```

组件清单：

| 组件 | 职责 | 输入 | 输出 |
| --- | --- | --- | --- |
| `SiteShell` | 顶部导航、版本条、hash 路由 | route/version | 当前页面 |
| `SourceBadge` | 统一资料可信度展示 | verification/dataStatus | badge |
| `BuildFilters` | BD 筛选和排序 | guides/filterState | filterState |
| `BuildCard` | BD 大厅卡片 | guide | 核心件、装备替换、技能第一步、巅峰第一步、打法循环、成熟度和详情链接 |
| `SeasonBuildMatrix` | 赛季流派对照矩阵 | guides/filterState | 职业/流派行，日常/速刷/冲层列，展示难度、阶段、上限和来源 |
| `BuildDetailPage` | BD 详情容器 | guideId | 完整详情 |
| `BuildSummaryPanel` | 顶部概要和强弱项 | guide.summary | 摘要 |
| `BuildVersionSwitcher` | 同流派版本切换 | 当前 guide、同赛季同职业同流派 guides | 日常、速刷、冲层版本入口和同职业社区 BD 参考 |
| `BuildManualPanel` | BD 执行手册 | guide.gearSlots / skillTree / paragon / gameplay | 总览首屏汇总 11 装备位、技能加点、巅峰点击和打法流程 |
| `GearSummaryMatrix` | 装备总表 | guide.gearSlots | 11 部位目标件、核心/替换状态、威能或暗金、词缀方向和明细跳转 |
| `GearSlotGrid` | 11 槽位布局 | gearSlots | 槽位网格 |
| `GearSlotCard` | 单槽位装备明细 | gearSlot/item | 装备卡 |
| `SkillRouteMatrix` | 技能路线总表 | skillTree | 6 技能栏、等级段、技能、投入点数和加点原因 |
| `SkillRoutePanel` | 技能栏和加点顺序 | skillTree | 技能路线 |
| `ParagonRouteMatrix` | 巅峰路线总表 | paragon | 盘顺序、雕文、点数阶段和完整点击主线 |
| `ParagonRoutePanel` | 巅峰盘和点击步骤 | paragon | 巅峰路线 |
| `CombatFlowMatrix` | 打法流程总表 | gameplay | 起手、主循环、首领、防御、速刷和常见错误的执行动作 |
| `GameplayPanel` | 起手、循环、防御、错误 | gameplay | 操作指南 |
| `VariantPanel` | 替换与变体 | variants | 变体列表 |
| `EquipmentBrowser` | 装备搜索筛选 | equipment/filterState | 装备列表 |
| `EquipmentDetailPanel` | 装备详情 | item/relatedGuides | 明细 |
| `EquipmentUsageMatrix` | 装备使用矩阵 | item/relatedGuides | 该装备在各 BD 中的职业、流派、用途、部位、核心/替换状态和来源 |
| `ClassGuidePage` | 职业开荒、赛季切换、完整流派矩阵 | class/plans/archetypes/guides | 职业页 |
| `ForecastTable` | 150 层矩阵 | simulations | 排名表 |
| `DamageWorkbench` | 伤害计算 | form/damage model | 拆分结果 |

组件规则：

- 组件只展示传入数据，不在浏览器端生成事实性攻略。
- 任何外链都要带站点名、来源日期或当前整理日期。
- 所有中文标签集中在 `labels.js` 或现有 label map 中，避免英文残留。
- 列表卡片和详情页面不复用同一个大模板，防止信息过密。
- `BuildVersionSwitcher` 只按 `seasonId + classId + archetypeId` 建组；不同流派只能作为同职业参考，不能伪装成同一 BD 的版本。
- `BuildManualPanel` 位于 BD 总览顶部，必须把全身装备、技能顺序、巅峰点击和打法阶段作为可扫描索引先展示出来。
- `GearSummaryMatrix` 是装备分区入口，必须让玩家不展开长卡也能看出每个部位穿什么、是否可替换、核心威能或暗金是什么。
- `SkillRouteMatrix` 和 `ParagonRouteMatrix` 是技能/巅峰分区入口，必须先展示可执行顺序，再展示说明。
- `CombatFlowMatrix` 是打法分区入口，必须先按战斗阶段展示动作，再展示细节说明。

## 7. 视觉系统

目标是暴雪官网式暗黑资料站，而不是 Tesla 风格营销页。

设计 token：

| Token | 值 | 用途 |
| --- | --- | --- |
| `--bg-abyss` | `#050302` | 全站背景 |
| `--bg-panel` | `#11100e` | 面板底 |
| `--bg-stone` | `#19150f` | 分区底 |
| `--line-bronze` | `rgba(214, 173, 99, 0.32)` | 边线 |
| `--line-strong` | `rgba(214, 173, 99, 0.62)` | 重点边线 |
| `--gold` | `#d6ad63` | 标题和按钮 |
| `--gold-bright` | `#f0cf8f` | hover 和重点 |
| `--blood` | `#9f2118` | 冲层、危险、硬需求 |
| `--text-main` | `#f2e8d8` | 主文本 |
| `--text-muted` | `#b6aa98` | 次文本 |

视觉规则：

- 暗色 + 暗金 + 血红只做层级，不用单一紫蓝/奶油色。
- 卡片圆角不超过 8px。
- 详情页分区使用全宽带状模块或独立区块，不做卡片套卡片。
- 装备和技能优先用图标，按钮可以用短文本。
- 页面必须在 1440px、1024px、390px 宽度下无文字重叠。
- 英文长词、中文装备长名都要换行。

## 8. 数据存储设计

### 8.1 当前静态 JSON 层

继续保留：

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
```

短期新增建议：

```text
data/
  normalized/
    items.json
    aspects.json
    skills.json
    paragon-boards.json
    build-sources.json
  quality/
    coverage-report.json
    source-audit.json
```

用途：

- `normalized/*` 存从多个来源归一化后的事实层。
- `quality/*` 存覆盖率和缺口，前端可以读摘要，但不展示内部导入细节。

### 8.2 后端实体模型

后续服务化时使用这些表或等价集合：

```text
sources(id, name, url, category, trust_level, license_status, last_checked_at)
source_snapshots(id, source_id, version, fetched_at, content_hash, parser_version)

items(id, canonical_name, zh_name, rarity, slot_id, class_id, icon_url, source_id, version)
item_affixes(id, item_id, affix_key, zh_name, min_value, max_value, unit, source_id, version)
aspects(id, canonical_name, zh_name, slot_group, effect_text, source_id, version)

skills(id, class_id, canonical_name, zh_name, category, icon_url, source_id, version)
skill_nodes(id, skill_id, node_type, rank_max, parent_id, source_id, version)

paragon_boards(id, class_id, canonical_name, zh_name, source_id, version)
paragon_nodes(id, board_id, node_key, node_type, x, y, effect_text, stat_requirement, source_id, version)
glyphs(id, class_id, canonical_name, zh_name, radius, effect_text, source_id, version)

builds(id, season_id, class_id, archetype_id, mode, title, stage, verification_level, source_id)
build_gear_slots(id, build_id, slot_id, item_id, aspect_id, required, core, replaceable, priority)
build_gear_alternatives(id, build_gear_slot_id, item_id, aspect_id, reason, tradeoff)
build_skill_steps(id, build_id, order_index, level_range, skill_id, points, reason)
build_paragon_steps(id, build_id, order_index, board_id, node_key, glyph_id, reason)
build_variants(id, build_id, variant_type, name, use_case, changes_json)

leaderboard_samples(id, season_id, class_id, build_id, activity, tier, clear_time_seconds, source_id, sample_at)
build_forecasts(id, season_id, class_id, build_id, mode, predicted_time_seconds, confidence, method_version)
analysis_runs(id, run_type, input_hash, model_or_script, created_at, status)
analysis_outputs(id, run_id, build_id, recommendation_json, evidence_json, confidence, publish_status)
publish_audits(id, entity_type, entity_id, checks_json, passed, created_at)
```

关系原则：

- 所有事实字段都要能追溯到 `sources` 或 `source_snapshots`。
- `analysis_outputs` 不能直接给玩家页面用，必须通过审核进入正式 `builds` 或 JSON 覆盖。
- `leaderboard_samples` 只校准 150 层/速刷速度，不反向改写装备事实。
- 每个版本的装备、技能、巅峰可以并存，靠 `version` 和 `season_id` 查询。

### 8.3 BD JSON 契约

每套可展示 BD 必须有：

```json
{
  "id": "s14-spiritborn-sunbird_firestorm-pit_push",
  "title": "S14 死亡觉醒 魂灵师 · 日炎风暴冲层",
  "taxonomy": {
    "seasonId": "s14",
    "classId": "spiritborn",
    "archetypeId": "sunbird_firestorm",
    "mode": "pit_push",
    "stageTags": ["后期", "冲层"]
  },
  "summary": {
    "oneLine": "一句话定位",
    "pros": [],
    "cons": [],
    "requirements": [],
    "statPriority": []
  },
  "gearSlots": [],
  "skillTree": {},
  "paragon": {},
  "gameplay": {},
  "variants": [],
  "source": {
    "verificationLevel": "community_reference",
    "references": []
  },
  "dataQuality": {}
}
```

字段最低要求：

- `gearSlots.length === 11`
- `skillTree.skillBar.length === 6`
- `skillTree.pointOrder.length >= 10`
- `paragon.boardOrder.length >= 4`
- `paragon.clickOrder.length >= 10`
- `gameplay` 至少包含 `opener`、`loop`、`boss`、`defense`
- `variants.length >= 3`
- `source.references` 对社区 BD 必须非空

### 8.4 装备 JSON 契约

每件装备必须有：

- `id`
- `name`
- `zhName`
- `rarity`
- `slot` 或明确 `slot` 待回填状态
- `classRestriction`
- `image` 本地回退
- `externalImage` 可选外链图标
- `guaranteedAffixes`
- `zhGuaranteedAffixes`
- `uniquePower` 或待回填状态
- `dropSource` 或待回填状态
- `relatedBuildIds` 由生成脚本反查
- `source`
- `dataStatus`

装备库页面必须展示“当前不是全量装备库”的边界，直到真正接入全量装备、威能、范围和特效。

## 9. 数据生产流程

```text
1. 来源登记
   -> data/sources/source-registry.json
2. 代表样例导入
   -> 先选 1-2 个职业/流派/装备做完整样本
3. 结构化输入
   -> data/builds/community-build-overrides.json
   -> data/normalized/*.json
4. 生成
   -> npm run build:data
5. 校验
   -> npm run verify
   -> npm run sample
   -> 文案禁用词扫描
   -> 中文化扫描
6. 视觉验证
   -> 桌面和移动端截图
   -> 图标失败请求检查
   -> 文字重叠检查
7. 发布
   -> 敏感信息扫描
   -> git commit
   -> git push
```

导入纪律：

- 新数据源先做代表样例，不直接全量灌入。
- 装备、技能、巅峰、榜单分来源导入，不混在一个 JSON 字段里。
- 第三方图标优先外链引用和本地 fallback，不提交未经授权图片文件。
- 缺少来源的字段标记 `needs_source_backfill`，不隐藏缺口。

## 10. AI 分析边界

AI 的角色：

- 读取已登记来源和结构化样本。
- 归纳候选流派、成型难度、替换路径、未来赛季风险。
- 输出带来源、置信度、缺失字段的候选分析。

AI 不能：

- 直接把结果展示给玩家。
- 直接覆盖 `build-guides.json`。
- 编造装备特效、技能系数、巅峰坐标。
- 把未来赛季预测写成社区验证。

发布流程：

```text
analysis_outputs
  -> 校验脚本
  -> 人工/规则确认
  -> community-build-overrides.json 或正式数据库
  -> build:data
  -> 前端展示
```

## 11. 当前状态审计

截至 2026-06-28 当前工作树：

- `252` 套 BD。
- 资料状态分布：
  - `24` 套同赛季社区参考。
  - `9` 套跨赛季社区参考。
  - `51` 套官方词缀结构化模板。
  - `168` 套未来赛季推演模板。
- `33` 套社区来源 BD 已覆盖装备、技能、巅峰、打法、变体的结构字段。
- 现有结构契约检查通过：所有 BD 都有 11 槽位、6 技能、10+ 技能步骤、10+ 巅峰步骤、打法和 3 个变体。
- 真正社区流派覆盖仍不足：
  - 野蛮人：溶解旋风。
  - 德鲁伊：震波粉碎、音速撕裂。
  - 死灵法师：终极血浪、星界骨魂。
  - 游侠：穿透射击、飞刀舞。
  - 法师：烈焰电荷弹、连锁闪电。
  - 魂灵师：风暴羽毛闪避、日炎风暴。
- 装备库当前是 `278` 条官方 3.1.0 唯一装备固定词缀种子，不是全量装备库。

## 12. 实施顺序

### P0：设计锁定

本文件完成后，后续改动按这里执行。

交付：

- `docs/PLAYER_SITE_REDESIGN_PLAN.md`
- README 和相关架构文档指向本文件。

### P1：页面信息架构重构

目标：先让页面像游戏资料站。

任务：

- 把 `#builds` 从 `simulator-console/planner-grid/build-candidates` 改为 `build-library-shell`。
- 去掉玩家可见的 `候选配装`、`配装规划`、`模拟器` 等命名。
- BD 大厅增加职业图标栏、排序、关键词搜索、来源状态筛选。
- BD 详情改为顶部概要 + 粘性分区导航 + 详情分区。
- 装备库列表和详情不挤压，移动端单列。
- `#classes` 改成职业专题页，不使用“先选职业”语义。

验收：

- `rg -n "候选配装|配装规划|先选目标|AI 思考|模型推理|问构筑|模拟器控制台" index.html public`
  没有玩家可见命中。
- 桌面和移动端打开 `#builds`、一个 `#bd/*`、`#equipment` 无重叠。

### P2：组件拆分和数据访问层

目标：降低 `public/app.js` 单文件复杂度。

任务：

- 新增 `public/js/data-repository.js` 统一加载 JSON。
- 新增 `public/js/routes.js` 管理 hash 路由。
- 逐步拆出 BD、装备、职业、预测、伤害组件。
- 所有 label 和状态映射集中。

验收：

- `node --check` 覆盖所有 JS 模块。
- `npm run verify` 通过。
- 页面截图与 P1 功能等价或更好。

### P3：装备库升级

目标：从“词缀种子”升级成可用装备百科。

任务：

- 补 `slot`、`uniquePower`、`dropSource`、`fullAffixRanges`。
- 装备详情显示相关 BD。
- 新增 `#item/<itemId>` 路由。
- 数据状态按字段展示。

验收：

- 每件装备至少能区分已确认字段和待回填字段。
- 相关 BD 反查正确。

### P4：BD 内容扩充

目标：每个职业覆盖多个主流社区流派。

优先顺序：

1. 野蛮人补至少 2 个社区流派。
2. 每个现有职业补到至少 3 个社区流派。
3. 冲层、速刷、日常变体分别维护。
4. 每个来源先做 1 个代表 BD 样例，再批量扩展。

验收：

- 每个非未来职业至少 3 个社区流派。
- 每套社区 BD 有来源链接、装备 11 槽、技能、巅峰、打法、变体。

### P5：巅峰和技能可视化

目标：从文字顺序升级到可视化盘面。

任务：

- 导入技能树节点。
- 导入巅峰盘、节点坐标、雕文半径。
- BD 详情支持“文字顺序”和“盘面视图”切换。

验收：

- 节点坐标和点击顺序一致。
- 低巅峰点过渡可独立显示。

### P6：服务化和 AI 审核流

目标：把数据生产从手工 JSON 扩展为可审核后台。

任务：

- 建 sources/items/builds/leaderboard_samples/analysis_outputs 等实体。
- AI 候选分析进入审核队列。
- 发布后生成静态快照给前端。

验收：

- AI 输出不直接出现在玩家页。
- 每条发布资料有审计记录。

## 13. 验收门禁

每次实现后都跑：

```bash
npm run preflight
npm run build:data
npm run verify
npm run sample
git diff --check
```

必要扫描：

```bash
rg -n "候选配装|配装规划|先选目标|AI 思考|模型推理|问构筑|模拟器控制台|rationale" index.html public data/generated
rg -n "(AKIA[0-9A-Z]{16}|g(hp|ithub_pat)_|s[k]-|BEGIN PRIVATE[ ]KEY|xox[baprs]-)" -g "!tmp/**" .
```

视觉验证：

- `#builds` 桌面 1440px。
- 至少 1 个社区来源 `#bd/<guideId>` 桌面和移动端。
- `#equipment` 搜索装备后桌面和移动端。
- 检查：无文字重叠、无空白主视图、无 broken image、无 console error。

完成标准：

- 玩家能从 BD 大厅进入完整 BD 详情。
- 详情页可直接照着配装、加点、点巅峰和打循环。
- 装备库能独立检索和阅读。
- 页面没有内部推理或 AI 过程文案。
- 所有事实字段有来源或状态。
