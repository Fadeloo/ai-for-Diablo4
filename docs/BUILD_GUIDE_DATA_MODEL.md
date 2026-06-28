# BD 数据模型

## 目标

`data/generated/build-guides.json` 是前端 BD 页面的主数据源。页面不在浏览器里临时推导攻略内容，只按赛季、职业、用途筛选已经生成好的构筑档案。

## 生成链路

```text
data/classes/classes.json
data/builds/archetypes.json
data/equipment/equipment-library.json
data/generated/build-simulations.json
data/builds/community-build-overrides.json
        |
        v
scripts/generate-build-guides.mjs
        |
        v
data/generated/build-guides.json
        |
        v
scripts/generate-site-coverage.mjs
        |
        v
data/generated/site-coverage.json
```

`npm run build:data` 会先刷新装备库和赛季构筑矩阵，再生成结构化 BD 档案。

`data/builds/community-build-overrides.json` 用来把可追溯社区 BD 覆盖到生成档案上。覆盖字段可以替换装备槽位、核心威能、技能加点、巅峰点击顺序、打法、来源引用和数据质量状态。没有覆盖的 BD 继续使用本站结构化模板。

`data/generated/site-coverage.json` 从生成后的 BD、装备库和来源登记表汇总玩家可见的覆盖状态。来源页读取它展示 BD 数、社区参考数、模板数、装备字段缺口和存储层用途；`npm run verify` 会校验这些统计和真实数据一致。

社区覆盖支持 `extends`：冲层版可以作为基础，速刷和日常版只覆盖变化的槽位、摘要和打法，生成脚本会合并出完整 11 个装备位。这样同一套真实 BD 的多用途变体可以共享来源和主体结构，同时避免复制粘贴导致槽位遗漏。

## 核心结构

每套 BD 以 `builds[]` 中的一个对象表示，当前覆盖 `3` 个赛季窗口、`8` 个职业、`28` 个职业流派、`3` 个用途，共 `252` 套。其中 `33` 套 S14 BD 已有社区来源覆盖：`24` 套同赛季社区参考，`9` 套跨赛季社区参考，其余继续标记为结构化模板。

关键字段：

- `taxonomy`：赛季、职业、流派、用途、阶段标签。
- `summary`：一句话说明、优点、短板、需求件和词缀优先级。
- `formationDifficulty`：成型难度、等级和原因。
- `ceiling`：150 层速度参考、梯队和说明。
- `gearSlots`：全身装备位置。每个位置包含目标装备或威能、是否核心、是否可替换、词缀、淬炼、精造、宝石和替换件。
- `coreUniques` / `coreAspects`：核心暗金和核心威能位。
- `skillTree`：技能栏、加点顺序、被动和说明。
- `paragon`：巅峰盘顺序、雕文和点击顺序。
- `gameplay`：起手、循环、首领、防御、速刷和常见错误。
- `variants`：标准成型、缺核心暗金、高层生存等替换方案。
- `dataQuality`：官方已确认、社区验证、待补全和缺失项。
- `source.references`：社区 BD、官方补丁或后续榜单来源链接。
- `source.verificationLevel`：前端展示的数据状态，当前枚举为 `community_reference`、`cross_season_reference`、`official_seed_template` 和 `projection_template`。

## 前端使用

- `#builds` 读取 `build-guides.json`，按 `seasonId`、`classId`、`mode` 展示 BD 大厅卡片。
- `#bd/<guideId>` 打开独立 BD 详情页。
- 详情页直接读取 `gearSlots`、`skillTree`、`paragon`、`gameplay` 和 `variants`，不展示生成过程或评分理由。
- `#forecast` 仍读取 `build-simulations.json`，只作为 150 层速度参考页使用。

## 数据边界

当前已接入官方 3.1.0 补丁中的唯一装备固定词缀和外部图标 URL。以下内容仍需要继续接入可审计或授权的数据源：

- 全量传奇威能正式名称和完整效果。
- 暗金特效完整文本和数值范围。
- 技能树精确点数、技能系数和资源消耗。
- 巅峰盘节点坐标、雕文半径和旋转坐标。
- 赛季上线后的真实冲层、速刷和首领样本。

这些字段在 `dataQuality` 中保留状态，前端展示为来源状态，不伪装成官方事实。
