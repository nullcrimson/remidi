/** Hands a finished file to the browser's download manager. */
export function saveFile(url: string, name: string): void {
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
}
