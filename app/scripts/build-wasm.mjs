import { execSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const app = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const root = resolve(app, '..');
const run = (cmd, cwd = root) => execSync(cmd, { cwd, stdio: 'inherit' });

const WASM_FEATURES = [
  'bulk-memory',
  'mutable-globals',
  'nontrapping-float-to-int',
  'sign-ext',
].map((f) => `--enable-${f}`).join(' ');

run('cargo build -p midiremap-wasm --target wasm32-unknown-unknown --profile wasm --locked');
run(
  'wasm-bindgen target/wasm32-unknown-unknown/wasm/midiremap_wasm.wasm --out-dir app/src/wasm --target web',
);
run(
  `npx --no-install wasm-opt -Oz ${WASM_FEATURES} src/wasm/midiremap_wasm_bg.wasm -o src/wasm/midiremap_wasm_bg.wasm`,
  app,
);
run(
  'npx --no-install tsc --ignoreConfig --noEmit --strict --lib es2022,dom --types node src/wasm/midiremap_wasm.d.ts',
  app,
);
console.log('Generated and type-checked app/src/wasm');
