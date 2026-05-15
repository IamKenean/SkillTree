import { Handle, NodeProps, Position } from '@xyflow/react';
import { motion } from 'framer-motion';

export type SkillNodeData = {
  title: string;
  description?: string | null;
  branch: string;
  status: 'locked' | 'available' | 'completed';
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  xp_reward: number;
  tier: number;
  is_hidden: boolean;
  isRoot: boolean;
  isNew?: boolean;
};

const RARITY_STYLES: Record<string, { ring: string; glow: string; label: string }> = {
  common: { ring: 'border-slate-400/30', glow: '', label: 'Common' },
  rare: { ring: 'border-rare/60', glow: 'shadow-[0_0_20px_-2px_rgba(72,179,255,0.7)]', label: 'Rare' },
  epic: { ring: 'border-epic/70', glow: 'shadow-[0_0_24px_-2px_rgba(177,108,255,0.7)]', label: 'Epic' },
  legendary: { ring: 'border-legendary/80', glow: 'shadow-[0_0_28px_-2px_rgba(255,181,71,0.85)]', label: 'Legendary' },
};

export function SkillNodeCard({ data, selected }: NodeProps) {
  const d = data as SkillNodeData;
  const rar = RARITY_STYLES[d.rarity] || RARITY_STYLES.common;
  const isLocked = d.status === 'locked';
  const isCompleted = d.status === 'completed';
  const isAvailable = d.status === 'available';
  const hidden = d.is_hidden && isLocked;

  const baseRing = isCompleted
    ? 'border-gold-400/80 shadow-glow-gold bg-gradient-to-br from-gold-500/30 to-amber-600/10'
    : isAvailable
      ? `${rar.ring} ${rar.glow} bg-ink-700/85 animate-pulseGlow`
      : `border-white/10 bg-ink-800/60 ${hidden ? 'opacity-40' : 'opacity-70'}`;

  return (
    <motion.div
      initial={d.isNew ? { scale: 0.5, opacity: 0 } : false}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 220, damping: 18 }}
      className={`relative rounded-xl border-2 px-4 py-3 w-56 cursor-pointer select-none transition-all duration-200 ${baseRing} ${selected ? 'ring-2 ring-accent-300' : ''}`}
    >
      <Handle type="target" position={Position.Top} className="!bg-transparent !border-0" />
      <Handle type="source" position={Position.Bottom} className="!bg-transparent !border-0" />

      {d.isRoot && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] tracking-widest display text-gold-400 bg-ink-900 px-2 py-0.5 rounded-full border border-gold-500/40">
          ROOT
        </span>
      )}

      <div className="flex items-center justify-between text-[10px] uppercase tracking-widest">
        <span className={`font-semibold ${isCompleted ? 'text-gold-300' : 'text-slate-400'}`}>{d.branch}</span>
        <span className={
          d.rarity === 'legendary' ? 'text-legendary font-bold' :
          d.rarity === 'epic' ? 'text-epic font-bold' :
          d.rarity === 'rare' ? 'text-rare font-bold' :
          'text-slate-500'
        }>{rar.label}</span>
      </div>

      <div className="mt-1 flex items-start gap-2">
        <NodeIcon status={d.status} hidden={hidden} />
        <h3 className={`text-sm font-bold leading-tight ${isCompleted ? 'text-gold-100' : isAvailable ? 'text-white' : 'text-slate-300'}`}>
          {hidden ? '???' : d.title}
        </h3>
      </div>

      <div className="mt-2 flex items-center justify-between text-[11px]">
        <span className="text-slate-400">Tier {d.tier}</span>
        <span className={`font-bold ${isCompleted ? 'text-gold-300' : 'text-slate-300'}`}>+{d.xp_reward} XP</span>
      </div>
    </motion.div>
  );
}

function NodeIcon({ status, hidden }: { status: string; hidden: boolean }) {
  if (status === 'completed') return <span className="text-gold-400 text-lg leading-none">✓</span>;
  if (hidden) return <span className="text-slate-500 text-lg leading-none">✦</span>;
  if (status === 'available') return <span className="text-accent-300 text-lg leading-none">◆</span>;
  return <span className="text-slate-500 text-lg leading-none">🔒</span>;
}
