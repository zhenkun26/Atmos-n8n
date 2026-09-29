# Workflow contract

## English

Each `*.json` file in this directory or one of its domain subdirectories is an
importable n8n workflow artifact. Keep related delivery variants together;
for example, `daily-brief/` contains the scheduled weather brief.

### Required properties

- Human-readable, unique `name`.
- Stable root-level workflow `id` required by n8n import.
- Unique node names and node IDs.
- Connections that reference existing nodes.
- `active: false` in Git.
- Empty `pinData` in Git.
- No `credentials` objects, tokens, passwords, recipient addresses, or local instance IDs.
- A workflow timezone when it contains scheduled behavior.
- Timeout and failure behavior on external request nodes.

### File naming

Use a lowercase kebab-case subdirectory for a workflow family, then use a file
name that describes the scope, cadence, and delivery:

```text
<workflow-family>/<scope>-<cadence>-<purpose>-<delivery>.json
```

### Change checklist

1. Export or edit the workflow without credential bindings.
2. Keep it inactive.
3. Update the focused validator for changed behavior.
4. Run `npm run check`.
5. Import into a disposable n8n instance and run with test credentials before activation.

For this repository's environment-based runtime configuration, a disposable n8n test process must set `N8N_BLOCK_ENV_ACCESS_IN_NODE=false`. In a managed deployment, prefer n8n variables or credential-backed values where possible.

### Language and timezones

Workflow names, node labels, prompts, generated messages, and validation diagnostics use English. README files contain English and Simplified Chinese sections; other documentation uses English.

Keep the host timezone, workflow schedule timezone, and forecast-location timezone separate. Configure an IANA timezone for each city and use it for the weather request and any local-date fallback. Do not reinterpret local forecast timestamps in the host timezone.

## 简体中文

本目录及其领域子目录中的每个 `*.json` 都是可导入的 n8n 工作流。同一交付类型的变体应放在一起，例如 `daily-brief/` 保存定时天气简报。

### 必需属性

- 可读且唯一的工作流 `name`。
- n8n 导入所需的稳定根级工作流 `id`。
- 唯一的节点名称和节点 ID。
- 连线只能引用存在的节点。
- Git 中保持 `active: false`，且 `pinData` 为空。
- 不包含 `credentials` 对象、令牌、密码、收件地址或本地实例 ID。
- 定时工作流必须声明时区。
- 外部请求节点必须有超时与失败处理。

### 文件命名

每类工作流使用小写 kebab-case 子目录，文件名说明范围、周期、用途和交付渠道：

```text
<workflow-family>/<scope>-<cadence>-<purpose>-<delivery>.json
```

### 修改检查清单

1. 编辑或导出工作流时移除凭据绑定。
2. 保持 inactive。
3. 为行为变更更新专用校验脚本。
4. 运行 `npm run check`。
5. 激活前导入临时 n8n 实例，并使用测试凭据执行。

本仓库使用环境变量提供运行配置，临时 n8n 测试进程需要设置 `N8N_BLOCK_ENV_ACCESS_IN_NODE=false`。托管部署优先使用 n8n 变量或凭据配置。

### 语言与时区

工作流名称、节点标签、提示词、生成消息和校验提示使用英文。README 文件包含英文与简体中文部分，其他文档使用英文。

电脑时区、工作流调度时区和天气地点时区分别处理。每个城市配置 IANA 时区，用于天气请求和当地日期回退。不要用电脑时区重新解释预报中的当地时间戳。
