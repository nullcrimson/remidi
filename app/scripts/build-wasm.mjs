import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(import.meta.url);
const app = resolve(dirname(script), '..');
const root = resolve(app, '..');
const run = (cmd, cwd = root) => execSync(cmd, { cwd, stdio: 'inherit' });
const STAMP = resolve(app, 'src/wasm/.stamp');
const OUTPUTS = ['midiremap_wasm.js', 'midiremap_wasm.d.ts', 'midiremap_wasm_bg.wasm'].map((f) =>
  resolve(app, 'src/wasm', f),
);

const WASM_FEATURES = [
  'bulk-memory',
  'mutable-globals',
  'nontrapping-float-to-int',
  'sign-ext',
].map((f) => `--enable-${f}`).join(' ');

run('cargo build -p midiremap-wasm --target wasm32-unknown-unknown --profile wasm --locked');

const stamp = createHash('sha256')
  .update(readFileSync(resolve(root, 'target/wasm32-unknown-unknown/wasm/midiremap_wasm.wasm')))
  .update(readFileSync(script))
  .update(execSync('wasm-bindgen --version'))
  .update(readFileSync(resolve(app, 'node_modules/binaryen/package.json')))
  .digest('hex');
if (OUTPUTS.every(existsSync) && existsSync(STAMP) && readFileSync(STAMP, 'utf8') === stamp) {
  console.log('app/src/wasm is up to date');
  process.exit(0);
}

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
writeFileSync(STAMP, stamp);
console.log('Generated and type-checked app/src/wasm');
