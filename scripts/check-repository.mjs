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
  assert(contents.trim().length > 0, `${relativePath} 不能为空`);
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
assert(workflowFiles.length > 0, 'workflows/ 至少需要一个工作流 JSON');

const secretPatterns = [
  /\bsk-[A-Za-z0-9_-]{16,}\b/,
  /\b(?:api[_-]?key|password|access[_-]?token)\b\s*[:=]\s*["'][^"']{8,}["']/i,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
];

export function validateWorkflow(filename, raw) {
  const workflow = JSON.parse(raw);

  assert(typeof workflow.id === 'string' && workflow.id.length > 0, `${filename}: 根对象必须有稳定的 workflow id`);
  assert.equal(workflow.active, false, `${filename}: active 必须为 false`);
  assert.deepEqual(workflow.pinData ?? {}, {}, `${filename}: pinData 必须为空`);
  assert(Array.isArray(workflow.nodes) && workflow.nodes.length > 0, `${filename}: nodes 不能为空`);
  assert(workflow.connections && typeof workflow.connections === 'object', `${filename}: connections 缺失`);
  assert(!raw.includes('"credentials"'), `${filename}: 不得提交凭证绑定`);
  for (const pattern of secretPatterns) assert(!pattern.test(raw), `${filename}: 疑似包含密钥或密码`);

  const nodeNames = workflow.nodes.map((node) => node.name);
  const nodeIds = workflow.nodes.map((node) => node.id);
  assert.equal(new Set(nodeNames).size, nodeNames.length, `${filename}: 节点名称必须唯一`);
  assert.equal(new Set(nodeIds).size, nodeIds.length, `${filename}: 节点 ID 必须唯一`);
  const knownNodes = new Set(nodeNames);

  for (const [source, groups] of Object.entries(workflow.connections)) {
    assert(knownNodes.has(source), `${filename}: 连线源节点不存在：${source}`);
    for (const outputs of Object.values(groups)) {
      for (const branch of outputs) {
        for (const edge of branch) assert(knownNodes.has(edge.node), `${filename}: 连线目标节点不存在：${edge.node}`);
      }
    }
  }

  const schedules = workflow.nodes.filter((node) => node.type === 'n8n-nodes-base.scheduleTrigger');
  if (schedules.length > 0) assert(workflow.settings?.timezone, `${filename}: 定时工作流必须声明时区`);

  for (const node of workflow.nodes.filter((candidate) => candidate.type === 'n8n-nodes-base.httpRequest')) {
    assert(Number(node.parameters?.options?.timeout) > 0, `${filename}: ${node.name} 必须配置请求超时`);
    assert(node.onError, `${filename}: ${node.name} 必须配置错误处理`);
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
  console.log(`PASS: ${count} 个工作流通过仓库边界检查。`);
}
