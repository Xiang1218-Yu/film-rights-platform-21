import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { isProjectReadPath, ProjectNotFoundError, request } from './api.js';

const originalFetch = globalThis.fetch;
let lastPath = '';
let responseResult: Response = new Response(JSON.stringify({ message: '其他服务暂时不可用' }), {
  status: 500,
  headers: { 'Content-Type': 'application/json' },
});

before(() => {
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    lastPath = String(input);
    return responseResult;
  }) as typeof fetch;
});

after(() => {
  globalThis.fetch = originalFetch;
});

const projectPaths = [
  '/projects/PRJ-UNKNOWN/summary',
  '/projects/PRJ-UNKNOWN/rights-conflicts',
  '/projects/PRJ-UNKNOWN/assets',
  '/projects/PRJ-UNKNOWN/contracts',
  '/budgets/PRJ-UNKNOWN/lines',
];

test('only project-level read paths are treated as missing-project errors', () => {
  for (const path of projectPaths) assert.equal(isProjectReadPath(path), true);
  assert.equal(isProjectReadPath('/projects'), false);
  assert.equal(isProjectReadPath('/approvals/APR-01'), false);
});

for (const path of projectPaths) {
  test(`project 404 is exposed for ${path}`, async () => {
    responseResult = new Response(JSON.stringify({ message: '项目不存在' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });

    await assert.rejects(request(path), error => error instanceof ProjectNotFoundError && error.message === '项目不存在');
    assert.equal(lastPath, `/api${path}`);
  });
}

const emptyProjectPaths = projectPaths.map(path => path.replace('PRJ-UNKNOWN', 'PRJ-003'));

for (const path of emptyProjectPaths) {
  test(`empty project data remains a successful empty list for ${path}`, async () => {
    responseResult = new Response('[]', {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

    if (path.endsWith('/summary')) {
      responseResult = new Response(JSON.stringify({ project: { id: 'PRJ-003' } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const result = await request(path);
    if (path.endsWith('/summary')) {
      assert.deepEqual(result, { project: { id: 'PRJ-003' } });
    } else {
      assert.deepEqual(result, []);
    }
  });
}

test('another service returning 500 is not reported as a missing project', async () => {
  responseResult = new Response(JSON.stringify({ message: '其他服务暂时不可用' }), {
    status: 500,
    headers: { 'Content-Type': 'application/json' },
  });

  await assert.rejects(request(projectPaths[0]), error =>
    error instanceof Error &&
    !(error instanceof ProjectNotFoundError) &&
    error.message === '其他服务暂时不可用'
  );
});

test('a non-project 404 keeps its original error message', async () => {
  responseResult = new Response(JSON.stringify({ message: '审批不存在' }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' },
  });

  await assert.rejects(request('/approvals/APR-UNKNOWN', { method: 'PATCH' }), error =>
    error instanceof Error &&
    !(error instanceof ProjectNotFoundError) &&
    error.message === '审批不存在'
  );
});
