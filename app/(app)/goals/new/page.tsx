"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const LEVELS = ["beginner", "intermediate", "advanced"] as const;

export default function NewGoalPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [experience, setExperience] = useState<string>("beginner");
  const [hoursPerWeek, setHoursPerWeek] = useState(4);
  const [interests, setInterests] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, experience, hoursPerWeek, interests }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Could not create goal");
      return;
    }
    router.push(`/goals/${data.goal.id}`);
  }

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-2 text-3xl font-bold tracking-tight">Define your quest</h1>
      <p className="mb-8 text-slate-400">
        The AI designs an RPG-style tree: branches, milestones, and XP. Without an API key, Ascend uses a resilient offline
        blueprint.
      </p>
      <form onSubmit={onSubmit} className="space-y-5 rounded-2xl border border-slate-800 bg-slate-950/60 p-6 shadow-xl">
        {error && <p className="text-sm text-red-400">{error}</p>}
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">Main goal</label>
          <textarea
            className="min-h-[100px] w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none ring-cyan-500/30 focus:ring-2"
            placeholder="e.g. I want to get stronger with calisthenics and eventually muscle-ups."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            minLength={3}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">Experience</label>
          <select
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none ring-cyan-500/30 focus:ring-2"
            value={experience}
            onChange={(e) => setExperience(e.target.value)}
          >
            {LEVELS.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">
            Hours per week: {hoursPerWeek}
          </label>
          <input
            type="range"
            min={1}
            max={20}
            value={hoursPerWeek}
            onChange={(e) => setHoursPerWeek(Number(e.target.value))}
            className="w-full accent-cyan-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">
            Interests / focus (optional)
          </label>
          <input
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none ring-cyan-500/30 focus:ring-2"
            placeholder="pushups, dips, handstands…"
            value={interests}
            onChange={(e) => setInterests(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-cyan-500 px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-60"
          >
            {loading ? "Generating tree…" : "Generate skill tree"}
          </button>
          <Link href="/dashboard" className="rounded-lg border border-slate-600 px-5 py-2.5 text-sm text-slate-300 hover:border-slate-400">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
