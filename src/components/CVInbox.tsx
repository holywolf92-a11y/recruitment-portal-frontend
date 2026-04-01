import { useState, useEffect, useRef, ChangeEvent } from 'react';
import { Inbox, Upload, FileText, Mail, MessageSquare, Calendar, CheckCircle, Sparkles, Eye, Download, AlertTriangle, Play, Trash, Link2 } from 'lucide-react';
import { api, CVInboxItem, Attachment, InboxMessage } from '../lib/apiClient';
import { UnmatchedDocumentsQueue } from './UnmatchedDocumentsQueue';

interface Props {
  onNavigateToCandidate?: (candidateId: string) => void;
}

const DEFAULT_DAYS = 30;

export function CVInbox({ onNavigateToCandidate }: Props) {
  const [cvs, setCvs] = useState<CVInboxItem[]>([]);
  const [stats, setStats] = useState({ total: 0, extracted: 0, processing: 0, queued: 0, errors: 0 });
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const activePollsRef = useRef<Set<string>>(new Set());
  const [activeView, setActiveView] = useState<'inbox' | 'unmatched'>('inbox');
  const [unmatchedCount, setUnmatchedCount] = useState<number>(0);
  const [days, setDays] = useState<number>(DEFAULT_DAYS);

  const sinceDate = () => {
    if (days <= 0) return undefined; // all time
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString();
  };

  const genExternalId = () => {
    if (typeof crypto !== 'undefined' && (crypto as any).randomUUID) {
      return (crypto as any).randomUUID();
    }
    return `web-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  };

  useEffect(() => {
    loadData().catch(() => {});
    api.getUnmatchedDocuments({ limit: 1 })
      .then(r => setUnmatchedCount(r.total))
      .catch(() => {});
  }, [days]);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      // Single efficient call — replaces 200+ individual API requests
      const result = await api.getCvInboxItems({ limit: 200, since: sinceDate() });
      const items = result.items;
      setCvs(items);

      // Compute stats from loaded items + accurate total from backend
      const statsTotal = result.total;
      const extracted = items.filter(i => i.status === 'extracted').length;
      const processing = items.filter(i => i.status === 'processing').length;
      const queued = items.filter(i => i.status === 'queued').length;
      const errors = items.filter(i => i.status === 'error').length;
      setStats({ total: statsTotal, extracted, processing, queued, errors });

    } catch (e: any) {
      // Fallback to legacy N+1 approach if new endpoint not yet deployed
      try {
        await loadDataLegacy();
      } catch {
        setError(e?.message || 'Failed to load CV inbox');
      }
    } finally {
      setLoading(false);
    }
  }

  // Legacy fallback loader (kept for compatibility during deploy transition)
  async function loadDataLegacy() {
    const { messages } = await api.listInboxMessages({ limit: 100, offset: 0 });
    const allAttachmentsArrays = await Promise.all(
      messages.map((m) => api.listAttachments(m.id).catch(() => [] as Attachment[]))
    );
    const items: CVInboxItem[] = [];
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      const atts = allAttachmentsArrays[i] || [];
      for (const a of atts) {
        const resolvedCandidateId = a.candidate_id || a.linked_candidate_id;
        items.push({
          id: a.id,
          messageId: msg.id,
          fileName: a.file_name || 'Attachment',
          source: msg.source,
          senderName: (msg.payload?.sender_name || 'Unknown'),
          senderContact: (msg.payload?.sender_contact || 'Unknown'),
          receivedAt: msg.received_at || new Date().toISOString(),
          candidateId: resolvedCandidateId || null,
          status: resolvedCandidateId ? 'extracted' : 'queued',
        });
      }
    }
    const hydrated = await Promise.all(
      items.map(async (cv) => {
        if (cv.candidateId) return cv;
        try {
          const job = await api.getParsingJobByAttachment(cv.id);
          if (!job) return cv;
          return { ...cv, jobId: job.id, status: job.status as CVInboxItem['status'] };
        } catch { return cv; }
      })
    );
    setCvs(hydrated);
    const total = hydrated.length;
    setStats({
      total,
      extracted: hydrated.filter(i => i.status === 'extracted').length,
      processing: hydrated.filter(i => i.status === 'processing').length,
      queued: hydrated.filter(i => i.status === 'queued').length,
      errors: hydrated.filter(i => i.status === 'error').length,
    });
  }

  async function pollJob(jobId: string, attachmentId: string) {
    let attempts = 0;
    const maxAttempts = 60;
    let stopped = false;
    let timeoutId: number | undefined;
    let delayMs = 2000;
    const maxDelayMs = 10000;
    let resolveDone: (() => void) | null = null;
    const donePromise = new Promise<void>((resolve) => { resolveDone = resolve; });

    const stop = () => {
      stopped = true;
      if (timeoutId) window.clearTimeout(timeoutId);
      if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onVisibilityChange);
      if (resolveDone) resolveDone();
    };

    const schedule = () => {
      if (stopped) return;
      timeoutId = window.setTimeout(() => { void tick(); }, delayMs);
    };

    const onVisibilityChange = () => {
      if (stopped || (typeof document !== 'undefined' && document.hidden)) return;
      delayMs = 2000;
      void tick();
    };

    const tick = async () => {
      if (stopped || (typeof document !== 'undefined' && document.hidden)) return;
      attempts += 1;
      try {
        const job = await api.getParsingJob(jobId);
        if (job.status === 'extracted') {
          stop();
          setCvs(prev => prev.map(cv => cv.id === attachmentId ? { ...cv, status: 'extracted' } : cv));
          await loadData();
          return;
        }
        if (job.status === 'failed') {
          stop();
          setCvs(prev => prev.map(cv => cv.id === attachmentId ? { ...cv, status: 'error', jobError: job.error_message || 'Parsing failed' } : cv));
          return;
        }
        setCvs(prev => prev.map(cv => cv.id === attachmentId ? { ...cv, status: job.status as CVInboxItem['status'] } : cv));
      } catch (e: any) {
        stop();
        setCvs(prev => prev.map(cv => cv.id === attachmentId ? { ...cv, status: 'error', jobError: `Status check failed: ${e?.message || 'unknown'}` } : cv));
        return;
      }
      if (attempts >= maxAttempts) {
        stop();
        setCvs(prev => prev.map(cv => cv.id === attachmentId ? { ...cv, status: 'error', jobError: 'Processing timeout' } : cv));
        return;
      }
      delayMs = Math.min(Math.round(delayMs * 1.5), maxDelayMs);
      schedule();
    };

    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onVisibilityChange);
    await tick();
    return donePromise;
  }

  const startAutoPolling = (items: CVInboxItem[]) => {
    for (const cv of items) {
      if ((cv.status === 'queued' || cv.status === 'processing') && cv.jobId) {
        if (activePollsRef.current.has(cv.jobId)) continue;
        activePollsRef.current.add(cv.jobId);
        void (async () => {
          try { await pollJob(cv.jobId as string, cv.id); }
          finally { activePollsRef.current.delete(cv.jobId as string); }
        })();
      }
    }
  };

  useEffect(() => {
    if (!cvs.length) return;
    startAutoPolling(cvs);
  }, [cvs]);

  const toBase64 = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(',').pop() || '');
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });

  const handleManualUploadClick = () => fileInputRef.current?.click();

  const handleManualUploadFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const base64 = await toBase64(file);
      const message = await api.createInboxMessage({
        source: 'web',
        status: 'received',
        received_at: new Date().toISOString(),
        external_message_id: genExternalId(),
        payload: { sender_name: 'Manual Upload', sender_contact: 'web' },
      });
      const uploadResult = await api.uploadAttachment(message.id, {
        file_base64: base64,
        file_name: file.name,
        mime_type: file.type || 'application/octet-stream',
        attachment_type: 'cv',
        storage_bucket: 'documents',
        storage_path: `inbox/${file.name}`,
      });
      const attachment = uploadResult.attachment;
      const jobId = uploadResult.job_id || undefined;
      const status = (uploadResult.status as CVInboxItem['status'] | undefined) || 'queued';
      const newCv: CVInboxItem = {
        id: attachment.id,
        messageId: message.id,
        fileName: attachment.file_name || file.name,
        source: 'web',
        senderName: 'Manual Upload',
        senderContact: 'web',
        receivedAt: new Date().toISOString(),
        candidateId: attachment.candidate_id || null,
        jobId,
        status,
      };
      setCvs(prev => [newCv, ...prev]);
      if (jobId) await pollJob(jobId, attachment.id);
    } catch (e: any) {
      setError(e?.message || 'Manual upload failed');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const handleDelete = async (attachmentId: string) => {
    if (!window.confirm('Delete this CV from inbox?')) return;
    setError(null);
    const previous = cvs;
    setCvs(prev => prev.filter(cv => cv.id !== attachmentId));
    try {
      await api.deleteAttachment(attachmentId);
    } catch (e: any) {
      setError(e?.message || 'Failed to delete CV');
      setCvs(previous);
    }
  };

  const handleRetry = (cvId: string) => {
    setCvs(prev => prev.map(cv => cv.id === cvId ? { ...cv, status: 'processing', jobError: undefined } : cv));
    void (async () => {
      try {
        const res = await api.retryParsing(cvId);
        const jobId = res.job_id;
        setCvs(prev => prev.map(cv => cv.id === cvId ? { ...cv, jobId, status: res.status as CVInboxItem['status'] } : cv));
        await pollJob(jobId, cvId);
      } catch (e: any) {
        setCvs(prev => prev.map(cv => cv.id === cvId ? { ...cv, status: 'error', jobError: `Retry failed: ${e?.message || 'unknown error'}` } : cv));
      }
    })();
  };

  const handleProcess = (attachmentId: string) => {
    handleRetry(attachmentId);
  };

  const handleViewCandidate = (candidateId: string) => {
    if (onNavigateToCandidate) {
      onNavigateToCandidate(candidateId);
    } else {
      // Fallback: navigate via URL
      const url = new URL(window.location.href);
      url.searchParams.set('tab', 'candidates');
      url.searchParams.set('candidateId', candidateId);
      window.history.pushState({}, '', url.toString());
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  // Filter includes 'queued' as part of 'processing' tab (matching what the badge counts)
  const filteredCVs = filterStatus === 'all'
    ? cvs
    : filterStatus === 'processing'
    ? cvs.filter(cv => cv.status === 'processing' || cv.status === 'queued')
    : cvs.filter(cv => cv.status === filterStatus);

  const displayStats = {
    total: stats.total,
    processing: stats.processing + stats.queued,
    extracted: stats.extracted,
    errors: stats.errors,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl">CV Inbox</h1>
          <p className="text-gray-600 mt-1">Automatic AI extraction - CVs become candidates instantly</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Date range selector */}
          <select
            value={days}
            onChange={e => setDays(parseInt(e.target.value, 10))}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
            <option value={0}>All time</option>
          </select>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx,.txt,.rtf"
            className="hidden"
            onChange={handleManualUploadFile}
          />
          <button
            onClick={handleManualUploadClick}
            disabled={uploading}
            className={`bg-blue-600 text-white px-6 py-3 rounded-lg transition-colors flex items-center gap-2 shadow-lg ${uploading ? 'opacity-70 cursor-not-allowed' : 'hover:bg-blue-700'}`}
          >
            <Upload className="w-5 h-5" />
            {uploading ? 'Uploading...' : 'Upload CV'}
          </button>
        </div>
      </div>

      {/* View switcher */}
      <div className="flex gap-2 border-b border-gray-200 pb-1 overflow-x-auto">
        <button
          onClick={() => setActiveView('inbox')}
          className={`flex items-center gap-2 px-4 py-2 rounded-t-lg text-sm font-medium transition-colors ${
            activeView === 'inbox' ? 'bg-white border border-b-white border-gray-200 text-blue-700 -mb-px z-10 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Inbox size={15} />
          CV Inbox
        </button>
        <button
          onClick={() => setActiveView('unmatched')}
          className={`flex items-center gap-2 px-4 py-2 rounded-t-lg text-sm font-medium transition-colors ${
            activeView === 'unmatched' ? 'bg-white border border-b-white border-gray-200 text-amber-600 -mb-px z-10 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Link2 size={15} />
          Unmatched Queue
          {unmatchedCount > 0 && (
            <span className="px-1.5 py-0.5 bg-amber-500 text-white text-xs font-bold rounded-full min-w-[20px] text-center">{unmatchedCount}</span>
          )}
        </button>
      </div>

      {activeView === 'unmatched' ? (
        <UnmatchedDocumentsQueue onLinked={() => setUnmatchedCount(prev => Math.max(0, prev - 1))} />
      ) : (
        <>
          {/* Stats Cards */}
          <div className="flex gap-3 overflow-x-auto pb-2">
            <div className="min-w-[200px] flex-1 bg-gradient-to-br from-gray-500 to-gray-600 rounded-xl p-5 shadow-lg text-white transform transition-all hover:scale-105">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm opacity-90">Total CVs</span>
                <Inbox className="w-6 h-6 opacity-80" />
              </div>
              <div className="text-3xl font-bold">{displayStats.total.toLocaleString()}</div>
              <div className="text-xs opacity-75 mt-2">{days > 0 ? `Last ${days} days` : 'All time'}</div>
            </div>
            <div className="min-w-[200px] flex-1 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-5 shadow-lg text-white transform transition-all hover:scale-105">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm opacity-90">Processing / Queued</span>
                <Sparkles className="w-6 h-6 opacity-80 animate-pulse" />
              </div>
              <div className="text-3xl font-bold">{displayStats.processing}</div>
              <div className="text-xs opacity-75 mt-2">AI extracting now...</div>
            </div>
            <div className="min-w-[200px] flex-1 bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-5 shadow-lg text-white transform transition-all hover:scale-105">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm opacity-90">Extracted</span>
                <CheckCircle className="w-6 h-6 opacity-80" />
              </div>
              <div className="text-3xl font-bold">{displayStats.extracted}</div>
              <div className="text-xs opacity-75 mt-2">Now candidates</div>
            </div>
            <div className="min-w-[200px] flex-1 bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-5 shadow-lg text-white transform transition-all hover:scale-105">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm opacity-90">Errors</span>
                <AlertTriangle className="w-6 h-6 opacity-80" />
              </div>
              <div className="text-3xl font-bold">{displayStats.errors}</div>
              <div className="text-xs opacity-75 mt-2">Need manual fix</div>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <div className="flex items-center gap-2 flex-nowrap overflow-x-auto pb-1 sm:flex-wrap">
              {[
                { key: 'all', label: 'All', count: cvs.length },
                { key: 'processing', label: 'Processing / Queued', count: cvs.filter(c => c.status === 'processing' || c.status === 'queued').length },
                { key: 'extracted', label: 'Extracted', count: cvs.filter(c => c.status === 'extracted').length },
                { key: 'error', label: 'Errors', count: cvs.filter(c => c.status === 'error').length },
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setFilterStatus(tab.key)}
                  className={`px-5 py-2.5 rounded-lg transition-all font-medium whitespace-nowrap ${
                    filterStatus === tab.key
                      ? tab.key === 'extracted' ? 'bg-gradient-to-r from-green-600 to-green-700 text-white shadow-lg'
                        : tab.key === 'error' ? 'bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg'
                        : 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {tab.label} <span className="ml-1 opacity-75">({tab.count})</span>
                </button>
              ))}
            </div>
            {days > 0 && (
              <p className="text-xs text-gray-400 mt-2">Showing last {days} days · {cvs.length} CVs loaded · {displayStats.total.toLocaleString()} total</p>
            )}
          </div>

          {/* CV List */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              {loading && <div className="p-4 text-sm text-gray-600">Loading inbox...</div>}
              {error && <div className="p-4 text-sm text-red-600">{error}</div>}
              <table className="w-full min-w-[960px]">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs uppercase tracking-wider text-gray-600">CV Details</th>
                    <th className="px-6 py-4 text-left text-xs uppercase tracking-wider text-gray-600">Source</th>
                    <th className="px-6 py-4 text-left text-xs uppercase tracking-wider text-gray-600">Sender Info</th>
                    <th className="px-6 py-4 text-left text-xs uppercase tracking-wider text-gray-600">Received</th>
                    <th className="px-6 py-4 text-left text-xs uppercase tracking-wider text-gray-600">Status</th>
                    <th className="px-6 py-4 text-left text-xs uppercase tracking-wider text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredCVs.map((cv) => (
                    <tr key={cv.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            (cv.status === 'processing' || cv.status === 'queued') ? 'bg-blue-100 animate-pulse' :
                            cv.status === 'extracted' ? 'bg-green-100' : 'bg-red-100'
                          }`}>
                            <FileText className={`w-5 h-5 ${
                              (cv.status === 'processing' || cv.status === 'queued') ? 'text-blue-600' :
                              cv.status === 'extracted' ? 'text-green-600' : 'text-red-600'
                            }`} />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{cv.fileName}</p>
                            {cv.status === 'error' && cv.jobError && (
                              <p className="text-xs text-red-600 mt-1">{cv.jobError}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 flex-wrap">
                          {(cv.source === 'whatsapp' || cv.source === 'WhatsApp') && (
                            <><MessageSquare className="w-4 h-4 text-green-600" /><span className="text-sm text-green-700 font-medium">WhatsApp</span></>
                          )}
                          {(cv.source === 'email' || cv.source === 'hostinger-imap') && (
                            <><Mail className="w-4 h-4 text-blue-600" /><span className="text-sm text-blue-700 font-medium">Email</span></>
                          )}
                          {cv.source === 'web' && (
                            <><Upload className="w-4 h-4 text-purple-600" /><span className="text-sm text-purple-700 font-medium">Web Form</span></>
                          )}
                          {!['whatsapp', 'WhatsApp', 'email', 'hostinger-imap', 'web'].includes(cv.source) && (
                            <span className="text-sm text-gray-500">{cv.source}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{cv.senderName || 'Unknown'}</p>
                          <p className="text-sm text-gray-500">{cv.senderContact || '-'}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Calendar className="w-4 h-4" />
                          {cv.receivedAt ? new Date(cv.receivedAt).toLocaleString() : '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {(cv.status === 'processing' || cv.status === 'queued') && (
                          <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium flex items-center gap-1 w-fit">
                            <Sparkles className="w-3 h-3 animate-spin" />
                            {cv.status === 'queued' ? 'Queued' : 'AI Processing...'}
                          </span>
                        )}
                        {cv.status === 'extracted' && (
                          <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium flex items-center gap-1 w-fit">
                            <CheckCircle className="w-3 h-3" />
                            Extracted
                          </span>
                        )}
                        {cv.status === 'error' && (
                          <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium flex items-center gap-1 w-fit">
                            <AlertTriangle className="w-3 h-3" />
                            Error
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {cv.status === 'extracted' && cv.candidateId && (
                            <button
                              onClick={() => handleViewCandidate(cv.candidateId!)}
                              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 text-sm"
                            >
                              <Eye className="w-4 h-4" />
                              View Candidate
                            </button>
                          )}
                          {(cv.status === 'queued' || cv.status === 'error') && (
                            <button
                              onClick={() => handleProcess(cv.id)}
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm"
                            >
                              <Play className="w-4 h-4" />
                              {cv.status === 'error' ? 'Retry' : 'Process CV'}
                            </button>
                          )}
                          <button
                            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Download"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(cv.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete CV"
                          >
                            <Trash className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!loading && filteredCVs.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-10 text-center text-gray-400 text-sm">
                        No CVs found for the current filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* How It Works */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 border border-blue-200">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center text-white flex-shrink-0">
                <Sparkles className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-2">🤖 Fully Automatic AI Processing</h3>
                <p className="text-sm text-gray-700 mb-4">
                  When a CV arrives from WhatsApp, Email, or Web Form, our AI automatically:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 text-sm mb-4">
                  {['Reads the CV file', 'Extracts all data', 'Creates candidate profile', 'Flags if needs review'].map((step, i) => (
                    <div key={i} className="flex items-center gap-2 text-gray-700">
                      <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-semibold">{i + 1}</div>
                      {step}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

interface IncomingCV {
  id: string; // attachment id
  fileName: string;
  source: 'WhatsApp' | 'Email' | 'Web Form' | 'Unknown';
  senderName: string;
  senderContact: string;
  receivedDate: string;
  fileSize: string;
  status: 'processing' | 'extracted' | 'error' | 'queued';
  candidateId?: string;
  errorMessage?: string;
  confidence?: number;
  jobId?: string;
  messageId: string;
}

export function CVInbox() {
  const [cvs, setCvs] = useState<IncomingCV[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const activePollsRef = useRef<Set<string>>(new Set());
  const [activeView, setActiveView] = useState<'inbox' | 'unmatched'>('inbox');
  const [unmatchedCount, setUnmatchedCount] = useState<number>(0);

  const genExternalId = () => {
    if (typeof crypto !== 'undefined' && (crypto as any).randomUUID) {
      return (crypto as any).randomUUID();
    }
    // Fallback for older browsers
    return `web-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  };

  useEffect(() => {
    loadData().catch(() => {});
    // Pre-fetch unmatched count for the badge
    api.getUnmatchedDocuments({ limit: 1 })
      .then(r => setUnmatchedCount(r.total))
      .catch(() => {});
  }, []);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const { messages } = await api.listInboxMessages({ limit: 200, offset: 0 });
      const byId: Record<string, InboxMessage> = Object.fromEntries(messages.map(m => [m.id, m]));
      const allAttachmentsArrays = await Promise.all(
        messages.map((m) => api.listAttachments(m.id).catch(() => [] as Attachment[]))
      );
      const items: IncomingCV[] = [];
      for (let i = 0; i < messages.length; i++) {
        const msg = messages[i];
        const atts = allAttachmentsArrays[i] || [];
        for (const a of atts) {
          // WhatsApp identity-first flow writes linked_candidate_id (not candidate_id).
          // Treat either field as a signal that the attachment was successfully extracted.
          const resolvedCandidateId = a.candidate_id || a.linked_candidate_id;
          items.push({
            id: a.id,
            messageId: msg.id,
            fileName: a.file_name || 'Attachment',
            source: (msg.source === 'whatsapp' ? 'WhatsApp' : (msg.source === 'email' || msg.source === 'hostinger-imap') ? 'Email' : msg.source === 'web' ? 'Web Form' : 'Unknown'),
            senderName: (msg.payload?.sender_name || 'Unknown'),
            senderContact: (msg.payload?.sender_contact || 'Unknown'),
            receivedDate: msg.received_at ? new Date(msg.received_at).toLocaleString() : '-',
            fileSize: '-',
            status: resolvedCandidateId ? 'extracted' : 'queued',
            candidateId: resolvedCandidateId || undefined,
          });
        }
      }
      const hydrated = await Promise.all(
        items.map(async (cv) => {
          if (cv.candidateId) return cv;
          try {
            const job = await api.getParsingJobByAttachment(cv.id);
            if (!job) return cv;
            const status = job.status as IncomingCV['status'];
            return { ...cv, jobId: job.id, status };
          } catch {
            return cv;
          }
        })
      );
      setCvs(hydrated);
    } catch (e: any) {
      setError(e?.message || 'Failed to load CV inbox');
    } finally {
      setLoading(false);
    }
  }

  async function handleProcess(attachmentId: string) {
    const current = cvs.find((cv) => cv.id === attachmentId);
    if (!current?.jobId) {
      handleRetry(attachmentId);
      return;
    }
    setCvs((prev) => prev.map(cv => cv.id === attachmentId ? { ...cv, status: 'processing', errorMessage: undefined } : cv));
    pollJob(current.jobId, attachmentId);
  }

  async function pollJob(jobId: string, attachmentId: string) {
    let attempts = 0;
    const maxAttempts = 60; // ~2 minutes at baseline

    let stopped = false;
    let timeoutId: number | undefined;
    let delayMs = 2000;
    const maxDelayMs = 10000;
    let resolveDone: (() => void) | null = null;
    const donePromise = new Promise<void>((resolve) => {
      resolveDone = resolve;
    });

    const stop = () => {
      stopped = true;
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', onVisibilityChange);
      }
      if (resolveDone) {
        resolveDone();
      }
    };

    const schedule = () => {
      if (stopped) return;
      timeoutId = window.setTimeout(() => {
        void tick();
      }, delayMs);
    };

    const onVisibilityChange = () => {
      if (stopped) return;
      if (typeof document !== 'undefined' && document.hidden) return;
      // Resume immediately on return to tab
      delayMs = 2000;
      void tick();
    };

    const tick = async () => {
      if (stopped) return;

      // Pause polling when tab is hidden
      if (typeof document !== 'undefined' && document.hidden) {
        return;
      }

      attempts += 1;
      try {
        const job = await api.getParsingJob(jobId);
        if (job.status === 'extracted') {
          stop();
          setCvs((prev) => prev.map(cv => cv.id === attachmentId ? { ...cv, status: 'extracted' } : cv));
          await loadData();
          return;
        }

        if (job.status === 'failed') {
          stop();
          setCvs((prev) => prev.map(cv => cv.id === attachmentId ? { ...cv, status: 'error', errorMessage: job.error_message || 'Parsing failed' } : cv));
          return;
        }

        // queued/processing — 'failed' is already handled above so cast is safe
        setCvs((prev) => prev.map(cv => cv.id === attachmentId ? { ...cv, status: job.status as IncomingCV['status'] } : cv));
      } catch (e: any) {
        // Stop polling if endpoint missing
        stop();
        setCvs((prev) => prev.map(cv => cv.id === attachmentId ? { ...cv, status: 'error', errorMessage: `Status check failed: ${e?.message || 'unknown error'}` } : cv));
        return;
      }

      if (attempts >= maxAttempts) {
        stop();
        setCvs((prev) => prev.map(cv => cv.id === attachmentId ? { ...cv, status: 'error', errorMessage: 'Processing timeout' } : cv));
        return;
      }

      // Backoff while processing to reduce request volume
      delayMs = Math.min(Math.round(delayMs * 1.5), maxDelayMs);
      schedule();
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onVisibilityChange);
    }

    await tick();
    return donePromise;
  }

  const startAutoPolling = (items: IncomingCV[]) => {
    for (const cv of items) {
      if ((cv.status === 'queued' || cv.status === 'processing') && cv.jobId) {
        if (activePollsRef.current.has(cv.jobId)) {
          continue;
        }
        activePollsRef.current.add(cv.jobId);
        void (async () => {
          try {
            await pollJob(cv.jobId as string, cv.id);
          } finally {
            activePollsRef.current.delete(cv.jobId as string);
          }
        })();
      }
    }
  };

  useEffect(() => {
    if (!cvs.length) return;
    startAutoPolling(cvs);
  }, [cvs]);

  const toBase64 = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(',').pop() || '');
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });

  const handleManualUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleManualUploadFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const base64 = await toBase64(file);
      const message = await api.createInboxMessage({
        source: 'web',
        status: 'received',
        received_at: new Date().toISOString(),
        external_message_id: genExternalId(),
        payload: { sender_name: 'Manual Upload', sender_contact: 'web' },
      });

      const uploadResult = await api.uploadAttachment(message.id, {
        file_base64: base64,
        file_name: file.name,
        mime_type: file.type || 'application/octet-stream',
        attachment_type: 'cv',
        storage_bucket: 'documents',
        storage_path: `inbox/${file.name}`,
      });
      const attachment = uploadResult.attachment;
      const jobId = uploadResult.job_id || undefined;
      const status = (uploadResult.status as IncomingCV['status'] | undefined) || 'queued';

      const newCv: IncomingCV = {
        id: attachment.id,
        messageId: message.id,
        fileName: attachment.file_name || file.name,
        source: 'Web Form',
        senderName: 'Manual Upload',
        senderContact: 'web',
        receivedDate: new Date().toLocaleString(),
        fileSize: `${(file.size / 1024).toFixed(1)} KB`,
        status,
        candidateId: attachment.candidate_id || undefined,
        jobId,
      };

      setCvs((prev) => [newCv, ...prev]);
      if (jobId) {
        await pollJob(jobId, attachment.id);
      }
    } catch (e: any) {
      setError(e?.message || 'Manual upload failed');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const handleDelete = async (attachmentId: string) => {
    const confirmed = window.confirm('Delete this CV from inbox?');
    if (!confirmed) return;

    setError(null);
    const previous = cvs;
    setCvs((prev) => prev.filter((cv) => cv.id !== attachmentId));

    try {
      await api.deleteAttachment(attachmentId);
    } catch (e: any) {
      setError(e?.message || 'Failed to delete CV');
      setCvs(previous);
    }
  };

  const handleRetry = (cvId: string) => {
    setCvs((prev) => prev.map(cv => cv.id === cvId ? { ...cv, status: 'processing', errorMessage: undefined } : cv));
    void (async () => {
      try {
        const res = await api.retryParsing(cvId);
        const jobId = res.job_id;
        setCvs((prev) => prev.map(cv => cv.id === cvId ? { ...cv, jobId, status: res.status as IncomingCV['status'] } : cv));
        await pollJob(jobId, cvId);
      } catch (e: any) {
        setCvs((prev) => prev.map(cv => cv.id === cvId ? { ...cv, status: 'error', errorMessage: `Retry failed: ${e?.message || 'unknown error'}` } : cv));
      }
    })();
  };

  const filteredCVs = filterStatus === 'all' 
    ? cvs 
    : cvs.filter(cv => cv.status === filterStatus);

  const stats = {
    total: cvs.length,
    processing: cvs.filter(cv => cv.status === 'processing' || cv.status === 'queued').length,
    extracted: cvs.filter(cv => cv.status === 'extracted').length,
    errors: cvs.filter(cv => cv.status === 'error').length,
    needsReview: cvs.filter(cv => cv.status === 'extracted' && (cv.confidence || 0) < 85).length
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl">CV Inbox</h1>
          <p className="text-gray-600 mt-1">Automatic AI extraction - CVs become candidates instantly</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx,.txt,.rtf"
            className="hidden"
            onChange={handleManualUploadFile}
          />
          <button 
            onClick={handleManualUploadClick}
            disabled={uploading}
            className={`bg-blue-600 text-white px-6 py-3 rounded-lg transition-colors flex items-center gap-2 shadow-lg ${uploading ? 'opacity-70 cursor-not-allowed' : 'hover:bg-blue-700'}`}
          >
            <Upload className="w-5 h-5" />
            {uploading ? 'Uploading...' : 'Upload CV'}
          </button>
        </div>
      </div>

      {/* View switcher */}
      <div className="flex gap-2 border-b border-gray-200 pb-1 overflow-x-auto">
        <button
          onClick={() => setActiveView('inbox')}
          className={`flex items-center gap-2 px-4 py-2 rounded-t-lg text-sm font-medium transition-colors ${
            activeView === 'inbox'
              ? 'bg-white border border-b-white border-gray-200 text-blue-700 -mb-px z-10 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Inbox size={15} />
          CV Inbox
        </button>
        <button
          onClick={() => setActiveView('unmatched')}
          className={`flex items-center gap-2 px-4 py-2 rounded-t-lg text-sm font-medium transition-colors ${
            activeView === 'unmatched'
              ? 'bg-white border border-b-white border-gray-200 text-amber-600 -mb-px z-10 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Link2 size={15} />
          Unmatched Queue
          {unmatchedCount > 0 && (
            <span className="px-1.5 py-0.5 bg-amber-500 text-white text-xs font-bold rounded-full min-w-[20px] text-center">
              {unmatchedCount}
            </span>
          )}
        </button>
      </div>

      {activeView === 'unmatched' ? (
        <UnmatchedDocumentsQueue
          onLinked={() => {
            setUnmatchedCount(prev => Math.max(0, prev - 1));
          }}
        />
      ) : (
        <>

      {/* Stats Cards */}
      <div className="flex gap-3 overflow-x-auto pb-2">
        <div className="min-w-[200px] flex-1 bg-gradient-to-br from-gray-500 to-gray-600 rounded-xl p-5 shadow-lg text-white transform transition-all hover:scale-105">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm opacity-90">Total CVs</span>
            <Inbox className="w-6 h-6 opacity-80" />
          </div>
          <div className="text-3xl font-bold">{stats.total}</div>
          <div className="text-xs opacity-75 mt-2">All time</div>
        </div>
        
        <div className="min-w-[200px] flex-1 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-5 shadow-lg text-white transform transition-all hover:scale-105">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm opacity-90">Processing</span>
            <Sparkles className="w-6 h-6 opacity-80 animate-pulse" />
          </div>
          <div className="text-3xl font-bold">{stats.processing}</div>
          <div className="text-xs opacity-75 mt-2">AI extracting now...</div>
        </div>
        
        <div className="min-w-[200px] flex-1 bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-5 shadow-lg text-white transform transition-all hover:scale-105">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm opacity-90">Extracted</span>
            <CheckCircle className="w-6 h-6 opacity-80" />
          </div>
          <div className="text-3xl font-bold">{stats.extracted}</div>
          <div className="text-xs opacity-75 mt-2">Now candidates</div>
        </div>
        
        <div className="min-w-[200px] flex-1 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl p-5 shadow-lg text-white transform transition-all hover:scale-105">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm opacity-90">Needs Review</span>
            <AlertTriangle className="w-6 h-6 opacity-80" />
          </div>
          <div className="text-3xl font-bold">{stats.needsReview}</div>
          <div className="text-xs opacity-75 mt-2">Low confidence</div>
        </div>
        
        <div className="min-w-[200px] flex-1 bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-5 shadow-lg text-white transform transition-all hover:scale-105">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm opacity-90">Errors</span>
            <AlertTriangle className="w-6 h-6 opacity-80" />
          </div>
          <div className="text-3xl font-bold">{stats.errors}</div>
          <div className="text-xs opacity-75 mt-2">Need manual fix</div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
        <div className="flex items-center gap-2 flex-nowrap overflow-x-auto pb-1 sm:flex-wrap">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-5 py-2.5 rounded-lg transition-all font-medium ${
              filterStatus === 'all' 
                ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All <span className="ml-1 opacity-75">({stats.total})</span>
          </button>
          <button
            onClick={() => setFilterStatus('processing')}
            className={`px-5 py-2.5 rounded-lg transition-all font-medium ${
              filterStatus === 'processing' 
                ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Processing <span className="ml-1 opacity-75">({stats.processing})</span>
          </button>
          <button
            onClick={() => setFilterStatus('extracted')}
            className={`px-5 py-2.5 rounded-lg transition-all font-medium ${
              filterStatus === 'extracted' 
                ? 'bg-gradient-to-r from-green-600 to-green-700 text-white shadow-lg' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Extracted <span className="ml-1 opacity-75">({stats.extracted})</span>
          </button>
          <button
            onClick={() => setFilterStatus('error')}
            className={`px-5 py-2.5 rounded-lg transition-all font-medium ${
              filterStatus === 'error' 
                ? 'bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Errors <span className="ml-1 opacity-75">({stats.errors})</span>
          </button>
        </div>
      </div>

      {/* CV List */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          {loading && (
            <div className="p-4 text-sm text-gray-600">Loading inbox...</div>
          )}
          {error && (
            <div className="p-4 text-sm text-red-600">{error}</div>
          )}
          <table className="w-full min-w-[960px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs uppercase tracking-wider text-gray-600">
                  CV Details
                </th>
                <th className="px-6 py-4 text-left text-xs uppercase tracking-wider text-gray-600">
                  Source
                </th>
                <th className="px-6 py-4 text-left text-xs uppercase tracking-wider text-gray-600">
                  Sender Info
                </th>
                <th className="px-6 py-4 text-left text-xs uppercase tracking-wider text-gray-600">
                  Received
                </th>
                <th className="px-6 py-4 text-left text-xs uppercase tracking-wider text-gray-600">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-xs uppercase tracking-wider text-gray-600">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredCVs.map((cv) => (
                <tr key={cv.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        (cv.status === 'processing' || cv.status === 'queued') ? 'bg-blue-100 animate-pulse' :
                        cv.status === 'extracted' ? 'bg-green-100' :
                        'bg-red-100'
                      }`}>
                        <FileText className={`w-5 h-5 ${
                          (cv.status === 'processing' || cv.status === 'queued') ? 'text-blue-600' :
                          cv.status === 'extracted' ? 'text-green-600' :
                          'text-red-600'
                        }`} />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{cv.fileName}</p>
                        <p className="text-sm text-gray-500">{cv.fileSize}</p>
                        {cv.status === 'error' && cv.errorMessage && (
                          <p className="text-xs text-red-600 mt-1">{cv.errorMessage}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      {cv.source === 'WhatsApp' && (
                        <>
                          <MessageSquare className="w-4 h-4 text-green-600" />
                          <span className="text-sm text-green-700 font-medium">WhatsApp</span>
                        </>
                      )}
                      {cv.source === 'Email' && (
                        <>
                          <Mail className="w-4 h-4 text-blue-600" />
                          <span className="text-sm text-blue-700 font-medium">Email</span>
                        </>
                      )}
                      {cv.source === 'Web Form' && (
                        <>
                          <Upload className="w-4 h-4 text-purple-600" />
                          <span className="text-sm text-purple-700 font-medium">Web Form</span>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{cv.senderName}</p>
                      <p className="text-sm text-gray-500">{cv.senderContact}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="w-4 h-4" />
                      {cv.receivedDate}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {(cv.status === 'processing' || cv.status === 'queued') && (
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium flex items-center gap-1">
                          <Sparkles className="w-3 h-3 animate-spin" />
                          {cv.status === 'queued' ? 'Queued' : 'AI Processing...'}
                        </span>
                      </div>
                    )}
                    {cv.status === 'extracted' && (
                      <div>
                        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium flex items-center gap-1 w-fit mb-1">
                          <CheckCircle className="w-3 h-3" />
                          Extracted
                        </span>
                        {cv.confidence && (
                          <div className="text-xs text-gray-600">
                            Confidence: <span className={`font-semibold ${
                              cv.confidence >= 85 ? 'text-green-600' : 'text-yellow-600'
                            }`}>{cv.confidence}%</span>
                          </div>
                        )}
                      </div>
                    )}
                    {cv.status === 'error' && (
                      <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium flex items-center gap-1 w-fit">
                        <AlertTriangle className="w-3 h-3" />
                        Error
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {cv.status === 'extracted' && cv.candidateId && (
                        <button
                          onClick={() => window.location.hash = 'candidates'}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 text-sm"
                        >
                          <Eye className="w-4 h-4" />
                          View Candidate
                        </button>
                      )}
                      {cv.status === 'error' && (
                        <button
                          onClick={() => handleRetry(cv.id)}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                        >
                          Retry Extraction
                        </button>
                      )}
                      {(cv.status !== 'extracted' && cv.status !== 'processing') && (
                        <button
                          onClick={() => handleProcess(cv.id)}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm"
                        >
                          <Play className="w-4 h-4" />
                          Process CV
                        </button>
                      )}
                      <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors" title="Download">
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(cv.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete CV"
                      >
                        <Trash className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* How It Works */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 border border-blue-200">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center text-white flex-shrink-0">
            <Sparkles className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 mb-2">🤖 Fully Automatic AI Processing</h3>
            <p className="text-sm text-gray-700 mb-4">
              When a CV arrives from WhatsApp, Email, or Web Form, our AI automatically:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 text-sm mb-4">
              <div className="flex items-center gap-2 text-gray-700">
                <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-semibold">1</div>
                Reads the CV file
              </div>
              <div className="flex items-center gap-2 text-gray-700">
                <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-semibold">2</div>
                Extracts all data
              </div>
              <div className="flex items-center gap-2 text-gray-700">
                <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-semibold">3</div>
                Creates candidate profile
              </div>
              <div className="flex items-center gap-2 text-gray-700">
                <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-semibold">4</div>
                Flags if needs review
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-blue-200">
              <p className="text-sm text-gray-700">
                <strong>📋 What happens next:</strong> The candidate automatically appears in <strong>Candidate Management</strong> with a <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded text-xs">Needs Review</span> badge if confidence is low. You can then review and fix any missing fields.
              </p>
            </div>
          </div>
        </div>
      </div>
        </>
      )}
    </div>
  );
}