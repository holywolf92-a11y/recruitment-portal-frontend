import { useState } from 'react';
import { ArrowRight, Briefcase, Building2, ChevronDown, Globe2, Handshake, Mail, MapPin, Phone, Upload, User2, Users } from 'lucide-react';
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
  nationality: '',
  countryOfInterest: '',
  position: '',
  experience: '',
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

const NATIONALITY_OPTIONS = [
  'Pakistani',
  'Indian',
  'Bangladeshi',
  'Nepali',
  'Sri Lankan',
  'Filipino',
  'Other',
];

const COUNTRY_INTEREST_OPTIONS = [
  'Saudi Arabia',
  'United Arab Emirates',
  'Qatar',
  'Oman',
  'Bahrain',
  'Kuwait',
  'Malaysia',
  'Other',
];

const CANDIDATE_ROLE_OPTIONS = [
  'Civil Engineer',
  'HVAC Technician',
  'Electrician',
  'Plumber',
  'Welder',
  'Driver',
  'Office Staff',
  'General Labor',
  'Other',
];

const EXPERIENCE_OPTIONS = ['Fresher', '1-3 Years', '3-5 Years', '5-10 Years', '10+ Years'];

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

const AUDIENCE_META: Record<IntakeAudience, { label: string; title: string; description: string; icon: typeof Briefcase; submitLabel: string; successTitle: string; successText: string }> = {
  candidate: {
    label: 'Candidate',
    title: 'Candidate Form',
    description: 'Choose your details from the ready-made options and upload your CV.',
    icon: Briefcase,
    submitLabel: 'Submit Application',
    successTitle: 'Application submitted',
    successText: 'Your application was received. We will parse the CV and send your link.',
  },
  employer: {
    label: 'Employer',
    title: 'Employer Form',
    description: 'Share your hiring requirements and company details.',
    icon: Building2,
    submitLabel: 'Submit Requirement',
    successTitle: 'Request submitted',
    successText: 'Your employer request has been received successfully.',
  },
  partner: {
    label: 'Partner',
    title: 'Partner Form',
    description: 'Add your agency details and submit your registration.',
    icon: Handshake,
    submitLabel: 'Submit Registration',
    successTitle: 'Registration submitted',
    successText: 'Your partner registration has been received successfully.',
  },
};

export function PublicApplicationForm() {
  const directAudience = resolveAudienceFromPath();
  const [selectedAudience, setSelectedAudience] = useState<IntakeAudience>(directAudience || 'candidate');
  const [candidateForm, setCandidateForm] = useState(candidateDefaults);
  const [employerForm, setEmployerForm] = useState(employerDefaults);
  const [partnerForm, setPartnerForm] = useState(partnerDefaults);
  const [candidateCv, setCandidateCv] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedAudience, setSubmittedAudience] = useState<IntakeAudience | null>(null);

  const activeAudience = directAudience || selectedAudience;
  const activeMeta = AUDIENCE_META[activeAudience];

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
      await apiClient.submitCandidatePortal(payload);
      setCandidateForm(candidateDefaults);
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

  const successVisible = submittedAudience === activeAudience;

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f4efe8] px-4 py-10 text-stone-900 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute left-[-8rem] top-20 h-72 w-72 rounded-full bg-white/65 blur-3xl" />
      <div className="pointer-events-none absolute right-[-7rem] top-28 h-80 w-80 rounded-full bg-white/55 blur-3xl" />
      <div className="pointer-events-none absolute bottom-16 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-amber-100/70 blur-3xl" />

      <div className={`relative mx-auto ${activeAudience === 'candidate' ? 'max-w-2xl' : 'max-w-3xl'}`}>
        <section className="rounded-[32px] border border-white/60 bg-white/62 p-5 shadow-[0_24px_90px_rgba(0,0,0,0.08)] backdrop-blur-2xl sm:p-7">
          <div className="text-center">
            <h1 className="text-3xl font-semibold tracking-tight text-stone-950 sm:text-4xl">Falisha Jobs</h1>
            <p className="mt-3 text-sm text-stone-600 sm:text-base">Simple application form. Fill your details and press submit.</p>
          </div>

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {(['candidate', 'employer', 'partner'] as IntakeAudience[]).map((audience) => {
              const isActive = activeAudience === audience;
              const Icon = AUDIENCE_META[audience].icon;

              if (directAudience) {
                return (
                  <a
                    key={audience}
                    href={audiencePath(audience)}
                    className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${isActive ? 'bg-stone-950 text-white' : 'bg-white/80 text-stone-700 hover:bg-white'}`}
                  >
                    <Icon className="h-4 w-4" />
                    {AUDIENCE_META[audience].label}
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
                  {AUDIENCE_META[audience].label}
                </button>
              );
            })}
          </div>

          <div className="mt-8 rounded-[24px] border border-stone-200/70 bg-[#fcfaf7]/85 p-4 sm:p-6">
            <div className="mb-6 text-center">
              <h2 className="text-2xl font-semibold text-stone-950">{activeMeta.title}</h2>
              <p className="mt-2 text-sm text-stone-600">{activeMeta.description}</p>
            </div>

            {successVisible && (
              <div className="mb-5 rounded-[22px] border border-emerald-200 bg-emerald-50 px-4 py-4 text-center text-sm text-emerald-800">
                <p className="font-semibold text-emerald-900">{activeMeta.successTitle}</p>
                <p className="mt-1">{activeMeta.successText}</p>
              </div>
            )}

            {activeAudience === 'candidate' && (
              <form className="mx-auto max-w-xl space-y-4" onSubmit={handleCandidateSubmit}>
                <div className="rounded-[28px] border border-[#dce6f3] bg-white p-4 shadow-[0_18px_40px_rgba(15,23,42,0.06)] sm:p-5">
                  <div className="mb-5">
                    <div className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-800">
                      Career Opportunity
                    </div>
                    <h3 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950">Candidate Intake Profile</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">Complete the form, upload your CV, and we will parse it for more details before sending your link.</p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <InputField label="Full Name" value={candidateForm.fullName} onChange={(value) => setCandidateForm((current) => ({ ...current, fullName: value }))} required icon={User2} placeholder="e.g. Muhammad Ahmed" />
                    <InputField label="Email" type="email" value={candidateForm.email} onChange={(value) => setCandidateForm((current) => ({ ...current, email: value }))} required icon={Mail} placeholder="ahmed@example.com" />
                    <InputField label="Phone / WhatsApp" value={candidateForm.phone} onChange={(value) => setCandidateForm((current) => ({ ...current, phone: value }))} required icon={Phone} placeholder="+92 300 1234567" />
                    <SelectField label="Nationality" value={candidateForm.nationality} onChange={(value) => setCandidateForm((current) => ({ ...current, nationality: value }))} options={NATIONALITY_OPTIONS} icon={Globe2} required placeholder="Select nationality" />
                    <SelectField label="Country of Interest" value={candidateForm.countryOfInterest} onChange={(value) => setCandidateForm((current) => ({ ...current, countryOfInterest: value }))} options={COUNTRY_INTEREST_OPTIONS} icon={MapPin} required placeholder="Select country" />
                    <SelectField label="Preferred Role" value={candidateForm.position} onChange={(value) => setCandidateForm((current) => ({ ...current, position: value }))} options={CANDIDATE_ROLE_OPTIONS} icon={Briefcase} required placeholder="Select role" />
                  </div>

                  <ChoiceChips
                    label="Years of Relevant Experience"
                    value={candidateForm.experience}
                    options={EXPERIENCE_OPTIONS}
                    onChange={(value) => setCandidateForm((current) => ({ ...current, experience: value }))}
                  />

                  <label className="mt-4 block rounded-[22px] border border-dashed border-[#c9d4e5] bg-[#f8fbff] p-4 text-sm text-slate-700">
                  <span className="mb-3 flex items-center gap-2 font-medium text-stone-900"><Upload className="h-4 w-4 text-stone-700" /> Upload CV</span>
                  <input type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" onChange={(event) => setCandidateCv(event.target.files?.[0] || null)} className="block w-full text-sm text-stone-700 file:mr-3 file:rounded-full file:border-0 file:bg-stone-950 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white" />
                  <p className="mt-2 text-xs text-stone-500">Your CV will be parsed for more information after submit.</p>
                </label>
                </div>
                <SubmitRow submitting={submitting} error={error} buttonLabel={activeMeta.submitLabel} />
              </form>
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
                <SubmitRow submitting={submitting} error={error} buttonLabel={activeMeta.submitLabel} />
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
                <SubmitRow submitting={submitting} error={error} buttonLabel={activeMeta.submitLabel} />
              </form>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function InputField({ label, value, onChange, required, type = 'text', icon: Icon, placeholder }: { label: string; value: string; onChange: (value: string) => void; required?: boolean; type?: string; icon: typeof Briefcase; placeholder?: string }) {
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
          placeholder={placeholder || label}
        />
      </div>
    </label>
  );
}

function SelectField({ label, value, onChange, required, icon: Icon, options, placeholder }: { label: string; value: string; onChange: (value: string) => void; required?: boolean; icon: typeof Briefcase; options: string[]; placeholder: string }) {
  return (
    <label className="space-y-2">
      <span className="text-xs font-medium uppercase tracking-[0.16em] text-stone-500">{label}{required ? ' *' : ''}</span>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-500" />
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          required={required}
          className="w-full appearance-none rounded-[18px] border border-stone-200 bg-white px-4 py-3 pl-11 pr-11 text-sm text-stone-900 outline-none transition focus:border-stone-400"
        >
          <option value="">{placeholder}</option>
          {options.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
      </div>
    </label>
  );
}

function ChoiceChips({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <div className="space-y-3">
      <span className="text-xs font-medium uppercase tracking-[0.16em] text-stone-500">{label}</span>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const active = value === option;
          return (
            <button
              key={option}
              type="button"
              onClick={() => onChange(option)}
              className={`rounded-full border px-4 py-2 text-sm font-medium transition ${active ? 'border-slate-950 bg-slate-950 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'}`}
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
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
