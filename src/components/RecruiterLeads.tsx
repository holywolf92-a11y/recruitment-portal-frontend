// Admin tab: Recruiter Leads
// Surfaces companies and agencies hiring labour roles in Falisha's target
// markets. Data is swept from Adzuna (Europe) and JSearch (Gulf + global)
// nightly and on-demand from the "Run sweep" button.

import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Briefcase, Building2, ExternalLink, RefreshCw, Search } from 'lucide-react';
import { useAuth } from '../lib/authContext';
import { API_BASE_URL } from '../lib/apiClient';

type Position = { slug: string; query: string };

const POSTING_SERVICE_URL = (import.meta as any).env?.VITE_POSTING_SERVICE_URL?.replace(/\/$/, '') || '';
const FALISHA_POSTING_KEY = (import.meta as any).env?.VITE_FALISHA_POSTING_API_KEY || '';

type Lead = {
  id: string;
  source: 'adzuna' | 'jsearch';
  source_url: string;
  title: string;
  employer_name: string | null;
  country_code: string | null;
  country_name: string | null;
  city: string | null;
  position_category: string;
  publisher: string | null;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string | null;
  posted_at: string | null;
  found_at: string;
  fb_post_id: string | null;
  fb_posted_at: string | null;
};

type Company = {
  id: string;
  name: string;
  primary_country: string | null;
  countries_seen: string[];
  positions_seen: string[];
  publishers_seen: string[];
  total_listings: number;
  last_seen_at: string;
  contacted: boolean;
  contacted_at: string | null;
  notes: string | null;
};

type SweepSummary = {
  totalQueries: number;
  totalRawHits: number;
  totalNewLeads: number;
  durationMs: number;
  perRun: Array<{
    source: string;
    position: string;
    country: string;
    rawHits: number;
    newLeads: number;
    status: 'ok' | 'error';
    error?: string;
  }>;
};

const COUNTRY_LABELS: Record<string, string> = {
  ae: '🇦🇪 UAE', sa: '🇸🇦 Saudi Arabia', qa: '🇶🇦 Qatar', kw: '🇰🇼 Kuwait',
  om: '🇴🇲 Oman', bh: '🇧🇭 Bahrain', tr: '🇹🇷 Turkey',
  gb: '🇬🇧 UK', de: '🇩🇪 Germany', pl: '🇵🇱 Poland',
};

const SOURCE_LABELS: Record<string, string> = { adzuna: 'Adzuna (EU)', jsearch: 'JSearch (Gulf+)' };

function fmtCountry(code: string | null | undefined) {
  if (!code) return '—';
  return COUNTRY_LABELS[code] ?? code.toUpperCase();
}

function fmtSalary(min: number | null, max: number | null, ccy: string | null) {
  if (!min && !max) return '';
  const cur = ccy || '';
  if (min && max && min !== max) return `${cur}${Math.round(min)}–${Math.round(max)}`;
  return `${cur}${Math.round(min ?? max ?? 0)}`;
}

function fmtDate(iso: string | null | undefined) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const days = Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days}d ago`;
  return d.toLocaleDateString();
}

export function RecruiterLeads() {
  const { session } = useAuth();

  const [tab, setTab] = useState<'leads' | 'companies'>('leads');

  const [positions, setPositions] = useState<Position[]>([]);
  const [countries, setCountries] = useState<string[]>([]);

  const [leads, setLeads] = useState<Lead[]>([]);
  const [leadsTotal, setLeadsTotal] = useState(0);
  const [leadsLoading, setLeadsLoading] = useState(false);

  const [companies, setCompanies] = useState<Company[]>([]);
  const [companiesTotal, setCompaniesTotal] = useState(0);
  const [companiesLoading, setCompaniesLoading] = useState(false);

  const [sweepRunning, setSweepRunning] = useState(false);
  const [sweepSummary, setSweepSummary] = useState<SweepSummary | null>(null);

  const [fbConfigured, setFbConfigured] = useState(false);
  const [fbPostState, setFbPostState] = useState<Record<string, 'posting' | 'done' | 'error'>>({});

  const [error, setError] = useState<string | null>(null);

  // Filters
  const [country, setCountry] = useState('');
  const [position, setPosition] = useState('');
  const [source, setSource] = useState('');
  const [datePosted, setDatePosted] = useState('');   // today | 3days | week | month | ''
  const [publisher, setPublisher] = useState('');     // 'LinkedIn', 'Indeed', etc.
  const [searchQ, setSearchQ] = useState('');
  // Debounced mirror of searchQ — only this value flows into the data effects.
  // Lets the search box stay snappy without triggering a fetch on every keystroke
  // AND avoids the dual-effect double-fetch the previous design had.
  const [debouncedSearchQ, setDebouncedSearchQ] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearchQ(searchQ), 350);
    return () => clearTimeout(t);
  }, [searchQ]);
  const searchPending = searchQ !== debouncedSearchQ;
  const [publishers, setPublishers] = useState<string[]>([]);

  // Sweep-modal state — replaces the native confirm() dialog
  const [showSweepModal, setShowSweepModal] = useState(false);
  const [sweepLinkedinBias, setSweepLinkedinBias] = useState(true);
  const [sweepDatePosted, setSweepDatePosted] = useState<'today' | '3days' | 'week' | 'month' | 'all'>('week');
  const [sweepPageLoops, setSweepPageLoops] = useState<number>(2);

  // Pagination (separate page indices per tab so switching tabs preserves position)
  const PAGE_SIZE_OPTIONS = [25, 50, 100, 200] as const;
  const [pageSize, setPageSize] = useState<number>(50);
  const [leadsPage, setLeadsPage] = useState(0);        // 0-indexed
  const [companiesPage, setCompaniesPage] = useState(0);

  const authHeaders = useMemo(() => {
    const token = (session as any)?.session?.access_token || (session as any)?.access_token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, [session]);

  // Load filter config + publishers once
  useEffect(() => {
    if (!authHeaders.Authorization) return;
    fetch(`${API_BASE_URL}/jobs/config`, { headers: authHeaders })
      .then((r) => r.json())
      .then((d: { positions: Position[]; adzunaCountries: string[]; jsearchCountries: string[] }) => {
        setPositions(d.positions ?? []);
        const merged = Array.from(new Set([...(d.adzunaCountries ?? []), ...(d.jsearchCountries ?? [])]));
        setCountries(merged);
      })
      .catch(() => { /* non-fatal */ });
    // Publishers are computed from job_leads at request time — keep this
    // separate so its failure (e.g. before the table has data) doesn't break
    // the positions/countries dropdowns.
    fetch(`${API_BASE_URL}/jobs/publishers`, { headers: authHeaders })
      .then((r) => r.json())
      .then((d: { publishers: string[] }) => setPublishers(d.publishers ?? []))
      .catch(() => { /* non-fatal */ });

    if (POSTING_SERVICE_URL && FALISHA_POSTING_KEY) {
      fetch(`${POSTING_SERVICE_URL}/falisha/config`, {
        headers: { 'X-Falisha-Key': FALISHA_POSTING_KEY },
      })
        .then((r) => r.json())
        .then((d: { configured: boolean }) => setFbConfigured(!!d.configured))
        .catch(() => { /* non-fatal — FB button stays hidden */ });
    }
  }, [authHeaders]);

  // Build the shared filter query-string used by both /leads and /leads/export.
  // Centralised so CSV export stays in lock-step with the in-page filter set.
  // Uses debouncedSearchQ — the value actually being fetched right now.
  const buildLeadsQuery = (extra?: Record<string, string>): URLSearchParams => {
    const params = new URLSearchParams();
    if (country)            params.set('country', country);
    if (position)           params.set('position', position);
    if (source)             params.set('source', source);
    if (datePosted)         params.set('datePosted', datePosted);
    if (publisher)          params.set('publisher', publisher);
    if (debouncedSearchQ)   params.set('q', debouncedSearchQ);
    if (extra) for (const [k, v] of Object.entries(extra)) params.set(k, v);
    return params;
  };

  // AbortController per in-flight loadLeads — cancels stale requests so a slow
  // earlier response can't clobber the latest filter's results.
  const loadLeadsAbortRef = useRef<AbortController | null>(null);
  const loadLeads = async () => {
    if (!authHeaders.Authorization) return;
    loadLeadsAbortRef.current?.abort();
    const ctrl = new AbortController();
    loadLeadsAbortRef.current = ctrl;
    setLeadsLoading(true);
    setError(null);
    try {
      const params = buildLeadsQuery({ limit: String(pageSize), offset: String(leadsPage * pageSize) });
      const res = await fetch(`${API_BASE_URL}/jobs/leads?${params.toString()}`,
        { headers: authHeaders, signal: ctrl.signal });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      if (ctrl.signal.aborted) return;
      setLeads(data.leads ?? []);
      setLeadsTotal(data.total ?? 0);
    } catch (e) {
      if ((e as { name?: string })?.name === 'AbortError') return;
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      if (loadLeadsAbortRef.current === ctrl) {
        loadLeadsAbortRef.current = null;
        setLeadsLoading(false);
      }
    }
  };

  const loadCompanies = async () => {
    if (!authHeaders.Authorization) return;
    setCompaniesLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (country) params.set('country', country);
      params.set('limit', String(pageSize));
      params.set('offset', String(companiesPage * pageSize));
      const res = await fetch(`${API_BASE_URL}/jobs/companies?${params.toString()}`, { headers: authHeaders });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setCompanies(data.companies ?? []);
      setCompaniesTotal(data.total ?? 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setCompaniesLoading(false);
    }
  };

  // Reset page → 0 when filters change. Split per-tab so typing in the search
  // field doesn't kick the Companies tab back to page 0 unrelated to its data.
  // Note: uses `debouncedSearchQ`, not raw `searchQ`, so reset fires once per
  // search commit rather than on every keystroke.
  useEffect(() => { setLeadsPage(0); }, [country, position, source, datePosted, publisher, debouncedSearchQ, pageSize]);
  useEffect(() => { setCompaniesPage(0); }, [country, pageSize]);

  // Main data load — one effect owns the fetch, no debounce-effect duplication.
  useEffect(() => {
    if (tab === 'leads') void loadLeads();
    else void loadCompanies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, country, position, source, datePosted, publisher, debouncedSearchQ, pageSize, leadsPage, companiesPage, authHeaders]);

  const runSweep = async () => {
    if (!authHeaders.Authorization) return;
    setShowSweepModal(false);
    setSweepRunning(true);
    setSweepSummary(null);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/jobs/sweep`, {
        method: 'POST',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          datePosted: sweepDatePosted,
          linkedinBias: sweepLinkedinBias,
          pageLoops: sweepPageLoops,
        }),
      });
      if (!res.ok) {
        // Server may reject with a typed error: 409 sweep_already_running, 400 sweep_budget_exceeded
        let detail = '';
        try { const j = await res.json(); detail = j?.message || j?.error || ''; } catch { /* ignore */ }
        throw new Error(detail || (await res.text()));
      }
      const data = await res.json();
      setSweepSummary(data.summary);
      // Only refresh the visible tab — fewer wasted requests, no flash.
      // The Companies aggregate is rebuilt as part of the sweep too, so we
      // refresh it too if the user is currently looking at that tab.
      await Promise.all([
        tab === 'leads'     ? loadLeads()     : Promise.resolve(),
        tab === 'companies' ? loadCompanies() : Promise.resolve(),
      ]);
      // Refresh the publishers list — a fresh sweep often surfaces new ones.
      // Use fresh=1 to bypass the 60s cache so the user sees them immediately.
      fetch(`${API_BASE_URL}/jobs/publishers?fresh=1`, { headers: authHeaders })
        .then((r) => r.json())
        .then((d: { publishers: string[] }) => setPublishers(d.publishers ?? []))
        .catch(() => { /* non-fatal */ });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSweepRunning(false);
    }
  };

  const clearFilters = () => {
    setCountry(''); setPosition(''); setSource('');
    setDatePosted(''); setPublisher(''); setSearchQ('');
    setLeadsPage(0);
  };
  const hasActiveFilters = !!(country || position || source || datePosted || publisher || searchQ);

  const markContacted = async (company: Company, contacted: boolean) => {
    if (!authHeaders.Authorization) return;
    try {
      await fetch(`${API_BASE_URL}/jobs/companies/${company.id}`, {
        method: 'PATCH',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ contacted }),
      });
      await loadCompanies();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const [exporting, setExporting] = useState(false);
  const EXPORT_CAP = 10_000;
  // Export ALL filtered rows via the backend — not just the visible page.
  // Uses fetch+blob (rather than window.location) so the Authorization header
  // travels with the request. Server caps at 10k rows; warn first if exceeded.
  const exportLeadsCsv = async () => {
    if (!authHeaders.Authorization) return;
    if (leadsTotal > EXPORT_CAP) {
      const ok = window.confirm(
        `Your filter matches ${leadsTotal.toLocaleString()} rows, but CSV export is capped at ${EXPORT_CAP.toLocaleString()}. Download the first ${EXPORT_CAP.toLocaleString()}?`,
      );
      if (!ok) return;
    }
    setExporting(true);
    setError(null);
    try {
      const params = buildLeadsQuery();
      const res = await fetch(`${API_BASE_URL}/jobs/leads/export?${params.toString()}`, { headers: authHeaders });
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      // Append an HH-MM-SS suffix so back-to-back exports don't collide.
      const stamp = new Date().toISOString().replace('T', '_').replace(/:/g, '-').slice(0, 19);
      a.download = `recruiter-leads-${stamp}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setExporting(false);
    }
  };

  const postLeadToFacebook = async (leadId: string) => {
    if (!POSTING_SERVICE_URL || !FALISHA_POSTING_KEY) return;
    setFbPostState((prev) => ({ ...prev, [leadId]: 'posting' }));
    try {
      const res = await fetch(`${POSTING_SERVICE_URL}/falisha/post-lead`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Falisha-Key': FALISHA_POSTING_KEY },
        body: JSON.stringify({ lead_id: leadId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as any)?.detail || `HTTP ${res.status}`);
      setFbPostState((prev) => ({ ...prev, [leadId]: 'done' }));
      setLeads((prev) => prev.map((l) => l.id === leadId ? { ...l, fb_post_id: (data as any).post_id } : l));
    } catch (e) {
      setFbPostState((prev) => ({ ...prev, [leadId]: 'error' }));
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div style={{ padding: 20, background: '#f8fafc', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 18px', borderRadius: 14, marginBottom: 18,
        background: 'linear-gradient(135deg, #1e40af 0%, #1d4ed8 50%, #2563eb 100%)',
        boxShadow: '0 2px 16px rgba(30,64,175,0.35)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(255,255,255,0.2)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Briefcase size={22} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#fff', lineHeight: 1.2 }}>Recruiter Leads</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)' }}>
              Companies hiring labour in Falisha's target markets — Adzuna (EU) + JSearch (Gulf)
            </div>
          </div>
        </div>
        <button
          onClick={() => setShowSweepModal(true)}
          disabled={sweepRunning}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 16px', borderRadius: 10, fontWeight: 700, fontSize: 13,
            border: '1px solid rgba(255,255,255,0.3)', cursor: sweepRunning ? 'not-allowed' : 'pointer',
            background: sweepRunning ? 'rgba(255,255,255,0.15)' : '#fff',
            color: sweepRunning ? '#fff' : '#1d4ed8',
          }}
        >
          <RefreshCw size={15} className={sweepRunning ? 'animate-spin' : ''} />
          {sweepRunning ? 'Running sweep…' : 'Run sweep now'}
        </button>
      </div>

      {/* Sweep summary banner */}
      {sweepSummary && (
        <div style={{
          padding: 12, borderRadius: 10, background: '#ecfdf5', border: '1px solid #a7f3d0',
          marginBottom: 14, fontSize: 13, color: '#065f46',
        }}>
          ✅ Sweep complete: {sweepSummary.totalQueries} queries, {sweepSummary.totalRawHits} raw results,{' '}
          <strong>{sweepSummary.totalNewLeads} new leads</strong> ({Math.round(sweepSummary.durationMs / 1000)}s).
          {sweepSummary.perRun.some((r) => r.status === 'error') && (
            <span style={{ color: '#92400e', marginLeft: 8 }}>
              · {sweepSummary.perRun.filter((r) => r.status === 'error').length} query/queries failed
            </span>
          )}
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div style={{
          padding: 12, borderRadius: 10, background: '#fef2f2', border: '1px solid #fecaca',
          marginBottom: 14, fontSize: 13, color: '#991b1b',
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* Tab switcher */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        <button onClick={() => setTab('leads')} style={tabBtnStyle(tab === 'leads')}>
          <Briefcase size={14} style={{ marginRight: 6, verticalAlign: -2 }} />
          Job Postings <span style={{ opacity: 0.7 }}>({leadsTotal})</span>
        </button>
        <button onClick={() => setTab('companies')} style={tabBtnStyle(tab === 'companies')}>
          <Building2 size={14} style={{ marginRight: 6, verticalAlign: -2 }} />
          Companies <span style={{ opacity: 0.7 }}>({companiesTotal})</span>
        </button>
      </div>

      {/* Filters */}
      <div style={{
        display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14,
        padding: 12, borderRadius: 10, background: '#fff', border: '1px solid #e5e7eb',
      }}>
        <select value={country} onChange={(e) => setCountry(e.target.value)} style={selectStyle}>
          <option value="">All countries</option>
          {countries.map((c) => <option key={c} value={c}>{fmtCountry(c)}</option>)}
        </select>

        {tab === 'leads' && (
          <>
            <select value={position} onChange={(e) => setPosition(e.target.value)} style={selectStyle}>
              <option value="">All positions</option>
              {positions.map((p) => <option key={p.slug} value={p.slug}>{p.query}</option>)}
            </select>
            <select value={publisher} onChange={(e) => setPublisher(e.target.value)} style={selectStyle}
                    title="Filter by job board / publisher (LinkedIn, Indeed, etc.)">
              <option value="">All publishers</option>
              {publishers.length === 0 && <option value="" disabled>— run a sweep to populate —</option>}
              {publishers.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <select value={source} onChange={(e) => setSource(e.target.value)} style={selectStyle}>
              <option value="">All sources</option>
              <option value="adzuna">Adzuna (EU)</option>
              <option value="jsearch">JSearch (Gulf+)</option>
            </select>
            <select value={datePosted} onChange={(e) => setDatePosted(e.target.value)} style={selectStyle}
                    title="Filter by how recently the job was posted">
              <option value="">Any time</option>
              <option value="today">Today</option>
              <option value="3days">Last 3 days</option>
              <option value="week">Last week</option>
              <option value="month">Last month</option>
            </select>
            <div style={{ position: 'relative', flex: '1 1 220px', minWidth: 200 }}>
              {searchPending ? (
                <RefreshCw size={14} className="animate-spin" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#2563eb' }} />
              ) : (
                <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
              )}
              <input
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                placeholder="Search employer or title…"
                style={{ ...selectStyle, paddingLeft: 30, width: '100%' }}
              />
            </div>
            <button onClick={exportLeadsCsv} disabled={exporting || !leadsTotal} style={secondaryBtnStyle}
                    title={`Export all ${leadsTotal.toLocaleString()} filtered rows as CSV`}>
              {exporting ? 'Exporting…' : `Export CSV${leadsTotal ? ` (${leadsTotal.toLocaleString()})` : ''}`}
            </button>
          </>
        )}
        {hasActiveFilters && (
          <button onClick={clearFilters} style={ghostBtnStyle} title="Reset all filters">
            Clear filters
          </button>
        )}
      </div>

      {/* Content */}
      {tab === 'leads' ? (
        <>
          <LeadsTable leads={leads} loading={leadsLoading} fbConfigured={fbConfigured} fbPostState={fbPostState} onFbPost={postLeadToFacebook} />
          <Pagination
            page={leadsPage}
            pageSize={pageSize}
            total={leadsTotal}
            currentCount={leads.length}
            loading={leadsLoading}
            onPageChange={setLeadsPage}
            onPageSizeChange={setPageSize}
            pageSizeOptions={PAGE_SIZE_OPTIONS}
          />
        </>
      ) : (
        <>
          <CompaniesTable companies={companies} loading={companiesLoading} onContact={markContacted} />
          <Pagination
            page={companiesPage}
            pageSize={pageSize}
            total={companiesTotal}
            currentCount={companies.length}
            loading={companiesLoading}
            onPageChange={setCompaniesPage}
            onPageSizeChange={setPageSize}
            pageSizeOptions={PAGE_SIZE_OPTIONS}
          />
        </>
      )}

      {showSweepModal && (
        <SweepConfirmModal
          datePosted={sweepDatePosted} onDatePostedChange={setSweepDatePosted}
          linkedinBias={sweepLinkedinBias} onLinkedinBiasChange={setSweepLinkedinBias}
          pageLoops={sweepPageLoops} onPageLoopsChange={setSweepPageLoops}
          onConfirm={runSweep}
          onCancel={() => setShowSweepModal(false)}
        />
      )}
    </div>
  );
}

function SweepConfirmModal(props: {
  datePosted: 'today' | '3days' | 'week' | 'month' | 'all';
  onDatePostedChange: (v: 'today' | '3days' | 'week' | 'month' | 'all') => void;
  linkedinBias: boolean;
  onLinkedinBiasChange: (v: boolean) => void;
  pageLoops: number;
  onPageLoopsChange: (v: number) => void;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  // Local submitting state so a double-click on Run sweep can't fire twice
  // before the parent setShowSweepModal(false) unmounts us.
  const [submitting, setSubmitting] = useState(false);
  const cancelBtnRef = useRef<HTMLButtonElement>(null);

  // Esc → cancel + lock page scroll + autofocus a safe action.
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting) props.onCancel();
    };
    window.addEventListener('keydown', onKey);
    cancelBtnRef.current?.focus();
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [submitting, props]);

  const handleConfirm = () => {
    if (submitting) return;
    setSubmitting(true);
    props.onConfirm();
  };
  const handleCancel = () => {
    if (submitting) return;
    props.onCancel();
  };

  return (
    <div
      onClick={handleCancel}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16, zIndex: 9999, animation: 'fadeIn 120ms ease-out',
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="sweep-modal-title"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: 14, width: 'min(520px, 100%)',
          boxShadow: '0 20px 80px rgba(0,0,0,0.25), 0 0 0 1px rgba(15,23,42,0.05)',
          overflow: 'hidden',
        }}
      >
        <div style={{ padding: '18px 22px 14px', borderBottom: '1px solid #f1f5f9' }}>
          <div id="sweep-modal-title" style={{ fontSize: 17, fontWeight: 700, color: '#0f172a' }}>Run a fresh sweep</div>
          <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
            Sweeps every configured position × country. Takes 1–3 min and consumes API quota.
          </div>
        </div>

        <div style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <span style={{ fontSize: 13, color: '#0f172a', fontWeight: 600 }}>Recency</span>
            <select
              value={props.datePosted}
              disabled={submitting}
              onChange={(e) => props.onDatePostedChange(e.target.value as typeof props.datePosted)}
              style={{ ...selectStyle, minWidth: 180 }}
            >
              <option value="today">Posted today</option>
              <option value="3days">Last 3 days</option>
              <option value="week">Last week (recommended)</option>
              <option value="month">Last month</option>
              <option value="all">Any time</option>
            </select>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <span style={{ fontSize: 13, color: '#0f172a', fontWeight: 600 }}>JSearch pages per query</span>
            <select
              value={props.pageLoops}
              disabled={submitting}
              onChange={(e) => props.onPageLoopsChange(Number(e.target.value))}
              style={{ ...selectStyle, minWidth: 180 }}
              title="More pages = more results but more API calls (each page = one billed JSearch call)"
            >
              <option value={1}>1 page (cheapest)</option>
              <option value={2}>2 pages</option>
              <option value={3}>3 pages</option>
              <option value={5}>5 pages (max — burns quota fast)</option>
            </select>
          </label>

          <label style={{
            display: 'flex', alignItems: 'flex-start', gap: 10, padding: 12,
            background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10,
            opacity: submitting ? 0.6 : 1,
          }}>
            <input
              type="checkbox"
              checked={props.linkedinBias}
              disabled={submitting}
              onChange={(e) => props.onLinkedinBiasChange(e.target.checked)}
              style={{ marginTop: 2 }}
            />
            <span style={{ fontSize: 12.5, color: '#1e3a8a', lineHeight: 1.45 }}>
              <strong>Bias toward LinkedIn results</strong> · appends "via linkedin" to each query so JSearch
              re-ranks LinkedIn-published jobs higher. Use the <em>Publisher</em> filter after the sweep
              to isolate LinkedIn-only rows.
            </span>
          </label>
        </div>

        <div style={{
          padding: '14px 22px', borderTop: '1px solid #f1f5f9', background: '#f8fafc',
          display: 'flex', gap: 8, justifyContent: 'flex-end',
        }}>
          <button ref={cancelBtnRef} onClick={handleCancel} disabled={submitting} style={secondaryBtnStyle}>Cancel</button>
          <button onClick={handleConfirm} disabled={submitting}
                  style={{ ...primaryBtnStyle, opacity: submitting ? 0.7 : 1, cursor: submitting ? 'not-allowed' : 'pointer' }}>
            {submitting ? 'Starting…' : 'Run sweep'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Pagination({
  page, pageSize, total, currentCount, loading,
  onPageChange, onPageSizeChange, pageSizeOptions,
}: {
  page: number;
  pageSize: number;
  total: number;
  currentCount: number;
  loading: boolean;
  onPageChange: (p: number) => void;
  onPageSizeChange: (size: number) => void;
  pageSizeOptions: ReadonlyArray<number>;
}) {
  if (loading && total === 0) return null; // hide on first load to avoid flash
  if (total === 0) return null;             // empty state already shown by table

  const offset = page * pageSize;
  const first = offset + 1;
  const last = Math.min(offset + currentCount, total);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const atFirst = page === 0;
  const atLast = offset + currentCount >= total;

  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap',
      gap: 12, marginTop: 12, padding: '10px 14px',
      background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb',
      fontSize: 13, color: '#374151',
    }}>
      <div>
        Showing <strong>{first.toLocaleString()}–{last.toLocaleString()}</strong> of <strong>{total.toLocaleString()}</strong>
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <label style={{ fontSize: 12, color: '#6b7280' }}>
          Per page:
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            style={{ marginLeft: 6, padding: '4px 8px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 13 }}
          >
            {pageSizeOptions.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
        <button
          onClick={() => onPageChange(0)}
          disabled={atFirst}
          style={pagerBtnStyle(atFirst)}
          title="First page"
        >« First</button>
        <button
          onClick={() => onPageChange(Math.max(0, page - 1))}
          disabled={atFirst}
          style={pagerBtnStyle(atFirst)}
        >‹ Prev</button>
        <span style={{ fontWeight: 600, color: '#374151', minWidth: 80, textAlign: 'center' }}>
          Page {page + 1} / {totalPages}
        </span>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={atLast}
          style={pagerBtnStyle(atLast)}
        >Next ›</button>
        <button
          onClick={() => onPageChange(totalPages - 1)}
          disabled={atLast}
          style={pagerBtnStyle(atLast)}
          title="Last page"
        >Last »</button>
      </div>
    </div>
  );
}

function pagerBtnStyle(disabled: boolean): CSSProperties {
  return {
    padding: '6px 12px', borderRadius: 6, fontSize: 13, fontWeight: 600,
    border: '1px solid ' + (disabled ? '#e5e7eb' : '#d1d5db'),
    background: disabled ? '#f9fafb' : '#fff',
    color: disabled ? '#9ca3af' : '#374151',
    cursor: disabled ? 'not-allowed' : 'pointer',
  };
}

function LeadsTable({ leads, loading, fbConfigured, fbPostState, onFbPost }: {
  leads: Lead[];
  loading: boolean;
  fbConfigured: boolean;
  fbPostState: Record<string, 'posting' | 'done' | 'error'>;
  onFbPost: (leadId: string) => void;
}) {
  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Loading…</div>;
  if (!leads.length) return (
    <div style={{ padding: 40, textAlign: 'center', color: '#6b7280', background: '#fff', borderRadius: 10, border: '1px dashed #d1d5db' }}>
      No leads yet. Click <strong>"Run sweep now"</strong> at the top to fetch the first batch.
    </div>
  );
  return (
    <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f9fafb', textAlign: 'left' }}>
              <th style={thStyle}>Title</th>
              <th style={thStyle}>Employer</th>
              <th style={thStyle}>Location</th>
              <th style={thStyle}>Position</th>
              <th style={thStyle}>Salary</th>
              <th style={thStyle}>Via</th>
              <th style={thStyle}>Posted</th>
              <th style={thStyle}>Link</th>
              {fbConfigured && <th style={thStyle}>FB</th>}
            </tr>
          </thead>
          <tbody>
            {leads.map((l) => (
              <tr key={l.id} style={{ borderTop: '1px solid #f3f4f6' }}>
                <td style={tdStyle} title={l.title}>{l.title.length > 60 ? l.title.slice(0, 60) + '…' : l.title}</td>
                <td style={{ ...tdStyle, fontWeight: 600 }}>{l.employer_name || '—'}</td>
                <td style={tdStyle}>{[l.city, fmtCountry(l.country_code)].filter(Boolean).join(', ')}</td>
                <td style={tdStyle}>{l.position_category}</td>
                <td style={tdStyle}>{fmtSalary(l.salary_min, l.salary_max, l.salary_currency)}</td>
                <td style={{ ...tdStyle, color: '#6b7280' }}>{l.publisher || SOURCE_LABELS[l.source]}</td>
                <td style={{ ...tdStyle, color: '#6b7280' }}>{fmtDate(l.posted_at || l.found_at)}</td>
                <td style={tdStyle}>
                  <a href={l.source_url} target="_blank" rel="noopener noreferrer"
                     style={{ color: '#2563eb', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    Open <ExternalLink size={12} />
                  </a>
                </td>
                {fbConfigured && (
                  <td style={tdStyle}>
                    {(() => {
                      const state = fbPostState[l.id];
                      const alreadyPosted = !!(l.fb_post_id || state === 'done');
                      if (alreadyPosted) {
                        return <span style={{ fontSize: 11, color: '#1877f2', fontWeight: 600 }}>✓ Posted</span>;
                      }
                      return (
                        <button
                          onClick={() => onFbPost(l.id)}
                          disabled={state === 'posting'}
                          title="Post this job to your Facebook Page"
                          style={{
                            padding: '4px 9px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                            border: state === 'error' ? '1px solid #ef4444' : '1px solid #1877f2',
                            background: state === 'error' ? '#fef2f2' : '#1877f2',
                            color: state === 'error' ? '#dc2626' : '#fff',
                            cursor: state === 'posting' ? 'wait' : 'pointer',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {state === 'posting' ? '…' : state === 'error' ? 'Retry' : 'Post'}
                        </button>
                      );
                    })()}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CompaniesTable({ companies, loading, onContact }: { companies: Company[]; loading: boolean; onContact: (c: Company, v: boolean) => void }) {
  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Loading…</div>;
  if (!companies.length) return (
    <div style={{ padding: 40, textAlign: 'center', color: '#6b7280', background: '#fff', borderRadius: 10, border: '1px dashed #d1d5db' }}>
      No companies aggregated yet. Run a sweep first to populate this list.
    </div>
  );
  return (
    <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f9fafb', textAlign: 'left' }}>
              <th style={thStyle}>Company</th>
              <th style={thStyle}>Primary</th>
              <th style={thStyle}>Countries</th>
              <th style={thStyle}>Positions</th>
              <th style={thStyle}>Listings</th>
              <th style={thStyle}>Last seen</th>
              <th style={thStyle}>Status</th>
            </tr>
          </thead>
          <tbody>
            {companies.map((c) => (
              <tr key={c.id} style={{ borderTop: '1px solid #f3f4f6' }}>
                <td style={{ ...tdStyle, fontWeight: 700 }}>{c.name}</td>
                <td style={tdStyle}>{fmtCountry(c.primary_country)}</td>
                <td style={{ ...tdStyle, color: '#6b7280' }}>{c.countries_seen.map((cc) => fmtCountry(cc)).join(', ')}</td>
                <td style={{ ...tdStyle, color: '#6b7280' }}>{c.positions_seen.join(', ')}</td>
                <td style={{ ...tdStyle, fontWeight: 700, color: '#1d4ed8' }}>{c.total_listings}</td>
                <td style={{ ...tdStyle, color: '#6b7280' }}>{fmtDate(c.last_seen_at)}</td>
                <td style={tdStyle}>
                  {c.contacted ? (
                    <button onClick={() => onContact(c, false)}
                            style={{ ...secondaryBtnStyle, background: '#dcfce7', color: '#065f46', borderColor: '#a7f3d0' }}>
                      ✓ Contacted {c.contacted_at ? `· ${fmtDate(c.contacted_at)}` : ''}
                    </button>
                  ) : (
                    <button onClick={() => onContact(c, true)} style={secondaryBtnStyle}>
                      Mark contacted
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const thStyle: CSSProperties = { padding: '10px 12px', fontWeight: 700, fontSize: 12, color: '#374151', borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap' };
const tdStyle: CSSProperties = { padding: '10px 12px', verticalAlign: 'top' };
const selectStyle: CSSProperties = { padding: '8px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 13, background: '#fff', minWidth: 130 };
const primaryBtnStyle: CSSProperties = { padding: '8px 16px', borderRadius: 8, border: '1px solid #2563eb', background: '#2563eb', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' };
const secondaryBtnStyle: CSSProperties = { padding: '8px 12px', borderRadius: 8, border: '1px solid #d1d5db', background: '#fff', color: '#374151', fontSize: 12, fontWeight: 600, cursor: 'pointer' };
const ghostBtnStyle: CSSProperties = { padding: '8px 12px', borderRadius: 8, border: 'none', background: 'transparent', color: '#6b7280', fontSize: 12, fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' };

function tabBtnStyle(active: boolean): CSSProperties {
  return {
    padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
    border: '1px solid ' + (active ? '#2563eb' : '#d1d5db'),
    background: active ? '#2563eb' : '#fff',
    color: active ? '#fff' : '#374151', cursor: 'pointer',
  };
}
