import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

export function Landing() {
  return (
    <main className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-16 pb-24">
      <section className="text-center">
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="display text-xs tracking-[0.4em] text-accent-300 uppercase mb-6"
        >
          An adaptive RPG for your real life
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.05 }}
          className="display text-5xl sm:text-7xl font-black tracking-tight"
        >
          Build your <span className="gradient-text">character.</span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15 }}
          className="mt-6 max-w-2xl mx-auto text-lg text-slate-300"
        >
          Ascend turns any goal — coding, gym, drawing, guitar, public speaking — into a personalized,
          AI-generated skill tree. Branch into specializations. Earn XP. Level up. Watch your tree
          evolve as you do.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.25 }}
          className="mt-10 flex flex-wrap items-center justify-center gap-4"
        >
          <Link to="/signup" className="btn-primary text-base px-6 py-3">Start your journey</Link>
          <Link to="/login" className="btn-ghost text-base px-6 py-3">I already have an account</Link>
        </motion.div>
      </section>

      <section className="mt-24 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f, i) => (
          <motion.div
            key={f.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.5, delay: i * 0.05 }}
            className="card p-6"
          >
            <div className="text-3xl mb-3">{f.icon}</div>
            <h3 className="display text-lg font-bold tracking-wide mb-2">{f.title}</h3>
            <p className="text-slate-400 text-sm leading-relaxed">{f.body}</p>
          </motion.div>
        ))}
      </section>

      <section className="mt-24 card p-8 sm:p-12">
        <h2 className="display text-3xl font-bold mb-3">The tree evolves with you.</h2>
        <p className="text-slate-300 max-w-3xl">
          Tell Ascend you want to get stronger — it'll plant branches for consistency, lifting, calisthenics
          and nutrition. Repeatedly complete pull-ups and dips, and new branches will sprout: muscle-ups,
          front lever, planche. Your character is uniquely <em>yours</em>.
        </p>
      </section>
    </main>
  );
}

const FEATURES = [
  { icon: '🌌', title: 'AI-generated trees', body: 'Drop in any goal — the AI generates a custom multi-branch skill tree with prerequisites, milestones, and hidden unlocks.' },
  { icon: '⚔️', title: 'Earn XP and level up', body: 'Every completed node feeds your character. Streaks, achievements, and rarity tiers make growth feel real.' },
  { icon: '🌱', title: 'Adaptive evolution', body: 'Your tree responds to where you focus. Specialize, and watch new advanced branches grow toward mastery.' },
  { icon: '🔮', title: 'Hidden unlocks', body: 'Legendary nodes lie dormant in your tree, revealed as you grow into them. Discovery is part of the journey.' },
  { icon: '📜', title: 'Journal & proof', body: 'Mark milestones, attach proof, write reflections. Every node becomes a chapter in your story.' },
  { icon: '🧭', title: 'Path of mastery', body: 'Inspired by Path of Exile, Destiny 2, and Duolingo — a visual map of who you\'re becoming.' },
];
