import { useEffect, useState, useMemo } from 'react';
import { Search, X, Eye, Edit2, Download, Grid3x3, List } from 'lucide-react';
import { apiClient, Candidate } from '../lib/apiClient';

interface CandidateManagementProps {
  initialProfessionFilter?: string;
}

interface FilterState {
  search: string;
  source: 'all' | 'cv_parser' | 'manual';
  position: string;
}

export function CandidateManagement({ initialProfessionFilter = 'all' }: CandidateManagementProps) {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    source: 'all',
    position: initialProfessionFilter || 'all'
  });
  const [positions, setPositions] = useState<string[]>([]);

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
      const matchesSource = filters.source === 'all' || c.extraction_source === filters.source;
      const matchesPosition = filters.position === 'all' || c.position === filters.position;
      return matchesSearch && matchesSource && matchesPosition;
    });
  }, [candidates, filters]);

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
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Candidates</h1>
            <p className="text-gray-600 mt-1">{filteredCandidates.length} candidate{filteredCandidates.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 p-1">
            <button
              onClick={() => setViewMode('card')}
              className={`p-2 rounded ${viewMode === 'card' ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
              title="Card view"
            >
              <Grid3x3 className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 rounded ${viewMode === 'table' ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
              title="Table view"
            >
              <List className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
          <div className="space-y-4">
            <div className="relative">
              <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by name, email, phone, or code..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="flex flex-wrap gap-3 items-center">
              <select
                value={filters.source}
                onChange={(e) => setFilters({ ...filters, source: e.target.value as FilterState['source'] })}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="all">All Sources</option>
                <option value="cv_parser">From CV</option>
                <option value="manual">Manual</option>
              </select>

              <select
                value={filters.position}
                onChange={(e) => setFilters({ ...filters, position: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="all">All Positions</option>
                {positions.map(pos => (
                  <option key={pos} value={pos}>{pos}</option>
                ))}
              </select>

              {(filters.search || filters.source !== 'all' || filters.position !== 'all') && (
                <button
                  onClick={() => setFilters({ search: '', source: 'all', position: 'all' })}
                  className="px-3 py-2 text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                >
                  <X className="w-4 h-4" />
                  Clear filters
                </button>
              )}
            </div>
          </div>
        </div>

        {filteredCandidates.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No candidates found</h3>
            <p className="text-gray-600">
              {filters.search || filters.source !== 'all' || filters.position !== 'all'
                ? 'Try adjusting your filters.'
                : 'Try adding a candidate from the CV inbox or backend API.'}
            </p>
          </div>
        ) : viewMode === 'card' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCandidates.map((c) => (
              <div
                key={c.id}
                className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg hover:border-gray-300 transition-all duration-200 flex flex-col"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-blue-600 font-semibold text-sm">
                          {c.name.substring(0, 2).toUpperCase()}
                        </span>
                      </div>
                      <h3 className="text-base font-semibold text-gray-900">{c.name}</h3>
                    </div>
                    <p className="text-xs text-gray-500 font-mono">{c.candidate_code}</p>
                  </div>
                  {c.extraction_source && (
                    <span className={`px-2 py-1 text-xs font-medium rounded-full whitespace-nowrap ml-2 ${
                      c.extraction_source === 'cv_parser'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-purple-100 text-purple-700'
                    }`}>
                      {c.extraction_source === 'cv_parser' ? 'From CV' : 'Manual'}
                    </span>
                  )}
                </div>

                {(c.email || c.phone || c.address) && (
                  <div className="space-y-2 mb-4 pb-4 border-b border-gray-200">
                    {c.email && (
                      <div className="flex items-start gap-2 text-sm">
                        <span className="text-gray-500 font-medium flex-shrink-0">Email:</span>
                        <span className="text-gray-900 truncate">{c.email}</span>
                      </div>
                    )}
                    {c.phone && (
                      <div className="flex items-start gap-2 text-sm">
                        <span className="text-gray-500 font-medium flex-shrink-0">Phone:</span>
                        <span className="text-gray-900">{c.phone}</span>
                      </div>
                    )}
                    {c.address && (
                      <div className="flex items-start gap-2 text-sm">
                        <span className="text-gray-500 font-medium flex-shrink-0">Location:</span>
                        <span className="text-gray-900 truncate">{c.address}</span>
                      </div>
                    )}
                  </div>
                )}

                {(c.position || c.experience_years || c.nationality) && (
                  <div className="space-y-2 mb-4">
                    {c.position && (
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase">Position</p>
                        <p className="text-sm text-gray-900">{c.position}</p>
                      </div>
                    )}
                    {c.experience_years && (
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase">Experience</p>
                        <p className="text-sm text-gray-900">{c.experience_years} years</p>
                      </div>
                    )}
                    {c.nationality && (
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase">Nationality</p>
                        <p className="text-sm text-gray-900">{c.nationality}</p>
                      </div>
                    )}
                  </div>
                )}

                {c.skills && (
                  <div className="mb-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Skills</p>
                    <div className="flex flex-wrap gap-1">
                      {(() => {
                        try {
                          const skills = typeof c.skills === 'string' ? JSON.parse(c.skills) : c.skills;
                          return Array.isArray(skills) ? skills.slice(0, 3).map((skill, i) => (
                            <span
                              key={i}
                              className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
                            >
                              {skill}
                            </span>
                          )) : null;
                        } catch {
                          return null;
                        }
                      })()}
                    </div>
                  </div>
                )}

                <div className="mt-auto pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-500">
                      {c.extracted_at ? `Updated: ${new Date(c.extracted_at).toLocaleDateString()}` : ''}
                    </p>
                    <button
                      className="px-3 py-2 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1"
                    >
                      <Eye className="w-4 h-4" />
                      View
                    </button>
                  </div>
                </div>
              </div>
            ))}
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
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Source</th>
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
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        c.extraction_source === 'cv_parser'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-purple-100 text-purple-700'
                      }`}>
                        {c.extraction_source === 'cv_parser' ? 'From CV' : 'Manual'}
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
                          className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
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
