import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ReactFlowProvider } from '@xyflow/react';
import { api, Goal, SkillNode, SkillEdge } from '../lib/api';
import { useAuth } from '../lib/auth';
import { SkillTree } from '../components/SkillTree';
import { NodeDetailDrawer } from '../components/NodeDetailDrawer';
import { XpToast } from '../components/XpToast';
import { motion, AnimatePresence } from 'framer-motion';

export function GoalView() {
  const { id } = useParams();
  const { setUser } = useAuth();
  const [goal, setGoal] = useState<Goal | null>(null);
  const [nodes, setNodes] = useState<SkillNode[]>([]);
  const [edges, setEdges] = useState<SkillEdge[]>([]);
  const [selected, setSelected] = useState<SkillNode | null>(null);
  const [xpToast, setXpToast] = useState<{ xp: number; message?: string } | null>(null);
  const [newNodeIds, setNewNodeIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [evolving, setEvolving] = useState(false);
  const [evolveMsg, setEvolveMsg] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('All');

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api.getGoal(id).then(r => {
      setGoal(r.goal);
      setNodes(r.nodes);
      setEdges(r.edges);
    }).finally(() => setLoading(false));
  }, [id]);

  const branches = useMemo(() => {
    const set = new Set<string>(['All']);
    nodes.forEach(n => set.add(n.branch));
    return Array.from(set);
  }, [nodes]);

  const visibleNodes = useMemo(() => {
    if (filter === 'All') return nodes;
    return nodes.filter(n => n.branch === filter || n.branch === 'Core');
  }, [nodes, filter]);

  const visibleEdges = useMemo(() => {
    if (filter === 'All') return edges;
    const ids = new Set(visibleNodes.map(n => n.id));
    return edges.filter(e => ids.has(e.source) && ids.has(e.target));
  }, [edges, visibleNodes, filter]);

  const stats = useMemo(() => {
    const total = nodes.length;
    const done = nodes.filter(n => n.status === 'completed').length;
    const avail = nodes.filter(n => n.status === 'available').length;
    const branchProgress: Record<string, { done: number; total: number }> = {};
    for (const n of nodes) {
      if (!branchProgress[n.branch]) branchProgress[n.branch] = { done: 0, total: 0 };
      branchProgress[n.branch].total++;
      if (n.status === 'completed') branchProgress[n.branch].done++;
    }
    return { total, done, avail, branchProgress };
  }, [nodes]);

  function onCompleted(updated: SkillNode, xpGained: number) {
    // Replace node, then refetch to update prerequisites/availability
    setNodes(prev => prev.map(n => n.id === updated.id ? updated : n));
    setXpToast({ xp: xpGained, message: 'Skill Mastered' });
    setTimeout(() => setXpToast(null), 2400);
    setSelected(null);
    // Refresh server-side availability
    api.getGoal(id!).then(r => {
      setNodes(r.nodes);
      setEdges(r.edges);
    });
    api.me().then(r => setUser(r.user));
  }

  async function onEvolve() {
    if (!id) return;
    setEvolving(true); setEvolveMsg(null);
    try {
      const r = await api.evolveGoal(id);
      if (r.added === 0) {
        setEvolveMsg('No new branches yet — keep going!');
      } else {
        setEvolveMsg(`+${r.added} new skills sprouted. Focus: ${r.focusTags.slice(0, 3).join(', ') || 'your path'}`);
        const fresh = await api.getGoal(id);
        setNodes(fresh.nodes);
        setEdges(fresh.edges);
        const ids = new Set(r.newNodeIds || []);
        setNewNodeIds(ids);
        setTimeout(() => setNewNodeIds(new Set()), 4000);
      }
    } catch (e: any) {
      setEvolveMsg(e.message);
    } finally {
      setEvolving(false);
      setTimeout(() => setEvolveMsg(null), 5000);
    }
  }

  if (loading) return <div className="grid place-items-center h-[60vh] text-slate-400">Loading your tree…</div>;
  if (!goal) return <div className="grid place-items-center h-[60vh] text-slate-400">Goal not found. <Link to="/dashboard" className="ml-2 text-accent-300">Back</Link></div>;

  const overallPct = stats.total ? Math.round((stats.done / stats.total) * 100) : 0;

  return (
    <div className="relative">
      <XpToast xp={xpToast?.xp ?? null} message={xpToast?.message} />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-6">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-4">
          <div>
            <p className="display text-xs tracking-[0.3em] text-accent-300 uppercase">Skill Tree</p>
            <h1 className="display text-3xl font-bold mt-1">{goal.title}</h1>
            {goal.description && <p className="text-slate-400 text-sm mt-1 max-w-2xl">{goal.description}</p>}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onEvolve} disabled={evolving || stats.done < 2} title={stats.done < 2 ? 'Complete at least 2 nodes to evolve' : 'Evolve the tree based on your focus'} className="btn-gold text-sm">
              {evolving ? '✨ Growing…' : '✨ Evolve tree'}
            </button>
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-3 mb-4">
          <div className="card p-3">
            <p className="text-xs text-slate-400 uppercase tracking-widest">Progress</p>
            <p className="display text-xl font-bold">{stats.done} / {stats.total}</p>
            <div className="mt-2 h-2 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-accent-500 to-gold-400" style={{ width: `${overallPct}%` }} />
            </div>
          </div>
          <div className="card p-3">
            <p className="text-xs text-slate-400 uppercase tracking-widest">Available now</p>
            <p className="display text-xl font-bold">{stats.avail} <span className="text-accent-300">◆</span></p>
          </div>
          <div className="card p-3">
            <p className="text-xs text-slate-400 uppercase tracking-widest">Branches</p>
            <p className="display text-xl font-bold">{branches.length - 1}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-3">
          {branches.map(b => (
            <button
              key={b}
              onClick={() => setFilter(b)}
              className={`chip transition ${filter === b ? 'bg-accent-500/30 border-accent-400 text-white' : 'hover:bg-white/10'}`}
            >
              {b}
              {b !== 'All' && stats.branchProgress[b] && (
                <span className="ml-1.5 text-slate-400 text-[10px]">{stats.branchProgress[b].done}/{stats.branchProgress[b].total}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {evolveMsg && (
          <motion.div
            initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -10, opacity: 0 }}
            className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mb-2"
          >
            <div className="card p-3 border-gold-500/40 shadow-glow-gold text-sm text-gold-200">
              ✨ {evolveMsg}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="card overflow-hidden" style={{ height: 'calc(100vh - 280px)', minHeight: '500px' }}>
          <ReactFlowProvider>
            <SkillTree
              nodes={visibleNodes}
              edges={visibleEdges}
              newNodeIds={newNodeIds}
              selectedId={selected?.id ?? null}
              onNodeClick={(n) => setSelected(n)}
            />
          </ReactFlowProvider>
        </div>
        <p className="text-xs text-slate-500 mt-2">
          Click a node to view its details. ◆ blue = available, ✓ gold = mastered, 🔒 grey = locked.
        </p>
      </div>

      <NodeDetailDrawer
        node={selected}
        onClose={() => setSelected(null)}
        onCompleted={onCompleted}
      />
    </div>
  );
}
