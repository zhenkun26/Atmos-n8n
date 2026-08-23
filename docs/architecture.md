# Architecture and technology stack

## System shape

The repository is deliberately workflow-first. An importable n8n JSON document is the deployable product; repository code supplies offline feedback around that artifact.

```text
Schedule or manual trigger
  -> runtime configuration
  -> city forecast requests
  -> deterministic rule summary
  -> optional AI summary
  -> email delivery
```

## Module seams

### Forecast acquisition

Interface: configured city coordinates in, normalized forecast payload or explicit error out.

Current adapter: Open-Meteo through n8n's HTTP Request node. The adapter is replaceable without changing rule-summary or delivery semantics.

### Brief composition

Interface: two city forecast results in, one complete rule summary plus presentation-ready city cards out.

This is the deepest module in the workflow. Weather-code translation, thresholds, hourly selection, degraded-city handling, and advice remain local to it.

### Editorial enhancement

Interface: rule summary in, optional fact-preserving prose out.

Current adapter: OpenAI Chat Model. This seam is optional by design; failure falls through to deterministic prose.

### Delivery

Interface: subject, HTML body, sender, and recipient in; one email attempt out.

Current adapter: n8n SMTP email node. Credentials remain inside n8n.

## Selected stack

| Concern | Choice | Boundary |
| --- | --- | --- |
| Orchestration | n8n 2.x | Workflow JSON stays importable and inactive in Git |
| Weather data | Open-Meteo Forecast API | Read-only request, 15-second timeout, explicit degraded path |
| Optional editorial AI | OpenAI Chat Model node | Never owns weather facts or delivery completeness |
| Delivery | SMTP email node | Credentials and recipient configuration stay outside Git |
| Offline checks | Node.js 20+ standard library | No runtime calls or third-party packages |
| Continuous feedback | GitHub Actions | Runs the same `npm run check` command as local development |

## Why no application framework yet

There is no standalone web service, database, or user interface. Adding TypeScript compilation, a test framework, Docker Compose, or a custom n8n node would create maintenance without improving the current workflow seam. Introduce one only when a real second workflow or runtime requirement proves that the existing JSON and Node.js checks are insufficient.

## Security boundary

- Git contains workflow structure, tests, and documentation only.
- n8n owns credentials and execution history.
- Local `.env*`, `.n8n/`, credential exports, and execution fixtures containing real data are ignored.
- CI performs static and fixture-based checks only and has no weather, OpenAI, or SMTP secret.

## Deployment boundary

The current repository supports manual import into n8n. Automated deployment is intentionally deferred until an instance, edition, and environment strategy are chosen. n8n's native Git-backed environments are plan-dependent, so repository CI must not assume that feature is available.
