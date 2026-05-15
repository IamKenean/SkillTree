import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

import db from './db.js';
import { signToken, authMiddleware } from './auth.js';
import { generateSkillTree, evolveSkillTree } from './aiTreeGenerator.js';
import { computeLayout } from './layout.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(express.json({ limit: '2mb' }));
app.use(cors({
  origin: (process.env.CLIENT_ORIGIN || '*'),
  credentials: false,
}));

// ---------- Helpers ----------

function levelFromXp(xp) {
  // Tier curve: each level requires more XP
  // Level n requires 100 * n XP, total = 100 * n*(n+1)/2
  let level = 1, total = 0;
  while (true) {
    const need = 100 * level;
    if (xp < total + need) break;
    total += need;
    level++;
  }
  return {
    level,
    xpIntoLevel: xp - total,
    xpForNextLevel: 100 * level,
  };
}

function todayStr() { return new Date().toISOString().slice(0, 10); }
function yesterdayStr() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

function userPublic(u) {
  const lvl = levelFromXp(u.xp);
  return {
    id: u.id,
    username: u.username,
    email: u.email,
    avatar: u.avatar,
    xp: u.xp,
    streak: u.streak,
    last_activity_date: u.last_activity_date,
    level: lvl.level,
    xp_into_level: lvl.xpIntoLevel,
    xp_for_next_level: lvl.xpForNextLevel,
  };
}

function getUser(id) {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
}

function bumpStreak(userId) {
  const u = getUser(userId);
  if (!u) return;
  const today = todayStr();
  if (u.last_activity_date === today) return;
  const streak = u.last_activity_date === yesterdayStr() ? (u.streak + 1) : 1;
  db.prepare('UPDATE users SET streak = ?, last_activity_date = ? WHERE id = ?').run(streak, today, userId);
}

function getGoalForUser(goalId, userId) {
  return db.prepare('SELECT * FROM goals WHERE id = ? AND user_id = ?').get(goalId, userId);
}

function loadTree(goalId) {
  const nodes = db.prepare('SELECT * FROM skill_nodes WHERE goal_id = ?').all(goalId);
  const edges = db.prepare('SELECT * FROM skill_edges WHERE goal_id = ?').all(goalId);
  return { nodes, edges };
}

function recomputeAvailability(goalId) {
  const { nodes, edges } = loadTree(goalId);
  const byId = new Map(nodes.map(n => [n.id, n]));
  const incoming = new Map(nodes.map(n => [n.id, []]));
  for (const e of edges) {
    if (incoming.has(e.target_id)) incoming.get(e.target_id).push(e.source_id);
  }
  const update = db.prepare('UPDATE skill_nodes SET status = ? WHERE id = ?');
  const tx = db.transaction(() => {
    for (const n of nodes) {
      if (n.status === 'completed') continue;
      const prereqs = incoming.get(n.id) || [];
      const allDone = prereqs.length === 0 || prereqs.every(pid => byId.get(pid)?.status === 'completed');
      const next = allDone ? 'available' : 'locked';
      if (next !== n.status) update.run(next, n.id);
    }
  });
  tx();
}

function persistTree(goalId, tree, { existingIds = new Set(), skipLayout = false } = {}) {
  if (!skipLayout) computeLayout(tree.nodes, tree.edges);
  const insertNode = db.prepare(`
    INSERT INTO skill_nodes (id, goal_id, title, description, difficulty, xp_reward, est_minutes, tags, branch, tier, position_x, position_y, status, is_hidden, proof_required, rarity)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertEdge = db.prepare(`INSERT INTO skill_edges (id, goal_id, source_id, target_id) VALUES (?, ?, ?, ?)`);
  const tx = db.transaction(() => {
    for (const n of tree.nodes) {
      if (existingIds.has(n.id)) continue;
      insertNode.run(
        n.id, goalId, n.title, n.description, n.difficulty, n.xp_reward, n.est_minutes,
        JSON.stringify(n.tags || []), n.branch, n.tier, n.position_x, n.position_y,
        n.tier === 0 && n.branch === 'Core' ? 'available' : 'locked',
        n.is_hidden ? 1 : 0, n.proof_required ? 1 : 0, n.rarity || 'common'
      );
    }
    for (const e of tree.edges) {
      insertEdge.run(nanoid(10), goalId, e.source, e.target);
    }
  });
  tx();
  recomputeAvailability(goalId);
}

// ---------- Auth routes ----------

app.post('/api/auth/signup', async (req, res) => {
  const { username, email, password, avatar } = req.body || {};
  if (!username || !email || !password) return res.status(400).json({ error: 'username, email, and password are required' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
  const exists = db.prepare('SELECT 1 FROM users WHERE username = ? OR email = ?').get(username, email);
  if (exists) return res.status(400).json({ error: 'Username or email already taken' });
  const id = nanoid(12);
  const password_hash = await bcrypt.hash(password, 10);
  db.prepare('INSERT INTO users (id, username, email, password_hash, avatar) VALUES (?, ?, ?, ?, ?)')
    .run(id, username, email, password_hash, avatar || null);
  const user = getUser(id);
  const token = signToken(user);
  res.json({ token, user: userPublic(user) });
});

app.post('/api/auth/login', async (req, res) => {
  const { usernameOrEmail, password } = req.body || {};
  if (!usernameOrEmail || !password) return res.status(400).json({ error: 'Missing credentials' });
  const user = db.prepare('SELECT * FROM users WHERE username = ? OR email = ?').get(usernameOrEmail, usernameOrEmail);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
  const token = signToken(user);
  res.json({ token, user: userPublic(user) });
});

app.get('/api/me', authMiddleware, (req, res) => {
  const user = getUser(req.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user: userPublic(user) });
});

app.patch('/api/me', authMiddleware, (req, res) => {
  const { avatar, username } = req.body || {};
  const user = getUser(req.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (username && username !== user.username) {
    const exists = db.prepare('SELECT 1 FROM users WHERE username = ? AND id != ?').get(username, user.id);
    if (exists) return res.status(400).json({ error: 'Username taken' });
  }
  db.prepare('UPDATE users SET avatar = COALESCE(?, avatar), username = COALESCE(?, username) WHERE id = ?')
    .run(avatar ?? null, username ?? null, user.id);
  res.json({ user: userPublic(getUser(user.id)) });
});

// ---------- Goals & tree generation ----------

app.post('/api/goals', authMiddleware, async (req, res) => {
  const { title, description, experienceLevel, hoursPerWeek, focusAreas } = req.body || {};
  if (!title || title.trim().length < 3) return res.status(400).json({ error: 'title is required' });
  const id = nanoid(12);
  db.prepare(`INSERT INTO goals (id, user_id, title, description, experience_level, hours_per_week, focus_areas) VALUES (?, ?, ?, ?, ?, ?, ?)`)
    .run(id, req.userId, title.trim(), description || null, experienceLevel || null,
         hoursPerWeek ? Number(hoursPerWeek) : null, focusAreas || null);

  try {
    const tree = await generateSkillTree({ title, description, experienceLevel, hoursPerWeek, focusAreas });
    persistTree(id, tree);
  } catch (e) {
    console.error('Tree generation error:', e);
    return res.status(500).json({ error: 'Failed to generate skill tree' });
  }

  const goal = getGoalForUser(id, req.userId);
  res.json({ goal });
});

app.get('/api/goals', authMiddleware, (req, res) => {
  const goals = db.prepare(`
    SELECT g.*,
      (SELECT COUNT(*) FROM skill_nodes WHERE goal_id = g.id) AS total_nodes,
      (SELECT COUNT(*) FROM skill_nodes WHERE goal_id = g.id AND status = 'completed') AS completed_nodes
    FROM goals g WHERE g.user_id = ?
    ORDER BY g.created_at DESC
  `).all(req.userId);
  res.json({ goals });
});

app.get('/api/goals/:id', authMiddleware, (req, res) => {
  const goal = getGoalForUser(req.params.id, req.userId);
  if (!goal) return res.status(404).json({ error: 'Not found' });
  const { nodes, edges } = loadTree(goal.id);
  const parsedNodes = nodes.map(n => ({
    ...n,
    tags: safeParseJson(n.tags) || [],
    is_hidden: !!n.is_hidden,
    proof_required: !!n.proof_required,
  }));
  const formattedEdges = edges.map(e => ({ id: e.id, source: e.source_id, target: e.target_id }));
  res.json({
    goal,
    nodes: parsedNodes,
    edges: formattedEdges,
  });
});

app.delete('/api/goals/:id', authMiddleware, (req, res) => {
  const goal = getGoalForUser(req.params.id, req.userId);
  if (!goal) return res.status(404).json({ error: 'Not found' });
  db.prepare('DELETE FROM goals WHERE id = ?').run(goal.id);
  res.json({ ok: true });
});

// ---------- Node actions ----------

app.post('/api/nodes/:id/complete', authMiddleware, (req, res) => {
  const node = db.prepare(`
    SELECT n.*, g.user_id AS goal_user FROM skill_nodes n
    JOIN goals g ON g.id = n.goal_id
    WHERE n.id = ?
  `).get(req.params.id);
  if (!node || node.goal_user !== req.userId) return res.status(404).json({ error: 'Not found' });
  if (node.status === 'completed') return res.status(400).json({ error: 'Already completed' });
  if (node.status === 'locked') return res.status(400).json({ error: 'Node is locked' });

  const { journalEntry, proofUrl } = req.body || {};
  const completedAt = new Date().toISOString();
  db.prepare("UPDATE skill_nodes SET status = 'completed', completed_at = ? WHERE id = ?").run(completedAt, node.id);
  db.prepare('UPDATE users SET xp = xp + ? WHERE id = ?').run(node.xp_reward, req.userId);
  bumpStreak(req.userId);

  if (journalEntry || proofUrl) {
    db.prepare('INSERT INTO journal_entries (id, user_id, node_id, content, proof_url) VALUES (?, ?, ?, ?, ?)')
      .run(nanoid(12), req.userId, node.id, journalEntry || '', proofUrl || null);
  }

  recomputeAvailability(node.goal_id);

  const updatedNode = db.prepare('SELECT * FROM skill_nodes WHERE id = ?').get(node.id);
  const user = getUser(req.userId);
  res.json({
    node: { ...updatedNode, tags: safeParseJson(updatedNode.tags) || [], is_hidden: !!updatedNode.is_hidden, proof_required: !!updatedNode.proof_required },
    user: userPublic(user),
    xpGained: node.xp_reward,
  });
});

app.post('/api/nodes/:id/uncomplete', authMiddleware, (req, res) => {
  // For testing / undo
  const node = db.prepare(`
    SELECT n.*, g.user_id AS goal_user FROM skill_nodes n
    JOIN goals g ON g.id = n.goal_id
    WHERE n.id = ?
  `).get(req.params.id);
  if (!node || node.goal_user !== req.userId) return res.status(404).json({ error: 'Not found' });
  if (node.status !== 'completed') return res.status(400).json({ error: 'Not completed' });
  db.prepare("UPDATE skill_nodes SET status = 'available', completed_at = NULL WHERE id = ?").run(node.id);
  db.prepare('UPDATE users SET xp = MAX(0, xp - ?) WHERE id = ?').run(node.xp_reward, req.userId);
  recomputeAvailability(node.goal_id);
  res.json({ ok: true, user: userPublic(getUser(req.userId)) });
});

app.get('/api/nodes/:id/journal', authMiddleware, (req, res) => {
  const entries = db.prepare(`
    SELECT j.* FROM journal_entries j
    JOIN skill_nodes n ON n.id = j.node_id
    JOIN goals g ON g.id = n.goal_id
    WHERE j.node_id = ? AND g.user_id = ?
    ORDER BY j.created_at DESC
  `).all(req.params.id, req.userId);
  res.json({ entries });
});

// ---------- Adaptive evolution ----------

app.post('/api/goals/:id/evolve', authMiddleware, async (req, res) => {
  const goal = getGoalForUser(req.params.id, req.userId);
  if (!goal) return res.status(404).json({ error: 'Not found' });

  const { nodes, edges } = loadTree(goal.id);
  const parsedNodes = nodes.map(n => ({ ...n, tags: safeParseJson(n.tags) || [] }));
  const completed = parsedNodes.filter(n => n.status === 'completed');

  if (completed.length < 2) {
    return res.status(400).json({ error: 'Complete at least 2 nodes before evolving the tree.' });
  }

  // Detect focus tags (case-insensitive dedupe)
  const tagCounts = {};
  const tagDisplay = {};
  function bump(rawTag) {
    if (!rawTag) return;
    const k = rawTag.toLowerCase();
    tagCounts[k] = (tagCounts[k] || 0) + 1;
    if (!tagDisplay[k]) tagDisplay[k] = rawTag;
  }
  for (const n of completed) {
    for (const t of n.tags || []) bump(t);
    bump(n.branch);
  }
  const focusTags = Object.entries(tagCounts)
    .filter(([k]) => k && k !== 'root' && k !== 'branch-root')
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5).map(([k]) => tagDisplay[k]);

  const existingIds = new Set(parsedNodes.map(n => n.id));
  let evolution;
  try {
    evolution = await evolveSkillTree({
      goal,
      existingNodes: parsedNodes,
      completedNodes: completed,
      focusTags,
    });
  } catch (e) {
    console.error('Evolve error:', e);
    return res.status(500).json({ error: 'Failed to evolve tree' });
  }

  if (!evolution.nodes.length) {
    return res.json({ added: 0, focusTags });
  }

  // Position new nodes relative to their anchors, without disturbing existing positions.
  const existingById = new Map(parsedNodes.map(n => [n.id, n]));
  const TIER_GAP = 170;
  const SIBLING_GAP = 220;
  // Group new nodes by anchor (first prereq that exists)
  const newByAnchor = new Map();
  for (const n of evolution.nodes) {
    const anchorId = n.prerequisites?.find(p => existingById.has(p)) || parsedNodes[0]?.id;
    if (!newByAnchor.has(anchorId)) newByAnchor.set(anchorId, []);
    newByAnchor.get(anchorId).push(n);
  }
  for (const [anchorId, list] of newByAnchor.entries()) {
    const anchor = existingById.get(anchorId);
    const baseX = anchor?.position_x ?? 0;
    const baseY = anchor?.position_y ?? 0;
    list.forEach((n, idx) => {
      const offset = (idx - (list.length - 1) / 2) * SIBLING_GAP * 0.5;
      n.position_x = baseX + offset;
      n.position_y = baseY + TIER_GAP * (1 + Math.floor(idx / 3));
    });
  }

  persistTree(goal.id, { nodes: evolution.nodes, edges: evolution.edges }, { existingIds, skipLayout: true });

  res.json({
    added: evolution.nodes.length,
    newNodeIds: evolution.nodes.map(n => n.id),
    focusTags,
  });
});

// ---------- Dashboard ----------

app.get('/api/dashboard', authMiddleware, (req, res) => {
  const user = getUser(req.userId);
  const goals = db.prepare(`
    SELECT g.*,
      (SELECT COUNT(*) FROM skill_nodes WHERE goal_id = g.id) AS total_nodes,
      (SELECT COUNT(*) FROM skill_nodes WHERE goal_id = g.id AND status = 'completed') AS completed_nodes
    FROM goals g WHERE g.user_id = ?
    ORDER BY g.created_at DESC
  `).all(req.userId);

  const recentNodes = db.prepare(`
    SELECT n.id, n.title, n.branch, n.xp_reward, n.completed_at, n.rarity, g.title AS goal_title, g.id AS goal_id
    FROM skill_nodes n
    JOIN goals g ON g.id = n.goal_id
    WHERE g.user_id = ? AND n.status = 'completed'
    ORDER BY n.completed_at DESC
    LIMIT 10
  `).all(req.userId);

  const totalCompleted = db.prepare(`
    SELECT COUNT(*) AS c FROM skill_nodes n
    JOIN goals g ON g.id = n.goal_id
    WHERE g.user_id = ? AND n.status = 'completed'
  `).get(req.userId).c;

  res.json({
    user: userPublic(user),
    goals,
    recentNodes,
    totalCompleted,
  });
});

// ---------- Util ----------

function safeParseJson(s) {
  if (!s) return null;
  try { return JSON.parse(s); } catch { return null; }
}

// ---------- Static client (production build) ----------

const clientDist = path.resolve(__dirname, '..', '..', 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get(/^\/(?!api).*/, (req, res) => res.sendFile(path.join(clientDist, 'index.html')));
}

// ---------- Health ----------

app.get('/api/health', (req, res) => {
  res.json({ ok: true, ai: !!process.env.OPENAI_API_KEY });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Ascend server listening on http://localhost:${PORT}`);
  console.log(`AI mode: ${process.env.OPENAI_API_KEY ? 'OpenAI' : 'Heuristic (offline)'}`);
});
