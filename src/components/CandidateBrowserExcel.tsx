import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useDebounce } from '../hooks/useDebounce';
import { 
  ChevronLeft,
  ChevronRight, 
  ChevronDown, 
  Folder, 
  FolderOpen, 
  Users, 
  MapPin, 
  CheckCircle, 
  FileText, 
  Download, 
  Phone, 
  Mail, 
  Star, 
  Globe, 
  Copy, 
  Play, 
  MessageCircle,
  Eye,
  Search,
  X,
  ChevronUp,
  ChevronDown as ChevronDownIcon,
  GripVertical,
  Settings,
  ExternalLink,
  LayoutDashboard,
  BookOpen,
  CreditCard,
  Heart,
  Award,
  GraduationCap,
  Camera,
  Car,
} from 'lucide-react';
import { API_BASE_URL } from '../lib/apiClient';
import { getFrontendBaseUrl } from '../lib/publicUrl';
import { toast } from 'sonner';
import { Toaster } from './ui/sonner';
import { apiClient, Candidate, CandidateBrowseMetadata, CandidateFilters } from '../lib/apiClient';
import { formatCandidatePaymentAmount, normalizeCandidatePaymentAmount } from '../lib/candidatePayment';
import { CANDIDATE_STATUS_VALUES, type CandidateStatus, getCandidateStatusClasses, normalizeCandidateStatus } from '../lib/candidateStatus';
import { SendToEmployerModal } from './SendToEmployerModal';

interface FolderNode {
  id: string;
  name: string;
  type: 'profession' | 'smart-folder' | 'subfolder';
  icon: any;
  count: number;
  children?: FolderNode[];
  filters?: Partial<CandidateFilters>;
}

const PAGE_SIZE_OPTIONS = [20, 50, 100, 200];

// Helper function to calculate age from date_of_birth
function calculateAge(dateOfBirth?: string): number | null {
  if (!dateOfBirth) return null;
  try {
    const birthDate = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  } catch {
    return null;
  }
}

// Helper function to format date as DD-MM-YYYY
function formatDate(dateString?: string): string {
  if (!dateString) return 'missing';
  try {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  } catch {
    return 'missing';
  }
}

// Helper function to parse languages and extract English/Arabic levels
function parseLanguageLevel(languages?: string, targetLang: 'english' | 'arabic'): string {
  if (!languages) return 'missing';
  
  const langStr = typeof languages === 'string' ? languages : JSON.stringify(languages);
  const lower = langStr.toLowerCase();
  
  // Try to parse as JSON first
  let parsed: any = null;
  try {
    parsed = JSON.parse(langStr);
  } catch {
    // Not JSON, treat as string
  }
  
  if (parsed && typeof parsed === 'object') {
    // If it's an object, look for the language key
    const key = targetLang === 'english' ? 'english' : 'arabic';
    if (parsed[key]) return parsed[key];
    if (parsed[targetLang]) return parsed[targetLang];
  }
  
  // String parsing - look for language mentions
  if (targetLang === 'english') {
    if (lower.includes('english')) {
      if (lower.includes('native') || lower.includes('fluent')) return 'Fluent';
      if (lower.includes('intermediate')) return 'Intermediate';
      if (lower.includes('basic')) return 'Basic';
      return 'Yes';
    }
  } else {
    if (lower.includes('arabic')) {
      if (lower.includes('native') || lower.includes('fluent')) return 'Fluent';
      if (lower.includes('intermediate')) return 'Intermediate';
      if (lower.includes('basic')) return 'Basic';
      return 'Yes';
    }
  }
  
  return 'missing';
}

// Helper function to generate profile link (uses current frontend URL)
function generateProfileLink(candidate: Candidate): string {
  const name = candidate.name || 'candidate';
  const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  const candidateId = candidate.id || '';
  const baseUrl = getFrontendBaseUrl();
  return `${baseUrl}/profile/${candidateId}/${slug}`;
}

// Helper function to generate CV download link (backend redirect)
function generateCVShareLink(candidate: Candidate): string {
  const candidateId = candidate.id || '';
  const apiBaseUrl = API_BASE_URL.replace(/\/$/, '');
  return `${apiBaseUrl}/cv-generator/${candidateId}/download?format=employer-safe`;
}

// Helper function to copy to clipboard
async function copyToClipboard(text: string): Promise<void> {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      // Fallback
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.top = '0';
      textArea.style.left = '0';
      textArea.style.width = '2em';
      textArea.style.height = '2em';
      textArea.style.padding = '0';
      textArea.style.border = 'none';
      textArea.style.outline = 'none';
      textArea.style.boxShadow = 'none';
      textArea.style.background = 'transparent';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
  } catch (err) {
    throw new Error('Failed to copy to clipboard');
  }
}

// Build folder structure from lightweight metadata instead of full candidate rows
function buildFolderStructure(metadata: CandidateBrowseMetadata | null): FolderNode[] {
  const professions = metadata?.professions ?? [];

  if (!professions.length) {
    return [];
  }

  return professions.map((profession) => {
    const professionName = profession.name || 'Unknown';
    const positionLower = professionName.toLowerCase();
    const positionSlug = positionLower.replace(/\s+/g, '-');
    const countries = profession.countries ?? [];
    const statuses = profession.statuses ?? [];
    const documents = profession.documents ?? { complete: 0, missing: 0 };

    return {
      id: `profession-${positionSlug}`,
      name: professionName,
      type: 'profession' as const,
      icon: Users,
      count: profession.count,
      children: [
        {
          id: `${positionSlug}-all`,
          name: 'All',
          type: 'smart-folder' as const,
          icon: Users,
          count: profession.count,
          filters: { position: professionName },
        },
        {
          id: `${positionSlug}-by-country`,
          name: 'By Country',
          type: 'smart-folder' as const,
          icon: MapPin,
          count: countries.reduce((sum, country) => sum + country.count, 0),
          children: countries.map((country) => ({
            id: `${positionSlug}-${country.name.toLowerCase().replace(/\s+/g, '-')}`,
            name: country.name,
            type: 'subfolder' as const,
            icon: MapPin,
            count: country.count,
            filters: { position: professionName, country_of_interest: country.name },
          })),
        },
        {
          id: `${positionSlug}-by-status`,
          name: 'By Status',
          type: 'smart-folder' as const,
          icon: CheckCircle,
          count: statuses.reduce((sum, status) => sum + status.count, 0),
          children: statuses.map((status) => ({
            id: `${positionSlug}-${status.name.toLowerCase().replace(/\s+/g, '-')}`,
            name: status.name,
            type: 'subfolder' as const,
            icon: CheckCircle,
            count: status.count,
            filters: { position: professionName, status: status.name },
          })),
        },
        {
          id: `${positionSlug}-by-documents`,
          name: 'By Documents',
          type: 'smart-folder' as const,
          icon: FileText,
          count: documents.complete + documents.missing,
          children: [
            {
              id: `${positionSlug}-complete`,
              name: 'Complete',
              type: 'subfolder' as const,
              icon: FileText,
              count: documents.complete,
              filters: { position: professionName, documents: 'complete' },
            },
            {
              id: `${positionSlug}-missing`,
              name: 'Missing',
              type: 'subfolder' as const,
              icon: FileText,
              count: documents.missing,
              filters: { position: professionName, documents: 'missing' },
            },
          ],
        },
      ],
    };
  });
}

export function CandidateBrowserExcel() {
  const [searchQuery, setSearchQuery] = useState('');
  const [appliedFrom, setAppliedFrom] = useState<string>('');
  const [appliedTo, setAppliedTo] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalCandidates, setTotalCandidates] = useState(0);
  const [browseMetadata, setBrowseMetadata] = useState<CandidateBrowseMetadata | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  
  // Local state for server-fetched candidates
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedOnceRef = useRef(false);
  const initializedRef = useRef(false);
  const contentScrollRef = useRef<HTMLDivElement | null>(null);
  const tableWrapRef = useRef<HTMLDivElement | null>(null);
  const floatBarRef = useRef<HTMLDivElement | null>(null);
  const floatBarInnerRef = useRef<HTMLDivElement | null>(null);
  const [floatBarVisible, setFloatBarVisible] = useState(false);

  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [selectedFolder, setSelectedFolder] = useState<FolderNode | null>(null);
  const [selectedCandidates, setSelectedCandidates] = useState<Set<string>>(new Set());
  const [statusUpdatingIds, setStatusUpdatingIds] = useState<Record<string, boolean>>({});
  const [paymentUpdatingIds, setPaymentUpdatingIds] = useState<Record<string, boolean>>({});
  const [paymentDrafts, setPaymentDrafts] = useState<Record<string, string>>({});
  const [candidateDocCache, setCandidateDocCache] = useState<Record<string, Array<{id: string; category: string; doc_type: string}>>>({});
  const [docLoadingIds, setDocLoadingIds] = useState<Record<string, boolean>>({});
  const [viewMode, setViewMode] = useState<'basic' | 'detailed'>('detailed');
  const [professionMode, setProfessionMode] = useState<string | null>(null);
  const [activeMenu, setActiveMenu] = useState<'dashboard' | 'browser'>('browser');
  const [showSendModal, setShowSendModal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Close export dropdown on outside click
  useEffect(() => {
    if (!showExportMenu) return;
    const handler = () => setShowExportMenu(false);
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showExportMenu]);

  // ── Enterprise debounce: replaces the old manual setTimeout pattern ──────────
  // One derived value; no extra state, no timer bookkeeping in component body.
  const debouncedSearchQuery = useDebounce(searchQuery, 400);
  // In-flight request cancellation — aborts the previous fetch before starting a new one.
  const fetchAbortRef = useRef<AbortController | null>(null);

  // Fetch candidates with server-side filtering
  const fetchCandidatesWithFilters = useCallback(async () => {
    // Cancel any previous in-flight request to avoid stale-response races.
    fetchAbortRef.current?.abort();
    const controller = new AbortController();
    fetchAbortRef.current = controller;

    setLoading(true);
    setError(null);
    try {
      const activeFilters: CandidateFilters = {
        search: debouncedSearchQuery.trim() || undefined,
        applied_from: appliedFrom || undefined,
        applied_to: appliedTo || undefined,
        sort_by: sortBy,
        sort_order: sortOrder,
        limit: pageSize,
        offset: (currentPage - 1) * pageSize,
      };

      if (activeMenu === 'browser' && selectedFolder?.filters) {
        Object.assign(activeFilters, selectedFolder.filters);
      }

      if (!activeFilters.country_of_interest && selectedCountry !== 'all') {
        activeFilters.country_of_interest = selectedCountry;
      }
      
      const result = await apiClient.getCandidates(activeFilters);
      if (controller.signal.aborted) return;
      setCandidates(result.candidates || []);
      setTotalCandidates(result.total || 0);
    } catch (e: any) {
      if (controller.signal.aborted) return;
      setError(e?.message || 'Failed to load candidates');
    } finally {
      if (!controller.signal.aborted) {
        hasLoadedOnceRef.current = true;
        setLoading(false);
      }
    }
  }, [debouncedSearchQuery, appliedFrom, appliedTo, sortBy, sortOrder, currentPage, pageSize, selectedFolder, selectedCountry, activeMenu]);

  // Document icon configuration — maps candidate boolean flags to category, icon and styling
  const DOC_FLAG_CONFIG = [
    { flag: 'cv_received',               category: 'cv_resume',            Icon: FileText,      color: 'text-blue-500',   bg: 'hover:bg-blue-100',   label: 'CV/Resume' },
    { flag: 'passport_received',         category: 'passport',             Icon: BookOpen,      color: 'text-green-600',  bg: 'hover:bg-green-100',  label: 'Passport' },
    { flag: 'cnic_received',             category: 'cnic',                 Icon: CreditCard,    color: 'text-purple-500', bg: 'hover:bg-purple-100', label: 'CNIC' },
    { flag: 'medical_received',          category: 'medical_reports',      Icon: Heart,         color: 'text-red-500',    bg: 'hover:bg-red-100',    label: 'Medical' },
    { flag: 'certificate_received',      category: 'certificates',         Icon: Award,         color: 'text-yellow-600', bg: 'hover:bg-yellow-100', label: 'Certificate' },
    { flag: 'degree_received',           category: 'educational_documents',Icon: GraduationCap, color: 'text-indigo-500', bg: 'hover:bg-indigo-100', label: 'Degree' },
    { flag: 'photo_received',            category: 'photos',               Icon: Camera,        color: 'text-pink-500',   bg: 'hover:bg-pink-100',   label: 'Photo' },
    { flag: 'driving_license_received',  category: 'driving_license',      Icon: Car,           color: 'text-orange-500', bg: 'hover:bg-orange-100', label: 'License' },
    { flag: 'visa_received',             category: 'other_documents',      Icon: Globe,         color: 'text-teal-500',   bg: 'hover:bg-teal-100',   label: 'Visa' },
  ] as const;

  async function handleDocIconClick(candidateId: string, category: string, label: string) {
    try {
      // Use cached docs if available, otherwise fetch once
      let docs = candidateDocCache[candidateId];
      if (!docs) {
        setDocLoadingIds(prev => ({ ...prev, [candidateId]: true }));
        docs = await apiClient.listCandidateDocumentsNew(candidateId);
        setCandidateDocCache(prev => ({ ...prev, [candidateId]: docs }));
        setDocLoadingIds(prev => ({ ...prev, [candidateId]: false }));
      }
      // Find the first matching document for this category
      const doc = docs.find((d: any) => d.category === category || d.doc_type === category);
      if (!doc) {
        toast.error(`No ${label} document found`);
        return;
      }
      toast.info(`Opening ${label}…`);
      const url = await apiClient.getCandidateDocumentDownloadUrl(doc.id);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err: any) {
      console.error('Failed to open document:', err);
      setDocLoadingIds(prev => ({ ...prev, [candidateId]: false }));
      toast.error(err?.message || `Failed to open ${label}`);
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
      setCandidates((prev) => prev.map((item) => (item.id === candidate.id ? { ...item, status: updatedCandidate.status } : item)));
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
      const savedAmount = normalizeCandidatePaymentAmount(updatedCandidate.payment_amount, nextAmount);
      setCandidates((prev) => prev.map((item) => (
        item.id === candidate.id ? { ...item, payment_amount: savedAmount } : item
      )));
      setPaymentDrafts((prev) => {
        const next = { ...prev };
        delete next[candidate.id];
        return next;
      });
      toast.success(`Payment updated to ${formatCandidatePaymentAmount(savedAmount)}`);
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

  // Fetch data when filters change
  useEffect(() => {
    fetchCandidatesWithFilters();
  }, [fetchCandidatesWithFilters]);

  useEffect(() => {
    const fetchBrowseMetadata = async () => {
      try {
        const metadata = await apiClient.getCandidateBrowseMetadata();
        setBrowseMetadata(metadata);
      } catch (e) {
        console.error('Failed to load candidate browse metadata:', e);
      }
    };
    fetchBrowseMetadata();
  }, []);
  const folderStructure = useMemo(() => {
    return buildFolderStructure(browseMetadata);
  }, [browseMetadata]);

  const countryOptions = useMemo(() => {
    return (browseMetadata?.countries || []).map((country) => country.name);
  }, [browseMetadata]);

  // All professions start collapsed; select first profession's 'All' child
  useEffect(() => {
    if (folderStructure.length > 0 && !initializedRef.current) {
      initializedRef.current = true;
      setExpandedFolders(new Set());
      const firstAllChild = folderStructure[0].children?.find(c => c.name === 'All');
      setSelectedFolder(firstAllChild || folderStructure[0]);
    }
  }, [folderStructure]);

  const toggleFolder = (folderId: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  const scrollContentToTop = () => {
    if (contentScrollRef.current) {
      contentScrollRef.current.scrollTo({ top: 0, behavior: 'auto' });
    }
  };

  const resetFilters = () => {
    setSearchQuery('');
    setAppliedFrom('');
    setAppliedTo('');
    setSelectedCountry('all');
    setSortBy('created_at');
    setSortOrder('desc');
    setCurrentPage(1);
    scrollContentToTop();
  };

  const filteredCandidates = useMemo(() => candidates, [candidates]);
  const totalPages = useMemo(() => Math.max(1, Math.ceil(totalCandidates / pageSize)), [totalCandidates, pageSize]);
  const pageStart = totalCandidates === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const pageEnd = totalCandidates === 0 ? 0 : Math.min(totalCandidates, currentPage * pageSize);
  const hasActiveFilters = Boolean(
    searchQuery.trim() ||
    appliedFrom ||
    appliedTo ||
    selectedCountry !== 'all' ||
    sortBy !== 'created_at' ||
    sortOrder !== 'desc'
  );

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  // ── Floating bottom scrollbar ─────────────────────────────────────────────
  const updateFloatBarGeometry = useCallback(() => {
    const wrap = tableWrapRef.current;
    const bar = floatBarRef.current;
    const inner = floatBarInnerRef.current;
    if (!wrap || !bar || !inner) return;
    const rect = wrap.getBoundingClientRect();
    inner.style.width = wrap.scrollWidth + 'px';
    bar.style.left = rect.left + 'px';
    bar.style.width = rect.width + 'px';
  }, []);

  // Re-measure on resize, sidebar toggle, or data change
  useEffect(() => {
    updateFloatBarGeometry();
    window.addEventListener('resize', updateFloatBarGeometry, { passive: true });
    const ro = new ResizeObserver(updateFloatBarGeometry);
    if (tableWrapRef.current) ro.observe(tableWrapRef.current);
    return () => {
      window.removeEventListener('resize', updateFloatBarGeometry);
      ro.disconnect();
    };
  }, [updateFloatBarGeometry, filteredCandidates.length, viewMode, sidebarOpen]);

  // Show bar only while table is visible in viewport
  useEffect(() => {
    const wrap = tableWrapRef.current;
    if (!wrap) return;
    const io = new IntersectionObserver(
      ([entry]) => setFloatBarVisible(entry.isIntersecting),
      { threshold: 0.01 }
    );
    io.observe(wrap);
    return () => io.disconnect();
  }, []);

  // Two-way scroll sync
  useEffect(() => {
    const wrap = tableWrapRef.current;
    const bar = floatBarRef.current;
    if (!wrap || !bar) return;
    const onWrap = () => { bar.scrollLeft = wrap.scrollLeft; };
    const onBar  = () => { wrap.scrollLeft = bar.scrollLeft; };
    wrap.addEventListener('scroll', onWrap, { passive: true });
    bar.addEventListener('scroll', onBar,  { passive: true });
    return () => {
      wrap.removeEventListener('scroll', onWrap);
      bar.removeEventListener('scroll', onBar);
    };
  }, []);

  const selectFolder = (folder: FolderNode) => {
    setSelectedFolder(folder);
    setSelectedCandidates(new Set());
    setCurrentPage(1); // Reset to first page when folder changes
    scrollContentToTop();
  };

  const renderFolder = (folder: FolderNode, level: number = 0) => {
    const isExpanded = expandedFolders.has(folder.id);
    const isSelected = selectedFolder?.id === folder.id;
    const hasChildren = folder.children && folder.children.length > 0;
    const Icon = folder.icon;

    const paddingLeft = level * 20 + 12;

    const candidateCount = folder.count;

    return (
      <div key={folder.id}>
        <div
          className={`flex items-center gap-2 px-3 py-2.5 cursor-pointer hover:bg-gray-100 transition-colors ${
            isSelected ? 'bg-blue-50 border-r-4 border-blue-600 text-blue-700 font-medium' : 'text-gray-700'
          }`}
          style={{ paddingLeft: `${paddingLeft}px` }}
          onClick={() => {
            if (folder.type === 'profession') {
              const allChild = folder.children?.find((child) => child.name === 'All');
              setActiveMenu('browser');
              setProfessionMode(folder.name);
              selectFolder(allChild || folder);
              if (hasChildren) {
                setExpandedFolders(new Set([...expandedFolders, folder.id]));
              }
              return;
            }

            if (hasChildren && folder.type !== 'smart-folder') {
              toggleFolder(folder.id);
            } else {
              selectFolder(folder);
              if (hasChildren) {
                toggleFolder(folder.id);
              }
            }
          }}
        >
          {hasChildren && (
            <span className="flex-shrink-0">
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-500" />
              )}
            </span>
          )}
          {!hasChildren && <span className="w-4" />}
          
          {folder.type === 'profession' ? (
            isExpanded ? <FolderOpen className="w-5 h-5 text-blue-600" /> : <Folder className="w-5 h-5 text-blue-600" />
          ) : (
            <Icon className={`w-4 h-4 ${isSelected ? 'text-blue-600' : 'text-gray-500'}`} />
          )}
          
          <span className={`text-sm ${folder.type === 'profession' ? 'font-semibold' : ''}`}>
            {folder.name}
          </span>

          {folder.count > 0 && folder.type !== 'smart-folder' && (
            <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${
              isSelected ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
            }`}>
              {candidateCount}
            </span>
          )}
        </div>

        {isExpanded && hasChildren && (
          <div>
            {folder.children!.map(child => renderFolder(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  // Export uses the same debouncedSearchQuery as the visible table so the
  // downloaded file always matches exactly what the user sees on screen.
  const handleExport = async (format: 'csv' | 'xlsx') => {
    try {
      const activeFilters: CandidateFilters = {
        search: debouncedSearchQuery.trim() || undefined,
        applied_from: appliedFrom || undefined,
        applied_to: appliedTo || undefined,
        sort_by: sortBy,
        sort_order: sortOrder,
      };
      
      // Apply folder filters
      if (selectedFolder) {
        const parent = folderStructure.find(f => 
          f.children?.some(c => c.id === selectedFolder.id || c.children?.some(sc => sc.id === selectedFolder.id))
        );
        if (parent) activeFilters.position = parent.name;
      }

      if (selectedCountry !== 'all') {
        activeFilters.country_of_interest = selectedCountry;
      }
      
      const blob = await apiClient.exportCandidates(activeFilters, format);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `candidates_${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (e: any) {
      alert(`Export failed: ${e?.message || 'Unknown error'}`);
    }
  };
  
  // Column sort handler
  const handleColumnSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const toggleCandidateSelection = (id: string) => {
    const newSelected = new Set(selectedCandidates);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedCandidates(newSelected);
  };

  const toggleSelectAll = () => {
    if (filteredCandidates.length === 0) return;
    
    if (selectedCandidates.size === filteredCandidates.length && filteredCandidates.length > 0) {
      // Unselect all on current page
      setSelectedCandidates(new Set());
    } else {
      // Select all on current page, add to existing selections
      const newSelected = new Set(selectedCandidates);
      filteredCandidates.forEach(c => newSelected.add(c.id));
      setSelectedCandidates(newSelected);
    }
  };

  if (loading && !hasLoadedOnceRef.current) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading candidates...</p>
        </div>
      </div>
    );
  }

  if (error && !hasLoadedOnceRef.current) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="bg-white border border-red-200 rounded-lg p-6 text-center">
          <h3 className="text-lg font-medium text-red-900 mb-2">Failed to load candidates</h3>
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className={`${sidebarOpen ? 'w-72' : 'w-0'} flex-shrink-0 bg-white border-r border-gray-200 overflow-hidden flex flex-col shadow-sm transition-all duration-300`}>
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 flex-shrink-0">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Folder className="w-5 h-5" />
            Excel Browser
          </h2>
          <p className="text-xs text-blue-100 mt-1">Choose a view to start</p>
        </div>

        <div className="border-b border-gray-200">
          <button
            onClick={() => {
              setActiveMenu('dashboard');
              setProfessionMode(null);
              setSelectedFolder(null);
              scrollContentToTop();
            }}
            className={`w-full flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
              activeMenu === 'dashboard'
                ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-600'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            Dashboard
          </button>
          <button
            onClick={() => {
              setActiveMenu('browser');
              scrollContentToTop();
            }}
            className={`w-full flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
              activeMenu === 'browser'
                ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-600'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Users className="w-4 h-4" />
            Candidate Browser
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {activeMenu === 'browser' ? (
            folderStructure.length > 0 ? (
              folderStructure.map(folder => renderFolder(folder))
            ) : (
              <div className="p-4 text-center text-gray-500 text-sm">
                No candidates found
              </div>
            )
          ) : (
            <div className="p-4 text-center text-gray-500 text-sm">
              Dashboard mode shows all candidates.
            </div>
          )}
        </div>

        <div className="border-t border-gray-200 p-4 bg-gray-50 flex-shrink-0">
          <div className="text-xs text-gray-600 space-y-1">
            <div className="flex items-center justify-between">
              <span>In selection:</span>
              <span className="font-semibold text-gray-900">{totalCandidates}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Total in DB:</span>
              <span className="font-semibold text-gray-500">{browseMetadata?.totalCandidates ?? 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Showing:</span>
              <span className="font-semibold text-blue-600">{pageStart}-{pageEnd}</span>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {/* Sidebar toggle + top bar */}
        <div className="flex-shrink-0 flex items-center gap-3 px-4 py-2 bg-white border-b border-gray-200">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 rounded-lg hover:bg-gray-100 border border-gray-200 text-gray-600 transition-colors flex-shrink-0"
            title={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
          >
            {sidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
          <span className="text-sm font-medium text-gray-700 truncate">
            {activeMenu === 'browser' ? (professionMode || 'Candidate Browser') : 'Excel Browser – Dashboard'}
          </span>
        </div>

        <div ref={contentScrollRef} className="flex-1 min-h-0 overflow-y-auto">
        <div className="h-full min-h-0 flex flex-col gap-4 p-4">
      {activeMenu === 'browser' ? (
        <section className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <div className="flex items-center gap-2 flex-shrink-0 min-w-0">
              <h2 className="text-sm font-semibold text-gray-900 truncate">{professionMode || 'Candidates'}</h2>
              <span className="text-xs text-gray-500 whitespace-nowrap hidden sm:inline">{pageStart}–{pageEnd} of {totalCandidates}</span>
            </div>
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-2 w-4 h-4 text-gray-400" />
              <input
                type="search"
                role="searchbox"
                aria-label="Search candidates"
                placeholder="Search by name, passport, CNIC, phone, or email"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
                className="w-full pl-9 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
              />
              {searchQuery && (
                <button type="button" aria-label="Clear search" onClick={() => { setSearchQuery(''); setCurrentPage(1); }} className="absolute right-2 top-2 text-gray-400 hover:text-gray-600 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => setShowFilters((current) => !current)}
                className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${showFilters || hasActiveFilters ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'}`}
              >
                {showFilters ? 'Hide Filters' : 'Filters'}{hasActiveFilters ? ' •' : ''}
              </button>
              {hasActiveFilters && (
                <button onClick={resetFilters} className="px-3 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors">Clear</button>
              )}
            </div>
          </div>
          {showFilters && (
            <div className="mt-3 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 border-t border-gray-100 pt-3">
              <div className="space-y-1">
                <label className="block text-xs font-medium text-gray-600">Country</label>
                <select value={selectedCountry} onChange={(e) => { setSelectedCountry(e.target.value); setCurrentPage(1); }} className="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm">
                  <option value="all">All Countries</option>
                  {countryOptions.map((country) => <option key={country} value={country}>{country}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-medium text-gray-600">From Date</label>
                <input type="date" value={appliedFrom} onChange={(e) => { setAppliedFrom(e.target.value); setCurrentPage(1); }} className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" />
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-medium text-gray-600">To Date</label>
                <input type="date" value={appliedTo} onChange={(e) => { setAppliedTo(e.target.value); setCurrentPage(1); }} className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" />
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-medium text-gray-600">Sort By</label>
                <select value={sortBy} onChange={(e) => { setSortBy(e.target.value); setCurrentPage(1); }} className="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm">
                  <option value="created_at">Applied Date</option>
                  <option value="name">Name</option>
                  <option value="position">Position</option>
                  <option value="status">Status</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-medium text-gray-600">Rows Per Page</label>
                <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); scrollContentToTop(); }} className="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm bg-white">
                  {PAGE_SIZE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
              </div>
            </div>
          )}
        </section>
      ) : (
        <section className="bg-white border border-gray-200 rounded-lg p-4 sm:p-5 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2 w-4 h-4 text-gray-400" />
              <input
                type="search"
                role="searchbox"
                aria-label="Search candidates"
                placeholder="Search by name, passport, CNIC, phone, or email"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') e.preventDefault();
                }}
                className="w-full pl-9 pr-9 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
              />
              {searchQuery && (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => {
                    setSearchQuery('');
                    setCurrentPage(1);
                  }}
                  className="absolute right-3 top-2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setShowFilters((current) => !current)}
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  showFilters || hasActiveFilters
                    ? 'border-blue-200 bg-blue-50 text-blue-700'
                    : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                {showFilters ? 'Hide Filters' : 'Show Filters'}
              </button>

              {hasActiveFilters && (
                <button
                  onClick={resetFilters}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {showFilters && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 border-t border-gray-100 pt-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Country</label>
                <select
                  value={selectedCountry}
                  onChange={(e) => {
                    setSelectedCountry(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                >
                  <option value="all">All Countries</option>
                  {countryOptions.map((country) => (
                    <option key={country} value={country}>{country}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Applied From</label>
                <input
                  type="date"
                  value={appliedFrom}
                  onChange={(e) => {
                    setAppliedFrom(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Applied To</label>
                <input
                  type="date"
                  value={appliedTo}
                  onChange={(e) => {
                    setAppliedTo(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Quick Date</label>
                <button
                  type="button"
                  onClick={() => {
                    const today = new Date().toISOString().split('T')[0];
                    setAppliedFrom(today);
                    setAppliedTo(today);
                    setCurrentPage(1);
                  }}
                  className="w-full px-4 py-2 border border-green-300 bg-green-50 text-green-700 rounded-lg text-sm font-medium hover:bg-green-100 transition-colors"
                >
                  Today
                </button>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Sort By</label>
                <select
                  value={sortBy}
                  onChange={(e) => {
                    setSortBy(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                >
                  <option value="created_at">Applied Date</option>
                  <option value="name">Name</option>
                  <option value="position">Position</option>
                  <option value="status">Status</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Sort Order</label>
                <select
                  value={sortOrder}
                  onChange={(e) => {
                    setSortOrder(e.target.value as 'asc' | 'desc');
                    setCurrentPage(1);
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                >
                  <option value="desc">Newest First</option>
                  <option value="asc">Oldest First</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Rows Per Page</label>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                    scrollContentToTop();
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm bg-white"
                >
                  {PAGE_SIZE_OPTIONS.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-sm text-gray-600">
            <span>
              Showing {pageStart}-{pageEnd} of {totalCandidates} candidates{loading ? ' (Loading...)' : ''}
            </span>
            {selectedFolder && (
              <span className="text-gray-500">Current folder: {selectedFolder.name}</span>
            )}
          </div>
        </section>
      )}

      {/* Browser Section */}
      <div className="flex-1 min-h-0 bg-white rounded-lg border border-gray-200 overflow-hidden flex flex-col shadow-sm">
        {/* Table Header Actions */}
          <div className="border-b border-gray-200 p-4 bg-gray-50 flex-shrink-0">
          <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
            <div>
              <h3 className="font-semibold text-gray-900">{selectedFolder?.name || 'All candidates'}</h3>
              <p className="text-sm text-gray-600">
                Showing {pageStart}-{pageEnd} of {totalCandidates} candidates
                {debouncedSearchQuery && ` (filtered by "${debouncedSearchQuery}")`}
              </p>
              {selectedCandidates.size > 0 && (
                <span className="text-sm text-blue-600 font-medium mt-1">{selectedCandidates.size} selected</span>
              )}
            </div>
            <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2">
              {selectedCandidates.size > 0 && (
                <button
                  onClick={() => setShowSendModal(true)}
                  className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm flex items-center gap-2"
                >
                  <Mail className="w-4 h-4" />
                  Send to Employer
                </button>
              )}
              <div className="relative">
                <button
                  onClick={() => setShowExportMenu((prev) => !prev)}
                  className="p-2 rounded-lg border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 transition-colors"
                  title="Export & settings"
                >
                  <Settings className="w-4 h-4" />
                </button>
                {showExportMenu && (
                  <div className="absolute right-0 mt-1 w-44 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
                    <button
                      onClick={() => { handleExport('xlsx'); setShowExportMenu(false); }}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 rounded-t-lg"
                    >
                      <Download className="w-4 h-4 text-green-600" />
                      Export Excel
                    </button>
                    <button
                      onClick={() => { handleExport('csv'); setShowExportMenu(false); }}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 rounded-b-lg border-t border-gray-100"
                    >
                      <Download className="w-4 h-4 text-blue-600" />
                      Export CSV
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Excel-like Table */}
        <div ref={tableWrapRef} className="flex-1 min-h-0 overflow-auto">
          {filteredCandidates.length > 0 ? (
            <table className="w-full min-w-[1260px] border-collapse">
              <thead className="bg-gray-100 sticky top-0 z-10">
                <tr>
                  <th className="border border-gray-300 p-2 text-left bg-gray-100">
                    <input
                      type="checkbox"
                      checked={selectedCandidates.size === filteredCandidates.length && filteredCandidates.length > 0}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 cursor-pointer"
                    />
                  </th>
                  {/* Basic columns */}
                  <th className="border border-gray-300 p-2 text-left text-xs font-semibold text-gray-700 bg-gray-100">ID</th>
                  <th 
                    className="border border-gray-300 p-2 text-left text-xs font-semibold text-gray-700 bg-gray-100 cursor-pointer hover:bg-gray-200 select-none"
                    onClick={() => handleColumnSort('name')}
                  >
                    <div className="flex items-center gap-1">
                      Name
                      {sortBy === 'name' && (sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDownIcon className="w-3 h-3" />)}
                    </div>
                  </th>
                  <th 
                    className="border border-gray-300 p-2 text-left text-xs font-semibold text-gray-700 bg-gray-100 cursor-pointer hover:bg-gray-200 select-none"
                    onClick={() => handleColumnSort('position')}
                  >
                    <div className="flex items-center gap-1">
                      Position
                      {sortBy === 'position' && (sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDownIcon className="w-3 h-3" />)}
                    </div>
                  </th>
                  <th className="border border-gray-300 p-2 text-left text-xs font-semibold text-gray-700 bg-gray-100">Age</th>
                  <th className="border border-gray-300 p-2 text-left text-xs font-semibold text-gray-700 bg-gray-100">Nationality</th>
                  <th className="border border-gray-300 p-2 text-left text-xs font-semibold text-gray-700 bg-gray-100">Country</th>
                  <th className="border border-gray-300 p-2 text-left text-xs font-semibold text-gray-700 bg-gray-100">Phone</th>
                  <th className="border border-gray-300 p-2 text-left text-xs font-semibold text-gray-700 bg-gray-100">Email</th>
                  <th className="border border-gray-300 p-2 text-left text-xs font-semibold text-gray-700 bg-gray-100">Experience</th>
                  <th 
                    className="border border-gray-300 p-2 text-left text-xs font-semibold text-gray-700 bg-gray-100 cursor-pointer hover:bg-gray-200 select-none"
                    onClick={() => handleColumnSort('status')}
                  >
                    <div className="flex items-center gap-1">
                      Status
                      {sortBy === 'status' && (sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDownIcon className="w-3 h-3" />)}
                    </div>
                  </th>
                  <th
                    className="border border-gray-300 p-2 text-left text-xs font-semibold text-gray-700 bg-gray-100 cursor-pointer hover:bg-gray-200 select-none"
                    onClick={() => handleColumnSort('payment_amount')}
                  >
                    <div className="flex items-center gap-1">
                      Payment (PKR)
                      {sortBy === 'payment_amount' && (sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDownIcon className="w-3 h-3" />)}
                    </div>
                  </th>
                  <th className="border border-gray-300 p-2 text-left text-xs font-semibold text-gray-700 bg-gray-100">AI Score</th>
                  <th className="border border-gray-300 p-2 text-center text-xs font-semibold text-gray-700 bg-orange-50 min-w-[130px]">
                    <div className="flex flex-col items-center gap-1">
                      <FolderOpen className="w-4 h-4 text-orange-600" />
                      <span>Documents</span>
                    </div>
                  </th>
                  
                  {/* Detailed columns */}
                  {viewMode === 'detailed' && (
                    <>
                      <th className="border border-gray-300 p-2 text-left text-xs font-semibold text-gray-700 bg-gray-100">Religion</th>
                      <th className="border border-gray-300 p-2 text-left text-xs font-semibold text-gray-700 bg-gray-100">Marital</th>
                      <th className="border border-gray-300 p-2 text-left text-xs font-semibold text-gray-700 bg-gray-100">Salary Exp.</th>
                      <th className="border border-gray-300 p-2 text-left text-xs font-semibold text-gray-700 bg-gray-100">Available</th>
                      <th className="border border-gray-300 p-2 text-left text-xs font-semibold text-gray-700 bg-gray-100">Interview</th>
                      <th className="border border-gray-300 p-2 text-left text-xs font-semibold text-gray-700 bg-gray-100">Passport #</th>
                      <th className="border border-gray-300 p-2 text-left text-xs font-semibold text-gray-700 bg-gray-100">Pass. Expiry</th>
                      <th className="border border-gray-300 p-2 text-left text-xs font-semibold text-gray-700 bg-gray-100">Medical Exp.</th>
                      <th className="border border-gray-300 p-2 text-left text-xs font-semibold text-gray-700 bg-gray-100">License</th>
                      <th className="border border-gray-300 p-2 text-left text-xs font-semibold text-gray-700 bg-gray-100">GCC Years</th>
                      <th className="border border-gray-300 p-2 text-left text-xs font-semibold text-gray-700 bg-gray-100">English</th>
                      <th className="border border-gray-300 p-2 text-left text-xs font-semibold text-gray-700 bg-gray-100">Arabic</th>
                      <th className="border border-gray-300 p-2 text-left text-xs font-semibold text-gray-700 bg-gray-100">Location</th>
                    </>
                  )}
                  
                  <th 
                    className="border border-gray-300 p-2 text-left text-xs font-semibold text-gray-700 bg-gray-100 cursor-pointer hover:bg-gray-200 select-none"
                    onClick={() => handleColumnSort('created_at')}
                  >
                    <div className="flex items-center gap-1">
                      Applied
                      {sortBy === 'created_at' && (sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDownIcon className="w-3 h-3" />)}
                    </div>
                  </th>
                  
                  {/* Separate columns for each link/action */}
                  <th className="border border-gray-300 p-2 text-center text-xs font-semibold text-gray-700 bg-blue-50">
                    <div className="flex flex-col items-center gap-1">
                      <Globe className="w-4 h-4 text-blue-600" />
                      <span>Profile Link</span>
                    </div>
                  </th>
                  <th className="border border-gray-300 p-2 text-center text-xs font-semibold text-gray-700 bg-purple-50">
                    <div className="flex flex-col items-center gap-1">
                      <FileText className="w-4 h-4 text-purple-600" />
                      <span>Employer CV</span>
                    </div>
                  </th>
                  <th className="border border-gray-300 p-2 text-center text-xs font-semibold text-gray-700 bg-red-50">
                    <div className="flex flex-col items-center gap-1">
                      <Play className="w-4 h-4 text-red-600" />
                      <span>Video</span>
                    </div>
                  </th>
                  <th className="border border-gray-300 p-2 text-center text-xs font-semibold text-gray-700 bg-green-50">
                    <div className="flex flex-col items-center gap-1">
                      <MessageCircle className="w-4 h-4 text-green-600" />
                      <span>WhatsApp</span>
                    </div>
                  </th>
                  <th className="border border-gray-300 p-2 text-center text-xs font-semibold text-gray-700 bg-gray-50">
                    <div className="flex flex-col items-center gap-1">
                      <Phone className="w-4 h-4 text-gray-600" />
                      <span>Call</span>
                    </div>
                  </th>
                  <th className="border border-gray-300 p-2 text-center text-xs font-semibold text-gray-700 bg-gray-50">
                    <div className="flex flex-col items-center gap-1">
                      <Mail className="w-4 h-4 text-gray-600" />
                      <span>Email</span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredCandidates.map((candidate, index) => {
                  const age = calculateAge(candidate.date_of_birth);
                  const englishLevel = parseLanguageLevel(candidate.languages, 'english');
                  const arabicLevel = parseLanguageLevel(candidate.languages, 'arabic');
                  const appliedDate = formatDate(candidate.created_at);
                  const passportExpiry = formatDate(candidate.passport_expiry);
                  
                  return (
                    <tr
                      key={candidate.id}
                      className={`hover:bg-blue-50 ${
                        selectedCandidates.has(candidate.id) ? 'bg-blue-50' : index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                      }`}
                    >
                      <td className="border border-gray-300 p-2">
                        <input
                          type="checkbox"
                          checked={selectedCandidates.has(candidate.id)}
                          onChange={() => toggleCandidateSelection(candidate.id)}
                          className="w-4 h-4 cursor-pointer"
                        />
                      </td>
                      <td className="border border-gray-300 p-2 text-xs font-mono text-gray-600">{candidate.candidate_code || 'Pending code'}</td>
                      <td className="border border-gray-300 p-2 text-sm font-medium text-gray-900">{candidate.name || 'missing'}</td>
                      <td className="border border-gray-300 p-2 text-sm text-gray-700">{candidate.position || 'missing'}</td>
                      <td className="border border-gray-300 p-2 text-sm text-gray-700 text-center">{age !== null ? age : 'missing'}</td>
                      <td className="border border-gray-300 p-2 text-sm text-gray-700">{candidate.nationality || 'missing'}</td>
                      <td className="border border-gray-300 p-2 text-sm text-gray-700">{candidate.country_of_interest || 'missing'}</td>
                      <td className="border border-gray-300 p-2 text-sm text-gray-700">{candidate.phone || 'missing'}</td>
                      <td className="border border-gray-300 p-2 text-sm text-gray-700">{candidate.email || 'missing'}</td>
                      <td className="border border-gray-300 p-2 text-sm text-gray-700 text-center">{candidate.experience_years ? `${candidate.experience_years}y` : 'missing'}</td>
                      <td className="border border-gray-300 p-2">
                        <div className="flex items-center gap-2">
                          <select
                            value={normalizeCandidateStatus(candidate.status)}
                            onChange={(event) => handleCandidateStatusChange(candidate, event.target.value as CandidateStatus)}
                            disabled={!!statusUpdatingIds[candidate.id]}
                            className={`rounded border border-transparent px-2 py-1 text-xs font-medium ${getCandidateStatusClasses(candidate.status)} ${statusUpdatingIds[candidate.id] ? 'cursor-wait opacity-70' : 'cursor-pointer'}`}
                          >
                            {CANDIDATE_STATUS_VALUES.map((statusOption) => (
                              <option key={statusOption} value={statusOption}>
                                {statusOption}
                              </option>
                            ))}
                          </select>
                          {statusUpdatingIds[candidate.id] && <span className="text-[11px] text-gray-500">Saving…</span>}
                        </div>
                      </td>
                      <td className="border border-gray-300 p-2 align-top">
                        <div className="flex min-w-[190px] flex-col gap-2">
                          <div className="text-[11px] font-medium text-emerald-700">
                            {formatCandidatePaymentAmount(candidate.payment_amount)}
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center rounded border border-emerald-200 bg-emerald-50">
                              <span className="px-2 text-[11px] font-semibold text-emerald-700">PKR</span>
                              <input
                                type="text"
                                inputMode="numeric"
                                value={getPaymentDraft(candidate)}
                                onChange={(event) => handlePaymentDraftChange(candidate.id, event.target.value)}
                                onKeyDown={(event) => {
                                  if (event.key === 'Enter') {
                                    event.preventDefault();
                                    handleCandidatePaymentSave(candidate);
                                  }
                                }}
                                disabled={!!paymentUpdatingIds[candidate.id]}
                                className="w-24 border-0 bg-transparent px-2 py-1 text-xs font-medium text-gray-900 outline-none"
                                placeholder="0"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => handleCandidatePaymentSave(candidate)}
                              disabled={!!paymentUpdatingIds[candidate.id]}
                              className="rounded bg-emerald-600 px-2 py-1 text-[11px] font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-wait disabled:opacity-70"
                            >
                              {paymentUpdatingIds[candidate.id] ? 'Saving...' : 'Save'}
                            </button>
                          </div>
                        </div>
                      </td>
                      <td className="border border-gray-300 p-2 text-sm text-center">
                        {candidate.ai_score != null ? (
                          <div className="flex items-center justify-center gap-1">
                            <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                            <span className="font-semibold">{candidate.ai_score.toFixed(1)}</span>
                          </div>
                        ) : (
                          'missing'
                        )}
                      </td>
                      
                      {/* Documents column */}
                      <td className="border border-gray-300 p-2 bg-orange-50">
                        <div className="flex flex-wrap gap-1 min-w-[120px]">
                          {DOC_FLAG_CONFIG.filter(cfg => (candidate as any)[cfg.flag]).length === 0 ? (
                            <span className="text-xs text-gray-400">—</span>
                          ) : (
                            DOC_FLAG_CONFIG.filter(cfg => (candidate as any)[cfg.flag]).map(cfg => (
                              <button
                                key={cfg.flag}
                                type="button"
                                title={cfg.label}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDocIconClick(candidate.id, cfg.category, cfg.label);
                                }}
                                className={`p-1 rounded transition-colors ${cfg.bg}`}
                              >
                                <cfg.Icon className={`w-4 h-4 ${cfg.color}`} />
                              </button>
                            ))
                          )}
                          {docLoadingIds[candidate.id] && (
                            <span className="text-[10px] text-gray-400 animate-pulse self-center">…</span>
                          )}
                        </div>
                      </td>
                      
                      {/* Detailed columns */}
                      {viewMode === 'detailed' && (
                        <>
                          <td className="border border-gray-300 p-2 text-sm text-gray-700">{candidate.religion || 'missing'}</td>
                          <td className="border border-gray-300 p-2 text-sm text-gray-700">{candidate.marital_status || 'missing'}</td>
                          <td className="border border-gray-300 p-2 text-sm text-gray-700">{candidate.salary_expectation || 'missing'}</td>
                          <td className="border border-gray-300 p-2 text-xs text-gray-700">{formatDate(candidate.date_available)}</td>
                          <td className="border border-gray-300 p-2 text-xs text-gray-700">{formatDate(candidate.interview_date)}</td>
                          <td className="border border-gray-300 p-2 text-xs font-mono text-gray-700">{candidate.passport || 'missing'}</td>
                          <td className="border border-gray-300 p-2 text-xs text-gray-700">{passportExpiry}</td>
                          <td className="border border-gray-300 p-2 text-xs text-gray-700">{formatDate(candidate.medical_expiry)}</td>
                          <td className="border border-gray-300 p-2 text-xs text-gray-700">{candidate.license || 'missing'}</td>
                          <td className="border border-gray-300 p-2 text-sm text-center text-gray-700">{candidate.gcc_years || 'missing'}</td>
                          <td className="border border-gray-300 p-2 text-xs text-gray-700">{englishLevel}</td>
                          <td className="border border-gray-300 p-2 text-xs text-gray-700">{arabicLevel}</td>
                          <td className="border border-gray-300 p-2 text-xs text-gray-700">{candidate.address || 'missing'}</td>
                        </>
                      )}
                      
                      <td className="border border-gray-300 p-2 text-sm text-gray-700">{appliedDate}</td>
                      
                      {/* Separate columns for each link/action */}
                      <td className="border border-gray-300 p-2 bg-blue-50">
                        <a
                          href={generateProfileLink(candidate)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-2 px-3 py-1.5 text-blue-600 hover:text-blue-800 hover:underline transition-colors group"
                          title="Click to open public profile (Right-click to copy link)"
                          onClick={(e) => {
                            e.stopPropagation();
                            toast.info('Opening public profile...');
                          }}
                          onContextMenu={async (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            try {
                              await copyToClipboard(generateProfileLink(candidate));
                              toast.success('Profile link copied to clipboard!');
                            } catch (err) {
                              toast.error('Failed to copy link');
                            }
                          }}
                        >
                          <Globe className="w-4 h-4 group-hover:scale-110 transition-transform flex-shrink-0" />
                          <span className="text-xs font-medium underline">View Details</span>
                          <ExternalLink className="w-3 h-3 opacity-60" />
                        </a>
                      </td>
                      <td className="border border-gray-300 p-2 bg-purple-50">
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            try {
                              toast.info('Generating Employer CV...');
                              const result = await apiClient.generateCandidateCV(candidate.id, 'employer-safe');
                              
                              // Download PDF from signed URL
                              const response = await fetch(result.cv_url);
                              if (!response.ok) {
                                throw new Error(`Failed to download CV: ${response.statusText}`);
                              }
                              
                              const blob = await response.blob();
                              const url = window.URL.createObjectURL(blob);
                              const link = document.createElement('a');
                              link.href = url;
                              link.download = `${candidate.name || 'Candidate'}_Employer_CV.pdf`;
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                              window.URL.revokeObjectURL(url);
                              
                              toast.success('Employer CV downloaded successfully!');
                            } catch (err: any) {
                              console.error('Failed to download CV:', err);
                              toast.error(err?.message || 'Failed to download Employer CV');
                            }
                          }}
                          className="flex items-center justify-center gap-2 px-3 py-1.5 text-purple-600 hover:text-purple-800 hover:underline transition-colors group cursor-pointer"
                          title="Click to download employer CV"
                        >
                          <FileText className="w-4 h-4 group-hover:scale-110 transition-transform flex-shrink-0" />
                          <span className="text-xs font-medium underline">View CV</span>
                          <Download className="w-3 h-3 opacity-60" />
                        </button>
                      </td>
                      <td className="border border-gray-300 p-2">
                        {candidate.youtube_link ? (
                          <a
                            href={candidate.youtube_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 hover:bg-red-100 rounded flex items-center justify-center"
                            title="Open YouTube"
                          >
                            <Play className="w-4 h-4 text-red-600" />
                          </a>
                        ) : (
                          <span className="text-xs text-gray-400">missing</span>
                        )}
                      </td>
                      <td className="border border-gray-300 p-2">
                        {candidate.phone ? (
                          <a 
                            href={`https://wa.me/${candidate.phone.replace(/[^0-9]/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 hover:bg-green-100 rounded" 
                            title="Open WhatsApp"
                          >
                            <MessageCircle className="w-4 h-4 text-green-600" />
                          </a>
                        ) : (
                          <span className="text-xs text-gray-400">missing</span>
                        )}
                      </td>
                      <td className="border border-gray-300 p-2">
                        {candidate.phone ? (
                          <a 
                            href={`tel:${candidate.phone}`}
                            className="p-1 hover:bg-gray-200 rounded" 
                            title="Call"
                          >
                            <Phone className="w-4 h-4 text-gray-600" />
                          </a>
                        ) : (
                          <span className="text-xs text-gray-400">missing</span>
                        )}
                      </td>
                      <td className="border border-gray-300 p-2">
                        {candidate.email ? (
                          <a 
                            href={`mailto:${candidate.email}`}
                            className="p-1 hover:bg-gray-200 rounded" 
                            title="Email"
                          >
                            <Mail className="w-4 h-4 text-gray-600" />
                          </a>
                        ) : (
                          <span className="text-xs text-gray-400">missing</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              <div className="text-center">
                <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-lg font-medium">No candidates match the current search</p>
                <p className="text-sm text-gray-400 mt-1">Try clearing filters or picking a different folder.</p>
              </div>
            </div>
          )}
          
          {/* Pagination */}
          {totalCandidates > 0 && (
            <div className="border-t border-gray-200 p-4 bg-gray-50 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="text-sm text-gray-600">
                Showing {pageStart}-{pageEnd} of {totalCandidates} candidates. Page {currentPage} of {totalPages}.
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600 whitespace-nowrap">Rows per page</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                      scrollContentToTop();
                    }}
                    className="px-3 py-1 text-sm border border-gray-300 rounded bg-white"
                  >
                    {PAGE_SIZE_OPTIONS.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setCurrentPage(1);
                    scrollContentToTop();
                  }}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  First
                </button>
                <button
                  onClick={() => {
                    setCurrentPage((p) => Math.max(1, p - 1));
                    scrollContentToTop();
                  }}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="px-3 py-1 text-sm text-gray-700">
                  {currentPage}
                </span>
                <button
                  onClick={() => {
                    setCurrentPage((p) => Math.min(totalPages, p + 1));
                    scrollContentToTop();
                  }}
                  disabled={currentPage >= totalPages}
                  className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
                <button
                  onClick={() => {
                    setCurrentPage(totalPages);
                    scrollContentToTop();
                  }}
                  disabled={currentPage >= totalPages}
                  className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Last
                </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
        </div>
        </div>
        </div>
      {/* Floating horizontal scrollbar — fixed at viewport bottom, visible whenever table is on screen */}
      {floatBarVisible && (
        <div
          ref={floatBarRef}
          style={{
            position: 'fixed',
            bottom: 14,
            zIndex: 60,
            height: 18,
            borderRadius: 9,
            overflowX: 'scroll',
            overflowY: 'hidden',
            background: 'rgba(209, 213, 219, 0.92)',
            backdropFilter: 'blur(6px)',
            boxShadow: '0 4px 14px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.07)',
          }}
        >
          <div ref={floatBarInnerRef} style={{ height: '1px', minWidth: '1100px' }} />
        </div>
      )}

      <Toaster position="top-right" richColors closeButton />

          {/* Send to Employer Modal */}
          <SendToEmployerModal
            isOpen={showSendModal}
            onClose={() => setShowSendModal(false)}
            selectedCandidateIds={Array.from(selectedCandidates)}
            candidates={filteredCandidates}
          />
    </div>
  );
}
