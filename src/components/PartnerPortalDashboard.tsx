import { useEffect, useMemo, useRef, useState } from 'react';
import {
  BarChart3, CheckCircle2, ChevronDown, Clock, CloudUpload, FileSpreadsheet,
  FileText, LayoutDashboard, LogOut, MoreVertical, Plus, Search, Upload, Users, X, XCircle,
} from 'lucide-react';
import { apiClient, type Candidate, type PartnerBulkUploadResult, type PortalProfileResponse } from '../lib/apiClient';

// ─── Types ─────────────────────────────────────────────────────────────────

type View = 'dashboard' | 'candidates' | 'upload' | 'bulk-upload';

interface UploadForm {
  name: string;
  cnic: string;
  phone: string;
  email: string;
  cvFile: File | null;
  passportFile: File | null;
  photoFile: File | null;
}

const EMPTY_UPLOAD_FORM: UploadForm = {
  name: '', cnic: '', phone: '', email: '',
  cvFile: null, passportFile: null, photoFile: null,
};

type PartnerPortalDashboardProps = {
  accessToken: string;
  user: {
    name: string;
    email: string;
    roleLabel: string;
  };
  portalProfile: PortalProfileResponse | null;
  loading: boolean;
  error?: string | null;
  onSignOut: () => void;
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function initials(name?: string) {
  return (name || '?')[0].toUpperCase();
}

function formatDate(iso?: string | null) {
  if (!iso) return '—';
  return iso.slice(0, 10);
}

function StatusBadge({ status }: { status?: string }) {
  const s = (status || '').toLowerCase();
  if (['verified', 'approved', 'deployed'].some((x) => s.includes(x))) {
    return <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">Verified</span>;
  }
  if (['rejected', 'cancelled', 'declined'].some((x) => s.includes(x))) {
    return <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">Rejected</span>;
  }
  return <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-700">Pending</span>;
}

interface DropZoneProps {
  label: string;
  hint: string;
  acceptText: string;
  accept: string;
  file: File | null;
  onSelect: (f: File) => void;
  required?: boolean;
}

function DropZone({ label, hint, acceptText, accept, file, onSelect, required }: DropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  return (
    <div className="space-y-1.5">
      <p className="text-sm font-medium text-gray-700">
        {label}{required && <span className="ml-0.5 text-red-500">*</span>}
      </p>
      <div
        className={`cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition ${
          dragging ? 'border-blue-400 bg-blue-50' : file ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-gray-400 bg-white'
        }`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const f = e.dataTransfer.files[0];
          if (f) onSelect(f);
        }}
      >
        <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onSelect(f); }} />
        {file ? (
          <div className="flex items-center justify-center gap-2">
            <FileText className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium text-green-700 truncate max-w-[200px]">{file.name}</span>
          </div>
        ) : (
          <>
            <Upload className="mx-auto h-6 w-6 text-gray-400" />
            <p className="mt-2 text-sm text-gray-500">{hint}</p>
            <p className="mt-0.5 text-xs text-gray-400">{acceptText}</p>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────

export function PartnerPortalDashboard({ accessToken, user, portalProfile, loading, onSignOut }: PartnerPortalDashboardProps) {
  const account = portalProfile?.profile.user;
  const partnerApplication = portalProfile?.profile.partnerApplication;
  const partnerDisplayName = account?.name || user.name;

  // ── shared state
  const [view, setView] = useState<View>('dashboard');
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [candidatesLoading, setCandidatesLoading] = useState(false);

  // ── candidates view
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showDateFilter, setShowDateFilter] = useState(false);

  // ── upload view
  const [uploadForm, setUploadForm] = useState<UploadForm>(EMPTY_UPLOAD_FORM);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  // ── bulk upload view
  const [bulkExcel, setBulkExcel] = useState<File | null>(null);
  const [bulkZip, setBulkZip] = useState<File | null>(null);
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [bulkResult, setBulkResult] = useState<PartnerBulkUploadResult | null>(null);

  // Load candidates once
  useEffect(() => {
    let live = true;
    setCandidatesLoading(true);
    apiClient.getPartnerCandidates(accessToken)
      .then((r) => { if (live) setCandidates(r.candidates || []); })
      .catch(() => {})
      .finally(() => { if (live) setCandidatesLoading(false); });
    return () => { live = false; };
  }, [accessToken]);

  // ── Stats
  const stats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return {
      total: candidates.length,
      verified: candidates.filter((c) => ['verified', 'approved', 'deployed'].some((x) => (c.status || '').toLowerCase().includes(x))).length,
      pending: candidates.filter((c) => ['pending', 'applied'].some((x) => (c.status || '').toLowerCase().includes(x))).length,
      rejected: candidates.filter((c) => ['rejected', 'cancelled', 'declined'].some((x) => (c.status || '').toLowerCase().includes(x))).length,
      today: candidates.filter((c) => (c.created_at || '').startsWith(today)).length,
    };
  }, [candidates]);

  // ── Filtered candidates
  const filtered = useMemo(() => {
    return candidates.filter((c) => {
      const q = search.toLowerCase();
      const matchSearch = !q || (c.name || '').toLowerCase().includes(q) || (c.cnic || '').toLowerCase().includes(q) || (c.phone || '').includes(q);
      const s = (c.status || '').toLowerCase();
      const matchStatus =
        statusFilter === 'all' ||
        (statusFilter === 'verified' && ['verified', 'approved', 'deployed'].some((x) => s.includes(x))) ||
        (statusFilter === 'pending' && ['pending', 'applied'].some((x) => s.includes(x))) ||
        (statusFilter === 'rejected' && ['rejected', 'cancelled', 'declined'].some((x) => s.includes(x)));
      const matchDate =
        (!dateFrom || (c.created_at || '') >= dateFrom) &&
        (!dateTo || (c.created_at || '') <= dateTo + 'T23:59:59');
      return matchSearch && matchStatus && matchDate;
    });
  }, [candidates, search, statusFilter, dateFrom, dateTo]);

  // ── Upload candidate handler
  async function handleUpload() {
    if (!uploadForm.name.trim()) { setUploadError('Full Name is required'); return; }
    if (!uploadForm.cnic.trim()) { setUploadError('CNIC / Passport is required'); return; }
    if (!uploadForm.phone.trim()) { setUploadError('Phone is required'); return; }
    setUploading(true);
    setUploadError(null);
    try {
      const { candidate } = await apiClient.createPartnerCandidate({
        name: uploadForm.name.trim(),
        cnic: uploadForm.cnic.trim(),
        phone: uploadForm.phone.trim(),
        email: uploadForm.email.trim() || undefined,
      }, accessToken);
      if (uploadForm.cvFile) await apiClient.uploadCandidateDocument(uploadForm.cvFile, candidate.id, 'partner', 'cv');
      if (uploadForm.passportFile) await apiClient.uploadCandidateDocument(uploadForm.passportFile, candidate.id, 'partner', 'passport_cnic');
      if (uploadForm.photoFile) await apiClient.uploadCandidatePhoto(candidate.id, uploadForm.photoFile);
      setCandidates((prev) => [candidate, ...prev]);
      setUploadForm(EMPTY_UPLOAD_FORM);
      setUploadSuccess(`${candidate.name} uploaded and processed successfully.`);
      setView('candidates');
    } catch (err: any) {
      setUploadError(err?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  // ── Bulk upload handler
  async function handleBulkUpload() {
    if (!bulkExcel) { setBulkError('Excel file is required'); return; }
    setBulkProcessing(true);
    setBulkError(null);
    setBulkResult(null);
    try {
      const result = await apiClient.uploadPartnerBulkCandidates(bulkExcel, bulkZip, accessToken);
      setBulkResult(result);
      if (result.candidates.length > 0) {
        setCandidates((prev) => [...result.candidates, ...prev]);
      }
    } catch (err: any) {
      setBulkError(err?.message || 'Bulk upload failed');
    } finally {
      setBulkProcessing(false);
    }
  }

  // ── Download CSV template
  function downloadTemplate() {
    const csv = 'Name,CNIC/Passport,Phone,Email\n';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'partner_candidate_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  const VIEW_TITLE: Record<View, string> = {
    dashboard: 'Dashboard',
    candidates: 'Candidates',
    upload: 'Upload Candidate',
    'bulk-upload': 'Bulk Upload',
  };

  // ────────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Sidebar */}
      <aside className="flex w-56 flex-shrink-0 flex-col border-r border-gray-200 bg-white">
        {/* Brand */}
        <div className="border-b border-gray-200 px-5 py-4">
          <span className="text-base font-bold text-blue-600">Falisha Jobs</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-0.5 px-2 py-3">
          {([
            { v: 'dashboard' as View, label: 'Dashboard', Icon: LayoutDashboard },
            { v: 'candidates' as View, label: 'Candidates', Icon: Users },
            { v: 'upload' as View, label: 'Upload Candidate', Icon: Upload },
            { v: 'bulk-upload' as View, label: 'Bulk Upload', Icon: CloudUpload },
          ] as const).map(({ v, label, Icon }) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
                view === v ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              {label}
            </button>
          ))}
        </nav>

        {/* Logout */}
        <div className="border-t border-gray-200 px-2 py-3">
          <button
            onClick={onSignOut}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
          <h1 className="text-base font-semibold text-gray-900">{VIEW_TITLE[view]}</h1>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white">
              {initials(partnerDisplayName)}
            </span>
            <span className="text-sm font-medium text-gray-800">{partnerDisplayName}</span>
            <ChevronDown className="h-4 w-4 text-gray-400" />
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-6">
          {loading && (
            <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-500">Loading partner workspace…</div>
          )}

          {/* ── Dashboard ── */}
          {!loading && view === 'dashboard' && (
            <div className="space-y-6">
              {/* Stat cards */}
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
                {[
                  { label: 'Total Candidates', value: stats.total, color: 'bg-blue-100', iconColor: 'text-blue-600', Icon: Users },
                  { label: 'Verified', value: stats.verified, color: 'bg-green-100', iconColor: 'text-green-600', Icon: CheckCircle2 },
                  { label: 'Pending', value: stats.pending, color: 'bg-amber-100', iconColor: 'text-amber-600', Icon: Clock },
                  { label: 'Rejected', value: stats.rejected, color: 'bg-red-100', iconColor: 'text-red-600', Icon: XCircle },
                  { label: 'Uploads Today', value: stats.today, color: 'bg-purple-100', iconColor: 'text-purple-600', Icon: BarChart3 },
                ].map(({ label, value, color, iconColor, Icon }) => (
                  <div key={label} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                    <div className={`inline-flex rounded-lg p-2 ${color}`}>
                      <Icon className={`h-5 w-5 ${iconColor}`} />
                    </div>
                    <p className="mt-3 text-2xl font-semibold text-gray-900">{value}</p>
                    <p className="mt-0.5 text-xs text-gray-500">{label}</p>
                  </div>
                ))}
              </div>

              {/* Recent uploads */}
              <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
                  <h2 className="text-sm font-semibold text-gray-900">Recent Uploads</h2>
                  <button
                    onClick={() => setView('candidates')}
                    className="text-sm font-medium text-blue-600 hover:underline"
                  >
                    View all →
                  </button>
                </div>
                {candidatesLoading ? (
                  <p className="px-5 py-4 text-sm text-gray-500">Loading…</p>
                ) : candidates.length === 0 ? (
                  <p className="px-5 py-4 text-sm text-gray-500">No candidates submitted yet.</p>
                ) : (
                  <ul className="divide-y divide-gray-100">
                    {candidates.slice(0, 5).map((c) => (
                      <li key={c.id} className="flex items-center justify-between px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gray-300 text-sm font-medium text-gray-700">
                            {initials(c.name)}
                          </span>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{c.name}</p>
                            <p className="text-xs text-gray-500">{c.cnic || c.candidate_code}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <StatusBadge status={c.status} />
                          <span className="text-xs text-gray-400">{formatDate(c.created_at)}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          {/* ── Candidates ── */}
          {!loading && view === 'candidates' && (
            <div className="space-y-4">
              {uploadSuccess && (
                <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                  <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                  {uploadSuccess}
                  <button className="ml-auto" onClick={() => setUploadSuccess(null)}><X className="h-3.5 w-3.5" /></button>
                </div>
              )}
              {/* Toolbar */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by name, CNIC, or phone..."
                    className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="rounded-lg border border-gray-300 py-2 pl-3 pr-8 text-sm outline-none focus:border-blue-400"
                >
                  <option value="all">All Status</option>
                  <option value="verified">Verified</option>
                  <option value="pending">Pending</option>
                  <option value="rejected">Rejected</option>
                </select>
                <div className="relative">
                  <button
                    onClick={() => setShowDateFilter((v) => !v)}
                    className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    <Clock className="h-4 w-4" />
                    Date Filter
                  </button>
                  {showDateFilter && (
                    <div className="absolute right-0 top-full z-10 mt-1 flex gap-2 rounded-xl border border-gray-200 bg-white p-3 shadow-lg">
                      <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="rounded border border-gray-300 px-2 py-1 text-xs" />
                      <span className="self-center text-xs text-gray-400">to</span>
                      <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="rounded border border-gray-300 px-2 py-1 text-xs" />
                      <button onClick={() => { setDateFrom(''); setDateTo(''); setShowDateFilter(false); }} className="text-xs text-gray-400 hover:text-gray-700">Clear</button>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => { setView('upload'); setUploadSuccess(null); }}
                  className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4" />
                  Add Candidate
                </button>
              </div>

              {/* Table */}
              <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      <th className="px-4 py-3">Name</th>
                      <th className="px-4 py-3">CNIC / Passport</th>
                      <th className="px-4 py-3">Phone</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Uploaded Date</th>
                      <th className="px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {candidatesLoading ? (
                      <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-400">Loading…</td></tr>
                    ) : filtered.length === 0 ? (
                      <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No candidates found.</td></tr>
                    ) : (
                      filtered.map((c) => (
                        <tr key={c.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gray-200 text-xs font-semibold text-gray-600">
                                {initials(c.name)}
                              </span>
                              <span className="font-medium text-gray-900">{c.name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-gray-600">{c.cnic || c.passport || '—'}</td>
                          <td className="px-4 py-3 text-gray-600">{c.phone || '—'}</td>
                          <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                          <td className="px-4 py-3 text-gray-500">{formatDate(c.created_at)}</td>
                          <td className="px-4 py-3">
                            <button className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
                              <MoreVertical className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Upload Candidate ── */}
          {!loading && view === 'upload' && (
            <div className="space-y-4">
              <div className="grid gap-6 lg:grid-cols-2">
                {/* Candidate Information */}
                <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                  <h2 className="mb-5 text-sm font-semibold text-gray-900">Candidate Information</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-gray-700">Full Name <span className="text-red-500">*</span></label>
                      <input
                        value={uploadForm.name}
                        onChange={(e) => { setUploadForm((f) => ({ ...f, name: e.target.value })); setUploadError(null); }}
                        placeholder="Enter full name"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-gray-700">CNIC / Passport <span className="text-red-500">*</span></label>
                      <input
                        value={uploadForm.cnic}
                        onChange={(e) => { setUploadForm((f) => ({ ...f, cnic: e.target.value })); setUploadError(null); }}
                        placeholder="42101-1234567-8"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-gray-700">Phone <span className="text-red-500">*</span></label>
                      <input
                        value={uploadForm.phone}
                        onChange={(e) => { setUploadForm((f) => ({ ...f, phone: e.target.value })); setUploadError(null); }}
                        placeholder="+92 300 1234567"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-gray-700">Email</label>
                      <input
                        value={uploadForm.email}
                        onChange={(e) => setUploadForm((f) => ({ ...f, email: e.target.value }))}
                        placeholder="candidate@example.com"
                        type="email"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
                      />
                    </div>
                    <div className="rounded-lg bg-blue-50 px-4 py-3">
                      <p className="text-xs font-semibold text-blue-800">Partner: {partnerDisplayName}</p>
                      <p className="mt-0.5 text-xs text-blue-600">This candidate will be tagged to your account</p>
                    </div>
                  </div>
                </div>

                {/* Documents */}
                <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                  <h2 className="mb-5 text-sm font-semibold text-gray-900">Documents</h2>
                  <div className="space-y-4">
                    <DropZone
                      label="CV / Resume"
                      hint="Drag & drop CV here, or click to browse"
                      acceptText="PDF, DOC, DOCX"
                      accept=".pdf,.doc,.docx"
                      file={uploadForm.cvFile}
                      onSelect={(f) => setUploadForm((prev) => ({ ...prev, cvFile: f }))}
                      required
                    />
                    <DropZone
                      label="Passport / CNIC Copy"
                      hint="Drag & drop document here"
                      acceptText="PDF, JPG, PNG"
                      accept=".pdf,.jpg,.jpeg,.png"
                      file={uploadForm.passportFile}
                      onSelect={(f) => setUploadForm((prev) => ({ ...prev, passportFile: f }))}
                      required
                    />
                    <DropZone
                      label="Photo"
                      hint="Drag & drop photo here"
                      acceptText="JPG, PNG"
                      accept=".jpg,.jpeg,.png"
                      file={uploadForm.photoFile}
                      onSelect={(f) => setUploadForm((prev) => ({ ...prev, photoFile: f }))}
                    />
                  </div>
                </div>
              </div>

              {uploadError && (
                <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  <XCircle className="h-4 w-4 flex-shrink-0" />
                  {uploadError}
                </div>
              )}

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => { setView('candidates'); setUploadForm(EMPTY_UPLOAD_FORM); setUploadError(null); }}
                  className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpload}
                  disabled={uploading}
                  className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {uploading && (
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                  )}
                  {uploading ? 'Processing…' : 'Upload & Process Candidate'}
                </button>
              </div>
            </div>
          )}

          {/* ── Bulk Upload ── */}
          {!loading && view === 'bulk-upload' && (
            <div className="space-y-4">
              <div className="space-y-4">
                {/* Step 1 */}
                <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                  <h2 className="mb-4 text-sm font-semibold text-gray-900">Step 1: Upload Excel File</h2>
                  <DropZone
                    label=""
                    hint="Upload Excel file with candidate data"
                    acceptText=".xlsx, .xls format"
                    accept=".xlsx,.xls"
                    file={bulkExcel}
                    onSelect={(f) => { setBulkExcel(f); setBulkError(null); setBulkResult(null); }}
                  />
                  <button
                    onClick={downloadTemplate}
                    className="mt-3 flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:underline"
                  >
                    <FileSpreadsheet className="h-4 w-4" />
                    Download Excel Template →
                  </button>
                </div>

                {/* Step 2 */}
                <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                  <h2 className="mb-4 text-sm font-semibold text-gray-900">Step 2: Upload ZIP File (Documents)</h2>
                  <DropZone
                    label=""
                    hint="Upload ZIP containing CVs, passports, and photos"
                    acceptText=".zip format"
                    accept=".zip"
                    file={bulkZip}
                    onSelect={(f) => { setBulkZip(f); setBulkError(null); setBulkResult(null); }}
                  />
                </div>

                {/* Requirements */}
                <div className="rounded-xl border border-blue-100 bg-blue-50 p-5">
                  <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-blue-800">
                    <FileText className="h-4 w-4" /> Requirements:
                  </p>
                  <ul className="space-y-1 text-xs text-blue-700 list-disc list-inside">
                    <li>Excel must contain: Name, CNIC/Passport, Phone, Email</li>
                    <li>ZIP files should be named matching CNIC/Passport numbers</li>
                    <li>Supported formats: PDF, JPG, PNG for documents</li>
                  </ul>
                </div>

                {bulkError && (
                  <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    <XCircle className="h-4 w-4 flex-shrink-0" />
                    {bulkError}
                  </div>
                )}

                {bulkResult && (
                  <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
                    <p className="font-semibold">Bulk upload complete</p>
                    <p className="mt-1">Created {bulkResult.created} of {bulkResult.total} candidates.</p>
                    {bulkResult.errors.length > 0 && (
                      <ul className="mt-2 space-y-0.5 text-xs text-red-600 list-disc list-inside">
                        {bulkResult.errors.slice(0, 10).map((e, i) => (
                          <li key={i}>Row {e.row}: {e.name || ''} — {e.error}</li>
                        ))}
                        {bulkResult.errors.length > 10 && <li>…and {bulkResult.errors.length - 10} more errors</li>}
                      </ul>
                    )}
                  </div>
                )}

                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => { setBulkExcel(null); setBulkZip(null); setBulkError(null); setBulkResult(null); }}
                    className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleBulkUpload}
                    disabled={bulkProcessing || !bulkExcel}
                    className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
                  >
                    {bulkProcessing && (
                      <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                    )}
                    {bulkProcessing ? 'Processing…' : 'Process Bulk Upload'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

