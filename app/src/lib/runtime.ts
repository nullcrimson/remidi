import { createConverter, type Converter } from './converter';
import { moduleLoader, type LoadMidiremap } from './midiremap';

/** What the app is handed from outside React: the converter module and the batch converter. */
export interface Runtime {
  load: LoadMidiremap;
  converter: Converter;
}

/** The runtime of a browser page: the WASM module, loaded once, and a converter on a Web Worker. */
export function browserRuntime(): Runtime {
  const load = moduleLoader();
  return { load, converter: createConverter(load) };
}
