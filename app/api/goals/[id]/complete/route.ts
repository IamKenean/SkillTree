import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { applyCompletionStatuses, parseTreeJson, nextStreak } from "@/lib/tree-layout";
import { levelFromTotalXp } from "@/lib/xp";
import type { SkillTreeSnapshot } from "@/lib/skill-tree-types";

function findNode(snapshot: SkillTreeSnapshot, nodeId: string) {
  return snapshot.nodes.find((n) => n.id === nodeId);
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id: goalId } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const nodeId = String(body.nodeId || "");
  const journal = String(body.journal || "").slice(0, 2000);
  const proofUrl = String(body.proofUrl || "").slice(0, 500);

  if (!nodeId) {
    return NextResponse.json({ error: "nodeId required" }, { status: 400 });
  }

  const goal = await prisma.goal.findFirst({
    where: { id: goalId, userId: session.user.id },
    include: { completions: true },
  });
  if (!goal) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const completed = new Set(goal.completions.map((c) => c.nodeId));
  if (completed.has(nodeId)) {
    return NextResponse.json({ error: "Already completed" }, { status: 409 });
  }

  const snapshot = applyCompletionStatuses(parseTreeJson(goal.treeJson), completed) as SkillTreeSnapshot;
  const node = findNode(snapshot, nodeId);
  if (!node) {
    return NextResponse.json({ error: "Unknown node" }, { status: 400 });
  }
  if (node.data.status !== "available") {
    return NextResponse.json({ error: "Node is locked" }, { status: 400 });
  }

  const xp = node.data.xpReward;

  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.user.id } });
  const streak = nextStreak(user.lastProgressDate, user.streakDays);
  const newTotalXp = user.totalXp + xp;
  const newLevel = levelFromTotalXp(newTotalXp);

  const signalLine = [node.data.title, journal && `note:${journal.slice(0, 120)}`].filter(Boolean).join(" · ");

  await prisma.$transaction([
    prisma.nodeCompletion.create({
      data: {
        userId: session.user.id,
        goalId,
        nodeId,
        journal,
        proofUrl,
        xpGranted: xp,
      },
    }),
    prisma.user.update({
      where: { id: session.user.id },
      data: {
        totalXp: newTotalXp,
        level: newLevel,
        streakDays: streak.streakDays,
        lastProgressDate: streak.lastProgressDate,
      },
    }),
    prisma.goal.update({
      where: { id: goalId },
      data: {
        focusSignals: goal.focusSignals
          ? `${goal.focusSignals}\n${signalLine}`
          : signalLine,
      },
    }),
  ]);

  return NextResponse.json({
    ok: true,
    xpGained: xp,
    totalXp: newTotalXp,
    level: newLevel,
    streakDays: streak.streakDays,
  });
}
