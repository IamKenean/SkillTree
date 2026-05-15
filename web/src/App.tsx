import { FormEvent, useEffect, useMemo, useState } from "react";
import { ApiError, createApiClient } from "./api";
import { SkillTreeView } from "./components/SkillTreeView";
import { DashboardResponse, GoalSummary, SkillNode } from "./types";

type AuthMode = "login" | "signup";

const tokenKey = "ascend_token";

const defaultGoalForm = {
  mainGoal: "",
  experienceLevel: "beginner" as const,
  timePerWeek: 5,
  interestsText: "",
};

const xpToNextLevel = (level: number, totalXp: number) => {
  const nextLevelXp = level * 500;
  const floorXp = (level - 1) * 500;
  const currentBand = totalXp - floorXp;
  const bandSize = nextLevelXp - floorXp;
  return {
    pct: Math.max(0, Math.min(100, Math.round((currentBand / bandSize) * 100))),
    remaining: Math.max(0, nextLevelXp - totalXp),
  };
};

function App() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(tokenKey));
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [authError, setAuthError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [goalForm, setGoalForm] = useState(defaultGoalForm);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [treeNodes, setTreeNodes] = useState<SkillNode[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [treeError, setTreeError] = useState<string | null>(null);
  const [proofUrl, setProofUrl] = useState("");
  const [journalEntry, setJournalEntry] = useState("");
  const [tagsText, setTagsText] = useState("");
  const [systemMessage, setSystemMessage] = useState<string | null>(null);

  const api = useMemo(() => createApiClient(token), [token]);
  const selectedGoal = dashboard?.goals.find((goal) => goal.id === selectedGoalId) ?? null;
  const selectedNode = treeNodes.find((node) => node.id === selectedNodeId) ?? null;

  const refreshDashboard = async () => {
    if (!token) {
      return;
    }
    const data = await api.dashboard();
    setDashboard(data);
    if (!selectedGoalId && data.goals[0]) {
      setSelectedGoalId(data.goals[0].id);
    }
  };

  const loadGoalTree = async (goalId: string) => {
    setTreeError(null);
    try {
      const data = await api.getGoalTree(goalId);
      setTreeNodes(data.nodes);
      if (!data.nodes.find((node) => node.id === selectedNodeId)) {
        setSelectedNodeId(data.nodes[0]?.id ?? null);
      }
    } catch (error) {
      setTreeNodes([]);
      setTreeError(error instanceof Error ? error.message : "Could not load goal tree");
    }
  };

  useEffect(() => {
    if (!token) {
      return;
    }
    refreshDashboard().catch((error) => {
      const fallback = error instanceof Error ? error.message : "Failed to load dashboard";
      setSystemMessage(fallback);
    });
  }, [token]);

  useEffect(() => {
    if (!selectedGoalId) {
      return;
    }
    loadGoalTree(selectedGoalId).catch((error) => {
      setTreeError(error instanceof Error ? error.message : "Could not load tree");
    });
  }, [selectedGoalId]);

  const handleAuth = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setAuthError(null);
    const form = new FormData(event.currentTarget);
    try {
      const email = String(form.get("email") ?? "");
      const password = String(form.get("password") ?? "");
      const username = String(form.get("username") ?? "");
      const avatarUrl = String(form.get("avatarUrl") ?? "");

      const response =
        authMode === "signup"
          ? await api.signup({
              email,
              password,
              username,
              avatarUrl: avatarUrl || undefined,
            })
          : await api.login({ email, password });

      setToken(response.token);
      localStorage.setItem(tokenKey, response.token);
      setSystemMessage(null);
      setGoalForm(defaultGoalForm);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGoal = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSystemMessage(null);
    setLoading(true);
    try {
      const interests = goalForm.interestsText
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);
      const response = await api.createGoal({
        mainGoal: goalForm.mainGoal,
        experienceLevel: goalForm.experienceLevel,
        timePerWeek: Number(goalForm.timePerWeek),
        interests,
      });
      setGoalForm(defaultGoalForm);
      await refreshDashboard();
      setSelectedGoalId(response.goal.id);
      setTreeNodes(response.nodes);
      setSelectedNodeId(response.nodes[0]?.id ?? null);
      setSystemMessage("New skill tree generated.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Goal generation failed";
      setSystemMessage(message);
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteNode = async () => {
    if (!selectedGoalId || !selectedNode || selectedNode.status !== "unlocked") {
      return;
    }
    setLoading(true);
    setSystemMessage(null);
    try {
      const tags = tagsText
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);

      const response = await api.completeNode(selectedGoalId, selectedNode.id, {
        journalEntry: journalEntry || undefined,
        proofUrl: proofUrl || undefined,
        tags,
      });
      setTreeNodes(response.nodes);
      setSelectedNodeId(response.completedNode.id);
      setJournalEntry("");
      setProofUrl("");
      setTagsText("");
      await refreshDashboard();
      if (response.newlyAddedNodes.length > 0) {
        setSystemMessage(
          `Tree evolved: unlocked ${response.newlyAddedNodes
            .map((node) => node.title)
            .join(", ")}.`,
        );
      } else {
        setSystemMessage("Node completed and XP awarded.");
      }
    } catch (error) {
      const message = error instanceof ApiError ? error.message : "Could not complete node";
      setSystemMessage(message);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setToken(null);
    setDashboard(null);
    setTreeNodes([]);
    setSelectedGoalId(null);
    setSelectedNodeId(null);
    setSystemMessage(null);
    localStorage.removeItem(tokenKey);
  };

  if (!token) {
    return (
      <main className="auth-layout">
        <section className="auth-card">
          <h1>Ascend</h1>
          <p className="subtle">
            Build your character with AI-generated skill trees that evolve with your real effort.
          </p>
          <div className="pill-row">
            <button
              className={authMode === "login" ? "pill active" : "pill"}
              type="button"
              onClick={() => setAuthMode("login")}
            >
              Log in
            </button>
            <button
              className={authMode === "signup" ? "pill active" : "pill"}
              type="button"
              onClick={() => setAuthMode("signup")}
            >
              Sign up
            </button>
          </div>
          <form onSubmit={handleAuth} className="stack">
            {authMode === "signup" && (
              <>
                <label>
                  Username
                  <input name="username" placeholder="SkillRanger" minLength={3} required />
                </label>
                <label>
                  Avatar URL (optional)
                  <input name="avatarUrl" placeholder="https://example.com/avatar.png" />
                </label>
              </>
            )}
            <label>
              Email
              <input type="email" name="email" placeholder="you@example.com" required />
            </label>
            <label>
              Password
              <input type="password" name="password" minLength={8} required />
            </label>
            <button type="submit" disabled={loading}>
              {loading ? "Processing..." : authMode === "signup" ? "Create account" : "Enter Ascend"}
            </button>
          </form>
          {authError && <p className="error">{authError}</p>}
        </section>
      </main>
    );
  }

  const levelStats = dashboard ? xpToNextLevel(dashboard.user.level, dashboard.user.totalXp) : null;

  return (
    <main className="app-layout">
      <header className="topbar">
        <div>
          <p className="eyebrow">ASCEND // Adaptive Skill Tree</p>
          <h2>{dashboard?.user.username ?? "Loading..."}</h2>
        </div>
        <div className="badge-row">
          <span className="badge">Level {dashboard?.user.level ?? 1}</span>
          <span className="badge">{dashboard?.user.totalXp ?? 0} XP</span>
          <span className="badge">Streak {dashboard?.user.streak ?? 0}</span>
          <button type="button" className="ghost" onClick={logout}>
            Log out
          </button>
        </div>
      </header>

      <section className="overview-grid">
        <article className="panel">
          <h3>Character Progress</h3>
          <p className="subtle">Build momentum through visible progression, not checklist fatigue.</p>
          <div className="progress-wrap">
            <div className="progress-bar">
              <div style={{ width: `${levelStats?.pct ?? 0}%` }} />
            </div>
            <small>
              {levelStats?.remaining ?? 0} XP to level {(dashboard?.user.level ?? 1) + 1}
            </small>
          </div>
          <div className="stats-grid">
            <div>
              <strong>{dashboard?.overview.goals ?? 0}</strong>
              <span>Active goals</span>
            </div>
            <div>
              <strong>{dashboard?.overview.completedNodes ?? 0}</strong>
              <span>Skills completed</span>
            </div>
            <div>
              <strong>{dashboard?.overview.completionRate ?? 0}%</strong>
              <span>Completion</span>
            </div>
          </div>
        </article>

        <article className="panel">
          <h3>Create Goal</h3>
          <form className="stack compact" onSubmit={handleCreateGoal}>
            <label>
              Main goal
              <textarea
                value={goalForm.mainGoal}
                onChange={(event) =>
                  setGoalForm((prev) => ({ ...prev, mainGoal: event.target.value }))
                }
                placeholder="I want to improve at coding and eventually learn machine learning."
                required
              />
            </label>
            <div className="row">
              <label>
                Level
                <select
                  value={goalForm.experienceLevel}
                  onChange={(event) =>
                    setGoalForm((prev) => ({
                      ...prev,
                      experienceLevel: event.target.value as GoalSummary["experienceLevel"],
                    }))
                  }
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </label>
              <label>
                Hours/week
                <input
                  type="number"
                  min={1}
                  max={80}
                  value={goalForm.timePerWeek}
                  onChange={(event) =>
                    setGoalForm((prev) => ({ ...prev, timePerWeek: Number(event.target.value) }))
                  }
                  required
                />
              </label>
            </div>
            <label>
              Focus areas (comma separated)
              <input
                value={goalForm.interestsText}
                onChange={(event) =>
                  setGoalForm((prev) => ({ ...prev, interestsText: event.target.value }))
                }
                placeholder="frontend, react, animation"
              />
            </label>
            <button type="submit" disabled={loading}>
              Generate AI Tree
            </button>
          </form>
        </article>
      </section>

      <section className="workspace-grid">
        <aside className="panel list-panel">
          <h3>Active Trees</h3>
          <div className="goal-list">
            {(dashboard?.goals ?? []).map((goal) => (
              <button
                key={goal.id}
                className={selectedGoalId === goal.id ? "goal-item active" : "goal-item"}
                type="button"
                onClick={() => setSelectedGoalId(goal.id)}
              >
                <strong>{goal.title}</strong>
                <span>
                  {goal.completedNodes}/{goal.totalNodes} completed
                </span>
              </button>
            ))}
            {dashboard?.goals.length === 0 && (
              <p className="subtle">Generate your first goal to unlock your first tree.</p>
            )}
          </div>
          <h3>Achievements</h3>
          <ul className="achievement-list">
            {(dashboard?.achievements ?? []).slice(0, 5).map((achievement) => (
              <li key={achievement.id}>
                <strong>{achievement.title}</strong>
                <span>{achievement.description}</span>
              </li>
            ))}
            {(dashboard?.achievements?.length ?? 0) === 0 && (
              <li>
                <strong>No achievements yet</strong>
                <span>Complete your first node to start your badge collection.</span>
              </li>
            )}
          </ul>
        </aside>

        <article className="panel tree-panel">
          <div className="tree-head">
            <div>
              <h3>{selectedGoal?.title ?? "Select a goal"}</h3>
              <p className="subtle">
                {selectedGoal
                  ? "Click any node to inspect requirements, XP, and completion actions."
                  : "No tree loaded."}
              </p>
            </div>
          </div>
          {treeError && <p className="error">{treeError}</p>}
          {!treeError && treeNodes.length > 0 && (
            <SkillTreeView
              nodes={treeNodes}
              selectedNodeId={selectedNodeId}
              onSelectNode={setSelectedNodeId}
            />
          )}
          {!treeError && treeNodes.length === 0 && (
            <div className="empty-state">No nodes yet. Create or select a goal first.</div>
          )}
        </article>

        <aside className="panel detail-panel">
          <h3>Node Details</h3>
          {selectedNode ? (
            <div className="stack">
              <div>
                <h4>{selectedNode.title}</h4>
                <p className="subtle">{selectedNode.description}</p>
              </div>
              <div className="meta-grid">
                <span>Difficulty: {selectedNode.difficulty}</span>
                <span>Reward: {selectedNode.xpReward} XP</span>
                <span>Est: {selectedNode.estimatedHours}h</span>
                <span>Status: {selectedNode.status}</span>
              </div>
              {selectedNode.proofRequirement && (
                <p className="subtle">Proof needed: {selectedNode.proofRequirement}</p>
              )}
              {selectedNode.status === "unlocked" && (
                <div className="stack compact">
                  <label>
                    Tags
                    <input
                      value={tagsText}
                      onChange={(event) => setTagsText(event.target.value)}
                      placeholder="pushups, dips, frontend"
                    />
                  </label>
                  <label>
                    Journal note
                    <textarea
                      value={journalEntry}
                      onChange={(event) => setJournalEntry(event.target.value)}
                      placeholder="What did you complete today?"
                    />
                  </label>
                  <label>
                    Proof URL (optional)
                    <input
                      value={proofUrl}
                      onChange={(event) => setProofUrl(event.target.value)}
                      placeholder="https://..."
                    />
                  </label>
                  <button type="button" onClick={handleCompleteNode} disabled={loading}>
                    Mark Complete + Gain XP
                  </button>
                </div>
              )}
              {selectedNode.status === "locked" && (
                <p className="subtle">Complete prerequisite nodes to unlock this branch.</p>
              )}
              {selectedNode.status === "completed" && (
                <p className="success">Completed. Keep pushing to trigger adaptive branches.</p>
              )}
            </div>
          ) : (
            <p className="subtle">Select a node to inspect and log progress.</p>
          )}
          {systemMessage && <p className="system-message">{systemMessage}</p>}
        </aside>
      </section>
    </main>
  );
}

export default App;
