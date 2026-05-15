import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';

export function Navbar() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  return (
    <header className="sticky top-0 z-30 backdrop-blur-md bg-ink-900/70 border-b border-white/5">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link to={user ? '/dashboard' : '/'} className="flex items-center gap-3">
          <Logo />
          <span className="display text-xl font-bold tracking-widest gradient-text">ASCEND</span>
        </Link>
        <nav className="flex items-center gap-2">
          {user ? (
            <>
              <div className="hidden sm:flex items-center gap-3 mr-3">
                <LevelBadge level={user.level} />
                <span className="chip" title="Streak">🔥 {user.streak}d</span>
                <span className="chip" title="XP">✦ {user.xp} XP</span>
              </div>
              <Link to="/dashboard" className="btn-ghost text-sm">Dashboard</Link>
              <Link to="/goals/new" className="btn-primary text-sm">+ New Goal</Link>
              <button
                className="btn-ghost text-sm"
                onClick={() => { logout(); nav('/'); }}
              >Logout</button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn-ghost text-sm">Log in</Link>
              <Link to="/signup" className="btn-primary text-sm">Get started</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

function LevelBadge({ level }: { level: number }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-br from-gold-400 to-gold-600 text-ink-900 px-3 py-1 text-xs font-bold shadow-glow-gold"
      title="Level"
    >
      LV {level}
    </span>
  );
}

function Logo() {
  return (
    <svg width="32" height="32" viewBox="0 0 64 64" className="drop-shadow-[0_0_8px_rgba(86,181,255,0.6)]">
      <defs>
        <radialGradient id="lg">
          <stop offset="0%" stopColor="#ffd76b" />
          <stop offset="60%" stopColor="#56b5ff" />
          <stop offset="100%" stopColor="#1873f5" />
        </radialGradient>
      </defs>
      <polygon points="32,2 39,24 62,24 43,38 50,60 32,46 14,60 21,38 2,24 25,24" fill="url(#lg)" />
    </svg>
  );
}
