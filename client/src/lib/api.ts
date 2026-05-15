export type User = {
  id: string;
  username: string;
  email: string;
  avatar: string | null;
  xp: number;
  streak: number;
  level: number;
  xp_into_level: number;
  xp_for_next_level: number;
  last_activity_date: string | null;
};

export type Goal = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  experience_level: string | null;
  hours_per_week: number | null;
  focus_areas: string | null;
  created_at: string;
  total_nodes?: number;
  completed_nodes?: number;
};

export type SkillNode = {
  id: string;
  goal_id: string;
  title: string;
  description: string | null;
  difficulty: number;
  xp_reward: number;
  est_minutes: number;
  tags: string[];
  branch: string;
  tier: number;
  position_x: number;
  position_y: number;
  status: 'locked' | 'available' | 'completed';
  completed_at: string | null;
  is_hidden: boolean;
  proof_required: boolean;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
};

export type SkillEdge = { id: string; source: string; target: string };

const KEY = 'ascend.token';

export function getToken(): string | null { return localStorage.getItem(KEY); }
export function setToken(t: string | null) {
  if (t) localStorage.setItem(KEY, t);
  else localStorage.removeItem(KEY);
}

async function request<T = any>(path: string, opts: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(opts.headers as Record<string, string> | undefined),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(path, { ...opts, headers });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    throw new Error(data?.error || `${res.status} ${res.statusText}`);
  }
  return data;
}

export const api = {
  signup: (body: { username: string; email: string; password: string; avatar?: string }) =>
    request<{ token: string; user: User }>('/api/auth/signup', { method: 'POST', body: JSON.stringify(body) }),
  login: (body: { usernameOrEmail: string; password: string }) =>
    request<{ token: string; user: User }>('/api/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  me: () => request<{ user: User }>('/api/me'),
  updateMe: (body: { avatar?: string; username?: string }) =>
    request<{ user: User }>('/api/me', { method: 'PATCH', body: JSON.stringify(body) }),

  dashboard: () => request<{ user: User; goals: Goal[]; recentNodes: any[]; totalCompleted: number }>('/api/dashboard'),

  createGoal: (body: { title: string; description?: string; experienceLevel?: string; hoursPerWeek?: number; focusAreas?: string }) =>
    request<{ goal: Goal }>('/api/goals', { method: 'POST', body: JSON.stringify(body) }),
  listGoals: () => request<{ goals: Goal[] }>('/api/goals'),
  getGoal: (id: string) =>
    request<{ goal: Goal; nodes: SkillNode[]; edges: SkillEdge[] }>(`/api/goals/${id}`),
  deleteGoal: (id: string) => request<{ ok: true }>(`/api/goals/${id}`, { method: 'DELETE' }),

  completeNode: (nodeId: string, body: { journalEntry?: string; proofUrl?: string } = {}) =>
    request<{ node: SkillNode; user: User; xpGained: number }>(`/api/nodes/${nodeId}/complete`, { method: 'POST', body: JSON.stringify(body) }),
  uncompleteNode: (nodeId: string) =>
    request<{ ok: true; user: User }>(`/api/nodes/${nodeId}/uncomplete`, { method: 'POST' }),
  nodeJournal: (nodeId: string) => request<{ entries: any[] }>(`/api/nodes/${nodeId}/journal`),

  evolveGoal: (id: string) =>
    request<{ added: number; newNodeIds?: string[]; focusTags: string[] }>(`/api/goals/${id}/evolve`, { method: 'POST' }),
};
