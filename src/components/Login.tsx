import { useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Building2,
  CircleCheckBig,
  Eye,
  EyeOff,
  Lock,
  Mail,
  MessageCircle,
  TrendingUp,
  UserRound,
  Globe,
  Award,
  Clock3,
} from 'lucide-react';
import { useAuth } from '../lib/authContext';

const heroStats = [
  { value: '10K+', label: 'Jobs posted', Icon: TrendingUp },
  { value: '50+', label: 'Countries', Icon: Globe },
  { value: '95%', label: 'Success rate', Icon: Award },
  { value: '24/7', label: 'Support', Icon: Clock3 },
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
  const [portalType, setPortalType] = useState<'individual' | 'agency'>('agency');
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
    <div className="falisha-auth-shell min-h-screen bg-white">
      <section className="falisha-auth-form-pane relative flex min-h-screen w-full items-center overflow-hidden bg-white px-6 py-10 sm:px-8 lg:px-14 xl:px-20">
        <div className="absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top,rgba(37,99,235,0.08),transparent_55%)] lg:hidden" />
        <div className="relative mx-auto w-full max-w-[430px]">
          <div className="mb-10 sm:mb-12">
            <span className="text-2xl font-bold tracking-tight text-slate-900">FALISHA JOBS</span>
          </div>

          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-[-0.04em] text-slate-900 sm:text-[2.7rem]">
              Welcome back
            </h1>
            <p className="mt-2 text-base leading-7 text-slate-500">
              Sign in to your account and explore opportunities.
            </p>
          </div>

          <div className="mb-6">
            <p className="mb-3 text-sm text-slate-600">I am signing in as:</p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setPortalType('individual')}
                className={`falisha-auth-toggle flex-1 rounded-xl border-2 px-4 py-3 transition-all duration-200 ${
                  !isAgency
                    ? 'falisha-auth-toggle-individual-active border-slate-300 bg-slate-50 text-slate-900'
                    : 'falisha-auth-toggle-idle border-slate-200 bg-white text-slate-600'
                }`}
              >
                <span className="flex items-center justify-center gap-2 font-medium">
                  <UserRound className="h-5 w-5" />
                  Individual
                </span>
              </button>
              <button
                type="button"
                onClick={() => setPortalType('agency')}
                className={`falisha-auth-toggle flex-1 rounded-xl border-2 px-4 py-3 transition-all duration-200 ${
                  isAgency
                    ? 'falisha-auth-toggle-partner-active border-cyan-500 bg-cyan-500 text-white'
                    : 'falisha-auth-toggle-idle border-slate-200 bg-white text-slate-600'
                }`}
              >
                <span className="flex items-center justify-center gap-2 font-medium">
                  <Building2 className="h-5 w-5" />
                  Partner
                </span>
              </button>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              Individual is for candidates. Partner is for agency and partner accounts.
            </p>
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-900">
                Email <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    if (emailError) setEmailError('');
                  }}
                  className="h-12 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-4 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
                  placeholder="your.email@example.com"
                  autoComplete="email"
                />
              </div>
              {emailError && <p className="mt-2 text-sm text-red-600">{emailError}</p>}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-900">
                Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    if (passwordError) setPasswordError('');
                  }}
                  className="h-12 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-10 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
                  placeholder="Enter your password"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {passwordError && <p className="mt-2 text-sm text-red-600">{passwordError}</p>}
            </div>

            <div className="flex items-center justify-between gap-3">
              <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(event) => setRememberMe(event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-cyan-500 focus:ring-cyan-500"
                />
                Remember me
              </label>
              <button type="button" className="falisha-auth-link text-sm font-medium transition">
                Forgot password?
              </button>
            </div>

            {error && (
              <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-500" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || googleLoading}
              className="falisha-auth-primary inline-flex h-12 w-full items-center justify-center rounded-xl px-5 text-base font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? (
                <span className="inline-flex items-center gap-2">
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/70 border-t-transparent" />
                  Signing in...
                </span>
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-sm text-slate-500">
              <span className="bg-white px-4">or continue with</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void handleGoogleSignIn()}
            disabled={googleLoading || isLoading}
            className="falisha-auth-google inline-flex h-12 w-full items-center justify-center gap-3 rounded-xl border px-5 text-base font-medium text-slate-700 transition disabled:cursor-not-allowed disabled:opacity-60"
          >
              <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 flex-shrink-0">
                <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.5 3.9-5.5 3.9-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.2.8 3.9 1.5l2.7-2.6C17 3.2 14.8 2.2 12 2.2 6.8 2.2 2.6 6.4 2.6 11.6S6.8 21 12 21c6.9 0 9.1-4.8 9.1-7.3 0-.5-.1-.9-.1-1.3H12Z" />
                <path fill="#4285F4" d="M3.6 7.1l3.2 2.4C7.7 7.6 9.7 6 12 6c1.9 0 3.2.8 3.9 1.5l2.7-2.6C17 3.2 14.8 2.2 12 2.2c-3.6 0-6.7 2-8.4 4.9Z" />
                <path fill="#FBBC05" d="M12 21c2.7 0 5-.9 6.7-2.5l-3.1-2.6c-.8.6-1.9 1.1-3.6 1.1-3.8 0-5.2-2.5-5.5-3.8l-3.3 2.5C4.9 18.8 8.2 21 12 21Z" />
                <path fill="#34A853" d="M3.2 15.7l3.3-2.5c-.2-.6-.4-1.1-.4-1.7s.1-1.2.4-1.7L3.2 7.3c-.7 1.3-1.1 2.8-1.1 4.3s.4 3 1.1 4.1Z" />
              </svg>
              {googleLoading ? 'Redirecting to Google...' : 'Sign in with Google'}
          </button>

          <p className="mt-6 text-center text-sm text-slate-600">
            Don&apos;t have an account?{' '}
            <a href="mailto:info@falisha.com?subject=Portal%20signup" className="falisha-auth-link font-medium transition">
                Sign up for free
            </a>
          </p>
          <p className="mt-4 text-center text-xs leading-6 text-slate-500">
            By signing in, you agree to our{' '}
            <a href="#" className="falisha-auth-link transition">
                Terms of Service
            </a>{' '}
            and{' '}
            <a href="#" className="falisha-auth-link transition">
                Privacy Policy
            </a>
          </p>

          <div className="mt-8 lg:hidden">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
              <div className="inline-flex items-center gap-3 rounded-full bg-white px-2 py-2 shadow-sm">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-500 text-white">
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

      <section className="falisha-auth-marketing-pane relative overflow-hidden px-8 py-12 text-white xl:px-12">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(255,255,255,0.18),transparent_22%),radial-gradient(circle_at_88%_84%,rgba(255,255,255,0.12),transparent_16%)]" />

        <div className="relative z-10 flex w-full flex-col justify-between">
          <div className="mx-auto w-full max-w-[760px]">
            <div className="mb-8 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-blue-600 shadow-lg">
              <div className="flex gap-0.5">
                {[...Array(5)].map((_, index) => (
                  <span key={index} className="text-sm text-green-500">★</span>
                ))}
              </div>
              <span className="text-sm font-semibold">Verified</span>
              <span className="h-4 w-px bg-slate-300" />
              <span className="text-sm">Trusted by <strong>5000+ job seekers</strong></span>
            </div>

            <div className="flex items-start justify-between gap-8">
              <div>
                <h2 className="text-4xl font-bold tracking-[-0.04em]">Partner with Falisha Manpower</h2>
                <p className="mt-4 max-w-[500px] text-lg text-blue-50">
                  Upload candidates, manage recruitment, and grow your business globally.
                </p>
                <div className="mt-8 grid gap-3">
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

            <div className="mt-10 overflow-hidden rounded-2xl bg-white shadow-2xl">
              <div className="bg-slate-100 px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-red-400" />
                  <span className="h-3 w-3 rounded-full bg-yellow-400" />
                  <span className="h-3 w-3 rounded-full bg-green-400" />
                  <div className="ml-4 flex flex-1 items-center gap-2 rounded bg-white px-3 py-1.5 text-xs text-slate-500">
                    <Lock className="h-3 w-3" />
                    <span>falishajobs.com/dashboard</span>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-blue-500 to-cyan-400 p-6">
                <div className="rounded-xl bg-white p-6 shadow-lg">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="rounded-lg bg-blue-100 p-2">
                      <CircleCheckBig className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">Your recruitment journey</h3>
                    </div>
                  </div>

                  <div className="mb-6 flex items-center justify-between gap-2">
                    {timelineSteps.map(({ step, label, active }, index) => (
                      <div key={step} className="flex flex-1 items-center">
                        <div className="flex flex-col items-center">
                          <div className={`flex h-12 w-12 items-center justify-center rounded-full font-bold ${active ? 'bg-blue-500 text-white' : 'bg-slate-200 text-slate-600'}`}>
                            {step}
                          </div>
                          <span className="mt-2 text-xs text-slate-600">{label}</span>
                        </div>
                        {index < timelineSteps.length - 1 && <div className={`mx-2 h-1 flex-1 rounded ${active ? 'bg-blue-200' : 'bg-slate-200'}`} />}
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between rounded-xl bg-blue-50 p-4">
                    <div className="flex items-center gap-3">
                      <div className="rounded-full bg-blue-500 p-2 text-white">
                        <CircleCheckBig className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-xs font-medium uppercase tracking-[0.12em] text-blue-600">Next step</p>
                        <p className="text-sm font-semibold text-slate-900">Complete your profile</p>
                      </div>
                    </div>
                    <ArrowRight className="h-5 w-5 text-blue-500" />
                  </div>
                </div>

                <div className="mt-4 rounded-xl bg-white p-4 shadow-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="rounded-full bg-blue-100 p-2">
                        <TrendingUp className="h-5 w-5 text-blue-600" />
                      </div>
                      <span className="text-sm font-medium text-slate-900">Watch intro</span>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-medium text-blue-600">Free consultation</p>
                      <p className="text-xs text-cyan-500">Book now →</p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl bg-white/20 p-4 backdrop-blur-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-blue-100">Candidate upload</p>
                    <p className="mt-2 text-sm font-medium text-white">12 CVs received today</p>
                  </div>
                  <div className="rounded-xl bg-white/20 p-4 backdrop-blur-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-blue-100">CV processing</p>
                    <p className="mt-2 text-sm font-medium text-white">8 files parsed by AI</p>
                  </div>
                  <div className="rounded-xl bg-white/20 p-4 backdrop-blur-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-blue-100">Status tracking</p>
                    <p className="mt-2 text-sm font-medium text-white">3 candidates awaiting review</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mx-auto mt-12 grid w-full max-w-[760px] grid-cols-4 gap-6">
            {heroStats.map(({ value, label, Icon }) => (
              <div key={label} className="text-center">
                <div className="mb-2 flex items-center justify-center">
                  <Icon className="h-6 w-6" />
                </div>
                <p className="text-3xl font-bold">{value}</p>
                <p className="text-sm text-blue-100">{label}</p>
              </div>
            ))}
          </div>

          <button className="falisha-auth-chat absolute bottom-8 right-8 flex items-center gap-2 rounded-full px-4 py-3 text-white shadow-xl transition-colors">
            <span className="h-2 w-2 rounded-full bg-red-500" />
            <span className="text-sm font-medium">Chat with our experts</span>
          </button>
        </div>
      </section>
    </div>
  );
}
