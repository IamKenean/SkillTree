"use client";

import { memo } from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import type { SkillNodeData } from "@/lib/skill-tree-types";
import { cn } from "@/lib/utils";
import { Lock, Sparkles, Check } from "lucide-react";

type SkillFlowNode = Node<SkillNodeData, "skill">;

function TierGlow({ tier }: { tier?: SkillNodeData["tier"] }) {
  if (tier === "legendary")
    return <span className="absolute -inset-px rounded-2xl bg-gradient-to-r from-amber-400/50 via-fuchsia-500/40 to-cyan-400/50 blur-[1px]" />;
  if (tier === "epic")
    return <span className="absolute -inset-px rounded-2xl bg-gradient-to-r from-violet-500/40 to-sky-500/40 blur-[1px]" />;
  if (tier === "rare")
    return <span className="absolute -inset-px rounded-2xl bg-sky-500/25 blur-[1px]" />;
  return null;
}

function SkillNodeInner({ data, selected }: NodeProps<SkillFlowNode>) {
  const { status, title, description, difficulty, xpReward, tier, proofSuggested } = data;
  return (
    <div
      className={cn(
        "relative w-[220px] rounded-2xl border bg-slate-950/90 px-3 py-2.5 shadow-xl backdrop-blur-sm transition-all duration-300",
        status === "locked" && "border-slate-700/80 opacity-55",
        status === "available" && "border-cyan-500/50 shadow-[0_0_20px_rgba(34,211,238,0.15)]",
        status === "completed" && "border-emerald-500/50 shadow-[0_0_18px_rgba(52,211,153,0.18)]",
        selected && status === "available" && "ring-2 ring-cyan-400/70",
      )}
    >
      <TierGlow tier={tier} />
      <div className="relative">
        <div className="mb-1 flex items-center justify-between gap-2">
          <span className="truncate text-sm font-semibold tracking-tight text-slate-100">{title}</span>
          {status === "locked" && <Lock className="h-3.5 w-3.5 shrink-0 text-slate-500" />}
          {status === "available" && <Sparkles className="h-3.5 w-3.5 shrink-0 text-cyan-300" />}
          {status === "completed" && <Check className="h-4 w-4 shrink-0 text-emerald-400" />}
        </div>
        <p className="line-clamp-3 text-[11px] leading-snug text-slate-400">{description}</p>
        <div className="mt-2 flex items-center justify-between text-[10px] font-medium uppercase tracking-wider text-slate-500">
          <span>D{difficulty}</span>
          <span className="text-cyan-300/90">+{xpReward} XP</span>
        </div>
        {proofSuggested && status === "available" && (
          <p className="mt-1 text-[10px] text-violet-300/90">Proof suggested</p>
        )}
      </div>
      <Handle type="target" position={Position.Top} className="!h-2 !w-2 !border-0 !bg-slate-600" />
      <Handle type="source" position={Position.Bottom} className="!h-2 !w-2 !border-0 !bg-slate-600" />
    </div>
  );
}

export const SkillNode = memo(SkillNodeInner);
