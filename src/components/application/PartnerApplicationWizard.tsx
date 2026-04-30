'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  Building2,
  CheckCircle2,
  Globe2,
  Mail,
  MapPin,
  Phone,
  Share2,
  ShieldCheck,
  User2,
} from 'lucide-react';
import './ApplicationWizard.css';
import {
  APPLICATION_COUNTRY_OPTIONS,
  APPLICATION_PHONE_CODE_OPTIONS,
} from '@/constants/applicationOptions';
import { apiClient } from '@/lib/apiClient';
import { useAuth } from '@/lib/authContext';
import type { PublicPartnerPortalResponse } from '@/lib/apiClient';
import type { ApplicationStep } from '@/types/application';

type PartnerWizardForm = {
  applicantName: string;
  companyName: string;
  email: string;
  phoneCountryCode: string;
  phoneNumber: string;
  cityCountry: string;
  district: string;
  cnic: string;
  partnerType: string;
};

const STORAGE_KEY = 'falisha_apply_partner_wizard_v1';

const steps: ApplicationStep[] = [
  { id: 1, label: 'Welcome' },
  { id: 2, label: 'Profile' },
  { id: 3, label: 'Contact' },
  { id: 4, label: 'Location' },
  { id: 5, label: 'Network' },
  { id: 6, label: 'Review' },
];

const initialForm: PartnerWizardForm = {
  applicantName: '',
  companyName: '',
  email: '',
  phoneCountryCode: '+92',
  phoneNumber: '',
  cityCountry: 'Pakistan',
  district: '',
  cnic: '',
  partnerType: '',
};

const partnerTypeOptions = [
  'Individual recruiter',
  'Recruitment agency',
  'Overseas agent',
  'Community referral partner',
];

export default function PartnerApplicationWizard() {
  const { signIn } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [form, setForm] = useState<PartnerWizardForm>(initialForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<PublicPartnerPortalResponse | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved) as { currentStep?: number; form?: PartnerWizardForm };
      setForm({ ...initialForm, ...(parsed.form || {}) });
      if (parsed.currentStep && parsed.currentStep >= 1 && parsed.currentStep <= steps.length) {
        setCurrentStep(parsed.currentStep);
      }
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || currentStep === 7) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ currentStep, form }));
  }, [currentStep, form]);

  const progressPercent = useMemo(() => Math.round((currentStep / steps.length) * 100), [currentStep]);

  function updateField<K extends keyof PartnerWizardForm>(key: K, value: PartnerWizardForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: '' }));
  }

  function validateStep(step: number) {
    const nextErrors: Record<string, string> = {};

    if (step === 2) {
      if (!form.applicantName.trim()) nextErrors.applicantName = 'Name is required.';
    }

    if (step === 3) {
      if (!form.email.trim()) nextErrors.email = 'Email is required.';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) nextErrors.email = 'Please enter a valid email address.';

      if (!form.phoneNumber.trim()) nextErrors.phoneNumber = 'Phone / WhatsApp number is required.';
      else if (form.phoneNumber.replace(/\D/g, '').length < 9) nextErrors.phoneNumber = 'Please enter a valid phone number.';
    }

    if (step === 4) {
      if (!form.cityCountry.trim()) nextErrors.cityCountry = 'Country is required.';
      if (!form.district.trim()) nextErrors.district = 'City is required.';
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
      const response = await apiClient.submitPartnerPortal({
        applicantName: form.applicantName.trim(),
        companyName: form.companyName.trim(),
        email: form.email.trim(),
        phone: `${form.phoneCountryCode} ${form.phoneNumber}`.trim(),
        cityCountry: form.cityCountry.trim(),
        district: form.district.trim(),
        cnic: form.cnic.trim(),
        partnerType: form.partnerType.trim(),
      });

      if (response.autoLoginUrl) {
        window.location.assign(response.autoLoginUrl);
        return;
      }

      if (response.password) {
        try {
          await signIn(response.email, response.password);
          window.location.assign(response.dashboardUrl || '/partner/dashboard');
          return;
        } catch {
          setErrors({ submit: 'Your account was created, but automatic sign-in failed. Use the credentials below to continue.' });
        }
      }

      setResult(response);
      setCurrentStep(7);
      window.localStorage.removeItem(STORAGE_KEY);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error: any) {
      setErrors({ submit: error?.message || 'Failed to submit partner application.' });
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
                <span>Partner intake</span>
              </div>
            </div>
            {currentStep <= 6 && (
              <div className="application-step-chip"><strong>{Math.min(currentStep, 6)}</strong><span>/ 6</span></div>
            )}
          </div>
          {currentStep <= 6 && (
            <div className="application-progress">
              <div className="application-progress-track"><div className="application-progress-fill" style={{ width: `${progressPercent}%` }} /></div></div>
          )}
        </header>

        <div className="application-body">
          {currentStep === 1 && (
            <div className="application-section application-hero">
              <div className="application-hero-card">
                <div className="application-hero-visual">
                  <div className="application-hero-pill"><Share2 /></div>
                  <div className="application-hero-pill"><User2 /></div>
                  <div className="application-hero-pill"><Briefcase /></div>
                </div>
                <h1 className="application-title">Become a <span>partner</span></h1>
                <p className="application-lead">Join the Falisha network through the same guided smart-step flow. Submit your details once and we will set up your partner access.</p>
              </div>
              <div className="application-trust-row">
                <div className="application-trust-card"><strong>Fast setup</strong><span>Mobile-first onboarding for field recruiters and agencies.</span></div>
                <div className="application-trust-card"><strong>Draft saved</strong><span>Your progress stays on this device while you complete it.</span></div>
                <div className="application-trust-card"><strong>Portal access</strong><span>Credentials and dashboard access appear after approval flow.</span></div>
              </div>
              <button className="application-primary" type="button" onClick={goNext}>Start partner application<ArrowRight /></button>
            </div>
          )}

          {currentStep === 2 && (
            <StepSection title="Tell us about <span>yourself</span>" description="Start with the main applicant and your agency or company, if any.">
              <Field label="Your name *" error={errors.applicantName}><input className="application-input" value={form.applicantName} onChange={(e) => updateField('applicantName', e.target.value)} placeholder="Zeeshan Khan" /></Field>
              <Field label="Company / agency name"><input className="application-input" value={form.companyName} onChange={(e) => updateField('companyName', e.target.value)} placeholder="Falisha Recruitment Partner" /></Field>
              <StepActions onBack={goBack} onNext={goNext} />
            </StepSection>
          )}

          {currentStep === 3 && (
            <StepSection title="How should we <span>contact you?</span>" description="We use this for credential delivery and onboarding follow-up.">
              <Field label="Email *" error={errors.email}><input className="application-input" type="email" value={form.email} onChange={(e) => updateField('email', e.target.value)} placeholder="partner@example.com" /></Field>
              <Field label="Phone / WhatsApp *" error={errors.phoneNumber}>
                <div className="application-grid-two application-phone-row">
                  <select className="application-select" value={form.phoneCountryCode} onChange={(e) => updateField('phoneCountryCode', e.target.value)}>
                    {APPLICATION_PHONE_CODE_OPTIONS.map((option) => <option key={`${option.code}-${option.label}`} value={option.code}>{option.label}</option>)}
                  </select>
                  <input className="application-input" value={form.phoneNumber} onChange={(e) => updateField('phoneNumber', e.target.value)} placeholder="300 1234567" inputMode="tel" />
                </div>
              </Field>
              <InfoText>WhatsApp is the fastest way for profile approval updates and login details.</InfoText>
              <StepActions onBack={goBack} onNext={goNext} />
            </StepSection>
          )}

          {currentStep === 4 && (
            <StepSection title="Where do you <span>operate?</span>" description="Add your country and city so the team can map you to the right market.">
              <Field label="Country *" error={errors.cityCountry}>
                <select className="application-select" value={form.cityCountry} onChange={(e) => updateField('cityCountry', e.target.value)}>
                  {APPLICATION_COUNTRY_OPTIONS.map((country) => <option key={country} value={country}>{country}</option>)}
                </select>
              </Field>
              <Field label="City *" error={errors.district}><input className="application-input" value={form.district} onChange={(e) => updateField('district', e.target.value)} placeholder="Lahore" /></Field>
              <StepActions onBack={goBack} onNext={goNext} />
            </StepSection>
          )}

          {currentStep === 5 && (
            <StepSection title="What kind of <span>partner</span> are you?" description="This is optional, but it helps the Falisha team understand how you plan to work with us.">
              <Field label="Partner type">
                <select className="application-select" value={form.partnerType} onChange={(e) => updateField('partnerType', e.target.value)}>
                  <option value="">Select partner type</option>
                  {partnerTypeOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
              </Field>
              <Field label="CNIC"><input className="application-input" value={form.cnic} onChange={(e) => updateField('cnic', e.target.value)} placeholder="35202-1234567-1" /></Field>
              <StepActions onBack={goBack} onNext={goNext} nextLabel="Review application" />
            </StepSection>
          )}

          {currentStep === 6 && (
            <StepSection title="Review your <span>partner profile</span>" description="Please confirm the details before submitting your application.">
              <div className="application-review">
                <ReviewRow label="Name" value={form.applicantName} onEdit={() => setCurrentStep(2)} />
                <ReviewRow label="Company" value={form.companyName || '-'} onEdit={() => setCurrentStep(2)} />
                <ReviewRow label="Email" value={form.email} onEdit={() => setCurrentStep(3)} />
                <ReviewRow label="Phone" value={`${form.phoneCountryCode} ${form.phoneNumber}`} onEdit={() => setCurrentStep(3)} />
                <ReviewRow label="Country" value={form.cityCountry} onEdit={() => setCurrentStep(4)} />
                <ReviewRow label="City" value={form.district} onEdit={() => setCurrentStep(4)} />
                <ReviewRow label="Partner type" value={form.partnerType || '-'} onEdit={() => setCurrentStep(5)} />
                <ReviewRow label="CNIC" value={form.cnic || '-'} onEdit={() => setCurrentStep(5)} />
              </div>
              {errors.submit && <AlertBox title="Submission failed" message={errors.submit} />}
              <div className="application-actions">
                <button className="application-secondary" type="button" onClick={goBack}><ArrowLeft />Back</button>
                <button className="application-primary" type="button" onClick={submitApplication} disabled={isSubmitting}>{isSubmitting ? 'Submitting...' : 'Submit partner application'}<ArrowRight /></button>
              </div>
            </StepSection>
          )}

          {currentStep === 7 && result && (
            <div className="application-section application-success">
              <div className="application-success-mark"><CheckCircle2 /></div>
              <div>
                <h1 className="application-step-title">Partner access <span>ready</span></h1>
                <p className="application-step-description">Your partner application has been received. Use the details below to continue into the partner dashboard.</p>
              </div>
              <div className="application-reference-card"><span>Application ID</span><strong>{result.applicationId}</strong></div>
              <CredentialCard email={result.email} password={result.password} />
              <div className="application-success-card"><p>{result.whatsappNotified && result.emailNotified ? 'Credentials were sent to both WhatsApp and email.' : result.whatsappNotified ? 'Credentials were sent to your WhatsApp.' : result.emailNotified ? 'Credentials were sent to your email.' : 'Use the dashboard button below if delivery is delayed.'}</p></div>
              <div className="application-actions">
                <button className="application-secondary" type="button" onClick={resetWizard}>Submit another partner profile</button>
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