export async function renderPdfFirstPageToDataUrl(
  pdfUrl: string,
  options?: { scale?: number; quality?: number }
): Promise<string> {
  const scale = options?.scale ?? 1.25;
  const quality = options?.quality ?? 0.9;

  // pdfjs-dist ships multiple builds; the .mjs build works well with Vite.
  // We keep this dynamic to avoid loading pdfjs for non-PDF candidates.
  const pdfjs: any = await import('pdfjs-dist/build/pdf.mjs');

  // Configure worker (Vite will bundle this asset).
  try {
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.mjs',
      import.meta.url
    ).toString();
  } catch {
    // If worker config fails, pdf.js will attempt a fallback.
  }

  const loadingTask = pdfjs.getDocument({ url: pdfUrl });
  const pdf = await loadingTask.promise;
  const page = await pdf.getPage(1);

  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Failed to get canvas 2D context');
  }

  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);

  await page.render({ canvasContext: context, viewport }).promise;

  // Try to release resources
  try {
    page.cleanup();
    pdf.cleanup();
    loadingTask.destroy();
  } catch {
    // ignore
  }

  return canvas.toDataURL('image/jpeg', quality);
}
