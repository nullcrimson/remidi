import { zipSync } from 'fflate';

export function zipFiles(entries: { name: string; bytes: Uint8Array }[]): Blob {
  const record: Record<string, Uint8Array> = {};
  for (const e of entries) record[e.name] = e.bytes;
  return new Blob([zipSync(record)], { type: 'application/zip' });
}
