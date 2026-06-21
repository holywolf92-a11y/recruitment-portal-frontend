// Persistent help affordance shown on every step of the three signup wizards
// (Job Seeker, Employer, Partner). The phone link uses `tel:` so tapping on a
// mobile dials the SIM; on desktop it hands off to the OS phone handler.
// The gradient matches the role's hero accent so the pill feels native to
// each wizard.

import { Phone } from 'lucide-react';

export type CallSupportVariant = 'jobseeker' | 'employer' | 'partner';

const SUPPORT_NAME = 'Raja Abid';
const SUPPORT_PHONE_E164 = '+923303333335';
const SUPPORT_PHONE_DISPLAY = '+92 330 333 3335';

// Role-keyed visual palette — mirrors JoinLanding.tsx hero gradients so the
// pill feels like part of the same flow rather than a generic banner.
const VARIANTS: Record<CallSupportVariant, { gradient: string; shadow: string; accent: string }> = {
  jobseeker: {
    gradient: 'linear-gradient(135deg, #2563eb 0%, #06b6d4 100%)',
    shadow:   '0 6px 18px rgba(37, 99, 235, 0.28)',
    accent:   'rgba(37, 99, 235, 0.16)',
  },
  employer: {
    gradient: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)',
    shadow:   '0 6px 18px rgba(124, 58, 237, 0.28)',
    accent:   'rgba(124, 58, 237, 0.16)',
  },
  partner: {
    gradient: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
    shadow:   '0 6px 18px rgba(239, 68, 68, 0.28)',
    accent:   'rgba(239, 68, 68, 0.18)',
  },
};

export function CallSupport({ variant }: { variant: CallSupportVariant }) {
  const v = VARIANTS[variant];
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        padding: '0.625rem 1rem 0',
      }}
    >
      <a
        href={`tel:${SUPPORT_PHONE_E164}`}
        aria-label={`Call ${SUPPORT_NAME} for help — ${SUPPORT_PHONE_DISPLAY}`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.55rem',
          padding: '0.55rem 0.95rem',
          borderRadius: '999px',
          background: '#ffffff',
          color: '#0f172a',
          fontSize: '0.82rem',
          fontWeight: 600,
          textDecoration: 'none',
          border: `1px solid ${v.accent}`,
          boxShadow: v.shadow,
          transition: 'transform 140ms ease, box-shadow 140ms ease',
          maxWidth: '100%',
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-1px)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
        }}
      >
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '1.6rem',
            height: '1.6rem',
            borderRadius: '999px',
            background: v.gradient,
            color: '#fff',
            flexShrink: 0,
          }}
        >
          <Phone size={12} strokeWidth={2.5} />
        </span>
        <span style={{ color: '#64748b', fontWeight: 600 }}>Need help?</span>
        <span style={{ fontWeight: 800, color: '#0f172a' }}>
          Call {SUPPORT_NAME}
        </span>
        <span
          style={{
            padding: '0.2rem 0.55rem',
            borderRadius: '999px',
            background: v.gradient,
            color: '#fff',
            fontSize: '0.78rem',
            fontWeight: 700,
            letterSpacing: '0.01em',
            whiteSpace: 'nowrap',
          }}
        >
          {SUPPORT_PHONE_DISPLAY}
        </span>
      </a>
    </div>
  );
}
