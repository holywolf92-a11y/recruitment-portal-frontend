import { useMemo, useState } from 'react';
import { ArrowRight, Briefcase, Building2, CheckCircle2, Globe2, Handshake, Link2, Mail, MapPin, Phone, ShieldCheck, Sparkles, Upload, User2, Users } from 'lucide-react';
import { apiClient, type PublicCandidatePortalResponse, type PublicEmployerPortalResponse, type PublicPartnerPortalResponse, type SocialLinksPayload } from '../lib/apiClient';

type IntakeAudience = 'candidate' | 'employer' | 'partner';

type CandidateFormState = {
  fullName: string;
  email: string;
  phone: string;
  nationality: string;
  currentLocation: string;
  countryOfInterest: string;
  position: string;
  experience: string;
  skills: string;
  languages: string;
  additionalInfo: string;
};

type EmployerFormState = {
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  country: string;
  city: string;
  professions: string;
  quantity: string;
  salaryRange: string;
  dutyHours: string;
  contractDuration: string;
  benefitsIncluded: string;
  comments: string;
};

type PartnerFormState = {
  applicantName: string;
  email: string;
  phone: string;
  companyName: string;
  cityCountry: string;
  district: string;
  cnic: string;
  partnerType: string;
};

const SOCIAL_LINKS: SocialLinksPayload = {
  linkedin: 'https://www.linkedin.com/company/falishaenterprises',
  facebook: 'https://www.facebook.com/falishaenterprises.pk/',
  instagram: 'https://www.instagram.com/falisha.manpower',
  tiktok: 'https://www.tiktok.com/@falishamanpower',
  youtube: 'https://youtube.com/@falishamanpower897?si=-sKB5_wZdoICyLbj',
  whatsappChannel: null,
};

const candidateDefaults: CandidateFormState = {
  fullName: '',
  email: '',
  phone: '',
  nationality: '',
  currentLocation: '',
  countryOfInterest: '',
  position: '',
  experience: '',
  skills: '',
  languages: '',
  additionalInfo: '',
};

const employerDefaults: EmployerFormState = {
  companyName: '',
  contactName: '',
  email: '',
  phone: '',
  country: '',
  city: '',
  professions: '',
  quantity: '',
  salaryRange: '',
  dutyHours: '',
  contractDuration: '',
  benefitsIncluded: '',
  comments: '',
};

const partnerDefaults: PartnerFormState = {
  applicantName: '',
  email: '',
  phone: '',
  companyName: '',
  cityCountry: '',
  district: '',
  cnic: '',
  partnerType: '',
};

function resolveAudienceFromPath(): IntakeAudience | null {
  if (typeof window === 'undefined') {
    return 'candidate';
  }

  const normalized = window.location.pathname.replace(/\/+$/, '') || '/apply';
  if (normalized === '/apply/candidate') return 'candidate';
  if (normalized === '/apply/employer') return 'employer';
  if (normalized === '/apply/partner') return 'partner';
  return null;
}

function successCardLinks(links: SocialLinksPayload) {
  return [
    { label: 'LinkedIn', href: links.linkedin },
    { label: 'Facebook', href: links.facebook },
    { label: 'Instagram', href: links.instagram },
    { label: 'TikTok', href: links.tiktok },
    { label: 'YouTube', href: links.youtube },
    ...(links.whatsappChannel ? [{ label: 'WhatsApp Channel', href: links.whatsappChannel }] : []),
  ];
}

function audiencePath(audience: IntakeAudience) {
  return `/apply/${audience}`;
}

export function PublicApplicationForm() {
  const directAudience = resolveAudienceFromPath();
  const [candidateForm, setCandidateForm] = useState(candidateDefaults);
  const [employerForm, setEmployerForm] = useState(employerDefaults);
  const [partnerForm, setPartnerForm] = useState(partnerDefaults);
  const [candidateCv, setCandidateCv] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [candidateResult, setCandidateResult] = useState<PublicCandidatePortalResponse | null>(null);
  const [employerResult, setEmployerResult] = useState<PublicEmployerPortalResponse | null>(null);
  const [partnerResult, setPartnerResult] = useState<PublicPartnerPortalResponse | null>(null);

  const heroAudience = directAudience || 'candidate';

  const heroCopy = useMemo(() => ({
    candidate: {
      eyebrow: 'Candidate Intake',
      title: 'Apply once. Own your profile afterwards.',
      description: 'Submit your job-seeker brief, upload your CV, and get your profile link immediately on the page and on WhatsApp.',
      accent: 'from-amber-300/28 via-orange-300/12 to-rose-200/10',
    },
    employer: {
      eyebrow: 'Employer Intake',
      title: 'Open a hiring command center, not a plain lead form.',
      description: 'Tell Falisha what workforce you need and receive employer portal access with your dashboard link and login credentials.',
      accent: 'from-sky-300/22 via-cyan-300/10 to-emerald-200/10',
    },
    partner: {
      eyebrow: 'Partner Intake',
      title: 'Become a verified Falisha partner with instant portal access.',
      description: 'Register your agency details, receive your portal credentials, and continue candidate submissions through the partner dashboard.',
      accent: 'from-amber-300/25 via-fuchsia-200/10 to-emerald-200/10',
    },
  }[heroAudience]), [heroAudience]);

  const handleCandidateSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const payload = new FormData();
      Object.entries(candidateForm).forEach(([key, value]) => payload.append(key, value));
      if (candidateCv) {
        payload.append('cv', candidateCv);
      }
      const result = await apiClient.submitCandidatePortal(payload);
      setCandidateResult(result);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      setError(err?.message || 'Failed to submit candidate intake.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEmployerSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const result = await apiClient.submitEmployerPortal(employerForm);
      setEmployerResult(result);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      setError(err?.message || 'Failed to submit employer intake.');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePartnerSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const result = await apiClient.submitPartnerPortal(partnerForm);
      setPartnerResult(result);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      setError(err?.message || 'Failed to submit partner intake.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderSuccess = () => {
    if (candidateResult) {
      return (
        <SuccessPanel
          badge="Candidate Success"
          title="Your Falisha profile is live."
          description="Your application is saved, and your profile link is ready right away. We also sent it to WhatsApp when a valid number was provided."
          primaryLink={candidateResult.onboardingLink ? { label: 'Open profile link', href: candidateResult.onboardingLink } : null}
          details={[
            { label: 'Reference', value: candidateResult.reference },
            { label: 'WhatsApp delivery', value: candidateResult.whatsappNotified ? 'Sent' : 'Skipped' },
          ]}
          socialLinks={candidateResult.socialLinks}
        />
      );
    }

    if (employerResult) {
      return (
        <SuccessPanel
          badge="Employer Portal Ready"
          title="Your employer dashboard is ready."
          description="Your hiring request is stored, your employer account is linked, and the same credentials were sent to WhatsApp when possible."
          primaryLink={{ label: 'Open employer dashboard', href: employerResult.dashboardUrl }}
          details={[
            { label: 'Login email', value: employerResult.email },
            { label: 'Temporary password', value: employerResult.password || 'Use your existing password' },
            { label: 'WhatsApp delivery', value: employerResult.whatsappNotified ? 'Sent' : 'Skipped' },
          ]}
          socialLinks={employerResult.socialLinks}
        />
      );
    }

    if (partnerResult) {
      return (
        <SuccessPanel
          badge="Partner Portal Ready"
          title="Your partner account is active."
          description="Your agency profile is captured, and your dashboard access is available on this page and through WhatsApp delivery when a valid number was provided."
          primaryLink={{ label: 'Open partner dashboard', href: partnerResult.dashboardUrl }}
          details={[
            { label: 'Login email', value: partnerResult.email },
            { label: 'Temporary password', value: partnerResult.password || 'Use your existing password' },
            { label: 'WhatsApp delivery', value: partnerResult.whatsappNotified ? 'Sent' : 'Skipped' },
          ]}
          socialLinks={partnerResult.socialLinks}
        />
      );
    }

    return null;
  };

  const successContent = renderSuccess();

  return (
    <div className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.2),_transparent_24%),radial-gradient(circle_at_bottom_right,_rgba(14,165,233,0.14),_transparent_28%),linear-gradient(180deg,_#f8efe3,_#f3e5d0_38%,_#ece2d7_100%)] text-stone-900">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <section className={`relative overflow-hidden rounded-[36px] border border-white/50 bg-white/55 p-6 shadow-[0_30px_120px_rgba(120,53,15,0.12)] backdrop-blur-xl sm:p-8 lg:p-10`}>
          <div className={`absolute inset-0 bg-gradient-to-br ${heroCopy.accent}`} />
          <div className="relative grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
            <div className="max-w-3xl space-y-5">
              <p className="inline-flex items-center gap-2 rounded-full border border-stone-900/10 bg-white/50 px-3 py-1 text-xs uppercase tracking-[0.28em] text-stone-700">
                <Sparkles className="h-3.5 w-3.5" /> {heroCopy.eyebrow}
              </p>
              <h1 className="text-4xl font-semibold leading-tight text-stone-950 sm:text-5xl lg:text-6xl" style={{ fontFamily: 'Georgia, Times New Roman, serif' }}>
                {heroCopy.title}
              </h1>
              <p className="max-w-2xl text-base leading-8 text-stone-700 sm:text-lg">
                {heroCopy.description}
              </p>
              <div className="flex flex-wrap gap-3">
                {[
                  { audience: 'candidate' as const, label: 'Job Seeker', icon: Briefcase },
                  { audience: 'employer' as const, label: 'Employer', icon: Building2 },
                  { audience: 'partner' as const, label: 'Partner', icon: Handshake },
                ].map(({ audience, label, icon: Icon }) => {
                  const active = directAudience === audience;
                  return (
                    <a
                      key={audience}
                      href={audiencePath(audience)}
                      className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition ${active ? 'border-stone-900 bg-stone-900 text-white' : 'border-stone-900/10 bg-white/55 text-stone-700 hover:bg-white/80'}`}
                    >
                      <Icon className="h-4 w-4" /> {label}
                    </a>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {[
                { label: 'Candidate portal link', value: 'Success page + WhatsApp', icon: Link2 },
                { label: 'Employer access', value: 'Dashboard + credentials', icon: ShieldCheck },
                { label: 'Partner access', value: 'Dashboard + credentials', icon: Users },
              ].map(({ label, value, icon: Icon }) => (
                <article key={label} className="rounded-[28px] border border-white/45 bg-white/58 p-4 shadow-[0_20px_50px_rgba(120,53,15,0.08)]">
                  <div className="flex items-center justify-between">
                    <p className="text-xs uppercase tracking-[0.22em] text-stone-500">{label}</p>
                    <Icon className="h-4 w-4 text-amber-600" />
                  </div>
                  <p className="mt-5 text-lg font-semibold text-stone-950">{value}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {successContent ? (
          <div className="mt-6">{successContent}</div>
        ) : directAudience ? (
          <div className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <section className="rounded-[32px] border border-white/50 bg-white/62 p-6 shadow-[0_24px_90px_rgba(120,53,15,0.1)] backdrop-blur-xl sm:p-8">
              {directAudience === 'candidate' && (
                <form className="space-y-5" onSubmit={handleCandidateSubmit}>
                  <FormHeader icon={Briefcase} title="Candidate intake" description="Submit your profile once, upload your CV, and continue updates through your Falisha profile link." />
                  <div className="grid gap-4 md:grid-cols-2">
                    <InputField label="Full name" value={candidateForm.fullName} onChange={(value) => setCandidateForm((current) => ({ ...current, fullName: value }))} required icon={User2} />
                    <InputField label="Email" type="email" value={candidateForm.email} onChange={(value) => setCandidateForm((current) => ({ ...current, email: value }))} required icon={Mail} />
                    <InputField label="WhatsApp number" value={candidateForm.phone} onChange={(value) => setCandidateForm((current) => ({ ...current, phone: value }))} required icon={Phone} />
                    <InputField label="Nationality" value={candidateForm.nationality} onChange={(value) => setCandidateForm((current) => ({ ...current, nationality: value }))} icon={Globe2} />
                    <InputField label="Current location" value={candidateForm.currentLocation} onChange={(value) => setCandidateForm((current) => ({ ...current, currentLocation: value }))} icon={MapPin} />
                    <InputField label="Country of interest" value={candidateForm.countryOfInterest} onChange={(value) => setCandidateForm((current) => ({ ...current, countryOfInterest: value }))} icon={Globe2} />
                    <InputField label="Preferred role" value={candidateForm.position} onChange={(value) => setCandidateForm((current) => ({ ...current, position: value }))} icon={Briefcase} />
                    <InputField label="Years of experience" value={candidateForm.experience} onChange={(value) => setCandidateForm((current) => ({ ...current, experience: value }))} icon={Users} />
                  </div>
                  <TextAreaField label="Skills" value={candidateForm.skills} onChange={(value) => setCandidateForm((current) => ({ ...current, skills: value }))} placeholder="Electrical maintenance, MIG welding, housekeeping..." />
                  <TextAreaField label="Languages" value={candidateForm.languages} onChange={(value) => setCandidateForm((current) => ({ ...current, languages: value }))} placeholder="English, Arabic, Urdu..." />
                  <TextAreaField label="Additional information" value={candidateForm.additionalInfo} onChange={(value) => setCandidateForm((current) => ({ ...current, additionalInfo: value }))} placeholder="Certifications, visa status, travel readiness..." />
                  <label className="block rounded-[24px] border border-dashed border-stone-900/16 bg-stone-950/[0.04] p-5 text-sm text-stone-700">
                    <span className="mb-3 flex items-center gap-2 font-medium text-stone-900"><Upload className="h-4 w-4 text-amber-600" /> Upload CV</span>
                    <input type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" onChange={(event) => setCandidateCv(event.target.files?.[0] || null)} className="block w-full text-sm text-stone-700 file:mr-3 file:rounded-full file:border-0 file:bg-stone-900 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white" />
                    <p className="mt-3 text-xs text-stone-500">PDF, DOC, DOCX, JPG, PNG supported. Your CV starts the profile record immediately.</p>
                  </label>
                  <SubmitRow submitting={submitting} error={error} buttonLabel="Create my profile access" />
                </form>
              )}

              {directAudience === 'employer' && (
                <form className="space-y-5" onSubmit={handleEmployerSubmit}>
                  <FormHeader icon={Building2} title="Employer intake" description="Give us the commercial brief once and get a proper employer portal instead of a dead-end lead form." />
                  <div className="grid gap-4 md:grid-cols-2">
                    <InputField label="Company name" value={employerForm.companyName} onChange={(value) => setEmployerForm((current) => ({ ...current, companyName: value }))} required icon={Building2} />
                    <InputField label="Contact person" value={employerForm.contactName} onChange={(value) => setEmployerForm((current) => ({ ...current, contactName: value }))} required icon={User2} />
                    <InputField label="Business email" type="email" value={employerForm.email} onChange={(value) => setEmployerForm((current) => ({ ...current, email: value }))} required icon={Mail} />
                    <InputField label="WhatsApp number" value={employerForm.phone} onChange={(value) => setEmployerForm((current) => ({ ...current, phone: value }))} required icon={Phone} />
                    <InputField label="Country" value={employerForm.country} onChange={(value) => setEmployerForm((current) => ({ ...current, country: value }))} icon={Globe2} />
                    <InputField label="City" value={employerForm.city} onChange={(value) => setEmployerForm((current) => ({ ...current, city: value }))} icon={MapPin} />
                    <InputField label="Professions required" value={employerForm.professions} onChange={(value) => setEmployerForm((current) => ({ ...current, professions: value }))} icon={Briefcase} />
                    <InputField label="Quantity needed" value={employerForm.quantity} onChange={(value) => setEmployerForm((current) => ({ ...current, quantity: value }))} icon={Users} />
                    <InputField label="Salary range" value={employerForm.salaryRange} onChange={(value) => setEmployerForm((current) => ({ ...current, salaryRange: value }))} icon={ShieldCheck} />
                    <InputField label="Duty hours" value={employerForm.dutyHours} onChange={(value) => setEmployerForm((current) => ({ ...current, dutyHours: value }))} icon={ShieldCheck} />
                    <InputField label="Contract duration" value={employerForm.contractDuration} onChange={(value) => setEmployerForm((current) => ({ ...current, contractDuration: value }))} icon={ShieldCheck} />
                    <InputField label="Benefits included" value={employerForm.benefitsIncluded} onChange={(value) => setEmployerForm((current) => ({ ...current, benefitsIncluded: value }))} icon={ShieldCheck} />
                  </div>
                  <TextAreaField label="Comments" value={employerForm.comments} onChange={(value) => setEmployerForm((current) => ({ ...current, comments: value }))} placeholder="Visa timelines, accommodation notes, interview flow, mobilization window..." />
                  <SubmitRow submitting={submitting} error={error} buttonLabel="Activate employer portal" />
                </form>
              )}

              {directAudience === 'partner' && (
                <form className="space-y-5" onSubmit={handlePartnerSubmit}>
                  <FormHeader icon={Handshake} title="Partner intake" description="Register once, receive your partner credentials, and continue candidate submissions inside the portal." />
                  <div className="grid gap-4 md:grid-cols-2">
                    <InputField label="Applicant name" value={partnerForm.applicantName} onChange={(value) => setPartnerForm((current) => ({ ...current, applicantName: value }))} required icon={User2} />
                    <InputField label="Business email" type="email" value={partnerForm.email} onChange={(value) => setPartnerForm((current) => ({ ...current, email: value }))} required icon={Mail} />
                    <InputField label="WhatsApp number" value={partnerForm.phone} onChange={(value) => setPartnerForm((current) => ({ ...current, phone: value }))} required icon={Phone} />
                    <InputField label="Company or agency name" value={partnerForm.companyName} onChange={(value) => setPartnerForm((current) => ({ ...current, companyName: value }))} icon={Building2} />
                    <InputField label="City and country" value={partnerForm.cityCountry} onChange={(value) => setPartnerForm((current) => ({ ...current, cityCountry: value }))} icon={MapPin} />
                    <InputField label="District" value={partnerForm.district} onChange={(value) => setPartnerForm((current) => ({ ...current, district: value }))} icon={MapPin} />
                    <InputField label="CNIC" value={partnerForm.cnic} onChange={(value) => setPartnerForm((current) => ({ ...current, cnic: value }))} icon={ShieldCheck} />
                    <InputField label="Partner type" value={partnerForm.partnerType} onChange={(value) => setPartnerForm((current) => ({ ...current, partnerType: value }))} icon={Handshake} />
                  </div>
                  <SubmitRow submitting={submitting} error={error} buttonLabel="Create partner access" />
                </form>
              )}
            </section>

            <aside className="space-y-6">
              <InfoCard
                title="What happens next"
                items={directAudience === 'candidate'
                  ? ['Your intake creates the candidate profile immediately.', 'Your profile link appears here after submit.', 'The same profile link is also sent on WhatsApp when possible.']
                  : directAudience === 'employer'
                    ? ['Your hiring brief is stored in the employer portal.', 'Your dashboard link and login credentials appear on success.', 'The same access package is also sent on WhatsApp when possible.']
                    : ['Your partner application is saved against one verified account.', 'Your dashboard link and credentials appear on success.', 'The same access package is also sent on WhatsApp when possible.']}
              />
              <InfoCard title="Social touchpoints" items={successCardLinks(SOCIAL_LINKS).map((item) => `${item.label}: ${item.href}`)} />
            </aside>
          </div>
        ) : (
          <section className="mt-6 grid gap-5 lg:grid-cols-3">
            <AudienceCard href="/apply/candidate" icon={Briefcase} title="Job Seeker Portal" description="Upload your CV, get your profile link, and continue updates in a dedicated profile flow." />
            <AudienceCard href="/apply/employer" icon={Building2} title="Employer Portal" description="Open a hiring workspace, receive credentials instantly, and keep Falisha aligned through one employer login." />
            <AudienceCard href="/apply/partner" icon={Handshake} title="Partner Portal" description="Register your agency, receive your partner credentials, and submit future candidates through the partner dashboard." />
          </section>
        )}
      </div>
    </div>
  );
}

function FormHeader({ icon: Icon, title, description }: { icon: typeof Briefcase; title: string; description: string }) {
  return (
    <div className="space-y-3">
      <div className="inline-flex items-center gap-2 rounded-full border border-stone-900/10 bg-stone-900/[0.03] px-3 py-1 text-xs uppercase tracking-[0.22em] text-stone-600">
        <Icon className="h-3.5 w-3.5 text-amber-600" /> {title}
      </div>
      <p className="max-w-2xl text-sm leading-7 text-stone-600">{description}</p>
    </div>
  );
}

function InputField({ label, value, onChange, required, type = 'text', icon: Icon }: { label: string; value: string; onChange: (value: string) => void; required?: boolean; type?: string; icon: typeof Briefcase }) {
  return (
    <label className="space-y-2">
      <span className="text-xs uppercase tracking-[0.18em] text-stone-500">{label}{required ? ' *' : ''}</span>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-600" />
        <input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          required={required}
          className="w-full rounded-[22px] border border-stone-900/10 bg-white/80 py-3 pl-11 pr-4 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-stone-900/20 focus:bg-white"
          placeholder={label}
        />
      </div>
    </label>
  );
}

function TextAreaField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder: string }) {
  return (
    <label className="space-y-2">
      <span className="text-xs uppercase tracking-[0.18em] text-stone-500">{label}</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={4}
        placeholder={placeholder}
        className="w-full rounded-[24px] border border-stone-900/10 bg-white/80 px-4 py-3 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-stone-900/20 focus:bg-white"
      />
    </label>
  );
}

function SubmitRow({ submitting, error, buttonLabel }: { submitting: boolean; error: string | null; buttonLabel: string }) {
  return (
    <div className="space-y-3 pt-2">
      {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
      <button type="submit" disabled={submitting} className="inline-flex items-center gap-2 rounded-full bg-stone-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-60">
        {submitting ? 'Submitting...' : buttonLabel}
        <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}

function InfoCard({ title, items }: { title: string; items: string[] }) {
  return (
    <article className="rounded-[30px] border border-white/50 bg-white/60 p-6 shadow-[0_24px_90px_rgba(120,53,15,0.1)] backdrop-blur-xl">
      <h3 className="text-xl font-semibold text-stone-950" style={{ fontFamily: 'Georgia, Times New Roman, serif' }}>{title}</h3>
      <div className="mt-4 space-y-3 text-sm leading-7 text-stone-600">
        {items.map((item) => (
          <p key={item} className="rounded-2xl border border-stone-900/8 bg-stone-950/[0.03] px-4 py-3">{item}</p>
        ))}
      </div>
    </article>
  );
}

function AudienceCard({ href, icon: Icon, title, description }: { href: string; icon: typeof Briefcase; title: string; description: string }) {
  return (
    <a href={href} className="group rounded-[32px] border border-white/50 bg-white/62 p-6 shadow-[0_24px_90px_rgba(120,53,15,0.1)] backdrop-blur-xl transition hover:-translate-y-0.5 hover:bg-white/76">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-stone-950 text-white">
        <Icon className="h-5 w-5" />
      </div>
      <h2 className="mt-5 text-2xl font-semibold text-stone-950" style={{ fontFamily: 'Georgia, Times New Roman, serif' }}>{title}</h2>
      <p className="mt-3 text-sm leading-7 text-stone-600">{description}</p>
      <span className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-stone-900">
        Open intake <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
      </span>
    </a>
  );
}

function SuccessPanel({ badge, title, description, primaryLink, details, socialLinks }: { badge: string; title: string; description: string; primaryLink: { label: string; href: string } | null; details: Array<{ label: string; value: string }>; socialLinks: SocialLinksPayload }) {
  return (
    <section className="rounded-[34px] border border-emerald-200/60 bg-white/72 p-6 shadow-[0_30px_100px_rgba(16,185,129,0.12)] backdrop-blur-xl sm:p-8">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl space-y-4">
          <p className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs uppercase tracking-[0.24em] text-emerald-700">
            <CheckCircle2 className="h-3.5 w-3.5" /> {badge}
          </p>
          <div>
            <h2 className="text-3xl font-semibold text-stone-950" style={{ fontFamily: 'Georgia, Times New Roman, serif' }}>{title}</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-stone-600">{description}</p>
          </div>
          {primaryLink && (
            <a href={primaryLink.href} className="inline-flex items-center gap-2 rounded-full bg-stone-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-stone-800">
              {primaryLink.label} <ArrowRight className="h-4 w-4" />
            </a>
          )}
        </div>
        <div className="grid gap-3 sm:min-w-[320px]">
          {details.map((detail) => (
            <div key={detail.label} className="rounded-2xl border border-stone-900/10 bg-stone-950/[0.03] px-4 py-3">
              <p className="text-xs uppercase tracking-[0.18em] text-stone-500">{detail.label}</p>
              <p className="mt-2 text-sm font-medium text-stone-900">{detail.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        {successCardLinks(socialLinks).map((link) => (
          <a key={link.label} href={link.href} target="_blank" rel="noreferrer" className="rounded-2xl border border-stone-900/10 bg-stone-950/[0.03] px-4 py-3 text-sm text-stone-700 transition hover:bg-stone-950/[0.06]">
            <p className="font-medium text-stone-900">{link.label}</p>
            <p className="mt-1 break-all text-xs text-stone-500">{link.href}</p>
          </a>
        ))}
      </div>
    </section>
  );
}
