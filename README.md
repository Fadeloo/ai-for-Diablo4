# AI for Diablo IV 攻略项目

这是一个以数据为核心的暗黑4攻略项目初始化版本，目标是支撑赛季开荒、装备词缀、配装设计、伤害计算、流派构筑和后续前端/机器人/文档输出。

## 当前版本基线

- 当前日期：2026-06-28，时区 `Asia/Shanghai`。
- 当前在线补丁：`3.0.4 Build #72271`，官方发布日期 2026-06-10。
- 已发布但尚未上线补丁：`3.1.0 Build #72578`，官方发布日期 2026-06-30。
- 默认计算与攻略状态：以 `3.0.4` 为当前在线版本，同时把 `3.1.0` 作为预览数据源记录。

## 已初始化内容

- `data/metadata/version-baseline.json`：版本、日期和目标数据状态。
- `data/sources/source-registry.json`：官方与社区来源登记，含可信度和用途。
- `data/classes/classes.json`：8 个职业的中文名称、资源、开荒优先级、构筑方向和资料状态。
- `data/equipment/`：装备部位、词缀分类和伤害计算角色。
- `data/builds/`：职业流派原型和赛季开荒计划。
- `data/features/feature-map.json`：攻略项目功能地图和当前状态。
- `src/damage/calculate.js`：可解释的伤害期望值模型。
- `src/build/score.js`：按构筑权重评估装备词缀的基础评分器。
- `scripts/fetch-official-patch.mjs`：从官方 3.1.0 补丁页抽取唯一装备 guaranteed affix 种子数据。
- `scripts/verify.mjs`：校验版本、职业覆盖、数据结构和代表性伤害样例。
- `docs/PROJECT_SCOPE.md`：完整功能范围、已完成模块和下一阶段补全项。

## 常用命令

```bash
npm run preflight
npm run fetch:patch
npm run sample
npm run verify
```

## 数据边界

第一版已经建立“完整装备库”的数据入口和校验结构，并能自动抽取官方 3.1.0 唯一装备 guaranteed affix 变更。普通装备基础词缀、传奇威能全量表、职业技能全量系数和服务器端结算顺序仍需要继续接入有授权或可审计的数据源；项目不会把未验证字段伪装成官方事实。
