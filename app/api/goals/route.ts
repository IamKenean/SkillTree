import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildMockSkillTree } from "@/lib/ai/mock-tree";
import { generateSkillTreeWithAi } from "@/lib/ai/generate-tree";
import { applyCompletionStatuses } from "@/lib/tree-layout";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const goals = await prisma.goal.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { completions: true } },
    },
  });
  return NextResponse.json({
    goals: goals.map((g) => ({
      id: g.id,
      title: g.title,
      summary: g.summary,
      createdAt: g.createdAt,
      completedNodes: g._count.completions,
    })),
  });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const title = String(body.title || "").trim();
  const experience = String(body.experience || "beginner").trim();
  const hoursPerWeek = Number(body.hoursPerWeek) || 3;
  const interests = String(body.interests || "").trim();

  if (title.length < 3) {
    return NextResponse.json({ error: "Goal must be at least 3 characters" }, { status: 400 });
  }

  let summary = "";
  let snapshot = buildMockSkillTree(title, interests);
  summary = "Offline blueprint — add OPENAI_API_KEY for deeply personalized trees.";

  if (process.env.OPENAI_API_KEY) {
    try {
      const ai = await generateSkillTreeWithAi({ title, experience, hoursPerWeek, interests });
      snapshot = ai.snapshot;
      summary = ai.summary || summary;
    } catch {
      snapshot = buildMockSkillTree(title, interests);
      summary = "AI generation failed; using resilient offline blueprint.";
    }
  }

  applyCompletionStatuses(snapshot, new Set());

  const goal = await prisma.goal.create({
    data: {
      userId: session.user.id,
      title,
      experience,
      hoursPerWeek,
      interests,
      summary,
      treeJson: JSON.stringify(snapshot),
    },
  });

  return NextResponse.json({ goal: { id: goal.id } });
}
