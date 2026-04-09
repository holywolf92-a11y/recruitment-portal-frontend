import { useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Building2,
  CircleCheckBig,
  Eye,
  EyeOff,
  Headphones,
  Lock,
  Mail,
  MessageCircle,
  Plane,
  UserRound,
} from 'lucide-react';
import { useAuth } from '../lib/authContext';

const heroStats = [
  { value: '500+', label: 'Candidates Placed' },
  { value: '20+', label: 'Countries' },
  { value: '98%', label: 'Success Rate' },
  { value: '24/7', label: 'Support' },
];

const timelineSteps = [
  { step: '1', label: 'Sign up', active: true },
  { step: '2', label: 'Apply', active: false },
  { step: '3', label: 'Relocate', active: false },
];

const trustIndicators = [
  'Trusted by 5000+ candidates',
  'Verified recruitment system',
  'AI-powered CV processing',
];

export function Login() {
  const { signIn, signInWithGoogle } = useAuth();
  const [portalType, setPortalType] = useState<'individual' | 'agency'>('individual');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const isAgency = portalType === 'agency';

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    const nextEmailError = email.trim() ? '' : 'Email is required';
    const nextPasswordError = password.trim() ? '' : 'Password is required';
    setEmailError(nextEmailError);
    setPasswordError(nextPasswordError);

    if (nextEmailError || nextPasswordError) {
      return;
    }

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
    <div className="falisha-login-page min-h-screen bg-slate-50 lg:bg-white">
      <div className="falisha-login-shell mx-auto min-h-screen max-w-[1520px]">
        <section className="falisha-login-left relative flex min-h-screen items-center overflow-hidden bg-white px-5 py-6 sm:px-8 sm:py-8 lg:px-14 xl:px-20">
          <div className="absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top,rgba(37,99,235,0.08),transparent_55%)] lg:hidden" />
          <div className="relative mx-auto w-full max-w-[410px]">
            <div className="mb-8 sm:mb-10">
              <span className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-900">Falisha Manpower</span>
            </div>

            <h1 className="text-[2rem] font-bold tracking-[-0.045em] text-slate-900 sm:text-[2.55rem]">
              Welcome back
            </h1>
            <p className="mt-3 text-[1rem] leading-7 text-slate-500 sm:text-[1.04rem]">
              Sign in to manage your recruitment operations.
            </p>

            <div className="mt-9 sm:mt-10">
              <p className="mb-3.5 text-[0.95rem] font-medium text-slate-600">I am signing in as:</p>
              <div className="grid grid-cols-2 gap-2.5 rounded-[18px] bg-slate-100/90 p-1.5">
                <button
                  type="button"
                  onClick={() => setPortalType('individual')}
                  className={`inline-flex items-center justify-center gap-2 rounded-[14px] px-4 py-3.5 text-[0.98rem] font-semibold transition-all duration-200 ${
                    !isAgency
                      ? 'bg-[#1da1f2] text-white shadow-[0_16px_30px_rgba(29,161,242,0.26)]'
                      : 'bg-transparent text-slate-700 hover:bg-white hover:shadow-sm'
                  }`}
                >
                  <UserRound className="h-4 w-4" />
                  Individual
                </button>
                <button
                  type="button"
                  onClick={() => setPortalType('agency')}
                  className={`inline-flex items-center justify-center gap-2 rounded-[14px] px-4 py-3.5 text-[0.98rem] font-semibold transition-all duration-200 ${
                    isAgency
                      ? 'bg-[#1da1f2] text-white shadow-[0_16px_30px_rgba(29,161,242,0.26)]'
                      : 'bg-transparent text-slate-700 hover:bg-white hover:shadow-sm'
                  }`}
                >
                  <Building2 className="h-4 w-4" />
                  Partner
                </button>
              </div>
              <p className="mt-3 text-[0.92rem] leading-6 text-slate-500">
                Individual is for candidates. Partner is for agency and partner accounts. Admin and worker users still sign in here and are routed internally.
              </p>
            </div>

            <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-5">
              <div>
                <label className="mb-2 block text-[0.94rem] font-semibold text-slate-700">
                  Email <span className="text-[#ff5a5a]">*</span>
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => {
                      setEmail(event.target.value);
                      if (emailError) setEmailError('');
                    }}
                    className="w-full rounded-[14px] border border-slate-200 bg-white py-3.5 pl-12 pr-4 text-[1rem] text-slate-900 shadow-[0_2px_6px_rgba(15,23,42,0.02)] outline-none transition placeholder:text-slate-400 focus:border-[#1da1f2] focus:ring-4 focus:ring-sky-100"
                    placeholder="your.email@example.com"
                    autoComplete="email"
                  />
                </div>
                {emailError && <p className="mt-2 text-sm text-red-600">{emailError}</p>}
              </div>

              <div>
                <label className="mb-2 block text-[0.94rem] font-semibold text-slate-700">
                  Password <span className="text-[#ff5a5a]">*</span>
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(event) => {
                      setPassword(event.target.value);
                      if (passwordError) setPasswordError('');
                    }}
                    className="w-full rounded-[14px] border border-slate-200 bg-white py-3.5 pl-12 pr-14 text-[1rem] text-slate-900 shadow-[0_2px_6px_rgba(15,23,42,0.02)] outline-none transition placeholder:text-slate-400 focus:border-[#1da1f2] focus:ring-4 focus:ring-sky-100"
                    placeholder="Enter your password"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {passwordError && <p className="mt-2 text-sm text-red-600">{passwordError}</p>}
              </div>

              <div className="flex flex-col gap-3 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
                <label className="inline-flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(event) => setRememberMe(event.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-[#1da1f2] focus:ring-[#1da1f2]"
                  />
                  Remember me
                </label>
                <button type="button" className="text-left font-medium text-[#1da1f2] transition hover:text-sky-700 sm:text-right">
                  Forgot password?
                </button>
              </div>

              {error && (
                <div className="flex items-start gap-3 rounded-[16px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-500" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading || googleLoading}
                className="inline-flex w-full items-center justify-center rounded-[14px] bg-[#1da1f2] px-5 py-3.5 text-[1rem] font-semibold text-white shadow-[0_18px_34px_rgba(29,161,242,0.24)] transition duration-200 hover:scale-[1.01] hover:bg-[#1093e2] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100"
              >
                {isLoading ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="h-5 w-5 rounded-full border-2 border-white/70 border-t-transparent animate-spin" />
                    Signing in...
                  </span>
                ) : (
                  'Sign In'
                )}
              </button>
            </form>

            <div className="mt-7 flex items-center gap-4 text-sm text-slate-400">
              <div className="h-px flex-1 bg-slate-200" />
              <span>or continue with</span>
              <div className="h-px flex-1 bg-slate-200" />
            </div>

            <button
              type="button"
              onClick={() => void handleGoogleSignIn()}
              disabled={googleLoading || isLoading}
              className="mt-5 inline-flex w-full items-center justify-center gap-3 rounded-[14px] border border-slate-200 bg-white px-5 py-3.5 text-[1rem] font-semibold text-slate-700 shadow-[0_2px_10px_rgba(15,23,42,0.03)] transition duration-200 hover:border-slate-300 hover:bg-slate-50 hover:scale-[1.005] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 flex-shrink-0">
                <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.5 3.9-5.5 3.9-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.2.8 3.9 1.5l2.7-2.6C17 3.2 14.8 2.2 12 2.2 6.8 2.2 2.6 6.4 2.6 11.6S6.8 21 12 21c6.9 0 9.1-4.8 9.1-7.3 0-.5-.1-.9-.1-1.3H12Z" />
                <path fill="#4285F4" d="M3.6 7.1l3.2 2.4C7.7 7.6 9.7 6 12 6c1.9 0 3.2.8 3.9 1.5l2.7-2.6C17 3.2 14.8 2.2 12 2.2c-3.6 0-6.7 2-8.4 4.9Z" />
                <path fill="#FBBC05" d="M12 21c2.7 0 5-.9 6.7-2.5l-3.1-2.6c-.8.6-1.9 1.1-3.6 1.1-3.8 0-5.2-2.5-5.5-3.8l-3.3 2.5C4.9 18.8 8.2 21 12 21Z" />
                <path fill="#34A853" d="M3.2 15.7l3.3-2.5c-.2-.6-.4-1.1-.4-1.7s.1-1.2.4-1.7L3.2 7.3c-.7 1.3-1.1 2.8-1.1 4.3s.4 3 1.1 4.1Z" />
              </svg>
              {googleLoading ? 'Redirecting to Google...' : 'Sign in with Google'}
            </button>

            <p className="mt-6 text-center text-[0.96rem] text-slate-500">
              Don&apos;t have an account?{' '}
              <a href="mailto:info@falisha.com?subject=Portal%20signup" className="font-semibold text-[#1da1f2] transition hover:text-sky-700">
                Sign up for free
              </a>
            </p>
            <p className="mt-3 text-center text-xs leading-6 text-slate-400">
              By signing in, you agree to our{' '}
              <a href="#" className="text-[#1d74dc] underline decoration-transparent underline-offset-2 transition hover:decoration-current">
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="#" className="text-[#1d74dc] underline decoration-transparent underline-offset-2 transition hover:decoration-current">
                Privacy Policy
              </a>
            </p>

            <div className="mt-7 lg:hidden">
              <div className="rounded-[24px] border border-white/60 bg-white/90 p-4 shadow-[0_18px_40px_rgba(15,23,42,0.10)] backdrop-blur">
                <div className="inline-flex items-center gap-3 rounded-full bg-white px-1 py-1">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1da1f2] text-white shadow-sm">
                    <MessageCircle className="h-5 w-5" />
                  </span>
                  <span className="pr-3">
                    <span className="block text-sm font-semibold text-slate-800">Chat with our experts</span>
                    <span className="block text-xs text-slate-500">Get help with onboarding</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="falisha-login-right relative overflow-hidden px-5 py-7 text-white sm:px-8 lg:px-12 lg:py-10 xl:px-16">
          <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_18%_18%,rgba(255,255,255,0.18),transparent_22%),radial-gradient(circle_at_88%_84%,rgba(255,255,255,0.12),transparent_16%)]" />

          <div className="relative mx-auto flex h-full max-w-[760px] flex-col">
            <div className="flex items-start justify-between gap-6">
              <div>
                <p className="text-[2rem] font-bold tracking-[-0.045em] sm:text-[2.6rem]">Partner with Falisha Manpower</p>
                <p className="mt-3 max-w-[460px] text-[1.03rem] leading-8 text-blue-100">
                  Upload candidates, manage recruitment, and grow your business globally.
                </p>
                <div className="mt-6 grid gap-2">
                  {trustIndicators.map((item) => (
                    <div key={item} className="inline-flex items-center gap-2 text-sm font-medium text-blue-50">
                      <CircleCheckBig className="h-4 w-4 text-emerald-300" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[20px] bg-white px-5 py-4 text-slate-900 shadow-[0_22px_50px_rgba(9,24,68,0.20)] ring-1 ring-white/50">
                <div className="flex items-center gap-1 text-emerald-500">
                  <span className="text-xs tracking-[0.18em]">★★★★★</span>
                  <span className="text-sm font-bold">Verified</span>
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600">Trusted by more than</p>
                <p className="text-[1.55rem] font-bold tracking-[-0.03em] text-slate-900">5000 expats!</p>
              </div>
            </div>

            <div className="mt-8 rounded-[34px] bg-white/95 p-3 text-slate-900 shadow-2xl backdrop-blur sm:mt-10 sm:p-5 xl:mt-12">
              <div className="overflow-hidden rounded-[28px] bg-slate-50 shadow-inner">
                <div className="flex items-center gap-3 border-b border-slate-100 bg-white px-4 py-3 sm:px-6">
                  <div className="flex gap-2">
                    <span className="h-3 w-3 rounded-full bg-[#ff6b6b]" />
                    <span className="h-3 w-3 rounded-full bg-[#ffd84d]" />
                    <span className="h-3 w-3 rounded-full bg-[#67d17b]" />
                  </div>
                  <div className="ml-2 flex-1 rounded-xl bg-slate-50 px-4 py-2 text-xs text-slate-500 shadow-sm">
                    falishajobs.up.railway.app/partner/dashboard
                  </div>
                </div>

                <div className="overflow-hidden rounded-b-[28px]">
                  <div className="flex items-center justify-between gap-4 bg-white px-4 py-4 sm:px-6">
                    <div className="flex items-center gap-3 text-sm font-semibold text-slate-800">
                      <span>Falisha</span>
                      <span className="text-slate-300">|</span>
                      <span>FalishaMove</span>
                    </div>
                    <button className="rounded-full bg-[#1da1f2] px-4 py-2 text-xs font-semibold text-white shadow-sm">
                      Relocate now
                    </button>
                  </div>

                  <div className="bg-gradient-to-b from-sky-500 to-blue-600 px-4 py-6 sm:px-8 sm:py-7">
                    <div className="flex items-start gap-3 text-white">
                      <div className="mt-1 text-xl">✈️</div>
                      <div>
                        <p className="text-[1.45rem] font-bold tracking-[-0.03em] sm:text-[1.7rem]">FalishaMove → Partner Portal</p>
                        <p className="mt-2 text-[0.98rem] text-blue-100">Welcome back! Continue your recruitment journey.</p>
                      </div>
                    </div>

                    <div className="mt-7 grid gap-4 lg:grid-cols-2">
                      <div className="rounded-[28px] bg-white px-5 py-6 text-slate-900 shadow-[0_18px_40px_rgba(7,59,133,0.12)] sm:px-6">
                        <div className="flex items-center gap-2 text-lg font-bold">
                          <CircleCheckBig className="h-5 w-5 text-[#1da1f2]" />
                          Your visa timeline
                        </div>

                        <div className="mt-6 grid grid-cols-3 gap-4">
                          {timelineSteps.map(({ step, label, active }, index) => (
                            <div key={step} className="relative text-center">
                              <div className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold ${active ? 'bg-[#1da1f2] text-white' : 'bg-slate-200 text-slate-600'}`}>
                                {step}
                              </div>
                              {index < timelineSteps.length - 1 && (
                                <div className={`absolute left-[calc(50%+26px)] top-6 h-1 w-[calc(100%-52px)] rounded-full ${active ? 'bg-[#7fd1ff]' : 'bg-slate-200'}`} />
                              )}
                              <p className="mt-3 text-sm font-medium text-slate-600">{label}</p>
                            </div>
                          ))}
                        </div>

                        <div className="mt-7 flex items-center justify-between rounded-[20px] bg-[#eef7ff] px-4 py-4 sm:px-5">
                          <div className="flex items-center gap-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#1da1f2] text-white shadow-sm">
                              <CircleCheckBig className="h-5 w-5" />
                            </div>
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#1da1f2]">Next step</p>
                              <p className="mt-1 text-xl font-semibold tracking-[-0.02em] text-slate-700">Complete your profile</p>
                            </div>
                          </div>
                          <ArrowRight className="h-6 w-6 text-[#1da1f2]" />
                        </div>
                      </div>

                      <div className="grid gap-4">
                        <div className="rounded-[24px] bg-white/15 p-4 ring-1 ring-white/20 backdrop-blur-sm">
                          <p className="text-sm font-semibold text-white/90">Dashboard preview</p>
                          <div className="mt-4 space-y-3">
                            <div className="rounded-2xl bg-white px-4 py-3 text-slate-700 shadow-sm">
                              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#1d74dc]">Candidate upload</p>
                              <p className="mt-1 text-sm font-medium">12 CVs received today</p>
                            </div>
                            <div className="rounded-2xl bg-white px-4 py-3 text-slate-700 shadow-sm">
                              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#1d74dc]">CV processing</p>
                              <p className="mt-1 text-sm font-medium">8 files parsed by AI</p>
                            </div>
                            <div className="rounded-2xl bg-white px-4 py-3 text-slate-700 shadow-sm">
                              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#1d74dc]">Status tracking</p>
                              <p className="mt-1 text-sm font-medium">3 candidates awaiting review</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-3 bg-white px-4 py-4 sm:grid-cols-2 sm:px-6 sm:py-5">
                    <button className="inline-flex items-center justify-center gap-2 rounded-[18px] border border-slate-200 bg-white px-5 py-4 text-base font-medium text-slate-700 transition hover:bg-slate-50">
                      <Plane className="h-4 w-4 text-[#1da1f2]" />
                      Watch intro
                    </button>
                    <button className="inline-flex items-center justify-center gap-3 rounded-[18px] bg-[#eef7ff] px-5 py-4 text-left text-slate-700 transition hover:bg-[#e4f2ff]">
                      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#1da1f2] text-white shadow-sm">
                        <Headphones className="h-5 w-5" />
                      </span>
                      <span>
                        <span className="block text-sm text-slate-500">Free consultation</span>
                        <span className="block text-base font-semibold text-[#1d74dc]">Book now →</span>
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4 xl:mt-auto">
              {heroStats.map(({ value, label }) => (
                <div key={label} className="border-t border-white/20 pt-4 text-center sm:text-left">
                  <p className="text-[1.95rem] font-bold tracking-[-0.04em] text-white">{value}</p>
                  <p className="mt-1 text-sm leading-6 text-blue-100">{label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="pointer-events-none absolute bottom-5 right-5 hidden items-center gap-3 lg:flex">
            <div className="pointer-events-auto inline-flex items-center gap-3 rounded-full bg-white px-5 py-3 text-slate-800 shadow-[0_18px_40px_rgba(9,24,68,0.24)]">
              <span className="text-sm font-semibold">Chat with our experts</span>
            </div>
            <button className="pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#08111f] text-white shadow-[0_18px_40px_rgba(9,24,68,0.28)] transition hover:bg-[#111d31]">
              <MessageCircle className="h-6 w-6" />
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
