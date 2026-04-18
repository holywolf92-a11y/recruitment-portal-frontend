import { ArrowRight, Globe, MapPin, Users } from 'lucide-react';

const FRONTEND_URL = 'https://falishajobs.up.railway.app';

const options = [
  {
    id: 'candidate',
    href: `${FRONTEND_URL}/apply/candidate`,
    emoji: '👷',
    title: 'Job Seeker',
    subtitle: 'Looking for Work Abroad',
    description: 'Submit your CV and profile. Get matched with employers across the Gulf, Europe, and beyond.',
    highlights: ['50+ destination countries', 'Free registration', 'Instant profile link'],
    gradient: 'linear-gradient(135deg,#2563eb,#06b6d4)',
    bgLight: '#eff6ff',
    borderColor: '#bfdbfe',
    badgeBg: '#dbeafe',
    badgeColor: '#1d4ed8',
    dotColor: '#3b82f6',
    checkColor: '#2563eb',
  },
  {
    id: 'employer',
    href: `${FRONTEND_URL}/apply/employer`,
    emoji: '🏢',
    title: 'Employer',
    subtitle: 'Start Recruiting',
    description: 'Source skilled, pre-screened workers. Get a dedicated dashboard with full candidate access.',
    highlights: ['Pre-screened candidates', 'Dedicated dashboard', 'Fast turnaround'],
    gradient: 'linear-gradient(135deg,#7c3aed,#a855f7)',
    bgLight: '#f5f3ff',
    borderColor: '#ddd6fe',
    badgeBg: '#ede9fe',
    badgeColor: '#6d28d9',
    dotColor: '#8b5cf6',
    checkColor: '#7c3aed',
  },
  {
    id: 'partner',
    href: `${FRONTEND_URL}/apply/partner`,
    emoji: '🤝',
    title: 'Become a Partner',
    subtitle: 'Agent / Sub-Agency',
    description: 'Join our partner network. Submit candidates on behalf of workers in your district and earn commissions.',
    highlights: ['Partner portal access', 'Commission structure', 'Bulk candidate upload'],
    gradient: 'linear-gradient(135deg,#f59e0b,#ef4444)',
    bgLight: '#fffbeb',
    borderColor: '#fde68a',
    badgeBg: '#fef3c7',
    badgeColor: '#b45309',
    dotColor: '#f59e0b',
    checkColor: '#d97706',
  },
];

export function JoinLanding() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'linear-gradient(155deg,#f0f9ff 0%,#ffffff 48%,#f5f3ff 100%)', fontFamily: 'inherit', WebkitFontSmoothing: 'antialiased' }}>

      {/* Decorative blobs */}
      <div aria-hidden="true" style={{ pointerEvents: 'none', position: 'fixed', inset: 0, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-8rem', right: '-8rem', width: '30rem', height: '30rem', borderRadius: '50%', background: 'radial-gradient(circle,rgba(59,130,246,0.16) 0%,transparent 70%)' }} />
        <div style={{ position: 'absolute', bottom: '-8rem', left: '-8rem', width: '26rem', height: '26rem', borderRadius: '50%', background: 'radial-gradient(circle,rgba(139,92,246,0.11) 0%,transparent 70%)' }} />
      </div>

      {/* ── Header ── */}
      <header style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: '1100px', margin: '0 auto', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <div style={{ width: '2.25rem', height: '2.25rem', borderRadius: '0.625rem', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,#2563eb,#7c3aed)', boxShadow: '0 2px 10px rgba(37,99,235,0.3)', flexShrink: 0 }}>
            <Globe style={{ width: '1.125rem', height: '1.125rem', color: '#fff' }} />
          </div>
          <div>
            <div style={{ fontSize: '0.9375rem', fontWeight: 800, color: '#111827', lineHeight: 1 }}>Falisha Jobs</div>
            <div style={{ fontSize: '0.6875rem', color: '#6b7280', lineHeight: 1, marginTop: '0.2rem' }}>International Manpower</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.6875rem', color: '#9ca3af' }}>
          <MapPin style={{ width: '0.75rem', height: '0.75rem', flexShrink: 0 }} />
          <span>Rawalpindi, Pakistan</span>
        </div>
      </header>

      {/* ── Main ── */}
      <main style={{ position: 'relative', zIndex: 10, flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '1.5rem 1.25rem 3rem', boxSizing: 'border-box', width: '100%' }}>

        {/* Trust badge */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', padding: '0.35rem 0.875rem', borderRadius: '999px', background: 'rgba(37,99,235,0.07)', border: '1px solid rgba(37,99,235,0.18)', color: '#1d4ed8', fontSize: '0.6875rem', fontWeight: 700, marginBottom: '1.25rem' }}>
          <Users style={{ width: '0.75rem', height: '0.75rem', flexShrink: 0 }} />
          Trusted by 5,000+ expats worldwide
        </div>

        {/* Heading */}
        <h1 style={{ fontSize: 'clamp(1.625rem,5vw,2.75rem)', fontWeight: 900, color: '#111827', textAlign: 'center', lineHeight: 1.2, margin: '0 0 0.75rem', maxWidth: '36rem' }}>
          Your Journey Starts{' '}
          <span style={{ background: 'linear-gradient(90deg,#2563eb,#7c3aed)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Here</span>
        </h1>
        <p style={{ fontSize: '0.9375rem', color: '#6b7280', textAlign: 'center', maxWidth: '30rem', lineHeight: 1.65, margin: '0 0 2rem' }}>
          Choose how you want to work with Falisha — whether you're looking for a job, hiring staff, or joining as a partner.
        </p>

        {/* ── Cards ── */}
        <div style={{ width: '100%', maxWidth: '1100px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,290px),1fr))', gap: '1rem', boxSizing: 'border-box' }}>
          {options.map((opt) => (
            <a
              key={opt.id}
              href={opt.href}
              style={{ display: 'flex', flexDirection: 'column', textDecoration: 'none', borderRadius: '1.125rem', border: `1.5px solid ${opt.borderColor}`, background: '#fff', padding: '1.375rem', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', transition: 'transform 0.18s, box-shadow 0.18s', position: 'relative', boxSizing: 'border-box', overflow: 'hidden' }}
              onMouseEnter={(e) => { const el = e.currentTarget as HTMLAnchorElement; el.style.transform = 'translateY(-4px)'; el.style.boxShadow = '0 16px 40px rgba(0,0,0,0.12)'; }}
              onMouseLeave={(e) => { const el = e.currentTarget as HTMLAnchorElement; el.style.transform = 'translateY(0)'; el.style.boxShadow = '0 2px 12px rgba(0,0,0,0.06)'; }}
            >
              {/* Top accent bar */}
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3.5px', background: opt.gradient }} />

              {/* Icon */}
              <div style={{ width: '3.25rem', height: '3.25rem', borderRadius: '0.875rem', display: 'flex', alignItems: 'center', justifyContent: 'center', background: opt.bgLight, border: `1.5px solid ${opt.borderColor}`, marginBottom: '1rem', flexShrink: 0 }}>
                <span style={{ fontSize: '1.5rem' }} role="img" aria-hidden="true">{opt.emoji}</span>
              </div>

              {/* Subtitle badge */}
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.2rem 0.6rem', borderRadius: '999px', background: opt.badgeBg, color: opt.badgeColor, fontSize: '0.6875rem', fontWeight: 700, marginBottom: '0.5rem', width: 'fit-content' }}>
                <span style={{ width: '0.375rem', height: '0.375rem', borderRadius: '50%', background: opt.dotColor, flexShrink: 0 }} />
                {opt.subtitle}
              </div>

              {/* Title */}
              <h2 style={{ fontSize: '1.1875rem', fontWeight: 800, color: '#111827', margin: '0 0 0.5rem' }}>{opt.title}</h2>

              {/* Description */}
              <p style={{ fontSize: '0.8125rem', color: '#6b7280', lineHeight: 1.6, margin: '0 0 1.125rem', flex: 1 }}>{opt.description}</p>

              {/* Highlights */}
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1.125rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {opt.highlights.map((h) => (
                  <li key={h} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: '#374151' }}>
                    <span style={{ width: '1rem', height: '1rem', borderRadius: '50%', background: opt.bgLight, border: `1px solid ${opt.borderColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <svg width="8" height="8" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6l3 3 5-5" stroke={opt.checkColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                    {h}
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderRadius: '0.75rem', padding: '0.75rem 1rem', background: opt.gradient, color: '#fff', fontSize: '0.875rem', fontWeight: 700 }}>
                <span>Get Started</span>
                <ArrowRight style={{ width: '1rem', height: '1rem' }} />
              </div>
            </a>
          ))}
        </div>

        {/* Stats strip */}
        <div style={{ marginTop: '2.5rem', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: '1.5rem 2.5rem', textAlign: 'center' }}>
          {[
            { value: '10K+', label: 'Jobs Placed' },
            { value: '50+', label: 'Countries' },
            { value: '95%', label: 'Success Rate' },
            { value: '24/7', label: 'Support' },
          ].map((s) => (
            <div key={s.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span style={{ fontSize: '1.5rem', fontWeight: 900, background: 'linear-gradient(90deg,#2563eb,#7c3aed)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', lineHeight: 1 }}>{s.value}</span>
              <span style={{ fontSize: '0.6875rem', color: '#9ca3af', marginTop: '0.2rem' }}>{s.label}</span>
            </div>
          ))}
        </div>
      </main>

      {/* ── Footer ── */}
      <footer style={{ position: 'relative', zIndex: 10, textAlign: 'center', padding: '1.25rem 1.25rem', fontSize: '0.6875rem', color: '#9ca3af', borderTop: '1px solid #f3f4f6', lineHeight: 1.8 }}>
        <p>© {new Date().getFullYear()} Falisha Enterprises · Office 10-12, Umer Farooq Plaza, Murree Road, Rawalpindi</p>
        <p style={{ marginTop: '0.2rem' }}>
          <a href="mailto:support@falishajobs.com" style={{ color: 'inherit', textDecoration: 'none' }}>support@falishajobs.com</a>
          {' · '}
          <a href="tel:+923005547806" style={{ color: 'inherit', textDecoration: 'none' }}>0300-5547806</a>
        </p>
      </footer>
    </div>
  );
}
