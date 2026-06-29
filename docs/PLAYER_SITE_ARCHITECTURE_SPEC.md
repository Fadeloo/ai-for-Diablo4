# Harris's Diablo 4 玩家站整体架构规格

本规格用于本轮重构。先按这里定义页面、组件、功能和数据边界，再进入代码改造。目标不是再加一个大页面，而是把项目整理成主流游戏资料站：列表页负责筛选和比较，详情页负责完整执行信息，数据库页负责查事实和来源。

## 1. 产品定位

Harris's Diablo 4 是中文暗黑 4 玩家资料站，核心任务有四个：

- 抄 BD：按赛季、职业、用途进入完整构筑详情，能看到装备、技能、巅峰、打法、替换和来源。
- 查数据库：装备、威能、后续技能与巅峰节点都能独立检索，并能反查相关 BD。
- 看预测：三赛季冲层、速刷、日常参考必须标注预测状态、置信度和校准风险。
- 算收益：伤害实验室解释词缀、乘区、暴击、易伤、压制、攻速等收益来源。

玩家页面不展示内部推理、问答流程或“候选生成”措辞。AI 只作为离线分析环节，输出必须通过来源登记、结构化校验和发布审核后才进入玩家可见 JSON。

## 2. 设计语言

方向是暴雪官网式暗黑资料站，而不是营销落地页：

- 黑石底、暗金边线、血红风险色、厚重分隔线和装备图标。
- 首屏展示功能入口和资料状态，不做空泛品牌说明。
- 结构靠导航、页签、表格、徽章、槽位盘面和来源状态建立层级。
- 不复制暴雪或第三方网站的受保护素材，只复用暗黑题材常见的组件模式。

设计 token 继续沿用当前 CSS 的暗黑黑金体系：

| Token | 用途 |
| --- | --- |
| `--obsidian` | 全站背景 |
| `--panel` / `--panel-soft` | 面板和列表底 |
| `--line` / `--line-strong` | 暗金边线和强边线 |
| `--gold` / `--gold-bright` | 标题、按钮、重点状态 |
| `--blood` / `--blood-dark` | 硬需求、冲层、风险 |
| `--bone` / `--muted` / `--dim` | 主文本、次文本、弱文本 |

## 3. 信息架构

```text
SiteShell
  ├─ #home 首页
  ├─ #builds BD 大厅
  ├─ #bd/<guideId> BD 详情
  ├─ #equipment 装备库
  ├─ #item/<itemId> 装备详情语义路由
  ├─ #aspects 威能索引
  ├─ #aspect/<aspectId> 威能详情语义路由
  ├─ #classes 职业开荒
  ├─ #damage 伤害实验室
  ├─ #forecast 150 层参考
  └─ #sources 来源与边界
```

页面职责：

- 首页只放版本状态、覆盖概览和核心入口。
- BD 大厅默认展示推荐入口和结果列表；职业矩阵、赛季矩阵作为切换视图，不再同屏铺满。
- BD 详情必须独立阅读，分为总览、开荒、装备、技能、巅峰、打法、替换、来源。
- 装备库默认是列表 + 详情；`#item/<itemId>` 用于分享和从 BD 跳转。
- 威能索引只展示已经派生或匹配到来源的威能，不声明为全量传奇威能库。
- 职业页是职业专题，不是“选择职业后生成答案”。
- 预测页只显示参考矩阵，不把未来赛季推演写成已验证事实。
- 来源页展示数据如何存、如何用、哪些字段缺口仍存在。

## 4. 前端组件树

短期继续使用原生 HTML/CSS/JS，组件以渲染函数和 CSS 模块边界实现。后续迁移 React/Vue 时保持同样领域边界。

```text
SiteShell
  ├─ GlobalHeader
  ├─ PatchStatusBar
  ├─ RouteOutlet
  └─ Shared
      ├─ SourceBadge
      ├─ DataStatusBadge
      ├─ ClassBadge
      ├─ ItemIcon
      ├─ PageHeader
      ├─ SplitPane
      ├─ ResultList
      └─ EmptyState

BuildsPage
  ├─ BuildClassRail
  ├─ BuildFilterBar
  ├─ BuildViewTabs
  ├─ RecommendedBuildBoard
  ├─ SeasonBuildMatrix
  └─ BuildResultsList

BuildDetailPage
  ├─ BuildHeader
  ├─ StickySectionNav
  ├─ BuildChapterIndex
  ├─ OverviewSection
  │   ├─ BuildManualPanel
  │   ├─ ExecutionPlan
  │   └─ CombatOverview
  ├─ ProgressionSection
  ├─ EquipmentSection
  │   ├─ LoadoutBoard
  │   ├─ GearSummaryMatrix
  │   └─ GearSlotGrid
  ├─ SkillsSection
  │   ├─ SkillRouteMatrix
  │   └─ SkillEffectList
  ├─ ParagonSection
  │   ├─ ParagonRouteMatrix
  │   └─ GlyphPriorityList
  ├─ GameplaySection
  │   └─ CombatFlowMatrix
  ├─ VariantSection
  │   ├─ ReplacementMatrix
  │   └─ VariantCards
  └─ SourcesSection

EquipmentPage
  ├─ EquipmentFilterBar
  ├─ EquipmentResultsList
  ├─ EquipmentDetailPanel
  └─ EquipmentUsageMatrix

AspectPage
  ├─ AspectFilterBar
  ├─ AspectResultsList
  └─ AspectDetailPanel
```

关键约束：

- `BuildResultsList`、`EquipmentResultsList`、`AspectResultsList` 必须有分页、固定视窗或“显示更多”，不能一次铺到移动端数万像素。
- `BuildHeader` 只放标题、来源、难度、核心入口和关键指标；纸娃娃装备盘面移到装备分区。
- `BuildChapterIndex` 是 BD 详情页固定骨架，必须展示装备、技能、巅峰、打法、替换、来源六个玩家章节的完成度、计数和直达入口。
- `BuildDetailPage` 内所有区块都能独立阅读，装备、技能、巅峰、打法不能挤在同一张大卡里。
- `#item/<itemId>` 和 `#aspect/<aspectId>` 继续复用对应数据库页，但 URL 必须选中详情并把主要信息置顶。
- 所有按钮和跳转文案使用玩家语言，例如“查看完整 BD”“装备页”“看技能分区”，不出现内部模型措辞。

## 5. 功能矩阵

| 模块 | 第一版必须具备 | 后续增强 |
| --- | --- | --- |
| BD 大厅 | 赛季、职业、用途、来源、关键词筛选；推荐/矩阵/列表视图；详情跳转 | 收藏、对比、真实榜单排序 |
| BD 详情 | 11 装备位、技能顺序、巅峰顺序、打法、替换、来源 | 视频、作者版本、导出 planner |
| 装备库 | 278 条唯一装备检索、图标、固定词缀、暗金特效、掉落、相关 BD | 全量传奇/稀有底材、交易与掉落表 |
| 威能索引 | BD 派生威能、暗黑核匹配效果、相关 BD | 全量法典、地下城来源、数值范围 |
| 职业开荒 | 职业资源、阶段路线、流派矩阵、BD 入口 | 职业专题图标、赛季机制切换 |
| 150 层参考 | 三赛季职业/用途预测、置信度、风险 | 真实榜单样本、热修校准 |
| 伤害实验室 | 手动输入并显示乘区拆分 | 从 BD 带入默认值、词缀对比 |
| 来源页 | 来源登记、覆盖率、存储层、字段缺口 | 导入审计、来源冲突历史 |

## 6. 数据存储分层

当前项目保持静态 JSON，但逻辑上分成四层。

```text
事实层 data/
  sources/source-registry.json
  metadata/version-baseline.json
  classes/classes.json
  equipment/equipment-library.json
  aspects/d2core-aspect-library.json
  aspects/community-aspect-overrides.json
  equipment/community-unique-overrides.json

构筑层 data/builds/
  archetypes.json
  season-start-plans.json
  community-build-overrides.json

生成视图层 data/generated/
  build-guides.json
  equipment-library view fields
  aspect-index.json
  build-simulations.json
  site-coverage.json

质量层 scripts/verify.mjs + site-coverage.json
  storageLayers
  frontendDataContracts
  buildIntegrity
  equipmentCoverage
  aspectCoverage
  sourceCoverage
```

后续规范化目录建议：

```text
data/normalized/
  items.json
  item-affixes.json
  item-powers.json
  aspects.json
  skills.json
  skill-nodes.json
  paragon-boards.json
  paragon-nodes.json
  glyphs.json
  builds.json
  build-gear-slots.json
  build-skill-steps.json
  build-paragon-steps.json
  prediction-runs.json
```

字段原则：

- 每个事实字段必须带来源、版本、状态或继承父记录的来源状态。
- 社区数据和预测数据不能覆盖官方事实，只能作为并列证据。
- 生成视图 JSON 可以为前端冗余字段，但不得成为事实源头。
- 装备库当前只能声明为“唯一装备资料库种子”，不能写成全量装备库。
- `d2core-aspect-library.json` 是暗黑核 71886 构建的中文威能社区快照，保存名称、效果、类型、可用部位、图标 URL 和来源 URL；使用状态是 `needs_validation`，只能为玩家页提供效果文本和交叉校验。
- 威能索引当前只能声明为“从 BD 派生并匹配社区威能库的构筑威能索引”，不能写成官方全量威能库。没有明确匹配的泛化威能名必须继续显示待校验状态。
- 技能和巅峰目前是 BD 执行路线，后续需要独立事实表承载技能效果、资源、冷却、节点坐标和雕文半径。

## 7. 后端实体模型

服务化时建议使用这些表或等价集合：

```text
sources(id, name, url, category, trust_level, license_status, last_checked_at)
source_snapshots(id, source_id, fetched_at, content_hash, parser_version)

items(id, canonical_name, zh_name, rarity, slot_id, class_id, icon_url, version_id)
item_affixes(id, item_id, affix_key, zh_name, min_value, max_value, unit, source_id)
item_powers(id, item_id, effect_text, value_range_json, source_id)
aspects(id, canonical_name, zh_name, aspect_type, effect_text, allowed_slots_json, source_id)

skills(id, class_id, canonical_name, zh_name, category, icon_url, source_id)
skill_nodes(id, skill_id, node_type, rank_max, parent_id, effect_text, source_id)

paragon_boards(id, class_id, canonical_name, zh_name, source_id)
paragon_nodes(id, board_id, node_key, node_type, x, y, effect_text, stat_requirement, source_id)
glyphs(id, class_id, canonical_name, zh_name, radius, effect_text, source_id)

builds(id, season_id, class_id, archetype_id, mode, title, verification_level, source_id)
build_gear_slots(id, build_id, slot_id, item_id, aspect_id, required, core, replaceable, priority)
build_skill_steps(id, build_id, order_index, level_range, skill_id, points, reason)
build_paragon_steps(id, build_id, order_index, board_id, node_key, glyph_id, reason)
build_rotation_steps(id, build_id, phase, order_index, action_text)
build_variants(id, build_id, variant_type, name, changes_json)

leaderboard_samples(id, season_id, class_id, build_id, activity, tier, clear_time_seconds, source_id)
prediction_runs(id, season_id, input_hash, method_version, created_at)
prediction_results(id, run_id, build_id, mode, predicted_time_seconds, confidence, risk_json)
analysis_outputs(id, run_id, build_id, recommendation_json, evidence_json, publish_status)
publish_audits(id, entity_type, entity_id, checks_json, passed, created_at)
```

发布规则：

- `analysis_outputs.publish_status !== "approved"` 的内容不能进入前端。
- 预测必须保留 `prediction_run_id`、输入快照 hash 和方法版本。
- 榜单样本只用于校准，不直接改写装备、技能或威能事实。

## 8. 本轮实施边界

本轮先解决“看不清、页面太长、详情挤在一个页面”的问题：

1. 新增并引用本规格文档。
2. BD 大厅增加视图切换，默认只显示推荐入口和紧凑结果列表。
3. 装备库和威能索引改为资料站 split-pane：列表区域限高/分页，详情区独立阅读。
4. BD 详情压缩首屏，纸娃娃盘面进入装备分区；保留粘性分区导航。
5. 移动端改为横向职业/状态 rail、单列卡片、详情优先。
6. `site-coverage.json` 增加本规格对应的数据层和组件契约说明。

不在本轮做的事：

- 不把 278 条唯一装备伪装成全量装备数据库。
- 不下载第三方图标进仓库，继续使用外链 + 本地回退。
- 不把预测写成真实榜单。
- 不引入后端或登录系统。
- 不公开任何 token、密钥或私有配置。

## 9. 配置首页落地设计

`#bd/<guideId>/planner` 是玩家打开一套 BD 后默认进入的抄作业首页。它不是另一个资料堆叠页，而是把玩家开打前必须核对的内容按优先级压缩成四层：

```text
PlannerPage
  ├─ PlannerHeader
  │   └─ 装备位数量 / 硬需求 / 可替换 / 150 层参考
  ├─ PlannerSectionNav
  │   └─ 装备明细 / 技能加点 / 巅峰点击 / 打法流程 / 替换方案
  ├─ LoadoutOverview
  │   └─ 11 部位图标速览，先确认目标件和核心位
  ├─ PlannerRouteOverview
  │   ├─ 六技能栏
  │   ├─ 技能加点前 3 步
  │   ├─ 巅峰点击前 3 步
  │   └─ 起手 / 循环 / 防御第一条
  └─ PlannerDetailLayout
      ├─ GearSlotGrid
      └─ RouteStack
```

组件职责：

- `LoadoutOverview` 只负责“全身先看齐”，用 11 个槽位图标和名称降低玩家对照成本。
- `PlannerRouteOverview` 负责“先怎么点、先怎么打”，不替代技能页和巅峰页，只给最短可执行路线。
- `GearSlotGrid` 继续保留每个部位的词缀、淬炼、精造、宝石和替换。
- `RouteStack` 继续展示完整技能顺序、巅峰顺序和打法速查。

交互约束：

- 默认路由仍是 `#bd/<guideId>/planner`。
- 速览区内只能使用玩家能直接执行的文字，例如“技能加点前 3 步”“巅峰点击前 3 步”“打法起手”。
- 速览区必须提供到装备、技能、巅峰、打法分区的稳定链接。
- 桌面端速览使用多列信息面板；移动端单列显示，禁止文字覆盖图标或卡片边界。
- 自动验证必须检查配置首页同时包含装备图标、技能起步、巅峰起步和打法入口。

## 10. 验收门禁

每次提交前必须通过：

```text
npm run preflight
npm run build:data
npm run verify
npm run sample
git diff --check
```

视觉验收：

- 桌面和移动端截图检查 `#home`、`#builds`、`#equipment`、`#aspects`、代表性 `#bd/<guideId>`。
- 移动端不得出现文字覆盖、超宽表格、按钮文本溢出。
- 装备/威能列表不得把页面撑到不可阅读的长度。
- BD 详情首屏必须能看到标题、来源、关键指标和分区导航。

安全验收：

- 不提交 `.env`、token、cookie、Authorization 头、私钥。
- `tmp/`、抓取缓存、截图产物不进入提交。
- 外部图片只存 URL 和来源状态。
