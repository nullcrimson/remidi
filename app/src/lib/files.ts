import type { RemapReport } from './midiremap';

export const MID_EXT = /\.midi?$/i;

export const isMid = (name: string) => MID_EXT.test(name);

export interface LoadedFile {
  bytes: Uint8Array;
  name: string;
}

export async function loadFiles(files: File[]): Promise<LoadedFile[]> {
  return Promise.all(
    files.map(async (f) => ({ bytes: new Uint8Array(await f.arrayBuffer()), name: f.name })),
  );
}

export interface FileResult {
  name: string;
  url: string;
  bytes: Uint8Array;
  report: RemapReport;
}

export interface FileFailure {
  name: string;
  error: string;
}
