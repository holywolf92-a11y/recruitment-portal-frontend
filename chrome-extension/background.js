// Service worker — handles every "Send to Falisha" request from the content
// scripts. Fetches the CV PDF using the user's existing rozeegpt session
// (credentials: 'include' carries cookies), then POSTs it as multipart/form-data
// to the Falisha backend with the user's stored bearer token.
//
// All inter-page state lives in chrome.storage.local — the worker stops and
// restarts on idle in MV3, so we read settings on every message rather than
// caching them in module scope.

const DEFAULT_API_BASE = 'https://glorious-flexibility-production.up.railway.app/api';

// Per-tab session counter for the badge text
const sessionCounts = new Map(); // tabId -> { sent: number, failed: number }

// On install (or update), if a `config.json` is bundled with the extension
// (the auto-download flow injects this), bootstrap chrome.storage.local so
// the user doesn't have to copy/paste a token. We only overwrite when the
// stored value is empty — so an existing user's token isn't clobbered on
// extension update.
chrome.runtime.onInstalled.addListener(async () => {
  try {
    const url = chrome.runtime.getURL('config.json');
    const res = await fetch(url);
    if (!res.ok) return;
    const cfg = await res.json();
    const existing = await chrome.storage.local.get(['apiBase', 'apiToken']);
    const patch = {};
    if (cfg.apiBase  && !existing.apiBase)  patch.apiBase  = cfg.apiBase;
    if (cfg.apiToken && !existing.apiToken) patch.apiToken = cfg.apiToken;
    if (Object.keys(patch).length) await chrome.storage.local.set(patch);
  } catch (e) {
    // No config.json bundled — that's fine, user will paste their token manually.
    console.debug('[Falisha] no bundled config.json — manual token entry expected');
  }
});

async function readSettings() {
  const { apiBase, apiToken } = await chrome.storage.local.get(['apiBase', 'apiToken']);
  return {
    apiBase: (apiBase && apiBase.trim()) || DEFAULT_API_BASE,
    apiToken: apiToken || '',
  };
}

async function appendRecentSend(record) {
  const { recentSends = [] } = await chrome.storage.local.get('recentSends');
  const next = [record, ...recentSends].slice(0, 50);
  await chrome.storage.local.set({ recentSends: next });
}

async function notify(title, message, isError = false) {
  try {
    await chrome.notifications.create({
      type: 'basic',
      iconUrl: chrome.runtime.getURL('icons/icon-128.png'),
      title: 'Falisha — ' + title,
      message: message || '',
      priority: isError ? 2 : 0,
    });
  } catch (e) {
    // Notifications can be disabled — non-fatal
    console.debug('[Falisha] notification failed', e);
  }
}

async function updateBadge(tabId) {
  const s = sessionCounts.get(tabId) || { sent: 0, failed: 0 };
  if (s.failed > 0) {
    chrome.action.setBadgeText({ tabId, text: '!' });
    chrome.action.setBadgeBackgroundColor({ tabId, color: '#dc2626' });
  } else if (s.sent > 0) {
    chrome.action.setBadgeText({ tabId, text: String(s.sent) });
    chrome.action.setBadgeBackgroundColor({ tabId, color: '#0F766E' });
  } else {
    chrome.action.setBadgeText({ tabId, text: '' });
  }
}

// ─── Main message handler ───────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || typeof message !== 'object') return;

  if (message.kind === 'ingestCv') {
    const tabId = sender.tab?.id;
    ingestCv(message, tabId)
      .then((result) => {
        const s = sessionCounts.get(tabId) || { sent: 0, failed: 0 };
        s.sent += 1;
        sessionCounts.set(tabId, s);
        updateBadge(tabId);
        sendResponse({ ok: true, result });
      })
      .catch((err) => {
        const s = sessionCounts.get(tabId) || { sent: 0, failed: 0 };
        s.failed += 1;
        sessionCounts.set(tabId, s);
        updateBadge(tabId);
        sendResponse({ ok: false, error: err.message || String(err) });
      });
    return true; // keep the channel open for async sendResponse
  }

  if (message.kind === 'testConnection') {
    testConnection().then(sendResponse).catch((err) => sendResponse({ ok: false, error: err.message }));
    return true;
  }
});

// ─── Ingest one CV ──────────────────────────────────────────────────────────
async function ingestCv({ cvUrl, rozeeCvId, rozeeUserId, rozeeTopJobJid, sourceUrl, candidateName, fileName }, tabId) {
  const { apiBase, apiToken } = await readSettings();
  if (!apiToken) {
    const msg = 'No API token configured — click the Falisha icon to set one up.';
    await appendRecentSend({ at: Date.now(), candidateName: candidateName || fileName || rozeeCvId, status: 'error', error: msg });
    notify('Token missing', msg, true);
    throw new Error(msg);
  }
  if (!cvUrl) throw new Error('Missing CV URL — could not find a download link for that candidate.');

  // 1) Download the PDF using the user's rozeegpt session cookies.
  const pdfRes = await fetch(cvUrl, { credentials: 'include' });
  if (!pdfRes.ok) {
    throw new Error(`Could not download CV from rozeegpt: HTTP ${pdfRes.status}`);
  }
  const blob = await pdfRes.blob();
  if (blob.size > 25 * 1024 * 1024) {
    throw new Error(`CV is ${(blob.size / 1024 / 1024).toFixed(1)} MB — Falisha limit is 25 MB.`);
  }

  // 2) POST it to the Falisha ingest endpoint.
  const form = new FormData();
  const safeName = (fileName || `cv-${rozeeCvId || Date.now()}.pdf`).replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 80);
  form.append('cv', blob, safeName);
  if (rozeeCvId)      form.append('rozeeCvId', String(rozeeCvId));
  if (rozeeUserId)    form.append('rozeeUserId', String(rozeeUserId));
  if (rozeeTopJobJid) form.append('rozeeTopJobJid', String(rozeeTopJobJid));
  if (sourceUrl)      form.append('sourceUrl', String(sourceUrl));
  if (candidateName)  form.append('candidateName', String(candidateName));

  const ingestRes = await fetch(`${apiBase}/extension/ingest-cv`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiToken}` },
    body: form,
  });
  const data = await ingestRes.json().catch(() => ({}));
  if (!ingestRes.ok) {
    const msg = data?.message || data?.error || `HTTP ${ingestRes.status}`;
    await appendRecentSend({
      at: Date.now(),
      candidateName: candidateName || safeName,
      rozeeCvId, status: ingestRes.status === 401 ? 'auth_error' : 'error', error: msg,
    });
    if (ingestRes.status === 401)        notify('Token invalid', 'Click the Falisha icon to update your token.', true);
    else if (ingestRes.status === 413)   notify('CV too large', 'Max 25 MB.', true);
    else if (ingestRes.status === 429)   notify('Rate-limited', 'Slow down — try again in a minute.', true);
    else                                 notify('Send failed', msg, true);
    throw new Error(msg);
  }

  await appendRecentSend({
    at: Date.now(),
    candidateName: candidateName || safeName,
    rozeeCvId,
    status: data.duplicate ? 'duplicate' : 'sent',
    attachmentId: data.attachmentId || null,
  });

  if (data.duplicate) notify('Already in Falisha', `${candidateName || safeName} was already imported.`);
  else                notify('Sent to Falisha', candidateName || safeName);

  return data;
}

// ─── Test connection ────────────────────────────────────────────────────────
async function testConnection() {
  const { apiBase, apiToken } = await readSettings();
  if (!apiToken) return { ok: false, error: 'No token configured' };
  try {
    const r = await fetch(`${apiBase}/extension/me`, { headers: { Authorization: `Bearer ${apiToken}` } });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) return { ok: false, error: d?.error || `HTTP ${r.status}` };
    return { ok: true, user: d.user };
  } catch (err) {
    return { ok: false, error: err.message || String(err) };
  }
}

// Clear per-tab counters when tabs close
chrome.tabs?.onRemoved?.addListener((tabId) => sessionCounts.delete(tabId));
