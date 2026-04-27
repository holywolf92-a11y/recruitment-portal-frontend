import { useState, useEffect, useRef } from 'react';
import {
  Folder,
  FolderOpen,
  FileText,
  File,
  Image as ImageIcon,
  Table2,
  Upload,
  Plus,
  Trash2,
  ChevronRight,
  X,
  Download,
  AlertCircle,
  RefreshCw,
  Database,
} from 'lucide-react';
import { apiClient, type DatabankFolder, type DatabankFile } from '../lib/apiClient';
import { useAuth } from '../lib/authContext';

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatBytes(bytes: number | null | undefined): string {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(ts: string | null | undefined): string {
  if (!ts) return '—';
  return new Date(ts).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

type FileCategory = 'pdf' | 'excel' | 'word' | 'image' | 'default';

function getFileCategory(ext: string): FileCategory {
  const e = ext.toLowerCase().replace('.', '');
  if (e === 'pdf') return 'pdf';
  if (['xlsx', 'xls', 'csv'].includes(e)) return 'excel';
  if (['doc', 'docx'].includes(e)) return 'word';
  if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(e)) return 'image';
  return 'default';
}

function getFolderPath(folders: DatabankFolder[], folder: DatabankFolder | null): DatabankFolder[] {
  if (!folder) return [];

  const path: DatabankFolder[] = [];
  const visited = new Set<string>();
  let current: DatabankFolder | null = folder;

  while (current && !visited.has(current.id)) {
    path.unshift(current);
    visited.add(current.id);
    current = current.parent_id ? folders.find((entry) => entry.id === current!.parent_id) ?? null : null;
  }

  return path;
}

interface FileIconProps {
  file: DatabankFile;
  size?: number;
}

function FileIcon({ file, size = 36 }: FileIconProps) {
  const cat = getFileCategory(file.file_type);

  if (cat === 'image' && file.signed_url) {
    return (
      <img
        src={file.signed_url}
        alt={file.file_name}
        className="rounded object-cover border border-gray-200"
        style={{ width: size, height: size }}
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = 'none';
        }}
      />
    );
  }

  const cfg: Record<FileCategory, { icon: typeof File; color: string; bg: string }> = {
    pdf:     { icon: FileText,  color: '#dc2626', bg: '#fee2e2' },
    excel:   { icon: Table2,    color: '#16a34a', bg: '#dcfce7' },
    word:    { icon: FileText,  color: '#2563eb', bg: '#dbeafe' },
    image:   { icon: ImageIcon, color: '#9333ea', bg: '#f3e8ff' },
    default: { icon: File,      color: '#6b7280', bg: '#f3f4f6' },
  };

  const { icon: Icon, color, bg } = cfg[cat];
  return (
    <span
      className="flex items-center justify-center rounded-lg flex-shrink-0"
      style={{ width: size, height: size, background: bg }}
    >
      <Icon style={{ color, width: size * 0.55, height: size * 0.55 }} />
    </span>
  );
}

// ── Confirm dialog ────────────────────────────────────────────────────────────

interface ConfirmProps {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmDialog({ message, onConfirm, onCancel }: ConfirmProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl p-5 max-w-sm w-full">
        <div className="flex gap-3 mb-4">
          <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
          <p className="text-sm text-gray-700">{message}</p>
        </div>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function Databank() {
  const { session, loading: authLoading } = useAuth();
  const accessToken = session?.access_token ?? null;
  const [view, setView] = useState<'folders' | 'files'>('folders');
  const [folders, setFolders] = useState<DatabankFolder[]>([]);
  const [files, setFiles] = useState<DatabankFile[]>([]);
  const [currentFolder, setCurrentFolder] = useState<DatabankFolder | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create folder modal
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [creating, setCreating] = useState(false);

  // Upload modal
  const [showUpload, setShowUpload] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadName, setUploadName] = useState('');
  const [uploading, setUploading] = useState(false);

  // Confirm delete
  const [confirmDelete, setConfirmDelete] = useState<null | { type: 'folder' | 'file'; id: string; name: string }>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentPath = getFolderPath(folders, currentFolder);
  const visibleFolders = folders
    .filter((folder) => folder.parent_id === (currentFolder?.id ?? null))
    .sort((a, b) => a.name.localeCompare(b.name));

  // ── Data fetching ──────────────────────────────────────────────────────────

  async function loadFolders() {
    if (!accessToken) {
      setFolders([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { folders: data } = await apiClient.listDatabankFolders(accessToken);
      setFolders(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load folders');
    } finally {
      setLoading(false);
    }
  }

  async function loadFiles(folderId: string) {
    if (!accessToken) {
      setFiles([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { files: data } = await apiClient.listDatabankFiles(folderId, accessToken);
      setFiles(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load files');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!authLoading && accessToken) {
      loadFolders();
    }
  }, [authLoading, accessToken]);

  // ── Actions ────────────────────────────────────────────────────────────────

  function openFolder(folder: DatabankFolder) {
    setCurrentFolder(folder);
    setView('files');
    loadFiles(folder.id);
  }

  function goBack() {
    if (!currentFolder?.parent_id) {
      setView('folders');
      setCurrentFolder(null);
      setFiles([]);
      setError(null);
      return;
    }

    const parentFolder = folders.find((folder) => folder.id === currentFolder.parent_id) ?? null;
    if (!parentFolder) {
      setView('folders');
      setCurrentFolder(null);
      setFiles([]);
      setError(null);
      return;
    }

    setCurrentFolder(parentFolder);
    setView('files');
    setError(null);
    loadFiles(parentFolder.id);
  }

  async function handleCreateFolder(e: React.FormEvent) {
    e.preventDefault();
    if (!newFolderName.trim() || !accessToken) return;
    setCreating(true);
    try {
      const { folder } = await apiClient.createDatabankFolder(newFolderName.trim(), accessToken, currentFolder?.id ?? null);
      setFolders((prev) => [...prev, folder].sort((a, b) => a.name.localeCompare(b.name)));
      setNewFolderName('');
      setShowCreateFolder(false);
    } catch (err: any) {
      setError(err.message || 'Failed to create folder');
    } finally {
      setCreating(false);
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setUploadFile(f);
    if (f) setUploadName(f.name.replace(/\.[^.]+$/, ''));
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!uploadFile || !currentFolder || !accessToken) return;
    setUploading(true);
    setError(null);
    try {
      const { file } = await apiClient.uploadDatabankFile(currentFolder.id, uploadFile, uploadName.trim() || uploadFile.name, accessToken);
      setFiles((prev) => [file, ...prev]);
      // Update folder file_count
      setFolders((prev) =>
        prev.map((f) =>
          f.id === currentFolder.id ? { ...f, file_count: (f.file_count ?? 0) + 1 } : f,
        ),
      );
      setCurrentFolder((prev) => prev ? { ...prev, file_count: (prev.file_count ?? 0) + 1 } : prev);
      setUploadFile(null);
      setUploadName('');
      setShowUpload(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: any) {
      setError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    if (!accessToken) return;
    setError(null);
    try {
      if (confirmDelete.type === 'folder') {
        await apiClient.deleteDatabankFolder(confirmDelete.id, accessToken);
        setFolders((prev) => {
          const removeIds = new Set<string>([confirmDelete.id]);
          let changed = true;

          while (changed) {
            changed = false;
            for (const folder of prev) {
              if (folder.parent_id && removeIds.has(folder.parent_id) && !removeIds.has(folder.id)) {
                removeIds.add(folder.id);
                changed = true;
              }
            }
          }

          return prev.filter((folder) => !removeIds.has(folder.id));
        });
        if (currentFolder && (currentFolder.id === confirmDelete.id || currentPath.some((folder) => folder.id === confirmDelete.id))) {
          setView('folders');
          setCurrentFolder(null);
          setFiles([]);
        }
      } else {
        await apiClient.deleteDatabankFile(confirmDelete.id, accessToken);
        setFiles((prev) => prev.filter((f) => f.id !== confirmDelete.id));
        setFolders((prev) =>
          prev.map((f) =>
            f.id === currentFolder?.id ? { ...f, file_count: Math.max(0, (f.file_count ?? 1) - 1) } : f,
          ),
        );
        setCurrentFolder((prev) => prev ? { ...prev, file_count: Math.max(0, (prev.file_count ?? 1) - 1) } : prev);
      }
    } catch (err: any) {
      setError(err.message || 'Delete failed');
    } finally {
      setConfirmDelete(null);
    }
  }

  function openFile(file: DatabankFile) {
    const url = file.signed_url;
    if (!url) return;
    if (getFileCategory(file.file_type) === 'pdf' || getFileCategory(file.file_type) === 'image') {
      window.open(url, '_blank', 'noopener,noreferrer');
      return;
    }

    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = file.file_name;
    anchor.rel = 'noopener noreferrer';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      {/* Header */}
      <div className="mb-5">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-sm mb-3" aria-label="Breadcrumb">
          <button
            onClick={goBack}
            className="flex items-center gap-1.5 font-semibold text-[#003461] hover:text-blue-700 transition-colors"
          >
            <Database size={15} />
            Databank
          </button>
          {currentPath.map((folder) => (
            <span key={folder.id} className="contents">
              <ChevronRight size={14} className="text-gray-400" />
              <button
                onClick={() => openFolder(folder)}
                className="text-gray-700 font-medium truncate max-w-[200px] hover:text-blue-700 transition-colors"
              >
                {folder.name}
              </button>
            </span>
          ))}
        </nav>

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              {view === 'folders' ? 'Databank' : currentFolder?.name}
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              {view === 'folders'
                ? `${folders.length} folder${folders.length !== 1 ? 's' : ''}`
                : `${files.length} file${files.length !== 1 ? 's' : ''} · ${currentFolder?.name}`}
            </p>
          </div>

          <div className="flex gap-2">
            {view === 'folders' ? (
              <button
                onClick={() => { setShowCreateFolder(true); setError(null); }}
                className="flex items-center gap-1.5 px-3 py-2 bg-[#003461] text-white text-sm font-medium rounded-lg hover:bg-blue-800 transition-colors"
              >
                <Plus size={15} />
                New Folder
              </button>
            ) : (
              <>
                <button
                  onClick={goBack}
                  className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-100 transition-colors"
                >
                  ← Back
                </button>
                <button
                  onClick={() => { setShowCreateFolder(true); setError(null); }}
                  className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <Plus size={15} />
                  New Subfolder
                </button>
                <button
                  onClick={() => { setShowUpload(true); setError(null); }}
                  className="flex items-center gap-1.5 px-3 py-2 bg-[#003461] text-white text-sm font-medium rounded-lg hover:bg-blue-800 transition-colors"
                >
                  <Upload size={15} />
                  Upload
                </button>
              </>
            )}
            <button
              onClick={() => view === 'folders' ? loadFolders() : loadFiles(currentFolder!.id)}
              className="p-2 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors text-gray-500"
              title="Refresh"
            >
              <RefreshCw size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          <AlertCircle size={15} className="flex-shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto"><X size={14} /></button>
        </div>
      )}

      {/* Loading */}
      {(authLoading || loading) && (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-[#003461] border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* ── FOLDER VIEW ───────────────────────────────────────────────────── */}
      {!authLoading && !loading && view === 'folders' && (
        <>
          {visibleFolders.length === 0 ? (
            <EmptyState
              icon={<Folder size={40} className="text-gray-300" />}
              title="No folders yet"
              description='Create your first folder with "New Folder"'
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {visibleFolders.map((folder) => (
                <FolderCard
                  key={folder.id}
                  folder={folder}
                  onOpen={() => openFolder(folder)}
                  onDelete={() =>
                    setConfirmDelete({ type: 'folder', id: folder.id, name: folder.name })
                  }
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* ── FILE VIEW ─────────────────────────────────────────────────────── */}
      {!authLoading && !loading && view === 'files' && (
        <>
          {visibleFolders.length === 0 && files.length === 0 ? (
            <EmptyState
              icon={<FolderOpen size={40} className="text-gray-300" />}
              title="This folder is empty"
              description='Add a subfolder or upload documents here'
            />
          ) : (
            <div className="space-y-5">
              {visibleFolders.length > 0 && (
                <section>
                  <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-700">
                    <Folder size={16} className="text-amber-500" />
                    Subfolders
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {visibleFolders.map((folder) => (
                      <FolderCard
                        key={folder.id}
                        folder={folder}
                        onOpen={() => openFolder(folder)}
                        onDelete={() =>
                          setConfirmDelete({ type: 'folder', id: folder.id, name: folder.name })
                        }
                      />
                    ))}
                  </div>
                </section>
              )}

              {files.length > 0 && (
                <section>
                  <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-700">
                    <FileText size={16} className="text-blue-500" />
                    Files
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {files.map((file) => (
                      <FileCard
                        key={file.id}
                        file={file}
                        onOpen={() => openFile(file)}
                        onDelete={() =>
                          setConfirmDelete({ type: 'file', id: file.id, name: file.file_name })
                        }
                      />
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </>
      )}

      {/* ── CREATE FOLDER MODAL ───────────────────────────────────────────── */}
      {showCreateFolder && (
        <Modal title={currentFolder ? `New Subfolder in "${currentFolder.name}"` : 'New Folder'} onClose={() => { setShowCreateFolder(false); setNewFolderName(''); }}>
          <form onSubmit={handleCreateFolder} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Folder Name</label>
              <input
                autoFocus
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="e.g. Contracts 2026"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              {currentFolder && (
                <p className="mt-1 text-xs text-gray-500">
                  This folder will be created inside {currentFolder.name}.
                </p>
              )}
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => { setShowCreateFolder(false); setNewFolderName(''); }}
                className="px-4 py-2 text-sm rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creating || !newFolderName.trim()}
                className="px-4 py-2 text-sm rounded-lg bg-[#003461] text-white hover:bg-blue-800 transition-colors disabled:opacity-50"
              >
                {creating ? 'Creating…' : 'Create Folder'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── UPLOAD FILE MODAL ─────────────────────────────────────────────── */}
      {showUpload && (
        <Modal title={`Upload to "${currentFolder?.name}"`} onClose={() => { setShowUpload(false); setUploadFile(null); setUploadName(''); }}>
          <form onSubmit={handleUpload} className="space-y-4">
            {/* Drop zone / file picker */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                uploadFile ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-gray-300 bg-gray-50'
              }`}
            >
              <Upload size={24} className="mx-auto mb-2 text-gray-400" />
              {uploadFile ? (
                <p className="text-sm font-medium text-gray-800">{uploadFile.name}</p>
              ) : (
                <p className="text-sm text-gray-500">Click to choose a file</p>
              )}
              <p className="text-xs text-gray-400 mt-1">PDF, Word, Excel, Images — max 50 MB</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.png,.jpg,.jpeg,.gif,.webp"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>

            {uploadFile && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Display Name
                </label>
                <input
                  type="text"
                  value={uploadName}
                  onChange={(e) => setUploadName(e.target.value)}
                  placeholder="Human-readable file name"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => { setShowUpload(false); setUploadFile(null); setUploadName(''); }}
                className="px-4 py-2 text-sm rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={uploading || !uploadFile}
                className="px-4 py-2 text-sm rounded-lg bg-[#003461] text-white hover:bg-blue-800 transition-colors disabled:opacity-50"
              >
                {uploading ? 'Uploading…' : 'Upload'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── CONFIRM DELETE ────────────────────────────────────────────────── */}
      {confirmDelete && (
        <ConfirmDialog
          message={`Delete "${confirmDelete.name}"? This cannot be undone.`}
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function FolderCard({
  folder,
  onOpen,
  onDelete,
}: {
  folder: DatabankFolder;
  onOpen: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="group relative bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-blue-200 transition-all cursor-pointer">
      <button
        onClick={onOpen}
        className="w-full text-left p-4"
        aria-label={`Open folder ${folder.name}`}
      >
        <div className="flex items-start gap-3">
          <span className="flex-shrink-0 mt-0.5">
            <Folder size={32} style={{ color: '#f59e0b' }} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-gray-900 text-sm truncate">{folder.name}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {folder.file_count ?? 0} file{(folder.file_count ?? 0) !== 1 ? 's' : ''}
            </p>
            <p className="text-xs text-gray-400">{formatDate(folder.created_at)}</p>
          </div>
        </div>
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        className="absolute top-2 right-2 p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
        title="Delete folder"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}

function FileCard({
  file,
  onOpen,
  onDelete,
}: {
  file: DatabankFile;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const cat = getFileCategory(file.file_type);
  const canPreview = cat === 'pdf' || cat === 'image';

  return (
    <div className="group relative bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-blue-200 transition-all">
      <button
        onClick={onOpen}
        className="w-full text-left p-4"
        aria-label={`Open ${file.file_name}`}
      >
        <div className="flex items-start gap-3">
          <FileIcon file={file} size={36} />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-gray-900 text-sm leading-snug break-words line-clamp-2">
              {file.file_name}
            </p>
            <p className="text-xs text-gray-400 mt-1 uppercase tracking-wide">{file.file_type}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-gray-400">{formatBytes(file.file_size)}</span>
              <span className="text-gray-200">·</span>
              <span className="text-xs text-gray-400">{formatDate(file.created_at)}</span>
            </div>
          </div>
        </div>

        {/* Action hint */}
        <div className="mt-3 flex items-center gap-1 text-xs text-blue-500 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
          {canPreview ? (
            <><FolderOpen size={12} /> Preview</>
          ) : (
            <><Download size={12} /> Download</>
          )}
        </div>
      </button>

      <button
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        className="absolute top-2 right-2 p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
        title="Delete file"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      {icon}
      <p className="mt-3 font-semibold text-gray-600">{title}</p>
      <p className="mt-1 text-sm text-gray-400">{description}</p>
    </div>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900 text-sm">{title}</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 text-gray-500">
            <X size={16} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
