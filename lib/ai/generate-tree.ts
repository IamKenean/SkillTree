import OpenAI from "openai";
import type { SkillTreeSnapshot } from "@/lib/skill-tree-types";
import { layoutSkillTree } from "@/lib/tree-layout";

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

type AiNode = {
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
};

type AiPayload = {
  rootId: string;
  summary: string;
  nodes: AiNode[];
  edges: Array<{ id: string; source: string; target: string }>;
};

function sanitizePayload(payload: AiPayload, goalTitle: string): SkillTreeSnapshot {
  const rootId = payload.rootId || "root";
  const nodes = payload.nodes.map((n) => ({
    id: n.id,
    position: { x: 0, y: 0 },
    data: {
      title: n.title,
      description: n.description,
      difficulty: Math.min(5, Math.max(1, n.difficulty || 2)),
      xpReward: Math.max(10, n.xpReward || 40),
      estimatedHours: n.estimatedHours,
      prerequisiteIds: Array.isArray(n.prerequisiteIds) ? n.prerequisiteIds : [],
      tier: (["common", "rare", "epic", "legendary"].includes(String(n.tier))
        ? (n.tier as "common" | "rare" | "epic" | "legendary")
        : undefined),
      proofSuggested: Boolean(n.proofSuggested),
      branch: n.branch || "core",
      hidden: Boolean(n.hidden),
      status: n.id === rootId ? ("available" as const) : ("locked" as const),
    },
  }));
  const edges = payload.edges.filter((e) => e.source && e.target);
  const nodeIds = new Set(nodes.map((n) => n.id));
  if (!nodeIds.has(rootId)) {
    nodes.unshift({
      id: rootId,
      position: { x: 0, y: 0 },
      data: {
        title: goalTitle.slice(0, 100),
        description: payload.summary || "Your personalized ascent begins here.",
        difficulty: 1,
        xpReward: 40,
        estimatedHours: 2,
        prerequisiteIds: [],
        tier: "legendary",
        proofSuggested: false,
        branch: "origin",
        hidden: false,
        status: "available",
      },
    });
  }
  const filteredEdges = edges.filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target));
  return layoutSkillTree({
    rootId,
    nodes,
    edges: filteredEdges.map((e, i) => ({
      id: e.id || `edge-${i}`,
      source: e.source,
      target: e.target,
    })),
  });
}

const systemPrompt = `You are Ascend, an RPG skill-tree designer for real-world growth goals.
Return ONLY valid JSON matching this shape:
{
  "rootId": string (unique id of root),
  "summary": string (one sentence coaching vibe),
  "nodes": Array<{
    "id": string (slug, unique),
    "title": string,
    "description": string (2-3 sentences, motivating, concrete),
    "difficulty": number 1-5,
    "xpReward": number 30-200,
    "estimatedHours": number optional,
    "prerequisiteIds": string[] (ids that must be done first; root has []),
    "tier": "common"|"rare"|"epic"|"legendary",
    "proofSuggested": boolean,
    "branch": string short label,
    "hidden": boolean optional
  }>,
  "edges": Array<{ "id": string, "source": string, "target": string }>
}
Rules:
- Exactly 1 root with prerequisiteIds [].
- 8-14 total nodes including root.
- Multiple branches after root (at least 3 first-layer children of root).
- Deeper nodes list prerequisites forming a DAG (no cycles).
- Edges: include edge for every prerequisite relationship parent->child where parent is a prereq of child (typically each prereq -> child).
- Use futuristic, game-like language without being cheesy.
`;

export async function generateSkillTreeWithAi(input: {
  title: string;
  experience: string;
  hoursPerWeek: number;
  interests: string;
}): Promise<{ snapshot: SkillTreeSnapshot; summary: string }> {
  if (!openai) {
    throw new Error("OPENAI_API_KEY is not configured");
  }
  const userMsg = `Goal: ${input.title}
Experience: ${input.experience}
Time per week (hours): ${input.hoursPerWeek}
Interests / focus: ${input.interests || "not specified"}

Design a branching skill tree with logical progression from beginner-friendly to advanced, including optional specialization lanes.`;

  const res = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.75,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMsg },
    ],
  });
  const text = res.choices[0]?.message?.content;
  if (!text) throw new Error("Empty AI response");
  const payload = JSON.parse(text) as AiPayload;
  const snapshot = sanitizePayload(payload, input.title);
  return { snapshot, summary: payload.summary || "" };
}
