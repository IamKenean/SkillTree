"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { SkillTreeCanvas } from "@/components/skill-tree/SkillTreeCanvas";
import type { SkillTreeSnapshot } from "@/lib/skill-tree-types";

type GoalPayload = {
  id: string;
  title: string;
  summary: string;
  tree: SkillTreeSnapshot;
  completions: Array<{ nodeId: string; journal: string; proofUrl: string }>;
};

export default function GoalDetail({ goalId }: { goalId: string }) {
  const [goal, setGoal] = useState<GoalPayload | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [journal, setJournal] = useState("");
  const [proofUrl, setProofUrl] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/goals/${goalId}`);
    if (!res.ok) {
      setGoal(null);
      setLoading(false);
      return;
    }
    const data = await res.json();
    setGoal(data.goal);
    setLoading(false);
  }, [goalId]);

  useEffect(() => {
    void load();
  }, [load]);

  const selectedNode = goal?.tree.nodes.find((n) => n.id === selectedId);
  const completedSet = new Set(goal?.completions.map((c) => c.nodeId) ?? []);
  const isCompleted = selectedId ? completedSet.has(selectedId) : false;

  async function completeNode() {
    if (!selectedId || !goal) return;
    setActionLoading(true);
    setToast(null);
    const res = await fetch(`/api/goals/${goalId}/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nodeId: selectedId, journal, proofUrl }),
    });
    const data = await res.json().catch(() => ({}));
    setActionLoading(false);
    if (!res.ok) {
      setToast(data.error || "Could not complete");
      return;
    }
    setToast(`+${data.xpGained} XP · Level ${data.level} · ${data.streakDays}d streak`);
    setJournal("");
    setProofUrl("");
    await load();
  }

  async function evolveTree() {
    setActionLoading(true);
    setToast(null);
    const res = await fetch(`/api/goals/${goalId}/evolve`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setActionLoading(false);
    if (!res.ok) {
      setToast(data.error || "Evolve failed");
      return;
    }
    setToast(data.coachNote || "Tree evolved.");
    await load();
  }

  if (loading) {
    return <p className="text-slate-500">Loading skill tree…</p>;
  }
  if (!goal) {
    return (
      <p>
        Goal not found.{" "}
        <Link href="/dashboard" className="text-cyan-400">
          Back
        </Link>
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/dashboard" className="text-xs font-medium uppercase tracking-wider text-slate-500 hover:text-cyan-400">
            ← Dashboard
          </Link>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">{goal.title}</h1>
          {goal.summary && <p className="mt-2 max-w-2xl text-slate-400">{goal.summary}</p>}
        </div>
        <button
          type="button"
          onClick={() => void evolveTree()}
          disabled={actionLoading}
          className="rounded-lg border border-violet-500/50 bg-violet-500/10 px-4 py-2 text-sm font-semibold text-violet-200 hover:bg-violet-500/20 disabled:opacity-50"
        >
          Evolve tree (AI)
        </button>
      </div>

      {toast && (
        <p className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-sm text-cyan-100">{toast}</p>
      )}

      <SkillTreeCanvas tree={goal.tree} onSelect={setSelectedId} selectedId={selectedId} />

      <aside className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5">
        {!selectedNode && <p className="text-slate-500">Select a node to see details and mark complete.</p>}
        {selectedNode && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold">{selectedNode.data.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{selectedNode.data.description}</p>
            </div>
            <dl className="grid grid-cols-2 gap-2 text-sm text-slate-400 sm:grid-cols-4">
              <div>
                <dt className="text-xs uppercase text-slate-600">Difficulty</dt>
                <dd className="font-medium text-slate-200">{selectedNode.data.difficulty}/5</dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-slate-600">XP</dt>
                <dd className="font-medium text-cyan-300">+{selectedNode.data.xpReward}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-slate-600">State</dt>
                <dd className="font-medium capitalize text-slate-200">{selectedNode.data.status}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-slate-600">Branch</dt>
                <dd className="font-medium text-slate-200">{selectedNode.data.branch || "—"}</dd>
              </div>
            </dl>
            {!isCompleted && selectedNode.data.status === "available" && (
              <div className="space-y-3 border-t border-slate-800 pt-4">
                <div>
                  <label className="mb-1 block text-xs uppercase text-slate-500">Journal (optional)</label>
                  <textarea
                    className="min-h-[72px] w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
                    value={journal}
                    onChange={(e) => setJournal(e.target.value)}
                    placeholder="What did you practice? Signals help the tree adapt."
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs uppercase text-slate-500">Proof URL (optional)</label>
                  <input
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
                    value={proofUrl}
                    onChange={(e) => setProofUrl(e.target.value)}
                    placeholder="Link to image, video, or log"
                  />
                </div>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => void completeNode()}
                  className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-50"
                >
                  Mark complete & claim XP
                </button>
              </div>
            )}
            {isCompleted && <p className="text-sm text-emerald-400/90">Cleared — this skill is on your record.</p>}
            {!isCompleted && selectedNode.data.status === "locked" && (
              <p className="text-sm text-slate-500">Prerequisites not finished yet. Trace back the tree to unlock.</p>
            )}
          </div>
        )}
      </aside>
    </div>
  );
}
