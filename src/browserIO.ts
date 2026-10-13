export function downloadFile(content: Blob | string, filename: string, type = 'text/plain'): void {
  const blob = typeof content === 'string' ? new Blob([content], { type }) : content;
  const url = URL.createObjectURL(blob),
    a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Delay release until the browser has picked up the download.
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function copyText(text: string): Promise<void> {
  if (!navigator.clipboard?.writeText)
    throw new Error('Clipboard is unavailable. Select and copy the text in the export panel.');
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    throw new Error('Clipboard permission denied. Select and copy the text in the export panel.');
  }
}
