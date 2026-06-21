// Bundles the chrome-extension/ folder into public/falisha-extension.zip at
// build time so the frontend can serve it as a static asset. The
// BrowserExtensionCard later fetches this zip, injects the user's token into
// a `config.json` entry, and triggers a download. No backend round-trip.
//
// Run via: `node scripts/build-extension-zip.mjs` (also wired as `prebuild`).

import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import JSZip from 'jszip';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const ROOT       = path.resolve(__dirname, '..');
const EXT_DIR    = path.join(ROOT, 'chrome-extension');
const OUT_PATH   = path.join(ROOT, 'public', 'falisha-extension.zip');

async function walk(dir, base = dir) {
  const out = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...(await walk(abs, base)));
    } else if (entry.isFile()) {
      const rel = path.relative(base, abs).split(path.sep).join('/');
      out.push({ abs, rel });
    }
  }
  return out;
}

async function main() {
  try {
    await fs.access(EXT_DIR);
  } catch {
    console.warn(`[build-extension-zip] no chrome-extension/ folder at ${EXT_DIR} — skipping`);
    return;
  }

  const files = await walk(EXT_DIR);
  if (!files.length) {
    console.warn('[build-extension-zip] chrome-extension/ is empty — skipping');
    return;
  }

  const zip = new JSZip();
  for (const { abs, rel } of files) {
    const buf = await fs.readFile(abs);
    zip.file(rel, buf);
  }

  await fs.mkdir(path.dirname(OUT_PATH), { recursive: true });
  const blob = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });
  await fs.writeFile(OUT_PATH, blob);
  const kb = (blob.length / 1024).toFixed(1);
  console.log(`[build-extension-zip] wrote ${OUT_PATH} (${files.length} files, ${kb} KB)`);
}

main().catch((err) => {
  console.error('[build-extension-zip] failed:', err);
  process.exit(1);
});
