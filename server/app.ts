import bcrypt from 'bcryptjs';
import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';
import helmet from 'helmet';
import jwt from 'jsonwebtoken';
import morgan from 'morgan';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { v4 as uuid } from 'uuid';
import { z } from 'zod';
import { adaptSkillTree, completeNode, generateSkillTree, parseInterests } from '../src/shared/skillTree.js';
import type { DashboardPayload, GoalSummary, PublicUser, SkillTree } from '../src/shared/types.js';
import { JsonStore, type UserRecord } from './dataStore.js';
import { suggestInterestsViaGemini } from './gemini.js';

const authSchema = z.object({
  username: z.string().trim().min(3).max(24),
  password: z.string().min(8).max(128),
  avatar: z.string().trim().max(8).optional(),
});

const goalSchema = z.object({
  title: z.string().trim().min(4).max(120),
  experienceLevel: z.string().trim().min(2).max(80),
  weeklyHours: z.coerce.number().min(1).max(80),
  interests: z.string().trim().max(240).default(''),
});

const completeSchema = z.object({
  nodeId: z.string(),
  note: z.string().trim().min(3).max(800),
  focusTags: z.array(z.string().trim().min(1).max(40)).default([]),
  proofUrl: z.string().url().optional().or(z.literal('')),
});

const adaptSchema = z.object({
  signals: z.array(z.string().trim().min(1).max(80)).min(1),
});

type AuthenticatedRequest = Request & {
  user?: PublicUser;
};

export type AppOptions = {
  store: JsonStore;
  jwtSecret?: string;
  serveStatic?: boolean;
};

function signToken(user: PublicUser, jwtSecret: string): string {
  return jwt.sign({ sub: user.id, username: user.username }, jwtSecret, { expiresIn: '7d' });
}

function toPublicUser(user: UserRecord): PublicUser {
  return {
    id: user.id,
    username: user.username,
    avatar: user.avatar,
    createdAt: user.createdAt,
  };
}

function summarize(goal: SkillTree): GoalSummary {
  return {
    id: goal.id,
    rootGoal: goal.rootGoal,
    totalXp: goal.totalXp,
    level: goal.level,
    streak: goal.streak,
    updatedAt: goal.updatedAt,
    completedNodes: goal.nodes.filter((node) => node.status === 'complete').length,
    totalNodes: goal.nodes.length,
  };
}

export function createApp({ store, jwtSecret = process.env.JWT_SECRET ?? 'dev-secret', serveStatic = false }: AppOptions) {
  const app = express();

  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors());
  app.use(express.json({ limit: '2mb' }));
  app.use(morgan('dev'));

  const requireAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const token = req.header('authorization')?.replace(/^Bearer\s+/i, '');
    if (!token) {
      res.status(401).json({ error: 'Missing auth token.' });
      return;
    }

    try {
      const payload = jwt.verify(token, jwtSecret) as { sub: string };
      const data = await store.read();
      const user = data.users.find((item) => item.id === payload.sub);
      if (!user) {
        res.status(401).json({ error: 'Invalid auth token.' });
        return;
      }
      req.user = toPublicUser(user);
      next();
    } catch {
      res.status(401).json({ error: 'Invalid auth token.' });
    }
  };

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, name: 'Ascend API' });
  });

  app.post('/api/auth/signup', async (req, res, next) => {
    try {
      const input = authSchema.parse(req.body);
      const createdAt = new Date().toISOString();
      const result = await store.update(async (data) => {
        const username = input.username.toLowerCase();
        if (data.users.some((user) => user.username.toLowerCase() === username)) {
          throw new Error('Username is already taken.');
        }
        const user: UserRecord = {
          id: uuid(),
          username: input.username,
          avatar: input.avatar || 'A',
          passwordHash: await bcrypt.hash(input.password, 12),
          createdAt,
        };
        data.users.push(user);
        data.goals[user.id] = [];
        const publicUser = toPublicUser(user);
        return { user: publicUser, token: signToken(publicUser, jwtSecret) };
      });
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/auth/login', async (req, res, next) => {
    try {
      const input = authSchema.omit({ avatar: true }).parse(req.body);
      const data = await store.read();
      const user = data.users.find((item) => item.username.toLowerCase() === input.username.toLowerCase());
      if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) {
        res.status(401).json({ error: 'Invalid username or password.' });
        return;
      }
      const publicUser = toPublicUser(user);
      res.json({ user: publicUser, token: signToken(publicUser, jwtSecret) });
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/dashboard', requireAuth, async (req: AuthenticatedRequest, res) => {
    const data = await store.read();
    const goals = data.goals[req.user!.id] ?? [];
    const payload: DashboardPayload = {
      user: req.user!,
      goals,
      summaries: goals.map(summarize),
    };
    res.json(payload);
  });

  app.post('/api/goals', requireAuth, async (req: AuthenticatedRequest, res, next) => {
    try {
      const input = goalSchema.parse(req.body);
      const apiKey = process.env.GEMINI_API_KEY?.trim();
      let interests = parseInterests(input.interests).join(', ');
      if (apiKey) {
        try {
          interests = await suggestInterestsViaGemini({ ...input, interests }, { apiKey });
        } catch (error) {
          // Fail loudly if Gemini is configured but not working; otherwise "Generate" looks like it did nothing.
          throw new Error(error instanceof Error ? error.message : 'Gemini generation failed.');
        }
      }

      const tree = generateSkillTree({ ...input, interests });
      await store.update((data) => {
        data.goals[req.user!.id] = [tree, ...(data.goals[req.user!.id] ?? [])];
      });
      res.status(201).json(tree);
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/goals/:goalId/complete', requireAuth, async (req: AuthenticatedRequest, res, next) => {
    try {
      const input = completeSchema.parse(req.body);
      const tree = await updateGoal(store, req.user!.id, String(req.params.goalId), (goal) =>
        completeNode(goal, input.nodeId, input.note, input.focusTags, input.proofUrl || undefined),
      );
      res.json(tree);
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/goals/:goalId/adapt', requireAuth, async (req: AuthenticatedRequest, res, next) => {
    try {
      const input = adaptSchema.parse(req.body);
      const tree = await updateGoal(store, req.user!.id, String(req.params.goalId), (goal) => adaptSkillTree(goal, input.signals));
      res.json(tree);
    } catch (error) {
      next(error);
    }
  });

  if (serveStatic) {
    const dirname = fileURLToPath(new URL('.', import.meta.url));
    const staticRoot = join(dirname, '../dist');
    app.use(express.static(staticRoot));
    app.get('*', (_req, res) => res.sendFile(join(staticRoot, 'index.html')));
  }

  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.issues[0]?.message ?? 'Invalid request.' });
      return;
    }
    if (error instanceof Error) {
      const status = error.message.includes('not found') ? 404 : error.message.includes('Username') ? 409 : 400;
      res.status(status).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: 'Unexpected server error.' });
  });

  return app;
}

async function updateGoal(
  store: JsonStore,
  userId: string,
  goalId: string,
  updater: (goal: SkillTree) => SkillTree,
): Promise<SkillTree> {
  return store.update((data) => {
    const goals = data.goals[userId] ?? [];
    const index = goals.findIndex((goal) => goal.id === goalId);
    if (index === -1) {
      throw new Error('Goal not found.');
    }
    const updated = updater(goals[index]);
    goals[index] = updated;
    data.goals[userId] = goals;
    return updated;
  });
}
