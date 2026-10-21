import { gzipSync, strToU8 } from 'fflate';
import type { Packing } from './midiremap';

/** The file `text` is saved as, packed the way `packing` says. */
export function packed(packing: Packing, text: string): Blob {
  switch (packing) {
    case 'text': return new Blob([text]);
    case 'gzip': return new Blob([gzipSync(strToU8(text))]);
  }
}
