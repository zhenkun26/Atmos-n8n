# Daily Brief / 每日简报

## English

This directory contains daily weather briefs and related delivery variants.

`nanjing-wuhu-daily-weather-email.json` produces an English weather brief for Nanjing and Wuhu and delivers it through SMTP email.

The workflow supports three triggers:

1. **Schedule:** `Daily 07:30` runs at 07:30 **Asia/Shanghai**. The computer and n8n instance must be running; missed runs are not replayed automatically.
2. **Editor:** use `Manual Test` in the n8n editor.
3. **Webhook:** once the workflow is activated in the instance, `Run Once Webhook` can trigger an immediate run:

   ```bash
   curl "http://localhost:5678/webhook/daily-brief/run"
   ```

   The response is the final SMTP node output, including `accepted`/`rejected` where supplied, for checking the delivery attempt. This is useful after missing the scheduled time and can be called by a macOS Shortcut or login hook. The production webhook is available only when the workflow is active. Keep access local or configure header authentication before exposing it to a network.

The computer uses **America/New_York**. Scheduling remains in **Asia/Shanghai**, while forecast requests, hourly labels, and fallback dates use each city's configured IANA timezone. Both current cities use `Asia/Shanghai`; every city card shows its local date and timezone. Changes to the computer timezone do not shift forecast hours.

Exports remain inactive and contain no credential bindings. Configure recipients, senders, and SMTP credentials only at runtime. See the [project README](../../README.md) for configuration and offline checks.

## 简体中文

本目录保存每日天气简报及相关交付变体。

`nanjing-wuhu-daily-weather-email.json` 为南京、芜湖生成英文天气简报，并通过 SMTP 邮件发送。

工作流支持三种触发方式：

1. **定时：**`Daily 07:30` 在 **Asia/Shanghai 07:30** 执行。电脑和 n8n 实例必须运行；错过的任务不会自动补发。
2. **编辑器：**在 n8n 编辑器中运行 `Manual Test`。
3. **Webhook：**工作流在实例中激活后，可通过 `Run Once Webhook` 立即执行：

   ```bash
   curl "http://localhost:5678/webhook/daily-brief/run"
   ```

   响应为末尾 SMTP 节点输出，包括其提供的 `accepted`/`rejected` 字段，用于检查发送尝试。适合错过定时时刻后补发，也可由 macOS 快捷指令或登录钩子调用。生产 webhook 仅在工作流激活后可用。保持本地访问，或在向网络暴露前配置 header authentication。

电脑使用 **America/New_York**。调度仍使用 **Asia/Shanghai**，天气请求、小时标签和失败时的日期回退则采用各城市配置的 IANA 时区。当前两个城市均为 `Asia/Shanghai`；每张城市卡片展示当地日期与时区。修改电脑时区不会使预报小时发生偏移。

导出保持 inactive，不包含凭据绑定。收件人、发件人和 SMTP 凭据仅在运行时配置。配置与离线检查见[项目 README](../../README.md)。
