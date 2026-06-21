// Settings card — issue and revoke personal-access tokens for the Send-to-Falisha
// Chrome extension. Plaintext token is shown EXACTLY ONCE at issuance (server
// only stores SHA-256); after that only the prefix is visible for identification.

import { useEffect, useState } from 'react';
import { Chrome, Plus, Copy, Trash2, Check, AlertCircle, ExternalLink, Loader2, Download } from 'lucide-react';
import JSZip from 'jszip';
import { useAuth } from '../../lib/authContext';
import { API_BASE_URL } from '../../lib/apiClient';

type TokenRow = {
  id: string;
  token_prefix: string;
  name: string;
  scope: string;
  last_used_at: string | null;
  expires_at: string | null;
  created_at: string;
};

export function BrowserExtensionCard() {
  const { session } = useAuth();
  const accessToken = (session as any)?.session?.access_token || (session as any)?.access_token;

  const [tokens, setTokens] = useState<TokenRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [creating, setCreating] = useState(false);

  // One-time plaintext reveal — cleared after the user copies/dismisses
  const [revealed, setRevealed] = useState<{ token: string; label: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [zipping, setZipping] = useState(false);

  // Fetch the prebuilt extension ZIP, inject a config.json carrying the just-
  // minted token, re-zip in the browser, and trigger a download. The extension's
  // background.js reads config.json on install and pre-populates chrome.storage.local
  // so the user skips the paste step entirely.
  async function downloadConfiguredExtension(token: string, label: string) {
    setZipping(true);
    try {
      // Cache-bust so users testing repeated downloads always hit the latest zip.
      const res = await fetch(`/falisha-extension.zip?v=${Date.now()}`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`Extension bundle missing (HTTP ${res.status})`);
      const blob = await res.blob();
      const zip = await JSZip.loadAsync(blob);
      zip.file('config.json', JSON.stringify({
        apiBase:  API_BASE_URL,
        apiToken: token,
        issuedAt: new Date().toISOString(),
        label,
      }, null, 2));
      const outBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
      const url = URL.createObjectURL(outBlob);

      // Some browsers ignore .click() on a detached anchor — append, click, remove.
      const a = document.createElement('a');
      a.href = url;
      a.download = 'falisha-extension.zip';
      a.rel = 'noopener';
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        a.remove();
        URL.revokeObjectURL(url);
      }, 1500);
    } catch (e) {
      setError(`Token created, but auto-download failed: ${e instanceof Error ? e.message : String(e)}. Use the "Download again" button below, or copy the token manually.`);
    } finally {
      setZipping(false);
    }
  }

  const headers: Record<string, string> = accessToken
    ? { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' };

  async function loadTokens() {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`${API_BASE_URL}/auth/tokens`, { headers });
      if (!r.ok) throw new Error(await r.text());
      const d = await r.json();
      setTokens(d.tokens ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load tokens');
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { void loadTokens(); }, [accessToken]);

  async function createToken() {
    const label = newLabel.trim();
    if (!label) return;
    setCreating(true);
    setError(null);
    try {
      const r = await fetch(`${API_BASE_URL}/auth/tokens`, {
        method: 'POST', headers, body: JSON.stringify({ name: label }),
      });
      if (!r.ok) throw new Error(await r.text());
      const d = await r.json();
      setRevealed({ token: d.token, label });
      setNewLabel('');
      setShowCreate(false);
      await loadTokens();
      // Auto-download the configured extension ZIP. The token is baked into
      // config.json so the user just loads the unpacked folder — no paste.
      void downloadConfiguredExtension(d.token, label);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create token');
    } finally {
      setCreating(false);
    }
  }

  async function revokeTokenById(id: string, label: string) {
    if (!window.confirm(`Revoke "${label}"? Extensions using this token will stop working immediately.`)) return;
    setError(null);
    try {
      const r = await fetch(`${API_BASE_URL}/auth/tokens/${id}`, { method: 'DELETE', headers });
      if (!r.ok && r.status !== 204) throw new Error(await r.text());
      await loadTokens();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to revoke token');
    }
  }

  function copyRevealed() {
    if (!revealed) return;
    navigator.clipboard.writeText(revealed.token).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    });
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-teal-600 rounded-lg flex items-center justify-center">
            <Chrome className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3>Browser Extension</h3>
            <p className="text-sm text-gray-600">One-click CV import from rozeegpt.ai and other supported sites</p>
          </div>
        </div>
        <button
          onClick={() => setShowCreate((v) => !v)}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold transition-colors"
        >
          <Plus className="w-4 h-4" /> Generate token
        </button>
      </div>

      {/* Inline create form */}
      {showCreate && (
        <div className="mb-4 p-4 rounded-lg bg-gray-50 border border-gray-200">
          <label className="block text-xs font-semibold text-gray-700 mb-1">Token name (so you remember which device this is for)</label>
          <div className="flex gap-2">
            <input
              autoFocus
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && createToken()}
              placeholder="e.g. Chrome — work laptop"
              maxLength={80}
              className="flex-1 px-3 py-2 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            <button
              onClick={createToken}
              disabled={creating || !newLabel.trim()}
              className="px-4 py-2 rounded-md bg-teal-600 hover:bg-teal-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-sm font-semibold"
            >
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create'}
            </button>
            <button
              onClick={() => { setShowCreate(false); setNewLabel(''); }}
              className="px-3 py-2 rounded-md border border-gray-300 text-sm text-gray-700 hover:bg-gray-100"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* One-time reveal */}
      {revealed && (
        <div className="mb-4 p-4 rounded-lg bg-gradient-to-br from-teal-50 to-cyan-50 border border-teal-200 space-y-3">
          <div className="flex items-start gap-2">
            {zipping ? (
              <Loader2 className="w-4 h-4 text-teal-700 mt-0.5 flex-shrink-0 animate-spin" />
            ) : (
              <Download className="w-4 h-4 text-teal-700 mt-0.5 flex-shrink-0" />
            )}
            <div className="text-sm text-teal-900">
              {zipping ? (
                <><strong>Preparing your extension…</strong> bundling the token into <code>config.json</code> so you can skip the paste step.</>
              ) : (
                <>
                  <strong>Your extension is downloading.</strong> Save and extract <code>falisha-extension.zip</code>, then open
                  <code className="mx-1 px-1.5 py-0.5 rounded bg-white border border-teal-300 text-xs">chrome://extensions</code>
                  → toggle <em>Developer mode</em> ON → <em>Load unpacked</em> → select the extracted folder. Your token is already configured.
                </>
              )}
            </div>
          </div>

          <div className="text-xs text-teal-900">
            <div className="font-semibold text-teal-800 mb-1.5">Raw token <span className="font-normal text-teal-700">— save to a password manager (shown only once)</span></div>
            <div className="flex items-center gap-2">
              <code className="flex-1 px-3 py-2 rounded-md bg-white border border-teal-300 font-mono text-xs break-all select-all">
                {revealed.token}
              </code>
              <button
                onClick={copyRevealed}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold flex-shrink-0"
              >
                {copied ? <><Check className="w-4 h-4" /> Copied</> : <><Copy className="w-4 h-4" /> Copy</>}
              </button>
            </div>
            <p className="mt-1.5 text-[11px] text-teal-700">The downloaded ZIP already has this token baked in — you only need to copy if you're installing on a second device or using a password manager.</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => downloadConfiguredExtension(revealed.token, revealed.label)}
              disabled={zipping}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-teal-600 hover:bg-teal-700 disabled:bg-gray-300 text-white text-sm font-semibold"
            >
              <Download className="w-4 h-4" /> Download again
            </button>
            <button
              onClick={() => setRevealed(null)}
              className="px-3 py-2 rounded-md border border-gray-300 text-sm text-gray-700 hover:bg-gray-100"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 rounded-md bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>
      )}

      {/* Token list */}
      {loading && tokens.length === 0 ? (
        <div className="py-8 text-center text-sm text-gray-500"><Loader2 className="w-4 h-4 animate-spin inline mr-2" /> Loading…</div>
      ) : tokens.length === 0 ? (
        <div className="py-10 text-center">
          <Chrome className="w-10 h-10 text-gray-300 mx-auto mb-2" strokeWidth={1.5} />
          <p className="text-sm text-gray-600">No extension tokens yet.</p>
          <p className="text-xs text-gray-500 mt-1">Generate one above to install the Chrome extension.</p>
        </div>
      ) : (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-600">
              <tr>
                <th className="text-left px-3 py-2 font-semibold">Name</th>
                <th className="text-left px-3 py-2 font-semibold">Prefix</th>
                <th className="text-left px-3 py-2 font-semibold">Last used</th>
                <th className="text-left px-3 py-2 font-semibold">Created</th>
                <th className="w-12"></th>
              </tr>
            </thead>
            <tbody>
              {tokens.map((t) => (
                <tr key={t.id} className="border-t border-gray-100">
                  <td className="px-3 py-2 font-medium text-gray-900">{t.name}</td>
                  <td className="px-3 py-2 font-mono text-xs text-gray-600">{t.token_prefix}…</td>
                  <td className="px-3 py-2 text-xs text-gray-500">{t.last_used_at ? new Date(t.last_used_at).toLocaleString() : 'never'}</td>
                  <td className="px-3 py-2 text-xs text-gray-500">{new Date(t.created_at).toLocaleDateString()}</td>
                  <td className="px-3 py-2">
                    <button
                      onClick={() => revokeTokenById(t.id, t.name)}
                      title="Revoke this token"
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-gray-100 text-xs text-gray-500">
        <a
          href="https://github.com/holywolf92-a11y/recruitment-portal-frontend/tree/main/chrome-extension#readme"
          target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-teal-700 hover:text-teal-800"
        >
          <ExternalLink className="w-3 h-3" /> Extension install guide
        </a>
        <span className="mx-2">·</span>
        Tokens never expire by default. Revoke if a device is lost.
      </div>
    </div>
  );
}
