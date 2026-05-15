import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function SignOutButton() {
  return (
    <form
      action={async () => {
        "use server";
        await signOut({ redirectTo: "/" });
      }}
    >
      <button
        type="submit"
        className="rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:border-slate-500 hover:text-white"
      >
        Sign out
      </button>
    </form>
  );
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  let emoji = "🧑‍🚀";
  let name = "Explorer";
  if (session?.user?.id) {
    const u = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (u) {
      emoji = u.avatarEmoji;
      name = u.username;
    }
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/dashboard" className="flex items-center gap-2 text-lg font-semibold tracking-tight">
            <span className="text-2xl" aria-hidden>
              ◈
            </span>
            <span className="bg-gradient-to-r from-cyan-300 to-violet-300 bg-clip-text text-transparent">Ascend</span>
          </Link>
          <nav className="flex items-center gap-4 text-sm text-slate-400">
            <Link href="/dashboard" className="hover:text-cyan-300">
              Dashboard
            </Link>
            <Link href="/goals/new" className="hover:text-cyan-300">
              New goal
            </Link>
            <span className="hidden items-center gap-2 sm:flex">
              <span className="text-lg">{emoji}</span>
              <span className="text-slate-200">{name}</span>
            </span>
            <SignOutButton />
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
