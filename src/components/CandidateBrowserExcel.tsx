import { useState, useEffect, useMemo } from 'react';
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
  Eye
} from 'lucide-react';
import { apiClient, Candidate } from '../lib/apiClient';
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

// Helper function to generate profile link
function generateProfileLink(candidate: Candidate): string {
  const slug = candidate.name.toLowerCase().replace(/\s+/g, '-');
  return `https://falisha.com/profile/${candidate.id}/${slug}`;
}

// Helper function to generate CV share link
function generateCVShareLink(candidate: Candidate): string {
  const slug = candidate.name.toLowerCase().replace(/\s+/g, '-');
  return `https://falisha.com/cv/${candidate.id}/${slug}`;
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
  // Use shared candidate context
  const { 
    candidates, 
    loading, 
    error, 
    fetchCandidates,
    refreshCandidates 
  } = useCandidates();
  
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [selectedFolder, setSelectedFolder] = useState<FolderNode | null>(null);
  const [selectedCandidates, setSelectedCandidates] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'basic' | 'detailed'>('basic');

  // Build folder structure from candidates
  const folderStructure = useMemo(() => {
    return buildFolderStructure(candidates);
  }, [candidates]);

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

  // Load candidates on mount (only if not already loaded)
  useEffect(() => {
    // Only fetch if we don't have candidates yet (to avoid unnecessary refetch)
    if (candidates.length === 0 && !loading) {
      fetchCandidates();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

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

  const displayedCandidates = selectedFolder?.filter 
    ? selectedFolder.filter(candidates) 
    : [];

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
    if (selectedCandidates.size === displayedCandidates.length) {
      setSelectedCandidates(new Set());
    } else {
      setSelectedCandidates(new Set(displayedCandidates.map(c => c.id)));
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
    <div className="flex h-[calc(100vh-125px)] gap-4 p-6">
      {/* Left Sidebar - Folder Tree */}
      <div className="w-80 bg-white rounded-lg border border-gray-200 overflow-hidden flex flex-col shadow-sm">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 flex-shrink-0">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Folder className="w-5 h-5" />
            Candidate Browser
          </h2>
          <p className="text-xs text-blue-100 mt-1">Select a folder to view candidates</p>
        </div>

        <div className="flex-1 overflow-y-auto">
          {folderStructure.length > 0 ? (
            folderStructure.map(folder => renderFolder(folder))
          ) : (
            <div className="p-4 text-center text-gray-500 text-sm">
              No candidates found
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
              <span className="font-semibold text-blue-600">{displayedCandidates.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Excel Table */}
      <div className="flex-1 bg-white rounded-lg border border-gray-200 overflow-hidden flex flex-col shadow-sm">
        {/* Header */}
        <div className="border-b border-gray-200 p-4 bg-gray-50 flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-semibold text-gray-900">{selectedFolder?.name || 'Select a folder'}</h3>
              <p className="text-sm text-gray-600">{displayedCandidates.length} candidates</p>
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
              <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm flex items-center gap-2">
                <Download className="w-4 h-4" />
                Export to Excel
              </button>
            </div>
          </div>
        </div>

        {/* Excel-like Table */}
        <div className="flex-1 overflow-auto">
          {displayedCandidates.length > 0 ? (
            <table className="w-full border-collapse">
              <thead className="bg-gray-100 sticky top-0 z-10">
                <tr>
                  <th className="border border-gray-300 p-2 text-left bg-gray-100">
                    <input
                      type="checkbox"
                      checked={selectedCandidates.size === displayedCandidates.length && displayedCandidates.length > 0}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 cursor-pointer"
                    />
                  </th>
                  {/* Basic columns */}
                  <th className="border border-gray-300 p-2 text-left text-xs font-semibold text-gray-700 bg-gray-100">ID</th>
                  <th className="border border-gray-300 p-2 text-left text-xs font-semibold text-gray-700 bg-gray-100">Name</th>
                  <th className="border border-gray-300 p-2 text-left text-xs font-semibold text-gray-700 bg-gray-100">Position</th>
                  <th className="border border-gray-300 p-2 text-left text-xs font-semibold text-gray-700 bg-gray-100">Age</th>
                  <th className="border border-gray-300 p-2 text-left text-xs font-semibold text-gray-700 bg-gray-100">Nationality</th>
                  <th className="border border-gray-300 p-2 text-left text-xs font-semibold text-gray-700 bg-gray-100">Country</th>
                  <th className="border border-gray-300 p-2 text-left text-xs font-semibold text-gray-700 bg-gray-100">Phone</th>
                  <th className="border border-gray-300 p-2 text-left text-xs font-semibold text-gray-700 bg-gray-100">Email</th>
                  <th className="border border-gray-300 p-2 text-left text-xs font-semibold text-gray-700 bg-gray-100">Experience</th>
                  <th className="border border-gray-300 p-2 text-left text-xs font-semibold text-gray-700 bg-gray-100">Status</th>
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
                  
                  <th className="border border-gray-300 p-2 text-left text-xs font-semibold text-gray-700 bg-gray-100">Applied</th>
                  
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
                {displayedCandidates.map((candidate, index) => {
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
                          <td className="border border-gray-300 p-2 text-sm text-gray-700">missing</td>
                          <td className="border border-gray-300 p-2 text-sm text-gray-700">{candidate.marital_status || 'missing'}</td>
                          <td className="border border-gray-300 p-2 text-sm text-gray-700">missing</td>
                          <td className="border border-gray-300 p-2 text-xs text-gray-700">missing</td>
                          <td className="border border-gray-300 p-2 text-xs text-gray-700">missing</td>
                          <td className="border border-gray-300 p-2 text-xs font-mono text-gray-700">{candidate.passport || 'missing'}</td>
                          <td className="border border-gray-300 p-2 text-xs text-gray-700">{passportExpiry}</td>
                          <td className="border border-gray-300 p-2 text-xs text-gray-700">missing</td>
                          <td className="border border-gray-300 p-2 text-xs text-gray-700">missing</td>
                          <td className="border border-gray-300 p-2 text-sm text-center text-gray-700">missing</td>
                          <td className="border border-gray-300 p-2 text-xs text-gray-700">{englishLevel}</td>
                          <td className="border border-gray-300 p-2 text-xs text-gray-700">{arabicLevel}</td>
                          <td className="border border-gray-300 p-2 text-xs text-gray-700">{candidate.address || 'missing'}</td>
                        </>
                      )}
                      
                      <td className="border border-gray-300 p-2 text-sm text-gray-700">{appliedDate}</td>
                      
                      {/* Separate columns for each link/action */}
                      <td className="border border-gray-300 p-2">
                        <button 
                          className="p-1 hover:bg-blue-100 rounded group relative" 
                          title="Copy Profile Link"
                          onClick={async () => {
                            try {
                              await copyToClipboard(generateProfileLink(candidate));
                              alert('Profile link copied!');
                            } catch (err) {
                              alert('Failed to copy link');
                            }
                          }}
                        >
                          <Globe className="w-4 h-4 text-blue-600" />
                        </button>
                      </td>
                      <td className="border border-gray-300 p-2">
                        <button 
                          className="p-1 hover:bg-purple-100 rounded" 
                          title="Copy CV Share Link"
                          onClick={async () => {
                            try {
                              await copyToClipboard(generateCVShareLink(candidate));
                              alert('CV link copied!');
                            } catch (err) {
                              alert('Failed to copy link');
                            }
                          }}
                        >
                          <FileText className="w-4 h-4 text-purple-600" />
                        </button>
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
        </div>
      </div>
    </div>
  );
}
