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

## 构筑流程

1. 选择职业和开荒阶段。
2. 选择流派原型，得到优先词缀类别。
3. 用装备评分器筛选过渡装备。
4. 用伤害模型比较关键词缀、技能等级和乘区收益。
5. 把生存、资源、冷却、移动速度作为硬约束，不只按木桩伤害排序。
6. 对终局构筑追加唯一装备、传奇威能、巅峰和赛季机制条件。
7. 用真实冲层、速刷样本和热修补丁校准预测矩阵；在校准前，150 层速度只作为模型估计展示。
