import { execSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const run = (cmd) => execSync(cmd, { cwd: root, stdio: 'inherit' });

run('cargo build -p midiremap-wasm --target wasm32-unknown-unknown --release');
run(
  'wasm-bindgen target/wasm32-unknown-unknown/release/midiremap_wasm.wasm --out-dir app/src/wasm --target web',
);
console.log('Generated app/src/wasm');
