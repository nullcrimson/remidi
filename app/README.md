# midiremap — web app

Client-side React app for remapping drum MIDI between sample engines. All
conversion runs in the `midiremap-wasm` module compiled from the Rust core; there
is no backend.

## Prerequisites

- Node 22.18+ (the size and IndexNow scripts are TypeScript run by Node; CI uses the version in the root `.nvmrc`)
- Rust: rustup installs the version pinned in the root `rust-toolchain.toml`, wasm target
  included
- `cargo install wasm-bindgen-cli --version 0.2.126`

## Develop

```bash
cd app
npm install
npm run dev      # runs gen:i18n and build:wasm first, then Vite dev server
```

Open the printed `http://localhost:5173` URL.

## Build

```bash
npm run build    # gen:i18n, build:wasm, tsc --noEmit, vite build -> app/dist
```

Deploy the static contents of `app/dist/` to any static host.

## Test

```bash
npm run test     # Vitest; needs npm run build:wasm once (the contract test loads the real module)
npm run e2e      # Playwright against vite preview of dist; run npm run build:site first
npm run size     # size budgets for dist/assets (wasm, JS, CSS gzipped; latin fonts; largest locale chunk)
```

`npm run gen:i18n` writes `src/generated/` (message, locale and section types, and
`lang.css`) from `../locales/` and `src/content/structure.json`. It runs before `dev`,
`build`, `test`, `lint` and `typecheck`; run it by hand after editing a `.ftl` file while
the dev server is up. The folder is not committed.

Each non-English locale's messages and documents build into lazy `assets/locale-*.js`
chunks (`locale-<code>-messages-*.js`, `locale-<code>-docs-*.js`) that English visitors never load. After `npm run build:site`, `/pl/` serves the
Polish converter in `vite preview`; the dev server serves the app at `/pl/` too, and the
note-map and document pages from the last `npm run build:site` in `dist/`.

`e2e/layout.spec.ts` checks every locale, and a pseudo-locale served in place of the Polish messages, for sideways scrolling and cut-off text on desktop and phone.

`e2e/` holds the browser tests (Chromium desktop and Pixel 7), one or more per user
story, all through the real WASM with downloaded files read back: adding, dropping and
removing files; picking, swapping and starring engines; the drum channel, octave and
missing-drums settings; the note editor (targets, filters, search, reset, Advanced source
notes, Back); presets (save, update, rename, duplicate, delete, export, import into a
fresh browser); the breakdown pop-ups and the edited chip; single and zip downloads, the
report and its fixes; what a reload brings back; the note-map pages' converter links; the
footer dialogs; keyboard walk and focus; tap sizes; languages; and the crawler heading.
`e2e/fixtures.ts` writes the MIDI files with `midi-file` and fails any test whose page
logs an error or reaches another origin; `e2e/steps.ts` holds the shared steps, which tap
on a phone and click elsewhere.

## How it works

- `scripts/build-wasm.mjs` — builds the wasm crate and runs `wasm-bindgen --target web`
  into `src/wasm/` (gitignored), then type-checks the generated `.d.ts` on its own
  (the app's `tsconfig` skips library checks, which would hide a broken reference).
  Node (not bash) so `cargo`/`wasm-bindgen` resolve from PATH on Windows too.
- `src/lib/midiremap.ts` — typed wrapper: `ready()`, `engines()`, `plan()`, `remap()`;
  its types are generated from Rust, and module errors become `WasmCallError`.
- `test/stubs/wasm.ts` — the WASM stand-in for component tests; each export is typed
  as the real one. `test/wasm.contract.test.ts` loads the real module and checks its
  shapes and errors, and that the stub returns the same fields and real drum keys.
- `src/lib/notes.ts` — note-name / octave helpers (octave base is display-only); the
  contract test checks the names against the core's.
- `src/lib/families.ts` — `groupByFamily`: groups drums in the core's family order
  (`editor.families`), keeping any family it does not list.
- `src/lib/overrides.ts` — per-voice target edits → overrides doc.
- `src/lib/missing.ts` — the missing-drums setting (Nearest / Drop) and its hint.
- `src/lib/editSummary.ts` — the summary row's "edited" chip: which drums differ from the
  default mapping, their preview lines, and whether they match the open preset.
- `src/lib/session.ts` — the setup a reload brings back (engines, settings, unsaved edits).
- `src/lib/mappings.ts`, `presetFile.ts`, `presetImport.ts` — stored presets (versioned,
  quarantine), `<name>-drumverter.json` export and import (any `.json` file imports).
- `src/lib/planBreakdown.ts` — the groups behind the "N of M drums remapped" pop-up
  (new note, same note, close variant, another drum, left out, not in the source).
- `src/lib/reportLink.ts` — the "Wrong mapping? Report it" form link, told the engines
  and language.
- `src/hooks/useRemapper.ts` — screen state (Convert + Edit); every selection change is
  one `SelectionEvent` (`src/lib/selection.ts`) handed to each reducer.
- `src/lib/editorState.ts` — the note editor's reducer; `src/hooks/useEngineData.ts` — the
  pair's drums, notes, vocabulary and family order.
- `src/hooks/usePresetActions.ts`, `useFileIntake.ts`, `useConversionReport.ts` — preset
  payloads, dropped files and presets, the report.
- `src/hooks/useFocusIntent.ts` — moves focus after an action (`ref` / `request`).
- `src/hooks/useEditorHistory.ts` — opening the note editor adds a history entry, so the
  browser's Back closes it instead of leaving the converter.
- `src/components/*` — FileChips/CardDropzone, LibraryList, OctaveToggle, ChannelSelect,
  MissingDrumsSetting, ConvertSettings, PlanControls, EngineColumns, SummaryRow,
  ConvertButton (FollowTip: the reason beside the mouse), DonePanel, TipCard,
  ReportModal (Convert); InfoPopover (the hover/click breakdowns); EditView with `edit/` (EditFilters, FamilyRows, EditFooter,
  SavePreset), VoiceRow, NotePicker, SourceEditor, PianoKeyboard (Edit). Page chrome:
  PageFrame (Page, Card). Overlays: Modal, PickerShell (+ `overlayAnchor`), on Floating UI. Shared primitives: `styles.ts`, Button,
  TextButton, IconButton, ChipRadioGroup, ChipSelect, TextField, MonoLabel, ProseLink.
  Frame: SiteHeader (brand + Converter · How to use · Note maps · FAQ), SiteFooter (section links that
  open modals, rendered by ContentBlocks from `src/content/docs/<code>.json`, the same
  source the static site pages use) and LanguageMenu. Every text comes from
  `../locales/<code>/app.ftl` through `useT()`, provided by LocaleProvider.

## Views

- **Convert**: drop `.mid` files, pick From/To engines (⇄ swaps), set octave naming,
  drum channel and missing drums (Nearest plays a drum the target lacks on the closest
  one, Drop leaves it out; remembered in the browser), convert. A single file downloads
  straight away; a batch offers a zip. A reload brings back the engines, settings and
  unsaved note edits. Hovering (or tapping) the dotted "N of M drums remapped" and
  missing-drums counts lists what happens to each drum, with a link into the editor; a
  disabled Convert says why beside the mouse. Presets live in the browser; they can be
  exported (⋯ → Export) as `<name>-drumverter.json` and imported by dropping or picking
  the file. The report groups dropped / approximated /
  unrecognized / unchanged notes with links to fix each one; after a conversion that
  moved drums to another drum, "Drop missing drums & convert again" re-runs it with Drop.
- **Edit notes**: drums grouped by family with a filter and All / Changed / Issues chips;
  each row shows source → target and the result (direct, approx, dropped, edited) and can
  be reset. Target and source notes are picked from the drum list or an octave-tabbed
  piano (a bottom sheet on phones); Advanced reassigns raw source notes. A sticky footer
  holds the change count, Reset all, Save as preset and Done; edits apply as you make
  them, and the browser's Back returns to the converter. A Plays column names the
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
