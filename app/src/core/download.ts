const FREE_URL_AFTER_MS = 10_000;

function clickDownload(url: string, name: string): void {
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
}

/** Hands a file made in memory to the browser's download manager, then frees its address. */
export function saveBlob(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  clickDownload(url, name);
  setTimeout(() => URL.revokeObjectURL(url), FREE_URL_AFTER_MS);
}
