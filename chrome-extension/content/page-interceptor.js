// Runs in the PAGE world (injected via <script src=...>) so it can see the
// page's window.fetch and XMLHttpRequest. Wraps both and forwards anything
// that looks like a CV download URL to the isolated content script via
// window.postMessage. The isolated script then relays to the service worker.

(() => {
  if (window.__falishaPageInjected) return;
  window.__falishaPageInjected = true;

  // Heuristic — does this URL look like a CV download endpoint or a PDF URL?
  function looksLikeCvUrl(url) {
    if (!url) return false;
    return /downloadUserCv|downloadBulkCv|cv\/download|resume\/download|\/cv\/.+\.pdf/i.test(url);
  }
  function looksLikePresignedPdf(url) {
    if (!url) return false;
    return /\.pdf(?:[?#]|$)/i.test(url);
  }

  function emitCapture(payload) {
    try {
      window.postMessage({ source: 'falisha-ext', kind: 'cv-url', payload }, '*');
    } catch (e) {
      // postMessage rarely fails — but defensive
      console.debug('[Falisha pi] emit failed', e);
    }
  }

  // Recursively walk a JSON object looking for likely CV URL fields.
  function findCvFieldsInPayload(obj, depth = 0) {
    if (!obj || depth > 4) return null;
    if (typeof obj === 'string' && looksLikePresignedPdf(obj)) return { cvUrl: obj };
    if (typeof obj !== 'object') return null;
    // Known field name patterns
    for (const key of Object.keys(obj)) {
      const v = obj[key];
      if (typeof v === 'string' && /url|link|presigned/i.test(key) && looksLikePresignedPdf(v)) {
        return {
          cvUrl: v,
          cvId: obj.cvId || obj.cv_id || obj.id || null,
          userId: obj.userId || obj.user_id || null,
        };
      }
    }
    // Recurse
    for (const v of Object.values(obj)) {
      const found = findCvFieldsInPayload(v, depth + 1);
      if (found) return found;
    }
    return null;
  }

  // ─── fetch wrap ─────────────────────────────────────────────────────────
  const originalFetch = window.fetch;
  window.fetch = async function (...args) {
    const res = await originalFetch.apply(this, args);
    try {
      const url = typeof args[0] === 'string' ? args[0] : (args[0]?.url || '');
      if (looksLikeCvUrl(url) || looksLikePresignedPdf(url)) {
        // Clone so the page can still consume the body
        const clone = res.clone();
        const ct = (clone.headers.get('content-type') || '').toLowerCase();
        if (ct.includes('application/json')) {
          clone.json().then((body) => {
            const found = findCvFieldsInPayload(body);
            if (found?.cvUrl) emitCapture({ ...found, requestUrl: url });
          }).catch(() => { /* non-JSON response — ignore */ });
        } else if (looksLikePresignedPdf(url)) {
          // The request itself was for a PDF — that IS the URL
          emitCapture({ cvUrl: url });
        }
      }
    } catch (e) {
      console.debug('[Falisha pi] fetch hook error', e);
    }
    return res;
  };

  // ─── XHR wrap ───────────────────────────────────────────────────────────
  const OrigXHR = window.XMLHttpRequest;
  const origOpen = OrigXHR.prototype.open;
  const origSend = OrigXHR.prototype.send;
  OrigXHR.prototype.open = function (method, url, ...rest) {
    this.__falishaUrl = url;
    return origOpen.call(this, method, url, ...rest);
  };
  OrigXHR.prototype.send = function (...args) {
    this.addEventListener('load', () => {
      try {
        const url = this.__falishaUrl || '';
        if (!looksLikeCvUrl(url) && !looksLikePresignedPdf(url)) return;
        const ct = (this.getResponseHeader('content-type') || '').toLowerCase();
        if (ct.includes('application/json')) {
          let body = null;
          try { body = JSON.parse(this.responseText); } catch { return; }
          const found = findCvFieldsInPayload(body);
          if (found?.cvUrl) emitCapture({ ...found, requestUrl: url });
        } else if (looksLikePresignedPdf(url)) {
          emitCapture({ cvUrl: url });
        }
      } catch (e) {
        console.debug('[Falisha pi] xhr hook error', e);
      }
    });
    return origSend.apply(this, args);
  };
})();
