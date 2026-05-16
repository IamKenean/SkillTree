import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';
import { generateSkillTree, parseInterests } from '../src/shared/skillTree.js';
import type { Difficulty, GoalInput, SkillEdge, SkillNode, SkillTree } from '../src/shared/types.js';

const difficultyXp: Record<Difficulty, number> = {
  starter: 50,
  apprentice: 90,
  adept: 140,
  expert: 220,
  legendary: 420,
};

const aiNodeSchema = z.object({
  id: z.string().min(2).max(48),
  title: z.string().min(3).max(80),
  description: z.string().min(12).max(360),
  children: z.array(z.string().min(2).max(48)).max(4).default([]),
  difficulty: z.enum(['starter', 'apprentice', 'adept', 'expert', 'legendary']).default('apprentice'),
  branch: z.string().min(2).max(48),
  identity: z.string().min(3).max(80),
  tradeoff: z.string().min(3).max(120).optional(),
  xp: z.number().int().min(25).max(600).optional(),
  estimatedHours: z.number().int().min(1).max(40).optional(),
  proofPrompt: z.string().min(8).max(180),
  hidden: z.boolean().default(false),
  unlockCondition: z.string().min(8).max(180).optional(),
});

const aiGraphSchema = z.object({
  root: aiNodeSchema.extend({
    difficulty: z.literal('starter').default('starter'),
    children: z.array(z.string().min(2).max(48)).min(2).max(4),
  }),
  nodes: z.array(aiNodeSchema).min(10).max(32),
});

export type TreeGenerator = (input: GoalInput) => Promise<SkillTree>;

export function createSkillTreeGenerator(apiKey = process.env.GEMINI_API_KEY): TreeGenerator {
  return async (input) => {
    if (!apiKey) {
      return generateSkillTree(input);
    }

    try {
      const ai = new GoogleGenAI({ apiKey });
      const result = await ai.models.generateContent({
        model: process.env.GEMINI_MODEL ?? 'gemini-2.5-flash',
        contents: buildPrompt(input),
        config: {
          responseMimeType: 'application/json',
          temperature: 0.85,
        },
      });
      return buildSkillTreeFromAiGraph(input, result.text ?? '');
    } catch (error) {
      console.warn('Gemini tree generation failed; using blueprint fallback.', error);
      return generateSkillTree(input);
    }
  };
}

export function buildSkillTreeFromAiGraph(input: GoalInput, rawJson: string, now = new Date().toISOString()): SkillTree {
  const graph = aiGraphSchema.parse(JSON.parse(stripJson(rawJson)));
  const all = [graph.root, ...graph.nodes];
  const rootSlug = slug(input.title) || 'personal-growth';
  const idMap = createIdMap(all.map((node) => node.id), rootSlug);
  const positions = layoutGraph(graph.root.id, all);
  const nodes: SkillNode[] = all.map((node) => {
    const prerequisites = all
      .filter((candidate) => candidate.children.includes(node.id))
      .map((candidate) => idMap.get(candidate.id)!)
      .filter(Boolean);
    const difficulty = node.difficulty;
    return {
      id: idMap.get(node.id)!,
      title: node.id === graph.root.id ? input.title : node.title,
      description: node.id === graph.root.id ? `${node.description} Central quest: "${input.title}".` : node.description,
      difficulty,
      xp: node.xp ?? difficultyXp[difficulty],
      estimatedHours: node.estimatedHours ?? (difficulty === 'starter' ? 1 : difficulty === 'apprentice' ? 2 : difficulty === 'adept' ? 4 : difficulty === 'expert' ? 7 : 12),
      prerequisites,
      proof: {
        type: difficulty === 'expert' || difficulty === 'legendary' ? 'metric' : 'journal',
        prompt: node.proofPrompt,
      },
      branch: node.branch,
      identity: node.identity,
      tradeoff: node.tradeoff,
      unlockCondition: node.unlockCondition,
      rarity: difficulty === 'legendary' ? 'legendary' : difficulty === 'expert' ? 'epic' : difficulty === 'adept' ? 'rare' : 'common',
      hidden: node.hidden,
      status: prerequisites.length === 0 ? 'unlocked' : 'locked',
      position: positions.get(node.id) ?? { x: 0, y: 0 },
    };
  });
  const nodeIds = new Set(nodes.map((node) => node.id));
  const edges: SkillEdge[] = all.flatMap((source) =>
    source.children
      .map((targetId) => ({
        id: `${idMap.get(source.id)}-${idMap.get(targetId)}`,
        source: idMap.get(source.id)!,
        target: idMap.get(targetId)!,
      }))
      .filter((edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target)),
  );

  if (edges.filter((edge) => edge.source === idMap.get(graph.root.id)).length < 2) {
    throw new Error('AI tree must branch from the root.');
  }

  return {
    id: `${rootSlug}-${Date.now().toString(36)}`,
    generationSource: 'gemini',
    rootGoal: input.title,
    experienceLevel: input.experienceLevel,
    weeklyHours: input.weeklyHours,
    interests: parseInterests(input.interests),
    nodes,
    edges,
    progress: [],
    achievements: [],
    totalXp: 0,
    level: 1,
    streak: 0,
    createdAt: now,
    updatedAt: now,
  };
}

function buildPrompt(input: GoalInput): string {
  return `Create a personalized, nonlinear RPG skill tree for Ascend.

User goal: ${input.title}
Experience level: ${input.experienceLevel}
Available time per week: ${input.weeklyHours} hours
Interests/focus areas: ${input.interests}

Return only valid JSON matching:
{
  "root": {"id": "...", "title": "...", "description": "...", "children": ["...", "..."], "difficulty": "starter", "branch": "...", "identity": "...", "tradeoff": "...", "proofPrompt": "..."},
  "nodes": [{"id": "...", "title": "...", "description": "...", "children": ["...", "..."], "difficulty": "apprentice|adept|expert|legendary", "branch": "...", "identity": "...", "tradeoff": "...", "proofPrompt": "...", "hidden": false, "unlockCondition": "..."}]
}

Rules:
- The root must have at least 2 meaningful children.
- Every non-terminal node should have 2 meaningful children when possible.
- Each branch must represent a different style, identity, or specialization path.
- Include tradeoffs such as speed vs accuracy, tactical vs positional, creative vs technical, strength vs endurance.
- Include 12 to 24 nodes total.
- Include at least 2 hidden future nodes with unlockCondition based on repeated behavior/proof patterns.
- Avoid straight-line checklists; create divergent identities and career/style paths.
- Use concise titles and concrete proof prompts.`;
}

function stripJson(value: string): string {
  const trimmed = value.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return fenced?.[1]?.trim() ?? trimmed;
}

function createIdMap(ids: string[], prefix: string): Map<string, string> {
  const used = new Set<string>();
  return new Map(
    ids.map((id) => {
      const base = `${prefix}-${slug(id) || 'node'}`;
      let candidate = base;
      let suffix = 2;
      while (used.has(candidate)) {
        candidate = `${base}-${suffix}`;
        suffix += 1;
      }
      used.add(candidate);
      return [id, candidate];
    }),
  );
}

function layoutGraph(rootId: string, nodes: Array<{ id: string; children: string[] }>): Map<string, { x: number; y: number }> {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const depth = new Map<string, number>([[rootId, 0]]);
  const queue = [rootId];
  while (queue.length) {
    const current = queue.shift()!;
    const currentDepth = depth.get(current) ?? 0;
    byId.get(current)?.children.forEach((child) => {
      if (!depth.has(child)) {
        depth.set(child, currentDepth + 1);
        queue.push(child);
      }
    });
  }
  const columns = new Map<number, string[]>();
  nodes.forEach((node) => {
    const column = depth.get(node.id) ?? 1;
    columns.set(column, [...(columns.get(column) ?? []), node.id]);
  });
  const positions = new Map<string, { x: number; y: number }>();
  columns.forEach((ids, column) => {
    const spacing = Math.max(145, 720 / Math.max(ids.length, 1));
    const startY = 360 - ((ids.length - 1) * spacing) / 2;
    ids.forEach((id, index) => positions.set(id, { x: column * 250, y: startY + index * spacing }));
  });
  return positions;
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}
