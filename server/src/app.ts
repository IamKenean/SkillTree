import cors from "cors";
import express from "express";
import { nanoid } from "nanoid";
import { z } from "zod";
import {
  authMiddleware,
  comparePassword,
  hashPassword,
  signToken,
} from "./auth.js";
import { withStore } from "./db.js";
import {
  calculateXpLevel,
  evolveTree,
  generateInitialTree,
  unlockEligibleNodes,
} from "./skillEngine.js";
import { PublicUser } from "./types.js";

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  username: z.string().min(3).max(24),
  avatarUrl: z.string().url().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const goalSchema = z.object({
  mainGoal: z.string().min(5).max(200),
  experienceLevel: z.enum(["beginner", "intermediate", "advanced"]),
  timePerWeek: z.number().min(1).max(80),
  interests: z.array(z.string().min(2)).max(12).default([]),
});

const completeSchema = z.object({
  journalEntry: z.string().max(1000).optional(),
  proofUrl: z.string().url().optional(),
  tags: z.array(z.string().min(2).max(40)).max(16).default([]),
});

const publicUser = (user: {
  id: string;
  email: string;
  username: string;
  avatarUrl?: string;
  createdAt: string;
  totalXp: number;
  level: number;
  streak: number;
}): PublicUser => ({
  id: user.id,
  email: user.email,
  username: user.username,
  avatarUrl: user.avatarUrl,
  createdAt: user.createdAt,
  totalXp: user.totalXp,
  level: user.level,
  streak: user.streak,
});

const dateOnly = (date = new Date()) => date.toISOString().slice(0, 10);

const dayDiff = (isoA: string, isoB: string) => {
  const a = new Date(`${isoA}T00:00:00Z`).getTime();
  const b = new Date(`${isoB}T00:00:00Z`).getTime();
  return Math.floor((a - b) / (1000 * 60 * 60 * 24));
};

const addAchievementIfMissing = ({
  userId,
  title,
  description,
  store,
}: {
  userId: string;
  title: string;
  description: string;
  store: {
    achievements: Array<{
      id: string;
      userId: string;
      title: string;
      description: string;
      unlockedAt: string;
    }>;
  };
}) => {
  if (store.achievements.some((a) => a.userId === userId && a.title === title)) {
    return;
  }
  store.achievements.push({
    id: nanoid(),
    userId,
    title,
    description,
    unlockedAt: new Date().toISOString(),
  });
};

export const app = express();

app.use(cors());
app.use(express.json({ limit: "2mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", app: "ascend-api" });
});

app.post("/api/auth/signup", async (req, res) => {
  const parsed = signupSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const payload = parsed.data;

  const existingUser = withStore((store) =>
    store.users.find((user) => user.email.toLowerCase() === payload.email.toLowerCase()),
  );
  if (existingUser) {
    return res.status(409).json({ error: "Email already exists." });
  }

  const passwordHash = await hashPassword(payload.password);

  const createdUser = withStore((store) => {
    const nextUser = {
      id: nanoid(),
      email: payload.email.toLowerCase(),
      passwordHash,
      username: payload.username,
      avatarUrl: payload.avatarUrl,
      createdAt: new Date().toISOString(),
      totalXp: 0,
      level: 1,
      streak: 0,
      lastActivityDate: undefined,
    };
    store.users.push(nextUser);
    return nextUser;
  });

  return res.status(201).json({
    token: signToken(createdUser.id),
    user: publicUser(createdUser),
  });
});

app.post("/api/auth/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const { email, password } = parsed.data;

  const user = withStore((store) =>
    store.users.find((candidate) => candidate.email.toLowerCase() === email.toLowerCase()),
  );
  if (!user) {
    return res.status(401).json({ error: "Invalid credentials." });
  }

  const validPassword = await comparePassword(password, user.passwordHash);
  if (!validPassword) {
    return res.status(401).json({ error: "Invalid credentials." });
  }

  return res.json({
    token: signToken(user.id),
    user: publicUser(user),
  });
});

app.get("/api/auth/me", authMiddleware, (req, res) => {
  const user = withStore((store) => store.users.find((candidate) => candidate.id === req.userId));
  if (!user) {
    return res.status(404).json({ error: "User not found." });
  }
  return res.json({ user: publicUser(user) });
});

app.post("/api/goals", authMiddleware, (req, res) => {
  const parsed = goalSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const payload = parsed.data;

  const createdGoal = withStore((store) => {
    const goal = {
      id: nanoid(),
      userId: req.userId!,
      title: payload.mainGoal,
      experienceLevel: payload.experienceLevel,
      timePerWeek: payload.timePerWeek,
      interests: payload.interests,
      createdAt: new Date().toISOString(),
    };
    const nodes = generateInitialTree({
      goalId: goal.id,
      mainGoal: payload.mainGoal,
      experienceLevel: payload.experienceLevel,
      interests: payload.interests,
    });
    unlockEligibleNodes(nodes);
    store.goals.push(goal);
    store.nodes.push(...nodes);
    return {
      goal,
      nodes,
    };
  });

  return res.status(201).json(createdGoal);
});

app.get("/api/goals", authMiddleware, (req, res) => {
  const data = withStore((store) => {
    const userGoals = store.goals.filter((goal) => goal.userId === req.userId);
    return userGoals.map((goal) => {
      const nodes = store.nodes.filter((node) => node.goalId === goal.id);
      const completed = nodes.filter((node) => node.status === "completed").length;
      return {
        ...goal,
        totalNodes: nodes.length,
        completedNodes: completed,
      };
    });
  });
  return res.json({ goals: data });
});

app.get("/api/goals/:goalId/tree", authMiddleware, (req, res) => {
  const goalId = req.params.goalId;
  const result = withStore((store) => {
    const goal = store.goals.find((candidate) => candidate.id === goalId);
    if (!goal || goal.userId !== req.userId) {
      return null;
    }
    const nodes = store.nodes
      .filter((node) => node.goalId === goalId)
      .filter((node) => !node.isHidden || node.status !== "locked");
    const progressEntries = store.progressEntries.filter(
      (entry) => entry.goalId === goalId && entry.userId === req.userId,
    );
    return { goal, nodes, progressEntries };
  });
  if (!result) {
    return res.status(404).json({ error: "Goal not found." });
  }
  return res.json(result);
});

app.post("/api/goals/:goalId/nodes/:nodeId/complete", authMiddleware, (req, res) => {
  const parsed = completeSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const { goalId, nodeId } = req.params;
  const payload = parsed.data;

  const response = withStore((store) => {
    const goal = store.goals.find((candidate) => candidate.id === goalId);
    if (!goal || goal.userId !== req.userId) {
      return { error: "Goal not found.", code: 404 as const };
    }

    const node = store.nodes.find((candidate) => candidate.id === nodeId && candidate.goalId === goalId);
    if (!node) {
      return { error: "Node not found.", code: 404 as const };
    }
    if (node.status === "locked") {
      return { error: "Node is still locked.", code: 400 as const };
    }
    if (node.status === "completed") {
      return { error: "Node already completed.", code: 409 as const };
    }

    node.status = "completed";
    const cleanTags = Array.from(new Set(payload.tags.map((tag) => tag.toLowerCase().trim())));
    store.progressEntries.push({
      id: nanoid(),
      userId: req.userId!,
      goalId,
      nodeId,
      journalEntry: payload.journalEntry,
      proofUrl: payload.proofUrl,
      tags: cleanTags,
      createdAt: new Date().toISOString(),
    });

    const user = store.users.find((candidate) => candidate.id === req.userId);
    if (!user) {
      return { error: "User not found.", code: 404 as const };
    }

    user.totalXp += node.xpReward;
    user.level = calculateXpLevel(user.totalXp);
    const today = dateOnly();
    if (!user.lastActivityDate) {
      user.streak = 1;
    } else if (user.lastActivityDate === today) {
      user.streak = Math.max(1, user.streak);
    } else if (dayDiff(today, user.lastActivityDate) === 1) {
      user.streak += 1;
    } else {
      user.streak = 1;
    }
    user.lastActivityDate = today;

    const goalNodes = store.nodes.filter((candidate) => candidate.goalId === goalId);
    unlockEligibleNodes(goalNodes);

    const goalProgress = store.progressEntries.filter(
      (entry) => entry.userId === req.userId && entry.goalId === goalId,
    );
    const newlyAddedNodes = evolveTree({
      goal,
      nodes: goalNodes,
      progressEntries: goalProgress,
    });
    store.nodes.push(...newlyAddedNodes);
    unlockEligibleNodes(store.nodes.filter((candidate) => candidate.goalId === goalId));

    const completedCount = store.nodes.filter(
      (candidate) => candidate.goalId === goalId && candidate.status === "completed",
    ).length;
    if (completedCount >= 1) {
      addAchievementIfMissing({
        userId: req.userId!,
        title: "First Unlock",
        description: "Completed your first skill node.",
        store,
      });
    }
    if (user.streak >= 7) {
      addAchievementIfMissing({
        userId: req.userId!,
        title: "Momentum: 7 Day Streak",
        description: "Maintained activity for seven consecutive days.",
        store,
      });
    }
    if (user.level >= 5) {
      addAchievementIfMissing({
        userId: req.userId!,
        title: "Level 5 Adventurer",
        description: "Reached level 5 in Ascend.",
        store,
      });
    }

    const visibleNodes = store.nodes
      .filter((candidate) => candidate.goalId === goalId)
      .filter((candidate) => !candidate.isHidden || candidate.status !== "locked");

    return {
      code: 200 as const,
      payload: {
        user: publicUser(user),
        completedNode: node,
        newlyAddedNodes,
        nodes: visibleNodes,
      },
    };
  });

  if ("error" in response) {
    return res.status(response.code).json({ error: response.error });
  }
  return res.status(response.code).json(response.payload);
});

app.get("/api/dashboard", authMiddleware, (req, res) => {
  const response = withStore((store) => {
    const user = store.users.find((candidate) => candidate.id === req.userId);
    if (!user) {
      return null;
    }

    const goals = store.goals.filter((goal) => goal.userId === req.userId);
    const goalCards = goals.map((goal) => {
      const nodes = store.nodes.filter((node) => node.goalId === goal.id);
      const completedNodes = nodes.filter((node) => node.status === "completed").length;
      return {
        ...goal,
        totalNodes: nodes.length,
        completedNodes,
      };
    });

    const recentProgress = store.progressEntries
      .filter((entry) => entry.userId === req.userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 8)
      .map((entry) => ({
        ...entry,
        nodeTitle: store.nodes.find((node) => node.id === entry.nodeId)?.title ?? "Unknown node",
      }));

    const achievements = store.achievements
      .filter((achievement) => achievement.userId === req.userId)
      .sort((a, b) => b.unlockedAt.localeCompare(a.unlockedAt));

    const completedNodesTotal = goalCards.reduce((acc, goal) => acc + goal.completedNodes, 0);
    const totalNodes = goalCards.reduce((acc, goal) => acc + goal.totalNodes, 0);

    return {
      user: publicUser(user),
      overview: {
        goals: goals.length,
        completedNodes: completedNodesTotal,
        totalNodes,
        completionRate:
          totalNodes === 0 ? 0 : Math.round((completedNodesTotal / totalNodes) * 100),
      },
      goals: goalCards,
      recentProgress,
      achievements,
    };
  });
  if (!response) {
    return res.status(404).json({ error: "User not found." });
  }
  return res.json(response);
});
