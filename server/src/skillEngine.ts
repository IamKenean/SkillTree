import { nanoid } from "nanoid";
import {
  Difficulty,
  ExperienceLevel,
  Goal,
  ProgressEntry,
  SkillNode,
} from "./types.js";

interface GoalInput {
  goalId: string;
  mainGoal: string;
  experienceLevel: ExperienceLevel;
  interests: string[];
}

interface TriggeredBranch {
  id: string;
  title: string;
  description: string;
  difficulty: Difficulty;
  xpReward: number;
  estimatedHours: number;
  category: string;
}

const baselineTracks = [
  {
    label: "consistency",
    title: "Consistency Engine",
    description:
      "Create a repeatable weekly cadence so effort compounds instead of resetting.",
    category: "foundation",
  },
  {
    label: "core practice",
    title: "Core Practice Loop",
    description:
      "Build the smallest daily practice loop that maps directly to your main goal.",
    category: "practice",
  },
  {
    label: "feedback",
    title: "Feedback & Reflection",
    description:
      "Capture evidence and feedback so the tree can adapt around what is actually working.",
    category: "analysis",
  },
];

const triggerDefinitions: Array<{
  id: string;
  keywords: string[];
  branches: TriggeredBranch[];
}> = [
  {
    id: "calisthenics",
    keywords: [
      "calisthenics",
      "pushup",
      "pushups",
      "pullup",
      "pullups",
      "dip",
      "dips",
      "handstand",
    ],
    branches: [
      {
        id: "muscle-up-path",
        title: "Muscle Up Path",
        description:
          "Progress transition strength from explosive pull-ups into strict muscle ups.",
        difficulty: "hard",
        xpReward: 260,
        estimatedHours: 20,
        category: "advanced-calisthenics",
      },
      {
        id: "front-lever-progression",
        title: "Front Lever Progression",
        description:
          "Build core and lat tension for tuck-to-advanced front lever holds.",
        difficulty: "hard",
        xpReward: 240,
        estimatedHours: 18,
        category: "advanced-calisthenics",
      },
      {
        id: "explosive-training-lab",
        title: "Explosive Training Lab",
        description:
          "Train power production and dynamic control for advanced bodyweight combos.",
        difficulty: "elite",
        xpReward: 320,
        estimatedHours: 24,
        category: "advanced-calisthenics",
      },
    ],
  },
  {
    id: "frontend",
    keywords: [
      "frontend",
      "react",
      "ui",
      "ux",
      "animation",
      "css",
      "design-system",
      "component",
    ],
    branches: [
      {
        id: "react-architecture",
        title: "React Architecture Mastery",
        description:
          "Scale component architecture, state boundaries, and rendering strategy.",
        difficulty: "hard",
        xpReward: 240,
        estimatedHours: 16,
        category: "frontend-specialization",
      },
      {
        id: "motion-and-interaction",
        title: "Motion & Interaction Systems",
        description:
          "Design high-quality motion and transitions that communicate state.",
        difficulty: "hard",
        xpReward: 230,
        estimatedHours: 14,
        category: "frontend-specialization",
      },
      {
        id: "ui-platform-thinking",
        title: "UI Platform Thinking",
        description:
          "Create reusable UI systems and primitives for long-term velocity.",
        difficulty: "elite",
        xpReward: 320,
        estimatedHours: 22,
        category: "frontend-specialization",
      },
    ],
  },
  {
    id: "machine-learning",
    keywords: [
      "machine learning",
      "ml",
      "model",
      "training",
      "data",
      "feature",
      "python",
      "neural",
    ],
    branches: [
      {
        id: "feature-engineering-branch",
        title: "Feature Engineering Branch",
        description:
          "Design robust features and data pipelines that improve model quality.",
        difficulty: "hard",
        xpReward: 260,
        estimatedHours: 20,
        category: "ml-specialization",
      },
      {
        id: "evaluation-and-iteration",
        title: "Model Evaluation Loop",
        description:
          "Set up evaluation metrics, error analysis, and iteration checkpoints.",
        difficulty: "hard",
        xpReward: 260,
        estimatedHours: 18,
        category: "ml-specialization",
      },
      {
        id: "ml-systems-track",
        title: "ML Systems Track",
        description:
          "Move from experiments to reproducible, production-grade ML workflows.",
        difficulty: "elite",
        xpReward: 340,
        estimatedHours: 24,
        category: "ml-specialization",
      },
    ],
  },
];

const containsAny = (text: string, keywords: string[]) => {
  const normalized = text.toLowerCase();
  return keywords.some((keyword) => normalized.includes(keyword));
};

const baseDifficultyForLevel = (level: ExperienceLevel): Difficulty => {
  if (level === "advanced") {
    return "medium";
  }
  if (level === "intermediate") {
    return "easy";
  }
  return "easy";
};

const statusForPrerequisites = (prerequisites: string[]) =>
  prerequisites.length === 0 ? "unlocked" : "locked";

export const generateInitialTree = ({
  goalId,
  mainGoal,
  experienceLevel,
  interests,
}: GoalInput): SkillNode[] => {
  const rootId = nanoid();
  const root: SkillNode = {
    id: rootId,
    goalId,
    title: "Origin Quest",
    description: `Start your Ascend path: ${mainGoal}`,
    difficulty: baseDifficultyForLevel(experienceLevel),
    xpReward: 100,
    estimatedHours: 2,
    prerequisites: [],
    status: "unlocked",
    proofRequirement: "Write a kickoff plan and first weekly schedule.",
    isHidden: false,
    category: "root",
  };

  const secondLayer = baselineTracks.map((track, index) => {
    const interestBoost = interests.length > 0 ? 1 : 0;
    return {
      id: nanoid(),
      goalId,
      title: track.title,
      description: track.description,
      difficulty: index === 0 ? "easy" : "medium",
      xpReward: 120 + index * 20 + interestBoost * 10,
      estimatedHours: 3 + index,
      prerequisites: [rootId],
      status: "locked" as const,
      proofRequirement:
        index === 2 ? "Attach a reflection entry with learning notes." : undefined,
      isHidden: false,
      category: track.category,
    };
  });

  const specializationSeed = triggerDefinitions
    .filter((trigger) =>
      containsAny(`${mainGoal} ${interests.join(" ")}`, trigger.keywords),
    )
    .slice(0, 2)
    .flatMap((trigger) =>
      trigger.branches.slice(0, 1).map((branch, i) => ({
        id: nanoid(),
        goalId,
        title: branch.title,
        description: branch.description,
        difficulty: i === 0 ? "hard" : "elite",
        xpReward: branch.xpReward,
        estimatedHours: branch.estimatedHours,
        prerequisites: [secondLayer[1].id],
        status: "locked" as const,
        proofRequirement: "Submit proof of a real-world challenge completion.",
        isHidden: true,
        category: branch.category,
      })),
    );

  return [root, ...secondLayer, ...specializationSeed];
};

export const unlockEligibleNodes = (nodes: SkillNode[]): SkillNode[] => {
  const completed = new Set(nodes.filter((node) => node.status === "completed").map((n) => n.id));
  for (const node of nodes) {
    if (node.status === "locked") {
      const canUnlock = node.prerequisites.every((prereq) => completed.has(prereq));
      if (canUnlock) {
        node.status = "unlocked";
        node.isHidden = false;
      }
    }
  }
  return nodes;
};

export const calculateXpLevel = (xp: number) => 1 + Math.floor(xp / 500);

export const scoreTriggerMatches = ({
  goal,
  entries,
  completedNodes,
}: {
  goal: Goal;
  entries: ProgressEntry[];
  completedNodes: SkillNode[];
}) => {
  const tagCloud = entries
    .flatMap((entry) => entry.tags)
    .map((tag) => tag.toLowerCase())
    .join(" ");
  const completedTitles = completedNodes.map((node) => node.title.toLowerCase()).join(" ");
  const context = `${goal.title.toLowerCase()} ${goal.interests.join(" ").toLowerCase()} ${tagCloud} ${completedTitles}`;

  return triggerDefinitions.map((trigger) => ({
    trigger,
    score: trigger.keywords.reduce(
      (acc, keyword) => acc + (context.includes(keyword) ? 1 : 0),
      0,
    ),
  }));
};

export const evolveTree = ({
  goal,
  nodes,
  progressEntries,
}: {
  goal: Goal;
  nodes: SkillNode[];
  progressEntries: ProgressEntry[];
}) => {
  const completedNodes = nodes.filter((node) => node.status === "completed");
  const triggerScores = scoreTriggerMatches({
    goal,
    entries: progressEntries,
    completedNodes,
  });

  const anchorNode =
    completedNodes[completedNodes.length - 1] ??
    nodes.find((node) => node.category === "practice");

  if (!anchorNode) {
    return [];
  }

  const existingTitles = new Set(nodes.map((node) => node.title));
  const newlyAdded: SkillNode[] = [];

  for (const { trigger, score } of triggerScores) {
    if (score < 3) {
      continue;
    }
    for (const branch of trigger.branches) {
      if (existingTitles.has(branch.title)) {
        continue;
      }
      newlyAdded.push({
        id: nanoid(),
        goalId: goal.id,
        title: branch.title,
        description: branch.description,
        difficulty: branch.difficulty,
        xpReward: branch.xpReward,
        estimatedHours: branch.estimatedHours,
        prerequisites: [anchorNode.id],
        status: "locked",
        proofRequirement: "Share media proof and a reflective journal note.",
        isHidden: false,
        category: branch.category,
      });
    }
  }

  return newlyAdded;
};
