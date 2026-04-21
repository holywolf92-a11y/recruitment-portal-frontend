import { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, Link2, Download, RefreshCw, Search, CheckCircle, X, FileText, Mail, MessageSquare, Zap } from 'lucide-react';
import { api, apiClient, UnmatchedDocument, AutoLinkResult } from '../lib/apiClient';

interface UnmatchedDocumentsQueueProps {
  /** Called whenever a document is successfully linked so parent can refresh stats */
  onLinked?: () => void;
}

interface CandidateSearchResult {
  id: string;
  candidate_code: string;
  name: string;
  email?: string;
  phone?: string;
  cnic?: string;
}

export function UnmatchedDocumentsQueue({ onLinked }: UnmatchedDocumentsQueueProps) {
  const [documents, setDocuments] = useState<UnmatchedDocument[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'needs_review' | 'pending'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [needsReviewTotal, setNeedsReviewTotal] = useState<number | null>(null);

  // Candidate-link modal state
  const [linkingDoc, setLinkingDoc] = useState<UnmatchedDocument | null>(null);
  const [candidateSearch, setCandidateSearch] = useState('');
  const [candidateResults, setCandidateResults] = useState<CandidateSearchResult[]>([]);
  const [candidateSearchLoading, setCandidateSearchLoading] = useState(false);
  const [linking, setLinking] = useState(false);
  const [linkSuccess, setLinkSuccess] = useState<string | null>(null);

  // Auto-link modal state
  const [autoLinkOpen, setAutoLinkOpen] = useState(false);
  const [autoLinkRunning, setAutoLinkRunning] = useState(false);
  const [autoLinkPreview, setAutoLinkPreview] = useState<AutoLinkResult[] | null>(null);
  const [autoLinkStats, setAutoLinkStats] = useState<{ total: number; matched: number; linked: number; errors: number; minConfidence: number } | null>(null);
  const [autoLinkPhase, setAutoLinkPhase] = useState<'idle' | 'preview' | 'done'>('idle');

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.getUnmatchedDocuments({
        limit: pageSize,
        offset: (currentPage - 1) * pageSize,
        status: filterStatus === 'all' ? undefined : filterStatus,
      });
      setDocuments(result.documents);
      setTotal(result.total);
    } catch (e: any) {
      setError(e?.message || 'Failed to load unmatched documents');
    } finally {
      setLoading(false);
    }
  }, [filterStatus, currentPage, pageSize]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  // Fetch needs_review total once for accurate tab badge
  useEffect(() => {
    api.getUnmatchedDocuments({ limit: 1, offset: 0, status: 'needs_review' })
      .then(r => setNeedsReviewTotal(r.total))
      .catch(() => {});
  }, []);

  async function searchCandidates(query: string) {
    if (!query.trim() || query.trim().length < 2) {
      setCandidateResults([]);
      return;
    }
    setCandidateSearchLoading(true);
    try {
      const result = await apiClient.getCandidates({ search: query, limit: 10 });
      setCandidateResults(
        (result.candidates || []).map((c: any) => ({
          id: c.id,
          candidate_code: c.candidate_code,
          name: c.name,
          email: c.email,
          phone: c.phone,
          cnic: c.cnic,
        }))
      );
    } catch {
      setCandidateResults([]);
    } finally {
      setCandidateSearchLoading(false);
    }
  }

  async function handleLink(candidate: CandidateSearchResult) {
    if (!linkingDoc) return;
    setLinking(true);
    try {
      await api.linkUnmatchedDocument(linkingDoc.id, candidate.id);
      setLinkSuccess(`Linked to ${candidate.name} (${candidate.candidate_code})`);
      setDocuments(prev => prev.filter(d => d.id !== linkingDoc.id));
      setTotal(prev => Math.max(0, prev - 1));
      onLinked?.();
      setTimeout(() => {
        setLinkingDoc(null);
        setLinkSuccess(null);
        setCandidateResults([]);
        setCandidateSearch('');
      }, 1800);
    } catch (e: any) {
      setError(e?.message || 'Failed to link document');
    } finally {
      setLinking(false);
    }
  }

  function openLinkModal(doc: UnmatchedDocument) {
    setLinkingDoc(doc);
    setCandidateSearch('');
    setCandidateResults([]);
    setLinkSuccess(null);
  }

  async function runAutoLinkPreview() {
    setAutoLinkRunning(true);
    setAutoLinkPreview(null);
    setAutoLinkStats(null);
    setAutoLinkPhase('idle');
    setAutoLinkOpen(true);
    try {
      const res = await api.autoLinkUnmatchedDocuments({ dryRun: true, minConfidence: 0.92, limit: 2000 });
      setAutoLinkPreview(res.results);
      setAutoLinkStats({ total: res.total, matched: res.matched, linked: res.linked, errors: res.errors, minConfidence: res.minConfidence });
      setAutoLinkPhase('preview');
    } catch (e: any) {
      setError(e?.message || 'Auto-link preview failed');
      setAutoLinkOpen(false);
    } finally {
      setAutoLinkRunning(false);
    }
  }

  async function confirmAutoLink() {
    if (!autoLinkPreview?.length) return;
    setAutoLinkRunning(true);
    try {
      const res = await api.autoLinkUnmatchedDocuments({ dryRun: false, minConfidence: 0.92, limit: 2000 });
      setAutoLinkStats(s => s ? { ...s, linked: res.linked, errors: res.errors } : null);
      setAutoLinkPhase('done');
      onLinked?.();
      loadDocuments();
    } catch (e: any) {
      setError(e?.message || 'Auto-link failed');
    } finally {
      setAutoLinkRunning(false);
    }
  }

  function closeModal() {
    if (linking) return;
    setLinkingDoc(null);
    setCandidateSearch('');
    setCandidateResults([]);
    setLinkSuccess(null);
  }

  function getSourceIcon(source: string) {
    if (source === 'whatsapp') return <MessageSquare size={14} className="inline mr-1 text-green-600" />;
    if (source === 'email') return <Mail size={14} className="inline mr-1 text-blue-600" />;
    return <FileText size={14} className="inline mr-1 text-gray-500" />;
  }

  const needsReviewCount = needsReviewTotal ?? documents.filter(d => d.needs_manual_review).length;
  const totalPages = Math.ceil(total / pageSize);
  const rangeStart = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const rangeEnd = Math.min(currentPage * pageSize, total);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <AlertTriangle size={18} className="text-amber-500" />
            Unmatched Documents Queue
            {total > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-amber-100 text-amber-800 text-xs font-bold rounded-full">
                {total}
              </span>
            )}
          </h3>
          <p className="text-sm text-gray-500 mt-0.5">
            Documents that couldn't be automatically linked to a candidate — manually assign them below.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={runAutoLinkPreview}
            disabled={loading || autoLinkRunning}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
            title="Automatically link documents to candidates using name/email matching"
          >
            <Zap size={14} className={autoLinkRunning ? 'animate-pulse' : ''} />
            Smart Auto-Link
          </button>
          <button
            onClick={loadDocuments}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 text-sm">
        {(['all', 'needs_review', 'pending'] as const).map(f => (
          <button
            key={f}
            onClick={() => { setFilterStatus(f); setCurrentPage(1); }}
            className={`px-3 py-1 rounded-full border transition-colors ${
              filterStatus === f
                ? 'bg-amber-500 text-white border-amber-500'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}
          >
            {f === 'all' ? `All (${total})` : f === 'needs_review' ? `Needs Review (${needsReviewCount})` : 'Pending'}
          </button>
        ))}
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
          <AlertTriangle size={14} /> {error}
          <button onClick={() => setError(null)} className="ml-auto"><X size={14} /></button>
        </div>
      )}

      {/* Document table */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">
          <RefreshCw size={24} className="animate-spin mx-auto mb-2" />
          Loading documents…
        </div>
      ) : documents.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-xl border border-dashed border-gray-200">
          <CheckCircle size={40} className="mx-auto mb-3 text-green-400" />
          <p className="font-medium text-gray-600">All clear!</p>
          <p className="text-sm text-gray-400 mt-1">No unmatched documents waiting for review.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">File</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Type</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Source</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Received</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Review Reason</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {documents.map(doc => (
                <tr key={doc.id} className={`hover:bg-gray-50 transition-colors ${doc.needs_manual_review ? 'bg-amber-50/30' : ''}`}>
                  <td className="px-4 py-3 truncate max-w-[220px]">
                    <span className="font-medium text-gray-800" title={doc.file_name}>{doc.file_name}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-medium capitalize">
                      {doc.document_type.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {getSourceIcon(doc.source)}
                    <span className="capitalize">{doc.source}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                    {doc.received_at ? new Date(doc.received_at).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {doc.needs_manual_review ? (
                      <div className="flex items-start gap-1">
                        <AlertTriangle size={13} className="text-amber-500 mt-0.5 shrink-0" />
                        <span className="text-xs text-amber-700 line-clamp-2">
                          {Array.isArray(doc.review_reasons) && doc.review_reasons.length > 0
                            ? doc.review_reasons[0]
                            : 'Manual review required'}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">Awaiting auto-link</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {doc.downloadUrl && (
                        <a
                          href={doc.downloadUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                          title="Download"
                        >
                          <Download size={15} />
                        </a>
                      )}
                      <button
                        onClick={() => openLinkModal(doc)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 transition-colors"
                      >
                        <Link2 size={13} /> Link to Candidate
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {/* Pagination footer */}
          {total > pageSize && (
            <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between flex-wrap gap-3 bg-gray-50">
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-500">Per page:</span>
                <select
                  value={pageSize}
                  onChange={e => { setPageSize(parseInt(e.target.value, 10)); setCurrentPage(1); }}
                  className="border border-gray-200 rounded px-2 py-1 text-xs text-gray-700"
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <span className="text-xs text-gray-500">
                  {rangeStart}–{rangeEnd} of {total.toLocaleString()} documents
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  disabled={currentPage <= 1 || loading}
                  onClick={() => setCurrentPage(p => p - 1)}
                  className="px-3 py-1 text-xs border border-gray-200 rounded-lg hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  ← Prev
                </button>
                <span className="px-3 py-1 text-xs text-gray-600">
                  {currentPage} / {totalPages}
                </span>
                <button
                  disabled={currentPage >= totalPages || loading}
                  onClick={() => setCurrentPage(p => p + 1)}
                  className="px-3 py-1 text-xs border border-gray-200 rounded-lg hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Link modal */}
      {linkingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h4 className="font-semibold text-gray-800 text-base">Link Document to Candidate</h4>
                <p className="text-xs text-gray-500 mt-0.5 truncate max-w-xs">{linkingDoc.file_name}</p>
              </div>
              <button
                onClick={closeModal}
                disabled={linking}
                className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal body */}
            <div className="px-6 py-5 space-y-4">
              {linkSuccess ? (
                <div className="flex flex-col items-center gap-3 py-6">
                  <CheckCircle size={40} className="text-green-500" />
                  <p className="font-medium text-gray-700">{linkSuccess}</p>
                </div>
              ) : (
                <>
                  {/* Document preview */}
                  <div className="p-3 bg-amber-50 rounded-lg border border-amber-100 text-sm">
                    <div className="flex items-start gap-2">
                      <AlertTriangle size={14} className="text-amber-500 mt-0.5 shrink-0" />
                      <div>
                        {Array.isArray(linkingDoc.review_reasons) && linkingDoc.review_reasons.length > 0 ? (
                          linkingDoc.review_reasons.map((r, i) => (
                            <p key={i} className="text-amber-700 text-xs">{r}</p>
                          ))
                        ) : (
                          <p className="text-amber-700 text-xs">No match found automatically — search for the candidate below.</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Candidate search */}
                  <div className="relative">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search by name, CNIC, phone, or code…"
                      value={candidateSearch}
                      onChange={e => {
                        setCandidateSearch(e.target.value);
                        searchCandidates(e.target.value);
                      }}
                      className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                      autoFocus
                    />
                    {candidateSearchLoading && (
                      <RefreshCw size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" />
                    )}
                  </div>

                  {/* Results */}
                  {candidateResults.length > 0 && (
                    <div className="border border-gray-200 rounded-xl divide-y divide-gray-100 max-h-64 overflow-y-auto">
                      {candidateResults.map(c => (
                        <button
                          key={c.id}
                          disabled={linking}
                          onClick={() => handleLink(c)}
                          className="w-full text-left px-4 py-3 hover:bg-indigo-50 transition-colors flex items-center justify-between group"
                        >
                          <div>
                            <p className="font-medium text-gray-800 text-sm">{c.name}</p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {c.candidate_code}
                              {c.cnic && ` · CNIC ${c.cnic}`}
                              {c.phone && ` · ${c.phone}`}
                            </p>
                          </div>
                          <Link2 size={15} className="text-gray-300 group-hover:text-indigo-500 transition-colors" />
                        </button>
                      ))}
                    </div>
                  )}

                  {candidateSearch.length >= 2 && !candidateSearchLoading && candidateResults.length === 0 && (
                    <p className="text-center text-sm text-gray-400 py-4">No candidates found for "{candidateSearch}"</p>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Auto-Link modal */}
      {autoLinkOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden flex flex-col max-h-[85vh]">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
              <div>
                <h4 className="font-semibold text-gray-800 text-base flex items-center gap-2">
                  <Zap size={16} className="text-indigo-500" />
                  Smart Auto-Link
                </h4>
                <p className="text-xs text-gray-500 mt-0.5">
                  Automatically matches documents to candidates using name & email similarity (≥92% confidence)
                </p>
              </div>
              {autoLinkPhase !== 'idle' && !autoLinkRunning && (
                <button
                  onClick={() => { setAutoLinkOpen(false); setAutoLinkPhase('idle'); setAutoLinkPreview(null); }}
                  className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors"
                >
                  <X size={18} />
                </button>
              )}
            </div>

            {/* Modal body */}
            <div className="px-6 py-5 overflow-y-auto flex-1 space-y-4">
              {autoLinkRunning && (
                <div className="flex flex-col items-center gap-3 py-10">
                  <RefreshCw size={32} className="animate-spin text-indigo-400" />
                  <p className="text-gray-600 font-medium">
                    {autoLinkPhase === 'idle' ? 'Scanning for matches…' : 'Linking documents…'}
                  </p>
                  <p className="text-xs text-gray-400">This may take a few seconds for large queues</p>
                </div>
              )}

              {!autoLinkRunning && autoLinkPhase === 'preview' && autoLinkStats && (
                <>
                  {/* Summary stats */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 bg-gray-50 rounded-xl text-center">
                      <p className="text-2xl font-bold text-gray-800">{autoLinkStats.total.toLocaleString()}</p>
                      <p className="text-xs text-gray-500 mt-0.5">Docs scanned</p>
                    </div>
                    <div className="p-3 bg-indigo-50 rounded-xl text-center">
                      <p className="text-2xl font-bold text-indigo-700">{autoLinkStats.matched.toLocaleString()}</p>
                      <p className="text-xs text-indigo-500 mt-0.5">Matches found (≥{autoLinkStats.minConfidence}%)</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-xl text-center">
                      <p className="text-2xl font-bold text-gray-800">{autoLinkStats.total - autoLinkStats.matched}</p>
                      <p className="text-xs text-gray-500 mt-0.5">Below threshold</p>
                    </div>
                  </div>

                  {autoLinkStats.matched === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                      <CheckCircle size={32} className="mx-auto mb-2 text-gray-300" />
                      <p>No documents met the {autoLinkStats.minConfidence}% confidence threshold.</p>
                      <p className="text-sm mt-1">Try lowering the threshold or link manually.</p>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm text-gray-600 font-medium">Preview of matches to be linked:</p>
                      <div className="border border-gray-200 rounded-xl overflow-hidden">
                        <table className="w-full text-xs">
                          <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                              <th className="text-left px-3 py-2 font-medium text-gray-600">Document</th>
                              <th className="text-left px-3 py-2 font-medium text-gray-600">→ Candidate</th>
                              <th className="text-left px-3 py-2 font-medium text-gray-600">Signal</th>
                              <th className="text-right px-3 py-2 font-medium text-gray-600">Confidence</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {(autoLinkPreview || []).slice(0, 50).map(r => (
                              <tr key={r.docId} className="hover:bg-gray-50">
                                <td className="px-3 py-2 max-w-[200px] truncate text-gray-700" title={r.fileName}>{r.fileName}</td>
                                <td className="px-3 py-2 font-medium text-gray-800">{r.candidateName}</td>
                                <td className="px-3 py-2">
                                  <span className={`px-1.5 py-0.5 rounded text-xs ${r.signal === 'email' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'}`}>
                                    {r.signal}
                                  </span>
                                </td>
                                <td className="px-3 py-2 text-right">
                                  <span className={`font-bold ${r.confidence >= 97 ? 'text-green-600' : r.confidence >= 94 ? 'text-indigo-600' : 'text-amber-600'}`}>
                                    {r.confidence}%
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {(autoLinkPreview || []).length > 50 && (
                          <p className="px-3 py-2 text-xs text-gray-400 bg-gray-50 border-t border-gray-100">
                            …and {(autoLinkPreview || []).length - 50} more
                          </p>
                        )}
                      </div>
                    </>
                  )}
                </>
              )}

              {!autoLinkRunning && autoLinkPhase === 'done' && autoLinkStats && (
                <div className="flex flex-col items-center gap-4 py-8">
                  <CheckCircle size={48} className="text-green-500" />
                  <div className="text-center">
                    <p className="text-xl font-bold text-gray-800">{autoLinkStats.linked} documents linked!</p>
                    {autoLinkStats.errors > 0 && (
                      <p className="text-sm text-amber-600 mt-1">{autoLinkStats.errors} errors — check logs</p>
                    )}
                    <p className="text-sm text-gray-500 mt-2">The unmatched queue has been updated.</p>
                  </div>
                </div>
              )}
            </div>

            {/* Modal footer */}
            {!autoLinkRunning && autoLinkPhase === 'preview' && (autoLinkStats?.matched ?? 0) > 0 && (
              <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between shrink-0">
                <button
                  onClick={() => { setAutoLinkOpen(false); setAutoLinkPhase('idle'); setAutoLinkPreview(null); }}
                  className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmAutoLink}
                  className="flex items-center gap-2 px-5 py-2 text-sm text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 font-medium"
                >
                  <Zap size={14} />
                  Confirm & Link {autoLinkStats?.matched} Documents
                </button>
              </div>
            )}
            {!autoLinkRunning && autoLinkPhase === 'done' && (
              <div className="px-6 py-4 border-t border-gray-100 flex justify-end shrink-0">
                <button
                  onClick={() => { setAutoLinkOpen(false); setAutoLinkPhase('idle'); setAutoLinkPreview(null); }}
                  className="px-4 py-2 text-sm text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 font-medium"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
