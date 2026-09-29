import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const workflowPath = new URL('../workflows/daily-brief/nanjing-wuhu-daily-weather-email.json', import.meta.url);
const workflow = JSON.parse(await readFile(workflowPath, 'utf8'));
const byName = new Map(workflow.nodes.map((node) => [node.name, node]));

const requiredNodes = [
  'Manual Test',
  'Daily 07:30',
  'Run Once Webhook',
  'Runtime Configuration',
  'City List',
  'Fetch Open-Meteo Forecast',
  'Associate Cities and Responses',
  'Compose Dual-City Brief',
  'Use AI',
  'AI English Summary',
  'OpenAI Chat Model',
  'Compose Email',
  'Send Weather Email',
];
for (const name of requiredNodes) assert(byName.has(name), `Missing node: ${name}`);
assert.equal(new Set(workflow.nodes.map((node) => node.id)).size, workflow.nodes.length, 'node IDs must be unique');
assert.equal(workflow.settings.timezone, 'Asia/Shanghai');

for (const [source, groups] of Object.entries(workflow.connections)) {
  assert(byName.has(source), `connection source does not exist: ${source}`);
  for (const outputs of Object.values(groups)) {
    for (const branch of outputs) {
      for (const edge of branch) assert(byName.has(edge.node), `connection target does not exist: ${edge.node}`);
    }
  }
}

const schedule = byName.get('Daily 07:30');
const interval = schedule.parameters.rule.interval[0];
assert.deepEqual([interval.triggerAtHour, interval.triggerAtMinute], [7, 30]);

const webhook = byName.get('Run Once Webhook');
assert.equal(webhook.type, 'n8n-nodes-base.webhook', 'Run Once Webhook must be a webhook node');
assert.equal(webhook.parameters.httpMethod, 'GET', 'Run Once Webhook must support GET for browser and shortcut calls');
assert.equal(webhook.parameters.path, 'daily-brief/run', 'Run Once Webhook must retain its stable path for bookmarks and scripts');
assert.equal(webhook.parameters.responseMode, 'lastNode', 'Run Once Webhook must return the last node output to confirm delivery');
assert.deepEqual(
  workflow.connections['Run Once Webhook'],
  { main: [[{ node: 'Runtime Configuration', type: 'main', index: 0 }]] },
  'Run Once Webhook must connect to Runtime Configuration',
);

const request = byName.get('Fetch Open-Meteo Forecast');
assert.equal(request.parameters.url, 'https://api.open-meteo.com/v1/forecast');
const query = Object.fromEntries(request.parameters.queryParameters.parameters.map(({ name, value }) => [name, value]));
assert.equal(query.timezone, '={{ $json.timezone }}', 'Forecast requests must use each city timezone');
assert.match(query.daily, /precipitation_probability_max/);
assert.match(query.hourly, /apparent_temperature/);
assert.equal(request.onError, 'continueRegularOutput');

const cityCode = byName.get('City List').parameters.jsCode;
const makeCities = new Function('$input', cityCode);
const cities = makeCities({ first: () => ({ json: { recipientEmail: 'test@example.com', fromEmail: 'bot@example.com', useAi: false } }) });
assert.equal(cities.length, 2);
assert.deepEqual(cities.map((item) => item.json.city), ['Nanjing', 'Wuhu']);
for (const item of cities) {
  assert(Number.isFinite(item.json.latitude));
  assert(Number.isFinite(item.json.longitude));
  assert.equal(item.json.timezone, 'Asia/Shanghai');
}

const associate = new Function('$input', '$items', byName.get('Associate Cities and Responses').parameters.jsCode);
const responses = [{ json: { timezone: 'Asia/Shanghai', daily: {} } }, { json: { error: 'timeout' } }];
const associated = associate({ all: () => responses }, (name) => {
  assert.equal(name, 'City List');
  return cities;
});
assert.deepEqual(associated.map(({ json }) => json.timezone), ['Asia/Shanghai', 'Asia/Shanghai']);
assert.deepEqual(associated.map(({ json }) => json.city), ['Nanjing', 'Wuhu']);
assert.deepEqual(associated[1].json.weather, { error: 'timeout' });

const fixture = (city, offset = 0, timezone = 'Asia/Shanghai', date = '2026-08-23') => ({
  json: {
    city,
    timezone,
    recipientEmail: 'test@example.com',
    fromEmail: 'bot@example.com',
    useAi: false,
    weather: {
      daily: {
        time: [date],
        weather_code: [offset ? 61 : 1],
        temperature_2m_max: [34 + offset],
        temperature_2m_min: [25],
        apparent_temperature_max: [37 + offset],
        precipitation_probability_max: [30 + offset * 40],
        precipitation_sum: [offset * 2.5],
        wind_speed_10m_max: [18],
        wind_gusts_10m_max: [25],
        uv_index_max: [7],
      },
      hourly: {
        time: ['09:00', '12:00', '15:00', '18:00', '21:00'].map((clock) => `${date}T${clock}`),
        temperature_2m: [27, 31, 34, 31, 28],
        apparent_temperature: [29, 34, 37, 34, 30],
        precipitation_probability: [10, 20, 30, 20, 10],
        weather_code: [1, 1, 2, 2, 1],
        relative_humidity_2m: [80, 70, 60, 68, 76],
        wind_speed_10m: [8, 10, 12, 9, 7],
      },
    },
  },
});

const summaryCode = byName.get('Compose Dual-City Brief').parameters.jsCode;
const summarize = new Function('$input', summaryCode);
const summary = summarize({ all: () => [fixture('Nanjing'), fixture('Wuhu', 1)] })[0].json;
assert.equal(summary.cards.length, 2);
assert.match(summary.ruleSummary, /Nanjing/);
assert.match(summary.ruleSummary, /Wuhu/);
assert.match(summary.ruleSummary, /Carry an umbrella/);
assert.match(summary.aiPrompt, /Do not invent data/);
assert.match(summary.aiPrompt, /English/);
assert.deepEqual(summary.cards.map((card) => [card.date, card.timezone]), [
  ['2026-08-23', 'Asia/Shanghai'], ['2026-08-23', 'Asia/Shanghai'],
]);
assert.equal(summary.cards[0].hourlyRows[0], '09:00 Mostly clear or partly cloudy 27°C (feels like 29°C), precipitation 10%');

const failed = summarize({ all: () => [fixture('Nanjing'), associated[1]] })[0].json;
assert.deepEqual(failed.problems, ['Wuhu']);
assert.match(failed.ruleSummary, /Weather data is temporarily unavailable/);
assert.equal(failed.cards[1].timezone, 'Asia/Shanghai');

// A fixed instant exposes accidental use of the host timezone or a fixed UTC offset.
const summarizeAt = (items, instant) => {
  class FixedDate extends Date {
    constructor(...args) { super(...(args.length ? args : [instant])); }
  }
  return new Function('$input', 'Date', summaryCode)({ all: () => items }, FixedDate)[0].json;
};
const unavailable = (city, timezone) => ({ json: { city, timezone, weather: { error: 'timeout' } } });
for (const [instant, newYorkDate, shanghaiDate] of [
  ['2026-01-01T04:30:00Z', '2025-12-31', '2026-01-01'],
  ['2026-07-01T04:30:00Z', '2026-07-01', '2026-07-01'],
  ['2026-03-09T04:30:00Z', '2026-03-09', '2026-03-09'],
  ['2026-11-02T04:30:00Z', '2026-11-01', '2026-11-02'],
]) {
  const local = summarizeAt([
    unavailable('New York', 'America/New_York'), unavailable('Nanjing', 'Asia/Shanghai'),
  ], instant);
  assert.deepEqual(local.cards.map((card) => card.date), [newYorkDate, shanghaiDate]);
  assert.deepEqual(local.problems, ['New York', 'Nanjing']);
  assert.match(local.ruleSummary, /America\/New_York/);
  assert.match(local.ruleSummary, /Asia\/Shanghai/);
}

const localForecasts = summarizeAt([
  fixture('New York', 0, 'America/New_York', '2026-08-23'),
  fixture('Nanjing', 1, 'Asia/Shanghai', '2026-08-24'),
], '2026-08-23T16:30:00Z');
assert.deepEqual(localForecasts.cards.map((card) => card.date), ['2026-08-23', '2026-08-24']);
assert.equal(localForecasts.date, '2026-08-23 / 2026-08-24');
assert(localForecasts.cards.every((card) => card.hourlyRows[0].startsWith('09:00 ')));
assert(localForecasts.cards.every((card) => !card.hourlyRows[0].includes('No data available')));
assert.throws(() => summarize({ all: () => [unavailable('Unknown', undefined)] }), /Missing timezone for Unknown/);

const emailCode = byName.get('Compose Email').parameters.jsCode;
const makeEmail = new Function('$input', '$items', emailCode);
const baseItems = (name) => name === 'Compose Dual-City Brief' ? [{ json: summary }] : [];
const fallbackEmail = makeEmail({ first: () => ({ json: summary }) }, baseItems)[0].json;
assert.equal(fallbackEmail.toEmail, 'test@example.com');
assert.equal(fallbackEmail.fromEmail, 'bot@example.com');
assert.equal(fallbackEmail.usedAi, false);
assert.match(fallbackEmail.html, /Nanjing/);
assert.match(fallbackEmail.html, /Wuhu/);
assert.match(fallbackEmail.html, /Asia\/Shanghai/);
assert.match(fallbackEmail.html, /Times are local to each city/);
assert.equal(fallbackEmail.subject, 'Nanjing and Wuhu Weather Brief | 2026-08-23');

const degradedEmail = makeEmail({ first: () => ({ json: failed }) }, () => [{ json: failed }])[0].json;
assert.match(degradedEmail.html, /Weather data is temporarily unavailable/);
assert.match(degradedEmail.html, /weather data could not be retrieved for Wuhu/);
const localEmail = makeEmail({ first: () => ({ json: localForecasts }) }, () => [{ json: localForecasts }])[0].json;
assert.match(localEmail.html, /2026-08-23 · America\/New_York/);
assert.match(localEmail.html, /2026-08-24 · Asia\/Shanghai/);

const aiEmail = makeEmail({ first: () => ({ json: { text: 'Both cities are warm today, with rain in Wuhu. Carry an umbrella.' } }) }, baseItems)[0].json;
assert.equal(aiEmail.usedAi, true);
assert.match(aiEmail.html, /rain in Wuhu/);

const emailNode = byName.get('Send Weather Email');
assert.equal(emailNode.type, 'n8n-nodes-base.emailSend');
assert.match(emailNode.parameters.toEmail, /toEmail/);
assert.match(emailNode.parameters.fromEmail, /fromEmail/);
assert.equal(workflow.active, false, 'Configure credentials after import before activating the workflow');

console.log('PASS: Workflow structure, triggers, city-local dates/hours, DST boundaries, degraded paths, and English email output checks passed.');
