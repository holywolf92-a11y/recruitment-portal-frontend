// Isolated-world content script. Two jobs:
//   1. Inject the page-world interceptor (so we can read CV download URLs out
//      of rozeegpt's internal API calls — those happen in the page's JS context
//      which isolated content scripts can't reach directly).
//   2. Scan the DOM for "Download CV" affordances and inject a sibling "Send
//      to Falisha" pill next to each. Click → send via background worker.
//
// Tolerant by design — rozeegpt is early-stage and its UI will churn. We try
// multiple selectors and gracefully fall back to a floating panel that the
// user can paste a CV URL into if nothing is detected.

(() => {
  if (window.__falishaInjected) return;
  window.__falishaInjected = true;

  const PILL_CLASS = 'falisha-send-pill';
  const TOAST_CLASS = 'falisha-toast';

  // ─── 1. Inject the page-world interceptor ─────────────────────────────────
  // Use a <script> tag pointing at the extension's bundled file. This is the
  // MV3-blessed way to run code in the page's world from a content script.
  function injectPageWorld() {
    try {
      const s = document.createElement('script');
      s.src = chrome.runtime.getURL('content/page-interceptor.js');
      s.onload = () => s.remove();
      (document.head || document.documentElement).appendChild(s);
    } catch (e) {
      console.debug('[Falisha] page-world inject failed', e);
    }
  }
  injectPageWorld();

  // Last CV URL captured from the page-world interceptor.
  let lastCapturedCv = null;
  window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    const d = event.data;
    if (!d || d.source !== 'falisha-ext') return;
    if (d.kind === 'cv-url') {
      lastCapturedCv = { ...d.payload, capturedAt: Date.now() };
      console.debug('[Falisha] captured cv', lastCapturedCv);
    }
  });

  // ─── 2. Selector heuristics ───────────────────────────────────────────────
  // Ordered by specificity — first match wins per DOM node.
  function findDownloadAffordances(root = document) {
    const results = new Set();

    // a) aria-label / title === "Download CV"
    root.querySelectorAll('[aria-label*="Download CV" i], [title*="Download CV" i]').forEach((el) => results.add(el));

    // b) Buttons whose visible text contains "download" + "cv"
    root.querySelectorAll('button, a').forEach((el) => {
      const t = (el.textContent || '').trim().toLowerCase();
      if (/download\s*cv|view\s*cv|download\s*resume/.test(t)) results.add(el);
    });

    // c) Anchors with .pdf href that look like CV files
    root.querySelectorAll('a[href$=".pdf"], a[href*=".pdf?"], a[href*="cv/"], a[href*="resume"]').forEach((el) => results.add(el));

    // d) Anchors with download attribute
    root.querySelectorAll('a[download]').forEach((el) => results.add(el));

    // Filter out hidden/our-own elements
    return [...results].filter((el) => {
      if (el.classList?.contains(PILL_CLASS)) return false;
      if (el.closest(`.${PILL_CLASS}`)) return false;
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    });
  }

  // Best-effort extraction of CV metadata from the DOM context of the
  // download affordance. Falls back to whatever the page-world interceptor
  // saw most recently.
  function extractContext(el) {
    const row = el.closest('tr, li, [role="row"], .candidate-card, .candidate, [data-candidate-id]') || el.parentElement;
    let candidateName = null, rozeeCvId = null, rozeeUserId = null, cvUrl = null;

    // Direct attributes on the element
    if (el.tagName === 'A' && el.href && el.href.includes('.pdf')) cvUrl = el.href;
    if (el.dataset?.cvUrl)    cvUrl = el.dataset.cvUrl;
    if (el.dataset?.cvId)     rozeeCvId = el.dataset.cvId;
    if (el.dataset?.userId)   rozeeUserId = el.dataset.userId;

    // Walk up looking for data-* attributes
    if (row) {
      if (!rozeeCvId)   rozeeCvId   = row.dataset?.cvId || row.querySelector('[data-cv-id]')?.dataset?.cvId || null;
      if (!rozeeUserId) rozeeUserId = row.dataset?.userId || row.querySelector('[data-user-id]')?.dataset?.userId || null;
      // First "name-like" text in the row
      const nameNode = row.querySelector('h1, h2, h3, h4, h5, .name, .candidate-name, [data-name]');
      if (nameNode) candidateName = nameNode.textContent?.trim().slice(0, 120) || null;
    }

    // Fall back to the most-recent capture from the page-world interceptor
    // (within a 30s window so we don't pair the wrong CV with the wrong row)
    if ((!cvUrl || !rozeeCvId) && lastCapturedCv && Date.now() - lastCapturedCv.capturedAt < 30_000) {
      cvUrl     ||= lastCapturedCv.cvUrl;
      rozeeCvId ||= lastCapturedCv.cvId;
      rozeeUserId ||= lastCapturedCv.userId;
    }

    return { cvUrl, rozeeCvId, rozeeUserId, candidateName };
  }

  // ─── 3. Pill rendering ────────────────────────────────────────────────────
  function buildPill(onClick) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = PILL_CLASS;
    btn.innerHTML = `
      <svg class="${PILL_CLASS}-icon" viewBox="0 0 24 24" width="14" height="14" stroke-width="2.4" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
        <path d="M22 2 11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/>
      </svg>
      <span class="${PILL_CLASS}-label">Send to Falisha</span>
    `;
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      onClick(btn);
    });
    return btn;
  }

  function setPillState(btn, state) {
    btn.classList.remove('is-loading', 'is-success', 'is-error');
    const label = btn.querySelector(`.${PILL_CLASS}-label`);
    if (state === 'loading') { btn.classList.add('is-loading'); if (label) label.textContent = 'Sending…'; btn.disabled = true; }
    else if (state === 'success') { btn.classList.add('is-success'); if (label) label.textContent = 'Sent ✓'; }
    else if (state === 'duplicate') { btn.classList.add('is-success'); if (label) label.textContent = 'Already in Falisha'; }
    else if (state === 'error') { btn.classList.add('is-error'); if (label) label.textContent = 'Failed — retry'; btn.disabled = false; }
    else { if (label) label.textContent = 'Send to Falisha'; btn.disabled = false; }
  }

  function showToast(message, kind = 'success') {
    const root = document.body || document.documentElement;
    const toast = document.createElement('div');
    toast.className = `${TOAST_CLASS} ${TOAST_CLASS}--${kind}`;
    toast.textContent = message;
    root.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('is-shown'));
    setTimeout(() => {
      toast.classList.remove('is-shown');
      setTimeout(() => toast.remove(), 250);
    }, 3500);
  }

  async function sendCvFromContext(btn, ctx) {
    // If we don't have a URL yet, click the original element first so the
    // page-world interceptor can capture the response, then retry the send
    // after a brief wait. This handles the common pattern where clicking
    // "Download" fires a POST that returns a presigned URL.
    setPillState(btn, 'loading');

    if (!ctx.cvUrl) {
      // Trigger the original element's click in the page world.
      // (Cannot do this via .click() on a button that has its own handler
      // attached in the page world from an isolated context — but for plain
      // anchors / framework buttons this works fine.)
      const trigger = btn.__falishaTarget;
      if (trigger) {
        try { trigger.click(); } catch { /* ignore */ }
      }
      // Wait up to 3s for the interceptor to capture a URL
      const start = Date.now();
      while (Date.now() - start < 3000) {
        if (lastCapturedCv && lastCapturedCv.capturedAt > start - 100) {
          ctx = { ...ctx, ...lastCapturedCv, cvUrl: lastCapturedCv.cvUrl };
          break;
        }
        await new Promise((r) => setTimeout(r, 100));
      }
    }

    if (!ctx.cvUrl) {
      setPillState(btn, 'error');
      showToast('Could not find a download URL — open this CV first then click Send to Falisha.', 'error');
      return;
    }

    chrome.runtime.sendMessage(
      {
        kind: 'ingestCv',
        cvUrl: ctx.cvUrl,
        rozeeCvId: ctx.rozeeCvId,
        rozeeUserId: ctx.rozeeUserId,
        candidateName: ctx.candidateName,
        sourceUrl: location.href,
        fileName: (ctx.candidateName || ctx.rozeeCvId || 'cv') + '.pdf',
      },
      (resp) => {
        if (chrome.runtime.lastError) {
          setPillState(btn, 'error');
          showToast(chrome.runtime.lastError.message, 'error');
          return;
        }
        if (resp?.ok) {
          if (resp.result?.duplicate) {
            setPillState(btn, 'duplicate');
            showToast(`Already in Falisha — ${ctx.candidateName || 'CV'}`, 'info');
          } else {
            setPillState(btn, 'success');
            showToast(`Sent to Falisha — ${ctx.candidateName || 'CV'}`, 'success');
          }
        } else {
          setPillState(btn, 'error');
          showToast(resp?.error || 'Send failed', 'error');
        }
      },
    );
  }

  function injectPillNextTo(target) {
    if (target.dataset.falishaInjected === '1') return;
    target.dataset.falishaInjected = '1';

    const pill = buildPill((btn) => {
      const ctx = extractContext(target);
      sendCvFromContext(btn, ctx);
    });
    pill.__falishaTarget = target;
    target.parentElement?.insertBefore(pill, target.nextSibling);
  }

  // ─── 4. MutationObserver — re-scan on SPA navigation + DOM mutations ──────
  let scanScheduled = false;
  function scheduleScan() {
    if (scanScheduled) return;
    scanScheduled = true;
    setTimeout(() => {
      scanScheduled = false;
      findDownloadAffordances().forEach(injectPillNextTo);
    }, 250);
  }
  new MutationObserver(scheduleScan).observe(document.body || document.documentElement, {
    childList: true, subtree: true,
  });
  scheduleScan();

  // SPA navigation — monkey-patch history API so we re-scan on route change
  ['pushState', 'replaceState'].forEach((m) => {
    const orig = history[m];
    history[m] = function (...args) {
      const r = orig.apply(this, args);
      setTimeout(scheduleScan, 300);
      return r;
    };
  });
  window.addEventListener('popstate', () => setTimeout(scheduleScan, 300));
})();
