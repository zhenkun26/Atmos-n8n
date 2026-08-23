import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const workflowPath = new URL('../workflows/daily-brief/nanjing-wuhu-daily-weather-email.json', import.meta.url);
const workflow = JSON.parse(await readFile(workflowPath, 'utf8'));
const byName = new Map(workflow.nodes.map((node) => [node.name, node]));

const requiredNodes = [
  '手动测试',
  '每天 07:30',
  '运行配置',
  '城市列表',
  '获取 Open-Meteo 预报',
  '关联城市与响应',
  '整理双城天气',
  '是否启用 AI',
  'AI 中文摘要',
  'OpenAI Chat Model',
  '生成邮件',
  '发送天气邮件',
];
for (const name of requiredNodes) assert(byName.has(name), `缺少节点：${name}`);
assert.equal(new Set(workflow.nodes.map((node) => node.id)).size, workflow.nodes.length, '节点 ID 必须唯一');
assert.equal(workflow.settings.timezone, 'Asia/Shanghai');

for (const [source, groups] of Object.entries(workflow.connections)) {
  assert(byName.has(source), `连线源节点不存在：${source}`);
  for (const outputs of Object.values(groups)) {
    for (const branch of outputs) {
      for (const edge of branch) assert(byName.has(edge.node), `连线目标节点不存在：${edge.node}`);
    }
  }
}

const schedule = byName.get('每天 07:30');
const interval = schedule.parameters.rule.interval[0];
assert.deepEqual([interval.triggerAtHour, interval.triggerAtMinute], [7, 30]);

const request = byName.get('获取 Open-Meteo 预报');
assert.equal(request.parameters.url, 'https://api.open-meteo.com/v1/forecast');
const query = Object.fromEntries(request.parameters.queryParameters.parameters.map(({ name, value }) => [name, value]));
assert.equal(query.timezone, 'Asia/Shanghai');
assert.match(query.daily, /precipitation_probability_max/);
assert.match(query.hourly, /apparent_temperature/);
assert.equal(request.onError, 'continueRegularOutput');

const cityCode = byName.get('城市列表').parameters.jsCode;
const makeCities = new Function('$input', cityCode);
const cities = makeCities({ first: () => ({ json: { recipientEmail: 'test@example.com', fromEmail: 'bot@example.com', useAi: false } }) });
assert.equal(cities.length, 2);
assert.deepEqual(cities.map((item) => item.json.city), ['南京', '芜湖']);
for (const item of cities) {
  assert(Number.isFinite(item.json.latitude));
  assert(Number.isFinite(item.json.longitude));
}

const fixture = (city, offset = 0) => ({
  json: {
    city,
    recipientEmail: 'test@example.com',
    fromEmail: 'bot@example.com',
    useAi: false,
    weather: {
      daily: {
        time: ['2026-08-23'],
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
        time: ['2026-08-23T09:00', '2026-08-23T12:00', '2026-08-23T15:00', '2026-08-23T18:00', '2026-08-23T21:00'],
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

const summaryCode = byName.get('整理双城天气').parameters.jsCode;
const summarize = new Function('$input', summaryCode);
const summary = summarize({ all: () => [fixture('南京'), fixture('芜湖', 1)] })[0].json;
assert.equal(summary.cards.length, 2);
assert.match(summary.ruleSummary, /南京/);
assert.match(summary.ruleSummary, /芜湖/);
assert.match(summary.ruleSummary, /建议随身带伞/);
assert.match(summary.aiPrompt, /不虚构数据/);

const failed = summarize({ all: () => [fixture('南京'), { json: { city: '芜湖', weather: { error: 'timeout' } } }] })[0].json;
assert.deepEqual(failed.problems, ['芜湖']);
assert.match(failed.ruleSummary, /天气数据暂时不可用/);

const emailCode = byName.get('生成邮件').parameters.jsCode;
const makeEmail = new Function('$input', '$items', emailCode);
const baseItems = (name) => name === '整理双城天气' ? [{ json: summary }] : [];
const fallbackEmail = makeEmail({ first: () => ({ json: summary }) }, baseItems)[0].json;
assert.equal(fallbackEmail.toEmail, 'test@example.com');
assert.equal(fallbackEmail.fromEmail, 'bot@example.com');
assert.equal(fallbackEmail.usedAi, false);
assert.match(fallbackEmail.html, /南京/);
assert.match(fallbackEmail.html, /芜湖/);

const aiEmail = makeEmail({ first: () => ({ json: { text: '双城今日偏热，芜湖有雨，出门请带伞。' } }) }, baseItems)[0].json;
assert.equal(aiEmail.usedAi, true);
assert.match(aiEmail.html, /芜湖有雨/);

const emailNode = byName.get('发送天气邮件');
assert.equal(emailNode.type, 'n8n-nodes-base.emailSend');
assert.match(emailNode.parameters.toEmail, /toEmail/);
assert.match(emailNode.parameters.fromEmail, /fromEmail/);
assert.equal(workflow.active, false, '导入后必须由用户完成凭证配置再启用');

console.log('PASS: workflow JSON、节点连线、双城请求契约、降级路径与邮件输出校验通过（21 组断言）。');
