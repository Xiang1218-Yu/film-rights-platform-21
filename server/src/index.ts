import express from 'express';
import { pathToFileURL } from 'node:url';
import { approve, assets, budgetLines, contracts, createApproval, dashboard, projectSummary, projects, rightsConflicts } from './domain.js';

export const app = express();

app.use(express.json());

const projectNotFound = { message: '项目不存在' };
const requireProject = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const projectId = Array.isArray(req.params.projectId) ? req.params.projectId[0] : req.params.projectId;
  if (!projectId || !projects.some(item => item.id === projectId)) {
    res.status(404).json(projectNotFound);
    return;
  }
  next();
};
const projectId = (req: express.Request) => Array.isArray(req.params.projectId) ? req.params.projectId[0] ?? '' : req.params.projectId ?? '';

app.get('/api/dashboard', (_req, res) => res.json(dashboard()));
app.get('/api/projects', (_req, res) => res.json(projects));
app.get('/api/projects/:projectId/summary', requireProject, (req, res) => res.json(projectSummary(projectId(req))));
app.get('/api/projects/:projectId/rights-conflicts', requireProject, (req, res) => res.json(rightsConflicts(projectId(req))));
app.get('/api/projects/:projectId/assets', requireProject, (req, res) => { const id = projectId(req); res.json(assets.filter(asset => asset.projectId === id)); });
app.get('/api/projects/:projectId/contracts', requireProject, (req, res) => { const id = projectId(req); res.json(contracts.filter(contract => contract.projectId === id)); });
app.get('/api/budgets/:projectId/lines', requireProject, (req, res) => { const id = projectId(req); res.json(budgetLines.filter(line => line.projectId === id)); });
app.post('/api/approvals', (req, res) => res.status(201).json(createApproval(req.body)));
app.patch('/api/approvals/:id', (req, res) => {
  const result = approve(req.params.id, req.body.status, req.body.comment);
  if (!result) {
    res.status(404).json({ message: '审批不存在' });
    return;
  }
  res.json(result);
});
app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'film-rights-platform' }));

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.PORT || 4104);
  app.listen(port, () => console.log(`film rights API listening on ${port}`));
}
