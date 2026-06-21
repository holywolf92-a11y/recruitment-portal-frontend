# Send to Falisha — Chrome Extension

One-click CV import from **rozeegpt.ai** into your Falisha portal.

A teal "Send to Falisha" pill appears next to every Download CV button on rozeegpt. Click it — the extension fetches the PDF using your existing rozeegpt session and posts it straight into the Falisha CV inbox. The PDF never touches your local disk.

## Install (90 seconds)

### Step 1 — Generate token + auto-download configured extension

1. Open the Falisha portal → **Settings** tab → **Browser Extension** card
2. Click **Generate token**, name it (e.g. *"Chrome — work laptop"*)
3. `falisha-extension.zip` downloads automatically — your token is already baked into the bundle (no copy-paste).

### Step 2 — Load the extension

1. Extract `falisha-extension.zip` to a folder you'll keep around
2. Open Chrome → `chrome://extensions`
3. Toggle **Developer mode** ON (top-right)
4. Click **Load unpacked** and select the extracted folder
5. Pin the **Falisha — Send to Falisha** extension via the puzzle-piece icon

The green dot in the popup confirms the connection — token is already configured.

### Step 3 — Use it

1. Open `https://rozeegpt.ai/employer` and log in as usual
2. On any candidate list, shortlist, or CV-search page, a **teal "Send to Falisha" pill** appears next to each Download CV button
3. Click the pill → toast confirms the CV is in Falisha within ~2 seconds
4. Open `https://falishajobs.up.railway.app/cv-inbox` and filter by source = **rozeegpt** to see imports

## How it works

| Step | What happens |
|---|---|
| 1 | The content script scans the rozeegpt page DOM for Download-CV buttons and injects a sibling pill next to each |
| 2 | When you click the pill, the extension reads the CV's URL from the DOM (or intercepts rozeegpt's internal download API call) |
| 3 | The background service worker fetches the PDF using your rozeegpt session cookies |
| 4 | The worker POSTs the PDF to `POST /api/extension/ingest-cv` on the Falisha backend with your bearer token |
| 5 | Falisha's existing pipeline takes over: Supabase Storage → cv-parsing queue → candidate row |

Your rozeegpt 2,000 CVs/month quota is consumed exactly once per pill click (same as a native download).

## Troubleshooting

| Symptom | Fix |
|---|---|
| **No pill on the page** | Hard-refresh (Ctrl+Shift+R). If still missing, rozeegpt's UI may have changed — open a GitHub issue with the page URL. The extension falls back to the floating bottom-right panel if it can't detect any buttons. |
| **Token invalid (red dot)** | The token was revoked or you typed it wrong. Generate a fresh one in Falisha Settings. |
| **"File is not a PDF"** | rozeegpt served an HTML error page (usually means your session expired). Reload rozeegpt.ai and log back in. |
| **"CV too large"** | 25 MB hard limit on the Falisha endpoint. Very large CVs are rare — let us know if you hit this. |
| **"Rate limited"** | 60 sends per minute per token. Wait a minute. |
| **Extension stops working after Chrome update** | Re-open `chrome://extensions` and click the refresh icon on the Falisha card. Settings persist across reloads. |

## Updating the extension

Pull the latest `chrome-extension/` folder from the repo and click the circular-arrow refresh icon on the extension's card at `chrome://extensions`. Your token + recent-sends persist across updates.

## Revoking access (lost laptop, team member leaving)

In the Falisha portal → **Settings** → **Browser Extension**, click **Revoke** next to the token. The very next request from that extension returns 401 and the user must mint a new token.

## Security

- Token is stored only in `chrome.storage.local` (per-profile, never synced across devices)
- The Falisha backend never stores the plaintext — only a SHA-256 hash
- All requests go over HTTPS
- Per-token rate limit (60/min) prevents runaway scripts
- Server-side PDF magic-byte validation rejects non-PDF uploads before they hit storage
- Audit trail: every ingest creates an `inbox_messages` row tagged `source='rozeegpt'` with your user ID

## Roadmap

- [ ] Chrome Web Store publication (currently developer-mode unpacked)
- [ ] Support for other recruitment sites (Bayt, GulfTalent, Indeed)
- [ ] Bulk-select multiple candidates and send in one batch
- [ ] Direct API integration if/when rozeegpt.ai exposes a webhook
