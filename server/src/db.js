import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, 'ascend.sqlite'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  avatar TEXT,
  xp INTEGER NOT NULL DEFAULT 0,
  streak INTEGER NOT NULL DEFAULT 0,
  last_activity_date TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS goals (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  experience_level TEXT,
  hours_per_week INTEGER,
  focus_areas TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS skill_nodes (
  id TEXT PRIMARY KEY,
  goal_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  difficulty INTEGER NOT NULL DEFAULT 1,
  xp_reward INTEGER NOT NULL DEFAULT 50,
  est_minutes INTEGER NOT NULL DEFAULT 30,
  tags TEXT,
  branch TEXT,
  tier INTEGER NOT NULL DEFAULT 0,
  position_x REAL,
  position_y REAL,
  status TEXT NOT NULL DEFAULT 'locked', -- locked | available | completed
  completed_at TEXT,
  is_hidden INTEGER NOT NULL DEFAULT 0,
  proof_required INTEGER NOT NULL DEFAULT 0,
  rarity TEXT DEFAULT 'common', -- common | rare | epic | legendary
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS skill_edges (
  id TEXT PRIMARY KEY,
  goal_id TEXT NOT NULL,
  source_id TEXT NOT NULL,
  target_id TEXT NOT NULL,
  FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE CASCADE,
  FOREIGN KEY (source_id) REFERENCES skill_nodes(id) ON DELETE CASCADE,
  FOREIGN KEY (target_id) REFERENCES skill_nodes(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS journal_entries (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  node_id TEXT,
  content TEXT NOT NULL,
  proof_url TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (node_id) REFERENCES skill_nodes(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_nodes_goal ON skill_nodes(goal_id);
CREATE INDEX IF NOT EXISTS idx_edges_goal ON skill_edges(goal_id);
CREATE INDEX IF NOT EXISTS idx_goals_user ON goals(user_id);
CREATE INDEX IF NOT EXISTS idx_journal_user ON journal_entries(user_id);
`);

export default db;
