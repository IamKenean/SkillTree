export type ExperienceLevel = "beginner" | "intermediate" | "advanced";
export type Difficulty = "easy" | "medium" | "hard" | "elite";
export type SkillStatus = "locked" | "unlocked" | "completed";

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  username: string;
  avatarUrl?: string;
  createdAt: string;
  totalXp: number;
  level: number;
  streak: number;
  lastActivityDate?: string;
}

export interface Goal {
  id: string;
  userId: string;
  title: string;
  experienceLevel: ExperienceLevel;
  timePerWeek: number;
  interests: string[];
  createdAt: string;
}

export interface SkillNode {
  id: string;
  goalId: string;
  title: string;
  description: string;
  difficulty: Difficulty;
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
}

export interface Achievement {
  id: string;
  userId: string;
  title: string;
  description: string;
  unlockedAt: string;
}

export interface Store {
  users: User[];
  goals: Goal[];
  nodes: SkillNode[];
  progressEntries: ProgressEntry[];
  achievements: Achievement[];
}

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
