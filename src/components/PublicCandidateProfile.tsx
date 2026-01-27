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
    
    if (!employerCVRef.current) {
      toast.error('CV content not ready. Please wait a moment and try again.');
      return;
    }
    
    // Check if there's meaningful content to generate PDF from
    const element = employerCVRef.current;
    const hasContent = element.textContent && element.textContent.trim().length > 0;
    
    if (!hasContent) {
      toast.error('No CV content available to download. Please ensure candidate information is complete.');
      return;
    }
    
    try {
      setDownloadingCV(true);
      
      // Create a clone of the element to avoid modifying the original
      const clonedElement = element.cloneNode(true) as HTMLElement;
      
      // Add a style tag to convert all colors to hex/rgb for PDF compatibility
      const styleFix = document.createElement('style');
      styleFix.textContent = `
        * {
          color: inherit !important;
        }
        .bg-blue-50 { background-color: #eff6ff !important; }
        .bg-purple-50 { background-color: #faf5ff !important; }
        .bg-yellow-50 { background-color: #fefce8 !important; }
        .bg-gray-50 { background-color: #f9fafb !important; }
        .bg-green-100 { background-color: #dcfce7 !important; }
        .bg-blue-100 { background-color: #dbeafe !important; }
        .bg-purple-100 { background-color: #f3e8ff !important; }
        .bg-yellow-100 { background-color: #fef9c3 !important; }
        .bg-green-100 { background-color: #dcfce7 !important; }
        .text-blue-600 { color: #2563eb !important; }
        .text-purple-600 { color: #9333ea !important; }
        .text-yellow-600 { color: #ca8a04 !important; }
        .text-gray-600 { color: #4b5563 !important; }
        .text-gray-700 { color: #374151 !important; }
        .text-gray-900 { color: #111827 !important; }
        .text-green-600 { color: #16a34a !important; }
        .text-blue-700 { color: #1d4ed8 !important; }
        .text-purple-700 { color: #7e22ce !important; }
        .text-yellow-700 { color: #a16207 !important; }
        .text-yellow-800 { color: #854d0e !important; }
        .text-yellow-900 { color: #713f12 !important; }
        .border-blue-600 { border-color: #2563eb !important; }
        .border-blue-200 { border-color: #bfdbfe !important; }
        .border-yellow-200 { border-color: #fef08a !important; }
        .border-gray-200 { border-color: #e5e7eb !important; }
        .border-gray-300 { border-color: #d1d5db !important; }
        .from-blue-50 { background: linear-gradient(to right, #eff6ff, var(--tw-gradient-to)) !important; }
        .to-purple-50 { --tw-gradient-to: #faf5ff !important; }
        .from-blue-500 { background: linear-gradient(to bottom right, #3b82f6, var(--tw-gradient-to)) !important; }
        .to-purple-600 { --tw-gradient-to: #9333ea !important; }
        .from-blue-50.to-purple-50 { background: linear-gradient(to right, #eff6ff, #faf5ff) !important; }
        .from-blue-500.to-purple-600 { background: linear-gradient(to bottom right, #3b82f6, #9333ea) !important; }
      `;
      clonedElement.appendChild(styleFix);
      
      // Temporarily append to body (hidden) for rendering
      clonedElement.style.position = 'absolute';
      clonedElement.style.left = '-9999px';
      clonedElement.style.top = '0';
      clonedElement.style.width = element.offsetWidth + 'px';
      document.body.appendChild(clonedElement);
      
      // Dynamic import html2pdf.js
      const html2pdf = (await import('html2pdf.js')).default;
      
      // Configure PDF options
      const opt = {
        margin: [10, 10, 10, 10],
        filename: `${candidate.name || 'Candidate'}_Employer_CV.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
          ignoreElements: (element: any) => {
            // Ignore elements that might cause issues
            return element.classList?.contains('print-hidden');
          }
        },
        jsPDF: { 
          unit: 'mm', 
          format: 'a4', 
          orientation: 'portrait' 
        },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
      };
      
      // Generate and download PDF
      await html2pdf().set(opt).from(clonedElement).save();
      
      // Clean up cloned element
      document.body.removeChild(clonedElement);
      
      toast.success('Employer CV downloaded successfully!');
    } catch (err: any) {
      console.error('[PublicCandidateProfile] Failed to generate Employer CV PDF:', err);
      
      // Clean up cloned element if it exists
      const cloned = document.querySelector('[style*="position: absolute"][style*="left: -9999px"]');
      if (cloned) {
        document.body.removeChild(cloned);
      }
      
      // Provide more specific error messages
      if (err?.message?.includes('oklch') || err?.message?.includes('color')) {
        toast.error('PDF generation failed due to color format. Please try again or contact support.');
      } else if (err?.message?.includes('timeout') || err?.message?.includes('time')) {
        toast.error('PDF generation timed out. The CV content might be too large. Please try again.');
      } else if (err?.message?.includes('canvas') || err?.message?.includes('image')) {
        toast.error('Failed to render CV content. Please ensure all images are loaded and try again.');
      } else {
        toast.error(err?.message || 'Failed to generate Employer CV. Please try again or refresh the page.');
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader className="w-16 h-16 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 text-lg">Loading candidate profile...</p>
        </div>
      </div>
    );
  }

  if (error || !candidate) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-xl p-6 sm:p-8 max-w-md w-full text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Profile Not Found</h2>
          <p className="text-gray-600 mb-6">{error || 'The candidate profile you are looking for does not exist.'}</p>
          <a
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      {/* Header - Mobile Responsive */}
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
            <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg sm:text-xl flex-shrink-0">
                {candidate.name?.charAt(0) || '?'}
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">{candidate.name || 'Candidate'}</h1>
                <p className="text-xs sm:text-sm text-gray-600 truncate">{candidate.candidate_code || 'No Code'}</p>
              </div>
            </div>
            <button
              onClick={copyProfileLink}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm sm:text-base font-medium"
            >
              <Share2 className="w-4 h-4" />
              <span className="sm:inline">Share Profile</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content - Mobile Responsive */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Left Column - Employer CV Content */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            {/* Employer-Safe CV Section */}
            <div ref={employerCVRef} className="bg-white rounded-xl shadow-lg p-4 sm:p-6 lg:p-8">
              {/* CV Header Section - Mobile Responsive */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 pb-4 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
                  </div>
                  <div>
                    <h2 className="text-lg sm:text-xl font-bold text-gray-900">Employer-Safe CV</h2>
                    <p className="text-xs sm:text-sm text-gray-600">Contact information protected</p>
                  </div>
                </div>
                <button
                  onClick={handleDownloadCV}
                  disabled={downloadingCV}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base font-medium shadow-sm"
                >
                  <Download className="w-4 h-4" />
                  <span>{downloadingCV ? 'Generating PDF...' : 'Download Employer CV'}</span>
                </button>
              </div>

              {/* CV Header - Mobile Responsive */}
              <div className="text-center mb-6 sm:mb-8 pb-4 sm:pb-6 border-b-4 border-blue-600">
                <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-3 sm:mb-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white shadow-xl">
                  <span className="text-3xl sm:text-4xl font-bold">{candidate.name?.charAt(0) || '?'}</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">{candidate.name || 'Candidate'}</h1>
                <p className="text-lg sm:text-xl text-gray-600 mb-2 sm:mb-3">{candidate.position || 'Professional'}</p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 text-gray-600 mt-3 sm:mt-4">
                  {candidate.nationality && (
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                      <span className="text-sm sm:text-base">{candidate.nationality}</span>
                    </div>
                  )}
                  {candidate.country_of_interest && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                      <span className="text-sm sm:text-base">Seeking: {candidate.country_of_interest}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Contact Information Protected Notice - Mobile Responsive */}
              <div className="mb-6 sm:mb-8 p-4 sm:p-6 bg-yellow-50 border-2 border-yellow-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-bold text-yellow-900 mb-1 text-sm sm:text-base">Contact Information Protected</h3>
                    <p className="text-xs sm:text-sm text-yellow-800 leading-relaxed">
                      For privacy and security, direct contact details have been removed from this CV. 
                      To connect with this candidate, please contact Falisha Manpower recruitment team.
                    </p>
                  </div>
                </div>
              </div>

              {/* Professional Summary - Mobile Responsive */}
              <div className="mb-6 sm:mb-8">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4 pb-2 border-b-2 border-blue-600 flex items-center gap-2">
                  <Briefcase className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                  <span>Professional Summary</span>
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4">
                  {candidate.experience_years && (
                    <div className="bg-blue-50 p-3 sm:p-4 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                        <span className="font-semibold text-gray-900 text-sm sm:text-base">Experience</span>
                      </div>
                      <p className="text-xl sm:text-2xl font-bold text-blue-600">{candidate.experience_years} Years</p>
                    </div>
                  )}
                  {candidate.ai_score != null && typeof candidate.ai_score === 'number' && (
                    <div className="bg-purple-50 p-3 sm:p-4 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Star className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
                        <span className="font-semibold text-gray-900 text-sm sm:text-base">AI Match Score</span>
                      </div>
                      <p className="text-xl sm:text-2xl font-bold text-purple-600">{candidate.ai_score.toFixed(1)}/10</p>
                    </div>
                  )}
                </div>
                {candidate.professional_summary ? (
                  <p className="text-gray-700 leading-relaxed whitespace-pre-wrap text-sm sm:text-base">{candidate.professional_summary}</p>
                ) : (
                  <p className="text-gray-700 leading-relaxed text-sm sm:text-base">
                    Highly skilled {candidate.position || 'professional'} with {candidate.experience_years || 'extensive'} years of professional experience.
                    {skillsArray.length > 0 && ` Demonstrates strong expertise in ${skillsArray.slice(0, 3).join(', ')}, and more.`}
                    {candidate.country_of_interest && ` Seeking opportunities in ${candidate.country_of_interest} to contribute technical expertise and drive operational excellence.`}
                  </p>
                )}
              </div>

              {/* Core Skills - Mobile Responsive */}
              {skillsArray.length > 0 && (
                <div className="mb-6 sm:mb-8">
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4 pb-2 border-b-2 border-blue-600 flex items-center gap-2">
                    <Award className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                    <span>Core Skills & Competencies</span>
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
                    {skillsArray.map((skill, index) => (
                      <div
                        key={index}
                        className="px-3 sm:px-4 py-2 sm:py-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200 text-gray-800 font-medium text-center text-sm sm:text-base"
                      >
                        {skill}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Professional Experience - Mobile Responsive */}
              {candidate.position && (
                <div className="mb-6 sm:mb-8">
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4 pb-2 border-b-2 border-blue-600 flex items-center gap-2">
                    <Briefcase className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                    <span>Professional Experience</span>
                  </h2>
                  <div className="space-y-4 sm:space-y-6">
                    <div className="border-l-4 border-blue-600 pl-4 sm:pl-6">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-2">
                        <div>
                          <h3 className="text-lg sm:text-xl font-bold text-gray-900">{candidate.position}</h3>
                          <p className="text-gray-600 text-sm sm:text-base">Various Companies</p>
                        </div>
                        {candidate.experience_years && (
                          <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg font-medium text-xs sm:text-sm w-fit">
                            {candidate.experience_years} years
                          </span>
                        )}
                      </div>
                      {skillsArray.length > 0 && (
                        <ul className="list-disc list-inside space-y-1 sm:space-y-2 text-gray-700 text-sm sm:text-base">
                          <li>Executed complex {candidate.position.toLowerCase()} projects with high precision and quality</li>
                          <li>Collaborated with cross-functional teams to deliver optimal solutions</li>
                          <li>Maintained strict adherence to safety protocols and industry standards</li>
                          <li>Demonstrated expertise in {skillsArray.slice(0, 2).join(' and ')}</li>
                          <li>Consistently exceeded performance targets and quality benchmarks</li>
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Additional Information - Mobile Responsive */}
              <div className="mb-6 sm:mb-8">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4 pb-2 border-b-2 border-blue-600 flex items-center gap-2">
                  <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                  <span>Additional Information</span>
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  {candidate.nationality && (
                    <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Globe className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
                        <span className="font-semibold text-gray-900 text-sm sm:text-base">Nationality</span>
                      </div>
                      <p className="text-gray-700 text-sm sm:text-base">{candidate.nationality}</p>
                    </div>
                  )}
                  {candidate.country_of_interest && (
                    <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
                        <span className="font-semibold text-gray-900 text-sm sm:text-base">Preferred Location</span>
                      </div>
                      <p className="text-gray-700 text-sm sm:text-base">{candidate.country_of_interest}</p>
                    </div>
                  )}
                  {candidate.passport_received && (
                    <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
                        <span className="font-semibold text-gray-900 text-sm sm:text-base">Passport Status</span>
                      </div>
                      <p className="font-medium text-green-600 text-sm sm:text-base">Available & Valid</p>
                    </div>
                  )}
                  <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
                      <span className="font-semibold text-gray-900 text-sm sm:text-base">Availability</span>
                    </div>
                    <p className="text-gray-700 text-sm sm:text-base">Immediate</p>
                  </div>
                </div>
              </div>

              {/* Languages - Mobile Responsive */}
              {candidate.languages && (
                <div className="mb-6 sm:mb-8">
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4 pb-2 border-b-2 border-blue-600 flex items-center gap-2">
                    <Languages className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                    <span>Languages</span>
                  </h2>
                  <p className="text-gray-700 text-sm sm:text-base">{candidate.languages}</p>
                </div>
              )}

              {/* Footer Notice - Mobile Responsive */}
              <div className="mt-8 sm:mt-12 pt-4 sm:pt-6 border-t-2 border-gray-300">
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 sm:p-6 rounded-lg border-2 border-blue-200">
                  <div className="flex items-start gap-3">
                    <Shield className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600 flex-shrink-0" />
                    <div>
                      <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-2">Protected by Falisha Manpower</h3>
                      <p className="text-xs sm:text-sm text-gray-700 mb-3 leading-relaxed">
                        This is an employer-safe CV generated by Falisha Manpower recruitment system. 
                        Contact information has been protected to prevent unauthorized direct contact and ensure 
                        proper recruitment procedures are followed.
                      </p>
                      <div className="mt-3 text-xs sm:text-sm text-gray-600">
                        <p><strong>For more information or to arrange interviews:</strong></p>
                        <p>Contact Falisha Manpower at recruitment@falisha.com</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Status & Documents - Mobile Responsive */}
          <div className="space-y-4 sm:space-y-6">
            {/* Status Card - Mobile Responsive */}
            <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-blue-600" />
                <span>Status</span>
              </h2>
              <div className="space-y-3">
                {candidate.status && (
                  <div>
                    <label className="text-xs sm:text-sm font-medium text-gray-500">Application Status</label>
                    <div className="mt-1">
                      <span className={`px-3 py-1.5 rounded-full text-xs font-medium ${
                        candidate.status === 'Applied' ? 'bg-blue-100 text-blue-700' :
                        candidate.status === 'Pending' ? 'bg-yellow-100 text-yellow-700' :
                        candidate.status === 'Deployed' ? 'bg-green-100 text-green-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {candidate.status}
                      </span>
                    </div>
                  </div>
                )}
                {candidate.ai_score != null && typeof candidate.ai_score === 'number' && (
                  <div>
                    <label className="text-xs sm:text-sm font-medium text-gray-500">AI Score</label>
                    <div className="mt-1 flex items-center gap-2">
                      <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                      <span className="text-gray-900 font-medium text-sm sm:text-base">{candidate.ai_score.toFixed(1)}/10</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Documents Section - Mobile Responsive */}
            <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  <span>Verified Documents</span>
                </h2>
                {documents.length > 0 && (
                  <button
                    onClick={handleDownloadAll}
                    disabled={downloadingAll}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-3 py-2 bg-green-600 text-white text-xs sm:text-sm rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  >
                    <Download className="w-3 h-3 sm:w-4 sm:h-4" />
                    {downloadingAll ? 'Creating ZIP...' : 'Download All'}
                  </button>
                )}
              </div>
              
              {loadingDocuments ? (
                <div className="flex items-center justify-center py-8">
                  <Loader className="w-6 h-6 text-blue-600 animate-spin" />
                </div>
              ) : documents.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p className="text-xs sm:text-sm">No verified documents available</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <FileText className="w-5 h-5 text-blue-600 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {doc.file_name || `Document ${doc.category}`}
                          </p>
                          <p className="text-xs text-gray-500 capitalize">
                            {doc.category || doc.document_type || 'Document'}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDownloadDocument(doc.id, doc.file_name || `document_${doc.id}`)}
                        className="w-full sm:w-auto flex items-center justify-center gap-1 px-3 py-2 bg-blue-600 text-white text-xs sm:text-sm rounded hover:bg-blue-700 transition-colors font-medium"
                      >
                        <Download className="w-3 h-3" />
                        Download
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Share Link - Mobile Responsive */}
            <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
              <p className="text-xs sm:text-sm font-medium text-blue-900 mb-2">Share this profile</p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={profileLink}
                  readOnly
                  className="flex-1 px-2 sm:px-3 py-2 bg-white border border-blue-200 rounded text-xs sm:text-sm text-gray-700 min-w-0"
                />
                <button
                  onClick={copyProfileLink}
                  className="p-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex-shrink-0"
                  title="Copy link"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
