import { useState, type ReactNode } from 'react';
import { ArrowRight, Briefcase, Building2, ChevronDown, Globe2, Handshake, Mail, MapPin, Phone, Share2, ShieldCheck, Upload, User2, Users } from 'lucide-react';
import { apiClient } from '../lib/apiClient';

type IntakeAudience = 'candidate' | 'employer' | 'partner';

type CandidateFormState = {
  fullName: string;
  email: string;
  phone: string;
  nationality: string;
  countryOfInterest: string;
  position: string;
  experience: string;
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

const candidateDefaults: CandidateFormState = {
  fullName: '',
  email: '',
  phone: '',
  nationality: 'Pakistani',
  countryOfInterest: 'Saudi Arabia',
  position: '',
  experience: '3-5 Years',
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

const NATIONALITY_OPTIONS = ['Pakistani', 'Indian', 'Bangladeshi', 'Nepali', 'Sri Lankan', 'Other'];
const COUNTRY_INTEREST_OPTIONS = ['Saudi Arabia', 'United Arab Emirates', 'Qatar', 'Oman', 'Kuwait', 'Europe (Schengen)', 'United Kingdom'];
const EXPERIENCE_OPTIONS = ['Fresher', '1-3 Years', '3-5 Years', '5-10 Years', '10+ Years'];
const PHONE_CODE_OPTIONS = ['+92', '+91', '+971', '+974', '+968', '+965', '+973', '+44'];

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

function audiencePath(audience: IntakeAudience) {
  return `/apply/${audience}`;
}

export function PublicApplicationForm() {
  const directAudience = resolveAudienceFromPath();
  const [selectedAudience, setSelectedAudience] = useState<IntakeAudience>(directAudience || 'candidate');
  const [candidateForm, setCandidateForm] = useState(candidateDefaults);
  const [candidatePhoneCode, setCandidatePhoneCode] = useState('+92');
  const [candidatePhoneNumber, setCandidatePhoneNumber] = useState('');
  const [candidateCv, setCandidateCv] = useState<File | null>(null);
  const [employerForm, setEmployerForm] = useState(employerDefaults);
  const [partnerForm, setPartnerForm] = useState(partnerDefaults);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedAudience, setSubmittedAudience] = useState<IntakeAudience | null>(null);

  const activeAudience = directAudience || selectedAudience;

  const handleCandidateSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const payload = new FormData();
      const phone = `${candidatePhoneCode} ${candidatePhoneNumber}`.trim();
      const submission: CandidateFormState = {
        ...candidateForm,
        phone,
      };

      Object.entries(submission).forEach(([key, value]) => payload.append(key, value));
      if (candidateCv) {
        payload.append('cv', candidateCv);
      }

      await apiClient.submitCandidatePortal(payload);
      setCandidateForm(candidateDefaults);
      setCandidatePhoneCode('+92');
      setCandidatePhoneNumber('');
      setCandidateCv(null);
      setSubmittedAudience('candidate');
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
      await apiClient.submitEmployerPortal(employerForm);
      setEmployerForm(employerDefaults);
      setSubmittedAudience('employer');
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
      await apiClient.submitPartnerPortal(partnerForm);
      setPartnerForm(partnerDefaults);
      setSubmittedAudience('partner');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      setError(err?.message || 'Failed to submit partner intake.');
    } finally {
      setSubmitting(false);
    }
  };

  if (activeAudience === 'candidate') {
    return (
      <div className="min-h-screen bg-[#f0f4f8]" style={{ fontFamily: 'Manrope, ui-sans-serif, system-ui, sans-serif' }}>

        {/* ── DARK NAVY HERO ── */}
        <div className="relative overflow-hidden bg-gradient-to-br from-[#001529] via-[#003461] to-[#004f91]">
          {/* Decorative blobs */}
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/5" />
          <div className="pointer-events-none absolute bottom-0 left-0 h-48 w-48 rounded-full bg-[#00c6ff]/10 blur-2xl" />
          <div className="pointer-events-none absolute right-10 top-10 h-24 w-24 rounded-full bg-white/5" />
          <div className="pointer-events-none absolute left-[35%] top-[50%] h-2 w-2 rounded-full bg-[#a0f2e1]/60" />
          <div className="pointer-events-none absolute right-[20%] top-[30%] h-3 w-3 rounded-full bg-white/20" />

          {/* Logo bar */}
          <header className="px-5 pb-2 pt-5 sm:px-8">
            <div className="mx-auto flex max-w-lg items-center justify-between">
              <div className="flex items-center gap-3">
                <img src="/logo.png" alt="Falisha" className="h-9 w-9 rounded-xl bg-white/10 object-contain p-1" />
                <div className="leading-none">
                  <p className="text-[15px] font-extrabold text-white">Falisha Jobs</p>
                  <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.22em] text-[#a0f2e1]">Bridging Talent to Opportunities</p>
                </div>
              </div>
              <nav className="hidden items-center gap-5 sm:flex">
                <a className="text-xs font-bold text-white" href="/apply/candidate">Apply</a>
                <a className="text-xs text-white/50 transition hover:text-white" href="/apply/employer">Employers</a>
                <a className="text-xs text-white/50 transition hover:text-white" href="/apply/partner">Partners</a>
              </nav>
            </div>
          </header>

          {/* Hero copy */}
          <div className="px-5 pb-28 pt-7 sm:px-8">
            <div className="mx-auto max-w-lg">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#a0f2e1]/30 bg-[#a0f2e1]/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-[#a0f2e1]">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#a0f2e1]" />
                Now Hiring Globally
              </span>
              <h1 className="mt-4 text-[2.6rem] font-black leading-[1.05] tracking-tight text-white sm:text-5xl">
                Your Future<br />
                <span className="bg-gradient-to-r from-[#a0f2e1] to-[#60c8f5] bg-clip-text text-transparent">Without Borders.</span>
              </h1>
              <p className="mt-3 max-w-sm text-[13px] leading-relaxed text-white/50">
                Join thousands of professionals placed across GCC, Europe &amp; beyond.
              </p>

              {/* Stats row */}
              <div className="mt-7 flex items-center gap-7">
                <div>
                  <p className="text-2xl font-black text-white">2,400+</p>
                  <p className="text-[10px] uppercase tracking-wider text-white/40">Placements</p>
                </div>
                <div className="h-8 w-px bg-white/15" />
                <div>
                  <p className="text-2xl font-black text-white">48h</p>
                  <p className="text-[10px] uppercase tracking-wider text-white/40">Review Time</p>
                </div>
                <div className="h-8 w-px bg-white/15" />
                <div>
                  <p className="text-2xl font-black text-white">12+</p>
                  <p className="text-[10px] uppercase tracking-wider text-white/40">Countries</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── FORM CARD — overlaps the hero bottom ── */}
        <div className="px-4 pb-14 sm:px-6">
          <div className="mx-auto -mt-14 w-full max-w-lg">
            <div className="rounded-3xl bg-white p-6 shadow-[0_20px_60px_rgba(0,52,97,0.16)] sm:p-8">

              {/* Card header */}
              <div className="flex items-center gap-3 border-b border-slate-100 pb-5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#003461]/10">
                  <User2 className="h-5 w-5 text-[#003461]" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#003461]">Candidate Intake Profile</h2>
                  <p className="text-xs text-slate-400">Reviewed within 48 hours by our consultants</p>
                </div>
              </div>

              {submittedAudience === 'candidate' && (
                <div className="mt-5 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-4 text-sm">
                  <p className="font-bold text-emerald-800">Application submitted!</p>
                  <p className="mt-0.5 text-emerald-700">Your CV will be parsed and a link sent after review.</p>
                </div>
              )}

              <form className="mt-5 space-y-5" onSubmit={handleCandidateSubmit}>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <PremiumInput label="Full Name" value={candidateForm.fullName} onChange={(v) => setCandidateForm((c) => ({ ...c, fullName: v }))} placeholder="Muhammad Ahmed" required />
                  <PremiumInput label="Email Address" type="email" value={candidateForm.email} onChange={(v) => setCandidateForm((c) => ({ ...c, email: v }))} placeholder="ahmed@example.com" required />
                </div>

                <CandidatePhoneField code={candidatePhoneCode} number={candidatePhoneNumber} onCodeChange={setCandidatePhoneCode} onNumberChange={setCandidatePhoneNumber} />

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <PremiumSelect label="Nationality" value={candidateForm.nationality} onChange={(v) => setCandidateForm((c) => ({ ...c, nationality: v }))} options={NATIONALITY_OPTIONS} />
                  <PremiumSelect label="Country of Interest" value={candidateForm.countryOfInterest} onChange={(v) => setCandidateForm((c) => ({ ...c, countryOfInterest: v }))} options={COUNTRY_INTEREST_OPTIONS} />
                </div>

                <PremiumInput label="Preferred Role" value={candidateForm.position} onChange={(v) => setCandidateForm((c) => ({ ...c, position: v }))} placeholder="e.g. Civil Engineer, HVAC Tech" required />

                <ChoiceChips label="Years of Experience" value={candidateForm.experience} options={EXPERIENCE_OPTIONS} onChange={(v) => setCandidateForm((c) => ({ ...c, experience: v }))} />

                <CandidateUploadField fileName={candidateCv?.name || null} onFileChange={(f) => setCandidateCv(f)} />

                <label className="flex cursor-pointer items-start gap-3">
                  <input type="checkbox" className="mt-0.5 rounded border-slate-300 text-[#003461] focus:ring-[#003461]/20" />
                  <span className="text-xs leading-5 text-slate-500">
                    I agree to the{' '}
                    <a className="font-semibold text-[#003461] underline" href="/privacy-policy">Privacy Policy</a>{' '}
                    and data processing terms.
                  </span>
                </label>

                <button
                  type="submit"
                  disabled={submitting}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#003461] px-6 py-4 text-sm font-bold text-white shadow-[0_8px_28px_rgba(0,52,97,0.30)] transition hover:bg-[#004b87] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? 'Submitting…' : 'Submit Application'}
                  <ArrowRight className="h-4 w-4" />
                </button>

                {error && (
                  <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
                )}
              </form>
            </div>
          </div>
        </div>

        <footer className="pb-8 text-center">
          <p className="text-xs text-slate-400">
            © 2024 Falisha Jobs ·{' '}
            <a className="transition hover:text-slate-600" href="/privacy-policy">Privacy</a> ·{' '}
            <a className="transition hover:text-slate-600" href="#">Terms</a> ·{' '}
            <a className="transition hover:text-slate-600" href="#">Help</a>
          </p>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4efe8] px-4 py-10 text-stone-900 sm:px-6 lg:px-8" style={{ fontFamily: 'Manrope, ui-sans-serif, system-ui, sans-serif' }}>
      <div className="mx-auto max-w-3xl rounded-[32px] border border-white/60 bg-white/62 p-5 shadow-[0_24px_90px_rgba(0,0,0,0.08)] backdrop-blur-2xl sm:p-7">
        <div className="text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-stone-950 sm:text-4xl">Falisha Jobs</h1>
          <p className="mt-3 text-sm text-stone-600 sm:text-base">Simple application form. Fill your details and press submit.</p>
        </div>

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {(['candidate', 'employer', 'partner'] as IntakeAudience[]).map((audience) => {
            const isActive = activeAudience === audience;
            const Icon = audience === 'candidate' ? Briefcase : audience === 'employer' ? Building2 : Handshake;

            if (directAudience) {
              return (
                <a
                  key={audience}
                  href={audiencePath(audience)}
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${isActive ? 'bg-stone-950 text-white' : 'bg-white/80 text-stone-700 hover:bg-white'}`}
                >
                  <Icon className="h-4 w-4" />
                  {audience[0].toUpperCase() + audience.slice(1)}
                </a>
              );
            }

            return (
              <button
                key={audience}
                type="button"
                onClick={() => {
                  setSelectedAudience(audience);
                  setSubmittedAudience(null);
                  setError(null);
                }}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${isActive ? 'bg-stone-950 text-white' : 'bg-white/80 text-stone-700 hover:bg-white'}`}
              >
                <Icon className="h-4 w-4" />
                {audience[0].toUpperCase() + audience.slice(1)}
              </button>
            );
          })}
        </div>

        <div className="mt-8 rounded-[24px] border border-stone-200/70 bg-[#fcfaf7]/85 p-4 sm:p-6">
          {submittedAudience === activeAudience && (
            <div className="mb-5 rounded-[22px] border border-emerald-200 bg-emerald-50 px-4 py-4 text-center text-sm text-emerald-800">
              <p className="font-semibold text-emerald-900">Submitted successfully</p>
              <p className="mt-1">Your request has been received.</p>
            </div>
          )}

          {activeAudience === 'employer' && (
            <form className="space-y-5" onSubmit={handleEmployerSubmit}>
              <div className="grid gap-4 md:grid-cols-2">
                <InputField label="Company Name" value={employerForm.companyName} onChange={(value) => setEmployerForm((current) => ({ ...current, companyName: value }))} required icon={Building2} />
                <InputField label="Contact Name" value={employerForm.contactName} onChange={(value) => setEmployerForm((current) => ({ ...current, contactName: value }))} required icon={User2} />
                <InputField label="Email" type="email" value={employerForm.email} onChange={(value) => setEmployerForm((current) => ({ ...current, email: value }))} required icon={Mail} />
                <InputField label="Phone / WhatsApp" value={employerForm.phone} onChange={(value) => setEmployerForm((current) => ({ ...current, phone: value }))} required icon={Phone} />
                <InputField label="Country" value={employerForm.country} onChange={(value) => setEmployerForm((current) => ({ ...current, country: value }))} icon={Globe2} />
                <InputField label="City" value={employerForm.city} onChange={(value) => setEmployerForm((current) => ({ ...current, city: value }))} icon={MapPin} />
                <InputField label="Professions Required" value={employerForm.professions} onChange={(value) => setEmployerForm((current) => ({ ...current, professions: value }))} icon={Briefcase} />
                <InputField label="Quantity Needed" value={employerForm.quantity} onChange={(value) => setEmployerForm((current) => ({ ...current, quantity: value }))} icon={Users} />
                <InputField label="Salary Range" value={employerForm.salaryRange} onChange={(value) => setEmployerForm((current) => ({ ...current, salaryRange: value }))} icon={Briefcase} />
                <InputField label="Duty Hours" value={employerForm.dutyHours} onChange={(value) => setEmployerForm((current) => ({ ...current, dutyHours: value }))} icon={Users} />
                <InputField label="Contract Duration" value={employerForm.contractDuration} onChange={(value) => setEmployerForm((current) => ({ ...current, contractDuration: value }))} icon={Briefcase} />
                <InputField label="Benefits Included" value={employerForm.benefitsIncluded} onChange={(value) => setEmployerForm((current) => ({ ...current, benefitsIncluded: value }))} icon={Users} />
              </div>
              <TextAreaField label="Comments" value={employerForm.comments} onChange={(value) => setEmployerForm((current) => ({ ...current, comments: value }))} placeholder="Add any extra hiring details" />
              <SubmitRow submitting={submitting} error={error} buttonLabel="Submit Requirement" />
            </form>
          )}

          {activeAudience === 'partner' && (
            <form className="space-y-5" onSubmit={handlePartnerSubmit}>
              <div className="grid gap-4 md:grid-cols-2">
                <InputField label="Applicant Name" value={partnerForm.applicantName} onChange={(value) => setPartnerForm((current) => ({ ...current, applicantName: value }))} required icon={User2} />
                <InputField label="Email" type="email" value={partnerForm.email} onChange={(value) => setPartnerForm((current) => ({ ...current, email: value }))} required icon={Mail} />
                <InputField label="Phone / WhatsApp" value={partnerForm.phone} onChange={(value) => setPartnerForm((current) => ({ ...current, phone: value }))} required icon={Phone} />
                <InputField label="Company / Agency Name" value={partnerForm.companyName} onChange={(value) => setPartnerForm((current) => ({ ...current, companyName: value }))} icon={Building2} />
                <InputField label="City / Country" value={partnerForm.cityCountry} onChange={(value) => setPartnerForm((current) => ({ ...current, cityCountry: value }))} icon={MapPin} />
                <InputField label="District" value={partnerForm.district} onChange={(value) => setPartnerForm((current) => ({ ...current, district: value }))} icon={MapPin} />
                <InputField label="CNIC" value={partnerForm.cnic} onChange={(value) => setPartnerForm((current) => ({ ...current, cnic: value }))} icon={User2} />
                <InputField label="Partner Type" value={partnerForm.partnerType} onChange={(value) => setPartnerForm((current) => ({ ...current, partnerType: value }))} icon={Handshake} />
              </div>
              <SubmitRow submitting={submitting} error={error} buttonLabel="Submit Registration" />
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function TrustBadge({ icon, title, subtitle }: { icon: ReactNode; title: string; subtitle: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl bg-white p-4 shadow-[0_12px_32px_rgba(0,52,97,0.08)]">
      {icon}
      <div>
        <p className="text-xs font-bold uppercase text-[#003461]">{title}</p>
        <p className="text-[10px] text-[#424750]">{subtitle}</p>
      </div>
    </div>
  );
}

function PremiumInput({ label, value, onChange, placeholder, type = 'text', required }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; type?: string; required?: boolean }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 transition placeholder:text-slate-400 focus:border-[#003461] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#003461]/10"
      />
    </div>
  );
}

function PremiumSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[] }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</label>
      <div className="relative">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 transition focus:border-[#003461] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#003461]/10"
        >
          {options.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      </div>
    </div>
  );
}

function CandidatePhoneField({ code, number, onCodeChange, onNumberChange }: { code: string; number: string; onCodeChange: (value: string) => void; onNumberChange: (value: string) => void }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Phone / WhatsApp</label>
      <div className="flex gap-2">
        <div className="relative w-24 shrink-0">
          <select
            value={code}
            onChange={(event) => onCodeChange(event.target.value)}
            className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 pr-7 text-sm text-slate-900 transition focus:border-[#003461] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#003461]/10"
          >
            {PHONE_CODE_OPTIONS.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
        </div>
        <input
          type="tel"
          value={number}
          onChange={(event) => onNumberChange(event.target.value)}
          required
          placeholder="300 1234567"
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 transition placeholder:text-slate-400 focus:border-[#003461] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#003461]/10"
        />
      </div>
    </div>
  );
}

function CandidateUploadField({ fileName, onFileChange }: { fileName: string | null; onFileChange: (file: File | null) => void }) {
  return (
    <div className="space-y-1.5">
      <span className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Upload CV (PDF preferred)</span>
      <label className="relative flex h-28 w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 transition hover:border-[#003461]/40 hover:bg-white">
        <input
          type="file"
          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
          onChange={(event) => onFileChange(event.target.files?.[0] || null)}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
        <Upload className="mb-1.5 h-6 w-6 text-[#003461]/30" />
        <p className="text-xs font-medium text-slate-500">{fileName || 'Drop file here or click to browse'}</p>
        <p className="text-[10px] text-slate-400">PDF, DOC, DOCX · Max 5MB</p>
      </label>
    </div>
  );
}

function InputField({ label, value, onChange, required, type = 'text', icon: Icon }: { label: string; value: string; onChange: (value: string) => void; required?: boolean; type?: string; icon: typeof Briefcase }) {
  return (
    <label className="space-y-2">
      <span className="text-xs font-medium uppercase tracking-[0.16em] text-stone-500">{label}{required ? ' *' : ''}</span>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-500" />
        <input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          required={required}
          className="w-full rounded-[18px] border border-stone-200 bg-white px-4 py-3 pl-11 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-stone-400"
          placeholder={label}
        />
      </div>
    </label>
  );
}

function TextAreaField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder: string }) {
  return (
    <label className="space-y-2">
      <span className="text-xs font-medium uppercase tracking-[0.16em] text-stone-500">{label}</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={4}
        placeholder={placeholder}
        className="w-full rounded-[18px] border border-stone-200 bg-white px-4 py-3 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-stone-400"
      />
    </label>
  );
}

function ChoiceChips({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <div className="space-y-3">
      <span className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</span>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const active = value === option;
          return (
            <button
              key={option}
              type="button"
              onClick={() => onChange(option)}
              className={`rounded-full border px-4 py-1.5 text-xs font-semibold transition ${active ? 'border-[#003461] bg-[#003461] text-white shadow-[0_4px_14px_rgba(0,52,97,0.25)]' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'}`}
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SubmitButton({ submitting, label }: { submitting: boolean; label: string }) {
  return (
    <button
      type="submit"
      disabled={submitting}
      className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[linear-gradient(135deg,#003461_0%,#004b87_100%)] px-10 py-4 font-semibold tracking-wide text-white shadow-[0_12px_32px_rgba(0,52,97,0.08)] transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60 md:w-auto"
    >
      {submitting ? 'Submitting...' : label}
      <ArrowRight className="h-4 w-4" />
    </button>
  );
}

function SubmitRow({ submitting, error, buttonLabel }: { submitting: boolean; error: string | null; buttonLabel: string }) {
  return (
    <div className="space-y-3 pt-2">
      {error && <div className="rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
      <button type="submit" disabled={submitting} className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-stone-950 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-60">
        {submitting ? 'Submitting...' : buttonLabel}
        <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}
