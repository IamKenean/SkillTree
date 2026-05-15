import { DashboardResponse, GoalSummary, ProgressEntry, PublicUser, SkillNode } from "./types";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "/api";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

const parseResponse = async <T>(response: Response): Promise<T> => {
  const payload = (await response.json()) as { error?: string } & T;
  if (!response.ok) {
    throw new ApiError(payload.error ?? "Request failed", response.status);
  }
  return payload;
};

export const createApiClient = (token: string | null) => {
  const request = async <T>(path: string, options: RequestInit = {}) => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers ? (options.headers as Record<string, string>) : {}),
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
    });
    return parseResponse<T>(response);
  };

  return {
    signup: (payload: {
      email: string;
      password: string;
      username: string;
      avatarUrl?: string;
    }) => request<{ token: string; user: PublicUser }>("/auth/signup", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

    login: (payload: { email: string; password: string }) =>
      request<{ token: string; user: PublicUser }>("/auth/login", {
        method: "POST",
        body: JSON.stringify(payload),
      }),

    me: () => request<{ user: PublicUser }>("/auth/me"),

    createGoal: (payload: {
      mainGoal: string;
      experienceLevel: "beginner" | "intermediate" | "advanced";
      timePerWeek: number;
      interests: string[];
    }) =>
      request<{ goal: GoalSummary; nodes: SkillNode[] }>("/goals", {
        method: "POST",
        body: JSON.stringify(payload),
      }),

    listGoals: () => request<{ goals: GoalSummary[] }>("/goals"),

    getGoalTree: (goalId: string) =>
      request<{ goal: GoalSummary; nodes: SkillNode[]; progressEntries: ProgressEntry[] }>(
        `/goals/${goalId}/tree`,
      ),

    completeNode: (
      goalId: string,
      nodeId: string,
      payload: { journalEntry?: string; proofUrl?: string; tags: string[] },
    ) =>
      request<{
        user: PublicUser;
        completedNode: SkillNode;
        nodes: SkillNode[];
        newlyAddedNodes: SkillNode[];
      }>(`/goals/${goalId}/nodes/${nodeId}/complete`, {
        method: "POST",
        body: JSON.stringify(payload),
      }),

    dashboard: () => request<DashboardResponse>("/dashboard"),
  };
};
