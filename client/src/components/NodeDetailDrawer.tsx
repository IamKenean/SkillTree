import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { SkillNode } from '../lib/api';
import { api } from '../lib/api';

export function NodeDetailDrawer({
  node,
  onClose,
  onCompleted,
}: {
  node: SkillNode | null;
  onClose: () => void;
  onCompleted: (n: SkillNode, xpGained: number) => void;
}) {
  const [journal, setJournal] = useState('');
  const [proof, setProof] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setJournal(''); setProof(''); setErr(null);
  }, [node?.id]);

  if (!node) return null;
  const locked = node.status === 'locked';
  const done = node.status === 'completed';
  const hidden = node.is_hidden && locked;

  async function complete() {
    if (!node) return;
    setBusy(true); setErr(null);
    try {
      const r = await api.completeNode(node.id, { journalEntry: journal || undefined, proofUrl: proof || undefined });
      onCompleted(r.node, r.xpGained);
    } catch (e: any) {
      setErr(e.message);
    } finally { setBusy(false); }
  }

  return (
    <AnimatePresence>
      {node && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-ink-900/60 backdrop-blur-sm z-40"
          />
          <motion.aside
            initial={{ x: 460, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 460, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 220, damping: 24 }}
            className="fixed top-0 right-0 h-full w-full sm:w-[460px] bg-ink-800 border-l border-white/10 z-50 overflow-y-auto"
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="chip">{node.branch}</span>
                <button onClick={onClose} className="text-slate-400 hover:text-white text-xl">×</button>
              </div>

              <h2 className="display text-2xl font-bold mb-1">{hidden ? '???' : node.title}</h2>
              <div className="flex items-center gap-2 mb-4 text-xs text-slate-400">
                <span>Tier {node.tier}</span> • <span>Difficulty {'★'.repeat(node.difficulty)}</span> • <span className="capitalize">{node.rarity}</span>
              </div>

              <p className="text-slate-300 mb-5 leading-relaxed">{hidden ? 'A hidden path. Master prerequisites to reveal it.' : node.description}</p>

              <div className="grid grid-cols-3 gap-3 mb-6">
                <Stat label="XP" value={`+${node.xp_reward}`} accent="gold" />
                <Stat label="Time" value={`${node.est_minutes}m`} accent="slate" />
                <Stat label="Status" value={node.status} accent={done ? 'gold' : 'slate'} />
              </div>

              {!hidden && node.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-6">
                  {node.tags.map(t => <span key={t} className="chip text-[10px]">{t}</span>)}
                </div>
              )}

              {!done && !locked && (
                <>
                  <div className="space-y-3 mb-5">
                    <div>
                      <label className="label">Journal entry (optional)</label>
                      <textarea className="input mt-1 min-h-[90px]" placeholder="How did it go? What did you learn?" value={journal} onChange={e => setJournal(e.target.value)} />
                    </div>
                    <div>
                      <label className="label">Proof URL (optional)</label>
                      <input className="input mt-1" placeholder="Link to image, video, repo, etc." value={proof} onChange={e => setProof(e.target.value)} />
                    </div>
                  </div>
                  {err && <p className="text-red-400 text-sm mb-3">{err}</p>}
                  <button className="btn-gold w-full" disabled={busy} onClick={complete}>
                    {busy ? 'Sealing your triumph…' : `✓ Complete & gain +${node.xp_reward} XP`}
                  </button>
                </>
              )}

              {done && (
                <div className="card p-4 border-gold-500/40">
                  <p className="text-gold-300 font-bold display tracking-wide">Mastered ⚜</p>
                  <p className="text-slate-300 text-sm mt-1">Completed {node.completed_at ? new Date(node.completed_at).toLocaleDateString() : 'recently'}.</p>
                </div>
              )}

              {locked && (
                <div className="card p-4 text-slate-400 text-sm">
                  🔒 This node is locked. Complete its prerequisites to unlock.
                </div>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent: 'gold' | 'slate' }) {
  return (
    <div className={`rounded-xl border px-3 py-2 ${accent === 'gold' ? 'border-gold-500/30 bg-gold-500/10' : 'border-white/10 bg-white/5'}`}>
      <p className="text-[10px] uppercase tracking-widest text-slate-400">{label}</p>
      <p className={`text-sm font-bold ${accent === 'gold' ? 'text-gold-300' : 'text-slate-100'} capitalize`}>{value}</p>
    </div>
  );
}
