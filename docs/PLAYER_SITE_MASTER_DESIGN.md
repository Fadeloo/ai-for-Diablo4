# Harris's Diablo 4 玩家站主设计

本文是后续实现前的主设计基线。页面、组件、数据导入、AI 分析和发布校验都按这里拆分；实现时只在这个边界内逐步落地，不把资料继续堆进单页。

## 1. 版本与来源基线

| 字段 | 值 |
| --- | --- |
| `asOf` | 2026-06-29 Asia/Shanghai |
| 当前在线版本 | 3.0.4，Build #72271，2026-06-10，来源：`data/metadata/version-baseline.json` |
| 预览资料版本 | 3.1.0，Build #72578，2026-06-30，来源：`data/metadata/version-baseline.json` |
| 官方优先级 | 官方补丁、职业/物品说明优先进入事实层 |
| 社区资料状态 | `community_verified` 或 `needs_validation`，不得覆盖官方字段 |
| 预测资料状态 | 必须携带方法版本、输入窗口、置信度和风险说明 |

当前装备库定位是“官方 3.1.0 唯一装备固定词缀种子 + 社区补充字段”，不能对玩家宣称为全量装备百科。

## 2. 产品目标

玩家进入网站后要完成五件事：

- 找 BD：按赛季、职业、用途、来源状态筛选可用构筑。
- 抄 BD：在详情页看到 11 装备位、技能加点、巅峰顺序、打法、替换和来源。
- 查装备：按职业、部位、用途、词缀和名称查装备，并反查相关 BD。
- 看强度：查看未来三赛季冲层、速刷、日常参考，明确预测状态和校准风险。
- 算收益：用伤害实验室查看暴击、易伤、压制、乘区和攻速的期望伤害拆分。

玩家界面禁止出现内部推理、候选生成、问答流程、维护台文案或模型过程描述。AI 只能作为离线候选分析环节，经过来源登记和校验后才进入玩家可见 JSON。

## 3. 信息架构

```text
SiteShell
  ├─ #home 首页
  ├─ #builds BD 大厅
  ├─ #bd/<guideId>/<section> BD 详情分区
  ├─ #equipment 装备库
  ├─ #item/<itemId> 装备详情
  ├─ #aspects 威能索引
  ├─ #aspect/<aspectId> 威能详情
  ├─ #classes 职业开荒
  ├─ #forecast 150 层参考
  ├─ #damage 伤害实验室
  └─ #sources 来源与数据边界
```

页面职责：

- 首页只展示版本状态、覆盖概览和核心入口。
- BD 大厅只负责筛选、排序、比较和跳转。
- BD 详情按分区阅读，装备、技能、巅峰、打法不能挤在一张长卡里。
- 装备库和威能页采用列表 + 详情结构，并支持从 BD 反查。
- 职业页负责开荒路线、职业定位和流派入口。
- 预测页只展示参考矩阵，不把未来赛季推演写成事实。
- 来源页展示资料如何存储、如何发布、哪些字段仍在继续整理。

## 4. 页面与组件

| 页面 | 组件 | 责任 | 数据源 |
| --- | --- | --- | --- |
| 全站 | `SiteShell` | 顶部导航、版本条、hash 路由、移动端菜单 | version / route |
| 全站 | `SourceBadge` | 官方、社区、预测和缺口状态 | source / dataQuality |
| 首页 | `HomeDashboard` | 入口、覆盖数、资料边界 | generated coverage |
| BD 大厅 | `BuildFilterBar` | 赛季、职业、用途、来源筛选 | `build-guides.json` |
| BD 大厅 | `BuildResultsList` | 分页列表、排序、快速比较 | `build-guides.json` |
| BD 详情 | `BuildHeader` | 标题、职业、用途、来源、成型难度 | guide |
| BD 详情 | `BuildSectionNav` | 总览、开荒、装备、技能、巅峰、打法、变体、来源 | route sections |
| BD 详情 | `LoadoutBoard` | 11 槽位纸娃娃盘面 | `gearSlots` |
| BD 详情 | `GearSlotGrid` | 每槽目标件、词缀、淬炼、精造、宝石、替换 | `gearSlots[]` |
| BD 详情 | `SkillRoutePanel` | 六技能栏、加点顺序、被动优先级 | `skillTree` |
| BD 详情 | `ParagonRoutePanel` | 盘顺序、雕文、点击主线、点数阶段 | `paragon` |
| BD 详情 | `GameplayPanel` | 起手、循环、首领、防御、速刷、常见错误 | `gameplay` |
| BD 详情 | `VariantPanel` | 缺件、速刷、高容错、高层生存方案 | `variants` |
| 装备库 | `EquipmentBrowser` | 搜索、筛选、分页、选中态 | equipment |
| 装备库 | `EquipmentDetailPanel` | 图标、固定词缀、特效、掉落、相关 BD | item / guides |
| 威能页 | `AspectBrowser` | 威能检索、常见部位、相关 BD | `aspect-index.json` |
| 职业页 | `ClassStartPlan` | 开荒阶段、资源管理、流派矩阵 | classes / plans |
| 预测页 | `ForecastTable` | 三赛季、职业、用途、速度参考 | simulations |
| 伤害页 | `DamageWorkbench` | 输入属性、乘区拆分、词缀对比 | `src/damage` |
| 来源页 | `SourceRegistryView` | 来源登记、覆盖率、字段边界 | sources / coverage |

布局规则：

- 列表页必须有分页、限高或“显示更多”，不能一次铺满移动端。
- 详情页首屏只放标题、状态、关键指标和分区导航。
- 大量表格在移动端转为分组卡片，避免横向溢出。
- 装备图标使用外部 URL + 本地回退，不提交第三方图片文件。
- 暴雪官网风格只借鉴暗黑题材组件模式和视觉层级，不复制受保护素材。

## 5. 数据存储设计

静态站阶段继续使用 JSON，逻辑分四层。

```text
事实层
  data/sources/source-registry.json
  data/metadata/version-baseline.json
  data/classes/classes.json
  data/equipment/equipment-library.json
  data/aspects/d2core-aspect-library.json
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
  scripts/build-equipment-library.mjs
  scripts/generate-build-guides.mjs
  scripts/generate-aspect-index.mjs
  scripts/generate-site-coverage.mjs
  scripts/verify.mjs
  scripts/run-sample.mjs
```

数据原则：

- 事实字段必须有来源、版本和字段状态。
- 社区资料不能覆盖官方字段，只能作为并列证据或构筑来源。
- 生成视图可以冗余前端需要的中文字段，但不能成为事实源头。
- 技能和巅峰先以 BD 执行路线存储；后续补独立技能表、节点表、盘面坐标和雕文半径。
- 预测矩阵必须标注输入窗口、方法版本、置信度和风险，不能写成天梯事实。

## 6. 未来数据库模型

服务化后按这些实体迁移：

```text
sources, source_snapshots, patches
classes
items, item_affixes, item_powers
aspects
skills, skill_nodes
paragon_boards, paragon_nodes, glyphs
builds, build_gear_slots, build_gear_alternatives
build_skill_steps, build_paragon_steps, build_rotation_steps, build_variants
leaderboard_samples, build_forecasts
analysis_runs, analysis_outputs, publish_audits
```

发布规则：

- `analysis_outputs.publish_status !== "approved"` 的内容不能进入玩家可见数据。
- `leaderboard_samples` 只用于校准预测，不直接改写装备、技能或威能事实。
- `publish_audits` 记录来源、中文化、敏感信息、禁用文案和截图检查结果。

## 7. BD 最小可用契约

每套可公开 BD 至少包含：

- `taxonomy`：赛季、职业、流派、用途、阶段。
- `summary`：一句话定位、优点、短板、核心需求、词缀优先级。
- `formationDifficulty`：成型难度、等级和理由。
- `ceiling`：150 层参考、梯队、速度或说明。
- `gearSlots`：固定 11 槽位，目标件、威能/暗金、词缀、淬炼、精造、宝石、替换。
- `skillTree`：六技能栏、加点顺序、被动优先级。
- `paragon`：盘顺序、雕文、点击顺序、点数阶段。
- `gameplay`：起手、循环、首领、防御、速刷和常见错误。
- `variants`：缺件、速刷、高容错或高层生存方案。
- `source`：官方或社区链接、赛季、更新时间、验证等级。
- `dataQuality`：已确认字段、社区验证字段、继续整理字段。

## 8. AI 分析流程

```text
来源登记
  -> 代表样例结构化
  -> 离线生成候选 BD / 替换建议 / 预测矩阵
  -> 字段级来源和置信度校验
  -> 中文化和禁用文案校验
  -> 代表页面截图检查
  -> 敏感信息扫描
  -> 写入玩家可见生成数据
```

AI 输出只允许进入候选池，不能直接发布。可发布内容必须满足：

- 能追溯来源或明确标为预测。
- 11 槽位、技能、巅峰、打法和替换矩阵结构完整。
- 玩家页面无内部模型文案。
- `npm run verify` 能检查覆盖、来源、中文化和禁用文案。

## 9. 实施顺序

P0：信息架构和可读性

- BD 大厅、装备库、威能库、BD 详情分层。
- BD 详情支持 `#bd/<guideId>/<section>` 分区阅读。
- 列表页不再展开全部细节。

P1：BD 可执行性

- 每套重点 BD 补齐 11 装备位、技能、巅峰、打法、替换和来源。
- 全职业至少两个可审计社区流派，每个流派有冲层、速刷、日常变体。

P2：数据库完整度

- 补全暗金特效、完整范围、传奇威能、技能系数、巅峰盘坐标和雕文半径。
- 装备库从唯一装备种子扩展到可审计装备百科。

P3：预测和服务化

- 接入榜单样本、热修记录和真实通关时间。
- 建立 AI 候选分析池、发布审核队列和 API。

## 10. 验收门禁

每次提交前运行：

```text
npm run preflight
npm run build:data
npm run verify
npm run sample
node --check public/app.js
node --check scripts/verify.mjs
git diff --check
```

视觉检查至少覆盖：

- `#builds`
- 一个代表性 `#bd/<guideId>/<section>`
- `#equipment`
- `#aspects`
- 390px 移动端宽度

安全检查：

- 不提交 `.env`、token、cookie、Authorization 头、私钥。
- 不提交 `tmp/` 截图、抓取缓存或第三方图片文件。
- 外部素材只保存 URL、来源和使用状态。
