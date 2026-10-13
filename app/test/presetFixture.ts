import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** The preset file the core, the CLI and the wasm crate test against too. */
export const PRESET_FIXTURE = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'midiremap-core', 'tests', 'golden', 'my-kit.drumverter.json'),
  'utf8',
);
