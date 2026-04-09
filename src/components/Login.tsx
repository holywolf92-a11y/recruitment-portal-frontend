import { useState } from 'react';
import { AlertCircle, ArrowRight, Briefcase, Building2, Eye, EyeOff, Lock, Mail, ShieldCheck, Sparkles, Users } from 'lucide-react';
import { useAuth } from '../lib/authContext';

const PORTAL_ROWS = [
  {
    icon: Building2,
    title: 'Internal operations',
    description: 'Admins and workers land in operational dashboards with role-aware navigation and controls.',
  },
  {
    icon: Users,
    title: 'External portals',
    description: 'Candidates and partners are redirected into dedicated self-service workspaces after authentication.',
  },
  {
    icon: Briefcase,
    title: 'Single auth layer',
    description: 'Email-password and Google sign-in both resolve into the same role routing already active in production.',
  },
];

export function Login() {
  const { signIn, signInWithGoogle } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await signIn(email, password);
    } catch (err: any) {
      setError(err?.message || 'Sign in failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setGoogleLoading(true);

    try {
      await signInWithGoogle(window.location.origin);
    } catch (err: any) {
      setError(err?.message || 'Google sign in failed');
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.16),_transparent_26%),radial-gradient(circle_at_85%_12%,_rgba(249,115,22,0.10),_transparent_18%),linear-gradient(180deg,_#f5f7fb_0%,_#eef6ff_48%,_#f7fafc_100%)] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="rounded-[34px] border border-white/70 bg-white/82 p-3 shadow-[0_30px_120px_rgba(15,23,42,0.10)] backdrop-blur-xl sm:p-4 lg:p-5">
          <section className="rounded-[28px] bg-[#fdfdfb] p-6 ring-1 ring-slate-200/80 sm:p-7 lg:p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-800">
                    <ShieldCheck className="h-4 w-4" />
                    Secure Sign In
                  </div>
                  <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 sm:text-[2.2rem]">Access your Falisha workspace</h1>
                </div>
                <div className="hidden rounded-2xl bg-slate-950 px-4 py-3 text-right text-white sm:block">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-sky-300">Live Routing</p>
                  <p className="mt-1 text-sm text-slate-200">Admin, worker, partner, candidate</p>
                </div>
              </div>

              <p className="mt-4 max-w-xl text-sm leading-6 text-slate-600">
                Use email and password or continue with Google. After authentication, Falisha resolves your role and sends you into the right portal without a second handoff screen.
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Fastest Path</p>
                  <p className="mt-2 text-sm text-slate-900">Google sign-in is active and returns straight into the production app shell.</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Need Manual Access</p>
                  <p className="mt-2 text-sm text-slate-900">Email-password sign-in remains available for managed portal accounts and role-specific operations.</p>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                <button
                  type="button"
                  onClick={() => void handleGoogleSignIn()}
                  disabled={googleLoading || isLoading}
                  className="inline-flex w-full items-center justify-center gap-3 rounded-2xl border border-slate-300 bg-white px-5 py-3.5 text-sm font-medium text-slate-900 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
                    <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.5 3.9-5.5 3.9-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.2.8 3.9 1.5l2.7-2.6C17 3.2 14.8 2.2 12 2.2 6.8 2.2 2.6 6.4 2.6 11.6S6.8 21 12 21c6.9 0 9.1-4.8 9.1-7.3 0-.5-.1-.9-.1-1.3H12Z" />
                    <path fill="#4285F4" d="M3.6 7.1l3.2 2.4C7.7 7.6 9.7 6 12 6c1.9 0 3.2.8 3.9 1.5l2.7-2.6C17 3.2 14.8 2.2 12 2.2c-3.6 0-6.7 2-8.4 4.9Z" />
                    <path fill="#FBBC05" d="M12 21c2.7 0 5-.9 6.7-2.5l-3.1-2.6c-.8.6-1.9 1.1-3.6 1.1-3.8 0-5.2-2.5-5.5-3.8l-3.3 2.5C4.9 18.8 8.2 21 12 21Z" />
                    <path fill="#34A853" d="M3.2 15.7l3.3-2.5c-.2-.6-.4-1.1-.4-1.7s.1-1.2.4-1.7L3.2 7.3c-.7 1.3-1.1 2.8-1.1 4.3s.4 3 1.1 4.1Z" />
                  </svg>
                  {googleLoading ? 'Redirecting to Google...' : 'Continue with Google'}
                </button>

                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-slate-200" />
                  <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Or use email</span>
                  <div className="h-px flex-1 bg-slate-200" />
                </div>
              </div>

              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Work email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 pl-12 pr-4 py-3.5 text-slate-900 outline-none transition focus:border-sky-500 focus:bg-white focus:ring-4 focus:ring-sky-100"
                  placeholder="name@falisha.com"
                  required
                />
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="block text-sm font-medium text-slate-700">Password</label>
                <span className="text-xs text-slate-400">Role is resolved after sign in</span>
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 pl-12 pr-12 py-3.5 text-slate-900 outline-none transition focus:border-sky-500 focus:bg-white focus:ring-4 focus:ring-sky-100"
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  disabled={isLoading || googleLoading}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600" />
                <div>
                  <p className="font-medium text-red-900">Authentication failed</p>
                  <p className="mt-1">{error}</p>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || googleLoading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-3.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? (
                <>
                  <span className="h-5 w-5 rounded-full border-2 border-white/70 border-t-transparent animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  Continue
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
              </form>

              <div className="mt-6 rounded-[24px] border border-slate-200 bg-slate-50 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Need access?</p>
                <p className="mt-3 text-sm leading-6 text-slate-600">Candidate onboarding still uses the secure link sent by email. If you need a new portal account or role changes, contact Falisha operations.</p>
              </div>
              <div className="mt-6 grid gap-3 lg:grid-cols-3">
                {PORTAL_ROWS.map(({ icon: Icon, title, description }) => (
                  <div key={title} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/60">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-sky-300">
                      <Icon className="h-5 w-5" />
                    </div>
                    <p className="mt-4 text-sm font-semibold text-slate-950">{title}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
                  </div>
                ))}
              </div>
          </section>
        </div>
      </div>
    </div>
  );
}