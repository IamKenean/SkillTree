export type Difficulty = 'starter' | 'apprentice' | 'adept' | 'expert' | 'legendary';

export type SkillNodeStatus = 'locked' | 'unlocked' | 'complete';

export type ProofRequirement = {
  type: 'journal' | 'image' | 'video' | 'metric';
  prompt: string;
};

export type TreePalette = {
  name: string;
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
};

export type SkillNode = {
  id: string;
  title: string;
  description: string;
  difficulty: Difficulty;
  xp: number;
  estimatedHours: number;
  prerequisites: string[];
  proof?: ProofRequirement;
  tips?: string[];
  branch: string;
  identity?: string;
  tradeoff?: string;
  unlockCondition?: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  hidden?: boolean;
  status: SkillNodeStatus;
  position: {
    x: number;
    y: number;
  };
};

export type SkillEdge = {
  id: string;
  source: string;
  target: string;
};

export type ProgressEntry = {
  id: string;
  nodeId: string;
  note: string;
  focusTags: string[];
  proofUrl?: string;
  completedAt: string;
  xpAwarded: number;
};

export type Achievement = {
  id: string;
  title: string;
  description: string;
  unlockedAt: string;
};

export type GoalInput = {
  title: string;
  experienceLevel: string;
  weeklyHours: number;
  interests: string;
};

export type SkillTree = {
  id: string;
  generationSource?: 'blueprint' | 'gemini';
  palette?: TreePalette;
  rootGoal: string;
  experienceLevel: string;
  weeklyHours: number;
  interests: string[];
  nodes: SkillNode[];
  edges: SkillEdge[];
  progress: ProgressEntry[];
  achievements: Achievement[];
  totalXp: number;
  level: number;
  streak: number;
  createdAt: string;
  updatedAt: string;
};

export type PublicUser = {
  id: string;
  username: string;
  avatar: string;
  createdAt: string;
};

export type GoalSummary = Pick<
  SkillTree,
  'id' | 'rootGoal' | 'totalXp' | 'level' | 'streak' | 'updatedAt'
> & {
  completedNodes: number;
  totalNodes: number;
};

export type DashboardPayload = {
  user: PublicUser;
  goals: SkillTree[];
  summaries: GoalSummary[];
};
