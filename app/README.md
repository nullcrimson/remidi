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
- `src/components/*` — FileChips/CardDropzone, LibraryList, OctaveToggle, ChannelSelect,
  SummaryRow, ConvertButton, DonePanel, ReportModal (Convert); EditView, VoiceRow,
  NotePicker, SourceEditor, PianoKeyboard (Edit). Shared primitives: `styles.ts`, Button,
  TextButton, IconButton, ChipRadioGroup, ChipSelect, TextField, MonoLabel, ProseLink.
  Frame: SiteHeader (brand + Converter · Note maps · FAQ), SiteFooter (section links that
  open modals, rendered by ContentBlocks from `src/content/pages.json`, the same source
  the static site pages use).

## Views

- **Convert**: drop `.mid` files, pick From/To engines (⇄ swaps), set octave naming and
  drum channel, convert. A single file downloads straight away; a batch offers a zip.
  The report groups dropped / approximated / unrecognized / unchanged notes with links to
  fix each one.
- **Edit notes**: drums grouped by family with a filter and All / Changed / Issues chips;
  each row shows source → target and the result (direct, approx, dropped, edited) and can
  be reset. Target and source notes are picked from the drum list or an octave-tabbed
  piano (a bottom sheet on phones); Advanced reassigns raw source notes. A sticky footer
  holds the change count, Reset all, Save as preset and Done. A Plays column names the
  target drum each row lands on (≈ when approximated).

## Keyboard

- Each engine picker is one Tab stop: type to filter, ↑/↓ (PgUp/PgDn) to move, Enter to pick,
  Ctrl/⌘+Enter to add or remove a favourite, Escape to clear the filter.
- Focus follows the task: after adding files it moves to the next missing step, after
  converting to the result, and back to where you were after leaving the editor or a menu.

## Engine catalog

The From/To lists are populated from `engine_catalog()` in the wasm module, which
covers **all ~50 (currently 87) drum presets** imported from `mapping.js` — GetGood
Drums kits, Toontrack EZdrummer 3 / Superior Drummer 3, Addictive Drums 2, BFD3,
General MIDI, Guitar Pro, and more. Those presets are generated into `engines/*.toml`
and embedded in `midiremap-core`; see `tools/README.md` for the regeneration flow.
