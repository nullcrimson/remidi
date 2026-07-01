# midiremap — web app

Client-side React app for remapping drum MIDI between sample engines. All
conversion runs in the `midiremap-wasm` module compiled from the Rust core; there
is no backend.

## Prerequisites

- Node 18+
- Rust toolchain with the wasm target: `rustup target add wasm32-unknown-unknown`
- `cargo install wasm-bindgen-cli --version 0.2.126`

## Develop

```bash
cd app
npm install
npm run dev      # runs build:wasm first, then Vite dev server
```

Open the printed `http://localhost:5173` URL.

## Build

```bash
npm run build    # build:wasm, tsc --noEmit, vite build -> app/dist
```

Deploy the static contents of `app/dist/` to any static host.

## Test

```bash
npm run test     # Vitest; WASM is stubbed, no build required
```

## How it works

- `scripts/build-wasm.mjs` — builds the wasm crate and runs `wasm-bindgen --target web`
  into `src/wasm/` (gitignored). Node (not bash) so `cargo`/`wasm-bindgen` resolve
  from PATH on Windows too.
- `src/lib/midiremap.ts` — typed wrapper: `ready()`, `engines()`, `plan()`, `remap()`.
- `src/lib/notes.ts` — note-name / octave helpers (octave base is display-only).
- `src/lib/overrides.ts` — per-voice target edits → overrides doc.
- `src/hooks/useRemapper.ts` — screen state (Convert + Edit).
- `src/components/*` — FileRow/Dropzone, LibraryList, OctaveToggle, SummaryRow,
  ConvertButton (Convert); EditView, VoiceRow, NotePicker, PianoKeyboard (Edit).

## Views

- **Convert**: drop a `.mid`, pick From/To engines, set octave numbering, convert &
  download with a loss report (direct / fallback / dropped).
- **Edit mapping**: per-voice target-note editor via an octave-tabbed piano picker;
  Save returns to Convert. The source note is read-only in v1.

## Engine catalog

The From/To lists are populated from `engine_catalog()` in the wasm module, which
covers **all ~50 (currently 87) drum presets** imported from `mapping.js` — GetGood
Drums kits, Toontrack EZdrummer 3 / Superior Drummer 3, Addictive Drums 2, BFD3,
General MIDI, Guitar Pro, and more. Those presets are generated into `engines/*.toml`
and embedded in `midiremap-core`; see `tools/README.md` for the regeneration flow.
