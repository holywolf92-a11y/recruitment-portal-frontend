import { useEffect, useState } from 'react';
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
          // Filter only verified/approved documents
          const verifiedDocs = docs.filter((doc: any) => 
            doc.verification_status === 'verified' || doc.verification_status === 'approved'
          );
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
    if (!candidate) return;
    
    try {
      setDownloadingCV(true);
      const result = await apiClient.getCandidateCVDownload(candidate.id);
      
      // Download the file
      const response = await fetch(result.download_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = result.filename || `${candidate.name}_CV.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast.success('CV downloaded successfully!');
    } catch (err: any) {
      console.error('Failed to download CV:', err);
      toast.error(err?.message || 'Failed to download CV. Please try again.');
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-16 h-16 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading candidate profile...</p>
        </div>
      </div>
    );
  }

  if (error || !candidate) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Profile Not Found</h2>
          <p className="text-gray-600 mb-4">{error || 'The candidate profile you are looking for does not exist.'}</p>
          <a
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                {candidate.name?.charAt(0) || '?'}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{candidate.name || 'Candidate'}</h1>
                <p className="text-sm text-gray-600">{candidate.candidate_code || 'No Code'}</p>
              </div>
            </div>
            <button
              onClick={copyProfileLink}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Share2 className="w-4 h-4" />
              Share Profile
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Employer CV Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Employer-Safe CV Section */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <Shield className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Employer-Safe CV</h2>
                    <p className="text-sm text-gray-600">Contact information protected for privacy</p>
                  </div>
                </div>
                <button
                  onClick={handleDownloadCV}
                  disabled={downloadingCV}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download className="w-4 h-4" />
                  {downloadingCV ? 'Downloading...' : 'Download CV'}
                </button>
              </div>

              {/* CV Header */}
              <div className="text-center mb-8 pb-6 border-b-4 border-blue-600">
                <div className="w-24 h-24 mx-auto mb-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white shadow-xl">
                  <span className="text-4xl">{candidate.name?.charAt(0) || '?'}</span>
                </div>
                <h1 className="text-3xl mb-2 font-bold">{candidate.name || 'Candidate'}</h1>
                <p className="text-xl text-gray-600 mb-2">{candidate.position || 'Professional'}</p>
                <div className="flex items-center justify-center gap-4 text-gray-600 mt-4">
                  {candidate.nationality && (
                    <div className="flex items-center gap-2">
                      <Globe className="w-5 h-5 text-blue-600" />
                      <span>{candidate.nationality}</span>
                    </div>
                  )}
                  {candidate.country_of_interest && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-blue-600" />
                      <span>Seeking: {candidate.country_of_interest}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Contact Information Protected Notice */}
              <div className="mb-8 p-6 bg-yellow-50 border-2 border-yellow-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <Shield className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-bold text-yellow-900 mb-1">Contact Information Protected</h3>
                    <p className="text-sm text-yellow-800">
                      For privacy and security, direct contact details have been removed from this CV. 
                      To connect with this candidate, please contact Falisha Manpower recruitment team.
                    </p>
                  </div>
                </div>
              </div>

              {/* Professional Summary */}
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4 pb-2 border-b-2 border-blue-600 flex items-center gap-2">
                  <Briefcase className="w-6 h-6 text-blue-600" />
                  Professional Summary
                </h2>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  {candidate.experience_years && (
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="w-5 h-5 text-blue-600" />
                        <span className="font-semibold text-gray-900">Experience</span>
                      </div>
                      <p className="text-2xl font-bold text-blue-600">{candidate.experience_years} Years</p>
                    </div>
                  )}
                  {candidate.ai_score != null && typeof candidate.ai_score === 'number' && (
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Star className="w-5 h-5 text-purple-600" />
                        <span className="font-semibold text-gray-900">AI Match Score</span>
                      </div>
                      <p className="text-2xl font-bold text-purple-600">{candidate.ai_score.toFixed(1)}/10</p>
                    </div>
                  )}
                </div>
                {candidate.professional_summary ? (
                  <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{candidate.professional_summary}</p>
                ) : (
                  <p className="text-gray-700 leading-relaxed">
                    Highly skilled {candidate.position || 'professional'} with {candidate.experience_years || 'extensive'} years of professional experience.
                    {skillsArray.length > 0 && ` Demonstrates strong expertise in ${skillsArray.slice(0, 3).join(', ')}, and more.`}
                    {candidate.country_of_interest && ` Seeking opportunities in ${candidate.country_of_interest} to contribute technical expertise and drive operational excellence.`}
                  </p>
                )}
              </div>

              {/* Core Skills */}
              {skillsArray.length > 0 && (
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4 pb-2 border-b-2 border-blue-600 flex items-center gap-2">
                    <Award className="w-6 h-6 text-blue-600" />
                    Core Skills & Competencies
                  </h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {skillsArray.map((skill, index) => (
                      <div
                        key={index}
                        className="px-4 py-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200 text-gray-800 font-medium text-center"
                      >
                        {skill}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Professional Experience */}
              {candidate.position && (
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4 pb-2 border-b-2 border-blue-600 flex items-center gap-2">
                    <Briefcase className="w-6 h-6 text-blue-600" />
                    Professional Experience
                  </h2>
                  <div className="space-y-6">
                    <div className="border-l-4 border-blue-600 pl-6">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="text-xl font-bold text-gray-900">{candidate.position}</h3>
                          <p className="text-gray-600">Various Companies</p>
                        </div>
                        {candidate.experience_years && (
                          <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg font-medium text-sm">
                            {candidate.experience_years} years
                          </span>
                        )}
                      </div>
                      {skillsArray.length > 0 && (
                        <ul className="list-disc list-inside space-y-2 text-gray-700">
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

              {/* Additional Information */}
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4 pb-2 border-b-2 border-blue-600 flex items-center gap-2">
                  <FileText className="w-6 h-6 text-blue-600" />
                  Additional Information
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  {candidate.nationality && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Globe className="w-5 h-5 text-gray-600" />
                        <span className="font-semibold text-gray-900">Nationality</span>
                      </div>
                      <p className="text-gray-700">{candidate.nationality}</p>
                    </div>
                  )}
                  {candidate.country_of_interest && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <MapPin className="w-5 h-5 text-gray-600" />
                        <span className="font-semibold text-gray-900">Preferred Location</span>
                      </div>
                      <p className="text-gray-700">{candidate.country_of_interest}</p>
                    </div>
                  )}
                  {candidate.passport_received && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Shield className="w-5 h-5 text-gray-600" />
                        <span className="font-semibold text-gray-900">Passport Status</span>
                      </div>
                      <p className="font-medium text-green-600">Available & Valid</p>
                    </div>
                  )}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="w-5 h-5 text-gray-600" />
                      <span className="font-semibold text-gray-900">Availability</span>
                    </div>
                    <p className="text-gray-700">Immediate</p>
                  </div>
                </div>
              </div>

              {/* Languages */}
              {candidate.languages && (
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4 pb-2 border-b-2 border-blue-600 flex items-center gap-2">
                    <Languages className="w-6 h-6 text-blue-600" />
                    Languages
                  </h2>
                  <p className="text-gray-700">{candidate.languages}</p>
                </div>
              )}

              {/* Footer Notice */}
              <div className="mt-12 pt-6 border-t-2 border-gray-300">
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-lg border-2 border-blue-200">
                  <div className="flex items-start gap-3">
                    <Shield className="w-8 h-8 text-blue-600 flex-shrink-0" />
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 mb-2">Protected by Falisha Manpower</h3>
                      <p className="text-sm text-gray-700 mb-3">
                        This is an employer-safe CV generated by Falisha Manpower recruitment system. 
                        Contact information has been protected to prevent unauthorized direct contact and ensure 
                        proper recruitment procedures are followed.
                      </p>
                      <div className="mt-3 text-sm text-gray-600">
                        <p><strong>For more information or to arrange interviews:</strong></p>
                        <p>Contact Falisha Manpower at recruitment@falisha.com</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Status & Documents */}
          <div className="space-y-6">
            {/* Status */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-blue-600" />
                Status
              </h2>
              <div className="space-y-3">
                {candidate.status && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Application Status</label>
                    <div className="mt-1">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
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
                    <label className="text-sm font-medium text-gray-500">AI Score</label>
                    <div className="mt-1 flex items-center gap-2">
                      <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                      <span className="text-gray-900 font-medium">{candidate.ai_score.toFixed(1)}/10</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Documents Section */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  Verified Documents
                </h2>
                {documents.length > 0 && (
                  <button
                    onClick={handleDownloadAll}
                    disabled={downloadingAll}
                    className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Download className="w-4 h-4" />
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
                  <p className="text-sm">No verified documents available</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
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
                        className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors flex-shrink-0"
                      >
                        <Download className="w-3 h-3" />
                        Download
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Share Link */}
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <p className="text-sm font-medium text-blue-900 mb-2">Share this profile</p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={profileLink}
                  readOnly
                  className="flex-1 px-3 py-2 bg-white border border-blue-200 rounded text-sm text-gray-700"
                />
                <button
                  onClick={copyProfileLink}
                  className="p-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
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
