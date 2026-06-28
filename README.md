# Harris‘s Diablo 4 攻略项目

这是一个以数据为核心的暗黑4攻略项目初始化版本，目标是支撑赛季开荒、装备词缀、配装设计、伤害计算、流派构筑和后续前端/机器人/文档输出。

## 当前版本基线

- 当前日期：2026-06-28，时区 `Asia/Shanghai`。
- 当前在线补丁：`3.0.4 构建 #72271`，官方发布日期 2026-06-10。
- 已发布但尚未上线补丁：`3.1.0 构建 #72578`，官方发布日期 2026-06-30。
- 默认计算与攻略状态：以 `3.0.4` 为当前在线版本，同时把 `3.1.0` 作为预览数据源记录。

## 已初始化内容

- `index.html`：`Harris‘s Diablo 4` 前端入口，按暴雪官网式暗黑资料站结构组织首页和功能入口。
- `public/`：前端样式、交互脚本、本地生成的英雄图和装备类型图标。
- `docs/SYSTEM_DESIGN.md`：继续实现前的总控设计，定义页面、组件、数据契约、来源导入、AI 分析和验收标准。
- `docs/PRODUCT_BLUEPRINT.md`：整体产品架构、页面组件、功能路径、数据存储和导入管线蓝图。
- `data/metadata/version-baseline.json`：版本、日期和目标数据状态。
- `data/sources/source-registry.json`：官方与社区来源登记，含可信度和用途。
- `data/classes/classes.json`：8 个职业的中文名称、资源、开荒优先级、构筑方向和资料状态。
- `data/equipment/`：装备部位、词缀分类、伤害计算角色和 278 条官方 3.1.0 唯一装备固定词缀种子库。
- `data/generated/d4builds-icon-index.json`：278 条唯一装备的第三方外部图标 URL 索引，不下载或提交图标文件。
- `data/builds/`：职业流派原型和赛季开荒计划。
- `data/generated/build-simulations.json`：未来三个赛季窗口的冲层、速刷、日常配装矩阵，用于 150 层速度参考页。
- `data/generated/build-guides.json`：252 套结构化 BD 档案，覆盖三赛季、全职业、多流派和三种用途，含装备槽位、替换件、技能加点顺序、巅峰点击顺序、核心暗金/威能、打法和变体；其中 33 套 S14 BD 已接入暗黑核或 Mobalytics 社区来源覆盖，包含 24 套同赛季社区参考和 9 套跨赛季参考。
- `scripts/lib/zh-localization.mjs`：中文显示层，给装备名、固定词缀、资源、来源、模型状态和赛季说明生成中文字段。
- `data/features/feature-map.json`：攻略项目功能地图和当前状态。
- `src/damage/calculate.js`：可解释的伤害期望值模型。
- `src/build/score.js`：按构筑权重评估装备词缀的基础评分器。
- `scripts/fetch-official-patch.mjs`：从官方 3.1.0 补丁页抽取唯一装备固定词缀种子数据。
- `scripts/verify.mjs`：校验版本、职业覆盖、数据结构和代表性伤害样例。
- `docs/PROJECT_SCOPE.md`：完整功能范围、已完成模块和下一阶段补全项。
- `docs/ARCHITECTURE.md`：页面架构、组件模式、数据分层和后续后端/存储设计。
- `docs/BUILD_GUIDE_DATA_MODEL.md`：BD 数据存储、生成链路和前端使用方式。

## 常用命令

```bash
npm run build:data
npm run build:assets
npm run dev
npm run preflight
npm run fetch:patch
npm run fetch:icons
npm run sample
npm run verify
```

## 数据边界

当前前端已经有 BD 大厅、独立 BD 详情页、装备详情检索、职业开荒页、伤害实验室和 150 层参考页。BD 详情页按资料站结构展示全身装备位置、核心暗金或威能、可替换件、技能加点顺序、巅峰点击顺序、打法循环、变体和来源状态。装备库卡片可展开查看固定词缀、配装用途、数据状态、补丁来源和图标来源。

装备库不是全量数据库：它只包含官方 3.1.0 补丁页可追溯的唯一装备固定词缀种子。页面会优先显示第三方外部图标地址，加载失败时回退到本地生成占位图；公开仓库不会提交第三方图标文件。普通装备基础词缀、传奇威能全量表、暗金特效、完整数值范围、职业技能全量系数、巅峰盘精确节点坐标和服务器端结算顺序仍需要继续接入有授权或可审计的数据源；项目不会把未验证字段伪装成官方事实。

三赛季配装和 150 层速度是资料参考，不是天梯或排行榜事实。赛季上线后应把真实冲层、速刷样本和热修补丁写回 `data/generated/build-simulations.json`、`data/generated/build-guides.json` 或替换生成规则。

前端显示优先使用中文字段；英文原始字段保留在数据里用于来源追溯、外部图标匹配和后续重新生成。
