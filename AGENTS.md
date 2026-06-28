# Project Instructions

- 中文攻略、注释型文档和用户可见输出默认使用中文；代码标识符和 JSON key 使用英文。
- 所有版本相关内容必须带 `asOf`、补丁号、Build 号、发布日期和来源 URL。
- 官方来源优先；社区来源必须标注 `community_verified` 或 `needs_validation`，不得直接覆盖官方字段。
- 伤害计算采用可解释的期望值模型，必须输出 breakdown。未验证的服务器端结算细节只能写入 `assumptions`。
- 新增职业、装备、词缀或流派时，必须更新 `npm run verify` 覆盖检查。
- 大批量数据导入先跑 1-2 个代表样例，再执行全量导入。

