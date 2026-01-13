import { useEffect, useMemo, useState } from 'react';
import {
  Briefcase,
  Calendar,
  Download,
  Eye,
  Grid3x3,
  List,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Plus,
  Search,
  Share2,
  Star,
  X,
} from 'lucide-react';
import { apiClient, Candidate } from '../lib/apiClient';

interface CandidateManagementProps {
  initialProfessionFilter?: string;
}

interface FilterState {
  search: string;
  position: string;
  country: string;
  status: string;
}

function getInitials(name: string) {
  const trimmed = (name || '').trim();
  if (!trimmed) return '??';
  const parts = trimmed.split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] || '';
  const second = parts[1]?.[0] || parts[0]?.[1] || '';
  return `${first}${second}`.toUpperCase();
}

function safeJsonArray(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter((v) => typeof v === 'string') as string[];
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? (parsed.filter((v) => typeof v === 'string') as string[]) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function confidenceScore10(confidence?: Record<string, number>) {
  if (!confidence) return null;
  const values = Object.values(confidence).filter((v) => typeof v === 'number' && isFinite(v));
  if (values.length === 0) return null;
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  // Handle both 0..1 and 0..100 inputs defensively
  const normalized = avg > 1 ? avg / 100 : avg;
  const score = Math.max(0, Math.min(10, normalized * 10));
  return Math.round(score * 10) / 10;
}

export function CandidateManagement({ initialProfessionFilter = 'all' }: CandidateManagementProps) {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    position: initialProfessionFilter || 'all',
    country: 'all',
    status: 'all',
  });
  const [positions, setPositions] = useState<string[]>([]);
  const [countries, setCountries] = useState<string[]>([]);
  const [statuses, setStatuses] = useState<string[]>([]);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const response = await apiClient.getCandidates();
        if (isMounted) {
          setCandidates(response.candidates || []);
          const uniquePositions = Array.from(
            new Set((response.candidates || []).map(c => c.position).filter(Boolean))
          ).sort() as string[];
          setPositions(uniquePositions);

          const uniqueCountries = Array.from(
            new Set((response.candidates || []).map((c) => c.nationality).filter(Boolean))
          ).sort() as string[];
          setCountries(uniqueCountries);

          const uniqueStatuses = Array.from(
            new Set((response.candidates || []).map((c) => c.status).filter(Boolean))
          ).sort() as string[];
          setStatuses(uniqueStatuses);
        }
      } catch (e: any) {
        if (isMounted) setError(e?.message || 'Failed to load candidates');
      } finally {
        if (isMounted) setLoading(false);
      }
    })();
    return () => { isMounted = false; };
  }, []);

  const filteredCandidates = useMemo(() => {
    return candidates.filter(c => {
      const searchLower = filters.search.toLowerCase();
      const matchesSearch = !filters.search || 
        c.name.toLowerCase().includes(searchLower) ||
        c.email?.toLowerCase().includes(searchLower) ||
        c.phone?.toLowerCase().includes(searchLower) ||
        c.candidate_code?.toLowerCase().includes(searchLower);
      const matchesPosition = filters.position === 'all' || c.position === filters.position;
      const matchesCountry = filters.country === 'all' || c.nationality === filters.country;
      const matchesStatus = filters.status === 'all' || (c.status || '—') === filters.status;
      return matchesSearch && matchesPosition && matchesCountry && matchesStatus;
    });
  }, [candidates, filters]);

  const stats = useMemo(() => {
    const totalCandidates = candidates.length;
    const totalProfessions = positions.length;
    const pendingReview = candidates.filter((c) => (c.status || '').toLowerCase().includes('review')).length;
    const deployed = candidates.filter((c) => (c.status || '').toLowerCase().includes('deployed')).length;
    const now = Date.now();
    const weekMs = 7 * 24 * 60 * 60 * 1000;
    const newThisWeek = candidates.filter((c) => {
      const created = c.created_at ? Date.parse(c.created_at) : NaN;
      return Number.isFinite(created) && now - created <= weekMs;
    }).length;
    return { totalCandidates, totalProfessions, pendingReview, deployed, newThisWeek };
  }, [candidates, positions.length]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Loading candidates...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-red-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white border border-red-200 rounded-lg p-6 text-center">
            <h3 className="text-lg font-semibold text-red-900 mb-2">Failed to load candidates</h3>
            <p className="text-red-700 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Candidates</h1>
            <p className="text-gray-600 mt-1">Manage your candidate pipeline</p>
          </div>
          <button
            type="button"
            onClick={() => alert('Add New Candidate: coming soon')}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-blue-600 text-white font-semibold shadow-sm hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add New Candidate
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <div className="rounded-2xl p-5 text-white bg-gradient-to-br from-blue-600 to-blue-400 shadow-sm">
            <p className="text-white/80 text-sm font-medium">Total Candidates</p>
            <p className="text-4xl font-bold mt-2">{stats.totalCandidates}</p>
          </div>
          <div className="rounded-2xl p-5 text-white bg-gradient-to-br from-orange-600 to-orange-400 shadow-sm">
            <p className="text-white/80 text-sm font-medium">Total Professions</p>
            <p className="text-4xl font-bold mt-2">{stats.totalProfessions}</p>
          </div>
          <div className="rounded-2xl p-5 text-white bg-gradient-to-br from-amber-600 to-amber-400 shadow-sm">
            <p className="text-white/80 text-sm font-medium">Pending Review</p>
            <p className="text-4xl font-bold mt-2">{stats.pendingReview}</p>
          </div>
          <div className="rounded-2xl p-5 text-white bg-gradient-to-br from-green-600 to-green-400 shadow-sm">
            <p className="text-white/80 text-sm font-medium">Deployed</p>
            <p className="text-4xl font-bold mt-2">{stats.deployed}</p>
          </div>
          <div className="rounded-2xl p-5 text-white bg-gradient-to-br from-purple-600 to-purple-400 shadow-sm">
            <p className="text-white/80 text-sm font-medium">New This Week</p>
            <p className="text-4xl font-bold mt-2">{stats.newThisWeek}</p>
          </div>
        </div>

        {/* Filters / Search / View Toggle */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-6 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div className="flex flex-col sm:flex-row gap-3 flex-1">
              <select
                value={filters.country}
                onChange={(e) => setFilters({ ...filters, country: e.target.value })}
                className="h-11 px-4 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Countries</option>
                {countries.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>

              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="h-11 px-4 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                {statuses.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>

              <div className="relative flex-1">
                <Search className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search candidates by name, position, email..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="h-11 w-full pl-12 pr-4 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end">
              <div className="bg-gray-100 rounded-xl p-1 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setViewMode('card')}
                  className={`h-10 px-4 rounded-lg text-sm font-semibold inline-flex items-center gap-2 transition-colors ${
                    viewMode === 'card' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Grid3x3 className="w-4 h-4" />
                  Cards
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  className={`h-10 px-4 rounded-lg text-sm font-semibold inline-flex items-center gap-2 transition-colors ${
                    viewMode === 'table' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <List className="w-4 h-4" />
                  Table
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between mt-3 text-sm text-gray-600">
            <span>
              Showing <span className="font-semibold text-gray-900">{filteredCandidates.length}</span> of{' '}
              <span className="font-semibold text-gray-900">{candidates.length}</span> candidates
            </span>

            {(filters.search || filters.country !== 'all' || filters.status !== 'all') && (
              <button
                type="button"
                onClick={() => setFilters({ search: '', position: filters.position, country: 'all', status: 'all' })}
                className="inline-flex items-center gap-1 text-blue-600 font-semibold hover:text-blue-700"
              >
                <X className="w-4 h-4" />
                Clear
              </button>
            )}
          </div>
        </div>

        {filteredCandidates.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No candidates found</h3>
            <p className="text-gray-600">
              {filters.search || filters.country !== 'all' || filters.status !== 'all' || filters.position !== 'all'
                ? 'Try adjusting your filters.'
                : 'Try adding a candidate from the CV inbox or backend API.'}
            </p>
          </div>
        ) : viewMode === 'card' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredCandidates.map((c) => {
              const skills = safeJsonArray(c.skills);
              const score = confidenceScore10(c.extraction_confidence);
              const statusLabel = (c.status || 'Applied').toString();
              const isAuto = (c.extraction_source || '').toLowerCase() === 'cv_parser';

              const passportOk = !!c.passport_received;
              const cnicOk = !!c.cnic_received;
              const degreeOk = !!c.degree_received;
              const medicalOk = !!c.medical_received;
              const visaOk = !!c.visa_received;

              return (
                <div
                  key={c.id}
                  className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="h-24 bg-gradient-to-r from-blue-500 via-purple-500 to-fuchsia-500" />

                  <div className="px-5 pb-5 -mt-10">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-16 h-16 rounded-full bg-white p-1 shadow">
                          <div className="w-full h-full rounded-full bg-blue-50 flex items-center justify-center">
                            <span className="text-blue-700 font-bold text-xl">{getInitials(c.name)}</span>
                          </div>
                        </div>
                        <div className="pt-10">
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg font-bold text-gray-900 leading-tight">{c.name}</h3>
                            <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                              isAuto ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                            }`}>
                              {isAuto ? 'Auto' : 'Manual'}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 flex items-center gap-2 mt-1">
                            <Briefcase className="w-4 h-4 text-gray-400" />
                            <span className="font-medium">{c.position || '—'}</span>
                          </p>
                          <p className="text-sm text-gray-600 flex items-center gap-2 mt-1">
                            <MapPin className="w-4 h-4 text-gray-400" />
                            <span>
                              {(c.nationality || '—')}{' '}
                              <span className="text-gray-400">→</span>{' '}
                              <span className="text-blue-700 font-medium">{c.country_of_interest || '—'}</span>
                            </span>
                          </p>
                        </div>
                      </div>

                      <div className="pt-3">
                        <input type="checkbox" className="w-5 h-5 rounded border-gray-300" />
                      </div>
                    </div>

                    {/* Pills row */}
                    <div className="mt-4 flex flex-wrap gap-2 items-center">
                      <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700">
                        {statusLabel}
                      </span>
                      {score != null && (
                        <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-yellow-50 text-yellow-800 inline-flex items-center gap-1">
                          <Star className="w-4 h-4" />
                          {score} <span className="text-yellow-700/70">/10</span>
                        </span>
                      )}
                      {c.experience_years != null && (
                        <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-gray-50 text-gray-700">
                          {c.experience_years}y exp
                        </span>
                      )}
                    </div>

                    {/* Contact */}
                    <div className="mt-4 border-t border-gray-100 pt-4 space-y-3 text-sm">
                      {c.phone && (
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-lg bg-green-50 text-green-700 flex items-center justify-center">
                            <Phone className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Phone</p>
                            <p className="font-semibold text-gray-900">{c.phone}</p>
                          </div>
                        </div>
                      )}
                      {c.email && (
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                            <Mail className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs text-gray-500">Email</p>
                            <p className="font-semibold text-gray-900 truncate">{c.email}</p>
                          </div>
                        </div>
                      )}
                      {c.created_at && (
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
                            <Calendar className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Applied Date</p>
                            <p className="font-semibold text-gray-900">{new Date(c.created_at).toLocaleDateString()}</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Skills */}
                    {skills.length > 0 && (
                      <div className="mt-5">
                        <p className="text-sm font-semibold text-gray-900 mb-2">Top Skills</p>
                        <div className="flex flex-wrap gap-2">
                          {skills.slice(0, 4).map((s, idx) => (
                            <span key={`${c.id}-skill-${idx}`} className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold">
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Documents */}
                    <div className="mt-5">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-semibold text-gray-900">Documents</p>
                        <button type="button" className="text-xs font-semibold text-blue-600 hover:text-blue-700">View All →</button>
                      </div>
                      <div className="grid grid-cols-5 gap-2">
                        {[
                          { label: 'CV', ok: !!c.extracted_at || !!c.extraction_source },
                          { label: 'Passport', ok: passportOk },
                          { label: 'CNIC', ok: cnicOk },
                          { label: 'Degree', ok: degreeOk },
                          { label: 'Medical', ok: medicalOk || visaOk },
                        ].map((d) => (
                          <div
                            key={`${c.id}-${d.label}`}
                            className={`h-12 rounded-xl border flex items-center justify-center text-[11px] font-semibold ${
                              d.ok ? 'bg-green-50 border-green-200 text-green-800' : 'bg-gray-50 border-gray-200 text-gray-600'
                            }`}
                            title={d.ok ? 'Available' : 'Missing'}
                          >
                            {d.label}
                          </div>
                        ))}
                      </div>
                      <div className={`mt-3 rounded-xl px-4 py-2 text-xs font-semibold ${
                        passportOk && cnicOk && degreeOk && medicalOk ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-amber-50 text-amber-800 border border-amber-200'
                      }`}>
                        {passportOk && cnicOk && degreeOk && medicalOk ? 'All documents are valid' : 'Some documents are missing'}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="mt-5">
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          className="h-11 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors inline-flex items-center justify-center gap-2"
                        >
                          <Eye className="w-4 h-4" />
                          View Full Profile
                        </button>
                        <button
                          type="button"
                          className="h-11 rounded-xl bg-purple-600 text-white font-semibold hover:bg-purple-700 transition-colors inline-flex items-center justify-center gap-2"
                        >
                          <Download className="w-4 h-4" />
                          Employer CV
                        </button>
                      </div>

                      <div className="mt-3 grid grid-cols-4 gap-2">
                        <button type="button" className="h-10 rounded-xl bg-gray-50 border border-gray-200 text-gray-700 font-semibold hover:bg-gray-100">WhatsApp</button>
                        <button type="button" className="h-10 rounded-xl bg-gray-50 border border-gray-200 text-gray-700 font-semibold hover:bg-gray-100 inline-flex items-center justify-center gap-2">
                          <Mail className="w-4 h-4" />
                          Email
                        </button>
                        <button type="button" className="h-10 rounded-xl bg-gray-50 border border-gray-200 text-gray-700 font-semibold hover:bg-gray-100 inline-flex items-center justify-center gap-2">
                          <Share2 className="w-4 h-4" />
                          Share
                        </button>
                        <button type="button" className="h-10 rounded-xl bg-gray-50 border border-gray-200 text-gray-700 font-semibold hover:bg-gray-100 inline-flex items-center justify-center gap-2">
                          <MessageSquare className="w-4 h-4" />
                          Edit
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Position</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Phone</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredCandidates.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-blue-600 font-semibold text-xs">
                            {c.name.substring(0, 2).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 text-sm">{c.name}</p>
                          <p className="text-xs text-gray-500 font-mono">{c.candidate_code}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{c.position || '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{c.email || '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{c.phone || '—'}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">
                        {c.status || 'Applied'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="View details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          className="p-1.5 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                          title="Download CV"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
