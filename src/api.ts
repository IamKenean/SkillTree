import type { DashboardPayload, GoalInput, SkillTree } from './shared/types.js';

export type Session = {
  token: string;
  user: DashboardPayload['user'];
};

const storageKey = 'ascend-session';

export function loadSession(): Session | null {
  const raw = localStorage.getItem(storageKey);
  return raw ? (JSON.parse(raw) as Session) : null;
}

export function saveSession(session: Session | null): void {
  if (session) {
    localStorage.setItem(storageKey, JSON.stringify(session));
    return;
  }
  localStorage.removeItem(storageKey);
}

async function request<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const response = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const payload = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    throw new Error(payload.error ?? 'Request failed.');
  }
  return payload;
}

export const api = {
  signup: (body: { username: string; password: string; avatar: string }) =>
    request<Session>('/api/auth/signup', { method: 'POST', body: JSON.stringify(body) }),
  login: (body: { username: string; password: string }) =>
    request<Session>('/api/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  dashboard: (token: string) => request<DashboardPayload>('/api/dashboard', {}, token),
  createGoal: (token: string, body: GoalInput) =>
    request<SkillTree>('/api/goals', { method: 'POST', body: JSON.stringify(body) }, token),
  completeNode: (
    token: string,
    goalId: string,
    body: { nodeId: string; note: string; focusTags: string[]; proofUrl?: string },
  ) => request<SkillTree>(`/api/goals/${goalId}/complete`, { method: 'POST', body: JSON.stringify(body) }, token),
  adaptGoal: (token: string, goalId: string, signals: string[]) =>
    request<SkillTree>(`/api/goals/${goalId}/adapt`, { method: 'POST', body: JSON.stringify({ signals }) }, token),
  expandGoal: (token: string, goalId: string, nodeId: string, signals: string[]) =>
    request<SkillTree>(
      `/api/goals/${goalId}/expand`,
      { method: 'POST', body: JSON.stringify({ nodeId, signals }) },
      token,
    ),
};
