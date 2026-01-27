import { useEffect, useState } from 'react';
import { apiClient, Candidate } from '../lib/apiClient';
import { 
  User, Phone, Mail, MapPin, Briefcase, Calendar, FileText, 
  Globe, Download, Star, CheckCircle, XCircle, Loader,
  ArrowLeft, Share2, Copy
} from 'lucide-react';
import { toast } from 'sonner';

export function PublicCandidateProfile() {
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Extract candidate ID from URL path: /profile/:id/:slug
    const pathMatch = typeof window !== 'undefined' 
      ? window.location.pathname.match(/^\/profile\/([^\/]+)/)
      : null;
    
    const candidateId = pathMatch ? pathMatch[1] : null;

    if (!candidateId) {
      setError('Invalid candidate ID');
      setLoading(false);
      return;
    }

    const fetchCandidate = async () => {
      try {
        setLoading(true);
        const data = await apiClient.getCandidate(candidateId);
        setCandidate(data);
        setError(null);
      } catch (err: any) {
        console.error('Failed to load candidate:', err);
        setError(err?.message || 'Failed to load candidate profile');
      } finally {
        setLoading(false);
      }
    };

    fetchCandidate();
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
          {/* Left Column - Main Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information Card */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-blue-600" />
                Basic Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Full Name</label>
                  <p className="text-gray-900 font-medium">{candidate.name || 'Not provided'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Candidate Code</label>
                  <p className="text-gray-900 font-medium">{candidate.candidate_code || 'Not provided'}</p>
                </div>
                {candidate.nationality && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Nationality</label>
                    <p className="text-gray-900">{candidate.nationality}</p>
                  </div>
                )}
                {candidate.date_of_birth && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Date of Birth</label>
                    <p className="text-gray-900">{new Date(candidate.date_of_birth).toLocaleDateString()}</p>
                  </div>
                )}
                {candidate.gender && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Gender</label>
                    <p className="text-gray-900 capitalize">{candidate.gender}</p>
                  </div>
                )}
                {candidate.marital_status && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Marital Status</label>
                    <p className="text-gray-900 capitalize">{candidate.marital_status}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Professional Information */}
            {(candidate.position || candidate.experience_years || candidate.country_of_interest) && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-blue-600" />
                  Professional Information
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {candidate.position && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Position</label>
                      <p className="text-gray-900 font-medium">{candidate.position}</p>
                    </div>
                  )}
                  {candidate.experience_years && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Experience</label>
                      <p className="text-gray-900">{candidate.experience_years} years</p>
                    </div>
                  )}
                  {candidate.country_of_interest && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Country of Interest</label>
                      <p className="text-gray-900">{candidate.country_of_interest}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Skills & Languages */}
            {(candidate.skills || candidate.languages) && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Star className="w-5 h-5 text-blue-600" />
                  Skills & Languages
                </h2>
                {candidate.skills && (
                  <div className="mb-4">
                    <label className="text-sm font-medium text-gray-500 block mb-2">Skills</label>
                    <p className="text-gray-900">{candidate.skills}</p>
                  </div>
                )}
                {candidate.languages && (
                  <div>
                    <label className="text-sm font-medium text-gray-500 block mb-2">Languages</label>
                    <p className="text-gray-900">{candidate.languages}</p>
                  </div>
                )}
              </div>
            )}

            {/* Professional Summary */}
            {candidate.professional_summary && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  Professional Summary
                </h2>
                <p className="text-gray-700 whitespace-pre-wrap">{candidate.professional_summary}</p>
              </div>
            )}
          </div>

          {/* Right Column - Contact & Status */}
          <div className="space-y-6">
            {/* Contact Information */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Phone className="w-5 h-5 text-blue-600" />
                Contact Information
              </h2>
              <div className="space-y-3">
                {candidate.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <a href={`tel:${candidate.phone}`} className="text-blue-600 hover:underline">
                      {candidate.phone}
                    </a>
                  </div>
                )}
                {candidate.email && (
                  <div className="flex items-center gap-3">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <a href={`mailto:${candidate.email}`} className="text-blue-600 hover:underline break-all">
                      {candidate.email}
                    </a>
                  </div>
                )}
                {candidate.address && (
                  <div className="flex items-start gap-3">
                    <MapPin className="w-4 h-4 text-gray-400 mt-1" />
                    <p className="text-gray-700">{candidate.address}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Status & Documents */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-blue-600" />
                Status & Documents
              </h2>
              <div className="space-y-3">
                {candidate.status && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Status</label>
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
                {candidate.ai_score !== undefined && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">AI Score</label>
                    <div className="mt-1 flex items-center gap-2">
                      <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                      <span className="text-gray-900 font-medium">{candidate.ai_score.toFixed(1)}/10</span>
                    </div>
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium text-gray-500">Documents</label>
                  <div className="mt-2 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">CV</span>
                      {candidate.cv_received ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <XCircle className="w-4 h-4 text-gray-300" />
                      )}
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Passport</span>
                      {candidate.passport_received ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <XCircle className="w-4 h-4 text-gray-300" />
                      )}
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">CNIC</span>
                      {candidate.cnic_received ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <XCircle className="w-4 h-4 text-gray-300" />
                      )}
                    </div>
                  </div>
                </div>
              </div>
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
