// Defensive content script — DOES NOT touch window.fetch / XMLHttpRequest or
// any other page primitives. The earlier monkey-patching turned out to break
// rozeegpt's own network code, blocking the page from loading at all.
//
// Instead we just watch for CV download anchors/buttons in the DOM and
// inject a sibling "Send to Falisha" pill. Click → grab the URL/id off the
// element's own attributes (href, data-cv-id, etc.) and ask the service
// worker to download + post.
//
// Every operation is wrapped in try/catch. If anything in here throws,
// rozeegpt's page MUST still work.

(() => {
  try {
    if (window.__falishaInjected) return;
    window.__falishaInjected = true;
  } catch { return; }

  const PILL_CLASS = 'falisha-send-pill';
  const TOAST_CLASS = 'falisha-toast';
  const SCAN_DEBOUNCE_MS = 800;
  const SCAN_MAX_NODES   = 2000; // cap how many elements we inspect per scan

  // ── Heuristics for finding "Download CV" affordances ─────────────────────
  // Ordered most-specific-first. We DELIBERATELY ignore plain anchors with
  // .pdf hrefs everywhere — that's too broad. We need an explicit signal
  // that the element is for a CV/résumé.
  function findCvAffordances() {
    const found = new Set();
    try {
      // a) Explicit ARIA / title attributes
      document.querySelectorAll('[aria-label*="Download CV" i], [aria-label*="Download Resume" i], [title*="Download CV" i], [title*="Download Resume" i]').forEach((el) => found.add(el));

      // b) Visible text on buttons/anchors
      const buttons = document.querySelectorAll('button, a[role="button"]');
      let i = 0;
      for (const el of buttons) {
        if (i++ > SCAN_MAX_NODES) break;
        const t = (el.textContent || '').trim().toLowerCase();
        if (t && t.length < 50 && /\b(download|view)\s*(cv|resume)\b/.test(t)) found.add(el);
      }

      // c) Anchors with explicit `download` attr that mention cv/resume in href or text
      document.querySelectorAll('a[download]').forEach((el) => {
        const hint = ((el.getAttribute('href') || '') + ' ' + (el.textContent || '')).toLowerCase();
        if (/cv|resume/.test(hint)) found.add(el);
      });
    } catch { /* never let scanning errors break the page */ }
    // Filter out hidden + our own pills
    const out = [];
    for (const el of found) {
      try {
        if (el.classList && el.classList.contains(PILL_CLASS)) continue;
        if (el.closest && el.closest(`.${PILL_CLASS}`)) continue;
        if (el.dataset && el.dataset.falishaInjected === '1') continue;
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) out.push(el);
      } catch { /* skip */ }
    }
    return out;
  }

  function extractContext(el) {
    let cvUrl = null, rozeeCvId = null, rozeeUserId = null, candidateName = null;
    try {
      // Anchor href first
      if (el.tagName === 'A' && el.href) cvUrl = el.href;
      // data-* attributes
      if (el.dataset) {
        cvUrl       = cvUrl || el.dataset.cvUrl || el.dataset.url || null;
        rozeeCvId   = el.dataset.cvId || el.dataset.id || null;
        rozeeUserId = el.dataset.userId || null;
      }
      // Climb up looking for row context
      const row = el.closest('tr, li, [role="row"], .candidate-card, .candidate, [data-candidate-id], [data-user-id]');
      if (row && row.dataset) {
        rozeeCvId   = rozeeCvId   || row.dataset.cvId || row.dataset.candidateId || row.dataset.id || null;
        rozeeUserId = rozeeUserId || row.dataset.userId || null;
      }
      if (row) {
        const nameNode = row.querySelector('h1, h2, h3, h4, h5, .name, .candidate-name, [data-name]');
        if (nameNode) candidateName = (nameNode.textContent || '').trim().slice(0, 120) || null;
      }
    } catch { /* swallow */ }
    return { cvUrl, rozeeCvId, rozeeUserId, candidateName };
  }

  function buildPill(onClick) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = PILL_CLASS;
    btn.innerHTML = `
      <svg viewBox="0 0 24 24" width="14" height="14" stroke-width="2.4" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" class="${PILL_CLASS}-icon">
        <path d="M22 2 11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/>
      </svg>
      <span class="${PILL_CLASS}-label">Send to Falisha</span>
    `;
    btn.addEventListener('click', (e) => {
      try { e.preventDefault(); e.stopPropagation(); } catch {}
      onClick(btn);
    });
    return btn;
  }

  function setPillState(btn, state) {
    try {
      btn.classList.remove('is-loading', 'is-success', 'is-error');
      const label = btn.querySelector(`.${PILL_CLASS}-label`);
      const set = (text) => { if (label) label.textContent = text; };
      if (state === 'loading')        { btn.classList.add('is-loading');  set('Sending…');           btn.disabled = true; }
      else if (state === 'success')   { btn.classList.add('is-success');  set('Sent ✓');             }
      else if (state === 'duplicate') { btn.classList.add('is-success');  set('Already in Falisha'); }
      else if (state === 'error')     { btn.classList.add('is-error');    set('Failed — retry');     btn.disabled = false; }
      else                            { set('Send to Falisha');                                     btn.disabled = false; }
    } catch {}
  }

  function showToast(message, kind) {
    try {
      const root = document.body || document.documentElement;
      if (!root) return;
      const toast = document.createElement('div');
      toast.className = `${TOAST_CLASS} ${TOAST_CLASS}--${kind || 'info'}`;
      toast.textContent = message;
      root.appendChild(toast);
      requestAnimationFrame(() => toast.classList.add('is-shown'));
      setTimeout(() => {
        try { toast.classList.remove('is-shown'); setTimeout(() => toast.remove(), 250); } catch {}
      }, 3500);
    } catch {}
  }

  function dispatchIngest(btn, ctx, cvUrl) {
    try {
      chrome.runtime.sendMessage(
        {
          kind: 'ingestCv',
          cvUrl,
          rozeeCvId: ctx.rozeeCvId || 'unknown',
          rozeeUserId: ctx.rozeeUserId,
          candidateName: ctx.candidateName,
          sourceUrl: location.href,
          fileName: (ctx.candidateName || ctx.rozeeCvId || 'cv') + '.pdf',
        },
        (resp) => {
          try {
            if (chrome.runtime.lastError) {
              setPillState(btn, 'error');
              showToast(chrome.runtime.lastError.message || 'Send failed', 'error');
              return;
            }
            if (resp && resp.ok) {
              if (resp.result && resp.result.duplicate) {
                setPillState(btn, 'duplicate');
                showToast(`Already in Falisha — ${ctx.candidateName || 'CV'}`, 'info');
              } else {
                setPillState(btn, 'success');
                showToast(`Sent to Falisha — ${ctx.candidateName || 'CV'}`, 'success');
              }
            } else {
              setPillState(btn, 'error');
              showToast((resp && resp.error) || 'Send failed', 'error');
            }
          } catch {}
        },
      );
    } catch {
      setPillState(btn, 'error');
      showToast('Extension messaging failed — reload the page and try again.', 'error');
    }
  }

  function askBackgroundForCapturedUrl() {
    return new Promise((resolve) => {
      try {
        chrome.runtime.sendMessage({ kind: 'getRecentCvUrl' }, (resp) => {
          try { resolve(resp && resp.cvUrl ? resp.cvUrl : null); }
          catch { resolve(null); }
        });
      } catch { resolve(null); }
    });
  }

  async function sendCvFromPill(btn, target) {
    const ctx = extractContext(target);
    setPillState(btn, 'loading');

    // Path 1 — URL is already in the DOM (anchor href / data attribute)
    if (ctx.cvUrl) { dispatchIngest(btn, ctx, ctx.cvUrl); return; }

    // Path 2 — try clicking the original rozeegpt button so it fires its
    // network request. The background's webRequest observer captures the URL.
    // Auto-cancels the disk download so the user only gets the Falisha copy.
    try { target.click(); } catch { /* may throw on synthetic-event-only handlers */ }

    // Poll up to ~5s for the background to see a CV URL on this tab.
    for (let i = 0; i < 25; i += 1) {
      await new Promise((r) => setTimeout(r, 200));
      const captured = await askBackgroundForCapturedUrl();
      if (captured) { dispatchIngest(btn, ctx, captured); return; }
    }

    // Path 3 — give the user a clear next step. Most rozeegpt UIs require
    // a real click to fire the download request; if our programmatic click
    // didn't trigger it (React synthetic-event handler), the user can click
    // rozeegpt's Download button themselves then click our pill again — the
    // observer keeps URLs for 60s.
    setPillState(btn, 'error');
    showToast(
      'No CV download URL detected. Click rozeegpt\'s "Download CV" button once, then click Send to Falisha again.',
      'error',
    );
  }

  function injectPillNextTo(target) {
    try {
      if (!target || !target.parentElement) return;
      if (target.dataset && target.dataset.falishaInjected === '1') return;
      if (target.dataset) target.dataset.falishaInjected = '1';
      const pill = buildPill((btn) => sendCvFromPill(btn, target));
      target.parentElement.insertBefore(pill, target.nextSibling);
    } catch { /* never throw */ }
  }

  // ── Throttled DOM scan ────────────────────────────────────────────────────
  let scanTimer = null;
  function scheduleScan() {
    if (scanTimer) return;
    scanTimer = setTimeout(() => {
      scanTimer = null;
      try { findCvAffordances().forEach(injectPillNextTo); } catch {}
    }, SCAN_DEBOUNCE_MS);
  }

  // Observe the body for additions — but don't watch attribute changes
  // (rozeegpt's MUI re-renders attributes constantly; attribute filter
  // would cause a scan storm).
  try {
    const observer = new MutationObserver(scheduleScan);
    observer.observe(document.body || document.documentElement, {
      childList: true,
      subtree: true,
      attributes: false,
      characterData: false,
    });
  } catch {}

  // SPA navigation — pushState / replaceState wrap, popstate listen.
  try {
    ['pushState', 'replaceState'].forEach((m) => {
      const orig = history[m];
      if (typeof orig === 'function') {
        history[m] = function (...args) {
          const r = orig.apply(this, args);
          setTimeout(scheduleScan, 400);
          return r;
        };
      }
    });
    window.addEventListener('popstate', () => setTimeout(scheduleScan, 400));
  } catch {}

  // Kick off
  scheduleScan();
})();
