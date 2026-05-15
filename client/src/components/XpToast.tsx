import { AnimatePresence, motion } from 'framer-motion';

export function XpToast({ xp, message }: { xp: number | null; message?: string }) {
  return (
    <AnimatePresence>
      {xp !== null && (
        <motion.div
          key={xp + (message || '')}
          initial={{ y: 30, opacity: 0, scale: 0.9 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: -10, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 240, damping: 20 }}
          className="fixed top-20 left-1/2 -translate-x-1/2 z-50"
        >
          <div className="card px-6 py-4 border-gold-500/50 shadow-glow-gold">
            <p className="display text-xs tracking-[0.3em] text-gold-300 uppercase mb-1">{message || 'Skill Unlocked'}</p>
            <p className="display text-2xl font-black gradient-text">+{xp} XP</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
