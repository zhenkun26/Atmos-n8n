# Atmos n8n engineering guide

## Read first

1. Read `CONTEXT.md` for canonical domain terms.
2. Read `docs/architecture.md` before changing a workflow boundary.
3. Read the relevant ADR under `docs/adr/` before changing a recorded decision.
4. Read `workflows/README.md` before adding or exporting a workflow.

## Repository boundaries

- `workflows/` contains importable n8n workflow JSON and is the product surface.
- `scripts/` contains offline validation only. Validation must not call external APIs, invoke AI, or send notifications.
- `docs/` explains architecture and durable decisions. `CONTEXT.md` is a glossary, not a design document.
- Credentials, tokens, recipient addresses, execution data, and local n8n state never belong in Git.

## Language and local time

- Use English for code, workflow labels, prompts, delivery text, diagnostics, and documentation.
- Keep each `README.md` bilingual in English and Simplified Chinese.
- Keep the computer timezone (`America/New_York`) separate from workflow scheduling and city-local forecast time.
- Use each city's IANA timezone for forecast requests and local-date calculations. The current daily brief remains scheduled at 07:30 `Asia/Shanghai`.

## Workflow invariants

- Committed workflows are inactive and contain no credential bindings or pinned execution data.
- Every external call has a timeout and an explicit failure path.
- AI may improve presentation but must not be required for a useful weather brief.
- A partial city-data failure is visible in the delivery. Never silently omit a configured city.
- Runtime values come from n8n credentials, variables, or environment configuration, not literals in exported JSON.
- A workflow change updates or extends its offline validator in the same change.

## Feedback loop

Run before handoff:

```bash
npm run check
```

If a local n8n executable is available, also import the workflow into a disposable instance. Never use production credentials for validation.

## Change discipline

- Prefer one complete vertical workflow over speculative shared abstractions.
- Add a seam only when two real adapters or call paths need to vary.
- Write an ADR only for a decision that is costly to reverse, surprising without context, and based on a real trade-off.
- Do not commit, push, deploy, install dependencies, or activate a workflow without explicit user authorization.
