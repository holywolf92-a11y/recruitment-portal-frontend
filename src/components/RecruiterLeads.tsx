// Admin tab: Recruiter Leads
// Surfaces companies and agencies hiring labour roles in Falisha's target
// markets. Data is swept from Adzuna (Europe) and JSearch (Gulf + global)
// nightly and on-demand from the "Run sweep" button.

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { Briefcase, Building2, ExternalLink, RefreshCw, Search } from 'lucide-react';
import { useAuth } from '../lib/authContext';
import { API_BASE_URL } from '../lib/apiClient';

type Position = { slug: string; query: string };

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

  const [error, setError] = useState<string | null>(null);

  // Filters
  const [country, setCountry] = useState('');
  const [position, setPosition] = useState('');
  const [source, setSource] = useState('');
  const [daysOld, setDaysOld] = useState('');
  const [searchQ, setSearchQ] = useState('');

  // Pagination (separate page indices per tab so switching tabs preserves position)
  const PAGE_SIZE_OPTIONS = [25, 50, 100, 200] as const;
  const [pageSize, setPageSize] = useState<number>(50);
  const [leadsPage, setLeadsPage] = useState(0);        // 0-indexed
  const [companiesPage, setCompaniesPage] = useState(0);

  const authHeaders = useMemo(() => {
    const token = (session as any)?.session?.access_token || (session as any)?.access_token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, [session]);

  // Load filter config once
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
  }, [authHeaders]);

  const loadLeads = async () => {
    if (!authHeaders.Authorization) return;
    setLeadsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (country)  params.set('country', country);
      if (position) params.set('position', position);
      if (source)   params.set('source', source);
      if (daysOld)  params.set('daysOld', daysOld);
      if (searchQ)  params.set('q', searchQ);
      params.set('limit', String(pageSize));
      params.set('offset', String(leadsPage * pageSize));
      const res = await fetch(`${API_BASE_URL}/jobs/leads?${params.toString()}`, { headers: authHeaders });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setLeads(data.leads ?? []);
      setLeadsTotal(data.total ?? 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLeadsLoading(false);
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

  // Reset page back to 0 whenever filters or page-size change — otherwise you can
  // end up looking at "page 5 of 2" with nothing to show.
  useEffect(() => { setLeadsPage(0); setCompaniesPage(0); }, [country, position, source, daysOld, searchQ, pageSize]);

  useEffect(() => {
    if (tab === 'leads') void loadLeads();
    else void loadCompanies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, country, position, source, daysOld, pageSize, leadsPage, companiesPage, authHeaders]);

  const runSweep = async () => {
    if (!authHeaders.Authorization) return;
    if (!confirm('Run a fresh sweep across all configured positions × countries?\nThis takes 1–3 minutes and consumes API quota.')) return;
    setSweepRunning(true);
    setSweepSummary(null);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/jobs/sweep`, {
        method: 'POST',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setSweepSummary(data.summary);
      await loadLeads();
      await loadCompanies();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSweepRunning(false);
    }
  };

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

  const exportLeadsCsv = () => {
    if (!leads.length) return;
    const cols = ['title','employer_name','country_code','city','position_category','publisher','salary_min','salary_max','salary_currency','source','source_url','posted_at','found_at'];
    const header = cols.join(',');
    const rows = leads.map((l) =>
      cols.map((c) => {
        const v = (l as any)[c];
        if (v == null) return '';
        const s = String(v).replace(/"/g, '""');
        return /[",\n]/.test(s) ? `"${s}"` : s;
      }).join(','),
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `recruiter-leads-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
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
          onClick={runSweep}
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
            <select value={source} onChange={(e) => setSource(e.target.value)} style={selectStyle}>
              <option value="">All sources</option>
              <option value="adzuna">Adzuna (EU)</option>
              <option value="jsearch">JSearch (Gulf+)</option>
            </select>
            <select value={daysOld} onChange={(e) => setDaysOld(e.target.value)} style={selectStyle}>
              <option value="">Any time</option>
              <option value="1">Last 24h</option>
              <option value="3">Last 3 days</option>
              <option value="7">Last week</option>
              <option value="30">Last 30 days</option>
            </select>
            <div style={{ position: 'relative', flex: '1 1 220px', minWidth: 200 }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
              <input
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadLeads()}
                placeholder="Search employer or title…"
                style={{ ...selectStyle, paddingLeft: 30, width: '100%' }}
              />
            </div>
            <button onClick={loadLeads} style={primaryBtnStyle}>Apply</button>
            <button onClick={exportLeadsCsv} disabled={!leads.length} style={secondaryBtnStyle}>Export CSV</button>
          </>
        )}
      </div>

      {/* Content */}
      {tab === 'leads' ? (
        <>
          <LeadsTable leads={leads} loading={leadsLoading} />
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

function LeadsTable({ leads, loading }: { leads: Lead[]; loading: boolean }) {
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

function tabBtnStyle(active: boolean): CSSProperties {
  return {
    padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
    border: '1px solid ' + (active ? '#2563eb' : '#d1d5db'),
    background: active ? '#2563eb' : '#fff',
    color: active ? '#fff' : '#374151', cursor: 'pointer',
  };
}
