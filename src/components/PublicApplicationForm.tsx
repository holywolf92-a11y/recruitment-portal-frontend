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
      <div
        className="falisha-auth-shell falisha-auth-form-pane"
        style={{ fontFamily: 'Manrope, ui-sans-serif, system-ui, sans-serif' }}
      >
        <div className="falisha-auth-form-inner">

          {/* Logo */}
          <div className="mb-8 flex flex-col items-center">
            <img src="/logo.png" alt="Falisha" className="h-16 w-16 object-contain" />
            <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">
              Bridging Talent to Opportunities
            </p>
          </div>

          {/* CTA badges */}
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', borderRadius: '999px', background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.25)', padding: '0.3rem 0.85rem', fontSize: '0.75rem', fontWeight: 700, color: '#0891b2', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              <span style={{ width: '0.45rem', height: '0.45rem', borderRadius: '50%', background: '#06b6d4', display: 'inline-block' }} />
              Pakistan's #1 Overseas Recruitment
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', borderRadius: '999px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.28)', padding: '0.3rem 0.85rem', fontSize: '0.75rem', fontWeight: 700, color: '#059669' }}>
              <span style={{ width: '0.45rem', height: '0.45rem', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
              85,000+ Placed Globally
            </span>
          </div>

          {/* Heading */}
          <div className="falisha-auth-heading-block">
            <h1 className="falisha-auth-heading">Apply Now</h1>
            <p className="falisha-auth-subheading">Submit your profile — we'll find the right opportunity for you abroad.</p>
          </div>

          {/* Success */}
          {submittedAudience === 'candidate' && (
            <div className="falisha-auth-notice falisha-auth-notice-success mb-5">
              <ShieldCheck className="mt-0.5 h-5 w-5 flex-shrink-0" />
              <span>Application submitted! Your CV will be parsed and a link sent after review.</span>
            </div>
          )}

          <form className="falisha-auth-form-fields" onSubmit={handleCandidateSubmit}>

            {/* Full Name */}
            <div className="falisha-auth-field">
              <label className="falisha-auth-field-label">Full Name <span className="text-red-500">*</span></label>
              <div className="falisha-auth-input-wrap">
                <User2 className="falisha-auth-input-icon" />
                <input type="text" value={candidateForm.fullName} onChange={(e) => setCandidateForm((c) => ({ ...c, fullName: e.target.value }))} className="falisha-auth-input" placeholder="Muhammad Ahmed" required />
              </div>
            </div>

            {/* Email */}
            <div className="falisha-auth-field">
              <label className="falisha-auth-field-label">Email Address <span className="text-red-500">*</span></label>
              <div className="falisha-auth-input-wrap">
                <Mail className="falisha-auth-input-icon" />
                <input type="email" value={candidateForm.email} onChange={(e) => setCandidateForm((c) => ({ ...c, email: e.target.value }))} className="falisha-auth-input" placeholder="ahmed@example.com" required />
              </div>
            </div>

            {/* Phone */}
            <div className="falisha-auth-field">
              <label className="falisha-auth-field-label">Phone / WhatsApp <span className="text-red-500">*</span></label>
              <div className="flex gap-2">
                <div className="falisha-auth-input-wrap w-24 shrink-0">
                  <select value={candidatePhoneCode} onChange={(e) => setCandidatePhoneCode(e.target.value)} className="falisha-auth-input falisha-auth-select" style={{ paddingLeft: '0.75rem' }}>
                    {PHONE_CODE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div className="falisha-auth-input-wrap flex-1">
                  <Phone className="falisha-auth-input-icon" />
                  <input type="tel" value={candidatePhoneNumber} onChange={(e) => setCandidatePhoneNumber(e.target.value)} className="falisha-auth-input" placeholder="300 1234567" required />
                </div>
              </div>
            </div>

            {/* Nationality + Country */}
            <div className="grid grid-cols-2 gap-3">
              <div className="falisha-auth-field">
                <label className="falisha-auth-field-label">Nationality</label>
                <div className="falisha-auth-input-wrap">
                  <Globe2 className="falisha-auth-input-icon" />
                  <select value={candidateForm.nationality} onChange={(e) => setCandidateForm((c) => ({ ...c, nationality: e.target.value }))} className="falisha-auth-input falisha-auth-select">
                    {NATIONALITY_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              </div>
              <div className="falisha-auth-field">
                <label className="falisha-auth-field-label">Country of Interest</label>
                <div className="falisha-auth-input-wrap">
                  <MapPin className="falisha-auth-input-icon" />
                  <select value={candidateForm.countryOfInterest} onChange={(e) => setCandidateForm((c) => ({ ...c, countryOfInterest: e.target.value }))} className="falisha-auth-input falisha-auth-select">
                    {COUNTRY_INTEREST_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Preferred Role */}
            <div className="falisha-auth-field">
              <label className="falisha-auth-field-label">Preferred Role <span className="text-red-500">*</span></label>
              <div className="falisha-auth-input-wrap">
                <Briefcase className="falisha-auth-input-icon" />
                <input type="text" value={candidateForm.position} onChange={(e) => setCandidateForm((c) => ({ ...c, position: e.target.value }))} className="falisha-auth-input" placeholder="e.g. Civil Engineer, HVAC Tech" required />
              </div>
            </div>

            {/* Experience chips */}
            <ChoiceChips label="Years of Experience" value={candidateForm.experience} options={EXPERIENCE_OPTIONS} onChange={(v) => setCandidateForm((c) => ({ ...c, experience: v }))} />

            {/* CV Upload */}
            <CandidateUploadField fileName={candidateCv?.name || null} onFileChange={(f) => setCandidateCv(f)} />

            {/* Privacy */}
            <label className="flex cursor-pointer items-start gap-2.5">
              <input type="checkbox" className="falisha-auth-checkbox mt-0.5" />
              <span style={{ fontSize: '0.9rem', lineHeight: '1.6', color: '#374151' }}>
                I agree to the{' '}
                <a className="falisha-auth-link font-semibold" href="/privacy-policy">Privacy Policy</a>
                {' '}and data processing terms.
              </span>
            </label>

            {/* Submit */}
            <button type="submit" disabled={submitting} className="falisha-auth-primary flex items-center justify-center gap-2">
              {submitting ? 'Submitting…' : 'Submit Application'}
              <ArrowRight className="h-4 w-4" />
            </button>

            {error && (
              <div className="falisha-auth-notice falisha-auth-notice-error">
                <span>{error}</span>
              </div>
            )}
          </form>

          <p className="mt-6 text-center" style={{ fontSize: '0.82rem', color: '#9ca3af' }}>
            © 2024 Falisha Jobs ·{' '}
            <a className="falisha-auth-link" href="/privacy-policy">Privacy</a> ·{' '}
            <a className="falisha-auth-link" href="#">Terms</a>
          </p>
        </div>
      </div>
    );
  }

  // ── EMPLOYER ──
  if (activeAudience === 'employer') {
    return (
      <div className="falisha-auth-shell falisha-auth-form-pane falisha-auth-form-pane-signup" style={{ fontFamily: 'Manrope, ui-sans-serif, system-ui, sans-serif' }}>
        <div style={{ width: '100%', maxWidth: '36rem' }}>

          <div className="mb-8 flex flex-col items-center">
            <img src="/logo.png" alt="Falisha" className="h-16 w-16 object-contain" />
            <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">Pakistan's #1 Overseas Recruitment Company</p>
          </div>

          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', borderRadius: '999px', background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.25)', padding: '0.3rem 0.85rem', fontSize: '0.75rem', fontWeight: 700, color: '#0891b2', textTransform: 'uppercase' as const, letterSpacing: '0.1em' }}>
              <span style={{ width: '0.45rem', height: '0.45rem', borderRadius: '50%', background: '#06b6d4', display: 'inline-block' }} />
              Pakistan's #1 Overseas Recruitment
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', borderRadius: '999px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.28)', padding: '0.3rem 0.85rem', fontSize: '0.75rem', fontWeight: 700, color: '#059669' }}>
              <span style={{ width: '0.45rem', height: '0.45rem', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
              Fast · Verified · Compliant
            </span>
          </div>

          <div className="falisha-auth-heading-block">
            <h1 className="falisha-auth-heading">Post a Requirement</h1>
            <p className="falisha-auth-subheading">Tell us what you need — we'll source, screen and deliver.</p>
          </div>

          {submittedAudience === 'employer' && (
            <div className="falisha-auth-notice falisha-auth-notice-success mb-5">
              <ShieldCheck className="mt-0.5 h-5 w-5 flex-shrink-0" />
              <span>Requirement submitted! Our team will be in touch within 24 hours.</span>
            </div>
          )}

          <form className="falisha-auth-form-fields" onSubmit={handleEmployerSubmit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <InputField label="Company Name" value={employerForm.companyName} onChange={(v) => setEmployerForm((c) => ({ ...c, companyName: v }))} required icon={Building2} />
              <InputField label="Contact Name" value={employerForm.contactName} onChange={(v) => setEmployerForm((c) => ({ ...c, contactName: v }))} required icon={User2} />
              <InputField label="Email" type="email" value={employerForm.email} onChange={(v) => setEmployerForm((c) => ({ ...c, email: v }))} required icon={Mail} />
              <InputField label="Phone / WhatsApp" value={employerForm.phone} onChange={(v) => setEmployerForm((c) => ({ ...c, phone: v }))} required icon={Phone} />
              <InputField label="Country" value={employerForm.country} onChange={(v) => setEmployerForm((c) => ({ ...c, country: v }))} icon={Globe2} />
              <InputField label="City" value={employerForm.city} onChange={(v) => setEmployerForm((c) => ({ ...c, city: v }))} icon={MapPin} />
              <InputField label="Professions Required" value={employerForm.professions} onChange={(v) => setEmployerForm((c) => ({ ...c, professions: v }))} icon={Briefcase} />
              <InputField label="Quantity Needed" value={employerForm.quantity} onChange={(v) => setEmployerForm((c) => ({ ...c, quantity: v }))} icon={Users} />
              <InputField label="Salary Range" value={employerForm.salaryRange} onChange={(v) => setEmployerForm((c) => ({ ...c, salaryRange: v }))} icon={Briefcase} />
              <InputField label="Duty Hours" value={employerForm.dutyHours} onChange={(v) => setEmployerForm((c) => ({ ...c, dutyHours: v }))} icon={Users} />
              <InputField label="Contract Duration" value={employerForm.contractDuration} onChange={(v) => setEmployerForm((c) => ({ ...c, contractDuration: v }))} icon={Briefcase} />
              <InputField label="Benefits Included" value={employerForm.benefitsIncluded} onChange={(v) => setEmployerForm((c) => ({ ...c, benefitsIncluded: v }))} icon={Users} />
            </div>
            <TextAreaField label="Comments" value={employerForm.comments} onChange={(v) => setEmployerForm((c) => ({ ...c, comments: v }))} placeholder="Add any extra hiring details" />
            <button type="submit" disabled={submitting} className="falisha-auth-primary flex items-center justify-center gap-2">
              {submitting ? 'Submitting…' : 'Submit Requirement'}
              <ArrowRight className="h-4 w-4" />
            </button>
            {error && <div className="falisha-auth-notice falisha-auth-notice-error"><span>{error}</span></div>}
          </form>

          <p className="mt-6 text-center" style={{ fontSize: '0.82rem', color: '#9ca3af' }}>
            © 2024 Falisha Jobs ·{' '}
            <a className="falisha-auth-link" href="/privacy-policy">Privacy</a> ·{' '}
            <a className="falisha-auth-link" href="#">Terms</a>
          </p>
        </div>
      </div>
    );
  }

  // ── PARTNER ──
  return (
    <div className="falisha-auth-shell falisha-auth-form-pane falisha-auth-form-pane-signup" style={{ fontFamily: 'Manrope, ui-sans-serif, system-ui, sans-serif' }}>
      <div style={{ width: '100%', maxWidth: '36rem' }}>

        <div className="mb-8 flex flex-col items-center">
          <img src="/logo.png" alt="Falisha" className="h-16 w-16 object-contain" />
          <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">Pakistan's #1 Overseas Recruitment Company</p>
        </div>

        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', borderRadius: '999px', background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.25)', padding: '0.3rem 0.85rem', fontSize: '0.75rem', fontWeight: 700, color: '#0891b2', textTransform: 'uppercase' as const, letterSpacing: '0.1em' }}>
            <span style={{ width: '0.45rem', height: '0.45rem', borderRadius: '50%', background: '#06b6d4', display: 'inline-block' }} />
            Pakistan's #1 Overseas Recruitment
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', borderRadius: '999px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.28)', padding: '0.3rem 0.85rem', fontSize: '0.75rem', fontWeight: 700, color: '#059669' }}>
            <span style={{ width: '0.45rem', height: '0.45rem', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
            Earn · Grow · Scale
          </span>
        </div>

        <div className="falisha-auth-heading-block">
          <h1 className="falisha-auth-heading">Become a Partner</h1>
          <p className="falisha-auth-subheading">Join our network of agents and grow your recruitment business with us.</p>
        </div>

        {submittedAudience === 'partner' && (
          <div className="falisha-auth-notice falisha-auth-notice-success mb-5">
            <ShieldCheck className="mt-0.5 h-5 w-5 flex-shrink-0" />
            <span>Registration submitted! We'll contact you shortly to get started.</span>
          </div>
        )}

        <form className="falisha-auth-form-fields" onSubmit={handlePartnerSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <InputField label="Applicant Name" value={partnerForm.applicantName} onChange={(v) => setPartnerForm((c) => ({ ...c, applicantName: v }))} required icon={User2} />
            <InputField label="Email" type="email" value={partnerForm.email} onChange={(v) => setPartnerForm((c) => ({ ...c, email: v }))} required icon={Mail} />
            <InputField label="Phone / WhatsApp" value={partnerForm.phone} onChange={(v) => setPartnerForm((c) => ({ ...c, phone: v }))} required icon={Phone} />
            <InputField label="Company / Agency Name" value={partnerForm.companyName} onChange={(v) => setPartnerForm((c) => ({ ...c, companyName: v }))} icon={Building2} />
            <InputField label="City / Country" value={partnerForm.cityCountry} onChange={(v) => setPartnerForm((c) => ({ ...c, cityCountry: v }))} icon={MapPin} />
            <InputField label="District" value={partnerForm.district} onChange={(v) => setPartnerForm((c) => ({ ...c, district: v }))} icon={MapPin} />
            <InputField label="CNIC" value={partnerForm.cnic} onChange={(v) => setPartnerForm((c) => ({ ...c, cnic: v }))} icon={User2} />
            <InputField label="Partner Type" value={partnerForm.partnerType} onChange={(v) => setPartnerForm((c) => ({ ...c, partnerType: v }))} icon={Handshake} />
          </div>
          <button type="submit" disabled={submitting} className="falisha-auth-primary flex items-center justify-center gap-2">
            {submitting ? 'Submitting…' : 'Submit Registration'}
            <ArrowRight className="h-4 w-4" />
          </button>
          {error && <div className="falisha-auth-notice falisha-auth-notice-error"><span>{error}</span></div>}
        </form>

        <p className="mt-6 text-center" style={{ fontSize: '0.82rem', color: '#9ca3af' }}>
          © 2024 Falisha Jobs ·{' '}
          <a className="falisha-auth-link" href="/privacy-policy">Privacy</a> ·{' '}
          <a className="falisha-auth-link" href="#">Terms</a>
        </p>
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

// PremiumInput kept for backward compat but unused now
function PremiumInput({ label, value, onChange, placeholder, type = 'text', required }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; type?: string; required?: boolean }) {
  return (
    <div className="falisha-auth-field">
      <label className="falisha-auth-field-label">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} required={required} placeholder={placeholder} className="falisha-auth-input" style={{ paddingLeft: '1rem' }} />
    </div>
  );
}

// PremiumSelect kept for backward compat but unused now
function PremiumSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[] }) {
  return (
    <div className="falisha-auth-field">
      <label className="falisha-auth-field-label">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="falisha-auth-input falisha-auth-select" style={{ paddingLeft: '1rem' }}>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

// CandidatePhoneField rendered inline in main form now; keeping stub to avoid errors
function CandidatePhoneField({ code, number, onCodeChange, onNumberChange }: { code: string; number: string; onCodeChange: (value: string) => void; onNumberChange: (value: string) => void }) {
  return (
    <div className="falisha-auth-field">
      <label className="falisha-auth-field-label">Phone / WhatsApp</label>
      <div className="flex gap-2">
        <select value={code} onChange={(e) => onCodeChange(e.target.value)} className="falisha-auth-input falisha-auth-select" style={{ width: '5.5rem', flexShrink: 0, paddingLeft: '0.75rem' }}>
          {PHONE_CODE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
        <div className="falisha-auth-input-wrap flex-1">
          <Phone className="falisha-auth-input-icon" />
          <input type="tel" value={number} onChange={(e) => onNumberChange(e.target.value)} required placeholder="300 1234567" className="falisha-auth-input" />
        </div>
      </div>
    </div>
  );
}

function CandidateUploadField({ fileName, onFileChange }: { fileName: string | null; onFileChange: (file: File | null) => void }) {
  return (
    <div className="falisha-auth-field">
      <label className="falisha-auth-field-label">Upload CV</label>
      <label
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '7rem',
          width: '100%',
          cursor: 'pointer',
          borderRadius: '0.85rem',
          border: '2px dashed #d1d5db',
          background: '#f9fafb',
          transition: 'border-color 160ms ease, background 160ms ease',
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = '#06b6d4'; (e.currentTarget as HTMLElement).style.background = '#f0fdfe'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = '#d1d5db'; (e.currentTarget as HTMLElement).style.background = '#f9fafb'; }}
      >
        <input type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" onChange={(e) => onFileChange(e.target.files?.[0] || null)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }} />
        <div style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '2.2rem', width: '2.2rem', borderRadius: '0.6rem', background: 'rgba(6,182,212,0.1)' }}>
          <Upload style={{ height: '1rem', width: '1rem', color: '#06b6d4' }} />
        </div>
        <p style={{ fontSize: '0.9rem', fontWeight: 600, color: '#374151' }}>{fileName || 'Drop file here or click to browse'}</p>
        <p style={{ marginTop: '0.15rem', fontSize: '0.78rem', color: '#9ca3af' }}>PDF, DOC, DOCX · Max 5MB</p>
      </label>
    </div>
  );
}

function InputField({ label, value, onChange, required, type = 'text', icon: Icon }: { label: string; value: string; onChange: (value: string) => void; required?: boolean; type?: string; icon: typeof Briefcase }) {
  return (
    <div className="falisha-auth-field">
      <label className="falisha-auth-field-label">{label}{required ? <span className="text-red-500"> *</span> : ''}</label>
      <div className="falisha-auth-input-wrap">
        <Icon className="falisha-auth-input-icon" />
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)} required={required} placeholder={label} className="falisha-auth-input" />
      </div>
    </div>
  );
}

function TextAreaField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder: string }) {
  return (
    <div className="falisha-auth-field">
      <label className="falisha-auth-field-label">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
        placeholder={placeholder}
        style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: '0.85rem', background: '#fff', padding: '0.75rem 1rem', fontSize: '1rem', color: '#111827', resize: 'vertical', outline: 'none', transition: 'border-color 160ms ease, box-shadow 160ms ease' }}
        onFocus={(e) => { e.currentTarget.style.borderColor = '#06b6d4'; e.currentTarget.style.boxShadow = '0 0 0 4px rgba(34,211,238,0.15)'; }}
        onBlur={(e) => { e.currentTarget.style.borderColor = '#d1d5db'; e.currentTarget.style.boxShadow = 'none'; }}
      />
    </div>
  );
}

function ChoiceChips({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <div className="falisha-auth-field">
      <label className="falisha-auth-field-label">{label}</label>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const active = value === option;
          return (
            <button
              key={option}
              type="button"
              onClick={() => onChange(option)}
              style={{
                borderRadius: '999px',
                border: active ? '2px solid #06b6d4' : '2px solid #e5e7eb',
                background: active ? '#06b6d4' : '#ffffff',
                color: active ? '#ffffff' : '#4b5563',
                padding: '0.35rem 1rem',
                fontSize: '0.88rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 160ms ease',
                boxShadow: active ? '0 8px 20px rgba(6,182,212,0.28)' : 'none',
              }}
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
