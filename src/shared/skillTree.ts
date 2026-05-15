import type {
  Achievement,
  Difficulty,
  GoalInput,
  ProgressEntry,
  SkillEdge,
  SkillNode,
  SkillTree,
} from './types.js';

const difficultyXp: Record<Difficulty, number> = {
  starter: 50,
  apprentice: 90,
  adept: 140,
  expert: 220,
  legendary: 420,
};

const catalog: Record<string, string[]> = {
  coding: ['Core syntax', 'Debugging rituals', 'Project shipping', 'Frontend craft', 'Backend systems'],
  machine: ['Python fluency', 'Data intuition', 'Model training', 'Evaluation loops', 'ML product thinking'],
  gym: ['Consistency', 'Bodyweight base', 'Nutrition', 'Strength technique', 'Recovery'],
  strength: ['Consistency', 'Pushups', 'Pullups', 'Beginner lifting', 'Nutrition'],
  calisthenics: ['Pushup volume', 'Dips', 'Pullups', 'Handstand line', 'Mobility'],
  drawing: ['Observation', 'Gesture', 'Values', 'Perspective', 'Personal style'],
  guitar: ['Chord changes', 'Rhythm', 'Ear training', 'Songs', 'Improvisation'],
  speaking: ['Voice control', 'Story structure', 'Practice reps', 'Audience feedback', 'Stage confidence'],
  default: ['Consistency', 'Fundamentals', 'Practice loop', 'Feedback', 'Specialization'],
};

const adaptationCatalog: Record<string, string[]> = {
  calisthenics: ['Muscle up pathway', 'Front lever basics', 'Planche prep', 'Explosive pulling'],
  frontend: ['React systems', 'Motion design', 'Design tokens', 'Accessibility mastery'],
  backend: ['API architecture', 'Database indexing', 'Background jobs', 'Reliability drills'],
  machine: ['Feature engineering', 'Model evaluation', 'Neural networks', 'MLOps pipeline'],
  nutrition: ['Meal planning', 'Macro tracking', 'Recovery nutrition', 'Hydration streak'],
  speaking: ['Impromptu rounds', 'Persuasive structure', 'Camera presence', 'Live Q&A boss'],
};

const normalize = (value: string) => value.toLowerCase().trim();

export function parseInterests(input: string): string[] {
  return input
    .split(/[,;\n]/)
    .map((item) => normalize(item))
    .filter(Boolean)
    .slice(0, 8);
}

export function inferDomain(goal: string, interests: string[]): string {
  const haystack = normalize([goal, ...interests].join(' '));
  const entries = [
    ['machine', ['machine learning', 'ml', 'ai', 'data science']],
    ['calisthenics', ['calisthenics', 'pullup', 'pull-up', 'dip', 'handstand', 'muscle up']],
    ['strength', ['stronger', 'strength', 'lifting', 'gym', 'fitness', 'pushup']],
    ['coding', ['coding', 'programming', 'developer', 'software', 'react', 'frontend', 'backend']],
    ['drawing', ['drawing', 'art', 'sketch', 'illustration']],
    ['guitar', ['guitar', 'music', 'song']],
    ['speaking', ['public speaking', 'presentation', 'speaking']],
  ] as const;

  return entries.find(([, terms]) => terms.some((term) => haystack.includes(term)))?.[0] ?? 'default';
}

function slug(value: string): string {
  return normalize(value)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function buildNode(
  title: string,
  index: number,
  branch: string,
  prerequisites: string[],
  rootId: string,
): SkillNode {
  const difficulty: Difficulty =
    index === 0 ? 'starter' : index === 1 ? 'apprentice' : index === 2 ? 'adept' : index === 3 ? 'expert' : 'legendary';
  const id = `${rootId}-${slug(branch)}-${index + 1}`;
  const x = 160 + index * 230;
  const y = branch === 'core' ? 60 : branch === 'practice' ? 260 : 460;

  return {
    id,
    title,
    description: `${title} turns the goal into a concrete, repeatable skill with a clear next action.`,
    difficulty,
    xp: difficultyXp[difficulty],
    estimatedHours: Math.max(1, index + 1),
    prerequisites,
    proof: {
      type: index > 2 ? 'metric' : 'journal',
      prompt: index > 2 ? 'Record a measurable result or upload proof of the attempt.' : 'Write what you practiced and what improved.',
    },
    branch,
    rarity: difficulty === 'legendary' ? 'legendary' : difficulty === 'expert' ? 'epic' : difficulty === 'adept' ? 'rare' : 'common',
    hidden: difficulty === 'legendary',
    status: prerequisites.length === 0 ? 'unlocked' : 'locked',
    position: { x, y },
  };
}

export function generateSkillTree(input: GoalInput, now = new Date().toISOString()): SkillTree {
  const interests = parseInterests(input.interests);
  const domain = inferDomain(input.title, interests);
  const rootId = slug(input.title) || 'personal-growth';
  const root: SkillNode = {
    id: `${rootId}-root`,
    title: input.title,
    description: `Your central quest: build visible momentum toward "${input.title}".`,
    difficulty: 'starter',
    xp: 50,
    estimatedHours: Math.max(1, Math.round(input.weeklyHours / 2)),
    prerequisites: [],
    proof: { type: 'journal', prompt: 'State your baseline and the first action you took.' },
    branch: 'root',
    rarity: 'rare',
    status: 'unlocked',
    position: { x: 0, y: 260 },
  };

  const base = catalog[domain] ?? catalog.default;
  const interestSkills = interests.slice(0, 3).map((interest) => `${interest.replace(/\b\w/g, (c) => c.toUpperCase())} focus`);
  const branches = [
    { name: 'core', skills: [base[0], base[1], base[2], `${base[2]} streak`, `${base[4]} boss`] },
    { name: 'practice', skills: [base[1], base[3], ...interestSkills, `${base[3]} specialization`].slice(0, 5) },
    { name: 'mastery', skills: [base[2], base[4], 'Weekly quest chain', 'Adaptive mastery', 'Legendary challenge'] },
  ];

  const nodes = [root];
  const edges: SkillEdge[] = [];

  branches.forEach((branch) => {
    let previous = root.id;
    branch.skills.forEach((skill, index) => {
      const prerequisites = index === 0 ? [root.id] : [previous];
      const node = buildNode(skill, index, branch.name, prerequisites, rootId);
      nodes.push(node);
      edges.push({ id: `${previous}-${node.id}`, source: previous, target: node.id });
      previous = node.id;
    });
  });

  return {
    id: `${rootId}-${Date.now().toString(36)}`,
    rootGoal: input.title,
    experienceLevel: input.experienceLevel,
    weeklyHours: input.weeklyHours,
    interests,
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

export function completeNode(
  tree: SkillTree,
  nodeId: string,
  note: string,
  focusTags: string[],
  proofUrl?: string,
  now = new Date().toISOString(),
): SkillTree {
  const node = tree.nodes.find((item) => item.id === nodeId);
  if (!node || node.status !== 'unlocked') {
    throw new Error('Skill is not unlocked yet.');
  }

  const progress: ProgressEntry = {
    id: `${nodeId}-${Date.now().toString(36)}`,
    nodeId,
    note,
    focusTags: focusTags.map(normalize).filter(Boolean),
    proofUrl,
    completedAt: now,
    xpAwarded: node.xp,
  };
  const completed = new Set([...tree.progress.map((entry) => entry.nodeId), nodeId]);
  const nodes = tree.nodes.map((item) => {
    if (item.id === nodeId) {
      return { ...item, status: 'complete' as const, hidden: false };
    }
    const canUnlock = item.prerequisites.every((prerequisite) => completed.has(prerequisite));
    return canUnlock && item.status === 'locked' ? { ...item, status: 'unlocked' as const, hidden: false } : item;
  });
  const totalXp = tree.totalXp + node.xp;
  const level = Math.floor(totalXp / 250) + 1;
  const achievements = unlockAchievements(tree.achievements, totalXp, completed.size, now);

  return {
    ...tree,
    nodes,
    progress: [progress, ...tree.progress],
    achievements,
    totalXp,
    level,
    streak: tree.streak + 1,
    updatedAt: now,
  };
}

function unlockAchievements(existing: Achievement[], totalXp: number, completedCount: number, now: string): Achievement[] {
  const achieved = new Set(existing.map((item) => item.id));
  const next = [...existing];
  const maybeAdd = (id: string, title: string, description: string) => {
    if (!achieved.has(id)) {
      next.push({ id, title, description, unlockedAt: now });
    }
  };

  if (completedCount >= 1) maybeAdd('first-step', 'First Step', 'Completed the first skill node.');
  if (completedCount >= 5) maybeAdd('branch-runner', 'Branch Runner', 'Completed five skill nodes.');
  if (totalXp >= 500) maybeAdd('level-forged', 'Level Forged', 'Earned 500 total XP.');

  return next;
}

export function adaptSkillTree(
  tree: SkillTree,
  signals: string[],
  now = new Date().toISOString(),
): SkillTree {
  const combinedSignals = [...signals, ...tree.progress.flatMap((entry) => entry.focusTags), ...tree.interests];
  const focus = inferAdaptiveFocus(combinedSignals);
  const additions = adaptationCatalog[focus] ?? adaptationCatalog.frontend;
  const rootId = tree.nodes[0]?.id.replace('-root', '') ?? slug(tree.rootGoal);
  const existingTitles = new Set(tree.nodes.map((node) => normalize(node.title)));
  const anchor =
    [...tree.nodes].reverse().find((node) => node.status === 'complete') ??
    tree.nodes.find((node) => node.branch === 'root') ??
    tree.nodes[0];
  const branch = `${focus}-evolution`;
  let previous = anchor.id;
  const nodes = [...tree.nodes];
  const edges = [...tree.edges];

  additions.forEach((title, index) => {
    if (existingTitles.has(normalize(title))) return;
    const node = buildNode(title, index + 1, branch, [previous], rootId);
    node.position = { x: 460 + index * 240, y: 660 };
    node.rarity = index > 1 ? 'epic' : 'rare';
    node.hidden = index > 2;
    nodes.push(node);
    edges.push({ id: `${previous}-${node.id}`, source: previous, target: node.id });
    previous = node.id;
  });

  return {
    ...tree,
    interests: Array.from(new Set([...tree.interests, focus])),
    nodes,
    edges,
    updatedAt: now,
  };
}

function inferAdaptiveFocus(signals: string[]): string {
  const text = signals.map(normalize).join(' ');
  const candidates = [
    ['calisthenics', ['calisthenics', 'pushup', 'push-up', 'dip', 'pullup', 'pull-up', 'handstand', 'front lever']],
    ['frontend', ['frontend', 'react', 'ui', 'animation', 'css', 'component']],
    ['backend', ['backend', 'api', 'database', 'server', 'queue']],
    ['machine', ['machine', 'model', 'data', 'python', 'neural']],
    ['nutrition', ['nutrition', 'protein', 'meal', 'macro']],
    ['speaking', ['speech', 'speaking', 'presentation', 'audience']],
  ] as const;

  return candidates.find(([, terms]) => terms.some((term) => text.includes(term)))?.[0] ?? 'frontend';
}
