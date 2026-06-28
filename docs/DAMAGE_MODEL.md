# 伤害计算模型

## 结论

当前实现是攻略比较用的期望值模型，不是服务器端逐帧结算复刻。它适合比较词缀、装备和构筑方向；涉及隐藏系数、快照、上限、召唤物继承和特殊传奇/唯一机制时必须补充实测。

## 计算结构

`src/damage/calculate.js` 输出：

- `baseSkillDamage = weaponDamage * skillCoefficient`
- `primaryStatFactor = 1 + primaryStat / 1000`
- `additiveFactor = 1 + sum(additiveBonuses)`
- `independentMultiplier = product(1 + multiplicativeBonuses)`
- `criticalFactor`：按暴击概率计算期望乘区
- `vulnerableFactor`：按易伤覆盖率计算期望乘区
- `overpowerFactor`：按压制概率计算期望乘区

## 必须显式记录的假设

- 主属性按常见的每 10 点 1% 技能伤害建模。
- 暴击、易伤、压制按事件期望值建模。
- 具体技能系数、隐藏标签、独立乘区叠乘顺序和特殊唯一机制需要实测或权威资料回填。

