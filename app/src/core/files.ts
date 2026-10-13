import type { Message } from '../generated/i18n';
import type { Report } from './midiremap';

const MID_EXTENSIONS = ['.mid', '.midi'];
const PRESET_EXTENSIONS = ['.json'];

/** The value of a file input's `accept`: every extension `splitFiles` takes in. */
export const ACCEPT_EXTENSIONS = [...MID_EXTENSIONS, ...PRESET_EXTENSIONS].join(',');

const extensionOf = (name: string, extensions: string[]) =>
  extensions.find((ext) => name.toLowerCase().endsWith(ext));

const isMid = (name: string) => extensionOf(name, MID_EXTENSIONS) !== undefined;

const isPreset = (name: string) => extensionOf(name, PRESET_EXTENSIONS) !== undefined;

/** A MIDI file's name without its `.mid` or `.midi`. */
export function withoutMidExtension(name: string): string {
  const ext = extensionOf(name, MID_EXTENSIONS);
  return ext === undefined ? name : name.slice(0, -ext.length);
}

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

/** The names of the files the browser could not read, MIDI files and preset files apart. */
export interface UnreadableFiles {
  mid: string[];
  presets: string[];
}

/**
 * Receives what was picked or dropped: MIDI files, names skipped for their type, preset
 * files, and the files the browser could not read.
 */
export type OnFiles = (
  files: LoadedFile[],
  skipped: string[],
  presets?: PresetText[],
  unreadable?: UnreadableFiles,
) => void;

async function readEach<T>(files: File[], read: (f: File) => Promise<T>): Promise<{ read: T[]; failed: string[] }> {
  const settled = await Promise.allSettled(files.map(read));
  return {
    read: settled.flatMap((r) => (r.status === 'fulfilled' ? [r.value] : [])),
    failed: files.filter((_, i) => settled[i].status === 'rejected').map((f) => f.name),
  };
}

/** The notice for files the browser could not read. */
export function unreadableNotice(names: string[]): Message {
  return { id: 'files-unreadable', args: { names: names.join(', '), count: names.length } };
}

/** Reads picked or dropped files and hands MIDI and preset files to `onFiles`. */
export async function takeFiles(list: File[], onFiles: OnFiles): Promise<void> {
  const { mid, presets, skipped } = splitFiles(list);
  if (!mid.length && !presets.length && !skipped.length) return;
  const [loaded, texts] = await Promise.all([
    readEach(mid, async (f): Promise<LoadedFile> => ({ bytes: new Uint8Array(await f.arrayBuffer()), name: f.name })),
    readEach(presets, async (f): Promise<PresetText> => ({ name: f.name, text: await f.text() })),
  ]);
  onFiles(loaded.read, skipped, texts.read, { mid: loaded.failed, presets: texts.failed });
}

export interface LoadedFile {
  bytes: Uint8Array;
  name: string;
}

export interface FileResult {
  name: string;
  url: string;
  bytes: Uint8Array;
  report: Report;
}
