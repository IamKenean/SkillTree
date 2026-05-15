import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, Goal, User } from '../lib/api';
import { useAuth } from '../lib/auth';
import { motion } from 'framer-motion';

export function Dashboard() {
  const { user, setUser } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [recent, setRecent] = useState<any[]>([]);
  const [totalCompleted, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.dashboard().then(r => {
      setGoals(r.goals);
      setRecent(r.recentNodes);
      setTotal(r.totalCompleted);
      setUser(r.user);
    }).finally(() => setLoading(false));
  }, [setUser]);

  if (loading || !user) return <div className="grid place-items-center h-[60vh] text-slate-400">Loading your saga…</div>;

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <p className="display text-xs tracking-[0.3em] text-accent-300 uppercase">Welcome back</p>
          <h1 className="display text-4xl font-bold mt-1">{user.username}</h1>
        </div>
        <Link to="/goals/new" className="btn-primary">+ Start a new goal</Link>
      </div>

      <div className="grid gap-4 md:grid-cols-4 mb-10">
        <Stat label="Level" value={`LV ${user.level}`} accent="gold" />
        <Stat label="Total XP" value={`${user.xp}`} accent="accent" />
        <Stat label="Streak" value={`${user.streak}d`} accent="red" />
        <Stat label="Nodes Mastered" value={`${totalCompleted}`} accent="purple" />
      </div>

      <div className="card p-6 mb-10">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs tracking-widest text-accent-300 uppercase">XP Progress</p>
            <p className="display text-xl font-bold">Level {user.level} → {user.level + 1}</p>
          </div>
          <span className="text-slate-300 text-sm">{user.xp_into_level} / {user.xp_for_next_level} XP</span>
        </div>
        <div className="h-3 rounded-full overflow-hidden bg-white/10">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, (user.xp_into_level / user.xp_for_next_level) * 100)}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="h-full bg-gradient-to-r from-accent-500 via-accent-300 to-gold-400 shadow-glow"
          />
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2 card p-6">
          <h2 className="display text-xl font-bold mb-4">Active Goals</h2>
          {goals.length === 0 && (
            <p className="text-slate-400 text-sm">
              No goals yet. <Link to="/goals/new" className="text-accent-300 hover:underline">Start your first one</Link>.
            </p>
          )}
          <div className="space-y-3">
            {goals.map(g => <GoalCard key={g.id} goal={g} />)}
          </div>
        </section>
        <section className="card p-6">
          <h2 className="display text-xl font-bold mb-4">Recent Triumphs</h2>
          {recent.length === 0 && <p className="text-slate-400 text-sm">No completed nodes yet. Go forth.</p>}
          <ul className="space-y-3">
            {recent.map(n => (
              <li key={n.id} className="flex items-start gap-3">
                <RarityDot rarity={n.rarity} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{n.title}</p>
                  <p className="text-xs text-slate-400">{n.branch} • {n.goal_title}</p>
                </div>
                <span className="text-gold-400 text-xs font-bold whitespace-nowrap">+{n.xp_reward} XP</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent: 'gold' | 'accent' | 'red' | 'purple' }) {
  const ring = {
    gold: 'shadow-glow-gold border-gold-500/40',
    accent: 'shadow-glow border-accent-500/40',
    red: 'border-red-500/30',
    purple: 'shadow-glow-epic border-epic/40',
  }[accent];
  return (
    <div className={`card p-5 border ${ring}`}>
      <p className="text-xs uppercase tracking-widest text-slate-400">{label}</p>
      <p className="display text-3xl font-black mt-2">{value}</p>
    </div>
  );
}

function GoalCard({ goal }: { goal: Goal }) {
  const total = goal.total_nodes || 0;
  const done = goal.completed_nodes || 0;
  const pct = total ? Math.round((done / total) * 100) : 0;
  return (
    <Link to={`/goals/${goal.id}`} className="block">
      <div className="rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition p-4">
        <div className="flex items-center justify-between gap-3 mb-2">
          <h3 className="font-semibold truncate">{goal.title}</h3>
          <span className="chip">{done}/{total}</span>
        </div>
        <div className="h-2 rounded-full overflow-hidden bg-white/10">
          <div className="h-full bg-gradient-to-r from-accent-500 to-gold-400" style={{ width: `${pct}%` }} />
        </div>
      </div>
    </Link>
  );
}

function RarityDot({ rarity }: { rarity: string }) {
  const c = {
    common: 'bg-slate-400',
    rare: 'bg-rare shadow-glow',
    epic: 'bg-epic shadow-glow-epic',
    legendary: 'bg-legendary shadow-glow-gold',
  }[rarity || 'common'] || 'bg-slate-400';
  return <span className={`mt-1.5 inline-block h-2.5 w-2.5 rounded-full ${c}`} />;
}
