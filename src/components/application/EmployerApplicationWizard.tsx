'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  Building2,
  CheckCircle2,
  FileText,
  Globe2,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  User2,
  Users,
} from 'lucide-react';
import './ApplicationWizard.css';
import {
  APPLICATION_COUNTRY_OPTIONS,
  APPLICATION_PHONE_CODE_OPTIONS,
} from '@/constants/applicationOptions';
import { apiClient } from '@/lib/apiClient';
import { CallSupport } from './CallSupport';
import type { PublicEmployerPortalResponse } from '@/lib/apiClient';
import type { ApplicationStep } from '@/types/application';

type EmployerWizardForm = {
  companyName: string;
  contactName: string;
  email: string;
  phoneCountryCode: string;
  phoneNumber: string;
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

const STORAGE_KEY = 'falisha_apply_employer_wizard_v1';

const steps: ApplicationStep[] = [
  { id: 1, label: 'Welcome' },
  { id: 2, label: 'Company' },
  { id: 3, label: 'Contact' },
  { id: 4, label: 'Location' },
  { id: 5, label: 'Hiring' },
  { id: 6, label: 'Terms' },
  { id: 7, label: 'Notes' },
  { id: 8, label: 'Review' },
];

const initialForm: EmployerWizardForm = {
  companyName: '',
  contactName: '',
  email: '',
  phoneCountryCode: '+92',
  phoneNumber: '',
  country: 'Saudi Arabia',
  city: '',
  professions: '',
  quantity: '',
  salaryRange: '',
  dutyHours: '',
  contractDuration: '',
  benefitsIncluded: '',
  comments: '',
};

const roleSuggestions = [
  'HVAC Technicians',
  'Civil Engineers',
  'Electricians',
  'Drivers',
  'Welders',
  'Plumbers',
];

export default function EmployerApplicationWizard() {
  const [currentStep, setCurrentStep] = useState(1);
  const [form, setForm] = useState<EmployerWizardForm>(initialForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<PublicEmployerPortalResponse | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved) as { currentStep?: number; form?: EmployerWizardForm };
      setForm({ ...initialForm, ...(parsed.form || {}) });
      if (parsed.currentStep && parsed.currentStep >= 1 && parsed.currentStep <= steps.length) {
        setCurrentStep(parsed.currentStep);
      }
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || currentStep === 9) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ currentStep, form }));
  }, [currentStep, form]);

  const progressPercent = useMemo(() => Math.round((currentStep / steps.length) * 100), [currentStep]);

  function updateField<K extends keyof EmployerWizardForm>(key: K, value: EmployerWizardForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: '' }));
  }

  function validateStep(step: number) {
    const nextErrors: Record<string, string> = {};

    if (step === 2) {
      if (!form.companyName.trim()) nextErrors.companyName = 'Company name is required.';
      if (!form.contactName.trim()) nextErrors.contactName = 'Employer name is required.';
    }

    if (step === 3) {
      if (!form.email.trim()) nextErrors.email = 'Email is required.';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) nextErrors.email = 'Please enter a valid email address.';

      if (!form.phoneNumber.trim()) nextErrors.phoneNumber = 'Phone / WhatsApp number is required.';
      else if (form.phoneNumber.replace(/\D/g, '').length < 9) nextErrors.phoneNumber = 'Please enter a valid phone number.';
    }

    if (step === 4) {
      if (!form.country.trim()) nextErrors.country = 'Country is required.';
      if (!form.city.trim()) nextErrors.city = 'City is required.';
    }

    if (step === 5) {
      if (!form.professions.trim()) nextErrors.professions = 'Professions required is mandatory.';
      if (!form.quantity.trim()) nextErrors.quantity = 'Quantity is required.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function goNext() {
    if (!validateStep(currentStep)) return;
    if (currentStep < steps.length) {
      setCurrentStep((prev) => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  function goBack() {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  async function submitApplication() {
    setIsSubmitting(true);
    setErrors({});
    try {
      const response = await apiClient.submitEmployerPortal({
        companyName: form.companyName.trim(),
        contactName: form.contactName.trim(),
        email: form.email.trim(),
        phone: `${form.phoneCountryCode} ${form.phoneNumber}`.trim(),
        country: form.country.trim(),
        city: form.city.trim(),
        professions: form.professions.trim(),
        quantity: form.quantity.trim(),
        salaryRange: form.salaryRange.trim(),
        dutyHours: form.dutyHours.trim(),
        contractDuration: form.contractDuration.trim(),
        benefitsIncluded: form.benefitsIncluded.trim(),
        comments: form.comments.trim(),
      });
      setResult(response);
      setCurrentStep(9);
      window.localStorage.removeItem(STORAGE_KEY);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error: any) {
      setErrors({ submit: error?.message || 'Failed to submit employer intake.' });
    } finally {
      setIsSubmitting(false);
    }
  }

  function resetWizard() {
    setForm(initialForm);
    setErrors({});
    setResult(null);
    setCurrentStep(1);
    window.localStorage.removeItem(STORAGE_KEY);
  }

  return (
    <section className="application-shell">
      <div className="application-frame">
        <header className="application-header">
          <div className="application-brand-row">
            <div className="application-brand">
              <div className="application-brand-badge">F</div>
              <div className="application-brand-copy">
                <strong>Falisha Jobs</strong>
                <span>Employer intake</span>
              </div>
            </div>
            {currentStep <= 8 && (
              <div className="application-step-chip"><strong>{Math.min(currentStep, 8)}</strong><span>/ 8</span></div>
            )}
          </div>
          {currentStep <= 8 && (
            <div className="application-progress">
              <div className="application-progress-track"><div className="application-progress-fill" style={{ width: `${progressPercent}%` }} /></div>
              <div className="application-progress-meta"><span>{steps[Math.max(currentStep - 1, 0)]?.label}</span><strong>{progressPercent}% complete</strong></div>
            </div>
          )}
        </header>

        <CallSupport variant="employer" />

        <div className="application-body">
          {currentStep === 1 && (
            <div className="application-section application-hero">
              <div className="application-hero-card">
                <div className="application-hero-visual">
                  <div className="application-hero-pill"><Building2 /></div>
                  <div className="application-hero-pill"><Users /></div>
                  <div className="application-hero-pill"><Briefcase /></div>
                </div>
                <h1 className="application-title">Post a <span>requirement</span></h1>
                <p className="application-lead">Tell Falisha what talent you need through a guided flow. Your requirement reaches the same backend, just with a cleaner mobile-first UX.</p>
              </div>
              <div className="application-trust-row">
                <div className="application-trust-card"><strong>Fast intake</strong><span>One step at a time for busy hiring teams.</span></div>
                <div className="application-trust-card"><strong>Draft saved</strong><span>Your progress is stored on this device.</span></div>
                <div className="application-trust-card"><strong>Portal ready</strong><span>Credentials and dashboard links arrive after submit.</span></div>
              </div>
              <button className="application-primary" type="button" onClick={goNext}>Start requirement<ArrowRight /></button>
            </div>
          )}

          {currentStep === 2 && (
            <StepSection title="Tell us about your <span>company</span>" description="We start with the hiring company and the primary contact person.">
              <Field label="Company name *" error={errors.companyName}><input className="application-input" value={form.companyName} onChange={(e) => updateField('companyName', e.target.value)} placeholder="ABC Contracting LLC" /></Field>
              <Field label="Employer name *" error={errors.contactName}><input className="application-input" value={form.contactName} onChange={(e) => updateField('contactName', e.target.value)} placeholder="Muhammad Faisal" /></Field>
              <StepActions onBack={goBack} onNext={goNext} />
            </StepSection>
          )}

          {currentStep === 3 && (
            <StepSection title="How do we <span>reach you?</span>" description="We will use this information for requirement follow-up and portal access.">
              <Field label="Email *" error={errors.email}><input className="application-input" type="email" value={form.email} onChange={(e) => updateField('email', e.target.value)} placeholder="hiring@company.com" /></Field>
              <Field label="Phone / WhatsApp *" error={errors.phoneNumber}>
                <div className="application-grid-two application-phone-row">
                  <select className="application-select" value={form.phoneCountryCode} onChange={(e) => updateField('phoneCountryCode', e.target.value)}>
                    {APPLICATION_PHONE_CODE_OPTIONS.map((option) => <option key={`${option.code}-${option.label}`} value={option.code}>{option.label}</option>)}
                  </select>
                  <input className="application-input" value={form.phoneNumber} onChange={(e) => updateField('phoneNumber', e.target.value)} placeholder="300 1234567" inputMode="tel" />
                </div>
              </Field>
              <InfoText>WhatsApp is preferred for urgent hiring updates and credential delivery.</InfoText>
              <StepActions onBack={goBack} onNext={goNext} />
            </StepSection>
          )}

          {currentStep === 4 && (
            <StepSection title="Where is this <span>hiring need</span>?" description="Add the country and city where the workforce is required.">
              <Field label="Country *" error={errors.country}>
                <select className="application-select" value={form.country} onChange={(e) => updateField('country', e.target.value)}>
                  {APPLICATION_COUNTRY_OPTIONS.map((country) => <option key={country} value={country}>{country}</option>)}
                </select>
              </Field>
              <Field label="City *" error={errors.city}><input className="application-input" value={form.city} onChange={(e) => updateField('city', e.target.value)} placeholder="Riyadh" /></Field>
              <StepActions onBack={goBack} onNext={goNext} />
            </StepSection>
          )}

          {currentStep === 5 && (
            <StepSection title="What roles do you <span>need?</span>" description="Describe the professions and approximate headcount.">
              <Field label="Professions required *" error={errors.professions}><input className="application-input" value={form.professions} onChange={(e) => updateField('professions', e.target.value)} placeholder="HVAC Technicians, Electricians" /></Field>
              <div className="application-chip-grid">
                {roleSuggestions.map((role) => (
                  <button key={role} type="button" className={`application-chip${form.professions === role ? ' is-selected' : ''}`} onClick={() => updateField('professions', role)}>
                    <strong>{role}</strong><span>Tap to use this requirement</span>
                  </button>
                ))}
              </div>
              <Field label="Quantity needed *" error={errors.quantity}><input className="application-input" value={form.quantity} onChange={(e) => updateField('quantity', e.target.value)} placeholder="25" inputMode="numeric" /></Field>
              <StepActions onBack={goBack} onNext={goNext} />
            </StepSection>
          )}

          {currentStep === 6 && (
            <StepSection title="Share the <span>commercial terms</span>" description="This helps the recruitment team qualify and source faster.">
              <Field label="Salary range"><input className="application-input" value={form.salaryRange} onChange={(e) => updateField('salaryRange', e.target.value)} placeholder="SAR 1800 - 2400" /></Field>
              <Field label="Duty hours"><input className="application-input" value={form.dutyHours} onChange={(e) => updateField('dutyHours', e.target.value)} placeholder="10 hours per day" /></Field>
              <Field label="Contract duration"><input className="application-input" value={form.contractDuration} onChange={(e) => updateField('contractDuration', e.target.value)} placeholder="2 years" /></Field>
              <StepActions onBack={goBack} onNext={goNext} />
            </StepSection>
          )}

          {currentStep === 7 && (
            <StepSection title="Any benefits or <span>extra notes</span>?" description="Include accommodation, food, transport, overtime, visa status, or any other hiring notes.">
              <Field label="Benefits included"><input className="application-input" value={form.benefitsIncluded} onChange={(e) => updateField('benefitsIncluded', e.target.value)} placeholder="Accommodation, transport, medical" /></Field>
              <Field label="Comments"><textarea className="application-textarea" rows={6} value={form.comments} onChange={(e) => updateField('comments', e.target.value)} placeholder="Need mobilization within 30 days. Trade tests can be arranged on request." /></Field>
              <StepActions onBack={goBack} onNext={goNext} nextLabel="Review requirement" />
            </StepSection>
          )}

          {currentStep === 8 && (
            <StepSection title="Review your <span>requirement</span>" description="Confirm the hiring brief before submitting it to Falisha.">
              <div className="application-review">
                <ReviewRow label="Company" value={form.companyName} onEdit={() => setCurrentStep(2)} />
                <ReviewRow label="Contact" value={form.contactName} onEdit={() => setCurrentStep(2)} />
                <ReviewRow label="Email" value={form.email} onEdit={() => setCurrentStep(3)} />
                <ReviewRow label="Phone" value={`${form.phoneCountryCode} ${form.phoneNumber}`} onEdit={() => setCurrentStep(3)} />
                <ReviewRow label="Country" value={form.country} onEdit={() => setCurrentStep(4)} />
                <ReviewRow label="City" value={form.city} onEdit={() => setCurrentStep(4)} />
                <ReviewRow label="Professions" value={form.professions} onEdit={() => setCurrentStep(5)} />
                <ReviewRow label="Quantity" value={form.quantity} onEdit={() => setCurrentStep(5)} />
                <ReviewRow label="Salary" value={form.salaryRange || '-'} onEdit={() => setCurrentStep(6)} />
                <ReviewRow label="Duty hours" value={form.dutyHours || '-'} onEdit={() => setCurrentStep(6)} />
                <ReviewRow label="Contract" value={form.contractDuration || '-'} onEdit={() => setCurrentStep(6)} />
                <ReviewRow label="Benefits" value={form.benefitsIncluded || '-'} onEdit={() => setCurrentStep(7)} />
                <ReviewRow label="Comments" value={form.comments || '-'} onEdit={() => setCurrentStep(7)} />
              </div>
              {errors.submit && <AlertBox title="Submission failed" message={errors.submit} />}
              <div className="application-actions">
                <button className="application-secondary" type="button" onClick={goBack}><ArrowLeft />Back</button>
                <button className="application-primary" type="button" onClick={submitApplication} disabled={isSubmitting}>{isSubmitting ? 'Submitting...' : 'Submit requirement'}<ArrowRight /></button>
              </div>
            </StepSection>
          )}

          {currentStep === 9 && result && (
            <div className="application-section application-success">
              <div className="application-success-mark"><CheckCircle2 /></div>
              <div>
                <h1 className="application-step-title">Employer <span>portal ready</span></h1>
                <p className="application-step-description">Your hiring requirement has been submitted. Use the credentials below to track progress in the employer dashboard.</p>
              </div>
              <div className="application-reference-card"><span>Lead ID</span><strong>{result.leadId}</strong></div>
              <CredentialCard email={result.email} password={result.password} />
              <div className="application-success-card"><p>{result.whatsappNotified ? 'Credentials were also sent on WhatsApp.' : 'If WhatsApp delivery is unavailable, you can still use the portal link below.'}</p></div>
              <div className="application-actions">
                <button className="application-secondary" type="button" onClick={resetWizard}>Submit another requirement</button>
                <a className="application-primary" href={result.autoLoginUrl || result.dashboardUrl} target="_blank" rel="noreferrer">Open dashboard<ArrowRight /></a>
              </div>
            </div>
          )}
        </div>

        <footer className="application-footer">Copyright 2026 Falisha Jobs. <a href="/privacy-policy">Privacy</a> · <a href="#">Terms</a></footer>
      </div>
    </section>
  );
}

function StepSection({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="application-section">
      <h1 className="application-step-title" dangerouslySetInnerHTML={{ __html: title }} />
      <p className="application-step-description">{description}</p>
      <div className="application-stack">{children}</div>
    </div>
  );
}

function Field({ label, children, error }: { label: string; children: React.ReactNode; error?: string }) {
  return <label className="application-field"><span>{label}</span>{children}{error && <p className="application-error">{error}</p>}</label>;
}

function InfoText({ children }: { children: React.ReactNode }) {
  return <div className="application-help">{children}</div>;
}

function StepActions({ onBack, onNext, nextLabel = 'Next' }: { onBack: () => void; onNext: () => void; nextLabel?: string }) {
  return (
    <div className="application-actions">
      <button className="application-secondary" type="button" onClick={onBack}><ArrowLeft />Back</button>
      <button className="application-primary" type="button" onClick={onNext}>{nextLabel}<ArrowRight /></button>
    </div>
  );
}

function ReviewRow({ label, value, onEdit }: { label: string; value: string; onEdit: () => void }) {
  return <div className="application-review-row"><span>{label}</span><strong>{value || '-'}</strong><button className="application-edit-button" type="button" onClick={onEdit}>Edit</button></div>;
}

function AlertBox({ title, message }: { title: string; message: string }) {
  return <div className="application-alert"><ShieldCheck /><div><strong>{title}</strong><span>{message}</span></div></div>;
}

function CredentialCard({ email, password }: { email: string; password: string | null }) {
  return (
    <div className="application-success-card">
      <p><strong>Login email:</strong> {email}</p>
      <p><strong>Temporary password:</strong> {password || 'Use your existing password.'}</p>
    </div>
  );
}