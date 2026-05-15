import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { applyCompletionStatuses, parseTreeJson } from "@/lib/tree-layout";
import type { SkillTreeSnapshot } from "@/lib/skill-tree-types";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await ctx.params;
  const goal = await prisma.goal.findFirst({
    where: { id, userId: session.user.id },
    include: { completions: true },
  });
  if (!goal) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const completed = new Set(goal.completions.map((c) => c.nodeId));
  const snapshot = applyCompletionStatuses(parseTreeJson(goal.treeJson), completed) as SkillTreeSnapshot;
  return NextResponse.json({
    goal: {
      id: goal.id,
      title: goal.title,
      experience: goal.experience,
      hoursPerWeek: goal.hoursPerWeek,
      interests: goal.interests,
      summary: goal.summary,
      focusSignals: goal.focusSignals,
      tree: snapshot,
      completions: goal.completions.map((c) => ({
        nodeId: c.nodeId,
        completedAt: c.completedAt,
        journal: c.journal,
        proofUrl: c.proofUrl,
        xpGranted: c.xpGranted,
      })),
    },
  });
}
