import { useEffect, useState } from 'react';
import { Building2, Clock3, Globe2, LogOut, Mail, MapPin, Phone, RefreshCw, ShieldCheck, Sparkles, Users } from 'lucide-react';
import { apiClient, type PortalProfileResponse } from '../lib/apiClient';

type EmployerPortalDashboardProps = {
  accessToken: string;
  user: {
    name: string;
    email: string;
    roleLabel: string;
  };
  portalProfile: PortalProfileResponse | null;
  loading: boolean;
  error?: string | null;
  onSignOut: () => Promise<void>;
  onRefreshPortalProfile: () => Promise<void>;
};

type EmployerFormState = {
  company_name: string;
  contact_name: string;
  email: string;
  phone: string;
  country: string;
  city: string;
  professions: string;
  quantity: string;
  salary_range: string;
  duty_hours: string;
  contract_duration: string;
  benefits_included: string;
  comments: string;
};

const emptyState: EmployerFormState = {
  company_name: '',
  contact_name: '',
  email: '',
  phone: '',
  country: '',
  city: '',
  professions: '',
  quantity: '',
  salary_range: '',
  duty_hours: '',
  contract_duration: '',
  benefits_included: '',
  comments: '',
};

export function EmployerPortalDashboard({ accessToken, user, portalProfile, loading, error, onSignOut, onRefreshPortalProfile }: EmployerPortalDashboardProps) {
  const employerLead = portalProfile?.profile.employerLead;
  const profileUser = portalProfile?.profile.user;
  const [formState, setFormState] = useState<EmployerFormState>(emptyState);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    setFormState({
      company_name: employerLead?.company_name || '',
      contact_name: employerLead?.contact_name || profileUser?.name || user.name || '',
      email: employerLead?.email || profileUser?.email || user.email || '',
      phone: employerLead?.phone_number || profileUser?.phone || '',
      country: employerLead?.country || '',
      city: employerLead?.city || '',
      professions: employerLead?.professions || '',
      quantity: employerLead?.quantity || '',
      salary_range: employerLead?.salary_range || '',
      duty_hours: employerLead?.duty_hours || '',
      contract_duration: employerLead?.contract_duration || '',
      benefits_included: employerLead?.benefits_included || '',
      comments: employerLead?.comments || '',
    });
  }, [employerLead, profileUser, user.email, user.name]);

  const updateField = (field: keyof EmployerFormState, value: string) => {
    setFormState((current) => ({ ...current, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    setStatusMessage(null);

    try {
      await apiClient.updatePortalProfile(accessToken, formState);
      setStatusMessage('Employer portal profile updated.');
      await onRefreshPortalProfile();
    } catch (err: any) {
      setSaveError(err?.message || 'Failed to update employer profile.');
    } finally {
      setSaving(false);
    }
  };

  const summaryCards = [
    { label: 'Hiring Status', value: employerLead?.status || 'New', icon: ShieldCheck },
    { label: 'Requested Roles', value: employerLead?.professions || 'Not set', icon: Users },
    { label: 'Quantity', value: employerLead?.quantity || 'Not set', icon: Building2 },
    { label: 'Duty Hours', value: employerLead?.duty_hours || 'Not set', icon: Clock3 },
  ];

  return (
    <div className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(252,211,77,0.18),_transparent_30%),radial-gradient(circle_at_top_right,_rgba(251,146,60,0.16),_transparent_28%),linear-gradient(180deg,_#20130a,_#120c08_56%,_#0b0908)] text-amber-50">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <section className="relative overflow-hidden rounded-[32px] border border-white/10 bg-white/8 p-6 shadow-[0_32px_120px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:p-8">
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(251,191,36,0.22),transparent_34%,rgba(251,146,60,0.18))]" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl space-y-4">
              <p className="inline-flex items-center gap-2 rounded-full border border-amber-300/25 bg-amber-300/10 px-3 py-1 text-xs uppercase tracking-[0.3em] text-amber-100/90">
                <Sparkles className="h-3.5 w-3.5" /> Employer Command Center
              </p>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-5xl" style={{ fontFamily: 'Georgia, Times New Roman, serif' }}>
                  {formState.company_name || 'Falisha Employer Portal'}
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-amber-50/74 sm:text-base">
                  Review your hiring brief, update company details, and keep Falisha aligned on the workforce you need next.
                </p>
              </div>
              <div className="flex flex-wrap gap-3 text-sm text-amber-50/80">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/15 px-3 py-2"><Mail className="h-4 w-4 text-amber-300" /> {formState.email || user.email}</span>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/15 px-3 py-2"><Phone className="h-4 w-4 text-amber-300" /> {formState.phone || 'Add your WhatsApp number'}</span>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/15 px-3 py-2"><Globe2 className="h-4 w-4 text-amber-300" /> {formState.country || 'Country pending'}</span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={onRefreshPortalProfile}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm text-white transition hover:bg-white/16"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
              </button>
              <button
                type="button"
                onClick={onSignOut}
                className="inline-flex items-center gap-2 rounded-full border border-amber-300/25 bg-amber-400/12 px-4 py-2 text-sm text-amber-100 transition hover:bg-amber-400/20"
              >
                <LogOut className="h-4 w-4" /> Sign out
              </button>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map(({ label, value, icon: Icon }) => (
            <article key={label} className="rounded-[28px] border border-white/8 bg-white/7 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.18)] backdrop-blur-md">
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-[0.22em] text-amber-100/60">{label}</p>
                <Icon className="h-5 w-5 text-amber-300" />
              </div>
              <p className="mt-5 text-2xl font-semibold text-white">{value}</p>
            </article>
          ))}
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[30px] border border-white/8 bg-white/8 p-6 shadow-[0_20px_70px_rgba(0,0,0,0.22)] backdrop-blur-xl sm:p-7">
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold text-white" style={{ fontFamily: 'Georgia, Times New Roman, serif' }}>Company Profile</h2>
                <p className="mt-2 text-sm text-amber-50/68">Update the same information your account team sees when planning recruitment delivery.</p>
              </div>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="rounded-full bg-gradient-to-r from-amber-300 via-orange-300 to-amber-200 px-5 py-2.5 text-sm font-semibold text-stone-900 transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? 'Saving...' : 'Save changes'}
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {[
                { key: 'company_name', label: 'Company name' },
                { key: 'contact_name', label: 'Contact person' },
                { key: 'email', label: 'Business email', type: 'email' },
                { key: 'phone', label: 'WhatsApp number' },
                { key: 'country', label: 'Country' },
                { key: 'city', label: 'City' },
                { key: 'professions', label: 'Professions needed' },
                { key: 'quantity', label: 'Quantity required' },
                { key: 'salary_range', label: 'Salary range' },
                { key: 'duty_hours', label: 'Duty hours' },
                { key: 'contract_duration', label: 'Contract duration' },
                { key: 'benefits_included', label: 'Benefits included' },
              ].map((field) => (
                <label key={field.key} className="space-y-2">
                  <span className="text-xs uppercase tracking-[0.2em] text-amber-100/56">{field.label}</span>
                  <input
                    type={field.type || 'text'}
                    value={formState[field.key as keyof EmployerFormState]}
                    onChange={(event) => updateField(field.key as keyof EmployerFormState, event.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-black/18 px-4 py-3 text-sm text-white outline-none transition placeholder:text-amber-50/28 focus:border-amber-300/55 focus:bg-black/24"
                    placeholder={field.label}
                  />
                </label>
              ))}
            </div>

            <label className="mt-4 block space-y-2">
              <span className="text-xs uppercase tracking-[0.2em] text-amber-100/56">Operational notes</span>
              <textarea
                value={formState.comments}
                onChange={(event) => updateField('comments', event.target.value)}
                rows={5}
                className="w-full rounded-[24px] border border-white/10 bg-black/18 px-4 py-3 text-sm text-white outline-none transition placeholder:text-amber-50/28 focus:border-amber-300/55 focus:bg-black/24"
                placeholder="Hiring seasons, visa constraints, accommodation notes, interview preferences..."
              />
            </label>

            {(statusMessage || saveError || error) && (
              <div className={`mt-5 rounded-2xl border px-4 py-3 text-sm ${saveError || error ? 'border-rose-400/30 bg-rose-500/10 text-rose-100' : 'border-emerald-400/25 bg-emerald-500/10 text-emerald-100'}`}>
                {saveError || error || statusMessage}
              </div>
            )}
          </div>

          <div className="space-y-6">
            <article className="rounded-[30px] border border-white/8 bg-white/8 p-6 shadow-[0_20px_70px_rgba(0,0,0,0.22)] backdrop-blur-xl">
              <h2 className="text-xl font-semibold text-white" style={{ fontFamily: 'Georgia, Times New Roman, serif' }}>Fulfilment Snapshot</h2>
              <div className="mt-5 space-y-4 text-sm text-amber-50/74">
                <div className="flex items-start gap-3 rounded-2xl border border-white/8 bg-black/18 p-4">
                  <MapPin className="mt-0.5 h-4 w-4 text-amber-300" />
                  <div>
                    <p className="font-medium text-white">Target market</p>
                    <p>{formState.city ? `${formState.city}, ${formState.country || ''}`.trim().replace(/,$/, '') : formState.country || 'Add the destination market you are hiring for.'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-2xl border border-white/8 bg-black/18 p-4">
                  <Users className="mt-0.5 h-4 w-4 text-amber-300" />
                  <div>
                    <p className="font-medium text-white">Open hiring brief</p>
                    <p>{formState.professions || 'List the roles you want Falisha to deliver.'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-2xl border border-white/8 bg-black/18 p-4">
                  <Clock3 className="mt-0.5 h-4 w-4 text-amber-300" />
                  <div>
                    <p className="font-medium text-white">Working model</p>
                    <p>{formState.duty_hours || 'Share daily hours, rotations, and overtime expectations.'}</p>
                  </div>
                </div>
              </div>
            </article>

            <article className="rounded-[30px] border border-white/8 bg-gradient-to-br from-amber-400/18 via-orange-300/10 to-white/6 p-6 shadow-[0_20px_70px_rgba(0,0,0,0.22)] backdrop-blur-xl">
              <p className="text-xs uppercase tracking-[0.2em] text-amber-100/60">Portal Identity</p>
              <h3 className="mt-3 text-2xl font-semibold text-white" style={{ fontFamily: 'Georgia, Times New Roman, serif' }}>{user.roleLabel}</h3>
              <p className="mt-3 text-sm leading-7 text-amber-50/74">
                This login is reserved for your company so Falisha can keep requirements, communication, and approvals tied to one verified account.
              </p>
            </article>
          </div>
        </section>
      </div>
    </div>
  );
}
