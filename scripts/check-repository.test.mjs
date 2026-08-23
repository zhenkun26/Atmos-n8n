import assert from 'node:assert/strict';
import { validateWorkflow } from './check-repository.mjs';

const validWorkflow = {
  name: '边界测试',
  id: 'boundary-test',
  active: false,
  pinData: {},
  settings: { timezone: 'Asia/Shanghai' },
  nodes: [
    {
      id: 'schedule-id',
      name: '定时器',
      type: 'n8n-nodes-base.scheduleTrigger',
      parameters: {},
    },
    {
      id: 'request-id',
      name: '天气请求',
      type: 'n8n-nodes-base.httpRequest',
      parameters: { options: { timeout: 15000 } },
      onError: 'continueRegularOutput',
    },
  ],
  connections: {
    定时器: {
      main: [[{ node: '天气请求', type: 'main', index: 0 }]],
    },
  },
};

const asJson = (workflow) => JSON.stringify(workflow);
const clone = () => structuredClone(validWorkflow);

assert.equal(validateWorkflow('valid.json', asJson(clone())).name, '边界测试');

const active = clone();
active.active = true;
assert.throws(() => validateWorkflow('active.json', asJson(active)), /active 必须为 false/);

const credentialBound = clone();
credentialBound.nodes[1].credentials = { headerAuth: { id: 'secret-id', name: 'secret' } };
assert.throws(() => validateWorkflow('credentials.json', asJson(credentialBound)), /不得提交凭证绑定/);

const brokenConnection = clone();
brokenConnection.connections.定时器.main[0][0].node = '不存在的节点';
assert.throws(() => validateWorkflow('broken.json', asJson(brokenConnection)), /连线目标节点不存在/);

const noTimeout = clone();
delete noTimeout.nodes[1].parameters.options.timeout;
assert.throws(() => validateWorkflow('timeout.json', asJson(noTimeout)), /必须配置请求超时/);

const noTimezone = clone();
delete noTimezone.settings.timezone;
assert.throws(() => validateWorkflow('timezone.json', asJson(noTimezone)), /必须声明时区/);

console.log('PASS: 仓库边界检查通过 1 个有效用例并拒绝 5 个违规用例。');
