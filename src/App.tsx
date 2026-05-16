import {
  Activity,
  BrainCircuit,
  Flame,
  Gauge,
  LogOut,
  Medal,
  Plus,
  Rocket,
  ShieldCheck,
  Trophy,
} from 'lucide-react';
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { api, loadSession, saveSession, type Session } from './api.js';
import { SkillTreeCanvas } from './components/SkillTreeCanvas.js';
import type { DashboardPayload, GoalInput, SkillNode, SkillTree } from './shared/types.js';

const starterGoal: GoalInput = {
  title: 'I want to get stronger with calisthenics',
  experienceLevel: 'Beginner',
  weeklyHours: 5,
  interests: 'pushups, dips, pullups, handstands',
};

function App() {
  const [session, setSession] = useState<Session | null>(() => loadSession());
  const [dashboard, setDashboard] = useState<DashboardPayload | null>(null);
  const [activeGoalId, setActiveGoalId] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | undefined>();
  const [error, setError] = useState('');
  const [isBusy, setIsBusy] = useState(false);

  const activeGoal = dashboard?.goals.find((goal) => goal.id === activeGoalId) ?? dashboard?.goals[0] ?? null;
  const selectedNode = activeGoal?.nodes.find((node) => node.id === selectedNodeId) ?? activeGoal?.nodes[0] ?? null;

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
    <main className="app-shell">
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

        <aside className="detail-panel">
          {activeGoal && selectedNode ? (
            <NodeDetail
              tree={activeGoal}
              node={selectedNode}
              disabled={isBusy}
              onComplete={(body) =>
                runAction(async () => {
                  const tree = await api.completeNode(session.token, activeGoal.id, body);
                  applyTree(tree);
                })
              }
              onAdapt={(signals) =>
                runAction(async () => {
                  const tree = await api.adaptGoal(session.token, activeGoal.id, signals);
                  const evolutionNode = tree.nodes.find((candidate) => candidate.branch.includes('evolution'));
                  applyTree(tree, evolutionNode?.id);
                })
              }
            />
          ) : (
            <div className="panel muted-panel">Select or create a goal to inspect its skill nodes.</div>
          )}
        </aside>
      </section>
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
  const [input, setInput] = useState<GoalInput>(starterGoal);

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
        <textarea value={input.title} onChange={(event) => setInput({ ...input, title: event.target.value })} />
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
        Interests
        <input value={input.interests} onChange={(event) => setInput({ ...input, interests: event.target.value })} />
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

function NodeDetail({
  tree,
  node,
  onComplete,
  onAdapt,
  disabled,
}: {
  tree: SkillTree;
  node: SkillNode;
  disabled: boolean;
  onComplete: (body: { nodeId: string; note: string; focusTags: string[]; proofUrl?: string }) => void;
  onAdapt: (signals: string[]) => void;
}) {
  const [note, setNote] = useState('Finished a focused practice rep and logged what improved.');
  const [tags, setTags] = useState('pushups, dips, pullups');
  const [proofUrl, setProofUrl] = useState('');
  const [signals, setSignals] = useState('pushups, dips, pullups, handstands');

  const prerequisites = useMemo(
    () => node.prerequisites.map((id) => tree.nodes.find((candidate) => candidate.id === id)?.title ?? id),
    [node.prerequisites, tree.nodes],
  );
  const hiddenBranches = useMemo(
    () =>
      tree.nodes
        .filter((candidate) => candidate.hidden && candidate.unlockCondition)
        .filter((candidate) => candidate.branch === node.branch || candidate.prerequisites.includes(node.id))
        .slice(0, 3),
    [node.branch, node.id, tree.nodes],
  );

  return (
    <div className="panel stack node-detail">
      <div className="panel-title">
        <Medal size={18} />
        Node details
      </div>
      <span className={`status-pill ${node.status}`}>{node.status}</span>
      <h2>{node.title}</h2>
      <p>{node.description}</p>
      <dl className="node-meta">
        <div>
          <dt>Difficulty</dt>
          <dd>{node.difficulty}</dd>
        </div>
        <div>
          <dt>Reward</dt>
          <dd>{node.xp} XP</dd>
        </div>
        <div>
          <dt>Estimate</dt>
          <dd>{node.estimatedHours}h</dd>
        </div>
      </dl>
      <div className="identity-grid">
        {node.identity && (
          <div>
            <strong>Identity path</strong>
            <p>{node.identity}</p>
          </div>
        )}
        {node.tradeoff && (
          <div>
            <strong>Tradeoff</strong>
            <p>{node.tradeoff}</p>
          </div>
        )}
      </div>
      <div>
        <strong>Prerequisites</strong>
        <p className="muted">{prerequisites.length ? prerequisites.join(', ') : 'None'}</p>
      </div>
      {node.unlockCondition && (
        <div className="proof-box hidden-rule">
          <strong>Hidden unlock logic</strong>
          <p>{node.unlockCondition}</p>
        </div>
      )}
      {hiddenBranches.length > 0 && (
        <div className="proof-box hidden-rule">
          <strong>Hidden future branches</strong>
          {hiddenBranches.map((branch) => (
            <p key={branch.id}>
              {branch.title}: {branch.unlockCondition}
            </p>
          ))}
        </div>
      )}
      {node.proof && (
        <div className="proof-box">
          <strong>Proof prompt</strong>
          <p>{node.proof.prompt}</p>
        </div>
      )}

      {node.status === 'unlocked' && (
        <form
          className="stack"
          onSubmit={(event) => {
            event.preventDefault();
            onComplete({
              nodeId: node.id,
              note,
              focusTags: tags.split(',').map((tag) => tag.trim()),
              proofUrl: proofUrl || undefined,
            });
          }}
        >
          <label>
            Journal entry
            <textarea value={note} onChange={(event) => setNote(event.target.value)} />
          </label>
          <label>
            Focus tags
            <input value={tags} onChange={(event) => setTags(event.target.value)} />
          </label>
          <label>
            Proof URL
            <input placeholder="https://..." value={proofUrl} onChange={(event) => setProofUrl(event.target.value)} />
          </label>
          <button className="primary-button" disabled={disabled} type="submit">
            Complete node
          </button>
        </form>
      )}

      <div className="adapt-box">
        <strong>Adaptive evolution</strong>
        <p className="muted">Add repeated signals and Ascend creates a new specialization branch.</p>
        <input value={signals} onChange={(event) => setSignals(event.target.value)} />
        <button
          className="secondary-button"
          disabled={disabled}
          type="button"
          onClick={() => onAdapt(signals.split(',').map((signal) => signal.trim()))}
        >
          Evolve tree
        </button>
      </div>

      {tree.achievements.length > 0 && (
        <div className="achievement-list">
          <strong>Achievements</strong>
          {tree.achievements.map((achievement) => (
            <span key={achievement.id}>{achievement.title}</span>
          ))}
        </div>
      )}
    </div>
  );
}

export default App;
