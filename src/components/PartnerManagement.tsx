import { useEffect, useState } from 'react';
import { ArrowLeft, Building2, Calendar, Mail, Phone, Search, Users } from 'lucide-react';
import { apiClient, type AppUserProfile } from '../lib/apiClient';
import { useAuth } from '../lib/authContext';
import { CandidateProvider } from '../lib/candidateContext';
import { CandidateManagement } from './CandidateManagement_ENHANCED';

// ─── Helpers ────────────────────────────────────────────────────────────────

function initials(name?: string | null) {
  const parts = (name || '?').trim().split(/\s+/);
  return (parts[0]?.[0] || '?').toUpperCase() + (parts[1]?.[0] || '').toUpperCase();
}

function formatDate(iso?: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ─── Types ──────────────────────────────────────────────────────────────────

interface PartnerWithStats extends AppUserProfile {
  candidateCount?: number;
  companyName?: string | null;
  cityCountry?: string | null;
  partnerType?: string | null;
}

// ─── Partner card ────────────────────────────────────────────────────────────

function PartnerCard({ partner, onClick }: { partner: PartnerWithStats; onClick: () => void }) {
  const avatarColors = [
    'bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 'bg-amber-500',
    'bg-rose-500', 'bg-cyan-500', 'bg-indigo-500', 'bg-teal-500',
  ];
  const colorIdx =
    (partner.name || partner.email || '')
      .split('')
      .reduce((a, c) => a + c.charCodeAt(0), 0) % avatarColors.length;
  const avatarBg = avatarColors[colorIdx];

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white border border-gray-200 rounded-2xl p-5 hover:border-blue-400 hover:shadow-md transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-300"
    >
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div className={`${avatarBg} w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg flex-shrink-0`}>
          {initials(partner.name)}
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="font-semibold text-gray-900 truncate">{partner.name || '(no name)'}</p>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
              partner.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
            }`}>
              {partner.status || 'Active'}
            </span>
          </div>

          {partner.companyName && (
            <div className="flex items-center gap-1.5 mt-0.5 text-sm text-gray-500">
              <Building2 className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate">{partner.companyName}</span>
            </div>
          )}

          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400">
            <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{partner.email}</span>
            {partner.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{partner.phone}</span>}
            {partner.cityCountry && <span className="flex items-center gap-1">📍 {partner.cityCountry}</span>}
            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />Joined {formatDate(partner.created_at)}</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-sm font-medium text-blue-600">
          <Users className="w-4 h-4" />
          <span>{partner.candidateCount ?? '—'} candidates</span>
        </div>
        {partner.partnerType && (
          <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full">{partner.partnerType}</span>
        )}
        <span className="text-xs text-blue-500 font-medium">View →</span>
      </div>
    </button>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export function PartnerManagement() {
  const { accessToken } = useAuth();
  const [partners, setPartners] = useState<PartnerWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedPartner, setSelectedPartner] = useState<PartnerWithStats | null>(null);

  // ── Fetch partners + their candidate counts ──────────────────────────────

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const { users } = await apiClient.getAdminUsers(accessToken!);
        const partnerUsers = users.filter((u) => u.role === 'partner');

        // Fetch candidate counts in parallel
        const withCounts = await Promise.all(
          partnerUsers.map(async (u): Promise<PartnerWithStats> => {
            try {
              const res = await apiClient.getCandidates({ partner_id: u.id, limit: 1 });
              return { ...u, candidateCount: res.total ?? 0 };
            } catch {
              return { ...u, candidateCount: 0 };
            }
          })
        );

        if (!cancelled) {
          // Sort by most candidates first
          setPartners(withCounts.sort((a, b) => (b.candidateCount ?? 0) - (a.candidateCount ?? 0)));
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Failed to load partners');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [accessToken]);

  // ── Filtered list ────────────────────────────────────────────────────────

  const filtered = partners.filter((p) => {
    const q = search.toLowerCase();
    if (!q) return true;
    return (
      (p.name || '').toLowerCase().includes(q) ||
      p.email.toLowerCase().includes(q) ||
      (p.companyName || '').toLowerCase().includes(q) ||
      (p.cityCountry || '').toLowerCase().includes(q)
    );
  });

  // ── Partner detail view ──────────────────────────────────────────────────

  if (selectedPartner) {
    return (
      <CandidateProvider>
        <div className="h-full flex flex-col">
          {/* Header bar */}
          <div className="flex items-center gap-3 px-6 py-4 bg-white border-b border-gray-200">
            <button
              onClick={() => setSelectedPartner(null)}
              className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              All Partners
            </button>
            <span className="text-gray-300">|</span>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
                {initials(selectedPartner.name)}
              </div>
              <span className="font-semibold text-gray-900">{selectedPartner.name || selectedPartner.email}</span>
              {selectedPartner.companyName && (
                <span className="text-sm text-gray-400">· {selectedPartner.companyName}</span>
              )}
            </div>
            <div className="ml-auto flex items-center gap-1.5 text-sm text-gray-500">
              <Users className="w-4 h-4" />
              <span>{selectedPartner.candidateCount ?? 0} candidates</span>
            </div>
          </div>

          {/* Candidate browser scoped to this partner */}
          <div className="flex-1 overflow-hidden">
            <CandidateManagement partnerIdFilter={selectedPartner.id} />
          </div>
        </div>
      </CandidateProvider>
    );
  }

  // ── Partner list view ─────────────────────────────────────────────────────

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Page header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Partners</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {partners.length} partner{partners.length !== 1 ? 's' : ''} · click to view their candidates
          </p>
        </div>

        {/* Search */}
        <div className="sm:ml-auto relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, company…"
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
        </div>
      </div>

      {/* States */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-gray-100 rounded-2xl h-44 animate-pulse" />
          ))}
        </div>
      )}

      {!loading && error && (
        <div className="text-center py-16 text-red-500">{error}</div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="font-medium">{search ? 'No partners match your search' : 'No partner accounts yet'}</p>
        </div>
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((partner) => (
            <PartnerCard
              key={partner.id}
              partner={partner}
              onClick={() => setSelectedPartner(partner)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
