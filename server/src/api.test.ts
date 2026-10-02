import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { app, errorHandler } from './index.js';

const projectScopedPaths = (id: string) => [
  `/api/projects/${id}/summary`,
  `/api/projects/${id}/rights-conflicts`,
  `/api/projects/${id}/assets`,
  `/api/projects/${id}/contracts`,
  `/api/budgets/${id}/lines`,
];

let server: Server;
let baseUrl: string;
before(() => {
  server = app.listen(0);
  baseUrl = `http://localhost:${(server.address() as AddressInfo).port}`;
});
after(async () => { await new Promise(resolve => server.close(resolve)); });

describe('项目级读取路径的存在性语义', () => {
  it('未知项目在五类接口均返回一致的 404 与“项目不存在”消息', async () => {
    for (const path of projectScopedPaths('PRJ-DOES-NOT-EXIST')) {
      const response = await fetch(`${baseUrl}${path}`);
      assert.equal(response.status, 404, `${path} 应返回 404`);
      const body = await response.json();
      assert.equal(body.message, '项目不存在', `${path} 的 404 消息应一致`);
    }
  });

  it('真实存在但无关联记录的项目在四类列表接口返回 200 空数组', async () => {
    const listPaths = [
      '/api/projects/PRJ-003/rights-conflicts',
      '/api/projects/PRJ-003/assets',
      '/api/projects/PRJ-003/contracts',
      '/api/budgets/PRJ-003/lines',
    ];
    for (const path of listPaths) {
      const response = await fetch(`${baseUrl}${path}`);
      assert.equal(response.status, 200, `${path} 空项目应返回 200`);
      const body = await response.json();
      assert.deepEqual(body, [], `${path} 应返回空列表而非 404`);
    }
  });

  it('空项目的 summary 仍返回 200 且聚合数字为 0', async () => {
    const response = await fetch(`${baseUrl}/api/projects/PRJ-003/summary`);
    assert.equal(response.status, 200);
    const summary = await response.json();
    assert.equal(summary.project.id, 'PRJ-003');
    assert.deepEqual(summary.lines, []);
    assert.deepEqual(summary.contracts, []);
    assert.deepEqual(summary.assets, []);
    assert.equal(summary.planned, 0);
    assert.equal(summary.forecast, 0);
    assert.equal(summary.assetCount, 0);
  });

  it('有关联记录的真实项目仍返回自身数据', async () => {
    const cases: Record<string, { status: number; count: number }> = {
      '/api/projects/PRJ-001/summary': { status: 200, count: 4 },
      '/api/projects/PRJ-001/rights-conflicts': { status: 200, count: 1 },
      '/api/projects/PRJ-001/assets': { status: 200, count: 3 },
      '/api/projects/PRJ-001/contracts': { status: 200, count: 2 },
      '/api/budgets/PRJ-001/lines': { status: 200, count: 4 },
    };
    for (const [path, expected] of Object.entries(cases)) {
      const response = await fetch(`${baseUrl}${path}`);
      assert.equal(response.status, expected.status, path);
      const body = await response.json();
      const items = path.endsWith('/summary') ? body.lines : body;
      assert.ok(Array.isArray(items) && items.length >= expected.count, `${path} 不应为空`);
    }
  });

  it('其他服务错误不被误报为项目缺失（错误处理器返回 500）', () => {
    const res = {
      statusCode: 200,
      payload: undefined as unknown,
      status(code: number) { this.statusCode = code; return this; },
      json(body: unknown) { this.payload = body; return this; },
    };
    errorHandler(new Error('下游版权台账服务超时'), {} as never, res as never, (() => undefined) as never);
    assert.equal(res.statusCode, 500);
    assert.deepEqual(res.payload, { message: '服务暂时不可用，请稍后重试' });
  });
});
