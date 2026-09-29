# Atmos n8n domain language

## Terms

**Weather brief**
A scheduled, human-readable summary that helps a recipient plan near-term activity using weather information and actionable advice.

**City forecast**
The weather information for one configured city over the brief's reporting period, with dates and hours expressed in that city's local timezone.

**City timezone**
The IANA timezone configured for a forecast location, such as `Asia/Shanghai` for Nanjing and Wuhu. It defines the local calendar date and clock hours used by that city's forecast.

**Host timezone**
The computer's timezone, currently `America/New_York`. It is distinct from a forecast location's timezone and a workflow's schedule timezone.

**Schedule timezone**
The timezone in which the daily trigger's clock time is interpreted. The current dual-city brief uses 07:30 `Asia/Shanghai`.

**Dual-city brief**
One weather brief that compares and reports exactly two city forecasts in a single delivery.

**Rule summary**
The deterministic, complete weather brief produced directly from forecast values and decision thresholds.

**AI summary**
An optional editorial rewrite of the rule summary. It may improve clarity but must not add or alter weather facts.

**Delivery**
The recipient-facing message produced from a weather brief. A delivery may report complete data or explicitly identify degraded city forecasts.

**Degraded delivery**
A delivery produced when an optional capability or one city forecast is unavailable. It remains useful and states what failed.

**Runtime configuration**
Values supplied by the operator for one deployment, including recipients, senders, schedules, feature switches, and credentials.

## Relationships

- A dual-city brief contains two city forecasts.
- A rule summary is sufficient to create a delivery.
- An AI summary may replace the opening prose of a delivery but never the underlying rule summary.
- Missing city forecasts create a degraded delivery, not a silently incomplete delivery.
- Runtime configuration selects recipients and optional capabilities without changing the meaning of a weather brief.

## Rejected terms

- Use **weather brief**, not “report”, when referring to the recipient-facing daily product.
- Use **delivery**, not “notification”, when the channel may be email or another medium.
- Use **degraded delivery**, not “partial success”, when describing the user-visible outcome.
