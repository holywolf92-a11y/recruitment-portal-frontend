import { useEffect, useState, useRef } from 'react';
import { apiClient, Candidate } from '../lib/apiClient';
import { 
  User, Briefcase, Calendar, FileText, 
  Globe, Download, Star, CheckCircle, XCircle, Loader,
  ArrowLeft, Share2, Copy, Shield, Award, MapPin, Languages
} from 'lucide-react';
import { toast } from 'sonner';

interface Document {
  id: string;
  file_name: string;
  category: string;
  verification_status: string;
  document_type?: string;
}

export function PublicCandidateProfile() {
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [downloadingCV, setDownloadingCV] = useState(false);
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const employerCVRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Extract candidate ID from URL path: /profile/:id/:slug
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
    console.log('[PublicCandidateProfile] Current path:', currentPath);
    
    const pathMatch = currentPath.match(/^\/profile\/([^\/]+)/);
    console.log('[PublicCandidateProfile] Path match:', pathMatch);
    
    const candidateId = pathMatch ? pathMatch[1] : null;
    console.log('[PublicCandidateProfile] Extracted candidate ID:', candidateId);

    if (!candidateId) {
      console.error('[PublicCandidateProfile] No candidate ID found in URL');
      setError('Invalid candidate ID in URL');
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        console.log('[PublicCandidateProfile] Fetching candidate:', candidateId);
        const data = await apiClient.getCandidate(candidateId);
        console.log('[PublicCandidateProfile] Candidate loaded:', data?.name);
        setCandidate(data);
        setError(null);

        // Fetch verified/approved documents
        setLoadingDocuments(true);
        try {
          const docs = await apiClient.listCandidateDocumentsNew(candidateId);
          console.log('[PublicCandidateProfile] All documents:', docs);
          // Filter only verified/approved documents AND exclude CV/resume documents
          // (CV should only be accessible via Employer-Safe CV download, not original CV)
          const verifiedDocs = docs.filter((doc: any) => {
            const isVerified = doc.verification_status === 'verified' || doc.verification_status === 'approved';
            if (!isVerified) return false;
            
            // Exclude CV/resume documents - these are classified and should not be downloadable
            const category = (doc.category || '').toLowerCase();
            const docType = (doc.document_type || '').toLowerCase();
            const fileName = (doc.file_name || '').toLowerCase();
            
            const isCV = category === 'cv' || 
                        category === 'resume' ||
                        docType === 'cv' || 
                        docType === 'resume' ||
                        fileName.includes('cv') ||
                        fileName.includes('resume');
            
            return !isCV; // Only include non-CV documents
          });
          console.log('[PublicCandidateProfile] Verified documents (excluding CV):', verifiedDocs);
          setDocuments(verifiedDocs);
          console.log('[PublicCandidateProfile] Documents loaded:', verifiedDocs.length);
        } catch (docError: any) {
          console.error('[PublicCandidateProfile] Failed to load documents:', docError);
          // Don't fail the whole page if documents fail
          setDocuments([]);
        } finally {
          setLoadingDocuments(false);
        }
      } catch (err: any) {
        console.error('[PublicCandidateProfile] Failed to load candidate:', err);
        if (err?.message?.includes('404') || err?.message?.includes('not found') || err?.message?.includes('PGRST116')) {
          setError('This candidate profile is not available or has been removed.');
        } else {
          setError(err?.message || 'Failed to load candidate profile. Please check the link and try again.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const copyProfileLink = async () => {
    if (candidate && window.location.href) {
      try {
        await navigator.clipboard.writeText(window.location.href);
        toast.success('Profile link copied to clipboard!');
      } catch (err) {
        toast.error('Failed to copy link');
      }
    }
  };

  const handleDownloadCV = async () => {
    if (!candidate) {
      toast.error('Candidate information not available.');
      return;
    }
    
    try {
      setDownloadingCV(true);
      
      // Use backend CV generation service
      const result = await apiClient.generateCandidateCV(candidate.id, 'employer-safe', false);
      
      if (result.cached) {
        toast.success('Downloading cached CV...');
      } else {
        toast.success('CV generated successfully! Downloading...');
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
      link.download = `${candidate.name || 'Candidate'}_Employer_CV.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('Employer CV downloaded successfully!');
    } catch (err: any) {
      console.error('[PublicCandidateProfile] Failed to download Employer CV:', err);
      
      // Provide specific error messages
      if (err?.message?.includes('404') || err?.message?.includes('not found')) {
        toast.error('CV not found. Please ensure candidate information is complete.');
      } else if (err?.message?.includes('timeout') || err?.message?.includes('time')) {
        toast.error('CV generation timed out. Please try again.');
      } else if (err?.message?.includes('network') || err?.message?.includes('fetch')) {
        toast.error('Network error. Please check your connection and try again.');
      } else {
        toast.error(err?.message || 'Failed to download Employer CV. Please try again.');
      }
    } finally {
      setDownloadingCV(false);
    }
  };

  const handleDownloadDocument = async (documentId: string, fileName: string) => {
    try {
      const result = await apiClient.getCandidateDocumentDownload(documentId);
      
      // Download the file
      const response = await fetch(result.download_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast.success('Document downloaded successfully!');
    } catch (err: any) {
      console.error('Failed to download document:', err);
      toast.error(err?.message || 'Failed to download document. Please try again.');
    }
  };

  const handleDownloadAll = async () => {
    if (documents.length === 0) {
      toast.error('No documents available to download');
      return;
    }

    try {
      setDownloadingAll(true);
      
      // Dynamic import JSZip
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();

      // Download all documents and add to ZIP
      const downloadPromises = documents.map(async (doc) => {
        try {
          const result = await apiClient.getCandidateDocumentDownload(doc.id);
          const response = await fetch(result.download_url);
          const blob = await response.blob();
          zip.file(doc.file_name || `document_${doc.id}`, blob);
        } catch (err) {
          console.error(`Failed to download document ${doc.id}:`, err);
          // Continue with other documents even if one fails
        }
      });

      await Promise.all(downloadPromises);

      // Generate ZIP file
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = window.URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${candidate?.name || 'candidate'}_documents.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success('All documents downloaded as ZIP!');
    } catch (err: any) {
      console.error('Failed to download all documents:', err);
      toast.error(err?.message || 'Failed to create ZIP file. Please try again.');
    } finally {
      setDownloadingAll(false);
    }
  };

  // Helper to parse skills string to array
  const parseSkills = (skills?: string): string[] => {
    if (!skills) return [];
    try {
      // Try parsing as JSON first
      const parsed = JSON.parse(skills);
      if (Array.isArray(parsed)) return parsed;
      return [];
    } catch {
      // If not JSON, split by comma or semicolon
      return skills.split(/[,;]/).map(s => s.trim()).filter(Boolean);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader className="w-12 h-12 text-slate-700 animate-spin mx-auto mb-3" />
          <p className="text-gray-600 text-sm">Loading candidate profile...</p>
        </div>
      </div>
    );
  }

  if (error || !candidate) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg border border-gray-200 p-8 max-w-md w-full text-center">
          <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Profile Not Found</h2>
          <p className="text-gray-600 text-sm mb-6">{error || 'The candidate profile you are looking for does not exist.'}</p>
          <a
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800 transition-colors font-medium text-sm"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Go Back
          </a>
        </div>
      </div>
    );
  }

  const profileLink = window.location.href;
  const skillsArray = parseSkills(candidate.skills);
  
  // Check if CV is available in documents
  const cvDocument = documents.find((doc) => 
    doc.category?.toLowerCase() === 'cv' || 
    doc.document_type?.toLowerCase() === 'cv' ||
    doc.category?.toLowerCase() === 'resume' ||
    doc.document_type?.toLowerCase() === 'resume'
  );
  const hasCV = !!cvDocument || candidate.cv_received;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - Minimalist */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="w-10 h-10 bg-slate-700 rounded-lg flex items-center justify-center text-white font-semibold text-lg flex-shrink-0">
                {candidate.name?.charAt(0) || '?'}
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 truncate">{candidate.name || 'Candidate'}</h1>
                <p className="text-xs sm:text-sm text-gray-500 truncate">{candidate.candidate_code || 'No Code'}</p>
              </div>
            </div>
            <button
              onClick={copyProfileLink}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800 transition-colors text-sm font-medium"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share Profile</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content - Minimalist */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Employer CV Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Employer-Safe CV Section */}
            <div ref={employerCVRef} className="bg-white rounded-lg border border-gray-200 p-6 sm:p-8">
              {/* CV Header Section - Minimalist */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8 pb-6 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-emerald-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Shield className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Employer-Safe CV</h2>
                    <p className="text-xs text-gray-500">Contact information protected</p>
                  </div>
                </div>
                <button
                  onClick={handleDownloadCV}
                  disabled={downloadingCV}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{downloadingCV ? 'Generating...' : 'Download CV'}</span>
                </button>
              </div>

              {/* Minimalist CV Header */}
              <div className="mb-8 pb-6 border-b border-gray-200">
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
                  {/* Simple Avatar */}
                  <div className="relative">
                    <div className="w-20 h-20 bg-slate-700 rounded-lg flex items-center justify-center text-white">
                      <span className="text-3xl font-semibold">{candidate.name?.charAt(0) || '?'}</span>
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 rounded-md border-2 border-white flex items-center justify-center">
                      <CheckCircle className="w-3.5 h-3.5 text-white" />
                    </div>
                  </div>
                  
                  {/* Name and Title */}
                  <div className="flex-1 text-center sm:text-left">
                    <h1 className="text-3xl font-semibold text-gray-900 mb-1">
                      {candidate.name || 'Candidate'}
                    </h1>
                    <p className="text-lg text-gray-600 mb-4">{candidate.position || 'Professional'}</p>
                    
                    {/* Info badges - subtle */}
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                      {candidate.nationality && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 rounded-md border border-gray-200">
                          <Globe className="w-3.5 h-3.5 text-gray-500" />
                          <span className="text-xs text-gray-700">{candidate.nationality}</span>
                        </div>
                      )}
                      {candidate.country_of_interest && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 rounded-md border border-gray-200">
                          <MapPin className="w-3.5 h-3.5 text-gray-500" />
                          <span className="text-xs text-gray-700">{candidate.country_of_interest}</span>
                        </div>
                      )}
                      {candidate.experience_years && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 rounded-md border border-gray-200">
                          <Calendar className="w-3.5 h-3.5 text-gray-500" />
                          <span className="text-xs text-gray-700">{candidate.experience_years} Years</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Minimalist Contact Protection Notice */}
              <div className="mb-8 p-4 bg-amber-50 border-l-2 border-amber-400 rounded">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-amber-100 rounded-md flex items-center justify-center flex-shrink-0">
                    <Shield className="w-4 h-4 text-amber-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-amber-900 text-sm mb-1">
                      Contact Information Protected
                    </h3>
                    <p className="text-xs text-amber-800 leading-relaxed">
                      For privacy, direct contact details have been removed. Please contact Falisha Manpower recruitment team.
                    </p>
                  </div>
                </div>
              </div>

              {/* Minimalist Stats Section */}
              <div className="mb-8">
                <div className="mb-5 pb-3 border-b border-gray-200 flex items-center gap-2">
                  <div className="w-7 h-7 bg-slate-700 rounded-md flex items-center justify-center">
                    <Briefcase className="w-4 h-4 text-white" />
                  </div>
                  <h2 className="text-lg font-semibold text-gray-900">Professional Overview</h2>
                </div>
                
                {/* Clean Stats Bars */}
                <div className="space-y-4 mb-6">
                  {candidate.experience_years && (
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-600" />
                          <span className="text-sm font-medium text-gray-700">Experience</span>
                        </div>
                        <span className="text-xl font-semibold text-gray-900">{candidate.experience_years} <span className="text-sm font-normal text-gray-600">years</span></span>
                      </div>
                      <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-slate-700 rounded-full"
                          style={{ width: `${Math.min((candidate.experience_years / 20) * 100, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                  
                  {candidate.ai_score != null && typeof candidate.ai_score === 'number' && (
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Star className="w-4 h-4 text-gray-600" />
                          <span className="text-sm font-medium text-gray-700">AI Match Score</span>
                        </div>
                        <span className="text-xl font-semibold text-gray-900">{candidate.ai_score.toFixed(1)} <span className="text-sm font-normal text-gray-600">/10</span></span>
                      </div>
                      <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-slate-700 rounded-full"
                          style={{ width: `${(candidate.ai_score / 10) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                  
                  {skillsArray.length > 0 && (
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Award className="w-4 h-4 text-gray-600" />
                          <span className="text-sm font-medium text-gray-700">Core Skills</span>
                        </div>
                        <span className="text-xl font-semibold text-gray-900">{skillsArray.length} <span className="text-sm font-normal text-gray-600">skills</span></span>
                      </div>
                      <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-slate-700 rounded-full"
                          style={{ width: `${Math.min((skillsArray.length / 15) * 100, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Professional Summary */}
                <div className="bg-gray-50 p-5 rounded-lg border border-gray-200">
                  {candidate.professional_summary ? (
                    <p className="text-gray-700 leading-relaxed whitespace-pre-wrap text-sm">{candidate.professional_summary}</p>
                  ) : (
                    <p className="text-gray-700 leading-relaxed text-sm">
                      Highly skilled <strong>{candidate.position || 'professional'}</strong> with <strong>{candidate.experience_years || 'extensive'}</strong> years of professional experience.
                      {skillsArray.length > 0 && ` Demonstrates strong expertise in ${skillsArray.slice(0, 3).join(', ')}, and more.`}
                      {candidate.country_of_interest && ` Seeking opportunities in ${candidate.country_of_interest} to contribute technical expertise and drive operational excellence.`}
                    </p>
                  )}
                </div>
              </div>

              {/* Minimalist Skills Section */}
              {skillsArray.length > 0 && (
                <div className="mb-8">
                  <div className="mb-5 pb-3 border-b border-gray-200 flex items-center gap-2">
                    <div className="w-7 h-7 bg-slate-700 rounded-md flex items-center justify-center">
                      <Award className="w-4 h-4 text-white" />
                    </div>
                    <h2 className="text-lg font-semibold text-gray-900">Core Skills</h2>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {skillsArray.map((skill, index) => (
                      <div
                        key={index}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-md hover:bg-gray-100 transition-colors"
                      >
                        <span className="text-sm text-gray-700">{skill}</span>
                        <CheckCircle className="w-3 h-3 text-emerald-600" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Minimalist Experience Section */}
              {candidate.position && (
                <div className="mb-8">
                  <div className="mb-5 pb-3 border-b border-gray-200 flex items-center gap-2">
                    <div className="w-7 h-7 bg-slate-700 rounded-md flex items-center justify-center">
                      <Briefcase className="w-4 h-4 text-white" />
                    </div>
                    <h2 className="text-lg font-semibold text-gray-900">Professional Experience</h2>
                  </div>
                  <div className="relative">
                    {/* Clean timeline line */}
                    <div className="absolute left-3 top-0 bottom-0 w-px bg-gray-200 hidden sm:block"></div>
                    
                    <div className="relative bg-gray-50 border border-gray-200 rounded-lg p-5 ml-0 sm:ml-6">
                      {/* Simple timeline dot */}
                      <div className="absolute -left-8 top-5 hidden sm:flex">
                        <div className="w-6 h-6 bg-slate-700 rounded-full border-2 border-white flex items-center justify-center">
                          <Briefcase className="w-3 h-3 text-white" />
                        </div>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-4">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 mb-1">
                            {candidate.position}
                          </h3>
                          <p className="text-sm text-gray-600">Various Companies</p>
                        </div>
                        {candidate.experience_years && (
                          <div className="px-3 py-1 bg-slate-700 text-white rounded-md text-xs font-medium self-start">
                            {candidate.experience_years} Years
                          </div>
                        )}
                      </div>
                      
                      {skillsArray.length > 0 && (
                        <ul className="space-y-2">
                          {[
                            `Executed complex ${candidate.position.toLowerCase()} projects with high precision and quality`,
                            'Collaborated with cross-functional teams to deliver optimal solutions',
                            'Maintained strict adherence to safety protocols and industry standards',
                            `Demonstrated expertise in ${skillsArray.slice(0, 2).join(' and ')}`,
                            'Consistently exceeded performance targets and quality benchmarks'
                          ].map((item, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-gray-700 text-sm">
                              <span className="text-gray-400 mt-1">•</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Minimalist Info Cards */}
              <div className="mb-8">
                <div className="mb-5 pb-3 border-b border-gray-200 flex items-center gap-2">
                  <div className="w-7 h-7 bg-slate-700 rounded-md flex items-center justify-center">
                    <FileText className="w-4 h-4 text-white" />
                  </div>
                  <h2 className="text-lg font-semibold text-gray-900">Additional Information</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {candidate.nationality && (
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-slate-100 rounded-md flex items-center justify-center">
                          <Globe className="w-4 h-4 text-slate-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-medium text-gray-500 mb-0.5">Nationality</p>
                          <p className="text-sm font-medium text-gray-900">{candidate.nationality}</p>
                        </div>
                      </div>
                    </div>
                  )}
                  {candidate.country_of_interest && (
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-slate-100 rounded-md flex items-center justify-center">
                          <MapPin className="w-4 h-4 text-slate-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-medium text-gray-500 mb-0.5">Preferred Location</p>
                          <p className="text-sm font-medium text-gray-900">{candidate.country_of_interest}</p>
                        </div>
                      </div>
                    </div>
                  )}
                  {candidate.passport_received && (
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-emerald-50 rounded-md flex items-center justify-center">
                          <Shield className="w-4 h-4 text-emerald-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-medium text-gray-500 mb-0.5">Passport Status</p>
                          <p className="text-sm font-medium text-emerald-600 flex items-center gap-1">
                            <CheckCircle className="w-3.5 h-3.5" />
                            Available & Valid
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-slate-100 rounded-md flex items-center justify-center">
                        <Calendar className="w-4 h-4 text-slate-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-medium text-gray-500 mb-0.5">Availability</p>
                        <p className="text-sm font-medium text-gray-900">Immediate</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Minimalist Languages Section */}
              {candidate.languages && (
                <div className="mb-8">
                  <div className="mb-5 pb-3 border-b border-gray-200 flex items-center gap-2">
                    <div className="w-7 h-7 bg-slate-700 rounded-md flex items-center justify-center">
                      <Languages className="w-4 h-4 text-white" />
                    </div>
                    <h2 className="text-lg font-semibold text-gray-900">Languages</h2>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <p className="text-gray-700 text-sm leading-relaxed">{candidate.languages}</p>
                  </div>
                </div>
              )}

              {/* Minimalist Footer Notice */}
              <div className="mt-10 pt-6 border-t border-gray-200">
                <div className="bg-gray-50 p-5 rounded-lg border border-gray-200">
                  <div className="flex items-start gap-3">
                    <Shield className="w-5 h-5 text-slate-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 mb-2">Protected by Falisha Manpower</h3>
                      <p className="text-xs text-gray-600 mb-3 leading-relaxed">
                        This is an employer-safe CV generated by Falisha Manpower recruitment system. 
                        Contact information has been protected to prevent unauthorized direct contact and ensure 
                        proper recruitment procedures are followed.
                      </p>
                      <div className="text-xs text-gray-600">
                        <p className="font-medium text-gray-700">For more information or to arrange interviews:</p>
                        <p>Contact Falisha Manpower at recruitment@falisha.com</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Status & Documents - Minimalist */}
          <div className="space-y-6">
            {/* Status Card - Minimalist */}
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-slate-600" />
                <span>Status</span>
              </h2>
              <div className="space-y-3">
                {candidate.status && (
                  <div>
                    <label className="text-xs font-medium text-gray-500">Application Status</label>
                    <div className="mt-1">
                      <span className={`inline-block px-2.5 py-1 rounded-md text-xs font-medium ${
                        candidate.status === 'Applied' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                        candidate.status === 'Pending' ? 'bg-yellow-50 text-yellow-700 border border-yellow-200' :
                        candidate.status === 'Deployed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        'bg-red-50 text-red-700 border border-red-200'
                      }`}>
                        {candidate.status}
                      </span>
                    </div>
                  </div>
                )}
                {candidate.ai_score != null && typeof candidate.ai_score === 'number' && (
                  <div>
                    <label className="text-xs font-medium text-gray-500">AI Score</label>
                    <div className="mt-1 flex items-center gap-2">
                      <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                      <span className="text-gray-900 font-medium text-sm">{candidate.ai_score.toFixed(1)}/10</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Documents Section - Minimalist */}
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-slate-600" />
                  <span>Documents</span>
                </h2>
                {documents.length > 0 && (
                  <button
                    onClick={handleDownloadAll}
                    disabled={downloadingAll}
                    className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-3 py-1.5 bg-slate-700 text-white text-xs rounded-md hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  >
                    <Download className="w-3 h-3" />
                    {downloadingAll ? 'Creating...' : 'Download All'}
                  </button>
                )}
              </div>
              
              {loadingDocuments ? (
                <div className="flex items-center justify-center py-8">
                  <Loader className="w-5 h-5 text-slate-600 animate-spin" />
                </div>
              ) : documents.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <FileText className="w-10 h-10 mx-auto mb-2" />
                  <p className="text-xs">No verified documents</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 bg-gray-50 rounded-md border border-gray-200 hover:border-gray-300 transition-colors"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <FileText className="w-4 h-4 text-slate-600 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-gray-900 truncate">
                            {doc.file_name || `Document ${doc.category}`}
                          </p>
                          <p className="text-xs text-gray-500 capitalize">
                            {doc.category || doc.document_type || 'Document'}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDownloadDocument(doc.id, doc.file_name || `document_${doc.id}`)}
                        className="w-full sm:w-auto flex items-center justify-center gap-1 px-3 py-1.5 bg-slate-700 text-white text-xs rounded-md hover:bg-slate-800 transition-colors font-medium"
                      >
                        <Download className="w-3 h-3" />
                        Download
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Share Link - Minimalist */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <p className="text-xs font-medium text-gray-700 mb-2">Share this profile</p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={profileLink}
                  readOnly
                  className="flex-1 px-2 py-1.5 bg-white border border-gray-200 rounded-md text-xs text-gray-700 min-w-0 focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
                <button
                  onClick={copyProfileLink}
                  className="p-2 bg-slate-700 text-white rounded-md hover:bg-slate-800 transition-colors flex-shrink-0"
                  title="Copy link"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
