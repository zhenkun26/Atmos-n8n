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

Interface: configured city coordinates and IANA timezone in, normalized forecast payload or explicit error out. City identity and timezone remain attached even when a request fails.

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

## Language and time handling

Workflow labels, code, prompts, diagnostics, and delivered weather briefs use English. Each `README.md` provides matching English and Simplified Chinese documentation.

Three timezone settings have distinct responsibilities:

| Setting | Value | Responsibility |
| --- | --- | --- |
| Computer timezone | `America/New_York` | System clock presentation |
| Workflow schedule timezone | `Asia/Shanghai` | Daily trigger at 07:30 for the current two cities |
| City timezone | Per-city IANA name; both currently `Asia/Shanghai` | Forecast requests, local dates, hourly labels, and missing-data date fallback |

The explicit workflow timezone controls the schedule independently of the n8n instance timezone. A self-hosted process can use `TZ=America/New_York` and `GENERIC_TIMEZONE=America/New_York`; these settings do not change the computer timezone or override this workflow's explicit schedule timezone. See the [n8n Schedule Trigger documentation](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.scheduletrigger/) and [timezone configuration](https://docs.n8n.io/hosting/configuration/configuration-examples/time-zone/).

`City List` supplies the timezone to the weather request. Open-Meteo returns dates and hours in the requested timezone, so composition matches the provider's date and hour strings directly rather than parsing them in the host timezone. If daily dates are unavailable, composition calculates the current date with the city's explicit timezone; missing timezone metadata is an error rather than an implicit host-time fallback. Each card includes its date and timezone, including degraded cards. The brief's date label lists distinct local dates when needed. See the [Open-Meteo timezone parameter](https://open-meteo.com/en/docs).

Offline fixtures cover local midnight/year boundaries, winter and summer offsets, daylight-saving transitions, differing city-local dates, and failed forecasts. They do not replace a real n8n import or credential-backed runtime verification.

## Why no application framework yet

There is no standalone web service, database, or user interface. Adding TypeScript compilation, a test framework, Docker Compose, or a custom n8n node would create maintenance without improving the current workflow seam. Introduce one only when a real second workflow or runtime requirement proves that the existing JSON and Node.js checks are insufficient.

## Security boundary

- Git contains workflow structure, tests, and documentation only.
- n8n owns credentials and execution history.
- Local `.env*`, `.n8n/`, credential exports, and execution fixtures containing real data are ignored.
- CI performs static and fixture-based checks only and has no weather, OpenAI, or SMTP secret.

## Deployment boundary

The current repository supports manual import into n8n. Automated deployment is intentionally deferred until an instance, edition, and environment strategy are chosen. n8n's native Git-backed environments are plan-dependent, so repository CI must not assume that feature is available.
