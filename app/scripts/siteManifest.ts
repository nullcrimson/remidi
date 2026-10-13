/** A third-party `<script defer>` every page loads: its address and its other attributes. */
export interface AnalyticsScript {
  src: string;
  attrs: Readonly<Record<string, string>>;
}

/** The script the static pages load: its address and the chunks it imports, to preload. */
export interface LocaleScript {
  src: string;
  preload: readonly string[];
}

/** What the build writes to `site.json` for the static site generator. */
export interface SiteManifest {
  stylesheet: string;
  contentSecurityPolicy: string;
  analytics: readonly AnalyticsScript[];
  localeScript: LocaleScript;
}

/** The part of an emitted chunk the manifest reads. */
export interface EmittedChunk {
  fileName: string;
  name: string;
  isEntry: boolean;
  imports: readonly string[];
}

/** The page's one stylesheet, by its address; any other count means the build changed shape. */
export function stylesheetOf(files: readonly string[]): string {
  const sheets = files.filter((file) => file.endsWith('.css'));
  const [sheet, ...others] = sheets;
  if (sheet === undefined || others.length > 0) {
    throw new Error(`expected exactly one stylesheet in the bundle, found ${sheets.length}`);
  }
  return `/${sheet}`;
}

/** The entry named `entry` and every chunk it imports statically, directly or through another chunk. */
export function localeScriptOf(chunks: readonly EmittedChunk[], entry: string): LocaleScript {
  const byFile = new Map(chunks.map((chunk) => [chunk.fileName, chunk]));
  const script = chunks.find((chunk) => chunk.isEntry && chunk.name === entry);
  if (script === undefined) throw new Error(`expected an entry chunk named ${entry} in the bundle`);
  const preload: string[] = [];
  const pending = [...script.imports];
  for (let file = pending.shift(); file !== undefined; file = pending.shift()) {
    if (preload.includes(file)) continue;
    const imported = byFile.get(file);
    if (imported === undefined) throw new Error(`expected ${file}, imported by the ${entry} entry, to be an emitted chunk`);
    preload.push(file);
    pending.push(...imported.imports);
  }
  return { src: `/${script.fileName}`, preload: preload.map((file) => `/${file}`) };
}

/** The `site.json` content for a bundle of emitted `files` and `chunks`. */
export function siteManifest(
  files: readonly string[],
  chunks: readonly EmittedChunk[],
  localeEntry: string,
  contentSecurityPolicy: string,
  analytics: readonly AnalyticsScript[],
): SiteManifest {
  return {
    stylesheet: stylesheetOf(files),
    contentSecurityPolicy,
    analytics,
    localeScript: localeScriptOf(chunks, localeEntry),
  };
}
