import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { xpIntoCurrentLevel } from "@/lib/xp";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      goals: {
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { _count: { select: { completions: true } } },
      },
    },
  });
  if (!user) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const xp = xpIntoCurrentLevel(user.totalXp);
  return NextResponse.json({
    user: {
      username: user.username,
      avatarEmoji: user.avatarEmoji,
      totalXp: user.totalXp,
      level: xp.level,
      xpIntoLevel: xp.current,
      xpToNext: xp.nextLevelTotal,
      streakDays: user.streakDays,
    },
    recentGoals: user.goals.map((g) => ({
      id: g.id,
      title: g.title,
      completedNodes: g._count.completions,
    })),
  });
}
