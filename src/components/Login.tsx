import { useState } from 'react';
import { AlertCircle, Eye, EyeOff, Lock, Mail, Users, Building2, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../lib/authContext';

export function Login() {
  const { signIn, signInWithGoogle } = useAuth();
  const [portalType, setPortalType] = useState<'external' | 'internal'>('external');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
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
      setError(err?.message || 'Incorrect email or password.');
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
      setError(err?.message || 'Google sign in failed.');
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* ── LEFT: Form panel ── */}
      <div className="w-full lg:w-[52%] flex flex-col justify-center px-6 py-10 sm:px-10 lg:px-16 xl:px-24 bg-white min-h-screen lg:min-h-0">
        {/* Logo */}
        <div className="mb-8">
          <span className="text-sm font-black tracking-[0.25em] uppercase text-slate-900">Falisha Manpower</span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Welcome back</h1>
        <p className="mt-2 text-sm text-slate-500">Sign in to manage your recruitment portal.</p>

        {/* Portal type tabs */}
        <div className="mt-7">
          <p className="text-xs font-semibold text-slate-500 mb-3">I am signing in as:</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPortalType('external')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all border ${
                portalType === 'external'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400'
              }`}
            >
              <Users className="h-4 w-4" />
              Candidate / Partner
            </button>
            <button
              type="button"
              onClick={() => setPortalType('internal')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all border ${
                portalType === 'internal'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400'
              }`}
            >
              <Building2 className="h-4 w-4" />
              Admin / Staff
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-7 space-y-4">
          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Email <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-300 bg-white text-slate-900 text-sm placeholder:text-slate-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                placeholder="your.email@example.com"
                required
                autoComplete="email"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-11 py-3 rounded-lg border border-slate-300 bg-white text-slate-900 text-sm placeholder:text-slate-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                placeholder="Enter your password"
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Remember me + Forgot */}
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-slate-600">Remember me</span>
            </label>
            <button type="button" className="text-sm text-blue-600 hover:text-blue-700 font-medium transition">
              Forgot password?
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading || googleLoading}
            className="w-full py-3 rounded-lg bg-blue-600 text-white text-sm font-semibold transition hover:bg-blue-700 active:bg-blue-800 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <span className="h-4 w-4 rounded-full border-2 border-white/60 border-t-transparent animate-spin" />
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="mt-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-slate-200" />
          <span className="text-xs text-slate-400">or continue with</span>
          <div className="h-px flex-1 bg-slate-200" />
        </div>

        {/* Google */}
        <button
          type="button"
          onClick={() => void handleGoogleSignIn()}
          disabled={googleLoading || isLoading}
          className="mt-4 w-full flex items-center justify-center gap-3 py-3 rounded-lg border border-slate-300 bg-white text-sm font-medium text-slate-700 transition hover:bg-slate-50 hover:border-slate-400 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 flex-shrink-0">
            <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.5 3.9-5.5 3.9-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.2.8 3.9 1.5l2.7-2.6C17 3.2 14.8 2.2 12 2.2 6.8 2.2 2.6 6.4 2.6 11.6S6.8 21 12 21c6.9 0 9.1-4.8 9.1-7.3 0-.5-.1-.9-.1-1.3H12Z" />
            <path fill="#4285F4" d="M3.6 7.1l3.2 2.4C7.7 7.6 9.7 6 12 6c1.9 0 3.2.8 3.9 1.5l2.7-2.6C17 3.2 14.8 2.2 12 2.2c-3.6 0-6.7 2-8.4 4.9Z" />
            <path fill="#FBBC05" d="M12 21c2.7 0 5-.9 6.7-2.5l-3.1-2.6c-.8.6-1.9 1.1-3.6 1.1-3.8 0-5.2-2.5-5.5-3.8l-3.3 2.5C4.9 18.8 8.2 21 12 21Z" />
            <path fill="#34A853" d="M3.2 15.7l3.3-2.5c-.2-.6-.4-1.1-.4-1.7s.1-1.2.4-1.7L3.2 7.3c-.7 1.3-1.1 2.8-1.1 4.3s.4 3 1.1 4.1Z" />
          </svg>
          {googleLoading ? 'Redirecting to Google...' : 'Sign in with Google'}
        </button>

        <p className="mt-6 text-center text-xs text-slate-400">
          Need portal access?{' '}
          <a href="mailto:info@falisha.com" className="text-blue-600 hover:text-blue-700 font-medium">
            Contact Falisha operations
          </a>
        </p>
      </div>

      {/* ── RIGHT: Promo panel (hidden on mobile) ── */}
      <div className="hidden lg:flex lg:w-[48%] bg-gradient-to-br from-[#1a56db] via-[#1e3a8a] to-[#1e40af] flex-col justify-between p-10 xl:p-14 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-white/5" />
          <div className="absolute bottom-32 -left-16 w-48 h-48 rounded-full bg-white/5" />
        </div>

        {/* Verified badge */}
        <div className="relative flex justify-end">
          <div className="flex items-start gap-2 rounded-xl bg-white px-4 py-3 shadow-lg">
            <div className="flex gap-0.5 text-amber-400 text-xs mt-0.5">★★★★★</div>
            <div>
              <p className="text-[10px] font-bold text-green-600 uppercase tracking-wide">Verified</p>
              <p className="text-xs font-semibold text-slate-800 leading-tight">Trusted by more than<br /><span className="text-blue-700">1,000+ workers</span></p>
            </div>
          </div>
        </div>

        {/* Heading */}
        <div className="relative mt-8">
          <h2 className="text-3xl xl:text-4xl font-bold text-white leading-tight">
            Your Career<br />Starts Here
          </h2>
          <p className="mt-3 text-blue-200 text-sm leading-relaxed max-w-xs">
            Hundreds of candidates have already found work abroad through Falisha's trusted recruitment network.
          </p>

          {/* Stats */}
          <div className="mt-8 grid grid-cols-3 gap-4">
            {[
              { value: '1,000+', label: 'Deployed' },
              { value: '50+', label: 'Partners' },
              { value: '98%', label: 'Success Rate' },
            ].map(({ value, label }) => (
              <div key={label} className="rounded-xl bg-white/10 px-4 py-3 text-center">
                <p className="text-xl font-bold text-white">{value}</p>
                <p className="text-xs text-blue-200 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Dashboard mockup card */}
        <div className="relative mt-8 rounded-2xl bg-white/10 border border-white/20 p-5 backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
              <span className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
              <span className="h-2.5 w-2.5 rounded-full bg-green-400" />
            </div>
            <div className="flex-1 h-5 rounded-md bg-white/10 flex items-center px-3">
              <span className="text-[10px] text-blue-200">falishajobs.up.railway.app/partner</span>
            </div>
          </div>
          <p className="text-white font-semibold text-sm">Your Recruitment Dashboard</p>
          <p className="text-blue-200 text-xs mt-1">Welcome back! Continue managing your candidates.</p>
          <div className="mt-4 space-y-2">
            {[
              { label: 'Upload candidates', done: true },
              { label: 'Track application status', done: true },
              { label: 'Bulk upload via Excel', done: false },
            ].map(({ label, done }) => (
              <div key={label} className="flex items-center gap-2">
                <CheckCircle2 className={`h-4 w-4 flex-shrink-0 ${done ? 'text-green-400' : 'text-white/30'}`} />
                <span className={`text-xs ${done ? 'text-white' : 'text-white/40'}`}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom links */}
        <div className="relative mt-6 flex gap-3">
          <button className="flex items-center gap-2 rounded-lg border border-white/30 bg-white/10 px-4 py-2.5 text-sm font-medium text-white hover:bg-white/20 transition">
            <span>▶</span> Watch intro
          </button>
          <button className="flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-blue-700 hover:bg-blue-50 transition">
            Free consultation →
          </button>
        </div>
      </div>
    </div>
  );
}