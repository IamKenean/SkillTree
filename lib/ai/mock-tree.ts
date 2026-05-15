import type { SkillTreeSnapshot } from "@/lib/skill-tree-types";
import { layoutSkillTree } from "@/lib/tree-layout";

function slugId(prefix: string, i: number) {
  return `${prefix}-${i}`;
}

export function buildMockSkillTree(goalTitle: string, interests: string): SkillTreeSnapshot {
  const rootId = "root";
  const branches = [
    { id: slugId("b", 1), title: "Consistency engine", desc: "Build a sustainable rhythm with weekly anchors and reviews." },
    { id: slugId("b", 2), title: "Foundations", desc: "Strengthen the baseline habits that unlock everything else." },
    { id: slugId("b", 3), title: "Deep craft", desc: "Push into deliberate practice and measurable reps." },
  ];
  const leaves = [
    ["Micro-habits", "Environment design", "Tracking ritual"],
    ["Skill drills", "Feedback loops", "Mentor mindset"],
    ["Stretch projects", "Showcase piece", "Teach someone else"],
  ];
  const nodes: SkillTreeSnapshot["nodes"] = [
    {
      id: rootId,
      position: { x: 0, y: 0 },
      data: {
        title: goalTitle.slice(0, 80) || "Your quest",
        description: `Adaptive path toward: ${goalTitle}. ${interests ? `Focus areas: ${interests}.` : ""} Complete nodes to evolve new branches.`,
        difficulty: 1,
        xpReward: 50,
        estimatedHours: 2,
        prerequisiteIds: [],
        tier: "legendary",
        proofSuggested: false,
        branch: "origin",
        status: "available",
      },
    },
  ];
  const edges: SkillTreeSnapshot["edges"] = [];
  branches.forEach((b, i) => {
    nodes.push({
      id: b.id,
      position: { x: 0, y: 0 },
      data: {
        title: b.title,
        description: b.desc,
        difficulty: 2,
        xpReward: 80 + i * 10,
        estimatedHours: 4 + i,
        prerequisiteIds: [rootId],
        tier: "rare",
        proofSuggested: i === 2,
        branch: "core",
        status: "locked",
      },
    });
    edges.push({ id: `e-root-${b.id}`, source: rootId, target: b.id });
    leaves[i].forEach((title, j) => {
      const id = slugId(`n-${i}`, j);
      nodes.push({
        id,
        position: { x: 0, y: 0 },
        data: {
          title,
          description: `Practice lane supporting ${b.title.toLowerCase()}.`,
          difficulty: 2 + j,
          xpReward: 40 + j * 15,
          estimatedHours: 3,
          prerequisiteIds: [b.id],
          tier: "common",
          proofSuggested: j === 2,
          branch: "specialist",
          hidden: false,
          status: "locked",
        },
      });
      edges.push({ id: `e-${b.id}-${id}`, source: b.id, target: id });
    });
  });
  const snap: SkillTreeSnapshot = { rootId, nodes, edges };
  return layoutSkillTree(snap);
}
