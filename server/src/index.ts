import express, { NextFunction, Request, Response } from 'express';
import { approve, assets, budgetLines, contracts, createApproval, dashboard, projectExists, projectSummary, projects, rightsConflicts } from './domain.js';

export const app = express();
app.use(express.json());

const projectParam = (req: Request) => String(req.params.id ?? req.params.projectId ?? '');

// 所有项目级读取路径共用的存在性守卫：未知项目统一 404，
// 真实存在（即使没有任何关联记录）的项目继续处理器并返回 200（可能为空列表）。
function requireProject(req: Request, res: Response, next: NextFunction) {
  const projectId = projectParam(req);
  if (!projectId || !projectExists(projectId)) {
    res.status(404).json({ message: '项目不存在' });
    return;
  }
  next();
}

app.get('/api/dashboard', (_req, res) => res.json(dashboard()));
app.get('/api/projects', (_req, res) => res.json(projects));
app.get('/api/projects/:id/summary', requireProject, (req, res) => {
  const result = projectSummary(projectParam(req));
  if (!result.project) { res.status(404).json({ message: '项目不存在' }); return; }
  res.json(result);
});
app.get('/api/projects/:id/rights-conflicts', requireProject, (req, res) => res.json(rightsConflicts(projectParam(req))));
app.get('/api/projects/:id/assets', requireProject, (req, res) => res.json(assets.filter(asset => asset.projectId === projectParam(req))));
app.get('/api/projects/:id/contracts', requireProject, (req, res) => res.json(contracts.filter(contract => contract.projectId === projectParam(req))));
app.get('/api/budgets/:projectId/lines', requireProject, (req, res) => res.json(budgetLines.filter(line => line.projectId === projectParam(req))));
app.post('/api/approvals', (req, res) => res.status(201).json(createApproval(req.body)));
app.patch('/api/approvals/:id', (req, res) => { const result = approve(req.params.id, req.body.status, req.body.comment); if (!result) return res.status(404).json({ message: '审批不存在' }); res.json(result); });
app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'film-rights-platform' }));

// 兜底错误处理：只有项目守卫返回的 404 表示项目缺失，
// 其他服务端错误必须保持 5xx，避免被调用方误报为“项目不存在”。
export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  console.error(error);
  res.status(500).json({ message: '服务暂时不可用，请稍后重试' });
}
app.use(errorHandler);

const entry = process.argv[1] ? process.argv[1].replace(/\\/g, '/') : '';
if (entry.endsWith('/index.ts') || entry.endsWith('/index.js') || entry.endsWith('/src/index.ts') || entry.endsWith('/dist/src/index.js') || entry.endsWith('/dist-test/src/index.js')) {
  const port = Number(process.env.PORT || 4104);
  app.listen(port, () => console.log(`film rights API listening on ${port}`));
}
