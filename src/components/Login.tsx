import { useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Award,
  Building2,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  Globe,
  Lock,
  Mail,
  MessageCircle,
  TrendingUp,
  User,
} from 'lucide-react';
import { useAuth } from '../lib/authContext';

const heroStats = [
  { value: '10K+', label: 'Jobs posted', Icon: TrendingUp },
  { value: '50+', label: 'Countries', Icon: Globe },
  { value: '95%', label: 'Success rate', Icon: Award },
  { value: '24/7', label: 'Support', Icon: Clock },
];

const timelineSteps = [
  { step: '1', label: 'Sign up', active: true },
  { step: '2', label: 'Apply', active: false },
  { step: '3', label: 'Relocate', active: false },
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
    <div className="falisha-auth-shell">
      <section className="falisha-auth-form-pane">
        <div className="falisha-auth-form-inner">
          <div className="falisha-auth-logo">FALISHA JOBS</div>

          <div className="falisha-auth-heading-block">
            <h1 className="falisha-auth-heading">Welcome back</h1>
            <p className="falisha-auth-subheading">Sign in to your account and explore opportunities.</p>
          </div>

          <div className="falisha-auth-toggle-group">
            <p className="falisha-auth-toggle-label">I am signing in as:</p>
            <div className="falisha-auth-toggle-row">
              <button
                type="button"
                onClick={() => setPortalType('individual')}
                className={`falisha-auth-toggle ${
                  !isAgency
                    ? 'falisha-auth-toggle-individual-active'
                    : 'falisha-auth-toggle-idle'
                }`}
              >
                <span className="falisha-auth-toggle-content">
                  <User className="h-5 w-5" />
                  Individual
                </span>
              </button>
              <button
                type="button"
                onClick={() => setPortalType('agency')}
                className={`falisha-auth-toggle ${
                  isAgency
                    ? 'falisha-auth-toggle-partner-active'
                    : 'falisha-auth-toggle-idle'
                }`}
              >
                <span className="falisha-auth-toggle-content">
                  <Building2 className="h-5 w-5" />
                  Partner
                </span>
              </button>
            </div>
            <p className="falisha-auth-toggle-help">
              Individual is for candidates. Partner is for agency and partner accounts.
            </p>
          </div>

          <form onSubmit={handleSubmit} noValidate className="falisha-auth-form-fields">
            <div className="falisha-auth-field">
              <label className="falisha-auth-field-label">
                Email <span className="text-red-500">*</span>
              </label>
              <div className="falisha-auth-input-wrap">
                <Mail className="falisha-auth-input-icon" />
                <input
                  type="email"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    if (emailError) setEmailError('');
                  }}
                  className="falisha-auth-input"
                  placeholder="your.email@example.com"
                  autoComplete="email"
                />
              </div>
              {emailError && <p className="mt-2 text-sm text-red-600">{emailError}</p>}
            </div>

            <div className="falisha-auth-field">
              <label className="falisha-auth-field-label">
                Password <span className="text-red-500">*</span>
              </label>
              <div className="falisha-auth-input-wrap">
                <Lock className="falisha-auth-input-icon" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    if (passwordError) setPasswordError('');
                  }}
                  className="falisha-auth-input falisha-auth-input-password"
                  placeholder="Enter your password"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  className="falisha-auth-password-toggle"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {passwordError && <p className="mt-2 text-sm text-red-600">{passwordError}</p>}
            </div>

            <div className="falisha-auth-form-options">
              <label className="falisha-auth-checkbox-row">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(event) => setRememberMe(event.target.checked)}
                  className="falisha-auth-checkbox"
                />
                Remember me
              </label>
              <button type="button" className="falisha-auth-link falisha-auth-small-link">
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
              className="falisha-auth-primary"
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

          <div className="falisha-auth-divider">
            <div className="falisha-auth-divider-line" />
            <div className="falisha-auth-divider-text-wrap">
              <span className="falisha-auth-divider-text">or continue with</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void handleGoogleSignIn()}
            disabled={googleLoading || isLoading}
            className="falisha-auth-google"
          >
              <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 flex-shrink-0">
                <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.5 3.9-5.5 3.9-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.2.8 3.9 1.5l2.7-2.6C17 3.2 14.8 2.2 12 2.2 6.8 2.2 2.6 6.4 2.6 11.6S6.8 21 12 21c6.9 0 9.1-4.8 9.1-7.3 0-.5-.1-.9-.1-1.3H12Z" />
                <path fill="#4285F4" d="M3.6 7.1l3.2 2.4C7.7 7.6 9.7 6 12 6c1.9 0 3.2.8 3.9 1.5l2.7-2.6C17 3.2 14.8 2.2 12 2.2c-3.6 0-6.7 2-8.4 4.9Z" />
                <path fill="#FBBC05" d="M12 21c2.7 0 5-.9 6.7-2.5l-3.1-2.6c-.8.6-1.9 1.1-3.6 1.1-3.8 0-5.2-2.5-5.5-3.8l-3.3 2.5C4.9 18.8 8.2 21 12 21Z" />
                <path fill="#34A853" d="M3.2 15.7l3.3-2.5c-.2-.6-.4-1.1-.4-1.7s.1-1.2.4-1.7L3.2 7.3c-.7 1.3-1.1 2.8-1.1 4.3s.4 3 1.1 4.1Z" />
              </svg>
              {googleLoading ? 'Redirecting to Google...' : 'Sign in with Google'}
          </button>

          <p className="falisha-auth-signup-copy">
            Don&apos;t have an account?{' '}
            <a href="mailto:info@falisha.com?subject=Portal%20signup" className="falisha-auth-link falisha-auth-medium-link">
                Sign up for free
            </a>
          </p>
          <p className="falisha-auth-legal-copy">
            By signing in, you agree to our{' '}
            <a href="#" className="falisha-auth-link">
                Terms of Service
            </a>{' '}
            and{' '}
            <a href="#" className="falisha-auth-link">
                Privacy Policy
            </a>
          </p>

          <div className="falisha-auth-mobile-support">
            <div className="falisha-auth-mobile-support-card">
              <div className="falisha-auth-mobile-support-chip">
                <span className="falisha-auth-mobile-support-icon">
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

      <section className="falisha-auth-marketing-pane">
        <div className="falisha-auth-marketing-overlay" />
        <div className="falisha-auth-marketing-image" />

        <div className="falisha-auth-marketing-inner">
          <div className="falisha-auth-marketing-top">
            <div className="falisha-auth-trust-card">
              <div className="falisha-auth-stars">
                {[...Array(5)].map((_, index) => (
                  <span key={index}>★</span>
                ))}
              </div>
              <div className="falisha-auth-trust-copy">
                <div className="falisha-auth-trust-topline">Verified</div>
                <div className="falisha-auth-trust-text">Trusted by more than</div>
                <div className="falisha-auth-trust-value">5000 expats!</div>
              </div>
            </div>

            <div className="falisha-auth-hero-copy">
              <h2 className="falisha-auth-hero-title">Your Journey Starts Here</h2>
              <p className="falisha-auth-hero-subtitle">Thousands have already achieved their dream of working abroad</p>
            </div>

            <div className="falisha-auth-browser-shell">
              <div className="falisha-auth-browser-topbar">
                <div className="falisha-auth-browser-dots">
                  <span className="falisha-auth-dot falisha-auth-dot-red" />
                  <span className="falisha-auth-dot falisha-auth-dot-yellow" />
                  <span className="falisha-auth-dot falisha-auth-dot-green" />
                </div>
                <div className="falisha-auth-browser-url">
                  <Lock className="h-3 w-3" />
                  <span>workium.co.uk/dashboard</span>
                </div>
              </div>

              <div className="falisha-auth-browser-nav">
                <div className="falisha-auth-browser-brand-row">
                  <span className="falisha-auth-browser-brand">FALISHA</span>
                  <span className="falisha-auth-browser-divider">|</span>
                  <span className="falisha-auth-browser-brand-copy">FalishaMove</span>
                  <button className="falisha-auth-relocate-pill">Relocate now</button>
                </div>
                <div className="falisha-auth-browser-avatar">
                  <User className="h-4 w-4" />
                </div>
              </div>

              <div className="falisha-auth-browser-hero">
                <div className="falisha-auth-browser-hero-title-row">
                  <span className="falisha-auth-browser-plane">✈</span>
                  <h3 className="falisha-auth-browser-hero-title">WorkiumMove → United Kingdom</h3>
                </div>
                <p className="falisha-auth-browser-hero-copy">Welcome back! Continue your relocation journey.</p>

                <div className="falisha-auth-timeline-card">
                  <div className="falisha-auth-timeline-title-row">
                    <CheckCircle2 className="h-5 w-5 text-sky-500" />
                    <span>Your visa timeline</span>
                  </div>
                </div>

                <div className="falisha-auth-timeline-row">
                  {timelineSteps.map(({ step, label, active }, index) => (
                    <div key={step} className="falisha-auth-timeline-step-wrap">
                      <div className={`falisha-auth-timeline-step ${active ? 'falisha-auth-timeline-step-active' : ''}`}>{step}</div>
                      {index < timelineSteps.length - 1 && <div className={`falisha-auth-timeline-line ${active ? 'falisha-auth-timeline-line-active' : ''}`} />}
                      <div className="falisha-auth-timeline-label">{label}</div>
                    </div>
                  ))}
                </div>

                <div className="falisha-auth-next-card">
                  <div className="falisha-auth-next-left">
                    <div className="falisha-auth-next-icon">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="falisha-auth-next-kicker">Next step</p>
                      <p className="falisha-auth-next-title">Complete your profile</p>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-sky-500" />
                </div>
              </div>

              <div className="falisha-auth-bottom-actions">
                <button className="falisha-auth-watch-btn">
                  <span className="falisha-auth-play-icon">▷</span>
                  <span>Watch intro</span>
                </button>

                <button className="falisha-auth-consult-btn">
                  <span className="falisha-auth-consult-icon">
                    <MessageCircle className="h-5 w-5" />
                  </span>
                  <span>
                    <span className="falisha-auth-consult-kicker">Free consultation</span>
                    <span className="falisha-auth-consult-title">Book now →</span>
                  </span>
                </button>
              </div>
            </div>
          </div>

          <div className="falisha-auth-stats-row">
            {heroStats.map(({ value, label, Icon }) => (
              <div key={label} className="falisha-auth-stat">
                <div className="falisha-auth-stat-icon">
                  <Icon className="h-6 w-6" />
                </div>
                <p className="falisha-auth-stat-value">{value}</p>
                <p className="falisha-auth-stat-label">{label}</p>
              </div>
            ))}
          </div>

          <div className="falisha-auth-chat-wrap">
            <button className="falisha-auth-chat-chip">Chat with our experts</button>
            <button className="falisha-auth-chat-circle">
              <MessageCircle className="h-5 w-5" />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
