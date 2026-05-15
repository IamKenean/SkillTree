import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';

const AVATARS = ['🦅', '🐉', '🐺', '🦊', '🦁', '🐯', '🦉', '🦄', '🔮', '⚔️', '🛡️', '🏹'];

export function Signup() {
  const { signup } = useAuth();
  const nav = useNavigate();
  const [username, setUN] = useState('');
  const [email, setEm] = useState('');
  const [password, setPW] = useState('');
  const [avatar, setAv] = useState(AVATARS[0]);
  const [error, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null); setBusy(true);
    try {
      await signup({ username, email, password, avatar });
      nav('/goals/new');
    } catch (e: any) {
      setErr(e.message);
    } finally { setBusy(false); }
  }

  return (
    <main className="mx-auto max-w-md px-4 pt-16">
      <div className="card p-8">
        <h1 className="display text-2xl font-bold mb-1">Forge a new hero.</h1>
        <p className="text-slate-400 mb-6 text-sm">Choose your name and sigil — your journey begins now.</p>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="label">Sigil</label>
            <div className="mt-2 flex flex-wrap gap-2">
              {AVATARS.map(a => (
                <button
                  type="button"
                  key={a}
                  className={`w-11 h-11 rounded-xl text-2xl border transition ${
                    avatar === a
                      ? 'border-accent-400 bg-accent-500/20 shadow-glow'
                      : 'border-white/10 bg-white/5 hover:bg-white/10'
                  }`}
                  onClick={() => setAv(a)}
                  aria-label={`Avatar ${a}`}
                >{a}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">Username</label>
            <input className="input mt-1" value={username} onChange={e => setUN(e.target.value)} required minLength={2} maxLength={32} />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input mt-1" type="email" value={email} onChange={e => setEm(e.target.value)} required />
          </div>
          <div>
            <label className="label">Password</label>
            <input className="input mt-1" type="password" value={password} onChange={e => setPW(e.target.value)} required minLength={6} />
          </div>
          {error && <div className="text-red-400 text-sm">{error}</div>}
          <button className="btn-primary w-full" disabled={busy}>
            {busy ? 'Forging…' : 'Begin your ascent'}
          </button>
        </form>
        <p className="text-sm text-slate-400 mt-6 text-center">
          Already journeying? <Link to="/login" className="text-accent-300 hover:underline">Log in</Link>
        </p>
      </div>
    </main>
  );
}
