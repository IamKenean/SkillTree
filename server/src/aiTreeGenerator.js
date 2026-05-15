import { nanoid } from 'nanoid';

let openaiClient = null;
async function getOpenAI() {
  if (!process.env.OPENAI_API_KEY) return null;
  if (openaiClient) return openaiClient;
  const { default: OpenAI } = await import('openai');
  openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return openaiClient;
}

const SYSTEM_PROMPT = `You are the AI engine behind "Ascend", an RPG-style adaptive skill tree platform.
Your job: take a user goal and produce a rich, branching skill tree of 18-30 nodes structured by tiers (0..5).
Each node represents a concrete skill, technique, habit, drill, or milestone the user can complete to advance.

OUTPUT STRICT JSON ONLY in this schema:
{
  "branches": ["Branch 1", "Branch 2", ...],   // 3-5 distinct specialization branches
  "nodes": [
    {
      "id": "n1",
      "title": "...",
      "description": "1-2 sentence concrete what-to-do description",
      "difficulty": 1-5,
      "xp_reward": 50-500,
      "est_minutes": 15-240,
      "branch": "<one of branches, or 'Core'>",
      "tier": 0-5,
      "tags": ["tag1", "tag2"],
      "is_hidden": false,
      "proof_required": false,
      "rarity": "common|rare|epic|legendary",
      "prerequisites": ["n0", ...]   // ids of earlier nodes
    }
  ]
}

Rules:
- One tier-0 root node titled like the goal itself. All other nodes descend from it.
- Each branch must have at least 3 nodes across multiple tiers, increasing in difficulty.
- Higher-tier nodes (3+) are mostly "rare" or "epic"; tier-5 capstones are "legendary".
- 1-2 nodes can be is_hidden=true (future/secret unlocks) at tier 4-5.
- Prerequisites must form a DAG: only reference ids of strictly lower tiers.
- Use real, concrete techniques (e.g. "Negative pull-ups 3x5", not "Get stronger").
- Be domain-specific. For coding: real frameworks. For fitness: real exercises. For music: real techniques.
- Return ONLY raw JSON. No markdown fences, no commentary.`;

export async function generateSkillTree({ title, description, experienceLevel, hoursPerWeek, focusAreas }) {
  const client = await getOpenAI();
  if (client) {
    try {
      const userPrompt = `Generate a skill tree for this user goal.
Goal: ${title}
Details: ${description || '(none)'}
Experience level: ${experienceLevel || 'beginner'}
Hours per week available: ${hoursPerWeek || 5}
Focus areas / interests: ${focusAreas || '(none specified)'}`;
      const resp = await client.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
      });
      const text = resp.choices[0].message.content;
      const parsed = JSON.parse(text);
      return normalizeAIOutput(parsed, title);
    } catch (e) {
      console.error('OpenAI tree generation failed, falling back to heuristic:', e.message);
    }
  }
  return heuristicTree({ title, description, experienceLevel, focusAreas });
}

export async function evolveSkillTree({ goal, existingNodes, completedNodes, focusTags }) {
  const client = await getOpenAI();
  const branchesUsed = [...new Set(existingNodes.map(n => n.branch).filter(Boolean))];
  if (client) {
    try {
      const userPrompt = `The user is advancing on goal: "${goal.title}".
Existing branches in their tree: ${branchesUsed.join(', ')}
Recently completed nodes: ${completedNodes.map(n => `${n.title} [${n.branch}]`).join('; ') || '(none yet)'}
The user shows focused interest in these tags/themes: ${focusTags.join(', ') || '(general progress)'}.

Generate 4-8 NEW advanced nodes that extend the tree based on this focus.
The new nodes should be tier 3-5, more specialized than what exists, and "rare", "epic", or "legendary".
Use the same JSON schema as before but only output the new nodes/branches/edges to add.
Their prerequisites should reference real ids from existing nodes: ${existingNodes.map(n => `"${n.id}":"${n.title}"`).slice(0, 30).join(', ')}.

OUTPUT STRICT JSON:
{
  "branches": [...new branches if any, can be empty],
  "nodes": [...new nodes with same schema, prerequisites referencing existing ids]
}`;
      const resp = await client.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.8,
      });
      const text = resp.choices[0].message.content;
      const parsed = JSON.parse(text);
      return normalizeAIOutput(parsed, goal.title, existingNodes);
    } catch (e) {
      console.error('OpenAI evolution failed, falling back to heuristic:', e.message);
    }
  }
  return heuristicEvolution({ goal, existingNodes, focusTags });
}

function normalizeAIOutput(parsed, rootTitle, existingNodes = []) {
  const idMap = new Map();
  for (const n of existingNodes) idMap.set(n.id, n.id);
  const nodes = [];
  for (const n of parsed.nodes || []) {
    const newId = nanoid(10);
    idMap.set(n.id, newId);
    nodes.push({
      _origId: n.id,
      id: newId,
      title: String(n.title || 'Untitled').slice(0, 120),
      description: String(n.description || '').slice(0, 600),
      difficulty: clamp(parseInt(n.difficulty) || 1, 1, 5),
      xp_reward: clamp(parseInt(n.xp_reward) || 50, 10, 1000),
      est_minutes: clamp(parseInt(n.est_minutes) || 30, 5, 600),
      branch: String(n.branch || 'Core').slice(0, 60),
      tier: clamp(parseInt(n.tier) || 0, 0, 6),
      tags: Array.isArray(n.tags) ? n.tags.slice(0, 8).map(String) : [],
      is_hidden: !!n.is_hidden,
      proof_required: !!n.proof_required,
      rarity: ['common', 'rare', 'epic', 'legendary'].includes(n.rarity) ? n.rarity : 'common',
      prerequisites: Array.isArray(n.prerequisites) ? n.prerequisites : [],
    });
  }
  const edges = [];
  for (const n of nodes) {
    for (const prereq of n.prerequisites || []) {
      const mapped = idMap.get(prereq);
      if (mapped && mapped !== n.id) edges.push({ source: mapped, target: n.id });
    }
  }
  return { branches: parsed.branches || [], nodes, edges };
}

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

// ---------- Heuristic offline fallback ----------

const TEMPLATES = [
  {
    keywords: ['code', 'coding', 'programming', 'developer', 'software', 'web', 'fullstack'],
    branches: ['Foundations', 'Frontend', 'Backend', 'Algorithms', 'Systems & DevOps'],
    nodes: [
      // Foundations
      { branch: 'Foundations', tier: 1, title: 'Master Git Basics', description: 'Learn clone/commit/branch/merge and create a personal portfolio repo.', tags: ['git', 'foundations'] },
      { branch: 'Foundations', tier: 1, title: 'Touch-Type Comfortably', description: 'Reach 60+ WPM with proper finger placement.', tags: ['foundations'] },
      { branch: 'Foundations', tier: 2, title: 'Read a Codebase', description: 'Clone an OSS project and document its architecture in your own words.', tags: ['reading', 'architecture'] },
      // Frontend
      { branch: 'Frontend', tier: 1, title: 'Build a Static Page', description: 'HTML + CSS landing page with semantic markup.', tags: ['html', 'css', 'frontend'] },
      { branch: 'Frontend', tier: 2, title: 'Interactive JS', description: 'Build a todo app with vanilla JS, no framework.', tags: ['javascript', 'frontend'] },
      { branch: 'Frontend', tier: 3, title: 'Single-Page App in React', description: 'Build a real app: routing, state, fetching, forms.', tags: ['react', 'frontend'] },
      { branch: 'Frontend', tier: 4, title: 'UI Animation Systems', description: 'Master Framer Motion or GSAP and ship two delightful micro-interactions.', tags: ['animation', 'frontend'], rarity: 'rare' },
      { branch: 'Frontend', tier: 5, title: 'Design System Architect', description: 'Build a typed component library with theming, tokens, and Storybook.', tags: ['design-system', 'frontend'], rarity: 'epic' },
      // Backend
      { branch: 'Backend', tier: 1, title: 'HTTP & REST Fundamentals', description: 'Understand methods, status codes, idempotency, caching.', tags: ['http', 'backend'] },
      { branch: 'Backend', tier: 2, title: 'Build a REST API', description: 'Express/Fastify CRUD with persistent DB and auth.', tags: ['api', 'backend'] },
      { branch: 'Backend', tier: 3, title: 'Relational Database Mastery', description: 'Normalize a schema, write joins, indexes, transactions.', tags: ['database', 'backend'] },
      { branch: 'Backend', tier: 4, title: 'Real-Time Systems', description: 'WebSockets, pub/sub, presence — build a live collab feature.', tags: ['realtime', 'backend'], rarity: 'rare' },
      { branch: 'Backend', tier: 5, title: 'Distributed Architect', description: 'Design a sharded, eventually consistent service. Write the RFC.', tags: ['distributed', 'backend'], rarity: 'legendary' },
      // Algorithms
      { branch: 'Algorithms', tier: 2, title: 'Core Data Structures', description: 'Arrays, hash maps, stacks, queues, trees — implement each from scratch.', tags: ['dsa'] },
      { branch: 'Algorithms', tier: 3, title: 'Crush 50 Mediums', description: 'Solve 50 medium LeetCode-style problems with patterns.', tags: ['dsa'], rarity: 'rare' },
      { branch: 'Algorithms', tier: 4, title: 'Dynamic Programming Adept', description: 'Internalize knapsack, LIS, interval DP, bitmask DP.', tags: ['dsa'], rarity: 'epic' },
      // Systems & DevOps
      { branch: 'Systems & DevOps', tier: 2, title: 'Containerize an App', description: 'Dockerize a project and run it with docker-compose.', tags: ['devops'] },
      { branch: 'Systems & DevOps', tier: 3, title: 'CI/CD Pipeline', description: 'GitHub Actions: lint, test, deploy on push.', tags: ['devops'] },
      { branch: 'Systems & DevOps', tier: 4, title: 'Observability Pro', description: 'Add logs, metrics, traces with proper dashboards & alerts.', tags: ['devops'], rarity: 'rare' },
      // Hidden/legendary
      { branch: 'Frontend', tier: 5, title: 'Ship Your Own Product', description: 'Launch a real product to real users. Get 100 signups.', tags: ['ship', 'launch'], rarity: 'legendary', is_hidden: true },
    ],
  },
  {
    keywords: ['gym', 'strength', 'fitness', 'lift', 'workout', 'muscle', 'stronger', 'body', 'physique', 'calisthenics'],
    branches: ['Consistency', 'Strength Basics', 'Calisthenics', 'Nutrition', 'Mobility'],
    nodes: [
      { branch: 'Consistency', tier: 1, title: 'Train 3x This Week', description: 'Show up. Any session counts.', tags: ['habit'] },
      { branch: 'Consistency', tier: 2, title: '21-Day Streak', description: 'Train consistently for 3 weeks. Log every session.', tags: ['habit', 'streak'] },
      { branch: 'Consistency', tier: 3, title: '100 Sessions Logged', description: 'A century of training. The real unlock.', tags: ['habit'], rarity: 'rare' },
      { branch: 'Strength Basics', tier: 1, title: 'Learn the Big 4', description: 'Squat, deadlift, bench, overhead press — proper form.', tags: ['lifting'] },
      { branch: 'Strength Basics', tier: 2, title: 'Bodyweight Squat x50', description: 'Clean reps, full depth, no breaks.', tags: ['lifting'] },
      { branch: 'Strength Basics', tier: 3, title: '1x Bodyweight Bench', description: 'Press your bodyweight for 1 clean rep.', tags: ['lifting'], rarity: 'rare' },
      { branch: 'Strength Basics', tier: 4, title: '2x Bodyweight Deadlift', description: 'A serious milestone in raw strength.', tags: ['lifting'], rarity: 'epic' },
      { branch: 'Calisthenics', tier: 1, title: 'Pushup x20', description: 'Twenty clean, chest-to-floor pushups in a row.', tags: ['pushups', 'calisthenics'] },
      { branch: 'Calisthenics', tier: 2, title: 'Negative Pullups', description: '3 sets of 5 controlled negatives.', tags: ['pullups', 'calisthenics'] },
      { branch: 'Calisthenics', tier: 3, title: 'First Pullup', description: 'One strict full-range pullup.', tags: ['pullups', 'calisthenics'], rarity: 'rare' },
      { branch: 'Calisthenics', tier: 3, title: 'Dips x10', description: '10 clean parallel-bar dips.', tags: ['dips', 'calisthenics'], rarity: 'rare' },
      { branch: 'Calisthenics', tier: 4, title: 'Muscle Up', description: 'The first muscle-up. Pure power.', tags: ['muscle-up', 'calisthenics'], rarity: 'epic', is_hidden: true },
      { branch: 'Calisthenics', tier: 5, title: 'Front Lever', description: 'Full front lever hold for 5 seconds.', tags: ['front-lever', 'calisthenics'], rarity: 'legendary', is_hidden: true },
      { branch: 'Nutrition', tier: 1, title: 'Track Macros 7 Days', description: 'Get a baseline. Log everything you eat.', tags: ['nutrition'] },
      { branch: 'Nutrition', tier: 2, title: 'Hit 1g Protein/lb', description: 'For 14 consecutive days.', tags: ['nutrition'] },
      { branch: 'Nutrition', tier: 3, title: 'Cook 20 Meals', description: 'Prep your own high-protein meals.', tags: ['nutrition'], rarity: 'rare' },
      { branch: 'Mobility', tier: 1, title: '10-min Daily Stretch', description: 'For 14 days. Hips, hamstrings, shoulders.', tags: ['mobility'] },
      { branch: 'Mobility', tier: 2, title: 'Touch Your Toes', description: 'Hands flat on the floor with straight legs.', tags: ['mobility'] },
      { branch: 'Mobility', tier: 3, title: 'Pancake Stretch', description: 'Chest-to-floor in straddle. Patience pays.', tags: ['mobility'], rarity: 'rare' },
    ],
  },
  {
    keywords: ['draw', 'drawing', 'art', 'paint', 'illustration', 'sketch'],
    branches: ['Fundamentals', 'Anatomy', 'Color & Light', 'Digital Tools', 'Style'],
    nodes: [
      { branch: 'Fundamentals', tier: 1, title: '100 Boxes in Perspective', description: 'Daily warmup. 1-, 2-, and 3-point.', tags: ['drawing'] },
      { branch: 'Fundamentals', tier: 2, title: '50 Gesture Drawings', description: '30-second poses from reference. Capture movement.', tags: ['drawing'] },
      { branch: 'Fundamentals', tier: 3, title: 'Construction Mastery', description: 'Build any object from primitive forms.', tags: ['drawing'], rarity: 'rare' },
      { branch: 'Anatomy', tier: 2, title: 'Skull from Memory', description: 'Front, 3/4, side without reference.', tags: ['anatomy'] },
      { branch: 'Anatomy', tier: 3, title: 'Full Figure', description: 'Draw a proportional standing figure from imagination.', tags: ['anatomy'], rarity: 'rare' },
      { branch: 'Anatomy', tier: 4, title: 'Hands & Feet', description: 'The hardest body parts. Master them.', tags: ['anatomy'], rarity: 'epic' },
      { branch: 'Color & Light', tier: 2, title: 'Value Studies x10', description: 'Greyscale paintings from photo reference.', tags: ['color', 'value'] },
      { branch: 'Color & Light', tier: 3, title: 'Limited Palette', description: 'Paint 5 scenes using only 3 colors + white.', tags: ['color'], rarity: 'rare' },
      { branch: 'Color & Light', tier: 4, title: 'Master Light Scenarios', description: 'Sunset, overcast, candlelight, neon — paint each.', tags: ['color'], rarity: 'epic' },
      { branch: 'Digital Tools', tier: 1, title: 'Procreate / Photoshop Basics', description: 'Layers, brushes, selection, export.', tags: ['digital'] },
      { branch: 'Digital Tools', tier: 2, title: 'Custom Brush Set', description: 'Build 5 brushes that match your style.', tags: ['digital'] },
      { branch: 'Digital Tools', tier: 3, title: 'Speedpaint Workflow', description: 'Finish a painting in under 1 hour.', tags: ['digital'], rarity: 'rare' },
      { branch: 'Style', tier: 3, title: 'Study 5 Artists', description: 'Deep-dive — replicate 2 pieces from each.', tags: ['style'], rarity: 'rare' },
      { branch: 'Style', tier: 4, title: 'Define Your Voice', description: 'Produce a 5-piece series with consistent vision.', tags: ['style'], rarity: 'epic' },
      { branch: 'Style', tier: 5, title: 'Build a Following', description: 'Share work consistently, grow to 1000 followers.', tags: ['style'], rarity: 'legendary', is_hidden: true },
    ],
  },
  {
    keywords: ['guitar', 'music', 'piano', 'instrument', 'sing', 'song', 'musician'],
    branches: ['Fundamentals', 'Technique', 'Theory', 'Repertoire', 'Performance'],
    nodes: [
      { branch: 'Fundamentals', tier: 1, title: 'Tune by Ear', description: 'Tune your instrument with only a reference pitch.', tags: ['ear', 'fundamentals'] },
      { branch: 'Fundamentals', tier: 2, title: 'Open Chords', description: 'All 8 essential open chords, clean transitions.', tags: ['fundamentals'] },
      { branch: 'Technique', tier: 2, title: 'Metronome Practice 14 Days', description: 'Daily 15-min sessions, log BPMs.', tags: ['technique'] },
      { branch: 'Technique', tier: 3, title: 'Barre Chords', description: 'Clean F, B, and movable shapes.', tags: ['technique'], rarity: 'rare' },
      { branch: 'Technique', tier: 4, title: 'Sweep Picking', description: 'Smooth 3-string and 5-string arpeggios.', tags: ['technique'], rarity: 'epic' },
      { branch: 'Theory', tier: 2, title: 'Major Scale Everywhere', description: 'Play the major scale in 5 positions.', tags: ['theory'] },
      { branch: 'Theory', tier: 3, title: 'Diatonic Chords', description: 'Build chords from any major scale.', tags: ['theory'], rarity: 'rare' },
      { branch: 'Theory', tier: 4, title: 'Modes Master', description: 'Improvise comfortably in all 7 modes.', tags: ['theory'], rarity: 'epic' },
      { branch: 'Repertoire', tier: 2, title: 'Learn 5 Songs', description: 'Full songs, start to finish, from memory.', tags: ['repertoire'] },
      { branch: 'Repertoire', tier: 3, title: '20-Song Setlist', description: 'A real performance-ready set.', tags: ['repertoire'], rarity: 'rare' },
      { branch: 'Performance', tier: 3, title: 'Record Yourself', description: 'Listen back, identify weaknesses.', tags: ['performance'] },
      { branch: 'Performance', tier: 4, title: 'Play for Friends', description: 'A real audience, even just one person.', tags: ['performance'], rarity: 'rare' },
      { branch: 'Performance', tier: 5, title: 'Open Mic Night', description: 'Perform in public. Fear is a tier-5 enemy.', tags: ['performance'], rarity: 'legendary', is_hidden: true },
    ],
  },
  {
    keywords: ['speak', 'speaking', 'public speaking', 'presentation', 'communicate', 'communication'],
    branches: ['Voice', 'Content', 'Stage Craft', 'Confidence', 'Real Reps'],
    nodes: [
      { branch: 'Voice', tier: 1, title: 'Daily Breathing Drill', description: 'Diaphragmatic breathing 5 min/day for 2 weeks.', tags: ['voice'] },
      { branch: 'Voice', tier: 2, title: 'Articulation Reps', description: 'Tongue twisters every morning for 14 days.', tags: ['voice'] },
      { branch: 'Voice', tier: 3, title: 'Vocal Range Expansion', description: 'Find your low/high comfort and stretch them.', tags: ['voice'], rarity: 'rare' },
      { branch: 'Content', tier: 1, title: 'Structure: Tell-Show-Tell', description: 'Outline 3 mini-talks using this pattern.', tags: ['content'] },
      { branch: 'Content', tier: 2, title: 'Strong Openings', description: 'Practice 5 different talk hooks.', tags: ['content'] },
      { branch: 'Content', tier: 3, title: 'Story-Driven Talk', description: 'Write a 5-min talk centered on a personal story.', tags: ['content'], rarity: 'rare' },
      { branch: 'Stage Craft', tier: 2, title: 'Eliminate Filler Words', description: 'Record yourself; cut "um/like" by 80%.', tags: ['stage'] },
      { branch: 'Stage Craft', tier: 3, title: 'Body Language', description: 'Open posture, intentional movement, pauses.', tags: ['stage'], rarity: 'rare' },
      { branch: 'Confidence', tier: 2, title: 'Cold Approach', description: 'Have 5 conversations with strangers.', tags: ['confidence'] },
      { branch: 'Confidence', tier: 3, title: 'Impromptu Drills', description: 'Speak 60 seconds on a random topic, 10x.', tags: ['confidence'], rarity: 'rare' },
      { branch: 'Real Reps', tier: 2, title: 'Record a 3-min Video', description: 'Speak directly to camera. Review and re-record.', tags: ['reps'] },
      { branch: 'Real Reps', tier: 3, title: 'Toastmasters / Meetup', description: 'Speak in front of a real group.', tags: ['reps'], rarity: 'rare' },
      { branch: 'Real Reps', tier: 5, title: 'Keynote Talk', description: 'Deliver a 20-min talk at a real event.', tags: ['reps'], rarity: 'legendary', is_hidden: true },
    ],
  },
  // Generic fallback
  {
    keywords: [],
    branches: ['Foundations', 'Practice', 'Knowledge', 'Application', 'Mastery'],
    nodes: [
      { branch: 'Foundations', tier: 1, title: 'Define Your "Why"', description: 'Write a 1-page manifesto on why this goal matters to you.', tags: ['mindset'] },
      { branch: 'Foundations', tier: 1, title: 'Set Up Your Space', description: 'Prepare a dedicated environment to work on this goal.', tags: ['environment'] },
      { branch: 'Foundations', tier: 2, title: 'First Week Streak', description: 'Show up for 7 days in a row, any amount of time.', tags: ['habit', 'streak'] },
      { branch: 'Practice', tier: 1, title: 'Daily Micro-Reps', description: '15 min/day for 14 days. No exceptions.', tags: ['practice'] },
      { branch: 'Practice', tier: 2, title: 'Deliberate Practice Session', description: 'A 60-min focused, distraction-free session.', tags: ['practice'] },
      { branch: 'Practice', tier: 3, title: '30-Day Streak', description: 'A full month of consistent effort.', tags: ['streak'], rarity: 'rare' },
      { branch: 'Practice', tier: 4, title: '100-Hour Mark', description: 'Reach 100 logged hours. Real depth begins.', tags: ['hours'], rarity: 'epic' },
      { branch: 'Knowledge', tier: 1, title: 'Read 1 Foundational Book', description: 'Cover-to-cover. Take notes.', tags: ['learning'] },
      { branch: 'Knowledge', tier: 2, title: 'Study 3 Experts', description: 'Identify the best teachers and study their work.', tags: ['learning'] },
      { branch: 'Knowledge', tier: 3, title: 'Teach Someone Else', description: 'The fastest way to learn is to teach.', tags: ['learning'], rarity: 'rare' },
      { branch: 'Application', tier: 2, title: 'Ship a Tiny Project', description: 'Apply the skill to make something real, however small.', tags: ['application'] },
      { branch: 'Application', tier: 3, title: 'Ship a Medium Project', description: 'A more ambitious application of what you\'ve learned.', tags: ['application'], rarity: 'rare' },
      { branch: 'Application', tier: 4, title: 'Get Real Feedback', description: 'Share your work, collect honest critique, iterate.', tags: ['application'], rarity: 'epic' },
      { branch: 'Mastery', tier: 4, title: 'Develop Your Style', description: 'Find what makes your approach yours.', tags: ['mastery'], rarity: 'epic' },
      { branch: 'Mastery', tier: 5, title: 'Become a Resource', description: 'Others now ask you for advice in this area.', tags: ['mastery'], rarity: 'legendary', is_hidden: true },
    ],
  },
];

function pickTemplate(text) {
  const lower = text.toLowerCase();
  for (const t of TEMPLATES) {
    if (t.keywords.length && t.keywords.some(k => lower.includes(k))) return t;
  }
  return TEMPLATES[TEMPLATES.length - 1];
}

function heuristicTree({ title, description, experienceLevel, focusAreas }) {
  const blob = `${title} ${description || ''} ${focusAreas || ''}`;
  const template = pickTemplate(blob);

  const rootId = nanoid(10);
  const rootNode = {
    id: rootId,
    title: title.length > 60 ? title.slice(0, 57) + '...' : title,
    description: description || `Your journey toward: ${title}`,
    difficulty: 1,
    xp_reward: 50,
    est_minutes: 5,
    branch: 'Core',
    tier: 0,
    tags: ['root'],
    is_hidden: false,
    proof_required: false,
    rarity: 'common',
    prerequisites: [],
  };

  const branchRoots = {};
  const nodes = [rootNode];
  const edges = [];

  for (const branch of template.branches) {
    const id = nanoid(10);
    branchRoots[branch] = id;
    nodes.push({
      id,
      title: branch,
      description: `Path of the ${branch}. Begin here.`,
      difficulty: 1,
      xp_reward: 40,
      est_minutes: 10,
      branch,
      tier: 0,
      tags: ['branch-root', branch.toLowerCase()],
      is_hidden: false,
      proof_required: false,
      rarity: 'common',
      prerequisites: [rootId],
    });
    edges.push({ source: rootId, target: id });
  }

  const byBranch = {};
  for (const n of template.nodes) {
    (byBranch[n.branch] ||= []).push(n);
  }

  for (const branch of Object.keys(byBranch)) {
    const sorted = byBranch[branch].sort((a, b) => a.tier - b.tier);
    let prevByTier = { 0: branchRoots[branch] };
    for (let i = 0; i < sorted.length; i++) {
      const t = sorted[i];
      const id = nanoid(10);
      const prereqTier = Math.max(0, t.tier - 1);
      let prereqId = prevByTier[prereqTier];
      if (!prereqId) {
        // find closest lower tier
        for (let k = t.tier - 1; k >= 0; k--) {
          if (prevByTier[k]) { prereqId = prevByTier[k]; break; }
        }
        if (!prereqId) prereqId = branchRoots[branch];
      }
      const node = {
        id,
        title: t.title,
        description: t.description,
        difficulty: clamp(t.tier || 1, 1, 5),
        xp_reward: 50 + (t.tier || 1) * 50,
        est_minutes: 20 + (t.tier || 1) * 20,
        branch,
        tier: t.tier,
        tags: t.tags || [],
        is_hidden: !!t.is_hidden,
        proof_required: t.tier >= 3,
        rarity: t.rarity || (t.tier >= 5 ? 'legendary' : t.tier >= 4 ? 'epic' : t.tier >= 3 ? 'rare' : 'common'),
        prerequisites: [prereqId],
      };
      nodes.push(node);
      edges.push({ source: prereqId, target: id });
      prevByTier[t.tier] = id;
    }
  }

  return { branches: template.branches, nodes, edges };
}

function heuristicEvolution({ goal, existingNodes, focusTags }) {
  // pick the branch the user is most active in
  const branchCounts = {};
  for (const n of existingNodes) {
    if (n.status === 'completed') branchCounts[n.branch] = (branchCounts[n.branch] || 0) + 1;
  }
  const topBranch = Object.entries(branchCounts).sort((a, b) => b[1] - a[1])[0]?.[0]
    || existingNodes[0]?.branch
    || 'Mastery';

  const maxTier = Math.max(...existingNodes.map(n => n.tier || 0));
  const tipNodes = existingNodes.filter(n => n.branch === topBranch && (n.tier || 0) === maxTier);
  const anchor = tipNodes[0] || existingNodes[existingNodes.length - 1];

  const focusText = (focusTags[0] || topBranch).toLowerCase();
  const advanced = generateAdvancedNodesFor(focusText, topBranch, anchor.tier);

  const newNodes = [];
  const newEdges = [];
  let prevId = anchor.id;
  for (let i = 0; i < advanced.length; i++) {
    const a = advanced[i];
    const id = nanoid(10);
    const tier = anchor.tier + 1 + Math.floor(i / 2);
    newNodes.push({
      id,
      title: a.title,
      description: a.description,
      difficulty: clamp(tier, 1, 5),
      xp_reward: 200 + tier * 75,
      est_minutes: 60 + tier * 20,
      branch: topBranch,
      tier,
      tags: a.tags || focusTags,
      is_hidden: false,
      proof_required: true,
      rarity: tier >= 5 ? 'legendary' : tier >= 4 ? 'epic' : 'rare',
      prerequisites: [prevId],
    });
    newEdges.push({ source: prevId, target: id });
    prevId = id;
  }

  return { branches: [], nodes: newNodes, edges: newEdges };
}

function generateAdvancedNodesFor(focus, branch, fromTier) {
  const f = focus.toLowerCase();
  if (f.includes('pullup') || f.includes('pull-up') || f.includes('dip') || f.includes('calisthen')) {
    return [
      { title: 'Weighted Pullups', description: 'Add 20% bodyweight, 3x5 clean reps.', tags: ['calisthenics'] },
      { title: 'Muscle-Up', description: 'Bar muscle-up — explosive transition.', tags: ['muscle-up'] },
      { title: 'Front Lever Tuck', description: 'Hold a tuck front lever for 10 seconds.', tags: ['front-lever'] },
      { title: 'Full Planche Lean', description: 'Build the shoulders for planche.', tags: ['planche'] },
    ];
  }
  if (f.includes('push') || f.includes('chest')) {
    return [
      { title: 'Archer Pushups', description: '3x5 each side, controlled tempo.', tags: ['pushups'] },
      { title: 'Pseudo Planche Pushups', description: 'Hands at hips, lean forward.', tags: ['planche'] },
      { title: 'One-Arm Pushup Progression', description: 'Negative one-arm pushups 3x3.', tags: ['pushups'] },
    ];
  }
  if (f.includes('react') || f.includes('frontend') || f.includes('ui')) {
    return [
      { title: 'Advanced React Patterns', description: 'Compound components, render props, custom hooks.', tags: ['react', 'frontend'] },
      { title: 'Animation Mastery', description: 'Framer Motion choreography across routes.', tags: ['animation', 'frontend'] },
      { title: 'Design System Tokens', description: 'Theme + tokens + dark mode.', tags: ['design-system'] },
      { title: 'Ship a Polished SPA', description: 'Real users, real polish, real launch.', tags: ['ship'] },
    ];
  }
  if (f.includes('backend') || f.includes('api') || f.includes('database')) {
    return [
      { title: 'Database Indexing & EXPLAIN', description: 'Analyze and optimize 5 slow queries.', tags: ['database', 'backend'] },
      { title: 'Background Job System', description: 'Implement a queue with retries and DLQ.', tags: ['backend'] },
      { title: 'Caching Strategy', description: 'Add Redis caching to a hot path. Measure.', tags: ['backend'] },
      { title: 'Distributed Tracing', description: 'OTel + Grafana / Honeycomb.', tags: ['observability'] },
    ];
  }
  // Generic deepening
  return [
    { title: `Specialize in ${branch}`, description: `Take a deeper dive into ${branch} mastery.`, tags: [branch.toLowerCase()] },
    { title: `Teach ${branch}`, description: 'Document and share what you know.', tags: ['teach'] },
    { title: `Capstone in ${branch}`, description: 'A signature project that proves your level.', tags: ['capstone'] },
  ];
}
