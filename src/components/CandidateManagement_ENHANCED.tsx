import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  AlertCircle,
  Award,
  Briefcase,
  Calendar,
  Camera,
  CheckCircle,
  Download,
  Eye,
  File,
  FileText,
  Grid3x3,
  Image,
  List,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Plus,
  Search,
  Send,
  Share2,
  Sparkles,
  Star,
  Upload,
  X,
  XCircle,
} from 'lucide-react';
import { apiClient, Candidate } from '../lib/apiClient';
import { CandidateDetailsModal } from './CandidateDetailsModal';

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
    // First try JSON parsing
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? (parsed.filter((v) => typeof v === 'string') as string[]) : [];
    } catch {
      // If JSON parsing fails, try CSV splitting
      if (value.includes(',')) {
        return value.split(',').map(s => s.trim()).filter(s => s.length > 0);
      }
      // Single value
      return value.trim() ? [value.trim()] : [];
    }
  }
  return [];
}

function confidenceScore10(confidence?: Record<string, number>) {
  if (!confidence) return null;
  const values = Object.values(confidence).filter((v) => typeof v === 'number' && isFinite(v));
  if (values.length === 0) return null;
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const normalized = avg > 1 ? avg / 100 : avg;
  const score = Math.max(0, Math.min(10, normalized * 10));
  return Math.round(score * 10) / 10;
}

export function CandidateManagement({ initialProfessionFilter = 'all' }: CandidateManagementProps) {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<'Applied' | 'Pending' | 'Deployed' | 'Cancelled'>('Pending');
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    position: initialProfessionFilter || 'all',
    country: 'all',
    status: 'all',
  });
  const [positions, setPositions] = useState<string[]>([]);
  const [countries, setCountries] = useState<string[]>([]);
  const [statuses, setStatuses] = useState<string[]>([]);
  
  // Modal states
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [detailsInitialTab, setDetailsInitialTab] = useState<'details' | 'documents'>('details');
  const [uploadingPhoto, setUploadingPhoto] = useState<string | null>(null);
  const [documentAction, setDocumentAction] = useState<{ candidateId: string; docType: string } | null>(null);

  const fetchCandidates = async () => {
    setLoading(true);
    try {
      const response = await apiClient.getCandidates({
        search: filters.search,
        position: filters.position,
        country_of_interest: filters.country,
        status: filters.status,
      });
      setCandidates(response.candidates || []);
      const uniquePositions = Array.from(
        new Set((response.candidates || []).map(c => c.position).filter(Boolean))
      ).sort() as string[];
      setPositions(uniquePositions);

      const uniqueCountries = Array.from(
        new Set((response.candidates || []).map((c) => c.country_of_interest).filter(Boolean))
      ).sort() as string[];
      setCountries(uniqueCountries);

      const uniqueStatuses = Array.from(
        new Set((response.candidates || []).map((c) => (c.status || 'Applied')).filter(Boolean))
      ).sort() as string[];
      setStatuses(uniqueStatuses.length ? uniqueStatuses : ['Applied', 'Pending', 'Deployed', 'Cancelled']);
    } catch (e: any) {
      setError(e?.message || 'Failed to load candidates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const response = await apiClient.getCandidates({
          search: filters.search,
          position: filters.position,
          country_of_interest: filters.country,
          status: filters.status,
        });
        if (isMounted) {
          setCandidates(response.candidates || []);
          const uniquePositions = Array.from(
            new Set((response.candidates || []).map(c => c.position).filter(Boolean))
          ).sort() as string[];
          setPositions(uniquePositions);

          const uniqueCountries = Array.from(
            new Set((response.candidates || []).map((c) => c.country_of_interest).filter(Boolean))
          ).sort() as string[];
          setCountries(uniqueCountries);

          const uniqueStatuses = Array.from(
            new Set((response.candidates || []).map((c) => (c.status || 'Applied')).filter(Boolean))
          ).sort() as string[];
          setStatuses(uniqueStatuses.length ? uniqueStatuses : ['Applied', 'Pending', 'Deployed', 'Cancelled']);
        }
      } catch (e: any) {
        if (isMounted) setError(e?.message || 'Failed to load candidates');
      } finally {
        if (isMounted) setLoading(false);
      }
    })();
    return () => { isMounted = false; };
  }, [filters.search, filters.position, filters.country, filters.status]);, [filters]);

  const filteredCandidates = useMemo(() => {
    return candidates.filter(c => {
      const searchLower = filters.search.toLowerCase();
      const matchesSearch = !filters.search || 
        c.name.toLowerCase().includes(searchLower) ||
        c.email?.toLowerCase().includes(searchLower) ||
        c.phone?.toLowerCase().includes(searchLower) ||
        c.candidate_code?.toLowerCase().includes(searchLower);
      const matchesPosition = filters.position === 'all' || c.position === filters.position;
      const matchesCountry = filters.country === 'all' || (c.country_of_interest || '—') === filters.country;
      const matchesStatus = filters.status === 'all' || (c.status || 'Applied') === filters.status;
      return matchesSearch && matchesPosition && matchesCountry && matchesStatus;
    });
  }, [candidates, filters]);

  const stats = useMemo(() => {
    const totalCandidates = candidates.length;
    const totalProfessions = positions.length;
    const pendingReview = candidates.filter((c) => !!c.needs_review).length;
    const deployed = candidates.filter((c) => (c.status || 'Applied') === 'Deployed').length;
    const now = Date.now();
    const weekMs = 7 * 24 * 60 * 60 * 1000;
    const newThisWeek = candidates.filter((c) => {
      const created = c.created_at ? Date.parse(c.created_at) : NaN;
      return Number.isFinite(created) && now - created <= weekMs;
    }).length;
    return { totalCandidates, totalProfessions, pendingReview, deployed, newThisWeek };
  }, [candidates, positions.length]);

  const positionCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of candidates) {
      const key = (c.position || '').trim();
      if (!key) continue;
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    return counts;
  }, [candidates]);

  const allFilteredSelected = useMemo(() => {
    if (filteredCandidates.length === 0) return false;
    return filteredCandidates.every((c) => selectedIds.has(c.id));
  }, [filteredCandidates, selectedIds]);

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllFiltered() {
    setSelectedIds(new Set(filteredCandidates.map((c) => c.id)));
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  async function applyBulkStatusUpdate() {
    if (selectedIds.size === 0) return;
    try {
      setBulkUpdating(true);
      const ids = Array.from(selectedIds);
      const result = await apiClient.bulkUpdateCandidateStatus(ids, bulkStatus);
      const updatedIds = new Set((result.candidates || []).map((c) => c.id));

      setCandidates((prev) =>
        prev.map((c) => (updatedIds.has(c.id) ? { ...c, status: bulkStatus } : c))
      );
      clearSelection();
    } catch (e: any) {
      alert(e?.message || 'Failed to bulk update status');
    } finally {
      setBulkUpdating(false);
    }
  }

  // Handler functions for interactive elements
  function handleViewProfile(candidate: Candidate) {
    setSelectedCandidate(candidate);
    setDetailsInitialTab('details');
    setShowDetailsModal(true);
  }

  function handleViewAllDocuments(candidate: Candidate) {
    setSelectedCandidate(candidate);
    setDetailsInitialTab('documents');
    setShowDetailsModal(true);
  }

  async function handleDownloadCV(candidate: Candidate) {
    try {
      // Use the new dedicated CV download endpoint
      const { download_url, filename } = await apiClient.getCandidateCVDownload(candidate.id);
      
      // Trigger download
      const link = document.createElement('a');
      link.href = download_url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error: any) {
      // Check if it's a 404 (CV not found)
      if (error?.message?.includes('404')) {
        alert('No CV found for this candidate. Please upload a CV first.');
      } else {
        alert(error?.message || 'Failed to download CV');
      }
    }
  }

  function handlePhotoUpload(candidateId: string) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        alert('Photo must be smaller than 5MB');
        return;
      }

      try {
        setUploadingPhoto(candidateId);
        console.log('Uploading photo for candidate:', candidateId, 'File:', file.name, file.size, 'bytes');
        
        const result = await apiClient.uploadCandidatePhoto(candidateId, file);
        console.log('Photo upload result:', result);
        
        // Refresh candidate data
        const response = await apiClient.getCandidates(filters);
        setCandidates(response.candidates || []);
        
        alert('Photo uploaded successfully!');
      } catch (error: any) {
        console.error('Photo upload error:', error);
        alert(`Failed to upload photo: ${error?.message || 'Unknown error'}`);
      } finally {
        setUploadingPhoto(null);
      }
    };
    input.click();
  }

  function handleDocumentClick(candidateId: string, docType: string, hasDocument: boolean) {
    if (hasDocument) {
      // View/download document
      viewDocument(candidateId, docType);
    } else {
      // Upload document
      uploadDocument(candidateId, docType);
    }
  }

  async function viewDocument(candidateId: string, docType: string) {
    try {
      const docs = await apiClient.listCandidateDocuments(candidateId);
      const doc = docs.find(d => d.doc_type.toLowerCase() === docType.toLowerCase());
      
      if (!doc) {
        alert(`No ${docType} found`);
        return;
      }

      const downloadUrl = await apiClient.getDocumentDownloadUrl(doc.id);
      window.open(downloadUrl, '_blank');
    } catch (error: any) {
      alert(error?.message || 'Failed to view document');
    }
  }

  function uploadDocument(candidateId: string, docType: string) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = docType === 'photo' ? 'image/*' : '.pdf,.jpg,.jpeg,.png,.doc,.docx';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        await apiClient.uploadDocument(file, candidateId, docType, false);
        
        // Refresh candidate data
        const response = await apiClient.getCandidates(filters);
        setCandidates(response.candidates || []);
        
        alert(`${docType} uploaded successfully!`);
      } catch (error: any) {
        alert(error?.message || `Failed to upload ${docType}`);
      }
    };
    input.click();
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading candidates...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-red-50 flex items-center justify-center">
        <div className="bg-white border border-red-200 rounded-lg p-6 text-center max-w-md">
          <h3 className="text-lg font-medium text-red-900 mb-2">Failed to load candidates</h3>
          <p className="text-red-700 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Candidates</h1>
            <p className="text-gray-600 mt-1">Manage your candidate pipeline</p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-6 text-white shadow-lg">
            <div className="text-sm opacity-90">Total Candidates</div>
            <div className="text-3xl font-bold mt-2">{stats.totalCandidates}</div>
          </div>
          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg p-6 text-white shadow-lg">
            <div className="text-sm opacity-90">Total Professions</div>
            <div className="text-3xl font-bold mt-2">{stats.totalProfessions}</div>
          </div>
          <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-lg p-6 text-white shadow-lg">
            <div className="text-sm opacity-90">Pending Review</div>
            <div className="text-3xl font-bold mt-2">{stats.pendingReview}</div>
          </div>
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-6 text-white shadow-lg">
            <div className="text-sm opacity-90">Deployed</div>
            <div className="text-3xl font-bold mt-2">{stats.deployed}</div>
          </div>
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-6 text-white shadow-lg">
            <div className="text-sm opacity-90">New This Week</div>
            <div className="text-3xl font-bold mt-2">{stats.newThisWeek}</div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* Country Filter */}
          <select
            value={filters.country}
            onChange={(e) => setFilters(prev => ({ ...prev, country: e.target.value }))}
            className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          >
            <option value="all">All Countries</option>
            {countries.map(country => (
              <option key={country} value={country}>{country}</option>
            ))}
          </select>
          
          {/* Status Filter */}
          <select
            value={filters.status}
            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
            className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          >
            <option value="all">All Status</option>
            {statuses.map(status => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>

          {/* Search Bar */}
          <div className="md:col-span-2 relative">
            <Search className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search candidates by name, email, phone..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>

          {/* View Toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('card')}
              className={`flex-1 px-4 py-3 rounded-lg transition-colors flex items-center justify-center gap-2 ${
                viewMode === 'card' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Grid3x3 className="w-4 h-4" />
              Cards
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`flex-1 px-4 py-3 rounded-lg transition-colors flex items-center justify-center gap-2 ${
                viewMode === 'table' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <List className="w-4 h-4" />
              Table
            </button>
          </div>
        </div>

        {/* Bulk Actions Bar */}
        {selectedIds.size > 0 && (
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-blue-900">
                {selectedIds.size} candidate{selectedIds.size > 1 ? 's' : ''} selected
              </span>
              <button
                onClick={clearSelection}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                Clear selection
              </button>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={bulkStatus}
                onChange={(e) => setBulkStatus(e.target.value as any)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                disabled={bulkUpdating}
              >
                <option value="Applied">Applied</option>
                <option value="Pending">Pending</option>
                <option value="Deployed">Deployed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
              <button
                onClick={applyBulkStatusUpdate}
                disabled={bulkUpdating}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm disabled:opacity-50"
              >
                {bulkUpdating ? 'Updating...' : 'Update Status'}
              </button>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-gray-600">
            Showing <strong>{filteredCandidates.length}</strong> of <strong>{candidates.length}</strong> candidates
          </p>
          <button
            onClick={allFilteredSelected ? clearSelection : selectAllFiltered}
            className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            {allFilteredSelected ? 'Deselect All' : 'Select All'}
          </button>
        </div>
      </div>

      {/* Candidates Display */}
      {viewMode === 'card' ? (
        filteredCandidates.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No candidates found</h3>
            <p className="text-gray-600">
              Try adjusting your search or filters.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredCandidates.map((c) => {
              const skills = safeJsonArray(c.skills);
              const confidenceScore = confidenceScore10(c.extraction_confidence);
              const score = typeof c.ai_score === 'number' && isFinite(c.ai_score) ? c.ai_score : confidenceScore;
              const statusLabel = (c.status || 'Applied').toString();
              const selected = selectedIds.has(c.id);

              const cvOk = !!c.cv_received;
              const passportOk = !!c.passport_received;
              const certificateOk = !!c.certificate_received || !!c.degree_received;
              const photoOk = !!c.photo_received;
              const medicalOk = !!c.medical_received;
              const docCount = [cvOk, passportOk, certificateOk, photoOk, medicalOk].filter(Boolean).length;
              const allDocsOk = docCount === 5;

              return (
                <div
                  key={c.id}
                  className={`bg-white rounded-xl border-2 transition-all hover:shadow-2xl ${
                    selected ? 'border-blue-500 shadow-lg' : 'border-gray-200'
                  }`}
                >
                  {/* Card Header with Profile Picture */}
                  <div className="relative bg-gradient-to-br from-blue-500 to-purple-600 h-32 rounded-t-xl">
                    <div className="absolute -bottom-16 left-6">
                      <div className="relative">
                        <div className="w-32 h-32 bg-white rounded-full p-2 shadow-xl">
                          {c.profile_photo_url ? (
                            <img
                              src={c.profile_photo_url}
                              alt={c.name}
                              className="w-full h-full rounded-full object-cover"
                              onError={(e) => {
                                // Fallback to initials if photo fails to load
                                e.currentTarget.style.display = 'none';
                                const parent = e.currentTarget.parentElement;
                                if (parent) {
                                  parent.innerHTML = `<div class="w-full h-full bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center text-4xl font-bold text-blue-600">${getInitials(c.name)}</div>`;
                                }
                              }}
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center text-4xl font-bold text-blue-600">
                              {getInitials(c.name)}
                            </div>
                          )}
                        </div>
                        <button className="absolute bottom-0 right-0 w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white hover:bg-blue-700 transition-colors shadow-lg"
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePhotoUpload(c.id);
                          }}
                          disabled={uploadingPhoto === c.id}
                        >
                          {uploadingPhoto === c.id ? (
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Camera className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                    </div>
                    <div className="absolute top-4 right-4">
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleSelected(c.id)}
                        className="w-6 h-6 text-blue-600 rounded cursor-pointer bg-white border-2 border-white shadow-lg"
                      />
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="pt-20 p-6">
                    {/* Name and Title */}
                    <div className="mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-2xl font-semibold text-gray-900">{c.name}</h3>
                        {c.needs_review && (
                          <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            Review
                          </span>
                        )}
                        {c.auto_extracted && !c.needs_review && (
                          <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium flex items-center gap-1">
                            <Sparkles className="w-3 h-3" />
                            Auto
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-gray-600 mb-1">
                        <Briefcase className="w-5 h-5" />
                        <span className="text-lg">{c.position || '—'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-500">
                        <span className="text-sm">{c.nationality || '—'}</span>
                        <span className="text-gray-400">→</span>
                        <MapPin className="w-4 h-4" />
                        <span className="text-sm font-medium text-blue-600">{c.country_of_interest || '—'}</span>
                      </div>
                    </div>

                    {/* Status and Score Row */}
                    <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-200">
                      <span className={`px-4 py-2 rounded-lg text-sm font-medium flex-shrink-0 ${
                        statusLabel === 'Applied' ? 'bg-blue-100 text-blue-700' :
                        statusLabel === 'Pending' ? 'bg-yellow-100 text-yellow-700' :
                        statusLabel === 'Deployed' ? 'bg-green-100 text-green-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {statusLabel}
                      </span>
                      {score != null && (
                        <div className="flex items-center gap-2 bg-yellow-50 px-4 py-2 rounded-lg">
                          <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                          <span className="text-lg font-bold text-gray-900">{score.toFixed(1)}</span>
                          <span className="text-xs text-gray-500">/10</span>
                        </div>
                      )}
                      {c.experience_years != null && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Briefcase className="w-4 h-4" />
                          <span className="font-medium">{c.experience_years}y exp</span>
                        </div>
                      )}
                    </div>

                    {/* Contact Information */}
                    <div className="space-y-3 mb-4 pb-4 border-b border-gray-200">
                      {c.phone && (
                        <div className="flex items-center gap-3 text-sm">
                          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Phone className="w-4 h-4 text-blue-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs text-gray-500">Phone</div>
                            <div className="text-gray-900 font-medium truncate">{c.phone}</div>
                          </div>
                        </div>
                      )}
                      {c.email && (
                        <div className="flex items-center gap-3 text-sm">
                          <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Mail className="w-4 h-4 text-green-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs text-gray-500">Email</div>
                            <div className="text-gray-900 font-medium truncate">{c.email}</div>
                          </div>
                        </div>
                      )}
                      {c.created_at && (
                        <div className="flex items-center gap-3 text-sm">
                          <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Calendar className="w-4 h-4 text-purple-600" />
                          </div>
                          <div className="flex-1">
                            <div className="text-xs text-gray-500">Applied Date</div>
                            <div className="text-gray-900 font-medium">{new Date(c.created_at).toLocaleDateString()}</div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Skills */}
                    {skills.length > 0 && (
                      <div className="mb-4 pb-4 border-b border-gray-200">
                        <div className="flex items-center gap-2 mb-2">
                          <Award className="w-4 h-4 text-gray-600" />
                          <span className="text-sm font-semibold text-gray-700">Top Skills</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {skills.slice(0, 4).map((skill, index) => (
                            <span
                              key={index}
                              className="px-3 py-1.5 bg-gradient-to-r from-blue-50 to-purple-50 text-blue-700 rounded-lg text-xs font-medium border border-blue-200"
                            >
                              {skill}
                            </span>
                          ))}
                          {skills.length > 4 && (
                            <span className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs font-medium">
                              +{skills.length - 4} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Documents - Smart Display */}
                    <div className="mb-4 pb-4 border-b border-gray-200">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-gray-600" />
                          <span className="text-sm font-semibold text-gray-700">Document List</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            docCount === 0 ? 'bg-red-100 text-red-700' :
                            allDocsOk ? 'bg-green-100 text-green-700' :
                            'bg-yellow-100 text-yellow-700'
                          }`}>
                            {docCount} files
                          </span>
                        </div>
                        <button
                          onClick={() => handleViewAllDocuments(c)}
                          className="text-xs text-blue-600 hover:text-blue-700"
                        >
                          View All →
                        </button>
                      </div>

                      {docCount > 0 ? (
                        <>
                          <div className="grid grid-cols-5 gap-2">
                        {/* CV */}
                        <div 
                          onClick={() => handleDocumentClick(c.id, 'cv', cvOk)}
                          className={`relative group cursor-pointer ${
                            cvOk ? 'bg-green-50 border-green-300 text-green-800' : 'bg-red-50 border-red-300 text-red-800'
                          } border-2 rounded-lg p-2 flex flex-col items-center justify-center transition-all hover:shadow-md hover:scale-105`}
                        >
                          <FileText className={`w-5 h-5 mb-1 ${
                            cvOk ? 'text-green-600' : 'text-red-600'
                          }`} />
                          <span className="text-xs font-semibold">CV</span>
                          {cvOk ? (
                            <CheckCircle className="w-5 h-5 text-green-600 absolute top-1 right-1" strokeWidth={2.5} />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-600 absolute top-1 right-1" strokeWidth={2.5} />
                          )}
                        </div>

                        {/* Passport */}
                        <div 
                          onClick={() => handleDocumentClick(c.id, 'passport', passportOk)}
                          className={`relative group cursor-pointer ${
                            passportOk ? 'bg-green-50 border-green-300 text-green-800' : 'bg-red-50 border-red-300 text-red-800'
                          } border-2 rounded-lg p-2 flex flex-col items-center justify-center transition-all hover:shadow-md hover:scale-105`}
                        >
                          <File className={`w-5 h-5 mb-1 ${
                            passportOk ? 'text-purple-600' : 'text-red-600'
                          }`} />
                          <span className="text-xs font-semibold">Passport</span>
                          {passportOk ? (
                            <CheckCircle className="w-5 h-5 text-green-600 absolute top-1 right-1" strokeWidth={2.5} />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-600 absolute top-1 right-1" strokeWidth={2.5} />
                          )}
                        </div>

                        {/* Certificate */}
                        <div 
                          onClick={() => handleDocumentClick(c.id, 'certificate', certificateOk)}
                          className={`relative group cursor-pointer ${
                            certificateOk ? 'bg-green-50 border-green-300 text-green-800' : 'bg-red-50 border-red-300 text-red-800'
                          } border-2 rounded-lg p-2 flex flex-col items-center justify-center transition-all hover:shadow-md hover:scale-105`}
                        >
                          <Award className={`w-5 h-5 mb-1 ${
                            certificateOk ? 'text-blue-600' : 'text-red-600'
                          }`} />
                          <span className="text-xs font-semibold">Cert</span>
                          {certificateOk ? (
                            <CheckCircle className="w-5 h-5 text-green-600 absolute top-1 right-1" strokeWidth={2.5} />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-600 absolute top-1 right-1" strokeWidth={2.5} />
                          )}
                        </div>

                        {/* Photo */}
                        <div 
                          onClick={() => handleDocumentClick(c.id, 'photo', photoOk)}
                          className={`relative group cursor-pointer ${
                            photoOk ? 'bg-green-50 border-green-300 text-green-800' : 'bg-red-50 border-red-300 text-red-800'
                          } border-2 rounded-lg p-2 flex flex-col items-center justify-center transition-all hover:shadow-md hover:scale-105`}
                        >
                          <Image className={`w-5 h-5 mb-1 ${
                            photoOk ? 'text-pink-600' : 'text-red-600'
                          }`} />
                          <span className="text-xs font-semibold">Photo</span>
                          {photoOk ? (
                            <CheckCircle className="w-5 h-5 text-green-600 absolute top-1 right-1" strokeWidth={2.5} />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-600 absolute top-1 right-1" strokeWidth={2.5} />
                          )}
                        </div>

                        {/* Medical */}
                        <div 
                          onClick={() => handleDocumentClick(c.id, 'medical', medicalOk)}
                          className={`relative group cursor-pointer ${
                            medicalOk ? 'bg-green-50 border-green-300 text-green-800' : 'bg-red-50 border-red-300 text-red-800'
                          } border-2 rounded-lg p-2 flex flex-col items-center justify-center transition-all hover:shadow-md hover:scale-105`}
                        >
                          <File className={`w-5 h-5 mb-1 ${
                            medicalOk ? 'text-green-600' : 'text-red-600'
                          }`} />
                          <span className="text-xs font-semibold">Medical</span>
                          {medicalOk ? (
                            <CheckCircle className="w-5 h-5 text-green-600 absolute top-1 right-1" strokeWidth={2.5} />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-600 absolute top-1 right-1" strokeWidth={2.5} />
                          )}
                        </div>
                          </div>

                          {/* Document Status Message */}
                          {!allDocsOk && (
                            <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-700 flex items-center gap-2">
                              <AlertTriangle className="w-3 h-3" />
                              Some documents are missing
                            </div>
                          )}
                          {allDocsOk && (
                            <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded text-xs text-green-700 flex items-center gap-2">
                              <CheckCircle className="w-3 h-3" />
                              All documents are valid
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700 flex items-center gap-2">
                          <AlertCircle className="w-4 h-4" />
                          No documents uploaded yet
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-3">
                        <button 
                          onClick={() => handleViewProfile(c)}
                          className="px-5 py-3.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all flex items-center justify-center gap-2 font-medium shadow-lg hover:shadow-xl"
                        >
                          <Eye className="w-5 h-5" />
                          View Profile
                        </button>
                        <button 
                          onClick={() => handleDownloadCV(c)}
                          className="px-5 py-3.5 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl hover:from-purple-700 hover:to-purple-800 transition-all flex items-center justify-center gap-2 font-medium shadow-lg hover:shadow-xl"
                        >
                          <Download className="w-5 h-5" />
                          Download CV
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <p className="text-gray-600 text-center">Table view coming soon...</p>
        </div>
      )}

      {/* Candidate Details Modal */}
      {showDetailsModal && selectedCandidate && (
        <CandidateDetailsModal 
          candidate={selectedCandidate} 
          initialTab={detailsInitialTab}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedCandidate(null);
          }}
          onDocumentChange={() => {
            // Refresh candidate list to update document flags on cards
            fetchCandidates();
          }}
        />
      )}
    </div>
  );
}
