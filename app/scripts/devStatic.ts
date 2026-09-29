import { existsSync, statSync } from 'node:fs';
import { join, normalize, sep } from 'node:path';

const BUILT_ONLY = /^\/(assets\/.+|[\w-]+\.(js|xml|txt))$/;

/**
 * The file in `dist` a dev-server request should get: a generated static page (a path
 * ending in `/` that is not one of the converter `shells`), or an asset only the build has.
 * Everything else, the converter shells included, is left to Vite.
 */
export function builtFile(dist: string, url: string, shells: readonly string[]): string | undefined {
  const path = decodeURIComponent(new URL(url, 'http://dev').pathname);
  const page = path.endsWith('/') && !shells.includes(path);
  if (!page && !BUILT_ONLY.test(path)) return undefined;
  const root = normalize(dist) + sep;
  const file = normalize(join(dist, page ? `${path}index.html` : path));
  if (!file.startsWith(root)) return undefined;
  return existsSync(file) && statSync(file).isFile() ? file : undefined;
}
