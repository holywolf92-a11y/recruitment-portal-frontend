import { ArrowRight, ExternalLink, Globe2 } from 'lucide-react';
import { useMemo } from 'react';
import { GOOGLE_BUSINESS_LINK, SOCIAL_LINKS } from '../lib/socialLinks';

type SocialLinksLandingProps = {
  includeGoogleBusiness: boolean;
};

type LinkCard = {
  key: string;
  label: string;
  url: string;
  accent: string;
  description: string;
  buttonLabel: string;
};

function FacebookIcon() {
  return <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M13.5 21v-8.2h2.8l.4-3.2h-3.2V7.55c0-.93.27-1.55 1.6-1.55H17V3.14C16.67 3.1 15.56 3 14.28 3c-2.67 0-4.5 1.57-4.5 4.47v2.13H7v3.2h2.78V21h3.72Z"/></svg>;
}

function InstagramIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="3.8"/><circle cx="17.3" cy="6.7" r="1" fill="currentColor" stroke="none"/></svg>;
}

function LinkedInIcon() {
  return <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6.94 8.5A1.56 1.56 0 1 1 6.94 5.38 1.56 1.56 0 0 1 6.94 8.5ZM5.5 10h2.9v8.5H5.5V10Zm4.72 0H13v1.16h.04c.39-.74 1.35-1.52 2.79-1.52 2.98 0 3.53 1.86 3.53 4.29v4.57h-2.9v-4.05c0-.97-.02-2.22-1.42-2.22-1.43 0-1.65 1.06-1.65 2.15v4.12h-2.9V10Z"/></svg>;
}

function TikTokIcon() {
  return <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M14.6 3c.38 2.08 1.67 3.73 3.78 4.25v2.73a7.15 7.15 0 0 1-3.63-1.1v5.43c0 3.08-2.34 5.63-5.52 5.69A5.64 5.64 0 0 1 3.5 14.4c0-3.05 2.45-5.56 5.5-5.68v2.82a2.79 2.79 0 0 0-2.67 2.82c.04 1.5 1.28 2.72 2.79 2.72 1.54 0 2.8-1.26 2.8-2.8V3h2.68Z"/></svg>;
}

function XIcon() {
  return <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.2 3H21l-8.3 8.96L22 21h-7.27l-5.69-6.61L2.9 21H-.9l8.86-9.56L-.6 3h7.46l5.14 5.97L17.2 3Zm-1.28 15.8h2.1L5.72 5.1H3.47l12.45 13.7Z" transform="translate(1.45 0) scale(.92)"/></svg>;
}

function YouTubeIcon() {
  return <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M21.6 7.2a2.98 2.98 0 0 0-2.1-2.1C17.67 4.6 12 4.6 12 4.6s-5.67 0-7.5.5A2.98 2.98 0 0 0 2.4 7.2C1.9 9.03 1.9 12 1.9 12s0 2.97.5 4.8a2.98 2.98 0 0 0 2.1 2.1c1.83.5 7.5.5 7.5.5s5.67 0 7.5-.5a2.98 2.98 0 0 0 2.1-2.1c.5-1.83.5-4.8.5-4.8s0-2.97-.5-4.8ZM10.1 15.03V8.97L15.35 12l-5.25 3.03Z"/></svg>;
}

function WhatsAppIcon() {
  return <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.52 3.48A11.85 11.85 0 0 0 12.06 0C5.54 0 .22 5.3.22 11.82c0 2.08.54 4.1 1.58 5.88L0 24l6.5-1.7a11.78 11.78 0 0 0 5.56 1.42h.01c6.52 0 11.84-5.31 11.84-11.83 0-3.16-1.23-6.12-3.39-8.41Zm-8.46 18.2h-.01a9.9 9.9 0 0 1-5.04-1.38l-.36-.22-3.86 1.01 1.03-3.76-.24-.39a9.78 9.78 0 0 1-1.5-5.13c0-5.42 4.4-9.83 9.83-9.83 2.62 0 5.08 1.02 6.93 2.88a9.76 9.76 0 0 1 2.88 6.95c0 5.42-4.41 9.87-9.83 9.87Zm5.39-7.37c-.3-.15-1.78-.88-2.05-.98-.27-.1-.47-.15-.67.15-.2.3-.77.98-.95 1.18-.17.2-.35.22-.65.07-.3-.15-1.28-.47-2.44-1.5a9.2 9.2 0 0 1-1.69-2.1c-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.5h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48s1.06 2.86 1.21 3.06c.15.2 2.08 3.18 5.04 4.46.7.3 1.26.49 1.69.63.71.22 1.35.19 1.86.11.57-.09 1.78-.73 2.03-1.44.25-.71.25-1.32.17-1.44-.08-.12-.28-.2-.58-.35Z"/></svg>;
}

function GoogleBusinessIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M4 9.5 12 3l8 6.5V19a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V9.5Z"/><path d="M9 21v-6h6v6"/><path d="M9.75 10.75h4.5"/><path d="M12 8.5v4.5"/></svg>;
}

function iconFor(key: string) {
  switch (key) {
    case 'facebook': return <FacebookIcon />;
    case 'instagram': return <InstagramIcon />;
    case 'linkedin': return <LinkedInIcon />;
    case 'tiktok': return <TikTokIcon />;
    case 'x': return <XIcon />;
    case 'youtube': return <YouTubeIcon />;
    case 'whatsapp-channel': return <WhatsAppIcon />;
    case 'google-business-profile': return <GoogleBusinessIcon />;
    default: return <Globe2 className="h-5 w-5" />;
  }
}

function buildCards(includeGoogleBusiness: boolean): LinkCard[] {
  return includeGoogleBusiness
    ? [GOOGLE_BUSINESS_LINK, ...SOCIAL_LINKS]
    : [...SOCIAL_LINKS];
}

export function SocialLinksLanding({ includeGoogleBusiness }: SocialLinksLandingProps) {
  const cards = useMemo(() => buildCards(includeGoogleBusiness), [includeGoogleBusiness]);

  return (
    <div
      className="min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.18),_transparent_26%),radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.14),_transparent_24%),linear-gradient(180deg,#07111f_0%,#0f172a_26%,#f8fafc_26%,#f8fafc_100%)] text-slate-900"
      style={{ fontFamily: 'Manrope, ui-sans-serif, system-ui, sans-serif' }}
    >
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <section className="rounded-[28px] bg-white/96 px-4 py-4 shadow-[0_18px_55px_rgba(15,23,42,0.14)] ring-1 ring-slate-200/80 backdrop-blur sm:px-5 sm:py-5">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {cards.map((card, index) => (
              <a
                key={card.key}
                href={card.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative overflow-hidden rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.07)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_18px_38px_rgba(15,23,42,0.12)] sm:p-5"
              >
                <div className="absolute inset-x-0 top-0 h-1.5" style={{ background: `linear-gradient(90deg, ${card.accent}, rgba(15,23,42,0.88))` }} />
                <div className="flex items-start justify-between gap-3">
                  <div
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white shadow-[0_10px_20px_rgba(15,23,42,0.16)] sm:h-14 sm:w-14"
                    style={{ backgroundColor: card.accent }}
                  >
                    <div className="h-5 w-5 sm:h-6 sm:w-6">{iconFor(card.key)}</div>
                  </div>
                  <div className="rounded-full border border-slate-200 p-2 text-slate-400 transition group-hover:border-slate-300 group-hover:text-slate-700">
                    <ExternalLink className="h-4 w-4" />
                  </div>
                </div>

                <div className="mt-5">
                  <div className="text-lg font-black tracking-tight text-slate-900 sm:text-[1.15rem]">{card.label}</div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{card.description}</p>
                </div>

                <div className="mt-5 flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3.5 text-sm font-semibold text-slate-700">
                  <span>{card.buttonLabel}</span>
                  <ArrowRight className="h-4 w-4" />
                </div>
              </a>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}