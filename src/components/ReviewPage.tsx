import { useState, useCallback } from 'react';

// ─── Config (set these in .env) ──────────────────────────────────────────────
const GOOGLE_REVIEW_URL =
  (import.meta as any).env?.VITE_GOOGLE_REVIEW_URL || 'https://g.page/r/XXXXXX/review';
const API_BASE =
  (import.meta as any).env?.VITE_API_BASE_URL || '/api';
const BUSINESS_NAME =
  (import.meta as any).env?.VITE_BUSINESS_NAME || 'Falisha Manpower';
const BUSINESS_LOGO_URL: string | undefined =
  (import.meta as any).env?.VITE_BUSINESS_LOGO_URL;

// ─── Comment templates ───────────────────────────────────────────────────────
const TEMPLATES = [
  'Excellent service and very professional staff.',
  'Very satisfied with the overall experience.',
  'Quick response and smooth process.',
  'Highly recommended to others.',
  'Friendly team and great support.',
  'Smooth and hassle-free experience.',
] as const;

// ─── Analytics helper (fire-and-forget) ──────────────────────────────────────
function track(event: string, extra?: Record<string, unknown>) {
  fetch(`${API_BASE}/review/analytics`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event, ...extra }),
  }).catch(() => {});
}

// ─── Star component ───────────────────────────────────────────────────────────
function Star({
  filled,
  hovered,
  onClick,
  onMouseEnter,
  onMouseLeave,
  label,
}: {
  filled: boolean;
  hovered: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  label: string;
}) {
  const active = filled || hovered;
  return (
    <button
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      aria-label={label}
      className="focus:outline-none transition-transform active:scale-90"
      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
    >
      <svg
        width="56"
        height="56"
        viewBox="0 0 24 24"
        fill={active ? '#F59E0B' : '#E5E7EB'}
        stroke={active ? '#D97706' : '#D1D5DB'}
        strokeWidth="1"
        style={{
          filter: active ? 'drop-shadow(0 2px 4px rgba(245,158,11,0.4))' : 'none',
          transition: 'all 0.15s ease',
        }}
      >
        <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
      </svg>
    </button>
  );
}

// ─── QR Code page ─────────────────────────────────────────────────────────────
function QRCodePage() {
  const reviewUrl = `${window.location.origin}/review`;
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&ecc=H&data=${encodeURIComponent(reviewUrl)}`;

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 print:p-0">
      <div className="max-w-sm w-full text-center print:shadow-none shadow-lg rounded-2xl p-8 border border-gray-100">
        {BUSINESS_LOGO_URL ? (
          <img src={BUSINESS_LOGO_URL} alt={BUSINESS_NAME} className="h-14 mx-auto mb-4 object-contain" />
        ) : (
          <div className="text-2xl font-bold text-blue-700 mb-4">{BUSINESS_NAME}</div>
        )}
        <p className="text-gray-500 text-sm mb-6">Scan to rate your experience</p>
        <img
          src={qrSrc}
          alt="Review QR Code"
          className="w-64 h-64 mx-auto rounded-xl border border-gray-200"
        />
        <p className="text-gray-400 text-xs mt-4 break-all">{reviewUrl}</p>
        <button
          onClick={() => window.print()}
          className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-full text-sm font-medium hover:bg-blue-700 transition-colors print:hidden"
        >
          Print QR Code
        </button>
        <a
          href={qrSrc}
          download="review-qr.png"
          className="mt-3 block text-sm text-blue-600 hover:underline print:hidden"
        >
          Download PNG
        </a>
      </div>
    </div>
  );
}

// ─── Main Review Page ─────────────────────────────────────────────────────────
type Screen =
  | 'star_select'
  | 'template_select'
  | 'redirected'
  | 'low_rating_form'
  | 'thank_you';

export function ReviewPage() {
  // If path is /review/qr → show printable QR
  if (typeof window !== 'undefined' && window.location.pathname === '/review/qr') {
    return <QRCodePage />;
  }

  const [screen, setScreen] = useState<Screen>('star_select');
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'failed'>('idle');

  // Track page view on first render
  useState(() => {
    track('page_view');
  });

  const handleStarClick = useCallback(
    (value: number) => {
      setRating(value);
      setHoverRating(0);
      track('star_select', { rating: value });

      if (value >= 4) {
        setScreen('template_select');
      } else {
        setScreen('low_rating_form');
      }
    },
    [],
  );

  const handleSubmitToGoogle = useCallback(() => {
    if (selectedTemplate === null) return;

    const text = TEMPLATES[selectedTemplate];
    track('redirect_google', { rating, template_idx: selectedTemplate });

    // Open Google review FIRST (synchronous user gesture → no popup blocker)
    window.open(GOOGLE_REVIEW_URL, '_blank', 'noopener,noreferrer');

    // Then copy to clipboard (async is fine now)
    if (navigator.clipboard?.writeText) {
      navigator.clipboard
        .writeText(text)
        .then(() => setCopyStatus('copied'))
        .catch(() => setCopyStatus('failed'));
    } else {
      // Fallback: execCommand
      try {
        const el = document.createElement('textarea');
        el.value = text;
        el.style.position = 'fixed';
        el.style.opacity = '0';
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
        setCopyStatus('copied');
      } catch {
        setCopyStatus('failed');
      }
    }

    setScreen('redirected');
  }, [selectedTemplate, rating]);

  const handleFeedbackSubmit = useCallback(async () => {
    setSubmitting(true);
    try {
      track('feedback_submit', { rating });
      await fetch(`${API_BASE}/review/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, message: feedbackText }),
      });
    } catch {
      // silent — we still show thank you
    } finally {
      setSubmitting(false);
      setScreen('thank_you');
    }
  }, [rating, feedbackText]);

  // ── Screens ──────────────────────────────────────────────────────────────────

  const renderStarSelect = () => (
    <div className="flex flex-col items-center text-center px-4">
      <div className="mb-8">
        <p className="text-gray-400 text-sm tracking-wider uppercase font-medium">How was your experience?</p>
        <h1 className="text-3xl font-bold text-gray-800 mt-2 leading-tight">Rate Your Experience</h1>
      </div>

      <div className="flex gap-1 mb-6">
        {[1, 2, 3, 4, 5].map((v) => (
          <Star
            key={v}
            filled={v <= rating}
            hovered={v <= hoverRating}
            onClick={() => handleStarClick(v)}
            onMouseEnter={() => setHoverRating(v)}
            onMouseLeave={() => setHoverRating(0)}
            label={`${v} star${v > 1 ? 's' : ''}`}
          />
        ))}
      </div>

      <p className="text-gray-400 text-sm">
        {hoverRating > 0 || rating > 0
          ? ['', 'Very Poor', 'Poor', 'Average', 'Good', 'Excellent'][hoverRating || rating]
          : 'Tap a star to rate'}
      </p>
    </div>
  );

  const renderTemplateSelect = () => (
    <div className="flex flex-col items-center w-full px-4">
      <div className="flex gap-1 mb-3">
        {[1, 2, 3, 4, 5].map((v) => (
          <svg
            key={v}
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill={v <= rating ? '#F59E0B' : '#E5E7EB'}
            stroke={v <= rating ? '#D97706' : '#D1D5DB'}
            strokeWidth="1"
          >
            <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
          </svg>
        ))}
      </div>

      <h2 className="text-xl font-bold text-gray-800 mb-1">Wonderful!</h2>
      <p className="text-gray-500 text-sm mb-5 text-center">
        Select a comment to share on Google, or skip straight to reviewing.
      </p>

      <div className="w-full space-y-2 mb-6">
        {TEMPLATES.map((tpl, idx) => (
          <button
            key={idx}
            onClick={() => {
              setSelectedTemplate(idx === selectedTemplate ? null : idx);
              track('template_select', { template_idx: idx, rating });
            }}
            className={`w-full text-left px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all duration-150 ${
              selectedTemplate === idx
                ? 'border-blue-600 bg-blue-50 text-blue-800'
                : 'border-gray-200 bg-white text-gray-700 hover:border-blue-300 hover:bg-gray-50'
            }`}
          >
            <span className="mr-2">{selectedTemplate === idx ? '✅' : '💬'}</span>
            {tpl}
          </button>
        ))}
      </div>

      <button
        onClick={handleSubmitToGoogle}
        disabled={selectedTemplate === null}
        className={`w-full py-4 rounded-2xl text-white font-bold text-base transition-all duration-150 ${
          selectedTemplate !== null
            ? 'bg-blue-600 hover:bg-blue-700 active:scale-95 shadow-lg shadow-blue-200'
            : 'bg-gray-300 cursor-not-allowed'
        }`}
      >
        👉 Submit Review on Google
      </button>

      <button
        onClick={() => {
          setSelectedTemplate(null);
          window.open(GOOGLE_REVIEW_URL, '_blank', 'noopener,noreferrer');
          track('redirect_google', { rating, template_idx: null });
          setScreen('redirected');
        }}
        className="mt-3 text-sm text-gray-400 hover:text-gray-600 underline underline-offset-2"
      >
        Skip comment and go directly
      </button>
    </div>
  );

  const renderRedirected = () => (
    <div className="flex flex-col items-center text-center px-4">
      <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-6">
        <svg className="w-10 h-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h2 className="text-2xl font-bold text-gray-800 mb-2">Google Review Opened!</h2>

      {selectedTemplate !== null && (
        <>
          {copyStatus === 'copied' && (
            <p className="text-green-600 text-sm font-medium mb-3">
              ✅ Your comment was copied to clipboard — just paste it in Google!
            </p>
          )}
          {copyStatus === 'failed' && (
            <div className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 mb-4 text-left">
              <p className="text-gray-500 text-xs mb-1">Copy this comment manually:</p>
              <p className="text-gray-800 text-sm font-medium">{TEMPLATES[selectedTemplate]}</p>
            </div>
          )}
        </>
      )}

      <p className="text-gray-500 text-sm mb-6 leading-relaxed">
        A new tab opened with the Google review page.{' '}
        {selectedTemplate !== null && copyStatus === 'copied'
          ? 'Paste your comment and hit submit!'
          : 'Write your review and hit submit!'}
      </p>

      <button
        onClick={() => {
          window.open(GOOGLE_REVIEW_URL, '_blank', 'noopener,noreferrer');
        }}
        className="px-8 py-3 bg-blue-600 text-white rounded-2xl font-semibold hover:bg-blue-700 active:scale-95 transition-all"
      >
        Re-open Google Review
      </button>

      <p className="text-gray-400 text-xs mt-6">Thank you for your time! 🙏</p>
    </div>
  );

  const renderLowRatingForm = () => (
    <div className="flex flex-col items-center w-full px-4">
      <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center mb-4">
        <span className="text-3xl">😔</span>
      </div>
      <h2 className="text-xl font-bold text-gray-800 mb-1">We're Sorry</h2>
      <p className="text-gray-500 text-sm mb-6 text-center leading-relaxed">
        We're sorry your experience wasn't perfect.
        <br />
        Please tell us how we can improve.
      </p>

      <div className="flex gap-1 mb-6">
        {[1, 2, 3, 4, 5].map((v) => (
          <svg
            key={v}
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill={v <= rating ? '#F59E0B' : '#E5E7EB'}
            stroke={v <= rating ? '#D97706' : '#D1D5DB'}
            strokeWidth="1"
          >
            <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
          </svg>
        ))}
      </div>

      <textarea
        value={feedbackText}
        onChange={(e) => setFeedbackText(e.target.value)}
        placeholder="Tell us what went wrong or how we can do better... (optional)"
        rows={4}
        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm text-gray-700 resize-none focus:outline-none focus:border-blue-400 transition-colors"
      />

      <button
        onClick={handleFeedbackSubmit}
        disabled={submitting}
        className="w-full mt-4 py-4 rounded-2xl bg-gray-800 text-white font-bold text-base transition-all duration-150 hover:bg-gray-900 active:scale-95 disabled:opacity-60"
      >
        {submitting ? 'Sending...' : 'Submit Feedback'}
      </button>

      <button
        onClick={() => {
          setRating(0);
          setScreen('star_select');
        }}
        className="mt-3 text-sm text-gray-400 hover:text-gray-600 underline underline-offset-2"
      >
        Change my rating
      </button>
    </div>
  );

  const renderThankYou = () => (
    <div className="flex flex-col items-center text-center px-4">
      <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center mb-6">
        <span className="text-4xl">🙏</span>
      </div>
      <h2 className="text-2xl font-bold text-gray-800 mb-3">Thank You!</h2>
      <p className="text-gray-500 text-sm leading-relaxed max-w-xs">
        We've received your feedback and will work hard to improve your experience. We truly appreciate you taking the
        time to let us know.
      </p>
    </div>
  );

  return (
    <div
      className="min-h-screen bg-white flex flex-col items-center justify-center"
      style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}
    >
      {/* Card */}
      <div className="w-full max-w-sm mx-auto flex flex-col items-center py-10 px-2">
        {/* Logo / Business Name */}
        <div className="mb-8 text-center">
          {BUSINESS_LOGO_URL ? (
            <img src={BUSINESS_LOGO_URL} alt={BUSINESS_NAME} className="h-16 mx-auto object-contain" />
          ) : (
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 mb-3 shadow-lg shadow-blue-200">
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
          )}
          <p className="text-gray-400 text-xs font-medium tracking-widest uppercase">{BUSINESS_NAME}</p>
        </div>

        {/* Screen Content */}
        <div className="w-full">
          {screen === 'star_select' && renderStarSelect()}
          {screen === 'template_select' && renderTemplateSelect()}
          {screen === 'redirected' && renderRedirected()}
          {screen === 'low_rating_form' && renderLowRatingForm()}
          {screen === 'thank_you' && renderThankYou()}
        </div>
      </div>

      {/* Footer */}
      <p className="fixed bottom-4 left-0 right-0 text-center text-gray-300 text-xs">
        {BUSINESS_NAME} · Powered by Falisha
      </p>
    </div>
  );
}
