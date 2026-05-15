import Link from "next/link";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-20">
      <div className="max-w-2xl text-center">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-cyan-400/90">Working title</p>
        <h1 className="mb-4 text-4xl font-bold tracking-tight sm:text-5xl">
          <span className="bg-gradient-to-br from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">Ascend</span>
        </h1>
        <p className="mb-8 text-lg text-slate-400">
          An AI-powered adaptive skill tree for personal growth. Build your character with branching paths, XP, streaks, and
          trees that evolve with what you actually practice.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/register"
            className="rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 px-6 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-500/20 transition hover:brightness-110"
          >
            Start your tree
          </Link>
          <Link
            href="/login"
            className="rounded-xl border border-slate-600 bg-slate-900/50 px-6 py-3 text-sm font-semibold text-slate-200 transition hover:border-slate-400"
          >
            Log in
          </Link>
        </div>
      </div>
    </div>
  );
}
