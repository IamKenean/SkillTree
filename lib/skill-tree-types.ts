export type SkillTier = "common" | "rare" | "epic" | "legendary";

export type NodeStatus = "locked" | "available" | "completed";

export type SkillNodeData = {
  title: string;
  description: string;
  difficulty: number;
  xpReward: number;
  estimatedHours?: number;
  prerequisiteIds: string[];
  tier?: SkillTier;
  proofSuggested?: boolean;
  branch?: string;
  hidden?: boolean;
  status: NodeStatus;
};

export type SkillTreeSnapshot = {
  rootId: string;
  nodes: Array<{
    id: string;
    position: { x: number; y: number };
    data: SkillNodeData;
  }>;
  edges: Array<{ id: string; source: string; target: string }>;
};
