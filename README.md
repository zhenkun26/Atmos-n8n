# Atmos n8n 气象工作流

这是一个以可审查 n8n JSON 为产品源的气象自动化仓库。当前交付南京、芜湖每日天气简报：每天按中国时区运行，生成中文概览、分时预报和生活建议，并通过 SMTP 邮箱发送。

## 项目地图

- `workflows/`：可导入的 n8n 工作流产品，按简报类型分目录。
- `scripts/`：不产生外部副作用的离线检查。
- `docs/architecture.md`：模块 seam、安全边界和技术栈。
- `docs/adr/`：少量、难以逆转的架构决策。
- `CONTEXT.md`：气象简报领域的共享语言。
- `AGENTS.md`：贡献与自动化代理约束。

## 工作流文件

- `workflows/daily-brief/`：每日简报工作流目录。
- `workflows/daily-brief/nanjing-wuhu-daily-weather-email.json`

## 功能

- 每天 07:30（`Asia/Shanghai`）自动运行，也支持手动测试。
- 使用 Open-Meteo 获取南京和芜湖天气；天气接口不需要 API Key。
- 汇总最高/最低温、体感温度、降水概率、降水量、风速、紫外线和 09:00/12:00/15:00/18:00/21:00 分时预报。
- 依据降水、高温、低温、大风和紫外线生成中文生活建议。
- 可选使用 OpenAI Chat Model 润色为更自然的中文晨间摘要。
- AI 未启用或调用失败时，仍使用规则版内容发送邮件。
- 任一城市请求失败时，在邮件中明确显示该城市暂时不可用。

## 导入与配置

1. 在 n8n 中选择 **Import from File**，导入工作流 JSON。
2. 为“OpenAI Chat Model”选择 OpenAI 凭证（仅在启用 AI 时需要）。
3. 为“发送天气邮件”选择 SMTP 凭证。
4. 在 n8n 运行环境中配置：

   ```dotenv
   WEATHER_RECIPIENT_EMAIL=your-address@example.com
   WEATHER_FROM_EMAIL=weather-bot@example.com
   WEATHER_USE_AI=false
   ```

   n8n 2.x 默认可能禁止 Code/Set 节点读取环境变量；若继续使用上述配置，测试实例需要设置 `N8N_BLOCK_ENV_ACCESS_IN_NODE=false`。生产环境可改用 n8n Variables 或在“运行配置”节点中手动映射。

   将 `WEATHER_USE_AI` 设为 `true` 后，工作流会调用 OpenAI；默认 `false` 使用免费、确定性的规则版摘要。

   如果你的 n8n 禁止表达式读取环境变量，可直接在“运行配置”节点中填入收件地址、发件地址和 `useAi` 值。

5. 先运行“手动测试”触发器，检查两座城市的数据和邮件排版。
6. 确认无误后启用工作流。

## 自定义

- 修改时间：编辑“每天 07:30”节点。
- 修改城市：编辑“城市列表”节点中的名称、纬度和经度。
- 修改简报内容：编辑“整理双城天气”代码节点。
- 修改 AI 风格：编辑“AI 中文摘要”节点中的提示词。
- 修改邮件样式：编辑“生成邮件”代码节点。

## 技术栈

- n8n 2.x：工作流编排与运行时。
- Open-Meteo：只读天气预报数据。
- OpenAI Chat Model：可选中文编辑增强。
- SMTP：邮件交付。
- Node.js 20+：零第三方依赖的离线契约测试。
- GitHub Actions：运行与本地一致的检查命令。

详细取舍见 `docs/architecture.md` 和 `docs/adr/0001-workflow-json-is-the-product-source.md`。

## 离线校验

```bash
npm run check
```

校验不会访问天气接口、OpenAI 或 SMTP，也不会发送邮件。

## 下一阶段

1. 在一次性 n8n 环境完成 JSON 导入兼容性检查。
2. 使用测试 SMTP 与 OpenAI 凭证完成端到端执行。
3. 根据实际 n8n 部署方式决定手动导入、CLI 导入或 Git 环境同步。
4. 只有出现第二个工作流并复用相同逻辑时，再评估自定义节点或共享包。
