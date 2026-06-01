import {
  Activity,
  BrainCircuit,
  Flame,
  Gauge,
  LogOut,
  Plus,
  Rocket,
  ShieldCheck,
  Trophy,
} from 'lucide-react';
import { useEffect, useMemo, useState, type CSSProperties, type FormEvent, type ReactNode } from 'react';
import { api, loadSession, saveSession, type Session } from './api.js';
import { NodeQuestModal } from './components/NodeQuestModal.js';
import { SkillTreeCanvas } from './components/SkillTreeCanvas.js';
import type { DashboardPayload, GoalInput, SkillNode, SkillTree } from './shared/types.js';

const starterGoal: GoalInput = {
  title: 'I want to get stronger with calisthenics',
  experienceLevel: 'Beginner',
  weeklyHours: 5,
  interests: 'pushups, dips, pullups, handstands',
};

const blankGoal: GoalInput = {
  title: '',
  experienceLevel: 'Beginner',
  weeklyHours: 4,
  interests: '',
};

function App() {
  const [session, setSession] = useState<Session | null>(() => loadSession());
  const [dashboard, setDashboard] = useState<DashboardPayload | null>(null);
  const [activeGoalId, setActiveGoalId] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | undefined>();
  const [questNodeId, setQuestNodeId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [isBusy, setIsBusy] = useState(false);

  const activeGoal = dashboard?.goals.find((goal) => goal.id === activeGoalId) ?? dashboard?.goals[0] ?? null;
  const selectedNode = activeGoal?.nodes.find((node) => node.id === selectedNodeId) ?? activeGoal?.nodes[0] ?? null;
  const questNode = activeGoal?.nodes.find((node) => node.id === questNodeId) ?? null;

  useEffect(() => {
    if (!session) return;
    void refreshDashboard(session.token);
  }, [session]);

  useEffect(() => {
    if (dashboard?.goals.length && !activeGoalId) {
      setActiveGoalId(dashboard.goals[0].id);
      setSelectedNodeId(dashboard.goals[0].nodes[0]?.id);
    }
  }, [activeGoalId, dashboard]);

  async function refreshDashboard(token = session?.token) {
    if (!token) return;
    const payload = await api.dashboard(token);
    setDashboard(payload);
  }

  function applyTree(tree: SkillTree, nextSelectedNodeId?: string) {
    setDashboard((current) => {
      if (!current) return current;
      const goals = current.goals.some((goal) => goal.id === tree.id)
        ? current.goals.map((goal) => (goal.id === tree.id ? tree : goal))
        : [tree, ...current.goals];
      return {
        ...current,
        goals,
        summaries: goals.map((goal) => ({
          id: goal.id,
          rootGoal: goal.rootGoal,
          totalXp: goal.totalXp,
          level: goal.level,
          streak: goal.streak,
          updatedAt: goal.updatedAt,
          completedNodes: goal.nodes.filter((node) => node.status === 'complete').length,
          totalNodes: goal.nodes.length,
        })),
      };
    });
    setActiveGoalId(tree.id);
    setSelectedNodeId(nextSelectedNodeId ?? tree.nodes.find((node) => node.status === 'unlocked')?.id ?? tree.nodes[0]?.id);
  }

  async function runAction(action: () => Promise<void>) {
    setError('');
    setIsBusy(true);
    try {
      await action();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Something went wrong.');
    } finally {
      setIsBusy(false);
    }
  }

  function logout() {
    saveSession(null);
    setSession(null);
    setDashboard(null);
    setActiveGoalId(null);
  }

  if (!session) {
    return <AuthScreen onSession={setSession} runAction={runAction} error={error} isBusy={isBusy} />;
  }

  return (
    <main className="app-shell" style={activeGoal?.palette ? getTreePaletteStyle(activeGoal) : undefined}>
      <header className="hero">
        <div>
          <p className="eyebrow">Ascend adaptive skill tree</p>
          <h1>Build your character, one quest node at a time.</h1>
          <p>
            Generate RPG-style progression paths, complete proof-backed nodes, and let the tree evolve toward the
            skills you actually practice.
          </p>
        </div>
        <div className="hero-card">
          <span className="avatar">{session.user.avatar}</span>
          <strong>{session.user.username}</strong>
          <button className="ghost-button" type="button" onClick={logout}>
            <LogOut size={16} /> Log out
          </button>
        </div>
      </header>

      {error && <div className="error-banner">{error}</div>}

      <section className="layout-grid">
        <aside className="sidebar">
          <GoalCreator
            disabled={isBusy}
            onCreate={(input) =>
              runAction(async () => {
                const tree = await api.createGoal(session.token, input);
                applyTree(tree);
              })
            }
          />
          <GoalList
            goals={dashboard?.goals ?? []}
            activeGoalId={activeGoal?.id}
            onSelect={(goal) => {
              setActiveGoalId(goal.id);
              setSelectedNodeId(goal.nodes[0]?.id);
            }}
          />
        </aside>

        <section className="main-panel">
          {activeGoal ? (
            <>
              <DashboardStats tree={activeGoal} />
              <SkillTreeCanvas
                tree={activeGoal}
                selectedNodeId={selectedNode?.id}
                onSelectNode={(node) => setSelectedNodeId(node.id)}
                onOpenNode={(node) => {
                  setSelectedNodeId(node.id);
                  setQuestNodeId(node.id);
                }}
              />
            </>
          ) : (
            <EmptyState
              onUseStarter={() =>
                runAction(async () => {
                  const tree = await api.createGoal(session.token, starterGoal);
                  applyTree(tree);
                })
              }
            />
          )}
        </section>
      </section>

      {activeGoal && questNode && (
        <NodeQuestModal
          tree={activeGoal}
          node={questNode}
          disabled={isBusy}
          onClose={() => setQuestNodeId(null)}
          onFinish={async ({ nodeId, note, focusTags, proofUrl, growBranch, signals }) => {
            await runAction(async () => {
              let tree = activeGoal;
              if (questNode.status === 'unlocked') {
                tree = await api.completeNode(session.token, activeGoal.id, {
                  nodeId,
                  note,
                  focusTags,
                  proofUrl,
                });
                applyTree(tree);
              }

              if (growBranch) {
                const previousIds = new Set(tree.nodes.map((candidate) => candidate.id));
                tree = await api.expandGoal(session.token, activeGoal.id, nodeId, signals);
                const newNode = tree.nodes.find((candidate) => !previousIds.has(candidate.id));
                applyTree(tree, newNode?.id);
              }
            });
          }}
        />
      )}
    </main>
  );
}

function AuthScreen({
  onSession,
  runAction,
  error,
  isBusy,
}: {
  onSession: (session: Session) => void;
  runAction: (action: () => Promise<void>) => Promise<void>;
  error: string;
  isBusy: boolean;
}) {
  const [mode, setMode] = useState<'signup' | 'login'>('signup');
  const [username, setUsername] = useState('pathfinder');
  const [password, setPassword] = useState('ascend-demo');
  const [avatar, setAvatar] = useState('A');

  function submit(event: FormEvent) {
    event.preventDefault();
    void runAction(async () => {
      const session =
        mode === 'signup'
          ? await api.signup({ username, password, avatar })
          : await api.login({ username, password });
      saveSession(session);
      onSession(session);
    });
  }

  return (
    <main className="auth-screen">
      <section className="auth-copy">
        <p className="eyebrow">Ascend MVP</p>
        <h1>Personal growth as an explorable skill graph.</h1>
        <p>
          Sign up, describe a goal, and Ascend generates unlockable paths with XP, milestones, proof prompts, and
          adaptive future branches.
        </p>
        <div className="feature-row">
          <span>AI-style planning</span>
          <span>React Flow tree</span>
          <span>XP progression</span>
        </div>
      </section>
      <form className="auth-card" onSubmit={submit}>
        <div className="tab-row">
          <button type="button" className={mode === 'signup' ? 'active' : ''} onClick={() => setMode('signup')}>
            Sign up
          </button>
          <button type="button" className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>
            Log in
          </button>
        </div>
        <label>
          Username
          <input value={username} onChange={(event) => setUsername(event.target.value)} />
        </label>
        <label>
          Password
          <input value={password} minLength={8} type="password" onChange={(event) => setPassword(event.target.value)} />
        </label>
        {mode === 'signup' && (
          <label>
            Avatar initials
            <input value={avatar} maxLength={3} onChange={(event) => setAvatar(event.target.value.toUpperCase())} />
          </label>
        )}
        {error && <div className="error-banner">{error}</div>}
        <button className="primary-button" disabled={isBusy} type="submit">
          {isBusy ? 'Working...' : mode === 'signup' ? 'Create character' : 'Enter Ascend'}
        </button>
      </form>
    </main>
  );
}

function GoalCreator({ onCreate, disabled }: { onCreate: (input: GoalInput) => void; disabled: boolean }) {
  const [input, setInput] = useState<GoalInput>(blankGoal);

  function submit(event: FormEvent) {
    event.preventDefault();
    onCreate(input);
  }

  return (
    <form className="panel stack" onSubmit={submit}>
      <div className="panel-title">
        <BrainCircuit size={18} />
        Generate tree
      </div>
      <label>
        Main goal
        <textarea
          required
          value={input.title}
          placeholder="Describe anything you want to grow into: start a garden, gain social skills, ask someone out, work out, learn chess, become your best self..."
          onChange={(event) => setInput({ ...input, title: event.target.value })}
        />
      </label>
      <label>
        Experience level
        <input
          value={input.experienceLevel}
          onChange={(event) => setInput({ ...input, experienceLevel: event.target.value })}
        />
      </label>
      <label>
        Hours per week
        <input
          type="number"
          min={1}
          max={80}
          value={input.weeklyHours}
          onChange={(event) => setInput({ ...input, weeklyHours: Number(event.target.value) })}
        />
      </label>
      <label>
        Optional context
        <input
          value={input.interests}
          placeholder="Optional: constraints, style, fears, interests, or examples"
          onChange={(event) => setInput({ ...input, interests: event.target.value })}
        />
      </label>
      <button className="primary-button" disabled={disabled} type="submit">
        <Plus size={16} /> Generate
      </button>
    </form>
  );
}

function GoalList({
  goals,
  activeGoalId,
  onSelect,
}: {
  goals: SkillTree[];
  activeGoalId?: string;
  onSelect: (goal: SkillTree) => void;
}) {
  return (
    <div className="panel stack">
      <div className="panel-title">
        <Rocket size={18} />
        Active goals
      </div>
      {goals.length === 0 ? (
        <p className="muted">No trees yet. Generate your first quest path.</p>
      ) : (
        goals.map((goal) => (
          <button
            className={`goal-row ${goal.id === activeGoalId ? 'active' : ''}`}
            key={goal.id}
            type="button"
            onClick={() => onSelect(goal)}
          >
            <strong>{goal.rootGoal}</strong>
            <span>
              Level {goal.level} - {goal.totalXp} XP
            </span>
          </button>
        ))
      )}
    </div>
  );
}

function DashboardStats({ tree }: { tree: SkillTree }) {
  const completed = tree.nodes.filter((node) => node.status === 'complete').length;
  const unlocked = tree.nodes.filter((node) => node.status === 'unlocked').length;
  const nextLevelXp = tree.level * 250;
  const progress = Math.min(100, Math.round((tree.totalXp / nextLevelXp) * 100));

  return (
    <div className="stats-grid">
      <Metric icon={<Gauge />} label="Level" value={tree.level} />
      <Metric icon={<Trophy />} label="XP" value={`${tree.totalXp}/${nextLevelXp}`} />
      <Metric icon={<Flame />} label="Streak" value={tree.streak} />
      <Metric icon={<ShieldCheck />} label="Unlocked" value={unlocked} />
      <Metric icon={<BrainCircuit />} label="Palette" value={tree.palette?.name ?? 'Ascend'} />
      <div className="progress-card">
        <span>Next level</span>
        <div className="progress-track">
          <div style={{ width: `${progress}%` }} />
        </div>
        <small>
          {completed}/{tree.nodes.length} nodes complete
        </small>
      </div>
    </div>
  );
}

function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: string | number }) {
  return (
    <div className="metric-card">
      {icon}
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function EmptyState({ onUseStarter }: { onUseStarter: () => void }) {
  return (
    <div className="empty-state">
      <Activity size={48} />
      <h2>No skill tree yet</h2>
      <p>Create a custom goal or launch the starter calisthenics path to see Ascend generate your first tree.</p>
      <button className="primary-button" type="button" onClick={onUseStarter}>
        Generate starter path
      </button>
    </div>
  );
}

function getTreePaletteStyle(tree: SkillTree): CSSProperties {
  const palette = tree.palette;
  if (!palette) return {};
  return {
    '--tree-primary': palette.primary,
    '--tree-secondary': palette.secondary,
    '--tree-accent': palette.accent,
    '--tree-background': palette.background,
    '--tree-surface': palette.surface,
    '--tree-text': palette.text,
  } as CSSProperties;
}

export default App;
