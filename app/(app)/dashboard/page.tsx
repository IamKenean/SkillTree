import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { xpIntoCurrentLevel } from "@/lib/xp";

export default async function DashboardPage() {
  const session = await auth();
  const userId = session!.user!.id;
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const goals = await prisma.goal.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { completions: true } } },
  });
  const xp = xpIntoCurrentLevel(user.totalXp);

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Command deck</h1>
        <p className="mt-1 text-slate-400">Your progression overview — level up like you mean it.</p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Level" value={String(xp.level)} hint={`${xp.current} / ${xp.nextLevelTotal} XP this level`} />
        <StatCard label="Total XP" value={String(user.totalXp)} hint="Across all goals" />
        <StatCard label="Streak" value={`${user.streakDays}d`} hint="Progress days chain" />
        <StatCard label="Active goals" value={String(goals.length)} hint="Forge new paths anytime" />
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-950/50 p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Active goals</h2>
          <Link
            href="/goals/new"
            className="rounded-lg bg-gradient-to-r from-cyan-500 to-violet-500 px-4 py-2 text-sm font-semibold text-slate-950"
          >
            + New goal
          </Link>
        </div>
        {goals.length === 0 ? (
          <p className="text-slate-500">
            No goals yet.{" "}
            <Link href="/goals/new" className="text-cyan-400 hover:underline">
              Plant your first skill tree
            </Link>
            .
          </p>
        ) : (
          <ul className="divide-y divide-slate-800/80">
            {goals.map((g) => (
              <li key={g.id} className="flex flex-wrap items-center justify-between gap-3 py-4 first:pt-0 last:pb-0">
                <div>
                  <Link href={`/goals/${g.id}`} className="font-medium text-slate-100 hover:text-cyan-300">
                    {g.title}
                  </Link>
                  {g.summary && <p className="mt-1 max-w-xl text-sm text-slate-500">{g.summary}</p>}
                </div>
                <div className="text-right text-sm text-slate-500">
                  <span className="text-cyan-400/90">{g._count.completions}</span> nodes cleared
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function StatCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-950/80 to-slate-900/40 p-4 shadow-inner">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-white">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{hint}</p>
    </div>
  );
}
