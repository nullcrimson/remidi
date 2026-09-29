const MESSAGES = /[\\/]locales[\\/]([a-z]+)[\\/]app\.ftl/;
const DOCS = /[\\/]content[\\/]docs[\\/]([a-z]+)\.json/;

/** The file name of a locale's lazy chunk, so each language's messages and documents are named for it. */
export function localeChunkName(moduleId: string | null): string | undefined {
  const messages = moduleId?.match(MESSAGES);
  if (messages) return `assets/locale-${messages[1]}-messages-[hash].js`;
  const docs = moduleId?.match(DOCS);
  if (docs) return `assets/locale-${docs[1]}-docs-[hash].js`;
  return undefined;
}
