import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseTreeJson, applyCompletionStatuses } from "@/lib/tree-layout";
import { evolveTreeWithAi } from "@/lib/ai/evolve-tree";
import { evolveMockTree } from "@/lib/ai/mock-evolve";
import type { SkillTreeSnapshot } from "@/lib/skill-tree-types";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id: goalId } = await ctx.params;

  const goal = await prisma.goal.findFirst({
    where: { id: goalId, userId: session.user.id },
    include: { completions: { orderBy: { completedAt: "desc" } } },
  });
  if (!goal) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const completedIds = new Set(goal.completions.map((c) => c.nodeId));
  const snapshot = parseTreeJson(goal.treeJson) as SkillTreeSnapshot;
  const titles = goal.completions
    .map((c) => {
      const n = snapshot.nodes.find((x) => x.id === c.nodeId);
      return n?.data.title ?? c.nodeId;
    })
    .slice(0, 12);

  let evolved: { snapshot: SkillTreeSnapshot; coachNote: string };
  try {
    if (process.env.OPENAI_API_KEY) {
      evolved = await evolveTreeWithAi({
        snapshot,
        completedTitles: titles,
        focusSignals: goal.focusSignals,
      });
    } else {
      evolved = evolveMockTree(snapshot, completedIds);
    }
  } catch {
    evolved = evolveMockTree(snapshot, completedIds);
  }

  applyCompletionStatuses(evolved.snapshot, completedIds);

  await prisma.goal.update({
    where: { id: goalId },
    data: {
      treeJson: JSON.stringify(evolved.snapshot),
    },
  });

  return NextResponse.json({ ok: true, coachNote: evolved.coachNote });
}
