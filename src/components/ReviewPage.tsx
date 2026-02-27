import { useState, useEffect, useCallback, useRef } from 'react';

// ─── Config ──────────────────────────────────────────────────────────────────
const GOOGLE_REVIEW_URL =
  (import.meta as any).env?.VITE_GOOGLE_REVIEW_URL || 'https://g.page/r/CVmpd5dYUfULEBM/review';
const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || '/api';
const BUSINESS_NAME = (import.meta as any).env?.VITE_BUSINESS_NAME || 'Falisha Manpower';
const BUSINESS_LOGO_URL: string | undefined = (import.meta as any).env?.VITE_BUSINESS_LOGO_URL;

// ─── Mood options (emoji + label + auto-comment) ─────────────────────────────
const MOODS = [
  { emoji: '🤩', label: 'Exceptional', comment: 'Absolutely exceptional service! Far exceeded all my expectations. Highly recommended to everyone looking for professional manpower services.' },
  { emoji: '😍', label: 'Amazing',     comment: 'Amazing experience from start to finish. Professional team, smooth process, and outstanding results!' },
  { emoji: '🙌', label: 'Excellent',   comment: 'Excellent service and very professional staff. Very satisfied with the overall experience.' },
  { emoji: '⚡', label: 'Fast & Easy', comment: 'Quick response and smooth process. Everything was handled efficiently and professionally.' },
  { emoji: '🤝', label: 'Professional',comment: 'Highly professional team with great communication throughout. Smooth and hassle-free experience.' },
  { emoji: '💪', label: 'Recommended', comment: 'Highly recommended to others! Friendly team and great support. Will definitely use their services again.' },
] as const;

// ─── Countries with flags ────────────────────────────────────────────────────
const COUNTRIES = [
  { flag: '🇦🇪', name: 'UAE' },
  { flag: '🇸🇦', name: 'Saudi Arabia' },
  { flag: '🇶🇦', name: 'Qatar' },
  { flag: '🇰🇼', name: 'Kuwait' },
  { flag: '🇧🇭', name: 'Bahrain' },
  { flag: '🇴🇲', name: 'Oman' },
  { flag: '🇵🇰', name: 'Pakistan' },
  { flag: '🇧🇩', name: 'Bangladesh' },
  { flag: '🇮🇳', name: 'India' },
  { flag: '🇵🇭', name: 'Philippines' },
  { flag: '🇲🇾', name: 'Malaysia' },
  { flag: '🇬🇧', name: 'UK' },
] as const;

// ─── Analytics (fire-and-forget) ────────────────────────────────────────────
function track(event: string, extra?: Record<string, unknown>) {
  fetch(`${API_BASE}/review/analytics`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event, ...extra }),
  }).catch(() => {});
}

// ─── CSS keyframe animations (injected once) ─────────────────────────────────
const STYLE_ID = 'review-page-keyframes';
function injectStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const el = document.createElement('style');
  el.id = STYLE_ID;
  el.textContent = `
    @keyframes floatBob {
      0%, 100% { transform: translateY(0px) scale(1); }
      50%       { transform: translateY(-7px) scale(1.06); }
    }
    @keyframes popIn {
      0%   { transform: scale(0.55); opacity: 0; }
      70%  { transform: scale(1.12); opacity: 1; }
      100% { transform: scale(1);    opacity: 1; }
    }
    @keyframes fadeSlideUp {
      from { opacity: 0; transform: translateY(18px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes pulseRing {
      0%   { transform: scale(1);   opacity: 0.45; }
      100% { transform: scale(1.7); opacity: 0; }
    }
    @keyframes checkPop {
      0%   { transform: scale(0); }
      65%  { transform: scale(1.35); }
      100% { transform: scale(1); }
    }
    @keyframes moodBounce {
      0%, 100% { transform: scale(1); }
      40%      { transform: scale(1.22) rotate(-6deg); }
      70%      { transform: scale(1.12) rotate(4deg); }
    }
    @keyframes slideInLeft {
      from { transform: translateX(-100%); opacity: 0; }
      to   { transform: translateX(0);     opacity: 1; }
    }
    @keyframes fadeIn {
      from { opacity: 0; } to { opacity: 1; }
    }
  `;
  document.head.appendChild(el);
}

// ─── Animated star ────────────────────────────────────────────────────────────
function Star({
  value,
  filled,
  hovered,
  onClick,
  onMouseEnter,
  onMouseLeave,
}: {
  value: number;
  filled: boolean;
  hovered: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}) {
  const active = filled || hovered;
  return (
    <button
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      aria-label={`${value} star${value > 1 ? 's' : ''}`}
      style={{
        background: 'none', border: 'none', cursor: 'pointer', padding: '2px',
        transform: active ? 'scale(1.15)' : 'scale(1)',
        transition: 'transform 0.15s ease',
      }}
    >
      <svg
        width="54" height="54" viewBox="0 0 24 24"
        fill={active ? '#FBBF24' : '#D1D5DB'}
        stroke={active ? '#F59E0B' : '#9CA3AF'}
        strokeWidth="1.2"
        style={{
          filter: active ? 'drop-shadow(0 2px 8px rgba(251,191,36,0.6))' : 'none',
          transition: 'all 0.15s ease',
        }}
      >
        <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
      </svg>
    </button>
  );
}

// ─── Small inline star (read-only) ───────────────────────────────────────────
function StarSmall({ filled }: { filled: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24"
      fill={filled ? '#FBBF24' : '#D1D5DB'} stroke={filled ? '#F59E0B' : '#9CA3AF'} strokeWidth="1.2">
      <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
    </svg>
  );
}

// ─── QR Code Share helpers ───────────────────────────────────────────────────
function ShareButton({ color, icon, label, onClick }: { color: string; icon: string; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} title={label} style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
      background: color, border: 'none', borderRadius: 14, padding: '10px 14px',
      cursor: 'pointer', color: '#fff', minWidth: 60,
      boxShadow: '0 2px 8px rgba(0,0,0,0.18)', transition: 'transform 0.15s, opacity 0.15s',
    }}
      onMouseOver={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.08)'; }}
      onMouseOut={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
    >
      <span style={{ fontSize: 24, lineHeight: 1 }}>{icon}</span>
      <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.03em' }}>{label}</span>
    </button>
  );
}

// ─── QR Code Page ─────────────────────────────────────────────────────────────
function QRCodePage() {
  useEffect(() => { injectStyles(); }, []);
  const reviewUrl = `${window.location.origin}/review`;
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&ecc=H&data=${encodeURIComponent(reviewUrl)}`;
  const shareText = `Rate your experience with ${BUSINESS_NAME} — it only takes 30 seconds!`;
  const [copied, setCopied] = useState(false);

  const shareLinks = [
    {
      label: 'WhatsApp',
      icon: '💬',
      color: '#25D366',
      url: `https://wa.me/?text=${encodeURIComponent(`${shareText}\n${reviewUrl}`)}`,
    },
    {
      label: 'Telegram',
      icon: '✈️',
      color: '#229ED9',
      url: `https://t.me/share/url?url=${encodeURIComponent(reviewUrl)}&text=${encodeURIComponent(shareText)}`,
    },
    {
      label: 'Facebook',
      icon: '👍',
      color: '#1877F2',
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(reviewUrl)}`,
    },
    {
      label: 'Twitter / X',
      icon: '🐦',
      color: '#000000',
      url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(reviewUrl)}`,
    },
  ];

  const handleNativeShare = () => {
    if (navigator.share) {
      navigator.share({ title: BUSINESS_NAME, text: shareText, url: reviewUrl }).catch(() => {});
    }
  };
  const handleCopy = () => {
    navigator.clipboard?.writeText(reviewUrl).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }).catch(() => {});
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(155deg,#f0f9ff 0%,#ffffff 48%,#f5f3ff 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif' }}>
      <div style={{ maxWidth: 380, width: '100%', textAlign: 'center', boxShadow: '0 8px 36px rgba(0,0,0,0.10)', borderRadius: 28, padding: '36px 28px 28px', background: '#fff', border: '1px solid #f0f0f0', animation: 'fadeSlideUp 0.4s ease both' }}>

        {/* Header */}
        <div style={{ fontSize: 22, fontWeight: 800, color: '#1e40af', marginBottom: 4 }}>{BUSINESS_NAME}</div>
        <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 24 }}>Scan to rate your experience</p>

        {/* QR */}
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <img src={qrSrc} alt="Review QR Code" style={{ width: 230, height: 230, borderRadius: 18, border: '1.5px solid #e5e7eb', display: 'block' }} />
        </div>
        <p style={{ color: '#9ca3af', fontSize: 11, marginTop: 10, wordBreak: 'break-all', padding: '0 8px' }}>{reviewUrl}</p>

        {/* Print + Download */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 18, marginBottom: 22 }}>
          <button onClick={() => window.print()} style={{ padding: '9px 22px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 50, fontWeight: 700, fontSize: 13, cursor: 'pointer', boxShadow: '0 2px 10px rgba(37,99,235,0.28)' }}>
            🖨️ Print
          </button>
          <a href={qrSrc} download="review-qr.png" style={{ padding: '9px 22px', background: '#f3f4f6', color: '#374151', borderRadius: 50, fontWeight: 700, fontSize: 13, textDecoration: 'none', display: 'inline-block', border: '1.5px solid #e5e7eb' }}>
            ⬇️ Download
          </a>
        </div>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <div style={{ flex: 1, height: 1, background: '#e5e7eb' }} />
          <span style={{ color: '#9ca3af', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>SHARE THIS LINK</span>
          <div style={{ flex: 1, height: 1, background: '#e5e7eb' }} />
        </div>

        {/* Social share buttons */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 14 }}>
          {shareLinks.map(s => (
            <ShareButton key={s.label} label={s.label} icon={s.icon} color={s.color}
              onClick={() => window.open(s.url, '_blank', 'noopener,noreferrer')} />
          ))}
          {typeof navigator !== 'undefined' && 'share' in navigator && (
            <ShareButton label="More" icon="📤" color="#6366f1" onClick={handleNativeShare} />
          )}
        </div>

        {/* Copy link */}
        <button onClick={handleCopy} style={{
          width: '100%', padding: '12px', background: copied ? '#d1fae5' : '#f9fafb',
          border: `1.5px solid ${copied ? '#6ee7b7' : '#e5e7eb'}`, borderRadius: 14,
          fontSize: 14, fontWeight: 700, cursor: 'pointer',
          color: copied ? '#065f46' : '#374151', transition: 'all 0.2s',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          {copied ? '✅ Link Copied!' : '🔗 Copy Review Link'}
        </button>

        <a href="/review" style={{ display: 'block', marginTop: 14, color: '#6b7280', fontSize: 12, textDecoration: 'underline' }}>← Back to Review Page</a>
      </div>
    </div>
  );
}

// ─── Main Review Page ─────────────────────────────────────────────────────────
type Screen = 'rating' | 'redirected' | 'low_form' | 'thank_you';

export function ReviewPage() {
  if (typeof window !== 'undefined' && window.location.pathname === '/review/qr') {
    return <QRCodePage />;
  }

  useEffect(() => { injectStyles(); track('page_view'); }, []);

  // ── State ──────────────────────────────────────────────────────────────
  const [rating, setRating]               = useState(5); // default 5 stars
  const [hoverRating, setHoverRating]     = useState(0);
  const [selectedMood, setSelectedMood]   = useState<number | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<number | null>(null);
  const [comment, setComment]             = useState('');
  const [screen, setScreen]               = useState<Screen>('rating');
  const [submitting, setSubmitting]       = useState(false);
  const [copyStatus, setCopyStatus]       = useState<'idle' | 'copied' | 'failed'>('idle');
  const [animatingMood, setAnimatingMood] = useState<number | null>(null);
  const [sidebarOpen, setSidebarOpen]       = useState(false);
  const textRef = useRef<HTMLTextAreaElement>(null);

  const displayRating = hoverRating || rating;
  const isGoodRating  = rating === 5;

  const LABELS: Record<number, string> = {
    1: 'Very Poor', 2: 'Poor', 3: 'Average', 4: 'Good', 5: 'Excellent ⭐',
  };

  // ── Handlers ────────────────────────────────────────────────────────────
  const handleStarClick = useCallback((v: number) => {
    setRating(v);
    setHoverRating(0);
    track('star_select', { rating: v });
    if (v < 5) { setSelectedMood(null); setComment(''); }
  }, []);

  const handleMoodClick = useCallback((idx: number) => {
    setAnimatingMood(idx);
    setTimeout(() => setAnimatingMood(null), 500);
    const deselect = selectedMood === idx;
    setSelectedMood(deselect ? null : idx);
    setComment(deselect ? '' : MOODS[idx].comment);
    track('template_select', { template_idx: idx, rating });
    setTimeout(() => textRef.current?.focus(), 100);
  }, [selectedMood, rating]);

  const copyToClipboard = useCallback((text: string) => {
    if (navigator.clipboard?.writeText) {
      return navigator.clipboard.writeText(text)
        .then(() => setCopyStatus('copied'))
        .catch(() => setCopyStatus('failed'));
    }
    try {
      const el = document.createElement('textarea');
      el.value = text;
      el.style.cssText = 'position:fixed;opacity:0;top:0;left:0;';
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopyStatus('copied');
    } catch { setCopyStatus('failed'); }
    return Promise.resolve();
  }, []);

  const handleSubmitGoogle = useCallback(() => {
    track('redirect_google', {
      rating,
      template_idx: selectedMood,
      country: selectedCountry !== null ? COUNTRIES[selectedCountry].name : null,
    });
    window.open(GOOGLE_REVIEW_URL, '_blank', 'noopener,noreferrer');
    if (comment.trim()) copyToClipboard(comment.trim());
    setScreen('redirected');
  }, [rating, selectedMood, selectedCountry, comment, copyToClipboard]);

  const handleFeedbackSubmit = useCallback(async () => {
    setSubmitting(true);
    try {
      track('feedback_submit', { rating });
      await fetch(`${API_BASE}/review/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, message: comment }),
      });
    } catch { /* silent */ }
    setSubmitting(false);
    setScreen('thank_you');
  }, [rating, comment]);

  // ── Shared header ──────────────────────────────────────────────────────
  const renderHeader = () => (
    <div style={{ textAlign: 'center', marginBottom: 24 }}>
      {BUSINESS_LOGO_URL ? (
        <img src={BUSINESS_LOGO_URL} alt={BUSINESS_NAME}
          style={{ height: 58, margin: '0 auto 10px', objectFit: 'contain', display: 'block' }} />
      ) : (
        <div style={{
          width: 58, height: 58, borderRadius: 15,
          background: 'linear-gradient(135deg,#2563eb,#1d4ed8)',
          margin: '0 auto 10px', display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 14px rgba(37,99,235,0.35)',
        }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        </div>
      )}
      <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
        {BUSINESS_NAME}
      </div>
    </div>
  );

  // ── Rating screen ──────────────────────────────────────────────────────
  const renderRating = () => (
    <div style={{ animation: 'fadeSlideUp 0.4s ease both' }}>
      {renderHeader()}

      <div style={{ textAlign: 'center', marginBottom: 22 }}>
        <h1 style={{ fontSize: 25, fontWeight: 800, color: '#111827', margin: 0, lineHeight: 1.2 }}>
          Rate Your Experience
        </h1>
        <p style={{ fontSize: 14, color: '#6b7280', marginTop: 5 }}>Your opinion helps us improve.</p>
      </div>

      {/* Stars */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 4, marginBottom: 10 }}>
        {[1, 2, 3, 4, 5].map(v => (
          <Star
            key={v} value={v}
            filled={v <= rating} hovered={v <= hoverRating}
            onClick={() => handleStarClick(v)}
            onMouseEnter={() => setHoverRating(v)}
            onMouseLeave={() => setHoverRating(0)}
          />
        ))}
      </div>

      {/* Rating badge */}
      <div style={{ textAlign: 'center', marginBottom: 26 }}>
        <span key={displayRating} style={{
          display: 'inline-block', fontSize: 13, fontWeight: 700,
          color:      displayRating === 5 ? '#065f46' : displayRating >= 4 ? '#92400e' : '#991b1b',
          background: displayRating === 5 ? '#d1fae5' : displayRating >= 4 ? '#fef3c7' : '#fee2e2',
          padding: '4px 16px', borderRadius: 20, letterSpacing: '0.03em',
          animation: 'popIn 0.2s ease both',
        }}>
          {LABELS[displayRating] || 'Tap a star to rate'}
        </span>
      </div>

      {/* ── 5-star positive flow ────────────────────────────────────── */}
      {isGoodRating && (
        <div style={{ animation: 'fadeSlideUp 0.35s ease both' }}>

          {/* Mood picker */}
          <p style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 10, textAlign: 'center', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            What describes your experience?
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 9, marginBottom: 22 }}>
            {MOODS.map((m, idx) => {
              const active = selectedMood === idx;
              const bouncing = animatingMood === idx;
              return (
                <button key={idx} onClick={() => handleMoodClick(idx)} style={{
                  background: active ? '#eff6ff' : '#f9fafb',
                  border: `2px solid ${active ? '#3b82f6' : '#e5e7eb'}`,
                  borderRadius: 16, padding: '12px 6px', cursor: 'pointer',
                  textAlign: 'center', transition: 'all 0.18s ease',
                  transform: bouncing ? 'scale(1.2)' : active ? 'scale(1.04)' : 'scale(1)',
                  boxShadow: active ? '0 2px 14px rgba(59,130,246,0.25)' : '0 1px 3px rgba(0,0,0,0.05)',
                }}>
                  <div style={{
                    fontSize: 32, lineHeight: 1, display: 'block', marginBottom: 5,
                    animation: bouncing ? 'moodBounce 0.5s ease' : active ? 'floatBob 2.4s ease-in-out infinite' : 'none',
                  }}>
                    {m.emoji}
                  </div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: active ? '#1d4ed8' : '#6b7280', letterSpacing: '0.02em' }}>
                    {m.label}
                  </div>
                  {active && (
                    <div style={{
                      width: 16, height: 16, borderRadius: '50%', background: '#3b82f6',
                      margin: '5px auto 0', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      animation: 'checkPop 0.3s ease both',
                    }}>
                      <svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke="#fff" strokeWidth="2.5">
                        <polyline points="2,6 5,9 10,3" />
                      </svg>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Country picker */}
          <p style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 10, textAlign: 'center', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Your Country <span style={{ fontWeight: 400, color: '#9ca3af', textTransform: 'none', letterSpacing: 0 }}>(optional)</span>
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, justifyContent: 'center', marginBottom: 22 }}>
            {COUNTRIES.map((c, idx) => {
              const active = selectedCountry === idx;
              return (
                <button key={idx} onClick={() => setSelectedCountry(active ? null : idx)} title={c.name} style={{
                  background: active ? '#eff6ff' : '#f3f4f6',
                  border: `2px solid ${active ? '#3b82f6' : 'transparent'}`,
                  borderRadius: 12, padding: '5px 10px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 5,
                  fontSize: 12, fontWeight: 600, color: active ? '#1d4ed8' : '#374151',
                  transition: 'all 0.15s ease',
                  transform: active ? 'scale(1.06)' : 'scale(1)',
                  boxShadow: active ? '0 2px 8px rgba(59,130,246,0.2)' : 'none',
                }}>
                  <span style={{ fontSize: 20 }}>{c.flag}</span>
                  <span style={{ fontSize: 11 }}>{c.name}</span>
                </button>
              );
            })}
          </div>

          {/* Comment box */}
          <p style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 8, textAlign: 'center', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Add a Comment <span style={{ fontWeight: 400, color: '#9ca3af', textTransform: 'none', letterSpacing: 0 }}>(optional)</span>
          </p>
          <div style={{ position: 'relative', marginBottom: 18 }}>
            <textarea
              ref={textRef}
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="Your comment… (tap an icon above to auto-fill)"
              rows={3}
              style={{
                width: '100%', padding: '11px 36px 11px 13px',
                border: '2px solid #e5e7eb', borderRadius: 14,
                fontSize: 14, color: '#111827', background: '#fafafa',
                resize: 'none', outline: 'none', boxSizing: 'border-box',
                lineHeight: 1.5, fontFamily: 'inherit', transition: 'border-color 0.15s',
              }}
              onFocus={e => { e.target.style.borderColor = '#3b82f6'; e.target.style.background = '#fff'; }}
              onBlur={e => { e.target.style.borderColor = '#e5e7eb'; e.target.style.background = '#fafafa'; }}
            />
            {comment && (
              <button onClick={() => setComment('')} style={{
                position: 'absolute', top: 9, right: 9, background: '#e5e7eb',
                border: 'none', borderRadius: '50%', width: 22, height: 22,
                cursor: 'pointer', fontSize: 14, color: '#6b7280',
                display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1,
              }}>×</button>
            )}
          </div>

          {/* CTA */}
          <button
            onClick={handleSubmitGoogle}
            style={{
              width: '100%', padding: '16px',
              background: 'linear-gradient(135deg,#16a34a,#15803d)',
              color: '#fff', border: 'none', borderRadius: 18,
              fontSize: 16, fontWeight: 800, cursor: 'pointer',
              boxShadow: '0 4px 20px rgba(22,163,74,0.42)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 10, marginBottom: 6, letterSpacing: '0.01em',
              transition: 'transform 0.15s, box-shadow 0.15s',
            }}
            onMouseOver={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.02)'; }}
            onMouseOut={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
          >
            <span style={{ fontSize: 20 }}>⭐</span>
            Submit Review on Google
            <span style={{ fontSize: 18 }}>→</span>
          </button>
          {comment.trim() && (
            <p style={{ textAlign: 'center', fontSize: 12, color: '#6b7280', margin: '4px 0 0' }}>
              Your comment will be auto-copied to clipboard
            </p>
          )}
        </div>
      )}

      {/* ── 1–4 stars negative flow ─────────────────────────────────── */}
      {!isGoodRating && rating > 0 && (
        <div style={{ animation: 'fadeSlideUp 0.35s ease both' }}>
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 52, marginBottom: 8, animation: 'popIn 0.4s ease both' }}>😔</div>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#111827', margin: '0 0 5px' }}>We're Sorry</h2>
            <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>Please tell us how we can improve.</p>
          </div>
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder="What went wrong? How can we improve? (optional)"
            rows={4}
            style={{
              width: '100%', padding: '12px 14px',
              border: '2px solid #e5e7eb', borderRadius: 14,
              fontSize: 14, color: '#111827', background: '#fafafa',
              resize: 'none', outline: 'none', boxSizing: 'border-box',
              lineHeight: 1.5, fontFamily: 'inherit', marginBottom: 14,
            }}
            onFocus={e => { e.target.style.borderColor = '#f97316'; e.target.style.background = '#fff'; }}
            onBlur={e => { e.target.style.borderColor = '#e5e7eb'; e.target.style.background = '#fafafa'; }}
          />
          <button
            onClick={handleFeedbackSubmit}
            disabled={submitting}
            style={{
              width: '100%', padding: '15px',
              background: '#1f2937', color: '#fff',
              border: 'none', borderRadius: 16, fontSize: 15, fontWeight: 700,
              cursor: submitting ? 'not-allowed' : 'pointer',
              opacity: submitting ? 0.6 : 1, marginBottom: 10, transition: 'all 0.15s',
            }}
          >
            {submitting ? 'Sending…' : 'Submit Feedback'}
          </button>
          <button
            onClick={() => { setRating(5); setComment(''); }}
            style={{ width: '100%', background: 'none', border: 'none', color: '#6b7280', fontSize: 13, cursor: 'pointer', textDecoration: 'underline', padding: '5px 0' }}
          >
            Change my rating
          </button>
        </div>
      )}
    </div>
  );

  // ── Redirected screen ──────────────────────────────────────────────────
  const renderRedirected = () => (
    <div style={{ textAlign: 'center', animation: 'fadeSlideUp 0.4s ease both' }}>
      {renderHeader()}
      <div style={{ position: 'relative', width: 80, height: 80, margin: '0 auto 20px' }}>
        <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '3px solid #10b981', animation: 'pulseRing 1.4s ease-out infinite' }} />
        <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: '#d1fae5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
      </div>
      <h2 style={{ fontSize: 23, fontWeight: 800, color: '#111827', marginBottom: 10 }}>Google Review Opened!</h2>
      {copyStatus === 'copied' && comment && (
        <div style={{ background: '#d1fae5', border: '1.5px solid #6ee7b7', borderRadius: 12, padding: '10px 14px', marginBottom: 14, color: '#065f46', fontSize: 13, fontWeight: 600 }}>
          ✅ Comment copied — just paste it in Google!
        </div>
      )}
      {copyStatus === 'failed' && comment && (
        <div style={{ background: '#fef3c7', border: '1.5px solid #fcd34d', borderRadius: 12, padding: '10px 14px', marginBottom: 14, textAlign: 'left' }}>
          <p style={{ color: '#78350f', fontSize: 12, margin: '0 0 4px', fontWeight: 600 }}>Copy this manually:</p>
          <p style={{ color: '#92400e', fontSize: 13, margin: 0, lineHeight: 1.5 }}>{comment}</p>
        </div>
      )}
      <p style={{ color: '#6b7280', fontSize: 14, lineHeight: 1.65, marginBottom: 24 }}>
        A new tab opened with the Google review page.{' '}
        {copyStatus === 'copied' ? 'Paste your comment and hit Submit!' : 'Share your experience and hit Submit!'}
      </p>
      <button
        onClick={() => window.open(GOOGLE_REVIEW_URL, '_blank', 'noopener,noreferrer')}
        style={{ padding: '13px 36px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 50, fontWeight: 700, fontSize: 15, cursor: 'pointer', boxShadow: '0 3px 14px rgba(37,99,235,0.35)' }}
      >
        Re-open Google Review
      </button>
      <p style={{ color: '#9ca3af', fontSize: 12, marginTop: 22 }}>Thank you for your time! 🙏</p>
    </div>
  );

  // ── Thank you screen ───────────────────────────────────────────────────
  const renderThankYou = () => (
    <div style={{ textAlign: 'center', animation: 'fadeSlideUp 0.4s ease both' }}>
      {renderHeader()}
      <div style={{ fontSize: 66, marginBottom: 16, animation: 'popIn 0.5s ease both' }}>🙏</div>
      <h2 style={{ fontSize: 24, fontWeight: 800, color: '#111827', marginBottom: 10 }}>Thank You!</h2>
      <p style={{ color: '#6b7280', fontSize: 14, lineHeight: 1.7, maxWidth: 280, margin: '0 auto' }}>
        We've received your feedback and will work to improve. We truly appreciate your honesty.
      </p>
    </div>
  );

  // ── Nav menu items ───────────────────────────────────────────────────────
  const NAV_ITEMS = [
    { icon: '⭐', label: 'Leave a Review', href: '/review' },
    { icon: '📋', label: 'QR Code & Share', href: '/review/qr' },
    { icon: '💼', label: 'Apply for Jobs',  href: '/apply' },
    { icon: '🏢', label: 'Falisha Manpower', href: 'https://falishamanpower.up.railway.app', external: true },
  ];

  // ── Sidebar ──────────────────────────────────────────────────────────────
  const renderSidebar = () => (
    <>
      {/* Backdrop */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.38)',
            zIndex: 999, animation: 'fadeIn 0.2s ease both',
          }}
        />
      )}
      {/* Drawer */}
      <div style={{
        position: 'fixed', top: 0, left: 0, bottom: 0, width: 270,
        background: '#fff', zIndex: 1000, boxShadow: '4px 0 30px rgba(0,0,0,0.15)',
        display: 'flex', flexDirection: 'column',
        transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.28s cubic-bezier(0.4,0,0.2,1)',
        borderRadius: '0 24px 24px 0',
      }}>
        {/* Drawer header */}
        <div style={{
          background: 'linear-gradient(135deg,#2563eb,#1d4ed8)',
          padding: '28px 20px 20px',
          borderRadius: '0 24px 0 0',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, color: '#fff', letterSpacing: '0.01em' }}>{BUSINESS_NAME}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.72)', marginTop: 3, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Review Portal</div>
          </div>
          <button onClick={() => setSidebarOpen(false)} style={{
            background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 10,
            width: 34, height: 34, cursor: 'pointer', color: '#fff', fontSize: 18,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>✕</button>
        </div>

        {/* Nav items */}
        <nav style={{ flex: 1, padding: '16px 12px', overflowY: 'auto' }}>
          {NAV_ITEMS.map(item => {
            const current = !item.external && window.location.pathname === item.href;
            return (
              <a
                key={item.label}
                href={item.href}
                target={item.external ? '_blank' : '_self'}
                rel={item.external ? 'noopener noreferrer' : undefined}
                onClick={() => setSidebarOpen(false)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '13px 16px', borderRadius: 14, marginBottom: 4,
                  background: current ? '#eff6ff' : 'transparent',
                  color: current ? '#1d4ed8' : '#374151',
                  fontWeight: current ? 700 : 500, fontSize: 15,
                  textDecoration: 'none', transition: 'background 0.15s, color 0.15s',
                  border: `1.5px solid ${current ? '#bfdbfe' : 'transparent'}`,
                }}
                onMouseOver={e => { if (!current) { (e.currentTarget as HTMLAnchorElement).style.background = '#f9fafb'; } }}
                onMouseOut={e => { if (!current) { (e.currentTarget as HTMLAnchorElement).style.background = 'transparent'; } }}
              >
                <span style={{ fontSize: 22, width: 28, textAlign: 'center' }}>{item.icon}</span>
                <span>{item.label}</span>
                {item.external && <span style={{ marginLeft: 'auto', fontSize: 12, color: '#9ca3af' }}>↗</span>}
              </a>
            );
          })}
        </nav>

        {/* Drawer footer */}
        <div style={{ padding: '14px 20px', borderTop: '1px solid #f3f4f6' }}>
          {/* Quick share review link */}
          <p style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>Share Review Link</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {[
              { label: 'WhatsApp', icon: '💬', color: '#25D366', url: `https://wa.me/?text=${encodeURIComponent(`Rate ${BUSINESS_NAME}: ${window.location.origin}/review`)}` },
              { label: 'Telegram', icon: '✈️', color: '#229ED9', url: `https://t.me/share/url?url=${encodeURIComponent(`${window.location.origin}/review`)}&text=${encodeURIComponent(`Rate ${BUSINESS_NAME}`)}` },
              { label: 'Facebook', icon: '👍', color: '#1877F2', url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(`${window.location.origin}/review`)}` },
            ].map(s => (
              <button key={s.label} title={s.label}
                onClick={() => window.open(s.url, '_blank', 'noopener,noreferrer')}
                style={{
                  background: s.color, border: 'none', borderRadius: 10,
                  width: 38, height: 38, cursor: 'pointer', fontSize: 18,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                }}>
                {s.icon}
              </button>
            ))}
            {typeof navigator !== 'undefined' && 'share' in navigator && (
              <button title="More" onClick={() => navigator.share({ title: BUSINESS_NAME, url: `${window.location.origin}/review` }).catch(() => {})}
                style={{ background: '#6366f1', border: 'none', borderRadius: 10, width: 38, height: 38, cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.15)' }}>
                📤
              </button>
            )}
          </div>
          <p style={{ fontSize: 11, color: '#d1d5db', marginTop: 14, textAlign: 'center' }}>{BUSINESS_NAME} · v2.1</p>
        </div>
      </div>
    </>
  );

  // ── Page shell ─────────────────────────────────────────────────────────
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(155deg,#f0f9ff 0%,#ffffff 48%,#f5f3ff 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif',
      padding: '20px 0 64px',
    }}>
      {/* Hamburger menu button */}
      <button
        onClick={() => setSidebarOpen(true)}
        aria-label="Open menu"
        style={{
          position: 'fixed', top: 16, left: 16, zIndex: 900,
          background: '#fff', border: '1.5px solid #e5e7eb', borderRadius: 14,
          width: 42, height: 42, cursor: 'pointer',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 5,
          boxShadow: '0 2px 10px rgba(0,0,0,0.10)',
        }}
      >
        <span style={{ width: 18, height: 2, background: '#374151', borderRadius: 2, display: 'block' }} />
        <span style={{ width: 18, height: 2, background: '#374151', borderRadius: 2, display: 'block' }} />
        <span style={{ width: 18, height: 2, background: '#374151', borderRadius: 2, display: 'block' }} />
      </button>

      {renderSidebar()}

      <div style={{ width: '100%', maxWidth: 420, padding: '0 18px' }}>
        <div style={{
          background: '#ffffff', borderRadius: 28,
          boxShadow: '0 8px 40px rgba(0,0,0,0.10)',
          padding: '30px 22px 26px',
        }}>
          {screen === 'rating'     && renderRating()}
          {screen === 'redirected' && renderRedirected()}
          {screen === 'thank_you'  && renderThankYou()}
        </div>
      </div>
      <p style={{ position: 'fixed', bottom: 10, left: 0, right: 0, textAlign: 'center', fontSize: 11, color: '#d1d5db' }}>
        {BUSINESS_NAME} · Review Portal
      </p>
    </div>
  );
}

