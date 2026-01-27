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
      
      // Import html2canvas and jsPDF separately for better control
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');
      
      // Create a clone of the element to avoid modifying the original
      const clonedElement = element.cloneNode(true) as HTMLElement;
      
      // Add a comprehensive style override to convert all colors to hex
      const styleOverride = document.createElement('style');
      styleOverride.id = 'pdf-color-override';
      styleOverride.textContent = `
        /* Force all colors to hex format to avoid oklch issues */
        .bg-blue-50, [class*="bg-blue-50"] { background-color: #eff6ff !important; }
        .bg-purple-50, [class*="bg-purple-50"] { background-color: #faf5ff !important; }
        .bg-yellow-50, [class*="bg-yellow-50"] { background-color: #fefce8 !important; }
        .bg-gray-50, [class*="bg-gray-50"] { background-color: #f9fafb !important; }
        .bg-green-100, [class*="bg-green-100"] { background-color: #dcfce7 !important; }
        .bg-blue-100, [class*="bg-blue-100"] { background-color: #dbeafe !important; }
        .bg-purple-100, [class*="bg-purple-100"] { background-color: #f3e8ff !important; }
        .bg-yellow-100, [class*="bg-yellow-100"] { background-color: #fef9c3 !important; }
        .bg-indigo-50, [class*="bg-indigo-50"] { background-color: #eef2ff !important; }
        .bg-pink-50, [class*="bg-pink-50"] { background-color: #fdf2f8 !important; }
        .bg-cyan-50, [class*="bg-cyan-50"] { background-color: #ecfeff !important; }
        .bg-teal-50, [class*="bg-teal-50"] { background-color: #f0fdfa !important; }
        .bg-emerald-50, [class*="bg-emerald-50"] { background-color: #ecfdf5 !important; }
        .bg-orange-50, [class*="bg-orange-50"] { background-color: #fff7ed !important; }
        .bg-amber-50, [class*="bg-amber-50"] { background-color: #fffbeb !important; }
        
        /* Gradient backgrounds - convert to solid colors */
        .bg-gradient-to-br.from-blue-500.to-blue-600,
        [class*="from-blue-500"][class*="to-blue-600"] { background-color: #3b82f6 !important; }
        .bg-gradient-to-br.from-purple-500.to-pink-600,
        [class*="from-purple-500"][class*="to-pink-600"] { background-color: #9333ea !important; }
        .bg-gradient-to-br.from-green-500.to-emerald-600,
        [class*="from-green-500"][class*="to-emerald-600"] { background-color: #22c55e !important; }
        .bg-gradient-to-br.from-indigo-500.to-purple-600,
        [class*="from-indigo-500"][class*="to-purple-600"] { background-color: #6366f1 !important; }
        .bg-gradient-to-br.from-teal-500.to-cyan-600,
        [class*="from-teal-500"][class*="to-cyan-600"] { background-color: #14b8a6 !important; }
        .bg-gradient-to-br.from-cyan-500.to-blue-600,
        [class*="from-cyan-500"][class*="to-blue-600"] { background-color: #06b6d4 !important; }
        [class*="from-blue-500"][class*="to-purple-600"] { background-color: #3b82f6 !important; }
        [class*="from-purple-500"][class*="to-purple-600"] { background-color: #9333ea !important; }
        [class*="from-pink-500"][class*="to-pink-600"] { background-color: #ec4899 !important; }
        [class*="from-indigo-500"][class*="to-indigo-600"] { background-color: #6366f1 !important; }
        [class*="from-cyan-500"][class*="to-cyan-600"] { background-color: #06b6d4 !important; }
        [class*="from-teal-500"][class*="to-teal-600"] { background-color: #14b8a6 !important; }
        
        .text-blue-600, [class*="text-blue-600"] { color: #2563eb !important; }
        .text-purple-600, [class*="text-purple-600"] { color: #9333ea !important; }
        .text-yellow-600, [class*="text-yellow-600"] { color: #ca8a04 !important; }
        .text-gray-600, [class*="text-gray-600"] { color: #4b5563 !important; }
        .text-gray-700, [class*="text-gray-700"] { color: #374151 !important; }
        .text-gray-900, [class*="text-gray-900"] { color: #111827 !important; }
        .text-green-600, [class*="text-green-600"] { color: #16a34a !important; }
        .text-blue-700, [class*="text-blue-700"] { color: #1d4ed8 !important; }
        .text-purple-700, [class*="text-purple-700"] { color: #7e22ce !important; }
        .text-yellow-700, [class*="text-yellow-700"] { color: #a16207 !important; }
        .text-yellow-800, [class*="text-yellow-800"] { color: #854d0e !important; }
        .text-yellow-900, [class*="text-yellow-900"] { color: #713f12 !important; }
        .text-white, [class*="text-white"] { color: #ffffff !important; }
        
        .border-blue-600, [class*="border-blue-600"] { border-color: #2563eb !important; }
        .border-purple-600, [class*="border-purple-600"] { border-color: #9333ea !important; }
        .border-indigo-600, [class*="border-indigo-600"] { border-color: #6366f1 !important; }
        .border-teal-600, [class*="border-teal-600"] { border-color: #14b8a6 !important; }
        .border-cyan-600, [class*="border-cyan-600"] { border-color: #06b6d4 !important; }
        .border-blue-200, [class*="border-blue-200"] { border-color: #bfdbfe !important; }
        .border-purple-200, [class*="border-purple-200"] { border-color: #e9d5ff !important; }
        .border-yellow-200, [class*="border-yellow-200"] { border-color: #fef08a !important; }
        .border-gray-200, [class*="border-gray-200"] { border-color: #e5e7eb !important; }
        .border-gray-300, [class*="border-gray-300"] { border-color: #d1d5db !important; }
        .border-green-200, [class*="border-green-200"] { border-color: #bbf7d0 !important; }
        .border-orange-200, [class*="border-orange-200"] { border-color: #fed7aa !important; }
        
        /* Handle gradients by converting to solid colors */
        [class*="from-blue-50"][class*="to-purple-50"],
        [class*="from-blue-50"].to-purple-50 {
          background-color: #eff6ff !important;
        }
        [class*="from-blue-50"][class*="via-purple-50"][class*="to-pink-50"] {
          background-color: #eff6ff !important;
        }
        
        /* Hide buttons in PDF */
        button { display: none !important; }
      `;
      clonedElement.insertBefore(styleOverride, clonedElement.firstChild);
      
      // Temporarily append to body (hidden) for rendering
      clonedElement.style.position = 'absolute';
      clonedElement.style.left = '-9999px';
      clonedElement.style.top = '0';
      clonedElement.style.width = element.offsetWidth + 'px';
      clonedElement.style.backgroundColor = '#ffffff';
      document.body.appendChild(clonedElement);
      
      // Wait a moment for styles to apply
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Convert HTML to canvas with options that handle colors better
      const canvas = await html2canvas(clonedElement, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        onclone: (clonedDoc) => {
          // Additional processing on cloned document
          const clonedStyle = clonedDoc.createElement('style');
          clonedStyle.textContent = `
            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              color-adjust: exact !important;
            }
          `;
          clonedDoc.head.appendChild(clonedStyle);
        }
      });
      
      // Calculate PDF dimensions (A4 format)
      const imgWidth = 210; // A4 width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const pdf = new jsPDF('portrait', 'mm', 'a4');
      
      // Add image to PDF
      const imgData = canvas.toDataURL('image/png', 1.0);
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      
      // Handle page breaks if content is too long
      const pageHeight = pdf.internal.pageSize.getHeight();
      let heightLeft = imgHeight;
      let position = 0;
      
      while (heightLeft > 0) {
        position = heightLeft - pageHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      
      // Save PDF
      pdf.save(`${candidate.name || 'Candidate'}_Employer_CV.pdf`);
      
      // Clean up cloned element
      document.body.removeChild(clonedElement);
      
      toast.success('Employer CV downloaded successfully!');
    } catch (err: any) {
      console.error('[PublicCandidateProfile] Failed to generate Employer CV PDF:', err);
      
      // Clean up cloned element if it exists
      const cloned = document.getElementById('pdf-color-override')?.parentElement;
      if (cloned && cloned.parentElement) {
        document.body.removeChild(cloned);
      }
      
      // Provide more specific error messages
      if (err?.message?.includes('oklch') || err?.message?.includes('color') || err?.message?.includes('parse')) {
        toast.error('PDF generation failed. Please try refreshing the page and try again.');
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

              {/* Modern CV Header with Infographic Design */}
              <div className="relative mb-6 sm:mb-8 pb-6 sm:pb-8 border-b-4 border-blue-600 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 rounded-2xl p-6 sm:p-8 overflow-hidden">
                {/* Decorative background elements */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-200 rounded-full opacity-20 blur-3xl"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-purple-200 rounded-full opacity-20 blur-2xl"></div>
                
                <div className="relative z-10">
                  <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6">
                    {/* Avatar with modern design */}
                    <div className="relative">
                      <div className="w-24 h-24 sm:w-28 sm:h-28 bg-gradient-to-br from-blue-500 via-purple-600 to-pink-500 rounded-2xl flex items-center justify-center text-white shadow-2xl transform hover:scale-105 transition-transform">
                        <span className="text-4xl sm:text-5xl font-bold">{candidate.name?.charAt(0) || '?'}</span>
                      </div>
                      <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-green-500 rounded-full border-4 border-white flex items-center justify-center shadow-lg">
                        <CheckCircle className="w-5 h-5 text-white" />
                      </div>
                    </div>
                    
                    {/* Name and Title Section */}
                    <div className="flex-1 text-center sm:text-left">
                      <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                        {candidate.name || 'Candidate'}
                      </h1>
                      <p className="text-xl sm:text-2xl text-gray-700 font-semibold mb-3">{candidate.position || 'Professional'}</p>
                      
                      {/* Info badges */}
                      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mt-4">
                        {candidate.nationality && (
                          <div className="flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full shadow-md border border-blue-200">
                            <Globe className="w-4 h-4 text-blue-600" />
                            <span className="text-sm font-medium text-gray-700">{candidate.nationality}</span>
                          </div>
                        )}
                        {candidate.country_of_interest && (
                          <div className="flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full shadow-md border border-purple-200">
                            <MapPin className="w-4 h-4 text-purple-600" />
                            <span className="text-sm font-medium text-gray-700">{candidate.country_of_interest}</span>
                          </div>
                        )}
                        {candidate.experience_years && (
                          <div className="flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full shadow-md border border-pink-200">
                            <Calendar className="w-4 h-4 text-pink-600" />
                            <span className="text-sm font-medium text-gray-700">{candidate.experience_years} Years Exp</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modern Contact Protection Notice */}
              <div className="mb-6 sm:mb-8 p-5 sm:p-6 bg-gradient-to-r from-yellow-50 via-amber-50 to-orange-50 border-l-4 border-yellow-500 rounded-xl shadow-md">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
                    <Shield className="w-6 h-6 text-yellow-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-yellow-900 mb-2 text-base sm:text-lg flex items-center gap-2">
                      <span>🔒 Contact Information Protected</span>
                    </h3>
                    <p className="text-sm sm:text-base text-yellow-800 leading-relaxed">
                      For privacy and security, direct contact details have been removed from this CV. 
                      To connect with this candidate, please contact <strong>Falisha Manpower</strong> recruitment team.
                    </p>
                  </div>
                </div>
              </div>

              {/* Modern Infographic Stats Section */}
              <div className="mb-6 sm:mb-8">
                <div className="mb-4 sm:mb-6 pb-3 border-b-2 border-blue-600 flex items-center gap-2">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-md">
                    <Briefcase className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Professional Overview</h2>
                </div>
                
                {/* Infographic Stats Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 mb-6">
                  {candidate.experience_years && (
                    <div className="relative bg-gradient-to-br from-blue-500 to-blue-600 p-5 sm:p-6 rounded-2xl text-white shadow-xl transform hover:scale-105 transition-transform overflow-hidden">
                      <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10"></div>
                      <div className="relative z-10">
                        <div className="flex items-center justify-between mb-3">
                          <Calendar className="w-8 h-8 sm:w-10 sm:h-10 opacity-90" />
                          <div className="text-right">
                            <p className="text-3xl sm:text-4xl font-bold">{candidate.experience_years}</p>
                            <p className="text-sm sm:text-base opacity-90">Years</p>
                          </div>
                        </div>
                        <p className="text-sm sm:text-base font-semibold opacity-95">Professional Experience</p>
                        {/* Progress bar */}
                        <div className="mt-3 h-2 bg-white/20 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-white rounded-full transition-all duration-1000"
                            style={{ width: `${Math.min((candidate.experience_years / 20) * 100, 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {candidate.ai_score != null && typeof candidate.ai_score === 'number' && (
                    <div className="relative bg-gradient-to-br from-purple-500 to-pink-600 p-5 sm:p-6 rounded-2xl text-white shadow-xl transform hover:scale-105 transition-transform overflow-hidden">
                      <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10"></div>
                      <div className="relative z-10">
                        <div className="flex items-center justify-between mb-3">
                          <Star className="w-8 h-8 sm:w-10 sm:h-10 opacity-90 fill-white" />
                          <div className="text-right">
                            <p className="text-3xl sm:text-4xl font-bold">{candidate.ai_score.toFixed(1)}</p>
                            <p className="text-sm sm:text-base opacity-90">/10</p>
                          </div>
                        </div>
                        <p className="text-sm sm:text-base font-semibold opacity-95">AI Match Score</p>
                        {/* Progress bar */}
                        <div className="mt-3 h-2 bg-white/20 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-white rounded-full transition-all duration-1000"
                            style={{ width: `${(candidate.ai_score / 10) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {skillsArray.length > 0 && (
                    <div className="relative bg-gradient-to-br from-green-500 to-emerald-600 p-5 sm:p-6 rounded-2xl text-white shadow-xl transform hover:scale-105 transition-transform overflow-hidden">
                      <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10"></div>
                      <div className="relative z-10">
                        <div className="flex items-center justify-between mb-3">
                          <Award className="w-8 h-8 sm:w-10 sm:h-10 opacity-90" />
                          <div className="text-right">
                            <p className="text-3xl sm:text-4xl font-bold">{skillsArray.length}</p>
                            <p className="text-sm sm:text-base opacity-90">Skills</p>
                          </div>
                        </div>
                        <p className="text-sm sm:text-base font-semibold opacity-95">Core Competencies</p>
                        {/* Progress bar */}
                        <div className="mt-3 h-2 bg-white/20 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-white rounded-full transition-all duration-1000"
                            style={{ width: `${Math.min((skillsArray.length / 15) * 100, 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Professional Summary Text */}
                <div className="bg-gradient-to-r from-gray-50 to-blue-50 p-5 sm:p-6 rounded-xl border-l-4 border-blue-500">
                  {candidate.professional_summary ? (
                    <p className="text-gray-700 leading-relaxed whitespace-pre-wrap text-sm sm:text-base">{candidate.professional_summary}</p>
                  ) : (
                    <p className="text-gray-700 leading-relaxed text-sm sm:text-base">
                      Highly skilled <strong>{candidate.position || 'professional'}</strong> with <strong>{candidate.experience_years || 'extensive'}</strong> years of professional experience.
                      {skillsArray.length > 0 && ` Demonstrates strong expertise in ${skillsArray.slice(0, 3).join(', ')}, and more.`}
                      {candidate.country_of_interest && ` Seeking opportunities in ${candidate.country_of_interest} to contribute technical expertise and drive operational excellence.`}
                    </p>
                  )}
                </div>
              </div>

              {/* Modern Skills Infographic */}
              {skillsArray.length > 0 && (
                <div className="mb-6 sm:mb-8">
                  <div className="mb-4 sm:mb-6 pb-3 border-b-2 border-purple-600 flex items-center gap-2">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center shadow-md">
                      <Award className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                    </div>
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Core Skills & Competencies</h2>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                    {skillsArray.map((skill, index) => {
                      const colorClasses = [
                        'from-blue-500 to-blue-600',
                        'from-purple-500 to-purple-600',
                        'from-pink-500 to-pink-600',
                        'from-indigo-500 to-indigo-600',
                        'from-cyan-500 to-cyan-600',
                        'from-teal-500 to-teal-600'
                      ];
                      const colorClass = colorClasses[index % colorClasses.length];
                      return (
                        <div
                          key={index}
                          className={`group relative bg-gradient-to-br ${colorClass} p-4 rounded-xl text-white shadow-lg transform hover:scale-105 hover:shadow-xl transition-all duration-300 overflow-hidden`}
                        >
                          <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                          <div className="relative z-10 flex items-center justify-between">
                            <span className="font-semibold text-sm sm:text-base">{skill}</span>
                            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                              <CheckCircle className="w-4 h-4" />
                            </div>
                          </div>
                          {/* Skill level indicator */}
                          <div className="mt-3 h-1.5 bg-white/20 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-white rounded-full transition-all duration-1000"
                              style={{ width: `${75 + (index % 3) * 8}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Modern Timeline-Style Experience */}
              {candidate.position && (
                <div className="mb-6 sm:mb-8">
                  <div className="mb-4 sm:mb-6 pb-3 border-b-2 border-indigo-600 flex items-center gap-2">
                    <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center shadow-md">
                      <Briefcase className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                    </div>
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Professional Experience</h2>
                  </div>
                  <div className="relative">
                    {/* Timeline line */}
                    <div className="absolute left-6 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-500 via-purple-500 to-pink-500 hidden sm:block"></div>
                    
                    <div className="space-y-6">
                      <div className="relative bg-white border-2 border-gray-200 rounded-2xl p-5 sm:p-6 shadow-lg hover:shadow-xl transition-shadow ml-0 sm:ml-8">
                        {/* Timeline dot */}
                        <div className="absolute -left-11 top-6 hidden sm:flex">
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full border-4 border-white shadow-lg flex items-center justify-center">
                            <Briefcase className="w-6 h-6 text-white" />
                          </div>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
                          <div className="flex-1">
                            <h3 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                              {candidate.position}
                            </h3>
                            <p className="text-gray-600 text-sm sm:text-base flex items-center gap-2">
                              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                              Various Companies
                            </p>
                          </div>
                          {candidate.experience_years && (
                            <div className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-bold text-sm sm:text-base shadow-md">
                              {candidate.experience_years} Years
                            </div>
                          )}
                        </div>
                        
                        {skillsArray.length > 0 && (
                          <div className="space-y-2">
                            {[
                              `Executed complex ${candidate.position.toLowerCase()} projects with high precision and quality`,
                              'Collaborated with cross-functional teams to deliver optimal solutions',
                              'Maintained strict adherence to safety protocols and industry standards',
                              `Demonstrated expertise in ${skillsArray.slice(0, 2).join(' and ')}`,
                              'Consistently exceeded performance targets and quality benchmarks'
                            ].map((item, idx) => (
                              <div key={idx} className="flex items-start gap-3 text-gray-700 text-sm sm:text-base">
                                <div className="w-2 h-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mt-2 flex-shrink-0"></div>
                                <span>{item}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Modern Infographic Info Cards */}
              <div className="mb-6 sm:mb-8">
                <div className="mb-4 sm:mb-6 pb-3 border-b-2 border-teal-600 flex items-center gap-2">
                  <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-lg flex items-center justify-center shadow-md">
                    <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Additional Information</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                  {candidate.nationality && (
                    <div className="group relative bg-gradient-to-br from-blue-50 to-indigo-50 p-5 rounded-xl border-2 border-blue-200 hover:border-blue-400 transition-all shadow-md hover:shadow-lg">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                          <Globe className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Nationality</p>
                          <p className="text-base sm:text-lg font-bold text-gray-900">{candidate.nationality}</p>
                        </div>
                      </div>
                    </div>
                  )}
                  {candidate.country_of_interest && (
                    <div className="group relative bg-gradient-to-br from-purple-50 to-pink-50 p-5 rounded-xl border-2 border-purple-200 hover:border-purple-400 transition-all shadow-md hover:shadow-lg">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                          <MapPin className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Preferred Location</p>
                          <p className="text-base sm:text-lg font-bold text-gray-900">{candidate.country_of_interest}</p>
                        </div>
                      </div>
                    </div>
                  )}
                  {candidate.passport_received && (
                    <div className="group relative bg-gradient-to-br from-green-50 to-emerald-50 p-5 rounded-xl border-2 border-green-200 hover:border-green-400 transition-all shadow-md hover:shadow-lg">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                          <Shield className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Passport Status</p>
                          <p className="text-base sm:text-lg font-bold text-green-600 flex items-center gap-2">
                            <CheckCircle className="w-5 h-5" />
                            Available & Valid
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="group relative bg-gradient-to-br from-orange-50 to-amber-50 p-5 rounded-xl border-2 border-orange-200 hover:border-orange-400 transition-all shadow-md hover:shadow-lg">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                        <Calendar className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Availability</p>
                        <p className="text-base sm:text-lg font-bold text-gray-900">Immediate</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modern Languages Section */}
              {candidate.languages && (
                <div className="mb-6 sm:mb-8">
                  <div className="mb-4 sm:mb-6 pb-3 border-b-2 border-cyan-600 flex items-center gap-2">
                    <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center shadow-md">
                      <Languages className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                    </div>
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Languages</h2>
                  </div>
                  <div className="bg-gradient-to-r from-cyan-50 via-blue-50 to-indigo-50 p-5 sm:p-6 rounded-xl border-l-4 border-cyan-500 shadow-md">
                    <p className="text-gray-800 text-base sm:text-lg font-medium leading-relaxed">{candidate.languages}</p>
                  </div>
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
