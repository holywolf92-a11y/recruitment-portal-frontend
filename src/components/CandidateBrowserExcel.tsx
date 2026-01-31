import { useState, useEffect, useMemo, useCallback } from 'react';
import { 
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
  Calendar,
  X,
  ChevronUp,
  ChevronDown as ChevronDownIcon,
  GripVertical,
  Settings,
  ExternalLink,
  LayoutDashboard
} from 'lucide-react';
import { API_BASE_URL } from '../lib/apiClient';
import { toast } from 'sonner';
import { Toaster } from './ui/sonner';
import { apiClient, Candidate, CandidateFilters } from '../lib/apiClient';
import { useCandidates } from '../lib/candidateContext';

interface FolderNode {
  id: string;
  name: string;
  type: 'profession' | 'smart-folder' | 'subfolder';
  icon: any;
  children?: FolderNode[];
  filter?: (candidates: Candidate[]) => Candidate[];
}

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
  const baseUrl = typeof window !== 'undefined' 
    ? window.location.origin 
    : 'https://exquisite-surprise-production.up.railway.app';
  return `${baseUrl}/profile/${candidateId}/${slug}`;
}

// Helper function to generate CV download link (backend redirect)
function generateCVShareLink(candidate: Candidate): string {
  const candidateId = candidate.id || '';
  const apiBaseUrl = API_BASE_URL.replace(/\/$/, '');
  return `${apiBaseUrl}/cv-generator/${candidateId}/download?format=employer-safe&force=true`;
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

// Build folder structure dynamically from actual candidate data
function buildFolderStructure(candidates: Candidate[]): FolderNode[] {
  // Get unique positions
  const positions = Array.from(new Set(
    candidates
      .map(c => c.position)
      .filter(Boolean) as string[]
  )).sort();

  if (positions.length === 0) {
    return [];
  }

  return positions.map(position => {
    const positionLower = position.toLowerCase();
    
    // Get unique countries for this position
    const countries = Array.from(new Set(
      candidates
        .filter(c => c.position?.toLowerCase() === positionLower && c.country_of_interest)
        .map(c => c.country_of_interest!)
    )).sort();

    // Get unique statuses for this position
    const statuses = Array.from(new Set(
      candidates
        .filter(c => c.position?.toLowerCase() === positionLower && c.status)
        .map(c => c.status!)
    )).sort();

    return {
      id: `profession-${positionLower.replace(/\s+/g, '-')}`,
      name: position,
      type: 'profession' as const,
      icon: Users,
      children: [
        // "All" folder
        {
          id: `${positionLower.replace(/\s+/g, '-')}-all`,
          name: 'All',
          type: 'smart-folder' as const,
          icon: Users,
          filter: (candidates) => candidates.filter(c => 
            c.position?.toLowerCase() === positionLower
          )
        },
        // "By Country" folder
        {
          id: `${positionLower.replace(/\s+/g, '-')}-by-country`,
          name: 'By Country',
          type: 'smart-folder' as const,
          icon: MapPin,
          children: countries.map(country => ({
            id: `${positionLower.replace(/\s+/g, '-')}-${country.toLowerCase().replace(/\s+/g, '-')}`,
            name: country,
            type: 'subfolder' as const,
            icon: MapPin,
            filter: (candidates) => candidates.filter(c => 
              c.position?.toLowerCase() === positionLower && 
              c.country_of_interest === country
            )
          }))
        },
        // "By Status" folder
        {
          id: `${positionLower.replace(/\s+/g, '-')}-by-status`,
          name: 'By Status',
          type: 'smart-folder' as const,
          icon: CheckCircle,
          children: statuses.map(status => ({
            id: `${positionLower.replace(/\s+/g, '-')}-${status.toLowerCase().replace(/\s+/g, '-')}`,
            name: status,
            type: 'subfolder' as const,
            icon: CheckCircle,
            filter: (candidates) => candidates.filter(c => 
              c.position?.toLowerCase() === positionLower && 
              c.status === status
            )
          }))
        },
        // "By Documents" folder
        {
          id: `${positionLower.replace(/\s+/g, '-')}-by-documents`,
          name: 'By Documents',
          type: 'smart-folder' as const,
          icon: FileText,
          children: [
            {
              id: `${positionLower.replace(/\s+/g, '-')}-complete`,
              name: 'Complete',
              type: 'subfolder' as const,
              icon: FileText,
              filter: (candidates) => candidates.filter(c => 
                c.position?.toLowerCase() === positionLower && 
                c.cv_received && c.passport_received
              )
            },
            {
              id: `${positionLower.replace(/\s+/g, '-')}-missing`,
              name: 'Missing',
              type: 'subfolder' as const,
              icon: FileText,
              filter: (candidates) => candidates.filter(c => 
                c.position?.toLowerCase() === positionLower && 
                (!c.cv_received || !c.passport_received)
              )
            }
          ]
        }
      ]
    };
  });
}

export function CandidateBrowserExcel() {
  // Server-side filtering state
  const [filters, setFilters] = useState<CandidateFilters>({
    limit: 50,
    offset: 0,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [appliedFrom, setAppliedFrom] = useState<string>('');
  const [appliedTo, setAppliedTo] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCandidates, setTotalCandidates] = useState(0);
  const [dailyStats, setDailyStats] = useState<{
    total: number;
    applied: number;
    verified: number;
    pending: number;
    rejected: number;
    documents_uploaded: number;
  } | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<string>('all');
  
  
  // Use shared candidate context (but we'll override with server-side fetching)
  const { 
    candidates: contextCandidates, 
    loading: contextLoading, 
    error: contextError, 
    fetchCandidates: contextFetchCandidates,
  } = useCandidates();
  
  // Local state for server-fetched candidates
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [allCandidatesForNavigation, setAllCandidatesForNavigation] = useState<Candidate[]>([]); // Keep all candidates for folder structure
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Debounced search state
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [selectedFolder, setSelectedFolder] = useState<FolderNode | null>(null);
  const [selectedCandidates, setSelectedCandidates] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'basic' | 'detailed'>('basic');
  const [professionMode, setProfessionMode] = useState<string | null>(null);
  const [activeMenu, setActiveMenu] = useState<'dashboard' | 'browser'>('dashboard');

  // Debounce search input to prevent API spam
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      setCurrentPage(1); // Reset to first page when search changes
    }, 500); // Wait 500ms after user stops typing
    
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch candidates with server-side filtering
  const fetchCandidatesWithFilters = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const activeFilters: CandidateFilters = {
        ...filters,
        search: debouncedSearchQuery.trim() || undefined,
        applied_from: appliedFrom || undefined,
        applied_to: appliedTo || undefined,
        sort_by: sortBy,
        sort_order: sortOrder,
        limit: 50,
        offset: (currentPage - 1) * 50,
      };

      if (professionMode) {
        activeFilters.position = professionMode;
      }
      
      // Apply folder filters (position, country, status, documents)
      if (selectedFolder && !professionMode) {
        if (selectedFolder.type === 'profession' && selectedFolder.name !== 'all') {
          activeFilters.position = selectedFolder.name;
        } else if (selectedFolder.type === 'subfolder') {
          // Extract position from folder path
          const parent = folderStructure.find(f => 
            f.children?.some(c => c.id === selectedFolder.id || c.children?.some(sc => sc.id === selectedFolder.id))
          );
          if (parent) activeFilters.position = parent.name;
          
          // Check if it's a country subfolder
          if (selectedFolder.name && selectedFolder.name !== 'All') {
            const isCountry = folderStructure.some(f => 
              f.children?.find(c => c.name === 'By Country' && c.children?.some(sc => sc.id === selectedFolder.id))
            );
            if (isCountry) activeFilters.country_of_interest = selectedFolder.name;
            
            // Check if it's a status subfolder
            const isStatus = folderStructure.some(f => 
              f.children?.find(c => c.name === 'By Status' && c.children?.some(sc => sc.id === selectedFolder.id))
            );
            if (isStatus) activeFilters.status = selectedFolder.name;
            
            // Check if it's a documents subfolder
            const isDocs = folderStructure.some(f => 
              f.children?.find(c => c.name === 'By Documents' && c.children?.some(sc => sc.id === selectedFolder.id))
            );
            if (isDocs) {
              activeFilters.documents = selectedFolder.name === 'Complete' ? 'complete' : 'missing';
            }
          }
        }
      }

      if (!activeFilters.country_of_interest && selectedCountry !== 'all') {
        activeFilters.country_of_interest = selectedCountry;
      }
      
      const result = await apiClient.getCandidates(activeFilters);
      setCandidates(result.candidates || []);
      setTotalCandidates(result.total || 0);
    } catch (e: any) {
      setError(e?.message || 'Failed to load candidates');
    } finally {
      setLoading(false);
    }
  }, [filters, debouncedSearchQuery, appliedFrom, appliedTo, sortBy, sortOrder, currentPage, selectedFolder, selectedCountry]);

  // Fetch daily stats
  const fetchDailyStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const statsFilters: any = {
        search: searchQuery.trim() || undefined,
        applied_from: appliedFrom || undefined,
        applied_to: appliedTo || undefined,
      };
      
      // Apply folder filters
      if (selectedFolder) {
        const parent = folderStructure.find(f => 
          f.children?.some(c => c.id === selectedFolder.id || c.children?.some(sc => sc.id === selectedFolder.id))
        );
        if (parent) statsFilters.position = parent.name;
      }

      if (selectedCountry !== 'all') {
        statsFilters.country_of_interest = selectedCountry;
      }
      
      const stats = await apiClient.getDailyStats(statsFilters);
      setDailyStats(stats);
    } catch (e) {
      console.error('Failed to load daily stats:', e);
    } finally {
      setLoadingStats(false);
    }
  }, [searchQuery, appliedFrom, appliedTo, selectedFolder, selectedCountry]);

  // Fetch data when filters change
  useEffect(() => {
    fetchCandidatesWithFilters();
  }, [fetchCandidatesWithFilters]);

  // Fetch all candidates once on mount for folder structure (no filters)
  useEffect(() => {
    const fetchAllCandidates = async () => {
      try {
        const result = await apiClient.getCandidates({ limit: 5000 });
        setAllCandidatesForNavigation(result.candidates || []);
      } catch (e) {
        console.error('Failed to load candidates for navigation:', e);
      }
    };
    fetchAllCandidates();
  }, []);

  useEffect(() => {
    fetchDailyStats();
  }, [fetchDailyStats]);

  // Build folder structure from all candidates (for navigation only)
  const folderStructure = useMemo(() => {
    // Use all candidates for folder structure, not filtered ones
    return buildFolderStructure(allCandidatesForNavigation);
  }, [allCandidatesForNavigation]);

  const countryOptions = useMemo(() => {
    const unique = new Set<string>();
    allCandidatesForNavigation.forEach(candidate => {
      const country = (candidate.country_of_interest || candidate.country || '').trim();
      if (country) unique.add(country);
    });
    return Array.from(unique).sort((a, b) => a.localeCompare(b));
  }, [allCandidatesForNavigation]);

  // Set default selected folder when structure is built
  useEffect(() => {
    if (folderStructure.length > 0 && !selectedFolder) {
      const firstFolder = folderStructure[0].children?.[0];
      if (firstFolder) {
        setSelectedFolder(firstFolder);
        setExpandedFolders(new Set([folderStructure[0].id]));
      }
    }
  }, [folderStructure, selectedFolder]);

  const toggleFolder = (folderId: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  const selectFolder = (folder: FolderNode) => {
    setSelectedFolder(folder);
    setSelectedCandidates(new Set());
    setCurrentPage(1); // Reset to first page when folder changes
  };

  const renderFolder = (folder: FolderNode, level: number = 0) => {
    const isExpanded = expandedFolders.has(folder.id);
    const isSelected = selectedFolder?.id === folder.id;
    const hasChildren = folder.children && folder.children.length > 0;
    const Icon = folder.icon;

    const paddingLeft = level * 20 + 12;

    // Calculate candidate count for this folder
    const candidateCount = folder.filter ? folder.filter(candidates).length : 0;

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

          {folder.filter && (
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

  // Filter candidates based on selected folder
  const displayedCandidates = useMemo(() => {
    if (activeMenu === 'dashboard') {
      return candidates;
    }
    if (!selectedFolder || !selectedFolder.filter) {
      return candidates;
    }
    return selectedFolder.filter(candidates);
  }, [activeMenu, candidates, selectedFolder]);

  const filteredCandidates = useMemo(() => {
    if (selectedCountry === 'all') {
      return displayedCandidates;
    }
    return displayedCandidates.filter(candidate => {
      const country = (candidate.country_of_interest || candidate.country || '').trim();
      return country === selectedCountry;
    });
  }, [displayedCandidates, selectedCountry]);
  
  const [quickDateFilter, setQuickDateFilter] = useState<'today' | 'yesterday' | '7days' | '30days' | null>('30days');

  // Quick date filters
  const applyQuickDateFilter = useCallback((key: 'today' | 'yesterday' | '7days' | '30days') => {
    const daysMap: Record<'today' | 'yesterday' | '7days' | '30days', number> = {
      today: 0,
      yesterday: 1,
      '7days': 7,
      '30days': 30,
    };
    const today = new Date();
    const from = new Date(today);
    from.setDate(from.getDate() - daysMap[key]);
    setAppliedFrom(from.toISOString().split('T')[0]);
    setAppliedTo(today.toISOString().split('T')[0]);
    setQuickDateFilter(key);
  }, []);

  useEffect(() => {
    if (!appliedFrom && !appliedTo) {
      applyQuickDateFilter('30days');
      setSortBy('created_at');
      setSortOrder('desc');
    }
  }, [appliedFrom, appliedTo, applyQuickDateFilter]);
  
  // Export function
  const handleExport = async (format: 'csv' | 'xlsx') => {
    try {
      const activeFilters: CandidateFilters = {
        search: searchQuery.trim() || undefined,
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading candidates...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="bg-white border border-red-200 rounded-lg p-6 text-center">
          <h3 className="text-lg font-medium text-red-900 mb-2">Failed to load candidates</h3>
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-4">
      <aside className="w-80 bg-white rounded-lg border border-gray-200 overflow-hidden flex flex-col shadow-sm sticky top-24 self-start max-h-[calc(100vh-120px)]">
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
            onClick={() => setActiveMenu('browser')}
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
              <span>Total Candidates:</span>
              <span className="font-semibold text-gray-900">{candidates.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Showing:</span>
              <span className="font-semibold text-blue-600">{filteredCandidates.length}</span>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex-1 space-y-4">
      {activeMenu === 'browser' ? (
        <section className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm flex items-center justify-between">
          <div>
            <button
              onClick={() => {
                setActiveMenu('dashboard');
                setProfessionMode(null);
                setSelectedFolder(null);
              }}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              ← Back to Dashboard
            </button>
            <h2 className="text-2xl font-semibold text-gray-900 mt-2">{professionMode || 'Candidate Browser'}</h2>
            <p className="text-sm text-gray-600">Showing {filteredCandidates.length} candidates</p>
          </div>
        </section>
      ) : (
        <>
          {/* Header Section */}
          <section className="mb-4">
            <h1 className="text-3xl font-bold text-gray-900">Candidate Browser</h1>
            <p className="text-gray-600 mt-2">Browse and manage all candidates with advanced filters and professional organization.</p>
          </section>

          {/* KPI Cards Section */}
          {dailyStats && (
            <div className="flex gap-4 overflow-x-auto pb-2">
              <div className="min-w-[220px] flex-1 bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 rounded-lg p-4 shadow-sm">
                <div className="text-sm font-medium text-slate-700">Total Applied</div>
                <div className="text-2xl font-bold text-slate-900 mt-1">{dailyStats.total}</div>
                <div className="text-xs text-slate-600 mt-2">All candidates in system</div>
              </div>
              
              <div className="min-w-[220px] flex-1 bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-4 shadow-sm">
                <div className="text-sm font-medium text-blue-700">Applied</div>
                <div className="text-2xl font-bold text-blue-900 mt-1">{dailyStats.applied}</div>
                <div className="text-xs text-blue-600 mt-2">Awaiting review</div>
              </div>
              
              <div className="min-w-[220px] flex-1 bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg p-4 shadow-sm">
                <div className="text-sm font-medium text-green-700">Verified</div>
                <div className="text-2xl font-bold text-green-900 mt-1">{dailyStats.verified}</div>
                <div className="text-xs text-green-600 mt-2">Approved candidates</div>
              </div>
              
              <div className="min-w-[220px] flex-1 bg-gradient-to-br from-yellow-50 to-yellow-100 border border-yellow-200 rounded-lg p-4 shadow-sm">
                <div className="text-sm font-medium text-yellow-700">Pending</div>
                <div className="text-2xl font-bold text-yellow-900 mt-1">{dailyStats.pending}</div>
                <div className="text-xs text-yellow-600 mt-2">Under processing</div>
              </div>
              
              <div className="min-w-[220px] flex-1 bg-gradient-to-br from-red-50 to-red-100 border border-red-200 rounded-lg p-4 shadow-sm">
                <div className="text-sm font-medium text-red-700">Rejected</div>
                <div className="text-2xl font-bold text-red-900 mt-1">{dailyStats.rejected}</div>
                <div className="text-xs text-red-600 mt-2">Not qualified</div>
              </div>
            </div>
          )}

          {/* Filters Section */}
          <section className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
              <p className="text-sm text-gray-600 mt-1">{filteredCandidates.length} candidates found</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
          {/* Search Column */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Name / Passport / CNIC / Phone..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Date Range Column */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Date Range</label>
            <div className="flex gap-2">
              <input
                type="date"
                value={appliedFrom}
                onChange={(e) => {
                  setAppliedFrom(e.target.value);
                  setCurrentPage(1);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
              <input
                type="date"
                value={appliedTo}
                onChange={(e) => {
                  setAppliedTo(e.target.value);
                  setCurrentPage(1);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
          </div>

          {/* Country Filter Column */}
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
              {countryOptions.map(country => (
                <option key={country} value={country}>{country}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Quick Filters and Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => applyQuickDateFilter('today')}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                quickDateFilter === 'today'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => applyQuickDateFilter('yesterday')}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                quickDateFilter === 'yesterday'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Yesterday
            </button>
            <button
              onClick={() => applyQuickDateFilter('7days')}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                quickDateFilter === '7days'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Last 7 Days
            </button>
            <button
              onClick={() => applyQuickDateFilter('30days')}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                quickDateFilter === '30days'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Last 30 Days
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchCandidatesWithFilters}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Apply Filters
            </button>
            {(appliedFrom || appliedTo || selectedCountry !== 'all' || searchQuery) && (
              <button
                onClick={() => {
                  setAppliedFrom('');
                  setAppliedTo('');
                  setSelectedCountry('all');
                  setSearchQuery('');
                  setCurrentPage(1);
                }}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>
          </section>
        </>
      )}

      {/* Browser Section */}
      <section className={`${activeMenu === 'browser' ? 'h-[calc(100vh-200px)]' : 'h-[calc(100vh-320px)]'}`}>
      {/* Right Side - Excel Table */}
      <div className="flex-1 bg-white rounded-lg border border-gray-200 overflow-hidden flex flex-col shadow-sm">
        {/* Table Header Actions */}
        <div className="border-b border-gray-200 p-4 bg-gray-50 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900">{selectedFolder?.name || 'Select a folder'}</h3>
              <p className="text-sm text-gray-600">
                Showing {filteredCandidates.length} of {totalCandidates} candidates
                {debouncedSearchQuery && ` (filtered by "${debouncedSearchQuery}")`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {selectedCandidates.size > 0 && (
                <span className="text-sm text-blue-600 font-medium">
                  {selectedCandidates.size} selected
                </span>
              )}
              <div className="flex gap-1 bg-gray-200 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('basic')}
                  className={`px-3 py-1 text-xs rounded transition-colors ${
                    viewMode === 'basic' ? 'bg-white text-gray-900 shadow' : 'text-gray-600'
                  }`}
                >
                  Basic View
                </button>
                <button
                  onClick={() => setViewMode('detailed')}
                  className={`px-3 py-1 text-xs rounded transition-colors ${
                    viewMode === 'detailed' ? 'bg-white text-gray-900 shadow' : 'text-gray-600'
                  }`}
                >
                  Detailed View
                </button>
              </div>
              <div className="relative">
                <button
                  onClick={() => handleExport('xlsx')}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Export Excel
                </button>
              </div>
              <button
                onClick={() => handleExport('csv')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
            </div>
          </div>
        </div>

        {/* Excel-like Table */}
        <div className="flex-1 overflow-auto">
          {filteredCandidates.length > 0 ? (
            <table className="w-full border-collapse">
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
                  <th className="border border-gray-300 p-2 text-left text-xs font-semibold text-gray-700 bg-gray-100">AI Score</th>
                  
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
                      <td className="border border-gray-300 p-2 text-xs font-mono text-gray-600">{candidate.candidate_code || candidate.id}</td>
                      <td className="border border-gray-300 p-2 text-sm font-medium text-gray-900">{candidate.name || 'missing'}</td>
                      <td className="border border-gray-300 p-2 text-sm text-gray-700">{candidate.position || 'missing'}</td>
                      <td className="border border-gray-300 p-2 text-sm text-gray-700 text-center">{age !== null ? age : 'missing'}</td>
                      <td className="border border-gray-300 p-2 text-sm text-gray-700">{candidate.nationality || 'missing'}</td>
                      <td className="border border-gray-300 p-2 text-sm text-gray-700">{candidate.country_of_interest || 'missing'}</td>
                      <td className="border border-gray-300 p-2 text-sm text-gray-700">{candidate.phone || 'missing'}</td>
                      <td className="border border-gray-300 p-2 text-sm text-gray-700">{candidate.email || 'missing'}</td>
                      <td className="border border-gray-300 p-2 text-sm text-gray-700 text-center">{candidate.experience_years ? `${candidate.experience_years}y` : 'missing'}</td>
                      <td className="border border-gray-300 p-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          candidate.status === 'Applied' ? 'bg-blue-100 text-blue-700' :
                          candidate.status === 'Pending' ? 'bg-yellow-100 text-yellow-700' :
                          candidate.status === 'Deployed' ? 'bg-green-100 text-green-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {candidate.status || 'missing'}
                        </span>
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
                        <a
                          href={generateCVShareLink(candidate)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-2 px-3 py-1.5 text-purple-600 hover:text-purple-800 hover:underline transition-colors group"
                          title="Click to open employer CV (Right-click to copy link)"
                          onClick={(e) => {
                            e.stopPropagation();
                            toast.info('Opening Employer CV...');
                          }}
                          onContextMenu={async (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            try {
                              await copyToClipboard(generateCVShareLink(candidate));
                              toast.success('CV link copied to clipboard!');
                            } catch (err) {
                              toast.error('Failed to copy link');
                            }
                          }}
                        >
                          <FileText className="w-4 h-4 group-hover:scale-110 transition-transform flex-shrink-0" />
                          <span className="text-xs font-medium underline">View CV</span>
                          <ExternalLink className="w-3 h-3 opacity-60" />
                        </a>
                      </td>
                      <td className="border border-gray-300 p-2">
                        <span className="text-xs text-gray-400">missing</span>
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
                <p className="text-lg font-medium">No candidates in this folder</p>
                <p className="text-sm text-gray-400 mt-1">Try selecting a different folder</p>
              </div>
            </div>
          )}
          
          {/* Pagination */}
          {totalCandidates > 0 && (
            <div className="border-t border-gray-200 p-4 bg-gray-50 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Page {currentPage} of {Math.ceil(totalCandidates / 50)} ({totalCandidates} total)
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  First
                </button>
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="px-3 py-1 text-sm text-gray-700">
                  {currentPage}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(Math.ceil(totalCandidates / 50), p + 1))}
                  disabled={currentPage >= Math.ceil(totalCandidates / 50)}
                  className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
                <button
                  onClick={() => setCurrentPage(Math.ceil(totalCandidates / 50))}
                  disabled={currentPage >= Math.ceil(totalCandidates / 50)}
                  className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Last
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      </section>
      </div>
      <Toaster position="top-right" richColors closeButton />
    </div>
  );
}
