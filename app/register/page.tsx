"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";

const EMOJIS = ["🧑‍🚀", "🧙", "🥷", "🦾", "🎸", "🎨", "🏋️", "🧠", "⚡", "🔮"];

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [avatarEmoji, setAvatarEmoji] = useState("🧑‍🚀");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, username, avatarEmoji }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Registration failed");
      return;
    }
    const sign = await signIn("credentials", { email, password, redirect: false, callbackUrl: "/dashboard" });
    if (sign?.error) {
      setError("Account created but sign-in failed. Try logging in.");
      return;
    }
    window.location.href = "/dashboard";
  }

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center px-4">
      <h1 className="mb-2 text-2xl font-bold tracking-tight">Create your character</h1>
      <p className="mb-6 text-sm text-slate-400">Pick a username and avatar. You can tune goals later.</p>
      <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-6 shadow-xl">
        {error && <p className="text-sm text-red-400">{error}</p>}
        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-500">Username</label>
          <input
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none ring-cyan-500/30 focus:ring-2"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            minLength={2}
            maxLength={32}
            required
          />
        </div>
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-500">Avatar</p>
          <div className="flex flex-wrap gap-2">
            {EMOJIS.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => setAvatarEmoji(e)}
                className={`rounded-lg border px-2 py-1 text-xl transition ${
                  avatarEmoji === e ? "border-cyan-400 bg-cyan-500/10" : "border-slate-700 bg-slate-900 hover:border-slate-500"
                }`}
              >
                {e}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-500">Email</label>
          <input
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none ring-cyan-500/30 focus:ring-2"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-500">Password</label>
          <input
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none ring-cyan-500/30 focus:ring-2"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            required
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-violet-500 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-400 disabled:opacity-60"
        >
          {loading ? "Creating…" : "Register & enter Ascend"}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-slate-500">
        Already have an account?{" "}
        <Link href="/login" className="text-cyan-400 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
