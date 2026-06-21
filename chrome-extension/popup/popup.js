const DEFAULT_API_BASE = 'https://glorious-flexibility-production.up.railway.app/api';

const $ = (id) => document.getElementById(id);

async function loadSettings() {
  const { apiBase, apiToken } = await chrome.storage.local.get(['apiBase', 'apiToken']);
  $('apiBase').value = apiBase || DEFAULT_API_BASE;
  $('apiToken').value = apiToken || '';
}

async function saveSettings() {
  const apiBase  = $('apiBase').value.trim() || DEFAULT_API_BASE;
  const apiToken = $('apiToken').value.trim();
  await chrome.storage.local.set({ apiBase, apiToken });
  flashTest('Saved.', 'ok');
  // Re-test after save
  setTimeout(testConnection, 200);
}

function setStatusDot(state) {
  const el = $('statusDot');
  el.classList.remove('status-dot--ok', 'status-dot--err', 'status-dot--unknown');
  el.classList.add(`status-dot--${state}`);
  el.title = state === 'ok' ? 'Connected' : state === 'err' ? 'Connection failed' : 'Unknown';
}

function flashTest(text, kind) {
  const el = $('testResult');
  el.textContent = text;
  el.className = `test-result test-result--${kind}`;
}

async function testConnection() {
  flashTest('Testing…', 'loading');
  const resp = await new Promise((resolve) => {
    chrome.runtime.sendMessage({ kind: 'testConnection' }, resolve);
  });
  if (!resp) {
    setStatusDot('err');
    flashTest('No response from background worker.', 'err');
    return;
  }
  if (resp.ok) {
    setStatusDot('ok');
    const u = resp.user;
    flashTest(`Connected as ${u?.email || 'user'} (${u?.role || 'no role'})`, 'ok');
  } else {
    setStatusDot('err');
    flashTest(resp.error || 'Failed', 'err');
  }
}

function fmtTime(ts) {
  const d = new Date(ts);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function statusBadge(status) {
  if (status === 'sent')        return '<span class="badge badge--ok">Sent</span>';
  if (status === 'duplicate')   return '<span class="badge badge--info">Duplicate</span>';
  if (status === 'auth_error')  return '<span class="badge badge--err">Auth error</span>';
  return '<span class="badge badge--err">Failed</span>';
}

async function renderRecent() {
  const { recentSends = [] } = await chrome.storage.local.get('recentSends');
  const list = $('recentList');
  if (!recentSends.length) {
    list.innerHTML = '<div class="empty">Nothing sent yet. Visit <a href="https://rozeegpt.ai/employer" target="_blank" rel="noopener noreferrer">rozeegpt.ai</a> and look for the teal pill.</div>';
    return;
  }
  list.innerHTML = recentSends.map((r) => `
    <div class="recent-row">
      <div class="recent-row-main">
        <div class="recent-row-name">${escapeHtml(r.candidateName || r.rozeeCvId || 'CV')}</div>
        ${r.error ? `<div class="recent-row-error">${escapeHtml(r.error)}</div>` : ''}
      </div>
      <div class="recent-row-meta">
        ${statusBadge(r.status)}
        <span class="recent-row-time">${fmtTime(r.at)}</span>
      </div>
    </div>
  `).join('');
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// ─── wire up ─────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  await loadSettings();
  await renderRecent();
  $('saveBtn').addEventListener('click', saveSettings);
  $('testBtn').addEventListener('click', testConnection);
  $('toggleTokenVisibility').addEventListener('click', () => {
    const t = $('apiToken');
    t.type = t.type === 'password' ? 'text' : 'password';
  });
  $('clearRecentBtn').addEventListener('click', async () => {
    await chrome.storage.local.set({ recentSends: [] });
    await renderRecent();
  });
  // Auto-test on open if token is set
  const { apiToken } = await chrome.storage.local.get('apiToken');
  if (apiToken) testConnection();
});

// Refresh recent list when storage changes (a new send lands while popup is open)
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.recentSends) renderRecent();
});
