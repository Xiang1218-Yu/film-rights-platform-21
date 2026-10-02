import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import type { AddressInfo } from 'node:net';
import { app } from './index.js';

const server = app.listen(0);
const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

after(async () => {
  await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
});

const projectPaths = [
  '/summary',
  '/rights-conflicts',
  '/assets',
  '/contracts',
];

for (const suffix of projectPaths) {
  test(`unknown project returns 404 from ${suffix}`, async () => {
    const response = await fetch(`${base}/api/projects/PRJ-UNKNOWN${suffix}`);
    const body = await response.json();

    assert.equal(response.status, 404);
    assert.deepEqual(body, { message: '项目不存在' });
  });
}

test('unknown project returns 404 from budget lines', async () => {
  const response = await fetch(`${base}/api/budgets/PRJ-UNKNOWN/lines`);
  const body = await response.json();

  assert.equal(response.status, 404);
  assert.deepEqual(body, { message: '项目不存在' });
});

test('existing project without related records still receives an empty summary', async () => {
  const response = await fetch(`${base}/api/projects/PRJ-003/summary`);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.project.id, 'PRJ-003');
  assert.equal(body.lines.length, 0);
  assert.equal(body.contracts.length, 0);
  assert.equal(body.assets.length, 0);
  assert.equal(body.approvals.length, 0);
});

for (const suffix of projectPaths.slice(1)) {
  test(`existing empty project receives an empty list from ${suffix}`, async () => {
    const response = await fetch(`${base}/api/projects/PRJ-003${suffix}`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.deepEqual(body, []);
  });
}

test('existing empty project receives an empty budget line list', async () => {
  const response = await fetch(`${base}/api/budgets/PRJ-003/lines`);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(body, []);
});

test('non-project 404 keeps its own error semantics', async () => {
  const response = await fetch(`${base}/api/approvals/APR-UNKNOWN`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'approved' }),
  });
  const body = await response.json();

  assert.equal(response.status, 404);
  assert.deepEqual(body, { message: '审批不存在' });
});
