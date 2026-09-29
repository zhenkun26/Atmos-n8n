import assert from 'node:assert/strict';
import { validateWorkflow } from './check-repository.mjs';

const validWorkflow = {
  name: 'Boundary Test',
  id: 'boundary-test',
  active: false,
  pinData: {},
  settings: { timezone: 'Asia/Shanghai' },
  nodes: [
    {
      id: 'schedule-id',
      name: 'Schedule',
      type: 'n8n-nodes-base.scheduleTrigger',
      parameters: {},
    },
    {
      id: 'request-id',
      name: 'Weather Request',
      type: 'n8n-nodes-base.httpRequest',
      parameters: { options: { timeout: 15000 } },
      onError: 'continueRegularOutput',
    },
  ],
  connections: {
    Schedule: {
      main: [[{ node: 'Weather Request', type: 'main', index: 0 }]],
    },
  },
};

const asJson = (workflow) => JSON.stringify(workflow);
const clone = () => structuredClone(validWorkflow);

assert.equal(validateWorkflow('valid.json', asJson(clone())).name, 'Boundary Test');

const active = clone();
active.active = true;
assert.throws(() => validateWorkflow('active.json', asJson(active)), /active must be false/);

const credentialBound = clone();
credentialBound.nodes[1].credentials = { headerAuth: { id: 'secret-id', name: 'secret' } };
assert.throws(() => validateWorkflow('credentials.json', asJson(credentialBound)), /credential bindings must not be committed/);

const brokenConnection = clone();
brokenConnection.connections.Schedule.main[0][0].node = 'Missing Node';
assert.throws(() => validateWorkflow('broken.json', asJson(brokenConnection)), /connection target does not exist/);

const noTimeout = clone();
delete noTimeout.nodes[1].parameters.options.timeout;
assert.throws(() => validateWorkflow('timeout.json', asJson(noTimeout)), /must configure a request timeout/);

const noTimezone = clone();
delete noTimezone.settings.timezone;
assert.throws(() => validateWorkflow('timezone.json', asJson(noTimezone)), /must declare a timezone/);

console.log('PASS: Repository boundary checks accepted 1 valid case and rejected 5 invalid cases.');
