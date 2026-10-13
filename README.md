# Drumverter

Convert drum MIDI between sample-engine note layouts — GetGood Drums, EZdrummer,
Superior Drummer 3, Addictive Drums 2, General MIDI, Guitar Pro and 80+ others.

**Use it at [drumverter.com](https://drumverter.com).** It runs in your browser; files
are never uploaded.

![Drumverter converter](docs/screenshot.png)

- Every note goes through a shared drum vocabulary, so any engine converts to any other.
- A drum the target lacks is played on the nearest one it has (a China on a crash), or
  left out if you choose **Drop**; a rimshot or flam still falls back to a plain hit on
  the same drum.
- Hover the dotted counts to see what happens to every drum before converting; each
  conversion comes with a report of approximated, dropped and unrecognized notes, with
  links to fix them in the note editor.
- Edits can be saved as presets. Presets stay in your browser; export one (`.json`) and
  drop it on the page to use it elsewhere.
- Batch conversion, drum-channel selection, 11 languages, and a command-line tool for
  offline use.

## Workspace

| Path | What it is |
|---|---|
| `midiremap-core` | Pure Rust engine: canonical drums, fallback chains, MIDI rewrite, loss report |
| `midiremap-cli` | Offline `convert` / `list` command |
| `midiremap-wasm` | Browser bindings used by the app |
| `midiremap-site` | Static pages: per-engine note maps, pair tables, FAQ and guide |
| `midiremap-testkit` | Test helpers that build and read small MIDI files |
| `app/` | Vite + React + TypeScript converter UI |
| `engines/*.toml` | One note map per engine, embedded at build time |
| `locales/` | The locale list and one Fluent message file per language, shared by the app and the site |

[ARCHITECTURE.md](ARCHITECTURE.md) explains the design; [app/README.md](app/README.md)
covers the UI.

## Build and test

Requirements: rustup (it installs the Rust version pinned in `rust-toolchain.toml`,
wasm target included), the nightly named in `nightly-toolchain` for `rustfmt`, Node 22.18+
(`.nvmrc`), and `wasm-bindgen-cli` at the version in `Cargo.lock`.

```bash
cargo +"$(cat nightly-toolchain)" fmt --all
cargo clippy --workspace --all-targets -- -D warnings
cargo test --workspace

cd app
npm ci
npm run dev          # builds the wasm module, then starts Vite
npm run lint
npm test
npm run build:site   # app + static pages into app/dist
npx playwright install chromium   # once
npm run e2e          # browser tests of every user story against app/dist, desktop and phone
npm run size         # size budgets for app/dist/assets

cd ..
bash scripts/gate.sh # every check in one run; logs in target/gate/
bash scripts/gate.sh rust        # or one group (rust, app, site) or single checks (fmt, vitest, ...)
```

Every push to `master` and every pull request runs the same `scripts/gate.sh` checks in CI;
a push deploys only when all pass. A separate workflow audits dependencies, and a daily job
fuzzes the converter (see ARCHITECTURE.md).

## Command line

```bash
cargo run -p midiremap-cli -- list
cargo run -p midiremap-cli -- convert in.mid ggd_invasion ezdrummer out.mid \
    [--channel auto|all|1-16] [--missing nearest|drop] \
    [--preset my-kit-drumverter.json | --overrides edits.json] [--user-map map.json]
```

`--preset` applies a preset exported from the app (⋯ → Export); `--overrides` takes raw
note edits instead; `--user-map` adds your own engine map (JSON), also for `list`. The
loss report is printed to stderr as JSON (`unmappedSource`, `fallbackUsed`, `dropped`,
`untouched`, `converted`); the exit code is 0 whenever the file was written, so read the
report to see what was lost.

## Adding an engine

Drop a `.toml` note map into `engines/` (see any existing file for the format) and run
the tests; the catalog tests check it, and it ships with the next build.

## Licence

[MIT](LICENSE). Engine and product names are trademarks of their respective owners;
Drumverter is not affiliated with them.
