# Harris's Diablo 4 架构设计

继续开发前的总控设计见 `docs/SYSTEM_DESIGN.md`，实施基线见 `docs/SITE_IMPLEMENTATION_DESIGN.md`。正式玩家资料站重构见 `docs/PLAYER_SITE_REDESIGN_PLAN.md`，它定义信息架构、页面组件、数据存储、AI 边界、实施顺序和验收门禁。完整产品蓝图见 `docs/PRODUCT_BLUEPRINT.md`。本文保留当前工程架构和脚本分层，作为实现入口。

## 目标

本站按“玩家查资料、抄 BD、改配装、看来源”的路径设计，不再把装备、预测和攻略全部压在一个页面里。前端只负责展示和交互，数据生成、来源治理、中文化、评分与校验都放在脚本和结构化数据层完成。

## 信息架构

```text
首页
  ├─ BD 大厅：按赛季、职业、用途、数据状态筛选
  ├─ BD 详情：装备槽位、技能加点、巅峰路线、打法、替换件、来源
  ├─ 装备库：装备检索、固定词缀、用途、来源状态、图标引用
  ├─ 职业开荒：每个职业的升级阶段、资源、关键方向
  ├─ 伤害实验室：输入属性后查看期望伤害拆分
  ├─ 150 层参考：未来三个赛季窗口的冲层、速刷、日常参考
  └─ 来源与边界：官方、社区、图标、开源资料的可信度说明
```

路由使用 hash 模式，当前页面包括 `#home`、`#builds`、`#bd/<guideId>`、`#equipment`、`#classes`、`#damage`、`#forecast` 和 `#sources`。后续如果接入后端，可以保持同样的 view model 字段，把静态 JSON 替换为 API。

## 视觉和组件方向

目标风格是暴雪官网式的暗色游戏资料站：黑金底色、厚重金属边线、装备图标、分区页签和可展开详情。页面不做营销落地页，第一屏就展示可用入口和当前版本状态。

核心组件：

- `SiteShell`：顶部导航、版本状态、移动端折叠菜单。
- `HeroStatus`：站点名称、版本基线、资料边界和关键入口。
- `BuildFilters`：赛季、职业、用途、数据状态筛选。
- `BuildLibraryList`：BD 列表，展示来源状态、用途、成型难度和详情入口。
- `BuildOverviewCard`：BD 摘要、核心装备、核心威能和 150 层参考。
- `BuildGuideDetail`：独立 BD 详情页，按装备、技能、巅峰、打法、变体、来源分区。
- `GearSlotGrid`：全身 11 个槽位，固定展示目标件、是否核心、是否可替换、替代方案。
- `SkillRoutePanel`：技能栏、技能加点顺序、被动优先级。
- `ParagonRoutePanel`：巅峰盘顺序、雕文、点击顺序和阶段说明。
- `EquipmentBrowser`：装备库筛选、装备卡片和展开详情。
- `SourceBadge`：官方、社区参考、结构化模板、待回填等状态标记。
- `DamageWorkbench`：伤害输入、结果拆分和计算边界。

组件设计优先使用资料站常见模式：列表页负责筛选和比较，详情页负责展开完整信息；装备、技能、巅峰都作为独立分区展示，避免文字和数据挤在同一个卡片里。

## 数据分层

```text
外部来源
  ├─ 官方补丁说明
  ├─ 官方赛季介绍
  ├─ 社区 BD / Planner
  ├─ 社区数据库和图标 URL
  └─ 后续真实榜单样本

人工登记层 data/
  ├─ sources/source-registry.json
  ├─ metadata/version-baseline.json
  ├─ classes/classes.json
  ├─ builds/archetypes.json
  ├─ builds/season-start-plans.json
  ├─ builds/community-build-overrides.json
  └─ equipment/*.json

生成层 data/generated/
  ├─ official-3.1.0-guaranteed-unique-affixes.json
  ├─ d4builds-icon-index.json
  ├─ build-simulations.json
  └─ build-guides.json

前端读取层 public/app.js
  ├─ 加载 JSON
  ├─ 按路由和筛选生成视图
  └─ 展示来源状态，不在浏览器临时编造攻略数据
```

`data/builds/community-build-overrides.json` 是真实 BD 回填入口。它允许用社区来源覆盖生成模板，并支持 `extends` 继承同一套 BD 的冲层、速刷、日常变体，避免重复维护 11 个装备槽位。

## BD 数据契约

每套 BD 必须包含：

- `taxonomy`：赛季、职业、流派、用途、阶段标签。
- `summary`：一句话说明、优点、短板、需求件和词缀优先级。
- `gearSlots`：全身 11 个位置，每个位置包含目标件、威能/特效、核心状态、替换状态、词缀、淬炼、精造、宝石和替代方案。
- `coreUniques` 与 `coreAspects`：详情页顶部快速摘要。
- `skillTree`：6 个技能栏、加点顺序、被动优先级。
- `paragon`：盘顺序、雕文、点击顺序和说明。
- `gameplay`：起手、循环、首领、防御、速刷和常见错误。
- `variants`：缺件、速刷、高层生存等替换版本。
- `source.references` 与 `dataQuality`：来源和可信度，不把模板数据伪装成社区实战结论。

## 脚本职责

- `scripts/preflight.mjs`：检查关键文件、运行环境和数据入口。
- `scripts/fetch-official-patch.mjs`：抓取官方补丁说明中的唯一装备固定词缀种子。
- `scripts/fetch-d4builds-icons.mjs`：登记外部图标 URL，不下载或提交第三方图片。
- `scripts/build-equipment-library.mjs`：生成中文装备库种子。
- `scripts/generate-build-simulations.mjs`：生成未来三赛季参考矩阵。
- `scripts/generate-build-guides.mjs`：把职业、流派、装备、预测和社区覆盖合成为 BD 详情数据。
- `scripts/verify.mjs`：校验中文化、来源、装备槽位、技能、巅峰、前端禁用文案和代表性伤害样例。
- `scripts/run-sample.mjs`：输出代表性伤害和配装评分样例。

## 后续后端/存储演进

静态 JSON 当前足够支持本地打开和公开仓库。真正做成服务后，建议增加以下实体：

- `sources`：来源、可信度、授权状态、抓取时间。
- `items`：装备基础信息、职业、部位、稀有度、图标、版本。
- `item_affixes`：词缀名称、范围、来源版本、是否固定词缀。
- `aspects`：传奇威能、可用部位、地下城/法典来源、数值范围。
- `skills`：技能、标签、系数、资源、冷却、强化分支。
- `paragon_nodes`：盘、节点、坐标、雕文半径、路径关系。
- `builds`：BD 主记录、职业、赛季、用途、来源状态。
- `build_gear_slots`：BD 的 11 个装备位和替换件。
- `build_skill_steps`：技能加点顺序。
- `build_paragon_steps`：巅峰点击顺序。
- `leaderboard_samples`：真实冲层、速刷、首领样本。

AI 分析不直接写前端展示层。推荐做成离线任务：读取来源和样本，输出带来源、置信度、缺失字段的 `build-analysis` 结果，再由人工或校验脚本决定是否进入 `community-build-overrides.json` 或后端表。

## 质量门槛

每次新增数据或页面必须通过：

- `npm run preflight`
- `npm run verify`
- `npm run sample`
- 前端截图或本地打开检查，确认列表页、详情页、移动端和图标回退正常。
- 敏感信息扫描，确认公开仓库不含 token、密钥或私有配置。

## 当前边界

截至 2026-06-28，装备库仍是官方 3.1.0 补丁页可追溯的唯一装备固定词缀种子，不是全量暗黑4装备数据库。三赛季和 150 层速度是参考矩阵，赛季上线后需要用真实榜单、热修和更多社区 BD 继续校准。
