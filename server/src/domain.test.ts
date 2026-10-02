import test from 'node:test'; import assert from 'node:assert/strict'; import { approve, getProject, projectExists, projectSummary, rightsConflicts } from './domain.js';
test('budget summary exposes forecast variance and high risk lines', () => { const summary = projectSummary('PRJ-001'); assert.equal(summary.lines.length, 4); assert.ok(summary.forecast > summary.planned); assert.equal(summary.highRiskLines.length, 1); });
test('rights conflict engine detects overlapping licensed assets', () => { const conflicts = rightsConflicts('PRJ-001'); assert.ok(conflicts.length >= 1); assert.ok(conflicts.some(item => item.reason.includes('音乐-同步许可'))); });
test('approval changes are auditable and stateful', () => { const result = approve('APR-01', 'approved', '预算已复核'); assert.equal(result?.status, 'approved'); assert.equal(result?.comment, '预算已复核'); });
test('project existence distinguishes unknown ids from real but empty projects', () => {
  assert.equal(projectExists('PRJ-001'), true);
  assert.equal(projectExists('PRJ-003'), true);
  assert.equal(projectExists('PRJ-404'), false);
  assert.equal(getProject('PRJ-404'), undefined);
  const empty = projectSummary('PRJ-003');
  assert.equal(empty.project?.id, 'PRJ-003');
  assert.equal(empty.lines.length, 0);
  assert.equal(empty.contracts.length, 0);
  assert.equal(empty.assets.length, 0);
  assert.equal(rightsConflicts('PRJ-003').length, 0);
});
