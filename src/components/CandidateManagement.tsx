import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { apiClient, Candidate } from '../lib/apiClient';

interface CandidateManagementProps {
  initialProfessionFilter?: string;
}

export function CandidateManagement({ initialProfessionFilter = 'all' }: CandidateManagementProps) {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const response = await apiClient.getCandidates();
        if (isMounted) setCandidates(response.candidates || []);
      } catch (e: any) {
        if (isMounted) setError(e?.message || 'Failed to load candidates');
      } finally {
        if (isMounted) setLoading(false);
      }
    })();
    return () => { isMounted = false; };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-red-50 flex items-center justify-center">
        <div className="bg-white border border-red-200 rounded-lg p-6 text-center">
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
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-semibold text-gray-900 mb-4">Candidates</h1>
        {candidates.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-gray-900 mb-2">No candidates found</h3>
            <p className="text-gray-600">Try adding a candidate from the backend API.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {candidates.map((c) => (
              <div key={c.id} className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">{c.name}</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Code: <span className="font-mono text-gray-800">{c.candidate_code}</span>
                    </p>
                  </div>
                  {c.extraction_source && (
                    <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                      {c.extraction_source === 'cv_parser' ? 'From CV' : 'Manual'}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                  {c.email && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase">Email</p>
                      <p className="text-sm text-gray-900">{c.email}</p>
                    </div>
                  )}
                  {c.phone && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase">Phone</p>
                      <p className="text-sm text-gray-900">{c.phone}</p>
                    </div>
                  )}
                  {c.address && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase">Location</p>
                      <p className="text-sm text-gray-900">{c.address}</p>
                    </div>
                  )}
                  {c.nationality && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase">Nationality</p>
                      <p className="text-sm text-gray-900">{c.nationality}</p>
                    </div>
                  )}
                  {c.experience_years && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase">Experience</p>
                      <p className="text-sm text-gray-900">{c.experience_years} years</p>
                    </div>
                  )}
                  {c.position && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase">Position</p>
                      <p className="text-sm text-gray-900">{c.position}</p>
                    </div>
                  )}
                </div>

                {c.professional_summary && (
                  <div className="mb-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Summary</p>
                    <p className="text-sm text-gray-700 line-clamp-2">{c.professional_summary}</p>
                  </div>
                )}

                {c.skills && (
                  <div className="mb-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Skills</p>
                    <div className="flex flex-wrap gap-2">
                      {(() => {
                        try {
                          const skills = typeof c.skills === 'string' ? JSON.parse(c.skills) : c.skills;
                          return Array.isArray(skills) ? skills.slice(0, 5).map((skill, i) => (
                            <span key={i} className="px-3 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                              {skill}
                            </span>
                          )) : null;
                        } catch {
                          return null;
                        }
                      })()}
                    </div>
                  </div>
                )}

                <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                  <p className="text-xs text-gray-500">
                    {c.extracted_at ? `Extracted: ${new Date(c.extracted_at).toLocaleDateString()}` : ''}
                  </p>
                  <button className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors">
                    View Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}