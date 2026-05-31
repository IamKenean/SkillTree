import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';
import { generateSkillTree, getPaletteForGoal, parseInterests } from '../src/shared/skillTree.js';
import type { Difficulty, GoalInput, SkillEdge, SkillNode, SkillTree } from '../src/shared/types.js';

const difficultyXp: Record<Difficulty, number> = {
  starter: 50,
  apprentice: 90,
  adept: 140,
  expert: 220,
  legendary: 420,
};


function sanitizeOptionalString(min: number, max: number) {
  return z.preprocess(
    (value) => {
      if (value == null || typeof value !== 'string') return undefined;
      const trimmed = value.trim();
      if (trimmed.length < min) return undefined;
      return trimmed.slice(0, max);
    },
    z.string().min(min).max(max).optional(),
  );
}

function sanitizeRequiredString(min: number, max: number) {
  return z.preprocess((value) => {
    if (value == null || typeof value !== 'string') return value;
    const trimmed = value.trim();
    return trimmed.length > max ? trimmed.slice(0, max) : trimmed;
  }, z.string().min(min).max(max));
}


function sanitizeOptionalField(value: unknown, min: number, max: number): string | undefined {
  if (value == null || typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (trimmed.length < min) return undefined;
  return trimmed.length > max ? trimmed.slice(0, max) : trimmed;
}

function clampRequiredField(value: unknown, min: number, max: number): unknown {
  if (value == null || typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed.length > max ? trimmed.slice(0, max) : trimmed;
}

function sanitizeAiNode(node: Record<string, unknown>): Record<string, unknown> {
  const next = { ...node };
  if ('proofPrompt' in next) next.proofPrompt = clampRequiredField(next.proofPrompt, 8, 180);
  if ('description' in next) next.description = clampRequiredField(next.description, 12, 360);
  if ('title' in next) next.title = clampRequiredField(next.title, 3, 80);
  if ('identity' in next) next.identity = clampRequiredField(next.identity, 3, 80);
  if ('branch' in next) next.branch = clampRequiredField(next.branch, 2, 48);

  const unlockCondition = sanitizeOptionalField(next.unlockCondition, 8, 180);
  if (unlockCondition === undefined) delete next.unlockCondition;
  else next.unlockCondition = unlockCondition;

  const tradeoff = sanitizeOptionalField(next.tradeoff, 3, 120);
  if (tradeoff === undefined) delete next.tradeoff;
  else next.tradeoff = tradeoff;

  if (Array.isArray(next.tips)) {
    next.tips = next.tips
      .filter((tip): tip is string => typeof tip === 'string')
      .map((tip) => tip.trim().slice(0, 140))
      .filter((tip) => tip.length >= 4)
      .slice(0, 4);
  }

  return next;
}

function sanitizeAiPayload(payload: unknown): unknown {
  if (!payload || typeof payload !== 'object') return payload;
  const record = payload as Record<string, unknown>;
  const next: Record<string, unknown> = { ...record };

  if (record.root && typeof record.root === 'object') {
    next.root = sanitizeAiNode(record.root as Record<string, unknown>);
  }

  if (Array.isArray(record.nodes)) {
    next.nodes = record.nodes
      .filter((node): node is Record<string, unknown> => !!node && typeof node === 'object')
      .map((node) => sanitizeAiNode(node));
  }

  return next;
}

function parseAiJson<T>(rawJson: string, schema: z.ZodType<T>): T {
  return schema.parse(sanitizeAiPayload(JSON.parse(stripJson(rawJson))));
}

const aiNodeSchema = z.object({
  id: z.string().min(2).max(48),
  title: z.string().min(3).max(80),
  description: z.string().min(12).max(360),
  children: z.array(z.string().min(2).max(48)).max(4).default([]),
  difficulty: z.enum(['starter', 'apprentice', 'adept', 'expert', 'legendary']).default('apprentice'),
  branch: z.string().min(2).max(48),
  identity: z.string().min(3).max(80),
  tradeoff: sanitizeOptionalString(3, 120),
  xp: z.number().int().min(25).max(600).optional(),
  estimatedHours: z.number().int().min(1).max(40).optional(),
  proofPrompt: sanitizeRequiredString(8, 180),
  tips: z.array(z.string().min(4).max(140)).max(4).default([]),
  hidden: z.boolean().default(false),
  unlockCondition: sanitizeOptionalString(8, 180),
});

const paletteSchema = z.object({
  name: z.string().min(3).max(40),
  primary: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  secondary: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  accent: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  background: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  surface: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  text: z.string().regex(/^#[0-9a-fA-F]{6}$/),
});

const aiGraphSchema = z.object({
  palette: paletteSchema.optional(),
  root: aiNodeSchema.extend({
    difficulty: z.literal('starter').default('starter'),
    children: z.array(z.string().min(2).max(48)).min(2).max(8),
  }),
  nodes: z.array(aiNodeSchema).min(2).max(16),
});

const aiBranchExpansionSchema = z.object({
  nodes: z.array(aiNodeSchema).min(2).max(10),
});

export type TreeGenerator = (input: GoalInput) => Promise<SkillTree>;
export type BranchExpander = (tree: SkillTree, nodeId: string, signals: string[]) => Promise<SkillTree>;

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

export function createBranchExpander(apiKey = process.env.GEMINI_API_KEY): BranchExpander {
  return async (tree, nodeId, signals) => {
    if (!apiKey) {
      return expandBranchWithFallback(tree, nodeId, signals);
    }

    try {
      const node = findNode(tree, nodeId);
      const ai = new GoogleGenAI({ apiKey });
      const result = await ai.models.generateContent({
        model: process.env.GEMINI_MODEL ?? 'gemini-2.5-flash',
        contents: buildBranchExpansionPrompt(tree, node, signals),
        config: {
          responseMimeType: 'application/json',
          temperature: 0.9,
        },
      });
      return expandSkillTreeFromAiBranch(tree, nodeId, result.text ?? '');
    } catch (error) {
      console.warn('Gemini branch expansion failed; using local branch fallback.', error);
      return expandBranchWithFallback(tree, nodeId, signals);
    }
  };
}

export function buildSkillTreeFromAiGraph(input: GoalInput, rawJson: string, now = new Date().toISOString()): SkillTree {
  const graph = normalizeSeedGraph(parseAiJson(rawJson, aiGraphSchema));
  const all = [graph.root, ...graph.nodes];
  assertNoPhantomChildren(all);
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
      tips: node.tips.length ? node.tips : createAiTips(node.title, node.identity),
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
    palette: graph.palette ?? getPaletteForGoal(input.title, parseInterests(input.interests).join(' ')),
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

function normalizeSeedGraph(graph: z.infer<typeof aiGraphSchema>): z.infer<typeof aiGraphSchema> {
  const nodesById = new Map(graph.nodes.map((node) => [node.id, node]));
  const rootChildren = graph.root.children.filter((id) => nodesById.has(id)).slice(0, 2);
  const selectedNodes = rootChildren.map((id) => nodesById.get(id)!);

  if (selectedNodes.length < 2) {
    throw new Error('AI seed tree must include at least two valid root children.');
  }

  return {
    root: {
      ...graph.root,
      children: rootChildren,
    },
    nodes: selectedNodes.map((node) => ({
      ...node,
      children: [],
      hidden: false,
      unlockCondition: undefined,
    })),
  };
}

function buildPrompt(input: GoalInput): string {
  return `Create a SMALL personalized starter skill tree for Ascend.

User goal: ${input.title}
Experience level: ${input.experienceLevel}
Available time per week: ${input.weeklyHours} hours
Interests/focus areas: ${input.interests}

Return only valid JSON matching:
{
  "palette": {"name": "...", "primary": "#RRGGBB", "secondary": "#RRGGBB", "accent": "#RRGGBB", "background": "#RRGGBB", "surface": "#RRGGBB", "text": "#RRGGBB"},
  "root": {"id": "...", "title": "...", "description": "...", "children": ["...", "..."], "difficulty": "starter", "branch": "...", "identity": "...", "tradeoff": "...", "proofPrompt": "..."},
  "nodes": [{"id": "...", "title": "...", "description": "...", "children": ["...", "..."], "difficulty": "apprentice|adept|expert|legendary", "branch": "...", "identity": "...", "tradeoff": "...", "proofPrompt": "...", "tips": ["...", "..."], "hidden": false, "unlockCondition": "..."}]
}

Example shape to imitate for the INITIAL chart:
{
  "palette": {
    "name": "Ivory Board",
    "primary": "#E7D8B1",
    "secondary": "#8B5E34",
    "accent": "#FACC15",
    "background": "#16110B",
    "surface": "#2A1F14",
    "text": "#FFF8E7"
  },
  "root": {
    "id": "chess_start",
    "title": "Start Chess",
    "description": "Choose the first identity direction for your chess journey.",
    "children": ["calculation_style", "strategy_style"],
    "difficulty": "starter",
    "branch": "origin",
    "identity": "Chess Explorer",
    "tradeoff": "Calculation vs strategic understanding",
    "proofPrompt": "Play one game and write which style felt more natural."
  },
  "nodes": [
    {"id": "calculation_style", "title": "Calculation-Based Player", "description": "Develop through tactics, forcing lines, and concrete move-by-move reading.", "children": [], "difficulty": "apprentice", "branch": "calculation", "identity": "Calculator", "tradeoff": "Sharp tactics vs long-term planning", "proofPrompt": "Solve 10 tactics and note which motif repeats.", "tips": ["Start with untimed puzzles before adding speed.", "Name the tactic motif out loud.", "Review misses immediately."]},
    {"id": "strategy_style", "title": "Strategy-Based Player", "description": "Develop through plans, positional choices, endgames, and long-term pressure.", "children": [], "difficulty": "apprentice", "branch": "strategy", "identity": "Strategist", "tradeoff": "Long-term pressure vs immediate tactics", "proofPrompt": "Review one game and identify the main plan.", "tips": ["Pause before each move and ask what improved.", "Track pawn structure changes.", "Prefer one clear plan over many vague ideas."]}
  ]
}

Rules:
- This is only the initial seed chart. Keep it small and clean.
- Include exactly 2 to 4 root children and exactly 2 to 6 nodes total.
- Root children should be broad identity/style choices.
- Do NOT generate a full deep tree initially. Deeper nodes are created later when the user clicks "Grow selected branch".
- For the initial chart, non-root nodes should usually have empty children arrays.
- Every child id listed anywhere must have a matching object in "nodes"; never reference phantom children.
- Each root branch must represent a different style, identity, or specialization path.
- Include tradeoffs such as speed vs accuracy, tactical vs positional, creative vs technical, strength vs endurance.
- Generate a named color palette specific to the goal. Love/social goals can use cherry blossom tones; gardening can use greens; fighting can use red corner tones; photography can use golden-hour tones.
- Include 2 to 4 practical tips per node that help the user complete the proof prompt.
- Avoid checklist steps. Prefer identity choices like "Calculation-Based Player" vs "Strategy-Based Player".
- Use concise titles and concrete proof prompts under 180 characters.
- Omit unlockCondition on visible starter nodes; never set it to null.`;
}

function buildBranchExpansionPrompt(tree: SkillTree, node: SkillNode, signals: string[]): string {
  const existingNodes = tree.nodes.map((candidate) => ({
    id: candidate.id,
    title: candidate.title,
    branch: candidate.branch,
    identity: candidate.identity,
    status: candidate.status,
    prerequisites: candidate.prerequisites,
  }));

  return `Grow one selected branch in an existing Ascend RPG skill tree.

Goal: ${tree.rootGoal}
Selected node to expand:
${JSON.stringify({
  id: node.id,
  title: node.title,
  description: node.description,
  branch: node.branch,
  identity: node.identity,
  tradeoff: node.tradeoff,
  difficulty: node.difficulty,
}, null, 2)}

User behavior/proof signals: ${signals.join(', ') || 'none provided'}
Existing tree nodes, for context and to avoid duplicates:
${JSON.stringify(existingNodes, null, 2)}

Return only valid JSON matching:
{
  "nodes": [
    {"id": "new_child_id", "title": "...", "description": "...", "children": ["new_grandchild_a", "new_grandchild_b"], "difficulty": "apprentice|adept|expert|legendary", "branch": "...", "identity": "...", "tradeoff": "...", "proofPrompt": "...", "tips": ["...", "..."], "hidden": false, "unlockCondition": "..."}
  ]
}

Rules:
- Add 3 to 8 NEW nodes under the selected node.
- The selected node is the parent of the first layer of returned nodes.
- Do NOT return a new root, start, overview, or journey wrapper node. Return only actual skills that branch from the selected node.
- Every child id in returned nodes must have a matching object in returned "nodes"; no phantom children.
- Make the expansion deeper than one level: at least one returned child must itself have 1 to 2 children.
- Continue the selected branch identity, but each new node must add a NEW concrete capability to the previous one.
- Think like progression: spark -> controlled flame -> firebolt -> fireball -> solar flare. For social growth: warm opener -> playful exchange -> clear invitation -> graceful response. Do this for the user's real goal.
- Never use generic/meta titles such as "Feedback Loop", "Pressure Test", "Advanced X", "X Mastery Branch", or titles that simply repeat the selected node with a suffix.
- Do not include the selected node title inside new node titles unless it is truly a natural named skill.
- Include at least one tradeoff and one hidden future node with unlockCondition.
- Omit unlockCondition entirely on visible nodes; never set it to null.
- Keep every proofPrompt at or under 180 characters.
- Include 2 to 4 practical tips per node.
- Do not duplicate existing node titles or ids.`;
}

export function expandSkillTreeFromAiBranch(
  tree: SkillTree,
  nodeId: string,
  rawJson: string,
  now = new Date().toISOString(),
): SkillTree {
  const selected = findNode(tree, nodeId);
  const expansion = parseAiJson(rawJson, aiBranchExpansionSchema);
  assertNoPhantomChildren(expansion.nodes);
  const normalizedExpansionNodes = removeExpansionWrapperNodes(expansion.nodes, selected);
  assertNoPhantomChildren(normalizedExpansionNodes);
  const existingTitles = new Set(tree.nodes.map((node) => node.title.toLowerCase()));
  const newBlueprints = normalizedExpansionNodes.filter((node) => !existingTitles.has(node.title.toLowerCase()));
  if (newBlueprints.length < 2) {
    throw new Error('AI branch expansion did not include enough new nodes.');
  }
  assertBranchExpansionQuality(newBlueprints, selected);
  const idMap = createIdMap(
    newBlueprints.map((node) => node.id),
    `${selected.id}-growth`,
  );
  const rootChildren = newBlueprints.filter((node) => !newBlueprints.some((candidate) => candidate.children.includes(node.id)));
  const rootChildIds = new Set(rootChildren.map((node) => node.id));
  const completed = new Set(tree.nodes.filter((node) => node.status === 'complete').map((node) => node.id));
  const positions = layoutExpansion(selected, newBlueprints);
  const newNodes: SkillNode[] = newBlueprints.map((node) => {
    const parents = newBlueprints
      .filter((candidate) => candidate.children.includes(node.id))
      .map((candidate) => idMap.get(candidate.id)!)
      .filter(Boolean);
    const prerequisites = rootChildIds.has(node.id) ? [selected.id] : parents;
    const difficulty = node.difficulty;
    return {
      id: idMap.get(node.id)!,
      title: node.title,
      description: node.description,
      difficulty,
      xp: node.xp ?? difficultyXp[difficulty],
      estimatedHours: node.estimatedHours ?? (difficulty === 'apprentice' ? 2 : difficulty === 'adept' ? 4 : difficulty === 'expert' ? 7 : 12),
      prerequisites,
      proof: {
        type: difficulty === 'expert' || difficulty === 'legendary' ? 'metric' : 'journal',
        prompt: node.proofPrompt,
      },
      tips: node.tips.length ? node.tips : createAiTips(node.title, node.identity),
      branch: node.branch,
      identity: node.identity,
      tradeoff: node.tradeoff,
      unlockCondition: node.unlockCondition,
      rarity: difficulty === 'legendary' ? 'legendary' : difficulty === 'expert' ? 'epic' : difficulty === 'adept' ? 'rare' : 'common',
      hidden: node.hidden,
      status: prerequisites.every((prerequisite) => completed.has(prerequisite)) ? 'unlocked' : 'locked',
      position: positions.get(node.id) ?? { x: selected.position.x + 260, y: selected.position.y },
    };
  });
  const newEdges: SkillEdge[] = [];
  rootChildren.forEach((child) => {
    const target = idMap.get(child.id)!;
    newEdges.push({ id: `${selected.id}-${target}`, source: selected.id, target });
  });
  newBlueprints.forEach((source) => {
    source.children.forEach((targetId) => {
      const sourceId = idMap.get(source.id);
      const target = idMap.get(targetId);
      if (sourceId && target) {
        newEdges.push({ id: `${sourceId}-${target}`, source: sourceId, target });
      }
    });
  });

  return {
    ...tree,
    nodes: [...tree.nodes, ...newNodes],
    edges: [...tree.edges, ...newEdges],
    updatedAt: now,
  };
}

function removeExpansionWrapperNodes(
  nodes: Array<z.output<typeof aiNodeSchema>>,
  selected: SkillNode,
): Array<z.output<typeof aiNodeSchema>> {
  const parentCounts = new Map<string, number>();
  nodes.forEach((node) => {
    node.children.forEach((child) => parentCounts.set(child, (parentCounts.get(child) ?? 0) + 1));
  });
  const wrapperIds = new Set(
    nodes
      .filter((node) => node.children.length > 0 && !parentCounts.has(node.id))
      .filter((node) => isExpansionWrapperNode(node, selected))
      .map((node) => node.id),
  );

  if (wrapperIds.size === 0) return nodes;

  return nodes
    .filter((node) => !wrapperIds.has(node.id))
    .map((node) => ({
      ...node,
      children: node.children.filter((child) => !wrapperIds.has(child)),
    }));
}

function isExpansionWrapperNode(node: z.output<typeof aiNodeSchema>, selected: SkillNode): boolean {
  const title = node.title.toLowerCase();
  const id = node.id.toLowerCase();
  const selectedTitle = selected.title.toLowerCase();
  return (
    title === selectedTitle ||
    title.includes(selectedTitle) ||
    /\b(start|begin|root|overview|journey|branch hub|path hub)\b/.test(title) ||
    /\b(start|begin|root|overview|journey|hub)\b/.test(id)
  );
}

function expandBranchWithFallback(tree: SkillTree, nodeId: string, signals: string[], now = new Date().toISOString()): SkillTree {
  const selected = findNode(tree, nodeId);
  const focus = signals[0]?.trim() || selected.identity || selected.branch;
  const branch = `${selected.branch}-growth`;
  return expandSkillTreeFromAiBranch(
    tree,
    nodeId,
    JSON.stringify({
      nodes: [
        {
          id: 'first_real_rep',
          title: 'First Real Rep',
          description: `Practice the smallest real version of this path, tuned toward ${focus}.`,
          children: ['controlled_upgrade', 'real_world_attempt'],
          difficulty: nextDifficulty(selected.difficulty),
          branch,
          identity: `${selected.identity ?? selected.branch} Specialist`,
          tradeoff: 'Small consistent action vs waiting for confidence',
          proofPrompt: 'Complete one low-stakes real rep and write what happened.',
        },
        {
          id: 'controlled_upgrade',
          title: 'Controlled Upgrade',
          description: 'Add one harder constraint, more stakes, or more precision to the first rep.',
          children: ['signature_move'],
          difficulty: 'adept',
          branch,
          identity: 'Capability Builder',
          tradeoff: 'More challenge vs clean execution',
          proofPrompt: 'Repeat the rep with one deliberate upgrade.',
        },
        {
          id: 'real_world_attempt',
          title: 'Real-World Attempt',
          description: 'Use the skill in the actual environment where it matters.',
          children: ['signature_move'],
          difficulty: 'expert',
          branch,
          identity: 'Applied Performer',
          tradeoff: 'Real stakes vs perfect preparation',
          proofPrompt: 'Log one real-world attempt and the outcome.',
        },
        {
          id: 'signature_move',
          title: 'Signature Move',
          description: 'Turn repeated proof into a confident personal version of this capability.',
          children: [],
          difficulty: 'legendary',
          branch,
          identity: 'Signature Specialist',
          tradeoff: 'Specialization vs adaptability',
          proofPrompt: 'Show repeated proof and name the next signature-level challenge.',
          hidden: true,
          unlockCondition: `Unlock after repeated ${focus} proof on ${selected.title}.`,
        },
      ],
    }),
    now,
  );
}

function assertBranchExpansionQuality(nodes: Array<z.output<typeof aiNodeSchema>>, selected: SkillNode): void {
  const selectedTitle = selected.title.toLowerCase();
  const banned = /\b(feedback loop|pressure test|advanced advanced|mastery branch)\b/i;
  const badTitle = nodes.find((node) => {
    const title = node.title.toLowerCase();
    return banned.test(title) || title.startsWith(`${selectedTitle} `);
  });
  if (badTitle) {
    throw new Error(`AI branch expansion used a generic or recursive title: ${badTitle.title}`);
  }
}

function createAiTips(title: string, identity?: string): string[] {
  return [
    `Make the next ${title} attempt small and observable.`,
    `Save proof right after the attempt while details are fresh.`,
    identity ? `Ask what a ${identity} would do one step better next time.` : 'Pick one next adjustment instead of rewriting the whole plan.',
  ];
}

function assertNoPhantomChildren(nodes: Array<{ id: string; children: string[] }>): void {
  const ids = new Set(nodes.map((node) => node.id));
  const missing = nodes.flatMap((node) => node.children.filter((child) => !ids.has(child)));
  if (missing.length) {
    throw new Error(`AI branch references missing child nodes: ${missing.join(', ')}`);
  }
}

function findNode(tree: SkillTree, nodeId: string): SkillNode {
  const node = tree.nodes.find((candidate) => candidate.id === nodeId);
  if (!node) throw new Error('Skill node not found.');
  return node;
}

function nextDifficulty(difficulty: Difficulty): Difficulty {
  if (difficulty === 'starter') return 'apprentice';
  if (difficulty === 'apprentice') return 'adept';
  if (difficulty === 'adept') return 'expert';
  return 'legendary';
}

function layoutExpansion(parent: SkillNode, nodes: Array<{ id: string; children: string[] }>): Map<string, { x: number; y: number }> {
  const syntheticRoot = '__selected__';
  const positions = layoutGraph(syntheticRoot, [{ id: syntheticRoot, children: nodes.filter((node) => !nodes.some((candidate) => candidate.children.includes(node.id))).map((node) => node.id) }, ...nodes]);
  const parentOffset = positions.get(syntheticRoot) ?? { x: 0, y: 360 };
  positions.delete(syntheticRoot);
  const adjusted = new Map<string, { x: number; y: number }>();
  positions.forEach((position, id) => {
    adjusted.set(id, {
      x: parent.position.x + 280 + position.x - parentOffset.x,
      y: parent.position.y + position.y - parentOffset.y,
    });
  });
  return adjusted;
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
