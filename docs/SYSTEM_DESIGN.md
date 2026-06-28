# Harris's Diablo 4 总控设计

本文是继续实现前的总控设计。后续页面、组件、数据导入、AI 分析和验证都以本文件为准：先有数据契约和组件边界，再写页面展示或导入脚本。

## 1. 目标形态

Harris's Diablo 4 是中文暗黑 4 玩家资料站，核心不是展示文案，而是帮助玩家完成这些动作：

- 找职业流派：按赛季、职业、用途和来源状态筛选 BD。
- 抄完整 BD：进入详情页查看 11 个装备位、替换件、技能加点、巅峰顺序、打法循环和来源。
- 查装备：按职业、部位、用途、词缀和来源状态检索装备，打开详情看固定词缀、图标和相关 BD。
- 做配装替换：缺核心暗金时能看到可替换底材、威能、词缀优先级和放弃点。
- 看三赛季参考：区分冲层、速刷、日常，展示预测依据、可信度和待校准风险。
- 验证伤害：用伤害实验室解释暴击、压制、易伤、加伤池、乘区和攻速收益。

硬约束：

- 任何事实字段必须有来源或明确的数据状态。
- 预测、模板、跨赛季参考和同赛季社区参考必须分开显示。
- 页面全部中文化，内部推理、模型话术和维护说明不进入玩家界面。
- 前端只展示已生成数据，不在浏览器端临时编造构筑。
- 公开仓库只提交源码、结构化数据和本地回退图，不提交密钥、私有配置或未经授权的第三方素材文件。

## 2. 信息架构

```text
SiteShell
  ├─ 首页 #home
  │   ├─ 版本状态
  │   ├─ 覆盖概览
  │   └─ 功能入口
  ├─ BD 大厅 #builds
  │   ├─ 筛选与排序
  │   ├─ BD 列表
  │   └─ 快速摘要
  ├─ BD 详情 #bd/<guideId>
  │   ├─ 总览
  │   ├─ 装备
  │   ├─ 技能
  │   ├─ 巅峰
  │   ├─ 打法
  │   ├─ 变体
  │   └─ 来源
  ├─ 装备库 #equipment
  │   ├─ 筛选
  │   ├─ 装备列表
  │   └─ 装备详情
  ├─ 职业开荒 #classes
  │   ├─ 职业定位
  │   ├─ 开荒阶段
  │   ├─ 流派轴
  │   └─ 可用 BD
  ├─ 伤害实验室 #damage
  │   ├─ 属性输入
  │   ├─ 伤害拆分
  │   └─ 词缀对比
  ├─ 150 层参考 #forecast
  │   ├─ 三赛季窗口
  │   ├─ 职业速度预测
  │   └─ 风险与校准状态
  └─ 来源 #sources
      ├─ 官方来源
      ├─ 社区来源
      ├─ 图标来源
      └─ 授权与可信度
```

页面规则：

- 列表页只负责筛选、排序和比较。
- 详情页负责完整执行信息。
- 装备、技能、巅峰和打法必须分区展示，不能挤进同一张长卡。
- 装备库和 BD 详情互相链接：装备详情显示相关 BD，BD 装备位能跳回装备详情。
- 移动端使用单列和锚点目录，不使用依赖 hover 才能读取的信息。

## 3. 组件模型

| 层级 | 组件 | 职责 | 主要输入 |
| --- | --- | --- | --- |
| 全站 | `SiteShell` | 顶部导航、版本条、hash 路由、移动端菜单 | version / route |
| 全站 | `SourceBadge` | 统一显示资料可信度和状态 | verificationLevel / dataStatus |
| 首页 | `HomeDashboard` | 当前版本、覆盖数、功能入口 | version / classes / guides / equipment |
| BD 大厅 | `BuildFilters` | 赛季、职业、用途、来源、关键词筛选 | buildGuides / user filters |
| BD 大厅 | `BuildLibraryCard` | BD 摘要、核心件、成型难度、速度参考 | guide |
| BD 详情 | `BuildDetailLayout` | 详情页容器、分区导航、返回入口 | guideId / guide |
| BD 详情 | `BuildSummaryPanel` | 定位、强弱项、需求件、150 层参考 | guide.summary / guide.ceiling |
| BD 详情 | `GearSlotGrid` | 11 槽位装备网格 | guide.gearSlots |
| BD 详情 | `GearSlotCard` | 单槽目标件、威能、词缀、替换件 | gearSlot / equipment |
| BD 详情 | `SkillRoutePanel` | 技能栏、升级加点、被动优先级 | guide.skillTree |
| BD 详情 | `ParagonRoutePanel` | 巅峰盘、雕文、点击顺序 | guide.paragon |
| BD 详情 | `GameplayPanel` | 起手、循环、首领、防御、速刷、错误 | guide.gameplay |
| BD 详情 | `VariantPanel` | 缺件、速刷、高层生存、低门槛版本 | guide.variants |
| 装备库 | `EquipmentBrowser` | 搜索、筛选、分页和选中态 | equipment.items |
| 装备库 | `EquipmentDetailPanel` | 固定词缀、来源、图标、相关 BD | item / relatedGuides |
| 职业 | `ClassStartPlan` | 开荒阶段、资源管理、流派入口 | classes / seasonStartPlans |
| 伤害 | `DamageWorkbench` | 表单输入、期望伤害和乘区拆分 | user input / damage model |
| 预测 | `ForecastTable` | 三赛季职业速度和用途榜 | buildSimulations |
| 来源 | `SourceRegistryView` | 来源站点、可信度、授权和用途 | sourceRegistry |

组件边界：

- `BuildDetailLayout` 不直接计算 BD，只读取 `data/generated/build-guides.json`。
- `GearSlotCard` 只能展示槽位数据和装备库反查结果。
- `EquipmentDetailPanel` 只展示装备事实和相关 BD，不把 BD 的预测写回装备。
- `DamageWorkbench` 只解释输入样例，不宣称等同服务器端完整结算。

## 4. 当前静态数据层

```text
data/
  metadata/version-baseline.json
  sources/source-registry.json
  classes/classes.json
  features/feature-map.json
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

职责分层：

- 来源登记层：`source-registry.json` 记录来源、可信度、授权状态和用途。
- 人工维护层：`classes/`、`equipment/`、`builds/` 存可审计输入。
- 生成层：`data/generated/` 由脚本生成，前端直接读取。
- 前端展示层：`public/app.js` 读取 JSON，按路由渲染，不修改数据。

新增资料的入口：

- 新社区 BD：写入 `data/builds/community-build-overrides.json`。
- 新装备事实：写入装备输入文件或抓取脚本，再生成 `equipment-library.json`。
- 新来源：先写入 `data/sources/source-registry.json`，再在数据记录中引用。
- 新预测样本：写入生成规则或后续 `leaderboard_samples`，不能直接覆盖事实字段。

## 5. BD 数据契约

每套可公开 BD 必须满足：

```json
{
  "id": "s14-necromancer-blood_overpower-pit_push",
  "title": "中文标题",
  "taxonomy": {
    "seasonId": "s14",
    "classId": "necromancer",
    "archetypeId": "blood_overpower",
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
  "source": {
    "verificationLevel": "community_reference",
    "references": []
  },
  "dataQuality": {}
}
```

`gearSlots` 固定 11 个位置：

```text
helm, chest, gloves, pants, boots,
amulet, ring1, ring2,
twoHand, mainHand, offHand
```

单槽位最小字段：

- `target`：目标装备或传奇底材。
- `aspect`：威能、暗金特效或空槽说明。
- `required`：是否硬需求。
- `core`：是否构筑核心。
- `replaceable`：是否可替换。
- `affixes`：目标词缀。
- `tempers`：淬炼方向，缺省时由生成脚本补齐。
- `masterwork`：精造优先级，缺省时由生成脚本补齐。
- `sockets`：宝石或镶孔策略，缺省时由生成脚本补齐。
- `alternatives`：至少两个替换方案，含原因和代价。

技能、巅峰和打法最小字段：

- `skillTree.skillBar` 必须 6 个主动技能。
- `skillTree.pointOrder` 至少 10 个阶段。
- `paragon.boardOrder` 至少 4 个盘或盘位。
- `paragon.clickOrder` 至少 10 个有序步骤。
- `gameplay` 必须含 `opener`、`loop`、`boss`、`defense`。
- `variants` 至少 3 条，用于缺件、速刷和高层生存。

## 6. 装备数据契约

每件装备至少包含：

- `id`
- `name`
- `zhName`
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
- `dataStatus`

装备库当前边界：

- 当前 `equipment-library.json` 是官方 3.1.0 补丁唯一装备固定词缀种子，不是全量装备百科。
- 图标使用外部 URL 引用和本地回退图，不下载第三方图片。
- 暗金特效、完整词缀范围、普通传奇威能、掉落来源和赛季改动需要继续接入来源后再展示为事实。

## 7. 后端数据库演进

静态站阶段使用 JSON。需要服务化时，按以下实体迁移：

```text
sources(id, name, url, trust_level, license_status, captured_at)
patches(id, patch, build_number, release_date, source_id)
classes(id, zh_name, resource, role, enabled_from_patch)
items(id, name, zh_name, rarity, class_id, slot_id, icon_url, source_id)
item_affixes(id, item_id, affix_key, zh_label, min_value, max_value, patch_id)
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

迁移规则：

- `sources` 是所有事实字段的根。
- `builds` 只存主记录，装备、技能、巅峰、变体都拆成有序子表。
- `leaderboard_samples` 只用于校准速度和职业排名，不覆盖来源 BD。
- `analysis_outputs` 是 AI 候选池，审核后才能进入正式构筑表。

## 8. 数据生产流程

```text
来源发现
  -> source-registry 登记
  -> 抽 1-2 个代表样例结构化
  -> 写 community-build-overrides 或装备输入
  -> npm run build:data
  -> npm run verify
  -> npm run sample
  -> 本地页面和截图检查
  -> 敏感信息扫描
  -> 提交推送
```

新增社区 BD 的落地步骤：

1. 确认来源页面包含装备、技能、巅峰、打法或至少可交叉验证。
2. 先做一个职业/一个流派的冲层版。
3. 用 `extends` 衍生速刷和日常版，只覆盖真正变化的槽位、玩法和要求。
4. 运行生成脚本，检查 11 槽位、技能、巅峰、来源和中文化。
5. 打开 BD 详情页、装备库和移动端截图，确认信息可读。

## 9. AI 分析设计

AI 只做候选分析，不直接发布事实资料。

输入：

- 官方补丁和赛季说明。
- 装备库、威能、技能、巅峰和职业资料。
- 社区 BD 与 Planner。
- 榜单样本、通关时间、热修记录。
- 已有伤害计算模型。

输出：

- 候选冲层、速刷、日常 BD。
- 核心装备、替换件和词缀优先级。
- 150 层速度区间和置信度。
- 职业/流派强弱变化和原因。
- 缺失字段清单。

审核：

- 每条结论必须携带来源引用或预测状态。
- 未来赛季结论只能标为预测或模板。
- 同赛季社区 BD 必须能打开来源链接并回看关键字段。
- 校验通过后写入 `community-build-overrides.json` 或后端正式表。

## 10. 验收标准

设计验收：

- 页面、组件、数据、来源和 AI 流程有明确边界。
- 每个核心功能知道读哪个 JSON 或未来表。
- 每类事实字段知道如何追溯来源。

实现验收：

- `npm run preflight`
- `npm run build:data`
- `npm run verify`
- `npm run sample`
- `node --check public/app.js`
- 本地页面截图检查：桌面 BD 详情、移动端 BD 详情、装备详情。
- 敏感信息扫描：确认没有 token、密钥、私有配置和下载的第三方素材。

当前优先级：

1. 全职业至少两个可审计社区流派，每个流派含冲层、速刷、日常 3 个变体。
2. 装备库继续补暗金特效、完整词缀范围、传奇威能和掉落来源。
3. 巅峰从文本顺序升级为盘面和节点坐标。
4. 150 层参考接入真实榜单样本后校准。
5. 服务化后加入来源审核队列和 AI 候选分析池。
