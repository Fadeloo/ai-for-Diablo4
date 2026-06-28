# Harris's Diablo 4 产品与工程蓝图

继续开发前的实施基线见 `docs/SITE_IMPLEMENTATION_DESIGN.md`，该文档是页面、组件、数据存储和 AI 分析流程的优先执行口径。

## 定位

Harris's Diablo 4 是中文暗黑 4 玩家资料站，不是单页 Demo。核心任务是让玩家能查版本边界、找职业流派、打开完整 BD、核对装备与替换件、照着技能和巅峰路线执行，并用伤害工具验证词缀取舍。

页面参考主流游戏资料站和暴雪官网式组件：暗色底、金属边线、装备图标、页签导航、列表和详情分离。首页只承担入口和版本状态，装备库、预测、BD 详情必须进入独立功能页。

## 玩家路径

1. 开荒玩家：`首页 -> 职业 -> BD 大厅 -> 日常 BD 详情 -> 装备替换`
2. 冲层玩家：`首页 -> BD 大厅 -> 冲层筛选 -> BD 详情 -> 巅峰/打法 -> 150 层参考`
3. 查装备玩家：`首页 -> 装备库 -> 搜索装备/职业/用途 -> 装备详情 -> 来源状态`
4. 调词缀玩家：`BD 详情 -> 核心装备/词缀优先级 -> 伤害实验室 -> 回到装备替换`
5. 数据维护者：`source-registry -> community-build-overrides -> build:data -> verify -> 截图检查`

## 信息架构

```text
首页
  ├─ 当前/预览版本状态
  ├─ 职业、装备、BD 数量概览
  └─ 主要功能入口
BD 大厅
  ├─ 赛季筛选
  ├─ 职业筛选
  ├─ 用途筛选：冲层 / 速刷 / 日常
  ├─ 数据状态筛选：社区参考 / 结构化模板
  └─ 候选 BD 卡片
BD 详情
  ├─ 总览：职业、赛季、用途、成型难度、150 层参考
  ├─ 装备：11 槽位、核心状态、替换件、词缀、淬炼、精造、宝石
  ├─ 技能：技能栏、加点顺序、被动优先级
  ├─ 巅峰：盘顺序、雕文、点击顺序、补点逻辑
  ├─ 打法：起手、循环、首领、防御、速刷、常见错误
  ├─ 变体：缺件、速刷、高容错、高层生存
  └─ 来源：官方/社区链接、更新时间、待补全字段
装备库
  ├─ 搜索和筛选
  ├─ 装备列表
  └─ 装备详情侧栏
职业开荒
  ├─ 职业资源
  ├─ 阶段路线
  └─ 流派轴
伤害实验室
  ├─ 输入属性
  └─ 期望伤害拆分
150 层参考
  ├─ 三赛季窗口
  ├─ 冲层/速刷/日常预测
  └─ 数据边界
来源
  ├─ 官方来源
  ├─ 社区来源
  ├─ 图标引用
  └─ 授权和可信度状态
```

## 页面与组件

| 页面 | 组件 | 职责 | 数据源 |
| --- | --- | --- | --- |
| 全站 | `SiteShell` | 顶部导航、当前版本、hash 路由状态 | `version-baseline.json` |
| 首页 | `HeroStatus` | 品牌、版本边界、主入口、数据总数 | version / classes / guides / equipment |
| BD 大厅 | `BuildFilters` | 赛季、职业、用途、来源状态筛选 | `build-guides.json` |
| BD 大厅 | `BuildCandidateList` | 左侧候选列表，快速比较 | `build-guides.json` |
| BD 大厅 | `BuildLibraryCard` | 摘要、难度、150 层、核心暗金 | `build-guides.json` |
| BD 详情 | `BuildGuideDetail` | 独立详情页容器和分区导航 | `build-guides.json` |
| BD 详情 | `GearSlotGrid` | 11 槽位装备、替换、词缀、精造 | `builds[].gearSlots` |
| BD 详情 | `SkillRoutePanel` | 技能栏和加点顺序 | `builds[].skillTree` |
| BD 详情 | `ParagonRoutePanel` | 巅峰盘、雕文和点击顺序 | `builds[].paragon` |
| BD 详情 | `GameplayPanel` | 起手、循环、首领、防御、常见错误 | `builds[].gameplay` |
| 装备库 | `EquipmentBrowser` | 搜索、筛选、分页加载 | `equipment-library.json` |
| 装备库 | `EquipmentDetail` | 固定词缀、图标、来源状态 | `equipment-library.json` |
| 职业 | `ClassStartPlan` | 开荒路线和流派轴 | `classes.json` / `season-start-plans.json` |
| 伤害 | `DamageWorkbench` | 可解释期望伤害模型 | 表单输入 / `src/damage` |
| 来源 | `SourceRegistry` | 来源可信度和使用范围 | `source-registry.json` |

前端约束：

- 列表页只做筛选和比较，完整内容进入详情页。
- 玩家可执行信息优先：装备、技能、巅峰、打法、替换件。
- “预测”“模板”“社区参考”“跨赛季参考”必须用状态标签区分。
- 图标使用外部 URL 引用和本地回退图标，不提交第三方图片文件。
- 中文页面不展示生成过程、内部评分理由或思考文案。

## 数据存储

当前是静态 JSON 站，后续可以按同一契约迁移到数据库。

| 层级 | 文件 | 用途 |
| --- | --- | --- |
| 来源登记 | `data/sources/source-registry.json` | 来源 URL、可信度、授权状态、使用范围 |
| 版本基线 | `data/metadata/version-baseline.json` | 当前版本、预览版本、补丁号、Build 号 |
| 职业基础 | `data/classes/classes.json` | 职业、资源、中文名、角色定位 |
| 流派原型 | `data/builds/archetypes.json` | 每职业流派轴、权重、适用用途 |
| 开荒路线 | `data/builds/season-start-plans.json` | 职业开荒阶段和掉落决策 |
| 社区覆盖 | `data/builds/community-build-overrides.json` | 真实 BD 回填入口，支持继承变体 |
| 装备基础 | `data/equipment/*.json` | 槽位、词缀分类、装备库种子 |
| 生成 BD | `data/generated/build-guides.json` | 前端 BD 大厅和详情页主数据 |
| 生成装备 | `data/equipment/equipment-library.json` | 装备库主数据 |
| 预测矩阵 | `data/generated/build-simulations.json` | 150 层参考 |

后端实体建议：

```text
sources
items
item_affixes
aspects
skills
skill_edges
paragon_boards
paragon_nodes
builds
build_gear_slots
build_skill_steps
build_paragon_steps
build_variants
leaderboard_samples
build_analysis_runs
```

关系规则：

- `sources` 是所有事实字段的来源根。
- `items` 存装备基础信息，`item_affixes` 存固定词缀、范围和版本。
- `builds` 存 BD 主记录，11 个装备位进入 `build_gear_slots`。
- `build_skill_steps` 和 `build_paragon_steps` 用有序行存点击顺序。
- `leaderboard_samples` 用于校准 150 层速度和职业排名。
- `build_analysis_runs` 存 AI 或脚本分析结果，经校验后才能进入正式 BD。

## 数据管线

```text
来源登记
  -> 代表样例导入
  -> 结构化 JSON 覆盖
  -> npm run build:data
  -> npm run verify
  -> npm run sample
  -> 前端截图检查
  -> 敏感信息扫描
  -> 提交和推送
```

导入纪律：

- 官方来源优先进入 `source-registry.json`。
- 社区 BD 只能作为 `community_verified` 或 `needs_validation` 字段使用。
- 新来源先做 1-2 个代表样例，再全量扩展。
- 全量装备、技能和巅峰不能靠页面文案推断，必须有可审计来源。
- 生成文件只由脚本写入；人工编辑入口放在 `data/builds/`、`data/equipment/` 和 `data/sources/`。

## BD 数据契约

每套 BD 的最小可用标准：

- `taxonomy`：赛季、职业、流派、用途、阶段标签。
- `summary`：一句话、优点、短板、需求件、词缀优先级。
- `formationDifficulty`：成型难度和原因。
- `ceiling`：150 层参考、梯队、说明。
- `gearSlots`：11 槽位，含目标件、威能、核心状态、替换状态、词缀、淬炼、精造、宝石、替代方案。
- `coreUniques` / `coreAspects`：顶部摘要可直接显示。
- `skillTree`：技能栏、加点顺序、被动说明。
- `paragon`：盘顺序、雕文、点击顺序。
- `gameplay`：起手、循环、首领、防御、速刷、常见错误。
- `variants`：来源参考版或缺件/速刷/高容错方案。
- `source.references`：社区或官方来源链接。
- `dataQuality`：已确认、社区验证、待验证、缺失字段。

## AI 分析方式

AI 不直接写前端展示，也不直接把预测当事实。推荐离线流程：

1. 读取来源登记、装备库、已有 BD、榜单样本。
2. 输出候选流派、冲层速度、成型难度、替换建议和缺失字段。
3. 每条结论携带来源、输入样本和置信区间。
4. 校验脚本检查 11 槽位、技能、巅峰、来源、中文化。
5. 人工或规则确认后写入 `community-build-overrides.json` 或后端正式表。

## 当前状态

- 已有 hash 路由：`#home`、`#builds`、`#bd/<guideId>`、`#equipment`、`#classes`、`#damage`、`#forecast`、`#sources`。
- 已有 243 套结构化 BD，覆盖 3 个赛季窗口、8 个职业、27 个流派、3 种用途。
- 已有 30 套 S14 社区来源覆盖：21 套同赛季社区参考、9 套跨赛季社区参考；当前覆盖野蛮人溶解旋风、德鲁伊震波粉碎/音速撕裂、死灵星界骨魂/终极血浪、游侠飞刀舞/穿透射击、法师连锁闪电/烈焰电荷弹、魂灵师风暴羽毛闪避。
- 已有装备库：官方 3.1.0 补丁页可追溯的 278 条唯一装备固定词缀种子。
- 已有外部图标 URL 索引和本地图标回退。
- 已有来源页和数据状态标签。

## 主要缺口

- 全职业全流派还没有都接入社区实战 BD。
- 全量传奇威能、暗金特效完整文本、词缀范围和技能系数仍需继续导入。
- 巅峰盘坐标、节点路径和雕文半径还不是可视化盘面。
- 150 层速度仍是参考矩阵，缺真实榜单样本校准。
- 装备库详情仍以固定词缀种子为主，不等于完整装备百科。
- AI 分析结果还没有后端任务队列和审核流。

## 本轮验收

- 文档说明整体架构、组件、功能和数据存储。
- 前端使用列表页和详情页分离，不把 BD 详情挤在列表里。
- BD 详情能看到装备、技能、巅峰、打法、替换和来源。
- 社区来源 BD 显示具体槽位和来源链接。
- 装备库能打开详情，并显示图标、固定词缀和数据状态。
- 验证通过：`npm run preflight`、`npm run verify`、`npm run sample`。
- 公开仓库提交前运行敏感信息扫描。
