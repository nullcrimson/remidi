import type { RemapReport } from './midiremap';

export const MID_EXT = /\.midi?$/i;

export const isMid = (name: string) => MID_EXT.test(name);

/** Splits picked or dropped files into MIDI files and the names of the rest. */
export function splitMid(files: File[]): { mid: File[]; skipped: string[] } {
  return {
    mid: files.filter((f) => isMid(f.name)),
    skipped: files.filter((f) => !isMid(f.name)).map((f) => f.name),
  };
}

export type OnFiles = (files: LoadedFile[], skipped: string[]) => void;

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
