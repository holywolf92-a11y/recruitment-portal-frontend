import { useState } from 'react';
import { SOCIAL_LINKS, GOOGLE_BUSINESS_LINK } from '../lib/socialLinks';

const GOOGLE_REVIEW_URL =
  (import.meta as any).env?.VITE_GOOGLE_REVIEW_URL || 'https://g.page/r/CVmpd5dYUfULEBM/review';

const BRAND_SVG: Record<string, string> = {
  linkedin: 'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z',
  facebook: 'M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z',
  instagram: 'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z',
  tiktok: 'M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z',
  x: 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z',
  youtube: 'M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z',
  'whatsapp-channel': 'M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z',
  'google-business-profile': 'M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z',
};

const allProfiles = [...SOCIAL_LINKS, GOOGLE_BUSINESS_LINK] as Array<{ key: string; label: string; url: string; accent: string; description: string }>;

export function ReviewsDashboard() {
  const [showFeedback, setShowFeedback] = useState(false);
  const [showSocials, setShowSocials] = useState(false);

  const headerH = 64;
  const socialsH = showSocials ? 148 : 0;
  const iframeMinH = showFeedback
    ? `calc(100vh - ${headerH + socialsH}px - 340px)`
    : `calc(100vh - ${headerH + socialsH}px)`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: '100vh', background: '#f8fafc' }}>

      {/* ── Premium Header ─────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 16px', height: headerH, flexShrink: 0,
        background: 'linear-gradient(135deg, #059669 0%, #047857 50%, #065f46 100%)',
        boxShadow: '0 2px 16px rgba(5,150,105,0.35)',
      }}>
        {/* Left: title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'rgba(255,255,255,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, flexShrink: 0,
          }}>⭐</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#fff', lineHeight: 1.2 }}>
              Reviews &amp; Reputation
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 1 }}>
              QR sharing · Social channels · Internal feedback
            </div>
          </div>
        </div>

        {/* Right: action buttons */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <a
            href={GOOGLE_REVIEW_URL}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: 12, fontWeight: 700, color: '#065f46',
              background: '#fff', borderRadius: 10,
              padding: '6px 14px', textDecoration: 'none',
              boxShadow: '0 1px 4px rgba(0,0,0,0.12)',
              display: 'flex', alignItems: 'center', gap: 5,
            }}
          >
            <span>⭐</span> Google Reviews
          </a>
          <button
            onClick={() => setShowSocials(v => !v)}
            style={{
              fontSize: 12, fontWeight: 700,
              color: showSocials ? '#fff' : 'rgba(255,255,255,0.9)',
              background: showSocials ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.15)',
              border: '1.5px solid rgba(255,255,255,0.35)',
              borderRadius: 10, padding: '6px 14px', cursor: 'pointer',
            }}
          >
            {showSocials ? '▲ Social Channels' : '▼ Social Channels'}
          </button>
          <button
            onClick={() => setShowFeedback(v => !v)}
            style={{
              fontSize: 12, fontWeight: 700,
              color: showFeedback ? '#fff' : 'rgba(255,255,255,0.9)',
              background: showFeedback ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.15)',
              border: '1.5px solid rgba(255,255,255,0.35)',
              borderRadius: 10, padding: '6px 14px', cursor: 'pointer',
            }}
          >
            {showFeedback ? '▲ Hide Feedback' : '▼ Internal Feedback'}
          </button>
        </div>
      </div>

      {/* ── Social Channels Panel ──────────────────────────────────────── */}
      {showSocials && (
        <div style={{
          background: '#fff',
          borderBottom: '1px solid #e5e7eb',
          padding: '14px 16px',
          flexShrink: 0,
          height: socialsH,
          boxSizing: 'border-box',
          overflow: 'hidden',
        }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 10px' }}>
            Falisha Manpower · Social Channels
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {allProfiles.map(s => (
              <a
                key={s.key}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                title={s.description}
                style={{
                  display: 'flex', alignItems: 'center', gap: 7,
                  padding: '6px 12px 6px 8px',
                  borderRadius: 10,
                  border: `1.5px solid ${s.accent}33`,
                  background: s.accent + '0d',
                  textDecoration: 'none',
                  transition: 'box-shadow 0.15s',
                }}
                onMouseOver={e => { (e.currentTarget as HTMLAnchorElement).style.boxShadow = `0 2px 10px ${s.accent}44`; }}
                onMouseOut={e => { (e.currentTarget as HTMLAnchorElement).style.boxShadow = 'none'; }}
              >
                <span style={{
                  width: 26, height: 26, borderRadius: 7, flexShrink: 0,
                  background: s.accent,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg style={{ width: 13, height: 13, color: '#fff', fill: '#fff' }} viewBox="0 0 24 24">
                    <path d={BRAND_SVG[s.key] || ''} />
                  </svg>
                </span>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>{s.label}</span>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* ── QR iframe ─────────────────────────────────────────────────── */}
      <iframe
        src="/review/qr"
        style={{
          flex: showFeedback ? undefined : 1,
          width: '100%',
          border: 'none',
          minHeight: iframeMinH,
        }}
        title="Review QR Code"
      />

      {/* ── Internal Feedback (collapsible) ───────────────────────────── */}
      {showFeedback && <FeedbackSection />}
    </div>
  );
}

// ── Lazy-loaded feedback list ──────────────────────────────────────────────
const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || '/api';

function FeedbackSection() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Load once on mount
  useState(() => {
    fetch(`${API_BASE}/review/admin/feedback`)
      .then(r => r.json())
      .then(fb => setData(Array.isArray(fb.feedback) ? fb.feedback : Array.isArray(fb) ? fb : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  });

  return (
    <div style={{ background: '#fff', borderTop: '1px solid #e5e7eb', padding: '16px', maxHeight: 340, overflowY: 'auto', flexShrink: 0 }}>
      <p style={{ fontSize: 13, fontWeight: 700, color: '#374151', margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        Internal Feedback (1–4 ★)
      </p>
      {loading && <p style={{ fontSize: 13, color: '#9ca3af' }}>Loading…</p>}
      {!loading && data.length === 0 && <p style={{ fontSize: 13, color: '#9ca3af' }}>No feedback yet.</p>}
      {data.map((fb: any) => (
        <div key={fb.id} style={{
          padding: '10px 0', borderBottom: '1px solid #f3f4f6',
          display: 'flex', gap: 12, alignItems: 'flex-start',
        }}>
          <span style={{
            fontSize: 12, fontWeight: 800, color: '#fff',
            background: fb.rating <= 2 ? '#dc2626' : '#d97706',
            borderRadius: 6, padding: '2px 7px', flexShrink: 0,
          }}>{fb.rating}★</span>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 13, color: '#374151', margin: '0 0 2px', lineHeight: 1.5 }}>
              {fb.message?.trim() || <em style={{ color: '#9ca3af' }}>No message</em>}
            </p>
            <p style={{ fontSize: 11, color: '#9ca3af', margin: 0 }}>
              {new Date(fb.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}


