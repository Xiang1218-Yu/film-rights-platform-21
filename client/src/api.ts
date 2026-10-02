const api = '/api';
const projectReadPaths = [
  /^\/projects\/[^/]+\/summary(?:\?|$)/,
  /^\/projects\/[^/]+\/rights-conflicts(?:\?|$)/,
  /^\/projects\/[^/]+\/assets(?:\?|$)/,
  /^\/projects\/[^/]+\/contracts(?:\?|$)/,
  /^\/budgets\/[^/]+\/lines(?:\?|$)/,
];

export class ProjectNotFoundError extends Error {
  constructor() {
    super('项目不存在');
    this.name = 'ProjectNotFoundError';
  }
}

export function isProjectReadPath(path: string) {
  return projectReadPaths.some(pattern => pattern.test(path));
}

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${api}${path}`, init);
  const body = await response.json().catch(() => ({}));

  if (response.status === 404 && isProjectReadPath(path)) {
    throw new ProjectNotFoundError();
  }
  if (!response.ok) {
    const message = typeof body === 'object' && body !== null && 'message' in body && typeof body.message === 'string'
      ? body.message
      : `请求失败 (${response.status})`;
    throw new Error(message);
  }

  return body as T;
}
