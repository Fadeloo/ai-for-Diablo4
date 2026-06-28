# AI for Diablo IV 攻略项目

这是一个以数据为核心的暗黑4攻略项目初始化版本，目标是支撑赛季开荒、装备词缀、配装设计、伤害计算、流派构筑和后续前端/机器人/文档输出。

## 当前版本基线

- 当前日期：2026-06-28，时区 `Asia/Shanghai`。
- 当前在线补丁：`3.0.4 Build #72271`，官方发布日期 2026-06-10。
- 已发布但尚未上线补丁：`3.1.0 Build #72578`，官方发布日期 2026-06-30。
- 默认计算与攻略状态：以 `3.0.4` 为当前在线版本，同时把 `3.1.0` 作为预览数据源记录。

## 已初始化内容

- `index.html`：`Harris‘s Diablo 4` 前端入口，参考 Tesla 式全屏产品页结构。
- `public/`：前端样式、交互脚本、本地生成的英雄图和装备类型图标。
- `data/metadata/version-baseline.json`：版本、日期和目标数据状态。
- `data/sources/source-registry.json`：官方与社区来源登记，含可信度和用途。
- `data/classes/classes.json`：8 个职业的中文名称、资源、开荒优先级、构筑方向和资料状态。
- `data/equipment/`：装备部位、词缀分类、伤害计算角色和 278 条官方 3.1.0 唯一装备 guaranteed affix 种子库。
- `data/generated/d4builds-icon-index.json`：278 条唯一装备的第三方外部图标 URL 索引，不下载或提交图标文件。
- `data/builds/`：职业流派原型和赛季开荒计划。
- `data/generated/build-simulations.json`：未来三个赛季窗口的冲层、速刷、日常配装预测矩阵，含 150 层速度估计和置信度。
- `data/features/feature-map.json`：攻略项目功能地图和当前状态。
- `src/damage/calculate.js`：可解释的伤害期望值模型。
- `src/build/score.js`：按构筑权重评估装备词缀的基础评分器。
- `scripts/fetch-official-patch.mjs`：从官方 3.1.0 补丁页抽取唯一装备 guaranteed affix 种子数据。
- `scripts/verify.mjs`：校验版本、职业覆盖、数据结构和代表性伤害样例。
- `docs/PROJECT_SCOPE.md`：完整功能范围、已完成模块和下一阶段补全项。

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

当前前端已经有配装模拟器、装备检索、职业开荒页、伤害实验室和 150 层预测页。装备库不是全量数据库：它只包含官方 3.1.0 补丁页可追溯的唯一装备 guaranteed affix 种子。页面会优先显示第三方外部图标 URL，加载失败时回退到本地生成占位图；公开仓库不会提交第三方图标文件。普通装备基础词缀、传奇威能全量表、暗金特效、完整数值范围、职业技能全量系数和服务器端结算顺序仍需要继续接入有授权或可审计的数据源；项目不会把未验证字段伪装成官方事实。

三赛季配装和 150 层速度是模型预测，不是天梯或排行榜事实。赛季上线后应把真实冲层、速刷样本和热修补丁写回 `data/generated/build-simulations.json` 或替换生成规则。
