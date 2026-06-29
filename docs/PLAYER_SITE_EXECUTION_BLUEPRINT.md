# Harris's Diablo 4 玩家站执行蓝图

本文是继续实现前的冻结蓝图。它把玩家网站拆成页面、组件、功能、数据存储和发布流程五个层级；后续代码改造必须让当前实现逐步靠近这里，而不是继续把所有资料塞进单页。

## 1. 参考结论

参考对象：

- 暗黑核：工具型玩家社区，核心价值是攻略、数据库、技能模拟和构筑资料入口。
- 暴雪《暗黑破坏神 IV》官网：适合借鉴暗黑题材的职业切换、厚重分区、暗金/血红视觉层级和大图标组件。
- D4Guides、Maxroll、Mobalytics：适合借鉴 BD 详情的信息层级，即装备、技能、巅峰、打法、变体、来源分区，而不是把完整攻略放在列表卡片里。

采用原则：

- 借鉴信息架构和组件模式，不复制第三方文案、图片、CSS 或受保护素材。
- 列表页只负责筛选、比较和进入详情。
- 详情页必须给可执行 BD：11 个装备位、技能加点顺序、巅峰点击顺序、打法、替换、来源。
- 数据库页必须能反查相关 BD。
- 玩家页面不展示内部推理、候选生成、问答流程或“先选目标”类话术。

## 2. 页面蓝图

| 页面 | 路由 | 首屏目标 | 必备模块 |
| --- | --- | --- | --- |
| 首页 | `#home` | 看版本边界和功能入口 | 版本条、覆盖概览、BD/装备/职业/预测/伤害入口、资料缺口 |
| BD 大厅 | `#builds` | 按赛季、职业、用途找到可进入详情的流派 | 职业栏、筛选条、推荐入口、赛季矩阵、结果列表 |
| BD 详情 | `#bd/<guideId>` | 抄完整 BD | 顶部概要、分区导航、总览、装备、技能、巅峰、打法、变体、来源 |
| 装备库 | `#equipment` / `#item/<itemId>` | 查装备事实和相关 BD | 筛选列表、装备详情、固定词缀、暗金特效、掉落、使用矩阵 |
| 威能索引 | `#aspects` / `#aspect/<aspectId>` | 查 BD 中用到的威能和来源状态 | 筛选列表、威能效果、可用部位、关联 BD |
| 职业开荒 | `#classes` | 看职业阶段路线和流派矩阵 | 职业定位、阶段路线、用途矩阵、社区 BD 入口 |
| 150 层参考 | `#forecast` | 看冲层/速刷/日常强度参考 | 赛季矩阵、职业速度、置信度、风险、校准状态 |
| 伤害实验室 | `#damage` | 解释词缀和乘区收益 | 输入表单、乘区拆分、词缀对比、BD 参数入口 |
| 来源页 | `#sources` | 看资料如何存储和可信边界 | 来源登记、覆盖率、组件契约、字段缺口、发布规则 |

## 3. BD 详情组件蓝图

`BD 详情` 是核心页面，必须按主流攻略站方式分区。

| 组件 | 必须展示 | 输入字段 |
| --- | --- | --- |
| `BuildHeader` | 标题、职业、赛季、用途、阶段、来源、成型难度、150 层参考 | `title`、`taxonomy`、`formationDifficulty`、`ceiling`、`source` |
| `BuildDossier` | 核心装备、核心威能/暗金、六技能栏、巅峰起步、打法节奏、替换状态 | `gearSlots`、`skillTree`、`paragon`、`gameplay` |
| `BuildSectionNav` | 总览、开荒、装备、技能、巅峰、打法、变体、来源 | 稳定分区配置 |
| `BuildManualPanel` | 全身装备、技能第一步、巅峰第一步、打法循环的速查索引 | `gearSlots`、`skillTree.pointOrder`、`paragon.clickOrder`、`gameplay.loop` |
| `ProgressionPlan` | 1-35、35-60、60+、用途专精的过渡路线 | `progression.stages`、`progression.checkpoints` |
| `LoadoutBoard` | 纸娃娃 11 槽位盘面 | `gearSlots` |
| `GearSummaryMatrix` | 每个部位穿什么、是否核心/可替换、威能或暗金、词缀方向 | `gearSlots` |
| `GearSlotGrid` | 每个槽位目标件、替换、词缀、淬炼、精造、宝石、来源 | `gearSlots[]` |
| `SkillRouteMatrix` | 六技能栏、等级段、加点顺序、点数、原因 | `skillTree.skillBar`、`skillTree.pointOrder` |
| `ParagonRouteMatrix` | 盘顺序、雕文、点数阶段、点击主线 | `paragon.boardOrder`、`paragon.clickOrder`、`paragon.pointBands` |
| `CombatFlowMatrix` | 起手、主循环、首领、防御、速刷、常见错误 | `gameplay` |
| `ReplacementMatrix` | 11 部位可替换状态、首选替换、代价 | `gearSlots[].alternatives` |
| `SourceReferences` | 官方/社区链接、来源赛季、更新时间、字段缺口 | `source.references`、`dataQuality` |

## 4. 功能矩阵

| 能力 | P0 必须完成 | P1 增强 | P2/P3 服务化 |
| --- | --- | --- | --- |
| BD 大厅 | 筛选、排序、推荐入口、详情跳转 | 收藏、对比、职业专题跳转 | 用户画像推荐 |
| BD 详情 | 11 装备位、技能、巅峰、打法、替换、来源 | 导出、版本切换、视频 | 用户改装和分享 |
| 装备库 | 278 条唯一装备种子、图标、词缀、特效、掉落、相关 BD | 全量传奇/普通装备、范围值 | 装备 API 和索引 |
| 威能索引 | BD 派生威能、暗黑核匹配效果、相关 BD | 全量法典和来源 | 多来源冲突对比 |
| 职业开荒 | 阶段路线、职业流派矩阵、BD 入口 | 赛季机制切换 | 个性化开荒路径 |
| 150 层参考 | 三赛季冲层/速刷/日常参考和风险 | 榜单样本校准 | 自动预测任务 |
| 伤害实验室 | 手动输入和乘区拆分 | 从 BD 带入默认值 | 服务端模拟批处理 |
| 来源治理 | 来源登记、覆盖率、字段缺口 | 导入审计 | 审核队列和发布记录 |

## 5. 数据存储蓝图

当前继续使用静态 JSON，但逻辑上分为四层。

```text
事实层
  data/sources/source-registry.json
  data/metadata/version-baseline.json
  data/classes/classes.json
  data/equipment/equipment-library.json
  data/aspects/community-aspect-overrides.json
  data/equipment/community-unique-overrides.json

构筑输入层
  data/builds/archetypes.json
  data/builds/season-start-plans.json
  data/builds/community-build-overrides.json

生成视图层
  data/generated/build-guides.json
  data/generated/aspect-index.json
  data/generated/build-simulations.json
  data/generated/site-coverage.json

质量门禁层
  scripts/preflight.mjs
  scripts/generate-site-coverage.mjs
  scripts/verify.mjs
  scripts/run-sample.mjs
```

后续服务化时使用这些规范化实体：

- `sources`、`source_snapshots`
- `items`、`item_affixes`、`item_powers`
- `aspects`
- `skills`、`skill_nodes`
- `paragon_boards`、`paragon_nodes`、`glyphs`
- `builds`、`build_gear_slots`、`build_gear_alternatives`
- `build_skill_steps`、`build_paragon_steps`、`build_rotation_steps`、`build_variants`
- `leaderboard_samples`、`build_forecasts`
- `analysis_runs`、`analysis_outputs`、`publish_audits`

字段原则：

- 事实字段必须有来源、版本和字段状态。
- 预测字段必须有方法版本、输入快照和置信度。
- 社区资料不能覆盖官方事实，只能作为并列证据或构筑来源。
- 前端读取生成视图层，不在浏览器端生成事实性攻略。
- `analysis_outputs.publish_status !== "approved"` 的内容不能进入玩家可见 JSON。

## 6. AI 分析和发布流程

```text
来源登记
  -> 代表样本结构化
  -> 脚本生成候选 BD/预测/覆盖率
  -> JSON 契约校验
  -> 中文与禁用话术校验
  -> 代表页面截图检查
  -> 来源/授权/敏感信息扫描
  -> 发布到玩家可见数据
```

禁止：

- 未登记来源的数据直接进入 `data/generated/*`。
- 把 AI 候选描述写到玩家页面。
- 把模板或未来赛季推演标成社区实战。
- 把装备库称为全量装备库，除非真正接入全量装备事实表。

## 7. 实施顺序

1. 先修 IA：BD 大厅、装备库、威能库、BD 详情分层，去掉单页堆叠。
2. 再修 BD 可执行性：11 槽位、技能顺序、巅峰顺序、打法和替换矩阵都在详情页可见。
3. 再补数据：按职业和流派导入更多社区来源，不用模板冒充实战。
4. 再做视觉：暴雪官网式暗黑组件、装备图标、职业入口和移动端无重叠。
5. 最后服务化：规范化数据表、审核队列、预测校准和 API。

## 8. 验收门禁

每次提交前至少运行：

```text
npm run preflight
npm run build:data
npm run verify
npm run sample
node --check public/app.js
node --check scripts/verify.mjs
git diff --check
```

视觉验收必须覆盖：

- `#builds`
- 至少一个 `#bd/<guideId>`
- `#equipment`
- `#aspects`
- 移动端 390px 宽度

玩家可见页面不得出现：

- `候选配装`
- `配装规划`
- `先选目标`
- `AI 思考`
- `模型推理`
- `完整 BD 细节`

