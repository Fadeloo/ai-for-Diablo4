# 流派构筑设计

## 功能模块

- 职业画像：`data/classes/classes.json`
- 流派原型：`data/builds/archetypes.json`
- 赛季开荒：`data/builds/season-start-plans.json`
- 装备词缀分类：`data/equipment/affix-taxonomy.json`
- 装备检索种子：`data/equipment/equipment-library.json`
- 三赛季预测：`data/generated/build-simulations.json`
- 装备评分：`src/build/score.js`
- 伤害期望：`src/damage/calculate.js`
- 构筑手册：由 `scripts/generate-build-simulations.mjs` 生成，包含技能加点优先级、巅峰路线模板、装备栏位策略、推荐唯一装备、打法循环和开荒迁移。

## 构筑流程

1. 选择职业和开荒阶段。
2. 选择流派原型，得到优先词缀类别。
3. 用装备评分器筛选过渡装备。
4. 用伤害模型比较关键词缀、技能等级和乘区收益。
5. 把生存、资源、冷却、移动速度作为硬约束，不只按木桩伤害排序。
6. 对终局构筑追加唯一装备、技能栏、巅峰路线、传奇威能和赛季机制条件。
7. 用真实冲层、速刷样本和热修补丁校准预测矩阵；在校准前，150 层速度只作为模型估计展示。

## 当前数据边界

- 装备固定词缀来自官方 3.1.0 补丁页。
- 技能加点和巅峰路线当前是构筑模板，用来指导玩家先做选择；精确点数、盘名、节点坐标和雕文半径需要接入可审计数据源后再锁定。
- 暗金特效、掉落来源和装备部位已经以社区数据库参考进入装备库；传奇威能完整效果、完整词缀范围和巅峰节点坐标仍需接入可审计数据源后再锁定。
