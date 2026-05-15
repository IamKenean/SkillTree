import type { SkillTreeSnapshot } from "@/lib/skill-tree-types";
import { layoutSkillTree } from "@/lib/tree-layout";

let mockEvolveCounter = 0;

/** Deterministic evolution when OpenAI is unavailable. */
export function evolveMockTree(
  snapshot: SkillTreeSnapshot,
  completedIds: Set<string>,
): { snapshot: SkillTreeSnapshot; coachNote: string } {
  mockEvolveCounter++;
  const merged: SkillTreeSnapshot = {
    rootId: snapshot.rootId,
    nodes: snapshot.nodes.map((n) => ({ ...n, data: { ...n.data } })),
    edges: [...snapshot.edges],
  };
  const idSet = new Set(merged.nodes.map((n) => n.id));

  const anchors = merged.nodes
    .filter((n) => completedIds.has(n.id))
    .sort((a, b) => b.data.difficulty - a.data.difficulty);
  const attachTo = anchors[0]?.id ?? snapshot.rootId;

  const pack = [
    { t: "Ascension trial", d: "A focused boss challenge synthesizing your recent wins.", xp: 120 },
    { t: "Synergy lab", d: "Combine two skills you unlocked into one integrated session.", xp: 100 },
    { t: "Elite repetition", d: "Volume block with quality gates — film, log, improve.", xp: 90 },
  ];

  pack.forEach((p, i) => {
    const id = `evo-${mockEvolveCounter}-${i}`;
    if (idSet.has(id)) return;
    idSet.add(id);
    merged.nodes.push({
      id,
      position: { x: 0, y: 0 },
      data: {
        title: p.t,
        description: p.d,
        difficulty: 4,
        xpReward: p.xp,
        estimatedHours: 5,
        prerequisiteIds: [attachTo],
        tier: "epic",
        proofSuggested: true,
        branch: "evolved",
        hidden: false,
        status: "locked",
      },
    });
    merged.edges.push({ id: `e-${attachTo}-${id}`, source: attachTo, target: id });
  });

  return {
    snapshot: layoutSkillTree(merged),
    coachNote: "New branches detected from your training pattern. The tree adapts.",
  };
}
