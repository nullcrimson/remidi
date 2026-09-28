# midiremap — web app

Client-side React app for remapping drum MIDI between sample engines. All
conversion runs in the `midiremap-wasm` module compiled from the Rust core; there
is no backend.

## Prerequisites

- Node 20.19+ (CI uses the version in the root `.nvmrc`)
- Rust: rustup installs the version pinned in the root `rust-toolchain.toml`, wasm target
  included
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
- `src/lib/missing.ts` — the missing-drums setting (Nearest / Drop) and its hint.
- `src/lib/session.ts` — the setup a reload brings back (engines, settings, unsaved edits).
- `src/lib/mappings.ts`, `presetFile.ts`, `presetImport.ts` — stored presets (versioned,
  quarantine), `.drumverter.json` export and import.
- `src/hooks/useRemapper.ts` — screen state (Convert + Edit).
- `src/components/*` — FileChips/CardDropzone, LibraryList, OctaveToggle, ChannelSelect,
  MissingDrumsSetting, SummaryRow, ConvertButton, DonePanel, ReportModal (Convert); EditView, VoiceRow,
  NotePicker, SourceEditor, PianoKeyboard (Edit). Shared primitives: `styles.ts`, Button,
  TextButton, IconButton, ChipRadioGroup, ChipSelect, TextField, MonoLabel, ProseLink.
  Frame: SiteHeader (brand + Converter · Note maps · FAQ), SiteFooter (section links that
  open modals, rendered by ContentBlocks from `src/content/pages.json`, the same source
  the static site pages use).

## Views

- **Convert**: drop `.mid` files, pick From/To engines (⇄ swaps), set octave naming,
  drum channel and missing drums (Nearest plays a drum the target lacks on the closest
  one, Drop leaves it out; remembered in the browser), convert. A single file downloads
  straight away; a batch offers a zip. A reload brings back the engines, settings and
  unsaved note edits. Presets can be exported (⋯ → Export) and imported by dropping or
  picking a `.drumverter.json` file. The report groups dropped / approximated /
  unrecognized / unchanged notes with links to fix each one; after a conversion that
  moved drums to another drum, "Drop missing drums & convert again" re-runs it with Drop.
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
