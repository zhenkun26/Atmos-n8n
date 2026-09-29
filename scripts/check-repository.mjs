import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const root = new URL('../', import.meta.url);
const workflowsDirectory = new URL('../workflows/', import.meta.url);
const requiredFiles = [
  'AGENTS.md',
  'CONTEXT.md',
  'README.md',
  'docs/architecture.md',
  'docs/adr/0001-workflow-json-is-the-product-source.md',
  'workflows/README.md',
];

for (const relativePath of requiredFiles) {
  const contents = await readFile(new URL(relativePath, root), 'utf8');
  assert(contents.trim().length > 0, `${relativePath} must not be empty`);
}

async function collectWorkflowFiles(directory, prefix = '') {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const relativePath = `${prefix}${entry.name}`;
    if (entry.isDirectory()) {
      files.push(...await collectWorkflowFiles(new URL(`${entry.name}/`, directory), `${relativePath}/`));
    } else if (entry.isFile() && entry.name.endsWith('.json')) {
      files.push(relativePath);
    }
  }

  return files.sort();
}

const workflowFiles = await collectWorkflowFiles(workflowsDirectory);
assert(workflowFiles.length > 0, 'workflows/ must contain at least one workflow JSON file');

const secretPatterns = [
  /\bsk-[A-Za-z0-9_-]{16,}\b/,
  /\b(?:api[_-]?key|password|access[_-]?token)\b\s*[:=]\s*["'][^"']{8,}["']/i,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
];

export function validateWorkflow(filename, raw) {
  const workflow = JSON.parse(raw);

  assert(typeof workflow.id === 'string' && workflow.id.length > 0, `${filename}: root object must have a stable workflow id`);
  assert.equal(workflow.active, false, `${filename}: active must be false`);
  assert.deepEqual(workflow.pinData ?? {}, {}, `${filename}: pinData must be empty`);
  assert(Array.isArray(workflow.nodes) && workflow.nodes.length > 0, `${filename}: nodes must not be empty`);
  assert(workflow.connections && typeof workflow.connections === 'object', `${filename}: connections are missing`);
  assert(!raw.includes('"credentials"'), `${filename}: credential bindings must not be committed`);
  for (const pattern of secretPatterns) assert(!pattern.test(raw), `${filename}: potential secret or password detected`);

  const nodeNames = workflow.nodes.map((node) => node.name);
  const nodeIds = workflow.nodes.map((node) => node.id);
  assert.equal(new Set(nodeNames).size, nodeNames.length, `${filename}: node names must be unique`);
  assert.equal(new Set(nodeIds).size, nodeIds.length, `${filename}: node IDs must be unique`);
  const knownNodes = new Set(nodeNames);

  for (const [source, groups] of Object.entries(workflow.connections)) {
    assert(knownNodes.has(source), `${filename}: connection source does not exist: ${source}`);
    for (const outputs of Object.values(groups)) {
      for (const branch of outputs) {
        for (const edge of branch) assert(knownNodes.has(edge.node), `${filename}: connection target does not exist: ${edge.node}`);
      }
    }
  }

  const schedules = workflow.nodes.filter((node) => node.type === 'n8n-nodes-base.scheduleTrigger');
  if (schedules.length > 0) assert(workflow.settings?.timezone, `${filename}: scheduled workflows must declare a timezone`);

  for (const node of workflow.nodes.filter((candidate) => candidate.type === 'n8n-nodes-base.httpRequest')) {
    assert(Number(node.parameters?.options?.timeout) > 0, `${filename}: ${node.name} must configure a request timeout`);
    assert(node.onError, `${filename}: ${node.name} must configure error handling`);
  }

  return workflow;
}

export async function validateRepository() {
  for (const filename of workflowFiles) {
    const fileUrl = new URL(filename, workflowsDirectory);
    validateWorkflow(filename, await readFile(fileUrl, 'utf8'));
  }

  return workflowFiles.length;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const count = await validateRepository();
  console.log(`PASS: ${count} workflow(s) passed repository boundary checks.`);
}
