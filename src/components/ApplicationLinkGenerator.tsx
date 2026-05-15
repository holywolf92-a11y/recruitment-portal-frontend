import { useState } from 'react';
import { Link2, Copy, QrCode, Check, Mail, Eye, Download, ExternalLink } from 'lucide-react';
import { ApplicationFormPreview } from './ApplicationFormPreview';
import { getPublicApplicationLink } from '../lib/publicUrl';
import { SOCIAL_LINKS, GOOGLE_BUSINESS_LINK } from '../lib/socialLinks';

// SVG brand icon paths (single fill, 24×24 viewBox)
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

// Platforms that support web-share URLs for the application link
const SHAREABLE_KEYS = new Set(['whatsapp-channel', 'facebook', 'linkedin', 'x']);

function buildShareUrl(key: string, appLink: string): string {
  const encodedUrl = encodeURIComponent(appLink);
  const encodedMsg = encodeURIComponent(`🌟 Apply for overseas jobs with Falisha Manpower!\n📝 ${appLink}`);
  if (key === 'whatsapp-channel') return `https://wa.me/?text=${encodedMsg}`;
  if (key === 'facebook') return `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
  if (key === 'linkedin') return `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
  if (key === 'x') return `https://twitter.com/intent/tweet?text=${encodeURIComponent('🌟 Apply for overseas jobs with Falisha Manpower!')}&url=${encodedUrl}`;
  return appLink;
}

function BrandIcon({ platformKey, className = 'h-5 w-5' }: { platformKey: string; className?: string }) {
  const d = BRAND_SVG[platformKey];
  if (!d) return null;
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d={d} />
    </svg>
  );
}

export function ApplicationLinkGenerator() {
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const applicationLink = getPublicApplicationLink();

  const copyToClipboard = () => {
    navigator.clipboard.writeText(applicationLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareViaWhatsApp = () => {
    const message = encodeURIComponent(
      `🌟 *Overseas Job Opportunity* 🌟\n\n` +
      `Apply now with Falisha Manpower for employment in Gulf countries!\n\n` +
      `📝 Fill out our online application form:\n${applicationLink}\n\n` +
      `We're currently recruiting for positions in UAE, Saudi Arabia, Qatar, and more.\n\nApply today!`
    );
    window.open(`https://wa.me/?text=${message}`, '_blank');
  };

  const shareViaEmail = () => {
    const subject = encodeURIComponent('Apply for Overseas Employment - Falisha Manpower');
    const body = encodeURIComponent(
      `Dear Candidate,\n\nThank you for your interest in overseas employment opportunities.\n\n` +
      `Please complete our online application form at:\n${applicationLink}\n\n` +
      `We are currently recruiting for various positions in Gulf countries including UAE, Saudi Arabia, Qatar, Oman, and more.\n\n` +
      `Best regards,\nFalisha Manpower Team`
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const generateQRCode = () =>
    `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(applicationLink)}`;

  const downloadQR = () => {
    const link = document.createElement('a');
    link.href = generateQRCode();
    link.download = 'falisha-application-qr.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const allProfiles = [...SOCIAL_LINKS, GOOGLE_BUSINESS_LINK] as Array<{ key: string; label: string; url: string; accent: string; description: string; buttonLabel: string }>;
  const shareablePlatforms = SOCIAL_LINKS.filter(s => SHAREABLE_KEYS.has(s.key)) as Array<{ key: string; label: string; url: string; accent: string }>;

  return (
    <div className="space-y-5 pb-8">

      {/* ── Hero header ─────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 p-6 text-white shadow-xl">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.13),transparent_60%)]" />
        <div className="relative flex items-start justify-between gap-4">
          <div>
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-widest">
              <Link2 className="h-3 w-3" /> Application Link
            </div>
            <h1 className="text-2xl font-bold leading-tight">Share Your Application Form</h1>
            <p className="mt-1 max-w-lg text-sm text-blue-100">
              Distribute the form link via WhatsApp, email, QR code, or directly on social media to collect candidate applications.
            </p>
          </div>
          <div className="hidden shrink-0 flex-col items-end gap-1 text-right sm:flex">
            <span className="text-3xl font-black">∞</span>
            <span className="text-xs text-blue-200">Unlimited shares</span>
          </div>
        </div>
      </div>

      {/* ── URL Copy Card ────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-gray-400">Public Application URL</p>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Link2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={applicationLink}
              readOnly
              className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-10 pr-4 font-mono text-sm text-gray-700 focus:outline-none"
            />
          </div>
          <button
            onClick={copyToClipboard}
            className={`flex shrink-0 items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white shadow-md transition-all ${
              copied ? 'bg-emerald-500 shadow-emerald-200' : 'bg-blue-600 shadow-blue-200 hover:bg-blue-700'
            }`}
          >
            {copied ? <><Check className="h-4 w-4" /> Copied!</> : <><Copy className="h-4 w-4" /> Copy Link</>}
          </button>
        </div>
      </div>

      {/* ── Quick Share ──────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-gray-400">Quick Share</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <button
            onClick={shareViaWhatsApp}
            className="group flex items-center gap-3 rounded-xl border border-[#25D366]/25 bg-gradient-to-br from-[#f0fdf4] to-[#dcfce7] p-4 text-left transition-all hover:shadow-md"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#25D366] text-white shadow-sm">
              <BrandIcon platformKey="whatsapp-channel" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">WhatsApp</p>
              <p className="text-xs text-gray-500">Send directly to candidates</p>
            </div>
          </button>

          <button
            onClick={shareViaEmail}
            className="group flex items-center gap-3 rounded-xl border border-blue-100 bg-gradient-to-br from-[#eff6ff] to-[#dbeafe] p-4 text-left transition-all hover:shadow-md"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Email</p>
              <p className="text-xs text-gray-500">Send a formatted invitation</p>
            </div>
          </button>

          <button
            onClick={() => setShowQR(!showQR)}
            className="group flex items-center gap-3 rounded-xl border border-purple-100 bg-gradient-to-br from-[#faf5ff] to-[#ede9fe] p-4 text-left transition-all hover:shadow-md"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-600 text-white shadow-sm">
              <QrCode className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">QR Code</p>
              <p className="text-xs text-gray-500">{showQR ? 'Hide QR code' : 'Generate & download'}</p>
            </div>
          </button>
        </div>
      </div>

      {/* ── QR Code Expanded ─────────────────────────────────────────────── */}
      {showQR && (
        <div className="rounded-2xl border border-purple-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="font-semibold text-gray-900">QR Code</p>
              <p className="text-xs text-gray-500">Scan to open the application form</p>
            </div>
            <button
              onClick={downloadQR}
              className="flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-purple-700"
            >
              <Download className="h-4 w-4" /> Download
            </button>
          </div>
          <div className="flex flex-col items-center">
            <div className="rounded-2xl border-2 border-gray-100 bg-white p-5 shadow-inner">
              <img src={generateQRCode()} alt="Application QR Code" className="h-56 w-56" />
            </div>
            <p className="mt-4 max-w-sm text-center text-xs text-gray-500">
              Print and display at your office or recruitment centres, or share on social media. Candidates can scan to apply instantly.
            </p>
          </div>
        </div>
      )}

      {/* ── Share on Social Media ────────────────────────────────────────── */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-4">
          <p className="font-semibold text-gray-900">Share on Social Media</p>
          <p className="mt-0.5 text-xs text-gray-500">Post the application link directly on these platforms</p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {shareablePlatforms.map(platform => (
            <a
              key={platform.key}
              href={buildShareUrl(platform.key, applicationLink)}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col items-center gap-2 rounded-xl border p-4 text-center transition-all hover:shadow-md"
              style={{ borderColor: platform.accent + '33', backgroundColor: platform.accent + '08' }}
            >
              <div
                className="flex h-11 w-11 items-center justify-center rounded-xl text-white shadow-sm transition-transform group-hover:scale-110"
                style={{ backgroundColor: platform.accent }}
              >
                <BrandIcon platformKey={platform.key} />
              </div>
              <p className="text-xs font-semibold text-gray-700">{platform.label}</p>
            </a>
          ))}
        </div>
      </div>

      {/* ── Our Social Profiles ──────────────────────────────────────────── */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-4">
          <p className="font-semibold text-gray-900">Falisha Manpower — Social Profiles</p>
          <p className="mt-0.5 text-xs text-gray-500">Follow and manage the official channels — direct candidates here to stay connected</p>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {allProfiles.map(platform => (
            <a
              key={platform.key}
              href={platform.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-3 rounded-xl border border-gray-100 p-3 transition-all hover:shadow-md"
              style={{ borderLeftWidth: 3, borderLeftColor: platform.accent }}
            >
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white shadow-sm"
                style={{ backgroundColor: platform.accent }}
              >
                <BrandIcon platformKey={platform.key} className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-900">{platform.label}</p>
                <p className="truncate text-xs text-gray-400">{platform.description}</p>
              </div>
              <ExternalLink className="h-3.5 w-3.5 shrink-0 text-gray-300 transition-colors group-hover:text-gray-500" />
            </a>
          ))}
        </div>
      </div>

      {/* ── Tips ────────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50 p-5">
        <p className="mb-4 font-semibold text-blue-900">How to Use</p>
        <div className="space-y-3">
          {[
            { n: '1', title: 'Share the Link', body: 'Copy and paste in your WhatsApp status, Facebook posts, or send directly to candidates.' },
            { n: '2', title: 'Post on Social', body: 'Use the share buttons above to publish the link on Facebook, LinkedIn, X, or WhatsApp.' },
            { n: '3', title: 'Use QR Code', body: 'Print the QR code and display it at your office or recruitment centres for easy scanning.' },
            { n: '4', title: 'Track Applications', body: 'All submissions automatically appear in the Candidate Management section.' },
          ].map(tip => (
            <div key={tip.n} className="flex items-start gap-3">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                {tip.n}
              </div>
              <p className="text-sm text-blue-800">
                <strong>{tip.title}:</strong> {tip.body}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Preview Form ─────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <p className="mb-1 font-semibold text-gray-900">Preview Form</p>
        <p className="mb-4 text-xs text-gray-500">See how the application form looks to candidates before sharing</p>
        <button
          onClick={() => setShowPreview(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-gray-100 px-5 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-200"
        >
          <Eye className="h-4 w-4" /> Open Form Preview
        </button>
      </div>

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">Application Form Preview</h3>
              <button
                onClick={() => setShowPreview(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition-colors hover:bg-gray-200"
              >
                ×
              </button>
            </div>
            <ApplicationFormPreview onClose={() => setShowPreview(false)} />
          </div>
        </div>
      )}
    </div>
  );
}