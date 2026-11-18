import type { LoadedFile } from '../core/files';

/** A file list after an add: the files, the listed names a new file took over, and every name added. */
interface Merged {
  files: LoadedFile[];
  replaced: string[];
  fresh: ReadonlySet<string>;
}

/**
 * `files` with `incoming` added, each incoming name kept once at its first file: a file under a
 * listed name takes the listed file's place, any other is appended. Null when nothing came in.
 */
export function mergedFiles(files: LoadedFile[], incoming: LoadedFile[]): Merged | null {
  const fresh = new Map<string, LoadedFile>();
  for (const f of incoming) if (!fresh.has(f.name)) fresh.set(f.name, f);
  if (fresh.size === 0) return null;
  const listed = new Set(files.map((f) => f.name));
  return {
    files: [...files.map((f) => fresh.get(f.name) ?? f), ...[...fresh.values()].filter((f) => !listed.has(f.name))],
    replaced: files.filter((f) => fresh.has(f.name)).map((f) => f.name),
    fresh: new Set(fresh.keys()),
  };
}
