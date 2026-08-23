# ADR 0001: Treat exported n8n workflow JSON as the product source

- Status: Accepted
- Date: 2026-08-23

## Context

This project currently delivers automation rather than a standalone application. Its behavior lives in n8n nodes, expressions, connections, and runtime credentials. We need a reviewable source format and a feedback loop without committing an n8n database or requiring every contributor to run a full instance.

## Decision

Store one inactive, credential-free JSON document per workflow under `workflows/`. Treat that document as the product source reviewed in Git.

Use dependency-free Node.js scripts to check repository invariants and execute Code-node logic against fixtures. Keep n8n itself as the runtime and integration-test surface.

## Consequences

- Workflow changes are visible in Git and can be checked without secrets.
- Code-node behavior receives fast offline tests.
- A real n8n import and credential-backed execution remains necessary before activation.
- JSON diffs can be noisy after editor exports; reviewers should focus on node parameters, connections, and type versions.
- Shared libraries are deferred until multiple workflows demonstrate a real reusable seam.

## Alternatives considered

### Commit the n8n database

Rejected because it mixes runtime state, execution history, and potentially sensitive configuration with source control.

### Build a custom TypeScript application now

Rejected because it duplicates n8n orchestration before the workflow domain has proven the need for a standalone service.

### Add a custom n8n node package now

Rejected because only one workflow currently needs the logic. A package would expose a larger interface without proven reuse.
