# Workflow contract

Each `*.json` file in this directory or one of its domain subdirectories is an
importable n8n workflow artifact. Keep related delivery variants together;
for example, `daily-brief/` contains the scheduled weather brief.

## Required properties

- Human-readable, unique `name`.
- Stable root-level workflow `id` required by n8n import.
- Unique node names and node IDs.
- Connections that reference existing nodes.
- `active: false` in Git.
- Empty `pinData` in Git.
- No `credentials` objects, tokens, passwords, recipient addresses, or local instance IDs.
- A workflow timezone when it contains scheduled behavior.
- Timeout and failure behavior on external request nodes.

## File naming

Use a lowercase kebab-case subdirectory for a workflow family, then use a file
name that describes the scope, cadence, and delivery:

```text
<workflow-family>/<scope>-<cadence>-<purpose>-<delivery>.json
```

## Change checklist

1. Export or edit the workflow without credential bindings.
2. Keep it inactive.
3. Update the focused validator for changed behavior.
4. Run `npm run check`.
5. Import into a disposable n8n instance and run with test credentials before activation.

For this repository's environment-based runtime configuration, a disposable n8n test process must set `N8N_BLOCK_ENV_ACCESS_IN_NODE=false`. In a managed deployment, prefer n8n variables or credential-backed values where possible.
