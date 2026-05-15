import OpenAI from "openai";
import type { SkillTreeSnapshot } from "@/lib/skill-tree-types";
import { layoutSkillTree } from "@/lib/tree-layout";

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

type DeltaPayload = {
  newNodes: Array<{
    id: string;
    title: string;
    description: string;
    difficulty: number;
    xpReward: number;
    estimatedHours?: number;
    prerequisiteIds: string[];
    tier?: string;
    proofSuggested?: boolean;
    branch?: string;
    hidden?: boolean;
  }>;
  newEdges: Array<{ id: string; source: string; target: string }>;
  coachNote: string;
};

const evolveSystem = `You evolve an RPG skill tree based on what the user actually practices.
Return ONLY JSON:
{
  "newNodes": [...]  (3-6 nodes, all NEW unique ids, never reuse existing ids),
  "newEdges": [...]  (connect new nodes to existing OR new nodes; sources/targets must exist in merged graph),
  "coachNote": string (short, hype but grounded)
}
Rules:
- Nodes unlock only via prerequisiteIds referencing real ids from the existing tree OR other new nodes in this batch.
- Prefer specialization aligned with focus signals.
- difficulty 1-5, xpReward 40-220, tier common|rare|epic|legendary.
`;

export async function evolveTreeWithAi(input: {
  snapshot: SkillTreeSnapshot;
  completedTitles: string[];
  focusSignals: string;
}): Promise<{ snapshot: SkillTreeSnapshot; coachNote: string }> {
  if (!openai) throw new Error("OPENAI_API_KEY is not configured");
  const existingIds = input.snapshot.nodes.map((n) => n.id).join(", ");
  const userMsg = `Existing node ids: ${existingIds}
Current root: ${input.snapshot.rootId}
Completed node titles: ${input.completedTitles.join(" | ") || "none yet"}
Focus signals from recent activity: ${input.focusSignals || "none"}

Existing tree (compact):
${input.snapshot.nodes
  .map((n) => `- ${n.id}: ${n.data.title} (${n.data.branch || "core"})`)
  .join("\n")}

Propose new branches that feel like natural evolution — advanced paths, synergies, or hidden unlocks.`;

  const res = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.8,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: evolveSystem },
      { role: "user", content: userMsg },
    ],
  });
  const text = res.choices[0]?.message?.content;
  if (!text) throw new Error("Empty AI response");
  const delta = JSON.parse(text) as DeltaPayload;

  const merged: SkillTreeSnapshot = {
    rootId: input.snapshot.rootId,
    nodes: [...input.snapshot.nodes],
    edges: [...input.snapshot.edges],
  };
  const idSet = new Set(merged.nodes.map((n) => n.id));

  for (const raw of delta.newNodes ?? []) {
    if (idSet.has(raw.id)) continue;
    idSet.add(raw.id);
    merged.nodes.push({
      id: raw.id,
      position: { x: 0, y: 0 },
      data: {
        title: raw.title,
        description: raw.description,
        difficulty: Math.min(5, Math.max(1, raw.difficulty || 3)),
        xpReward: Math.max(20, raw.xpReward || 60),
        estimatedHours: raw.estimatedHours,
        prerequisiteIds: raw.prerequisiteIds ?? [],
        tier: (["common", "rare", "epic", "legendary"].includes(String(raw.tier))
          ? (raw.tier as "common" | "rare" | "epic" | "legendary")
          : undefined),
        proofSuggested: Boolean(raw.proofSuggested),
        branch: raw.branch || "evolved",
        hidden: Boolean(raw.hidden),
        status: "locked",
      },
    });
  }

  for (const e of delta.newEdges ?? []) {
    if (idSet.has(e.source) && idSet.has(e.target)) {
      merged.edges.push({ id: e.id || `e-${e.source}-${e.target}`, source: e.source, target: e.target });
    }
  }

  return {
    snapshot: layoutSkillTree(merged),
    coachNote: delta.coachNote || "Your path is reshaping.",
  };
}
