import type { RemapReport } from './midiremap';

export const MID_EXT = /\.midi?$/i;

export const isMid = (name: string) => MID_EXT.test(name);

const isPreset = (name: string) => /\.json$/i.test(name);

/** Splits picked or dropped files into MIDI files, preset files and the names of the rest. */
export function splitFiles(files: File[]): { mid: File[]; presets: File[]; skipped: string[] } {
  return {
    mid: files.filter((f) => isMid(f.name)),
    presets: files.filter((f) => isPreset(f.name)),
    skipped: files.filter((f) => !isMid(f.name) && !isPreset(f.name)).map((f) => f.name),
  };
}

/** A preset file's name and text, read for import. */
export interface PresetText {
  name: string;
  text: string;
}

export type OnFiles = (files: LoadedFile[], skipped: string[], presets?: PresetText[]) => void;

export async function readPresets(files: File[]): Promise<PresetText[]> {
  return Promise.all(files.map(async (f) => ({ name: f.name, text: await f.text() })));
}

/** Reads picked or dropped files and hands MIDI and preset files to `onFiles`. */
export async function takeFiles(list: File[], onFiles: OnFiles): Promise<void> {
  const { mid, presets, skipped } = splitFiles(list);
  if (!mid.length && !presets.length && !skipped.length) return;
  const [loaded, texts] = await Promise.all([loadFiles(mid), readPresets(presets)]);
  onFiles(loaded, skipped, texts);
}

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
