// Updated: Using NEW server-side CV generation system
import { useEffect, useMemo, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertTriangle,
  AlertCircle,
  Award,
  BookOpen,
  Briefcase,
  Calendar,
  Camera,
  Car,
  CheckCircle,
  Download,
  Eye,
  File,
  FileText,
  Grid3x3,
  Image,
  List,
  Trash2,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Plus,
  Search,
  Send,
  Share2,
  Shield,
  Sparkles,
  Star,
  Upload,
  X,
  XCircle,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { apiClient, Candidate, CandidateDashboardStats } from '../lib/apiClient';
import { formatCandidatePaymentAmount, normalizeCandidatePaymentAmount } from '../lib/candidatePayment';
import { CANDIDATE_STATUS_VALUES, type CandidateStatus, getCandidateStatusClasses, normalizeCandidateStatus } from '../lib/candidateStatus';
import { useCandidates } from '../lib/candidateContext';
import { useDebounce } from '../hooks/useDebounce';
import { CandidateDetailsModal } from './CandidateDetailsModal';
import { renderPdfFirstPageToDataUrl } from '../lib/pdfThumb';
import { analyzeDocumentHealth, getHealthBadgeInfo, analyzeDocumentError } from '../lib/documentErrorUtils';

interface CandidateManagementProps {
  initialProfessionFilter?: string;
  /** When set, only shows candidates belonging to this partner (admin Partners tab) */
  partnerIdFilter?: string;
  candidateIdToOpen?: string | null;
  candidateInitialTabToOpen?: 'details' | 'documents' | 'missing-data' | null;
  onCandidateOpened?: () => void;
}

interface FilterState {
  search: string;
  position: string;
  country: string;
  status: string;
}

const PAGE_SIZE_OPTIONS = [20, 50, 100, 200];

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

function parsePartnerSource(candidate: { source?: string | null; partner_id?: string | null; partner_name?: string | null; is_partner_candidate?: boolean }) {
  if (candidate.partner_id || candidate.partner_name || candidate.is_partner_candidate) {
    return {
      partnerUserId: candidate.partner_id || null,
      partnerName: candidate.partner_name || null,
      partnerCompany: null,
      label: candidate.partner_name || 'Partner',
    };
  }

  const raw = String(candidate.source || '');
  if (!raw.startsWith('Partner|')) {
    return null;
  }

  const [, partnerUserId, partnerName, partnerCompany] = raw.split('|');
  return {
    partnerUserId: partnerUserId || null,
    partnerName: partnerName || null,
    partnerCompany: partnerCompany || null,
    label: partnerName || partnerCompany || 'Partner',
  };
}

// Premium Shimmer Skeleton Component
function DocumentSkeletonCard({ delay = 0 }: { delay?: number }) {
  return (
    <div
      className="relative overflow-hidden bg-gradient-to-r from-gray-100 via-gray-50 to-gray-100 border-2 border-gray-200 rounded-lg p-2 flex flex-col items-center justify-center h-16"
      style={{
        animationDelay: `${delay}ms`,
      }}
    >
      {/* Shimmer effect overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent transform -skew-x-12 animate-shimmer" />
      
      {/* Icon placeholder */}
      <div className="w-5 h-5 bg-gray-300 rounded mb-1 relative z-10 animate-pulse" />
      
      {/* Text placeholder */}
      <div className="w-12 h-3 bg-gray-300 rounded relative z-10 animate-pulse" />
      
      {/* Badge placeholder */}
      <div className="absolute top-1 right-1 w-4 h-4 bg-gray-300 rounded-full relative z-10 animate-pulse" />
    </div>
  );
}

// Progress Dots Component
function ProgressDots() {
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms', animationDuration: '1.4s' }} />
      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '200ms', animationDuration: '1.4s' }} />
      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '400ms', animationDuration: '1.4s' }} />
    </div>
  );
}

export function CandidateManagement({ initialProfessionFilter = 'all', partnerIdFilter, candidateIdToOpen, candidateInitialTabToOpen, onCandidateOpened }: CandidateManagementProps) {
  // Use shared candidate context
  const { 
    candidates, 
    loading, 
    error, 
    total,
    fetchCandidates: fetchCandidatesFromContext,
    refreshCandidates 
  } = useCandidates();
  
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<CandidateStatus>('Pending');
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [statusUpdatingIds, setStatusUpdatingIds] = useState<Record<string, boolean>>({});
  const [slowLoadWarning, setSlowLoadWarning] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    position: initialProfessionFilter || 'all',
    country: 'all',
    status: 'all',
  });
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput.trim(), 400);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [positions, setPositions] = useState<string[]>([]);
  const [countries, setCountries] = useState<string[]>([]);
  const [statuses, setStatuses] = useState<string[]>([]);
  const [dashboardStats, setDashboardStats] = useState<CandidateDashboardStats>({
    totalCandidates: 0,
    totalProfessions: 0,
    pendingReview: 0,
    deployed: 0,
    newThisWeek: 0,
  });
  // Cache of signed photo URLs fetched on-demand (id -> url)
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  // Cache of rendered PDF thumbnails (id -> dataUrl)
  const [pdfThumbs, setPdfThumbs] = useState<Record<string, string>>({});
  
  // Modal states
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [detailsInitialTab, setDetailsInitialTab] = useState<'details' | 'documents' | 'missing-data'>('details');
  const [deletingCandidateId, setDeletingCandidateId] = useState<string | null>(null);
  
  // Sync profession filter when parent changes the prop (sidebar click)
  useEffect(() => {
    const next = initialProfessionFilter || 'all';
    setFilters(f => f.position === next ? f : { ...f, position: next });
    setCurrentPage(1);
  }, [initialProfessionFilter]);

  // Reset page when partner filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [partnerIdFilter]);

  // Track if we've already processed this candidateIdToOpen to prevent reopening
  const processedCandidateIdRef = useRef<string | null>(null);
  
  // Auto-open candidate when candidateIdToOpen is provided
  useEffect(() => {
    // Only proceed if we have a candidateIdToOpen, not already showing a modal, and haven't processed this ID yet
    if (!candidateIdToOpen || showDetailsModal || processedCandidateIdRef.current === candidateIdToOpen) {
      return;
    }

    // Try to find candidate in current list first (match by id, not candidate_code)
    const candidate = candidates.find(c => c.id === candidateIdToOpen);
    
    if (candidate) {
      // Found in current list - open immediately
      processedCandidateIdRef.current = candidateIdToOpen; // Mark as processed
      setSelectedCandidate(candidate);
      setDetailsInitialTab(candidateInitialTabToOpen || 'details');
      setShowDetailsModal(true);
      // Notify parent that candidate has been opened (this clears candidateIdToOpen)
      if (onCandidateOpened) {
        onCandidateOpened();
      }
    } else if (!loading) {
      // Not found in current list - fetch it directly by ID
      processedCandidateIdRef.current = candidateIdToOpen; // Mark as processed to prevent duplicate fetches
      apiClient.getCandidate(candidateIdToOpen)
        .then((fetchedCandidate) => {
          setSelectedCandidate(fetchedCandidate);
          setDetailsInitialTab(candidateInitialTabToOpen || 'details');
          setShowDetailsModal(true);
          if (onCandidateOpened) {
            onCandidateOpened();
          }
        })
        .catch((err) => {
          console.error('Failed to load candidate:', err);
          processedCandidateIdRef.current = null; // Reset on error so it can retry
          if (onCandidateOpened) {
            onCandidateOpened();
          }
        });
    }
  }, [candidateIdToOpen, candidateInitialTabToOpen, candidates, loading, showDetailsModal, onCandidateOpened]);
  
  // Reset processed ref when candidateIdToOpen changes to a new value
  useEffect(() => {
    if (candidateIdToOpen && processedCandidateIdRef.current !== candidateIdToOpen) {
      // New candidate ID - reset the ref
      processedCandidateIdRef.current = null;
    }
  }, [candidateIdToOpen]);
  const [uploadingPhoto, setUploadingPhoto] = useState<string | null>(null);
  const [brokenPhotoIds, setBrokenPhotoIds] = useState<Record<string, boolean>>({});
  const [documentAction, setDocumentAction] = useState<{ candidateId: string; docType: string } | null>(null);
  const [paymentUpdatingIds, setPaymentUpdatingIds] = useState<Record<string, boolean>>({});
  const [paymentDrafts, setPaymentDrafts] = useState<Record<string, string>>({});
  
  // Document processing states
  const [processingDocuments, setProcessingDocuments] = useState<Map<string, {
    isProcessing: boolean;
    documentCount: number;
    startTime: number;
    lastUpdate: number;
  }>>(new Map());

  // Document open/download state (cache to avoid N+1 fetches)
  const [candidateDocCache, setCandidateDocCache] = useState<Record<string, Array<any>>>({});
  const [docOpeningIds, setDocOpeningIds] = useState<Record<string, boolean>>({});

  // Document type config — shared by card and table views
  const DOC_TYPES_CONFIG = [
    { key: 'cv',                          flag: 'cv_received',                category: 'cv_resume',                     label: 'CV',       Icon: FileText, iconColorOk: 'text-blue-600',   color: 'text-blue-500',   bg: 'hover:bg-blue-100'   },
    { key: 'passport',                    flag: 'passport_received',          category: 'passport',                      label: 'Passport', Icon: BookOpen, iconColorOk: 'text-purple-600',  color: 'text-green-600',  bg: 'hover:bg-green-100'  },
    { key: 'cnic',                        flag: 'cnic_received',              category: 'cnic',                          label: 'CNIC',     Icon: Shield,   iconColorOk: 'text-indigo-600',  color: 'text-purple-500', bg: 'hover:bg-purple-100' },
    { key: 'driving_license',             flag: 'driving_license_received',   category: 'driving_license',               label: 'License',  Icon: Car,      iconColorOk: 'text-cyan-600',    color: 'text-orange-500', bg: 'hover:bg-orange-100' },
    { key: 'police_character_certificate',flag: 'police_character_received',  category: 'police_character_certificate',  label: 'PCC',      Icon: Shield,   iconColorOk: 'text-teal-600',    color: 'text-teal-500',   bg: 'hover:bg-teal-100'   },
    { key: 'certificate',                 flag: 'certificate_received',       category: 'certificates',                  label: 'Cert',     Icon: Award,    iconColorOk: 'text-amber-600',   color: 'text-yellow-600', bg: 'hover:bg-yellow-100' },
    { key: 'photo',                       flag: 'photo_received',             category: 'photos',                        label: 'Photo',    Icon: Camera,   iconColorOk: 'text-pink-600',    color: 'text-pink-500',   bg: 'hover:bg-pink-100'   },
    { key: 'medical',                     flag: 'medical_received',           category: 'medical_reports',               label: 'Medical',  Icon: File,     iconColorOk: 'text-green-600',   color: 'text-red-500',    bg: 'hover:bg-red-100'    },
  ] as const;

  async function openCandidateDocument(candidateId: string, category: string, label: string) {
    try {
      let docs = candidateDocCache[candidateId];
      if (!docs) {
        setDocOpeningIds(prev => ({ ...prev, [candidateId]: true }));
        docs = await apiClient.listCandidateDocumentsNew(candidateId);
        setCandidateDocCache(prev => ({ ...prev, [candidateId]: docs }));
        setDocOpeningIds(prev => { const n = { ...prev }; delete n[candidateId]; return n; });
      }
      const doc = docs.find((d: any) => d.category === category || d.doc_type === category || d.document_type === category);
      if (!doc) {
        toast.error(`No ${label} document found`);
        return;
      }
      toast.info(`Opening ${label}…`);
      const url = await apiClient.getCandidateDocumentDownloadUrl(doc.id);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err: any) {
      setDocOpeningIds(prev => { const n = { ...prev }; delete n[candidateId]; return n; });
      toast.error(err?.message || `Failed to open ${label}`);
    }
  }

  function resolveCandidatePhotoUrl(candidate: Candidate) {
    const signedUrl = (candidate.profile_photo_signed_url || photoUrls[candidate.id] || '').toString().trim();
    if (signedUrl) {
      return signedUrl;
    }

    const rawUrl = (candidate.profile_photo_url || '').toString().trim();
    const hasStorageMetadata = !!(candidate.profile_photo_bucket || candidate.profile_photo_path);

    if (hasStorageMetadata) {
      return '';
    }

    return rawUrl;
  }

  // Fetch signed photo URLs for candidates missing them in list response
  useEffect(() => {
    const fetchMissingPhotoUrls = async () => {
      // Backend list endpoint no longer signs URLs (for performance), so we fetch per-candidate
      const toFetch = candidates.filter(c => 
        (c.photo_received || c.profile_photo_url) && !c.profile_photo_signed_url && !photoUrls[c.id]
      );
      if (!toFetch.length) return;
      
      // Batch fetch in chunks to avoid overwhelming the backend
      const chunkSize = 10;
      for (let i = 0; i < toFetch.length; i += chunkSize) {
        const chunk = toFetch.slice(i, i + chunkSize);
        try {
          const entries = await Promise.all(
            chunk.map(async (c) => {
              try {
                const full = await apiClient.getCandidate(c.id);
                const url = (full as any).profile_photo_signed_url || full.profile_photo_url || '';
                return [c.id, url] as const;
              } catch {
                return [c.id, ''] as const;
              }
            })
          );
          setPhotoUrls((prev) => {
            const next: Record<string, string> = { ...prev };
            for (const [id, url] of entries) {
              if (url) next[id] = url;
            }
            return next;
          });
        } catch (e) {
          console.warn('Failed to fetch chunk of photo URLs', e);
        }
        // Small delay between chunks to avoid rate limits
        if (i + chunkSize < toFetch.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    };
    fetchMissingPhotoUrls();
  }, [candidates, photoUrls]);

  // Render PDF thumbnails for photo URLs that are PDFs
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const targets = filteredCandidates
        .map((c) => {
          const url = (c.profile_photo_signed_url || photoUrls[c.id] || c.profile_photo_url || '').toString();
          return { id: c.id, url };
        })
        .filter(({ id, url }) => url && url.toLowerCase().includes('.pdf') && !pdfThumbs[id]);

      if (!targets.length) return;

      // Render a few at a time to avoid locking the UI
      const slice = targets.slice(0, 2);

      const rendered = await Promise.all(
        slice.map(async ({ id, url }) => {
          try {
            // Scan more pages because the photo is not always on page 1
            const dataUrl = await renderPdfFirstPageToDataUrl(url, { maxPagesToScan: 10 });
            return [id, dataUrl] as const;
          } catch (e) {
            console.warn('[PDF Thumb] Failed to render thumbnail', { id, url, error: e });
            return [id, ''] as const;
          }
        })
      );

      if (cancelled) return;

      setPdfThumbs((prev) => {
        const next = { ...prev };
        for (const [id, dataUrl] of rendered) {
          if (dataUrl) next[id] = dataUrl;
        }
        return next;
      });
    };

    run();
    return () => {
      cancelled = true;
    };
    }, [candidates, photoUrls, pdfThumbs]);
  
  // Fetch candidates using context
  const fetchCandidates = async () => {
    await fetchCandidatesFromContext({
      search: debouncedSearch,
      position: filters.position === 'all' ? undefined : filters.position,
      country_of_interest: filters.country === 'all' ? undefined : filters.country,
      status: filters.status === 'all' ? undefined : filters.status,
      partner_id: partnerIdFilter || undefined,
      limit: pageSize,
      offset: (currentPage - 1) * pageSize,
    });
  };

  // Backend-driven processing: show "Processing" only when the backend has documents
  // with verification_status === 'pending_ai' (CV from inbox, split-and-categorize, etc).
  // No loading on click — no flicker.
  const POLL_INTERVAL_MS = 15000;
  const DASHBOARD_STATS_INTERVAL_MS = 60000;
  const candidateIds = useMemo(() => candidates.map((c) => c.id), [candidates]);
  useEffect(() => {
    if (candidateIds.length === 0) return;

    const syncProcessingFromBackend = async () => {
      // Avoid background polling when tab is hidden
      if (typeof document !== 'undefined' && document.hidden) return;

      try {
        const result = await apiClient.getCandidatesProcessingStatus(candidateIds);
        const statuses = result?.statuses || {};
        const now = Date.now();

        setProcessingDocuments((prev) => {
          const next = new Map(prev);

          for (const id of candidateIds) {
            const status = statuses[id];
            const shouldShow = !!status?.isProcessing;
            const existing = next.get(id);

            if (shouldShow) {
              next.set(id, {
                isProcessing: true,
                documentCount: status.pendingCount || existing?.documentCount || 0,
                startTime: existing?.startTime || now,
                lastUpdate: now,
              });
            } else {
              next.delete(id);
            }
          }

          return next;
        });
      } catch {
        // On error: keep previous state to avoid flicker
      }
    };

    const t = setTimeout(syncProcessingFromBackend, 600);
    const interval = setInterval(syncProcessingFromBackend, POLL_INTERVAL_MS);

    const onVisibility = () => {
      if (typeof document !== 'undefined' && !document.hidden) {
        syncProcessingFromBackend();
      }
    };
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onVisibility);
    }

    return () => {
      clearTimeout(t);
      clearInterval(interval);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', onVisibility);
      }
    };
  }, [candidateIds]);

  // Fetch candidates on mount and when filters change
  useEffect(() => {
    fetchCandidates();
    
    // Add a slow-load warning if loading takes more than 15 seconds
    const warningTimer = setTimeout(() => {
      if (loading) {
        setSlowLoadWarning(true);
      }
    }, 15000);
    
    return () => {
      clearTimeout(warningTimer);
      if (!loading) setSlowLoadWarning(false); // Clear warning when loading finishes
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, filters.position, filters.country, filters.status, currentPage, pageSize]);
  
  // Clear slow-load warning when loading finishes
  useEffect(() => {
    if (!loading) {
      setSlowLoadWarning(false);
    }
  }, [loading]);

  useEffect(() => {
    let cancelled = false;

    const loadBrowseMetadata = async () => {
      try {
        const metadata = await apiClient.getCandidateBrowseMetadata();
        if (cancelled) return;
        setPositions(metadata.professions.map((profession) => profession.name));
        setCountries(metadata.countries.map((country) => country.name));
        setStatuses(
          metadata.statuses
            .map((status) => normalizeCandidateStatus(status.name))
            .filter((status, index, values) => values.indexOf(status) === index)
        );
      } catch (err) {
        if (!cancelled) {
          console.warn('Failed to load candidate browse metadata', err);
        }
      }
    };

    void loadBrowseMetadata();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadDashboardStats = async () => {
      try {
        const stats = await apiClient.getCandidateDashboardStats();
        if (!cancelled) {
          setDashboardStats(stats);
        }
      } catch (err) {
        if (!cancelled) {
          console.warn('Failed to load candidate dashboard stats', err);
        }
      }
    };

    void loadDashboardStats();
    const interval = window.setInterval(() => {
      if (!document.hidden) {
        void loadDashboardStats();
      }
    }, DASHBOARD_STATS_INTERVAL_MS);

    const onVisibilityChange = () => {
      if (!document.hidden) {
        void loadDashboardStats();
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  const filteredCandidates = useMemo(() => candidates, [candidates]);

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

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);
  const pageStart = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const pageEnd = total === 0 ? 0 : Math.min(total, currentPage * pageSize);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

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

  function scrollToTop() {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
  }

  async function applyBulkStatusUpdate() {
    if (selectedIds.size === 0) return;
    try {
      setBulkUpdating(true);
      const ids = Array.from(selectedIds);
      const result = await apiClient.bulkUpdateCandidateStatus(ids, bulkStatus);
      // Refresh candidates from context to get updated data
      await refreshCandidates();
      clearSelection();
    } catch (e: any) {
      alert(e?.message || 'Failed to bulk update status');
    } finally {
      setBulkUpdating(false);
    }
  }

  async function handleCandidateStatusChange(candidate: Candidate, nextStatus: CandidateStatus) {
    const currentStatus = normalizeCandidateStatus(candidate.status);
    if (currentStatus === nextStatus) {
      return;
    }

    try {
      setStatusUpdatingIds((prev) => ({ ...prev, [candidate.id]: true }));
      const updatedCandidate = await apiClient.updateCandidate(candidate.id, { status: nextStatus });
      await refreshCandidates();
      setSelectedCandidate((prev) => (prev?.id === candidate.id ? { ...prev, status: updatedCandidate.status } : prev));
      toast.success(`Candidate status updated to ${nextStatus}`);
    } catch (error: any) {
      toast.error(error?.message || 'Failed to update candidate status');
    } finally {
      setStatusUpdatingIds((prev) => {
        const next = { ...prev };
        delete next[candidate.id];
        return next;
      });
    }
  }

  function getPaymentDraft(candidate: Candidate) {
    return paymentDrafts[candidate.id] ?? String(normalizeCandidatePaymentAmount(candidate.payment_amount, 0));
  }

  function handlePaymentDraftChange(candidateId: string, value: string) {
    if (!/^\d*$/.test(value)) {
      return;
    }

    setPaymentDrafts((prev) => ({ ...prev, [candidateId]: value }));
  }

  async function handleCandidatePaymentSave(candidate: Candidate) {
    const draftValue = paymentDrafts[candidate.id];
    const nextAmount = normalizeCandidatePaymentAmount(draftValue ?? candidate.payment_amount, 0);
    const currentAmount = normalizeCandidatePaymentAmount(candidate.payment_amount, 0);

    if (nextAmount === currentAmount) {
      setPaymentDrafts((prev) => {
        if (!(candidate.id in prev)) {
          return prev;
        }
        const next = { ...prev };
        delete next[candidate.id];
        return next;
      });
      return;
    }

    try {
      setPaymentUpdatingIds((prev) => ({ ...prev, [candidate.id]: true }));
      const updatedCandidate = await apiClient.updateCandidate(candidate.id, { payment_amount: nextAmount });
      await refreshCandidates();
      setSelectedCandidate((prev) => (
        prev?.id === candidate.id
          ? { ...prev, payment_amount: normalizeCandidatePaymentAmount(updatedCandidate.payment_amount, nextAmount) }
          : prev
      ));
      setPaymentDrafts((prev) => {
        const next = { ...prev };
        delete next[candidate.id];
        return next;
      });
      toast.success(`Payment updated to ${formatCandidatePaymentAmount(updatedCandidate.payment_amount ?? nextAmount)}`);
    } catch (error: any) {
      toast.error(error?.message || 'Failed to update payment');
    } finally {
      setPaymentUpdatingIds((prev) => {
        const next = { ...prev };
        delete next[candidate.id];
        return next;
      });
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

  async function handleDeleteCandidate(candidate: Candidate) {
    const label = candidate.name || candidate.email || candidate.candidate_code || 'this candidate';
    const confirmed = window.confirm(
      `Delete ${label}?\n\nThis is mainly useful for removing test users and other unwanted records.`
    );

    if (!confirmed) return;

    try {
      setDeletingCandidateId(candidate.id);
      await apiClient.deleteCandidate(candidate.id);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(candidate.id);
        return next;
      });
      toast.success('Candidate deleted successfully');
      await refreshCandidates();
    } catch (error: any) {
      console.error('Failed to delete candidate:', error);
      toast.error('Failed to delete candidate', {
        description: error?.message || 'Unknown error',
      });
    } finally {
      setDeletingCandidateId(null);
    }
  }

  async function handleDownloadCV(candidate: Candidate) {
    try {
      // ✅ NEW SYSTEM: Server-side Puppeteer PDF generation (employer-safe format)
      // Replaces old getCandidateCVDownload that downloaded original uploaded CV
      const result = await apiClient.generateCandidateCV(candidate.id, 'employer-safe', true);
      
      if (result.cached) {
        console.log('Using cached CV');
      } else {
        console.log('Generated new CV');
      }
      
      // Download PDF from signed URL
      const response = await fetch(result.cv_url);
      if (!response.ok) {
        throw new Error(`Failed to download CV: ${response.statusText}`);
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${candidate.name || 'Candidate'}_Employer_Safe_CV.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      alert('Employer-Safe CV downloaded successfully!');
    } catch (error: any) {
      console.error('Failed to download CV:', error);
      if (error?.message?.includes('404') || error?.message?.includes('not found')) {
        alert('CV generation failed. Please ensure candidate information is complete.');
      } else if (error?.message?.includes('timeout') || error?.message?.includes('time')) {
        alert('CV generation timed out. Please try again.');
      } else {
        alert(error?.message || 'Failed to download CV. Please try again.');
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
        
        // Refresh candidates from context
        await refreshCandidates();
        
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

  async function handleDocumentClick(candidateId: string, docType: string, hasDocument: boolean) {
    if (hasDocument) {
      // View/download document
      if (docType === 'cv') {
        // Use the CV download handler which checks both candidate_documents and inbox_attachments
        handleDownloadCV(candidates.find(c => c.id === candidateId)!);
      } else {
        viewDocument(candidateId, docType);
      }
    } else {
      // For CV, try to link existing CV from inbox first
      if (docType === 'cv') {
        try {
          await apiClient.linkCandidateCV(candidateId);
          // Refresh candidates from context
          await refreshCandidates();
          // One-off sync: if backend is now processing this candidate's docs, show Processing on card
          try {
            const documents = (await apiClient.listCandidateDocumentsNew(candidateId)) as any[];
            const hasPending = documents.some(
              (d: any) =>
                d.verification_status === 'pending_ai' ||
                d.verification_status === 'pending' ||
                (typeof d.status === 'string' && (d.status === 'queued' || d.status === 'processing'))
            );
            if (hasPending) {
              setProcessingDocuments((prev) => {
                const next = new Map(prev);
                next.set(candidateId, {
                  isProcessing: true,
                  documentCount: documents.length,
                  startTime: Date.now(),
                  lastUpdate: Date.now(),
                });
                return next;
              });
            }
          } catch {
            /* ignore */
          }
          toast.success('CV linked from inbox. Processing in background.', { duration: 3000 });
        } catch (error: any) {
          // If no CV in inbox, offer to upload
          if (error?.message?.includes('404') || error?.message?.includes('not found')) {
            if (confirm('No CV found in inbox. Would you like to upload a new CV?')) {
              uploadDocument(candidateId, docType);
            }
          } else {
            alert(error?.message || 'Failed to link CV. Would you like to upload a new one?');
            if (confirm('Upload a new CV?')) {
              uploadDocument(candidateId, docType);
            }
          }
        }
      } else {
        // Upload document for other types
        uploadDocument(candidateId, docType);
      }
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
        await new Promise((r) => setTimeout(r, 1500));
        await refreshCandidates();
        // One-off sync: if backend now has pending_ai docs for this candidate, show Processing
        try {
          const documents = (await apiClient.listCandidateDocumentsNew(candidateId)) as any[];
          const hasPending = documents.some(
            (d) =>
              d.verification_status === 'pending_ai' ||
              d.verification_status === 'pending' ||
              (typeof d.status === 'string' && (d.status === 'queued' || d.status === 'processing'))
          );
          if (hasPending) {
            setProcessingDocuments((prev) => {
              const next = new Map(prev);
              next.set(candidateId, {
                isProcessing: true,
                documentCount: documents.length,
                startTime: Date.now(),
                lastUpdate: Date.now(),
              });
              return next;
            });
          }
        } catch {
          /* ignore */
        }
        toast.success(`${docType} uploaded. Processing in background.`, { duration: 3000 });
      } catch (error: any) {
        toast.error(`Failed to upload ${docType}`, {
          description: error?.message || 'Unknown error',
          duration: 4000,
        });
      }
    };
    input.click();
  }

  const showBlockingLoader = loading && candidates.length === 0 && !error;

  if (showBlockingLoader) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading candidates...</p>
          {slowLoadWarning && (
            <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4 max-w-md">
              <p className="text-yellow-800 text-sm">
                <strong>Still loading?</strong> The backend might be slow. Try refreshing the page or come back in a few moments.
              </p>
              <button
                onClick={() => window.location.reload()}
                className="mt-3 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors text-sm"
              >
                Refresh Now
              </button>
            </div>
          )}
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Candidates</h1>
            <p className="text-gray-600 mt-1">Manage your candidate pipeline</p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="flex gap-3 overflow-x-auto pb-2 mb-6">
          <div className="min-w-[200px] flex-1 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-5 text-white shadow-lg">
            <div className="text-sm opacity-90">Total Candidates</div>
            <div className="text-3xl font-bold mt-2">{dashboardStats.totalCandidates}</div>
          </div>
          <div className="min-w-[200px] flex-1 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg p-5 text-white shadow-lg">
            <div className="text-sm opacity-90">Total Professions</div>
            <div className="text-3xl font-bold mt-2">{dashboardStats.totalProfessions}</div>
          </div>
          <div className="min-w-[200px] flex-1 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-lg p-5 text-white shadow-lg">
            <div className="text-sm opacity-90">Pending Review</div>
            <div className="text-3xl font-bold mt-2">{dashboardStats.pendingReview}</div>
          </div>
          <div className="min-w-[200px] flex-1 bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-5 text-white shadow-lg">
            <div className="text-sm opacity-90">Deployed</div>
            <div className="text-3xl font-bold mt-2">{dashboardStats.deployed}</div>
          </div>
          <div className="min-w-[200px] flex-1 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-5 text-white shadow-lg">
            <div className="text-sm opacity-90">New This Week</div>
            <div className="text-3xl font-bold mt-2">{dashboardStats.newThisWeek}</div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg p-4 sm:p-6 border border-gray-200 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-4">
          {/* Country Filter */}
          <select
            value={filters.country}
            onChange={(e) => {
              setCurrentPage(1);
              setFilters(prev => ({ ...prev, country: e.target.value }));
            }}
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
            onChange={(e) => {
              setCurrentPage(1);
              setFilters(prev => ({ ...prev, status: e.target.value }));
            }}
            className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          >
            <option value="all">All Status</option>
            {statuses.map(status => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>

          {/* Profession Filter */}
          <select
            value={filters.position}
            onChange={(e) => {
              setCurrentPage(1);
              setFilters(prev => ({ ...prev, position: e.target.value }));
            }}
            className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          >
            <option value="all">All Professions</option>
            {positions.map(pos => (
              <option key={pos} value={pos}>{pos}</option>
            ))}
          </select>

          {/* Search Bar */}
          <div className="sm:col-span-2 xl:col-span-2 relative">
            <Search className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              placeholder="Search by name, email, phone, profession or skills..."
              value={searchInput}
              onChange={(e) => {
                setCurrentPage(1);
                setSearchInput(e.target.value);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.preventDefault();
              }}
              role="searchbox"
              aria-label="Search candidates"
              className="w-full pl-12 pr-20 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />

            {loading && !showBlockingLoader && (
              <div className="absolute right-10 top-1/2 -translate-y-1/2 text-blue-600" aria-hidden="true">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
            )}

            {searchInput && (
              <button
                type="button"
                onClick={() => {
                  setCurrentPage(1);
                  setSearchInput('');
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                aria-label="Clear search"
                title="Clear"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* View Toggle */}
          <div className="flex items-center gap-2 sm:col-span-2 xl:col-span-1">
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

          <div className="sm:col-span-2 xl:col-span-1 flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Rows</label>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              {PAGE_SIZE_OPTIONS.map((option) => (
                <option key={option} value={option}>{option} per page</option>
              ))}
            </select>
          </div>
        </div>

        {/* Bulk Actions Bar */}
        {selectedIds.size > 0 && (
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3 flex-wrap">
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
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <select
                value={bulkStatus}
                onChange={(e) => setBulkStatus(e.target.value as any)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                disabled={bulkUpdating}
              >
                {CANDIDATE_STATUS_VALUES.map((statusOption) => (
                  <option key={statusOption} value={statusOption}>
                    {statusOption}
                  </option>
                ))}
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

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-4">
          <p className="text-sm text-gray-600">
            Showing <strong>{pageStart}-{pageEnd}</strong> of <strong>{total}</strong> candidates
          </p>
          {loading && !showBlockingLoader && (
            <div className="flex items-center gap-2 text-sm text-blue-600">
              <Loader2 className="w-4 h-4 animate-spin" />
              Updating results...
            </div>
          )}
          <button
            onClick={allFilteredSelected ? clearSelection : selectAllFiltered}
            className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            {allFilteredSelected ? 'Deselect All' : 'Select All'}
          </button>
        </div>

        {total > 0 && (
          <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between border-t border-gray-200 pt-4">
            <div className="text-sm text-gray-600">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => {
                  setCurrentPage(1);
                  scrollToTop();
                }}
                disabled={currentPage === 1}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                First
              </button>
              <button
                onClick={() => {
                  setCurrentPage((page) => Math.max(1, page - 1));
                  scrollToTop();
                }}
                disabled={currentPage === 1}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="px-3 py-2 text-sm text-gray-700">{currentPage}</span>
              <button
                onClick={() => {
                  setCurrentPage((page) => Math.min(totalPages, page + 1));
                  scrollToTop();
                }}
                disabled={currentPage >= totalPages}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
              <button
                onClick={() => {
                  setCurrentPage(totalPages);
                  scrollToTop();
                }}
                disabled={currentPage >= totalPages}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Last
              </button>
            </div>
          </div>
        )}
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
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {filteredCandidates.map((c) => {
              const skills = safeJsonArray(c.skills);
              const confidenceScore = confidenceScore10(c.extraction_confidence);
              const score = typeof c.ai_score === 'number' && isFinite(c.ai_score) ? c.ai_score : confidenceScore;
              const statusLabel = normalizeCandidateStatus(c.status);
              const partnerAttribution = parsePartnerSource(c);
              const selected = selectedIds.has(c.id);

              const cvOk = !!c.cv_received;
              const passportOk = !!c.passport_received;
              const cnicOk = !!c.cnic_received;
              const drivingLicenseOk = !!c.driving_license_received;
              const policeCharacterOk = !!c.police_character_received;
              const certificateOk = !!c.certificate_received || !!c.degree_received;
              const photoOk = !!c.photo_received;
              const medicalOk = !!c.medical_received;
              const docCount = [cvOk, passportOk, cnicOk, drivingLicenseOk, policeCharacterOk, certificateOk, photoOk, medicalOk].filter(Boolean).length;
              const allDocsOk = docCount === 8;
              const resolvedPhotoUrl = brokenPhotoIds[c.id] ? '' : resolveCandidatePhotoUrl(c);
              const isPdfPhoto = !!resolvedPhotoUrl && resolvedPhotoUrl.toLowerCase().includes('.pdf');
              const pdfThumb = pdfThumbs[c.id];

              return (
                <div
                  key={c.id}
                  className={`bg-white rounded-xl border-2 transition-all hover:shadow-2xl ${
                    selected ? 'border-blue-500 shadow-lg' : 'border-gray-200'
                  }`}
                >
                  {/* Card Header with Profile Picture */}
                  <div className="relative bg-gradient-to-br from-blue-500 to-purple-600 h-16 rounded-t-xl">
                    {/* Date Applied badge in ribbon */}
                    {c.created_at && (
                      <div className="absolute bottom-1.5 left-[76px] flex items-center gap-1 text-white/90">
                        <Calendar className="w-3 h-3" />
                        <span className="text-[11px] font-medium">{new Date(c.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })}</span>
                      </div>
                    )}
                    <div className="absolute -bottom-7 left-4">
                      <div className="relative">
                        <div className="w-14 h-14 bg-white rounded-full p-1 shadow-xl">
                          { resolvedPhotoUrl ? (
                            isPdfPhoto ? (
                              pdfThumb ? (
                                <img
                                  src={pdfThumb}
                                  alt={c.name}
                                  className="w-full h-full rounded-full object-cover"
                                  onClick={() => window.open(resolvedPhotoUrl, '_blank')}
                                  title="Click to open PDF"
                                />
                              ) : (
                                <div
                                  className="w-full h-full bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex flex-col items-center justify-center"
                                  onClick={() => window.open(resolvedPhotoUrl, '_blank')}
                                  title="Click to open PDF"
                                  style={{ cursor: 'pointer' }}
                                >
                                  <div className="text-lg font-bold text-blue-600">{getInitials(c.name)}</div>
                                  <div className="text-[8px] px-1 py-0.5 rounded bg-white/70 text-gray-700">PDF</div>
                                </div>
                              )
                            ) : (
                              <img
                                src={resolvedPhotoUrl}
                                alt={c.name}
                                className="w-full h-full rounded-full object-cover"
                                onError={(e) => {
                                  console.warn('Candidate photo failed to load', { candidateId: c.id, url: resolvedPhotoUrl });
                                  setBrokenPhotoIds((prev) => ({ ...prev, [c.id]: true }));
                                }}
                              />
                            )
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center text-xl font-bold text-blue-600">
                              {getInitials(c.name)}
                            </div>
                          )}
                        </div>
                        <button className="absolute -bottom-1 -right-1 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white hover:bg-blue-700 transition-colors shadow-lg"
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePhotoUpload(c.id);
                          }}
                          disabled={uploadingPhoto === c.id}
                        >
                          {uploadingPhoto === c.id ? (
                            <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Camera className="w-3 h-3" />
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
                  <div className="pt-10 px-4 pb-3">
                    {/* ID + badges row */}
                    <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                      {c.candidate_code && (
                        <span className="inline-flex items-center rounded bg-gray-100 px-1.5 py-0.5 text-[11px] font-mono font-semibold text-gray-500 border border-gray-200 select-all" title="Candidate ID">
                          {c.candidate_code}
                        </span>
                      )}
                      {partnerAttribution?.label && (
                        <span className="px-2 py-0.5 bg-cyan-100 text-cyan-700 rounded-full text-[10px] font-medium">
                          Agent: {partnerAttribution.label}
                        </span>
                      )}
                      {c.needs_review && (
                        <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-[10px] font-medium flex items-center gap-0.5">
                          <AlertTriangle className="w-2.5 h-2.5" />Review
                        </span>
                      )}
                      {c.auto_extracted && !c.needs_review && (
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-[10px] font-medium flex items-center gap-0.5">
                          <Sparkles className="w-2.5 h-2.5" />Auto
                        </span>
                      )}
                    </div>
                    {/* Name + position + nationality */}
                    <div className="mb-2">
                      <h3 className="text-base font-semibold text-gray-900 leading-tight mb-0.5">{c.name}</h3>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-gray-500">
                        <span className="flex items-center gap-1"><Briefcase className="w-3 h-3" />{c.position || '—'}</span>
                        <span className="text-gray-300">·</span>
                        <span>{c.nationality || '—'}</span>
                        <span className="text-gray-300">→</span>
                        <span className="flex items-center gap-0.5 font-medium text-blue-600"><MapPin className="w-3 h-3" />{c.country_of_interest || '—'}</span>
                      </div>
                    </div>

                    {/* Status · Score · Exp · Payment — compact row */}
                    <div className="flex flex-wrap items-center gap-1.5 mb-2 pb-2 border-b border-gray-200">
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <select
                          value={statusLabel}
                          onChange={(event) => handleCandidateStatusChange(c, event.target.value as CandidateStatus)}
                          disabled={!!statusUpdatingIds[c.id]}
                          className={`rounded border border-transparent px-2 py-1 text-xs font-medium ${getCandidateStatusClasses(statusLabel)} ${statusUpdatingIds[c.id] ? 'cursor-wait opacity-70' : 'cursor-pointer'}`}
                        >
                          {CANDIDATE_STATUS_VALUES.map((statusOption) => (
                            <option key={statusOption} value={statusOption}>{statusOption}</option>
                          ))}
                        </select>
                        {statusUpdatingIds[c.id] && <Loader2 className="h-3 w-3 animate-spin text-gray-400" />}
                      </div>
                      {score != null && (
                        <div className="flex items-center gap-1 bg-yellow-50 px-2 py-1 rounded flex-shrink-0">
                          <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                          <span className="text-xs font-bold text-gray-900">{score.toFixed(1)}</span>
                        </div>
                      )}
                      {c.experience_years != null && (
                        <span className="text-xs text-gray-500 flex-shrink-0">{c.experience_years}y exp</span>
                      )}
                    </div>

                    {/* Payment — compact inline row */}
                    <div className="flex items-center gap-1.5 mb-2 pb-2 border-b border-gray-100">
                      <span className="text-[11px] font-semibold text-emerald-700 whitespace-nowrap min-w-[3rem]">{formatCandidatePaymentAmount(c.payment_amount)}</span>
                      <div className="flex items-center rounded border border-emerald-200 bg-emerald-50">
                        <span className="px-1.5 text-[11px] font-semibold text-emerald-700">PKR</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={getPaymentDraft(c)}
                          onChange={(event) => handlePaymentDraftChange(c.id, event.target.value)}
                          onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); handleCandidatePaymentSave(c); } }}
                          disabled={!!paymentUpdatingIds[c.id]}
                          className="w-20 border-0 bg-transparent px-1.5 py-1 text-xs text-gray-900 outline-none"
                          placeholder="0"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCandidatePaymentSave(c)}
                        disabled={!!paymentUpdatingIds[c.id]}
                        className="rounded bg-emerald-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-emerald-700 disabled:cursor-wait disabled:opacity-70"
                      >
                        {paymentUpdatingIds[c.id] ? '…' : 'Save'}
                      </button>
                    </div>

                    {/* Contact — compact chips */}
                    <div className="flex flex-wrap gap-1.5 mb-2 pb-2 border-b border-gray-100">
                      {c.phone && (
                        <a href={`tel:${c.phone}`} className="flex items-center gap-1 text-[11px] text-blue-700 bg-blue-50 hover:bg-blue-100 rounded px-2 py-0.5 truncate max-w-[160px]" title={c.phone}>
                          <Phone className="w-3 h-3 flex-shrink-0" />{c.phone}
                        </a>
                      )}
                      {c.email && (
                        <a href={`mailto:${c.email}`} className="flex items-center gap-1 text-[11px] text-green-700 bg-green-50 hover:bg-green-100 rounded px-2 py-0.5 truncate max-w-[180px]" title={c.email}>
                          <Mail className="w-3 h-3 flex-shrink-0" />{c.email}
                        </a>
                      )}
                    </div>

                    {/* Skills */}
                    {skills.length > 0 && (
                      <div className="mb-2 pb-2 border-b border-gray-100">
                        <div className="flex flex-wrap gap-1">
                          {skills.slice(0, 3).map((skill, index) => (
                            <span key={index} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-[11px] font-medium border border-blue-100">
                              {skill}
                            </span>
                          ))}
                          {skills.length > 3 && (
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded text-[11px] font-medium">+{skills.length - 3}</span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Documents - Smart Display */}
                    <div className="mb-2 pb-2 border-b border-gray-100">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-gray-500" />
                          <span className="text-xs font-semibold text-gray-700">Docs</span>
                          {processingDocuments.get(c.id)?.isProcessing ? (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 flex items-center gap-1.5">
                              <ProgressDots />
                              <span>Processing...</span>
                            </span>
                          ) : (
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              docCount === 0 ? 'bg-red-100 text-red-700' :
                              allDocsOk ? 'bg-green-100 text-green-700' :
                              'bg-yellow-100 text-yellow-700'
                            }`}>
                              {docCount} files
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => handleViewAllDocuments(c)}
                          className="text-xs text-blue-600 hover:text-blue-700"
                        >
                          View All →
                        </button>
                      </div>

                      {/* Error Summary Badge - Shows if there are document issues */}
                      {!processingDocuments.get(c.id)?.isProcessing && docCount > 0 && !allDocsOk && (
                        <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                          <div className="flex items-center gap-2 mb-1">
                            <AlertTriangle className="w-4 h-4 text-red-600" />
                            <span className="text-xs font-semibold text-red-700">Document Issues Detected</span>
                          </div>
                          <p className="text-xs text-red- 600">
                            Some documents need attention. Click "View All" to review and resolve issues.
                          </p>
                        </div>
                      )}

                      {processingDocuments.get(c.id)?.isProcessing ? (
                        // Premium Loading State with Shimmer Skeletons
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 text-xs text-blue-600 mb-2">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            <span className="font-medium">
                              {processingDocuments.get(c.id)?.documentCount 
                                ? `Found ${processingDocuments.get(c.id)?.documentCount} document${(processingDocuments.get(c.id)?.documentCount || 0) > 1 ? 's' : ''}...`
                                : 'Extracting documents...'}
                            </span>
                            <span className="text-gray-500">Usually takes 30-60 seconds</span>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            <DocumentSkeletonCard delay={0} />
                            <DocumentSkeletonCard delay={100} />
                            <DocumentSkeletonCard delay={200} />
                            <DocumentSkeletonCard delay={300} />
                          </div>
                          <div className="mt-2 text-xs text-gray-500 text-center">
                            Please wait while we process your documents...
                          </div>
                        </div>
                      ) : docCount > 0 ? (
                        <>
                          {/* Dynamic document icon grid — green=clickable, red=disabled */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {(() => {
                              const docFlagMap: Record<string, boolean> = {
                                cv: cvOk, passport: passportOk, cnic: cnicOk,
                                driving_license: drivingLicenseOk,
                                police_character_certificate: policeCharacterOk,
                                certificate: certificateOk, photo: photoOk, medical: medicalOk,
                              };
                              return DOC_TYPES_CONFIG.map(({ key, category, label, Icon, iconColorOk }) => {
                                const isOk = docFlagMap[key as keyof typeof docFlagMap];
                                return (
                                  <div
                                    key={key}
                                    onClick={isOk ? (e) => { e.stopPropagation(); openCandidateDocument(c.id, category, label); } : undefined}
                                    title={isOk ? `View ${label}` : `${label} not uploaded`}
                                    className={`relative group ${isOk ? 'cursor-pointer' : 'cursor-not-allowed'} ${
                                      isOk ? 'bg-green-50 border-green-300 text-green-800' : 'bg-red-50 border-red-300 text-red-800'
                                    } border-2 rounded-lg p-2 flex flex-col items-center justify-center transition-all ${isOk ? 'hover:shadow-md hover:scale-105 hover:bg-green-100' : 'opacity-70'} animate-fade-in`}
                                  >
                                    <Icon className={`w-5 h-5 mb-1 ${isOk ? iconColorOk : 'text-red-400'}`} />
                                    <span className="text-xs font-semibold">{label}</span>
                                    {isOk ? (
                                      <>
                                        <CheckCircle className="w-5 h-5 text-green-600 absolute top-1 right-1" strokeWidth={2.5} />
                                        <div className="absolute inset-0 rounded-lg bg-green-600/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                                          <Eye className="w-4 h-4 text-green-700" />
                                        </div>
                                      </>
                                    ) : (
                                      <>
                                        <XCircle className="w-5 h-5 text-red-400 absolute top-1 right-1" strokeWidth={2.5} />
                                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-50">
                                          <div className="bg-gray-900 text-white text-xs rounded-md px-2 py-1 whitespace-nowrap">
                                            {label} not uploaded
                                            <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                                          </div>
                                        </div>
                                      </>
                                    )}
                                  </div>
                                );
                              });
                            })()}
                            {docOpeningIds[c.id] && (
                              <div className="col-span-4 flex items-center justify-center gap-1 text-xs text-gray-500 py-1">
                                <Loader2 className="w-3 h-3 animate-spin" /> Opening document…
                              </div>
                            )}
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
                    <div className="space-y-1.5 mt-1">
                      <div className="grid grid-cols-2 gap-2">
                        <button 
                          onClick={() => handleViewProfile(c)}
                          className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-1.5 text-xs font-medium"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          View Details
                        </button>
                        <button 
                          onClick={() => handleDownloadCV(c)}
                          className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center gap-1.5 text-xs font-medium"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Download CV
                        </button>
                      </div>
                      <button
                        onClick={() => handleDeleteCandidate(c)}
                        disabled={deletingCandidateId === c.id}
                        className="w-full px-3 py-1.5 border border-red-200 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors flex items-center justify-center gap-1.5 text-xs font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {deletingCandidateId === c.id ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            Deleting...
                          </>
                        ) : (
                          <>
                            <Trash2 className="w-3.5 h-3.5" />
                            Delete Candidate
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        filteredCandidates.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No candidates found</h3>
            <p className="text-gray-600">Try adjusting your search or filters.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-4 py-3 text-left font-semibold text-gray-600 whitespace-nowrap">ID</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600 whitespace-nowrap">Name</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600 whitespace-nowrap">Profession</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600 whitespace-nowrap">Phone</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600 whitespace-nowrap">Nationality</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600 whitespace-nowrap">Country</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600 whitespace-nowrap">Status</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600 whitespace-nowrap">Exp (yrs)</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600 whitespace-nowrap">Source</th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-600 whitespace-nowrap">Documents</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600 whitespace-nowrap">Partner</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600 whitespace-nowrap">Added</th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-600 whitespace-nowrap">View</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredCandidates.map((c, idx) => {
                    const statusLabel = normalizeCandidateStatus(c.status);
                    const statusCls = getCandidateStatusClasses(c.status as CandidateStatus);
                    const addedDate = c.created_at ? new Date(c.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }) : '—';
                    return (
                      <tr
                        key={c.id}
                        className={`hover:bg-blue-50 cursor-pointer transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}`}
                        onClick={() => { setSelectedCandidate(c); setDetailsInitialTab('details'); setShowDetailsModal(true); }}
                      >
                        <td className="px-4 py-2.5 font-mono text-xs text-blue-700 whitespace-nowrap">{c.candidate_code || '—'}</td>
                        <td className="px-4 py-2.5 font-medium text-gray-900 whitespace-nowrap max-w-[180px] truncate">
                          <div>{c.name}</div>
                          {c.father_name && <div className="text-xs text-gray-400">{c.father_name}</div>}
                        </td>
                        <td className="px-4 py-2.5 text-gray-700 whitespace-nowrap max-w-[150px] truncate">{c.position || '—'}</td>
                        <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">{c.phone || '—'}</td>
                        <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">{c.nationality || '—'}</td>
                        <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">{c.country_of_interest || '—'}</td>
                        <td className="px-4 py-2.5 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusCls}`}>{statusLabel}</span>
                        </td>
                        <td className="px-4 py-2.5 text-center text-gray-600">{c.experience_years ?? '—'}</td>
                        <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap text-xs">{c.source || '—'}</td>
                        <td className="px-4 py-2.5 text-center" onClick={e => e.stopPropagation()}>
                          <div className="flex flex-wrap gap-1 justify-center min-w-[120px]">
                            {DOC_TYPES_CONFIG.filter(cfg => !!(c as any)[cfg.flag]).length === 0 ? (
                              <span className="text-xs text-gray-300">—</span>
                            ) : (
                              DOC_TYPES_CONFIG.filter(cfg => !!(c as any)[cfg.flag]).map(cfg => (
                                <button
                                  key={cfg.key}
                                  type="button"
                                  title={`View ${cfg.label}`}
                                  onClick={(e) => { e.stopPropagation(); openCandidateDocument(c.id, cfg.category, cfg.label); }}
                                  className={`p-1 rounded transition-colors ${cfg.bg}`}
                                >
                                  <cfg.Icon className={`w-4 h-4 ${cfg.color}`} />
                                </button>
                              ))
                            )}
                            {docOpeningIds[c.id] && <Loader2 className="w-3 h-3 animate-pulse text-gray-400 self-center" />}
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap text-xs max-w-[120px] truncate">{c.partner_name || '—'}</td>
                        <td className="px-4 py-2.5 text-gray-400 whitespace-nowrap text-xs">{addedDate}</td>
                        <td className="px-4 py-2.5 text-center">
                          <button
                            onClick={(e) => { e.stopPropagation(); setSelectedCandidate(c); setDetailsInitialTab('details'); setShowDetailsModal(true); }}
                            className="p-1.5 rounded-lg hover:bg-blue-100 text-blue-600 transition-colors"
                            title="View details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      {/* Candidate Details Modal - Portalled to document body to avoid z-index/stacking issues */}
      {showDetailsModal && selectedCandidate && createPortal(
        <CandidateDetailsModal 
          key={selectedCandidate.id}
          candidate={selectedCandidate} 
          initialTab={detailsInitialTab}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedCandidate(null);
            processedCandidateIdRef.current = null; // Reset so same candidate can be opened again later
          }}
          onDocumentChange={() => {
            // Refresh candidates from context to update document flags on cards
            refreshCandidates();
          }}
        />,
        document.body
      )}
    </div>
  );
}
