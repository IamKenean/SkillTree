export type ExperienceLevel = "beginner" | "intermediate" | "advanced";
export type SkillStatus = "locked" | "unlocked" | "completed";

export interface PublicUser {
  id: string;
  email: string;
  username: string;
  avatarUrl?: string;
  createdAt: string;
  totalXp: number;
  level: number;
  streak: number;
}

export interface GoalSummary {
  id: string;
  userId: string;
  title: string;
  experienceLevel: ExperienceLevel;
  timePerWeek: number;
  interests: string[];
  createdAt: string;
  totalNodes: number;
  completedNodes: number;
}

export interface SkillNode {
  id: string;
  goalId: string;
  title: string;
  description: string;
  difficulty: "easy" | "medium" | "hard" | "elite";
  xpReward: number;
  estimatedHours: number;
  prerequisites: string[];
  status: SkillStatus;
  proofRequirement?: string;
  isHidden: boolean;
  category: string;
}

export interface ProgressEntry {
  id: string;
  userId: string;
  goalId: string;
  nodeId: string;
  journalEntry?: string;
  proofUrl?: string;
  tags: string[];
  createdAt: string;
  nodeTitle?: string;
}

export interface DashboardResponse {
  user: PublicUser;
  overview: {
    goals: number;
    completedNodes: number;
    totalNodes: number;
    completionRate: number;
  };
  goals: GoalSummary[];
  recentProgress: ProgressEntry[];
  achievements: Array<{
    id: string;
    title: string;
    description: string;
    unlockedAt: string;
  }>;
}
