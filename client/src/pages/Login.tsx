import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';

export function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [usernameOrEmail, setUE] = useState('');
  const [password, setPW] = useState('');
  const [error, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null); setBusy(true);
    try {
      await login(usernameOrEmail, password);
      nav('/dashboard');
    } catch (e: any) {
      setErr(e.message);
    } finally { setBusy(false); }
  }

  return (
    <main className="mx-auto max-w-md px-4 pt-16">
      <div className="card p-8">
        <h1 className="display text-2xl font-bold mb-1">Welcome back, hero.</h1>
        <p className="text-slate-400 mb-6 text-sm">Pick up where you left off.</p>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="label">Username or email</label>
            <input className="input mt-1" value={usernameOrEmail} onChange={e => setUE(e.target.value)} required autoFocus />
          </div>
          <div>
            <label className="label">Password</label>
            <input className="input mt-1" type="password" value={password} onChange={e => setPW(e.target.value)} required />
          </div>
          {error && <div className="text-red-400 text-sm">{error}</div>}
          <button className="btn-primary w-full" disabled={busy}>
            {busy ? 'Logging in…' : 'Continue'}
          </button>
        </form>
        <p className="text-sm text-slate-400 mt-6 text-center">
          New here? <Link to="/signup" className="text-accent-300 hover:underline">Create an account</Link>
        </p>
      </div>
    </main>
  );
}
