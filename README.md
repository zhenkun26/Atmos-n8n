# Atmos n8n Weather Workflows / 气象工作流

## English

Atmos n8n treats reviewable, importable n8n JSON as the product source. Its current workflow delivers an English daily weather brief for Nanjing and Wuhu through SMTP email.

### Project map

- `workflows/`: importable workflows, grouped by brief family.
- `scripts/`: offline checks without external API calls or notifications.
- `docs/architecture.md`: module boundaries, time handling, security, and stack.
- `docs/adr/`: durable architecture decisions.
- `CONTEXT.md`: shared domain terminology.
- `AGENTS.md`: contributor and automation rules.

The current artifact is `workflows/daily-brief/nanjing-wuhu-daily-weather-email.json`.

### Features

- Runs daily at **07:30 Asia/Shanghai**, with manual and webhook triggers as well.
- Retrieves Nanjing and Wuhu forecasts from Open-Meteo without a weather API key.
- Reports daily temperatures, feels-like temperature, precipitation probability and amount, wind, gusts, UV, and forecasts for 09:00, 12:00, 15:00, 18:00, and 21:00 in each city's local time.
- Produces deterministic English advice for rain, heat, cold, wind, and UV.
- Optionally uses OpenAI to edit the English opening summary. AI is not required for a useful delivery.
- Clearly identifies a city whose forecast could not be retrieved.

### Timezones

The computer timezone is **America/New_York**. The workflow explicitly retains **Asia/Shanghai** for its 07:30 schedule, independent of the computer or n8n instance timezone. Both configured cities use `Asia/Shanghai`.

Each entry in `City List` has an IANA `timezone`. The weather request uses that value, and forecast dates and hours remain in the city's local time. If forecast data is unavailable, the date is calculated in that city's timezone. Cards display their local date and timezone; a brief spanning different local dates lists those dates. Do not use fixed UTC offsets, which cannot account for daylight saving time.

### Import and configure

1. Use **Import from File** in n8n to import the JSON.
2. Configure an OpenAI credential on `OpenAI Chat Model` only if AI is enabled.
3. Configure an SMTP credential on `Send Weather Email`.
4. Supply runtime configuration in the n8n environment:

   ```dotenv
   TZ=America/New_York
   GENERIC_TIMEZONE=America/New_York
   WEATHER_RECIPIENT_EMAIL=your-address@example.com
   WEATHER_FROM_EMAIL=weather-bot@example.com
   WEATHER_USE_AI=false
   ```

   The timezone variables configure a self-hosted n8n process; they do not change the computer's timezone. The explicit workflow timezone still controls the schedule.

   Environment access may be blocked in n8n 2.x. A disposable test instance using this export needs `N8N_BLOCK_ENV_ACCESS_IN_NODE=false`. In managed deployments, prefer n8n variables or credential-backed configuration and adapt `Runtime Configuration` inside the instance. Keep real addresses and credentials out of Git exports.

   Set `WEATHER_USE_AI=true` to enable OpenAI. The default `false` uses the deterministic summary without an AI call.

5. Run `Manual Test` and inspect both cities and the email layout using test credentials.
6. Activate the workflow only after runtime verification. Committed exports remain inactive.

### Triggers and customization

`Daily 07:30`, `Manual Test`, and `Run Once Webhook` all connect to `Runtime Configuration`. The webhook retains `GET /webhook/daily-brief/run` and returns the last node output. See [the daily brief guide](workflows/daily-brief/README.md) for operation and access controls.

- Schedule: edit `Daily 07:30` and the workflow timezone together when changing its intended local time.
- Cities: edit names, coordinates, and IANA timezones in `City List`; update fixed Nanjing/Wuhu headings if changing cities.
- Brief: edit `Compose Dual-City Brief`.
- AI style: edit the prompt in `AI English Summary` and the prompt text produced by `Compose Dual-City Brief`.
- Email layout: edit `Compose Email`.

### Stack and offline checks

The stack is n8n 2.x, Open-Meteo, optional OpenAI, SMTP, Node.js 20+ standard-library checks, and GitHub Actions. See [the architecture](docs/architecture.md) and [ADR 0001](docs/adr/0001-workflow-json-is-the-product-source.md).

```bash
npm run check
```

Checks do not contact weather APIs, OpenAI, or SMTP and do not send email. They include city-local date, hour-selection, and daylight-saving boundary fixtures. Code, workflow labels, messages, and documentation use English; `README.md` files provide English and Simplified Chinese sections.

### Runtime verification and future work

1. Import into a disposable n8n instance to verify compatibility.
2. Run end-to-end checks with test SMTP and optional OpenAI credentials before activation.
3. Choose manual import, CLI import, or environment synchronization based on the actual deployment.
4. Consider shared packages or custom nodes only when another workflow proves a reusable need.

## 简体中文

Atmos n8n 以可审查、可导入的 n8n JSON 为产品源。当前工作流为南京、芜湖生成英文每日天气简报，并通过 SMTP 邮件发送。

### 项目地图

- `workflows/`：按简报类型组织的可导入工作流。
- `scripts/`：不调用外部 API、不发送通知的离线检查。
- `docs/architecture.md`：模块边界、时间处理、安全与技术栈。
- `docs/adr/`：持久化架构决策。
- `CONTEXT.md`：共享领域术语。
- `AGENTS.md`：贡献与自动化规则。

当前工作流文件为 `workflows/daily-brief/nanjing-wuhu-daily-weather-email.json`。

### 功能

- 每天 **Asia/Shanghai 07:30** 执行，也支持手动与 webhook 触发。
- 使用 Open-Meteo 获取南京、芜湖预报，无需天气 API Key。
- 展示每日温度、体感温度、降水概率与总量、风速、阵风、紫外线，以及各城市当地 09:00、12:00、15:00、18:00、21:00 的预报。
- 根据降雨、高温、低温、大风和紫外线生成确定性的英文建议。
- 可选使用 OpenAI 润色英文开头摘要；有用的简报不依赖 AI。
- 某个城市获取失败时，明确展示该城市的失败状态。

### 时区

电脑时区为 **America/New_York**。工作流明确使用 **Asia/Shanghai** 的 07:30 调度，不受电脑或 n8n 实例时区影响。当前两个城市均使用 `Asia/Shanghai`。

`City List` 中每个城市都有 IANA `timezone`。天气请求使用该值，预报日期与小时保持为城市当地时间。预报不可用时，也按该城市时区计算日期。卡片展示当地日期与时区；若简报涉及不同当地日期，会列出这些日期。不要使用无法处理夏令时的固定 UTC 偏移。

### 导入与配置

1. 在 n8n 中使用 **Import from File** 导入 JSON。
2. 仅在启用 AI 时为 `OpenAI Chat Model` 配置 OpenAI 凭据。
3. 为 `Send Weather Email` 配置 SMTP 凭据。
4. 在 n8n 环境中提供运行配置：

   ```dotenv
   TZ=America/New_York
   GENERIC_TIMEZONE=America/New_York
   WEATHER_RECIPIENT_EMAIL=your-address@example.com
   WEATHER_FROM_EMAIL=weather-bot@example.com
   WEATHER_USE_AI=false
   ```

   时区变量配置自托管的 n8n 进程，不会修改电脑时区。调度仍由工作流中明确设置的时区决定。

   n8n 2.x 可能禁止读取环境变量。使用本导出的临时测试实例需要设置 `N8N_BLOCK_ENV_ACCESS_IN_NODE=false`。托管部署优先使用 n8n 变量或凭据配置，并在实例中调整 `Runtime Configuration`。真实地址与凭据不得进入 Git 导出。

   设置 `WEATHER_USE_AI=true` 可启用 OpenAI；默认 `false` 使用确定性摘要，不调用 AI。

5. 使用测试凭据运行 `Manual Test`，检查两座城市与邮件排版。
6. 完成运行验证后再激活工作流。Git 中的导出保持 inactive。

### 触发与自定义

`Daily 07:30`、`Manual Test`、`Run Once Webhook` 均连接到 `Runtime Configuration`。Webhook 保留 `GET /webhook/daily-brief/run`，返回末节点输出。操作与访问控制见[每日简报指南](workflows/daily-brief/README.md)。

- 调度：变更预期当地触发时间时，同时检查 `Daily 07:30` 和工作流时区。
- 城市：修改 `City List` 的名称、坐标和 IANA 时区；更换城市时同步修改固定的南京、芜湖标题。
- 简报：编辑 `Compose Dual-City Brief`。
- AI 风格：编辑 `AI English Summary` 的提示词及 `Compose Dual-City Brief` 生成的提示文本。
- 邮件排版：编辑 `Compose Email`。

### 技术栈与离线检查

使用 n8n 2.x、Open-Meteo、可选 OpenAI、SMTP、Node.js 20+ 标准库检查和 GitHub Actions。详见[架构文档](docs/architecture.md)与 [ADR 0001](docs/adr/0001-workflow-json-is-the-product-source.md)。

```bash
npm run check
```

检查不会访问天气 API、OpenAI 或 SMTP，也不会发送邮件；包含城市当地日期、小时选择和夏令时边界测试。代码、工作流标签、消息和文档使用英文；各 `README.md` 提供英文与简体中文内容。

### 运行验证与后续工作

1. 导入临时 n8n 实例，验证兼容性。
2. 激活前使用测试 SMTP 和可选 OpenAI 凭据完成端到端检查。
3. 根据实际部署方式选择手动导入、CLI 导入或环境同步。
4. 仅在另一个工作流证明确有复用需求时考虑共享包或自定义节点。
