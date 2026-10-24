// "Find Recruiters" — launches the Falisha Lead Finder (agent-finder) app, which
// discovers recruitment agencies around the world (Google Maps + website
// enrichment + WhatsApp/email outreach tracking). It is a separate secure app
// with its own sign-in, so it opens in its own window: its session cookie is
// first-party there, and it cannot be embedded in an iframe because it serves
// X-Frame-Options: SAMEORIGIN.

import { Globe, ExternalLink, ShieldCheck, Search, MessageSquare } from 'lucide-react';
import { Button } from './ui/button';

function finderUrl(): string {
  const env = (import.meta as { env?: Record<string, string> }).env;
  return env?.VITE_RECRUITER_FINDER_URL || 'https://falisha-agent-finder-production.up.railway.app';
}

const FEATURES = [
  {
    icon: Search,
    title: 'Discover agencies',
    text: 'Find recruitment agencies by city and country across the Gulf and worldwide.',
  },
  {
    icon: Globe,
    title: 'Website enrichment',
    text: 'Auto-enriches each agency with contact details pulled from their website.',
  },
  {
    icon: MessageSquare,
    title: 'Outreach tracking',
    text: 'Track WhatsApp and email outreach to each agency in one place.',
  },
];

export function FindRecruiters() {
  const url = finderUrl();
  const open = () => window.open(url, '_blank', 'noopener,noreferrer');

  return (
    <div className="mx-auto max-w-3xl">
      <div className="rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 p-6 shadow-sm sm:p-8">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white">
            <Globe className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Find Recruiters</h1>
            <p className="mt-1 text-sm text-slate-500">Recruiters around the world</p>
          </div>
        </div>

        <p className="mt-5 text-sm leading-relaxed text-slate-600">
          The Recruiter Finder discovers recruitment agencies worldwide and enriches each with contact
          details for WhatsApp and email outreach. It is a separate secure tool with its own sign-in and
          opens in its own window.
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {FEATURES.map((feature) => (
            <div key={feature.title} className="rounded-xl border border-slate-200 bg-white p-4">
              <feature.icon className="h-5 w-5 text-blue-600" />
              <h3 className="mt-2 text-sm font-semibold text-slate-900">{feature.title}</h3>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">{feature.text}</p>
            </div>
          ))}
        </div>

        <div className="mt-7 flex flex-wrap items-center gap-3">
          <Button onClick={open} className="gap-2">
            <ExternalLink className="h-4 w-4" /> Open Recruiter Finder
          </Button>
          <span className="inline-flex items-center gap-1.5 text-xs text-slate-400">
            <ShieldCheck className="h-3.5 w-3.5" /> Opens in a new secure window
          </span>
        </div>
      </div>
    </div>
  );
}

export default FindRecruiters;
