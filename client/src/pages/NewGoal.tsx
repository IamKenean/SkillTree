import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { motion } from 'framer-motion';

const EXAMPLES = [
  'I want to get stronger and learn calisthenics',
  'I want to become a great frontend engineer specializing in React',
  'I want to learn to draw expressive characters',
  'I want to get comfortable speaking on stage',
  'I want to play 20 songs on guitar fluently',
];

export function NewGoal() {
  const nav = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDesc] = useState('');
  const [experienceLevel, setExp] = useState('beginner');
  const [hoursPerWeek, setHours] = useState(5);
  const [focusAreas, setFocus] = useState('');
  const [error, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null); setBusy(true);
    try {
      const { goal } = await api.createGoal({ title, description, experienceLevel, hoursPerWeek, focusAreas });
      nav(`/goals/${goal.id}`);
    } catch (e: any) {
      setErr(e.message);
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <p className="display text-xs tracking-[0.3em] text-accent-300 uppercase mb-2">Quest setup</p>
      <h1 className="display text-4xl font-bold mb-2">What do you want to master?</h1>
      <p className="text-slate-400 mb-8">Be specific. The more context you give, the more the tree will feel like <em>yours</em>.</p>

      {busy ? (
        <ForgingTree />
      ) : (
        <form onSubmit={onSubmit} className="card p-6 sm:p-8 space-y-5">
          <div>
            <label className="label">Your goal</label>
            <textarea
              className="input mt-1 min-h-[80px]"
              placeholder="e.g. I want to become strong at calisthenics — pullups, dips, eventually muscle ups."
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
              minLength={3}
              maxLength={300}
            />
            <div className="mt-3 flex flex-wrap gap-2">
              {EXAMPLES.map(ex => (
                <button key={ex} type="button" onClick={() => setTitle(ex)} className="chip hover:bg-white/10">{ex}</button>
              ))}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Experience level</label>
              <select className="input mt-1" value={experienceLevel} onChange={e => setExp(e.target.value)}>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
            <div>
              <label className="label">Hours per week</label>
              <input className="input mt-1" type="number" min={1} max={60} value={hoursPerWeek} onChange={e => setHours(Number(e.target.value))} />
            </div>
          </div>

          <div>
            <label className="label">Focus areas (optional)</label>
            <input
              className="input mt-1"
              placeholder="e.g. pullups, dips, handstands"
              value={focusAreas}
              onChange={e => setFocus(e.target.value)}
            />
          </div>

          <div>
            <label className="label">Anything else? (optional)</label>
            <textarea
              className="input mt-1 min-h-[80px]"
              placeholder="Context, constraints, dreams. The AI will weave them in."
              value={description}
              onChange={e => setDesc(e.target.value)}
            />
          </div>

          {error && <div className="text-red-400 text-sm">{error}</div>}

          <button className="btn-gold w-full text-base py-3">⚔ Forge my skill tree</button>
        </form>
      )}
    </main>
  );
}

function ForgingTree() {
  return (
    <div className="card p-12 text-center">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
        className="mx-auto h-20 w-20 rounded-full border-4 border-accent-400/30 border-t-accent-400 shadow-glow"
      />
      <h2 className="display text-2xl font-bold mt-8 mb-2 gradient-text">Forging your tree…</h2>
      <p className="text-slate-400 text-sm">Branches are crystallizing. Specializations are forming. Hidden paths are being seeded.</p>
    </div>
  );
}
