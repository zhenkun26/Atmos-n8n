# 每日简报

这个目录专门放每日天气简报及其后续交付变体。

当前工作流：

- `nanjing-wuhu-daily-weather-email.json`：每天 07:30 生成南京、芜湖天气简报并通过 SMTP 邮箱发送。

目录中的工作流保持 inactive、无凭据绑定；收件人、发件人和 SMTP 凭据在 n8n 运行时配置。
