'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  CheckCircle2,
  FileText,
  Globe2,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  ShieldCheck,
  UploadCloud,
  User2,
} from 'lucide-react';
import './ApplicationWizard.css';
import { apiClient } from '@/lib/apiClient';
import type { PublicCandidatePortalResponse } from '@/lib/apiClient';
import type { ApplicationFormData, ApplicationStep, ExperienceLevel } from '@/types/application';

const STORAGE_KEY = 'falisha_apply_candidate_wizard_v1';

const steps: ApplicationStep[] = [
  { id: 1, label: 'Welcome' },
  { id: 2, label: 'Full Name' },
  { id: 3, label: 'Contact' },
  { id: 4, label: 'Location' },
  { id: 5, label: 'Role' },
  { id: 6, label: 'Experience' },
  { id: 7, label: 'Upload CV' },
  { id: 8, label: 'Comments' },
  { id: 9, label: 'Review' },
];

const initialForm: ApplicationFormData = {
  fullName: '',
  email: '',
  phoneCountryCode: '+92',
  phoneNumber: '',
  nationality: 'Pakistani',
  countryOfInterest: 'Saudi Arabia',
  preferredRole: '',
  experience: '',
  comments: '',
  cvFileName: '',
};

const roleSuggestions = [
  'Civil Engineer',
  'HVAC Technician',
  'Electrician',
  'Driver',
  'Welder',
  'Plumber',
  'Mason',
  'AC Technician',
];

const experienceOptions: ExperienceLevel[] = [
  'Fresher',
  '1-3 Years',
  '3-5 Years',
  '5-10 Years',
  '10+ Years',
];

const countries = [
  { name: 'Saudi Arabia', note: 'High-demand trades and technical jobs' },
  { name: 'United Arab Emirates', note: 'Construction, transport, hospitality' },
  { name: 'Qatar', note: 'Infrastructure and maintenance roles' },
  { name: 'Oman', note: 'Facility, civil and skilled labor openings' },
  { name: 'Kuwait', note: 'Mechanical and field worker demand' },
  { name: 'Bahrain', note: 'Specialized technician opportunities' },
];

const nationalityOptions = ['Pakistani', 'Indian', 'Bangladeshi', 'Nepali', 'Sri Lankan', 'Other'];

type DraftPayload = {
  currentStep: number;
  form: ApplicationFormData;
};

export default function ApplicationWizard() {
  const [currentStep, setCurrentStep] = useState(1);
  const [form, setForm] = useState<ApplicationFormData>(initialForm);
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<PublicCandidatePortalResponse | null>(null);
  const [draftRestored, setDraftRestored] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      return;
    }

    try {
      const parsed = JSON.parse(saved) as DraftPayload;
      setForm({ ...initialForm, ...(parsed.form || {}) });
      if (parsed.currentStep >= 1 && parsed.currentStep <= steps.length) {
        setCurrentStep(parsed.currentStep);
      }
      setDraftRestored(Boolean(parsed.form?.cvFileName));
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || currentStep === 10) {
      return;
    }

    const payload: DraftPayload = {
      currentStep,
      form,
    };

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [currentStep, form]);

  const progressPercent = useMemo(() => Math.round((currentStep / steps.length) * 100), [currentStep]);

  const profileStrength = useMemo(() => {
    let score = 0;
    if (form.fullName.trim()) score += 18;
    if (form.email.trim()) score += 14;
    if (form.phoneNumber.trim()) score += 18;
    if (form.countryOfInterest.trim()) score += 10;
    if (form.preferredRole.trim()) score += 18;
    if (form.experience) score += 10;
    if (cvFile) score += 12;
    return Math.min(score, 100);
  }, [cvFile, form]);

  function updateField<K extends keyof ApplicationFormData>(key: K, value: ApplicationFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: '' }));
  }

  function validateStep(step: number) {
    const nextErrors: Record<string, string> = {};

    if (step === 2) {
      if (!form.fullName.trim()) {
        nextErrors.fullName = 'Full name is required.';
      } else if (form.fullName.trim().length < 3) {
        nextErrors.fullName = 'Please enter your full name as on passport or CNIC.';
      }
    }

    if (step === 3) {
      if (!form.email.trim()) {
        nextErrors.email = 'Email is required.';
      } else {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(form.email.trim())) {
          nextErrors.email = 'Please enter a valid email address.';
        }
      }

      if (!form.phoneNumber.trim()) {
        nextErrors.phoneNumber = 'Phone / WhatsApp number is required.';
      } else if (form.phoneNumber.replace(/\D/g, '').length < 9) {
        nextErrors.phoneNumber = 'Please enter a valid phone number.';
      }
    }

    if (step === 4) {
      if (!form.nationality.trim()) {
        nextErrors.nationality = 'Nationality is required.';
      }
      if (!form.countryOfInterest.trim()) {
        nextErrors.countryOfInterest = 'Please choose a country of interest.';
      }
    }

    if (step === 5 && !form.preferredRole.trim()) {
      nextErrors.preferredRole = 'Preferred role is required.';
    }

    if (step === 6 && !form.experience) {
      nextErrors.experience = 'Please select your experience.';
    }

    if (step === 7 && !cvFile) {
      nextErrors.cv = form.cvFileName
        ? 'Draft restored. Please re-upload the CV before continuing.'
        : 'Please upload your CV before continuing.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function goNext() {
    if (!validateStep(currentStep)) {
      return;
    }

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

  function handleFileChange(file?: File) {
    if (!file) {
      return;
    }

    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    const maxSize = 30 * 1024 * 1024;

    if (!allowedTypes.includes(file.type)) {
      setErrors((prev) => ({ ...prev, cv: 'Only PDF, DOC, and DOCX files are allowed.' }));
      return;
    }

    if (file.size > maxSize) {
      setErrors((prev) => ({ ...prev, cv: 'CV file must be less than 30MB.' }));
      return;
    }

    setCvFile(file);
    updateField('cvFileName', file.name);
    setDraftRestored(false);
    setErrors((prev) => ({ ...prev, cv: '' }));
  }

  async function submitApplication() {
    if (!validateStep(7)) {
      setCurrentStep(7);
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      const payload = new FormData();
      payload.append('fullName', form.fullName.trim());
      payload.append('email', form.email.trim());
      payload.append('phone', `${form.phoneCountryCode} ${form.phoneNumber}`.trim());
      payload.append('nationality', form.nationality.trim());
      payload.append('countryOfInterest', form.countryOfInterest.trim());
      payload.append('position', form.preferredRole.trim());
      payload.append('experience', form.experience);
      payload.append('comments', form.comments.trim());

      if (cvFile) {
        payload.append('cv', cvFile);
      }

      const response = await apiClient.submitCandidatePortal(payload);
      setResult(response);
      setCurrentStep(10);
      setCvFile(null);
      setDraftRestored(false);
      window.localStorage.removeItem(STORAGE_KEY);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error: any) {
      setErrors({ submit: error?.message || 'Something went wrong while submitting your application.' });
    } finally {
      setIsSubmitting(false);
    }
  }

  function resetApplication() {
    setForm(initialForm);
    setCvFile(null);
    setErrors({});
    setResult(null);
    setDraftRestored(false);
    setCurrentStep(1);
    window.localStorage.removeItem(STORAGE_KEY);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
                <span>Overseas recruitment</span>
              </div>
            </div>

            {currentStep <= 9 && (
              <div className="application-step-chip">
                <strong>{Math.min(currentStep, 9)}</strong>
                <span>/ 9</span>
              </div>
            )}
          </div>

          {currentStep <= 9 && (
            <div className="application-progress">
              <div className="application-progress-track">
                <div className="application-progress-fill" style={{ width: `${progressPercent}%` }} />
              </div>
              <div className="application-progress-meta">
                <span>{steps[Math.max(currentStep - 1, 0)]?.label}</span>
                <strong>{progressPercent}% complete</strong>
              </div>
            </div>
          )}
        </header>

        <div className="application-body">
          {currentStep === 1 && (
            <div className="application-section application-hero">
              <div className="application-hero-card">
                <div className="application-hero-visual">
                  <div className="application-hero-pill"><Globe2 /></div>
                  <div className="application-hero-pill"><Briefcase /></div>
                  <div className="application-hero-pill"><FileText /></div>
                </div>

                <h1 className="application-title">
                  Apply for <span>overseas jobs</span>
                </h1>
                <p className="application-lead">
                  Share your profile in a guided flow. Our consultants will review it within 48 hours and contact you on WhatsApp if anything is missing.
                </p>
              </div>

              <div className="application-trust-row">
                <div className="application-trust-card">
                  <strong>1 profile</strong>
                  <span>One step at a time, built for mobile.</span>
                </div>
                <div className="application-trust-card">
                  <strong>Draft saved</strong>
                  <span>Your progress is stored locally on this device.</span>
                </div>
                <div className="application-trust-card">
                  <strong>Fast review</strong>
                  <span>CV and details go straight to the existing backend.</span>
                </div>
              </div>

              <button className="application-primary" type="button" onClick={goNext}>
                Start application
                <ArrowRight />
              </button>
            </div>
          )}

          {currentStep === 2 && (
            <StepSection title="What is your <span>full name?</span>" description="Please enter your name exactly as written on your CNIC or passport.">
              <Field label="Full name *" error={errors.fullName}>
                <input
                  className="application-input"
                  value={form.fullName}
                  onChange={(event) => updateField('fullName', event.target.value)}
                  placeholder="Muhammad Ahmed"
                />
              </Field>

              <InfoText>We use this to match your CV and any future documents correctly.</InfoText>

              <StepActions onBack={goBack} onNext={goNext} />
            </StepSection>
          )}

          {currentStep === 3 && (
            <StepSection title="How can we <span>contact you?</span>" description="We may send updates or missing document reminders on this contact information.">
              <div className="application-grid">
                <Field label="Email address *" error={errors.email}>
                  <input
                    className="application-input"
                    value={form.email}
                    onChange={(event) => updateField('email', event.target.value)}
                    placeholder="ahmed@example.com"
                    type="email"
                  />
                </Field>

                <Field label="Phone / WhatsApp *" error={errors.phoneNumber}>
                  <div className="application-grid-two">
                    <select
                      className="application-select"
                      value={form.phoneCountryCode}
                      onChange={(event) => updateField('phoneCountryCode', event.target.value)}
                    >
                      <option value="+92">Pakistan (+92)</option>
                      <option value="+966">Saudi Arabia (+966)</option>
                      <option value="+971">UAE (+971)</option>
                      <option value="+974">Qatar (+974)</option>
                      <option value="+968">Oman (+968)</option>
                      <option value="+965">Kuwait (+965)</option>
                    </select>
                    <input
                      className="application-input"
                      value={form.phoneNumber}
                      onChange={(event) => updateField('phoneNumber', event.target.value)}
                      placeholder="300 1234567"
                      inputMode="tel"
                    />
                  </div>
                </Field>
              </div>

              <InfoText>We will use this number for WhatsApp follow-up and profile completion links.</InfoText>

              <StepActions onBack={goBack} onNext={goNext} />
            </StepSection>
          )}

          {currentStep === 4 && (
            <StepSection title="Where do you <span>want to work?</span>" description="This helps us direct your profile to the right market and employer demand.">
              <div className="application-stack">
                <Field label="Nationality" error={errors.nationality}>
                  <select
                    className="application-select"
                    value={form.nationality}
                    onChange={(event) => updateField('nationality', event.target.value)}
                  >
                    {nationalityOptions.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </Field>

                <div className="application-choice-title">Country of interest</div>
                <div className="application-country-grid">
                  {countries.map((country) => {
                    const isSelected = form.countryOfInterest === country.name;
                    return (
                      <button
                        key={country.name}
                        type="button"
                        className={`application-country-card${isSelected ? ' is-selected' : ''}`}
                        onClick={() => updateField('countryOfInterest', country.name)}
                      >
                        <strong>{country.name}</strong>
                        <span>{country.note}</span>
                      </button>
                    );
                  })}
                </div>
                {errors.countryOfInterest && <p className="application-error">{errors.countryOfInterest}</p>}
              </div>

              <StepActions onBack={goBack} onNext={goNext} />
            </StepSection>
          )}

          {currentStep === 5 && (
            <StepSection title="Which <span>role</span> fits you best?" description="Choose the job title that best matches your experience.">
              <Field label="Preferred role *" error={errors.preferredRole}>
                <input
                  className="application-input"
                  value={form.preferredRole}
                  onChange={(event) => updateField('preferredRole', event.target.value)}
                  placeholder="HVAC Technician"
                />
              </Field>

              <div className="application-chip-grid">
                {roleSuggestions.map((role) => {
                  const isSelected = form.preferredRole === role;
                  return (
                    <button
                      key={role}
                      type="button"
                      className={`application-chip${isSelected ? ' is-selected' : ''}`}
                      onClick={() => updateField('preferredRole', role)}
                    >
                      <strong>{role}</strong>
                      <span>{isSelected ? 'Selected role' : 'Tap to use this title'}</span>
                    </button>
                  );
                })}
              </div>

              <StepActions onBack={goBack} onNext={goNext} />
            </StepSection>
          )}

          {currentStep === 6 && (
            <StepSection title="How much <span>experience</span> do you have?" description="We use this to rank your profile against active demand more accurately.">
              <div className="application-experience-grid">
                {experienceOptions.map((option) => {
                  const isSelected = form.experience === option;
                  return (
                    <button
                      key={option}
                      type="button"
                      className={`application-experience-card${isSelected ? ' is-selected' : ''}`}
                      onClick={() => updateField('experience', option)}
                    >
                      <strong>{option}</strong>
                      <span>{isSelected ? 'Current choice' : 'Select this experience level'}</span>
                    </button>
                  );
                })}
              </div>
              {errors.experience && <p className="application-error">{errors.experience}</p>}

              <StepActions onBack={goBack} onNext={goNext} />
            </StepSection>
          )}

          {currentStep === 7 && (
            <StepSection title="Upload your <span>CV</span>" description="Your CV will be sent with this application using the existing backend upload flow.">
              <label className="application-upload">
                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={(event) => handleFileChange(event.target.files?.[0])}
                />
                <div className="application-upload-icon">
                  <UploadCloud />
                </div>
                <strong>Tap to choose your CV</strong>
                <span>PDF, DOC, or DOCX. Maximum file size 30MB.</span>
              </label>

              {errors.cv && <p className="application-error">{errors.cv}</p>}

              {(cvFile || form.cvFileName) && (
                <div className="application-inline-card">
                  <div>
                    <strong>{cvFile?.name || form.cvFileName}</strong>
                    <span>{cvFile ? 'Ready to upload on submit.' : 'Draft restored. Re-upload is required before submit.'}</span>
                  </div>
                  <FileText />
                </div>
              )}

              {draftRestored && !cvFile && form.cvFileName && (
                <div className="application-note application-note-warning">
                  Draft restored: the file name was saved locally, but the browser cannot restore the actual file. Please upload the CV again.
                </div>
              )}

              <div className="application-inline-card application-strength">
                <div className="application-strength-badge">{profileStrength}%</div>
                <div>
                  <strong>Profile strength</strong>
                  <span>{profileStrength >= 80 ? 'Strong application. Review and submit with confidence.' : 'A few more details will make your profile stronger.'}</span>
                </div>
              </div>

              <StepActions onBack={goBack} onNext={goNext} />
            </StepSection>
          )}

          {currentStep === 8 && (
            <StepSection title="Anything else to <span>add?</span>" description="Optional notes can include salary expectations, Gulf experience, or availability.">
              <Field label="Comments">
                <textarea
                  className="application-textarea"
                  rows={6}
                  value={form.comments}
                  onChange={(event) => updateField('comments', event.target.value)}
                  placeholder="I have 5 years of Gulf experience as an HVAC technician and can join within 30 days."
                />
              </Field>

              <InfoText>Your comments are sent to the backend as application notes.</InfoText>

              <StepActions onBack={goBack} onNext={goNext} nextLabel="Review application" />
            </StepSection>
          )}

          {currentStep === 9 && (
            <StepSection title="Review your <span>application</span>" description="Please confirm each detail before final submission.">
              <div className="application-review">
                <ReviewRow label="Full name" value={form.fullName} onEdit={() => setCurrentStep(2)} />
                <ReviewRow label="Email" value={form.email} onEdit={() => setCurrentStep(3)} />
                <ReviewRow label="Phone / WhatsApp" value={`${form.phoneCountryCode} ${form.phoneNumber}`} onEdit={() => setCurrentStep(3)} />
                <ReviewRow label="Nationality" value={form.nationality} onEdit={() => setCurrentStep(4)} />
                <ReviewRow label="Country of interest" value={form.countryOfInterest} onEdit={() => setCurrentStep(4)} />
                <ReviewRow label="Preferred role" value={form.preferredRole} onEdit={() => setCurrentStep(5)} />
                <ReviewRow label="Experience" value={form.experience || '-'} onEdit={() => setCurrentStep(6)} />
                <ReviewRow label="CV" value={cvFile?.name || form.cvFileName || 'Not uploaded'} onEdit={() => setCurrentStep(7)} />
                <ReviewRow label="Comments" value={form.comments || 'No comments'} onEdit={() => setCurrentStep(8)} />
              </div>

              {errors.submit && (
                <div className="application-alert">
                  <ShieldCheck />
                  <div>
                    <strong>Submission failed</strong>
                    <span>{errors.submit}</span>
                  </div>
                </div>
              )}

              <div className="application-actions">
                <button className="application-secondary" type="button" onClick={goBack}>
                  <ArrowLeft />
                  Back
                </button>
                <button className="application-primary" type="button" onClick={submitApplication} disabled={isSubmitting}>
                  {isSubmitting ? 'Submitting...' : 'Submit application'}
                  <ArrowRight />
                </button>
              </div>
            </StepSection>
          )}

          {currentStep === 10 && (
            <div className="application-section application-success">
              <div className="application-success-mark">
                <CheckCircle2 />
              </div>

              <div>
                <h1 className="application-step-title">
                  Application <span>submitted</span>
                </h1>
                <p className="application-step-description">
                  Thank you, {form.fullName || 'candidate'}. Your profile has been sent successfully. Our team will review it and follow up within 48 hours.
                </p>
              </div>

              <div className="application-reference-card">
                <span>Reference ID</span>
                <strong>{result?.reference || 'Pending reference'}</strong>
              </div>

              <div className="application-success-card">
                <p>
                  {result?.whatsappNotified
                    ? 'A WhatsApp message with your next steps has already been sent.'
                    : 'If WhatsApp delivery is unavailable, our consultants will still contact you manually.'}
                </p>
              </div>

              <div className="application-actions">
                <button className="application-secondary" type="button" onClick={resetApplication}>
                  Apply for another candidate
                </button>
                {result?.onboardingLink ? (
                  <a className="application-primary" href={result.onboardingLink} target="_blank" rel="noreferrer">
                    Complete profile
                    <ArrowRight />
                  </a>
                ) : (
                  <a className="application-primary" href="/">
                    Back to home
                    <ArrowRight />
                  </a>
                )}
              </div>
            </div>
          )}
        </div>

        <footer className="application-footer">
          Copyright 2026 Falisha Jobs. <a href="/privacy-policy">Privacy</a> · <a href="#">Terms</a>
        </footer>
      </div>
    </section>
  );
}

function StepSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="application-section">
      <h1 className="application-step-title" dangerouslySetInnerHTML={{ __html: title }} />
      <p className="application-step-description">{description}</p>
      <div className="application-stack">{children}</div>
    </div>
  );
}

function Field({
  label,
  children,
  error,
}: {
  label: string;
  children: React.ReactNode;
  error?: string;
}) {
  return (
    <label className="application-field">
      <span>{label}</span>
      {children}
      {error && <p className="application-error">{error}</p>}
    </label>
  );
}

function InfoText({ children }: { children: React.ReactNode }) {
  return <div className="application-help">{children}</div>;
}

function StepActions({
  onBack,
  onNext,
  nextLabel = 'Next',
}: {
  onBack: () => void;
  onNext: () => void;
  nextLabel?: string;
}) {
  return (
    <div className="application-actions">
      <button className="application-secondary" type="button" onClick={onBack}>
        <ArrowLeft />
        Back
      </button>
      <button className="application-primary" type="button" onClick={onNext}>
        {nextLabel}
        <ArrowRight />
      </button>
    </div>
  );
}

function ReviewRow({
  label,
  value,
  onEdit,
}: {
  label: string;
  value: string;
  onEdit: () => void;
}) {
  return (
    <div className="application-review-row">
      <span>{label}</span>
      <strong>{value || '-'}</strong>
      <button className="application-edit-button" type="button" onClick={onEdit}>
        Edit
      </button>
    </div>
  );
}