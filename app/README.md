# midiremap — web app

Client-side React app for remapping drum MIDI between sample engines. All
conversion runs in the `midiremap-wasm` module compiled from the Rust core; there
is no backend.

## Prerequisites

- Node 22.18+ (the size and IndexNow scripts are TypeScript run by Node; CI uses the version in the root `.nvmrc`)
- Rust: rustup installs the version pinned in the root `rust-toolchain.toml`, wasm target
  included
- `wasm-bindgen-cli` at the `wasm-bindgen` version in the root `Cargo.lock` (0.2.126 today):
  `cargo install wasm-bindgen-cli --version 0.2.126`

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
npm run size     # size budgets for dist (wasm, JS, CSS gzipped; latin fonts; largest locale chunk; a static page's script)
cargo xtask gate      # every check; each step starts when what it needs is done (logs and timings.json in target/gate/)
cargo xtask gate app  # one group (rust; app = eslint, tsc, vitest; dist = size, e2e) or single steps; CI runs the same groups
cargo xtask gate --quick  # local only: vitest --changed, changed e2e files on desktop (builds only then), wasm with thin LTO, no size
```

Outside CI the unit tests use half the machine's cores and the browser tests a quarter
(`maxWorkers` in `vite.config.ts`, `workers` in `playwright.config.ts`). Measured on 16 cores
with other programs running: the defaults (15 and 8 workers) were slower and let single tests
stall past their time limits; 8 and 4 were faster and kept every test well inside them.
`cargo xtask gate` runs the app's steps as their `npm run` scripts without the pre-hooks, adding
only its own flags. Beside everything else it runs, it gives the unit tests every core
(`VITEST_WORKERS=100%`) and the browser tests three quarters (`E2E_WORKERS=75%`): at every core
three page loads ran past their 30 s limit and the run took 173 s, against 148 s at half
(2026-10-19). Run directly, the configs keep the limits above. The static pages'
layout checks run all on the phone (tagged `@phone`, which the desktop project leaves out) and
one per locale on the desktop, which keeps their header and nav covered there.

`build:wasm` skips wasm-bindgen and wasm-opt when the compiled module, the tool versions and
the script are unchanged (`src/wasm/.stamp`). `build:site` runs the site generator as a
debug build; CI builds it in release.

`npm run gen:i18n` writes `src/generated/` (message, locale and section types, and
`lang.css`) from `../locales/` and `../content/structure.json`. It runs before `dev`,
`build`, `test`, `lint` and `typecheck`; run it by hand after editing a `.ftl` file while
the dev server is up. The folder is not committed.

`npm run build` also writes `dist/site.json` (the stylesheet, the content security policy, the
analytics scripts and the static pages' locale script, `src/locale/staticPagesEntry.ts`, built as a second
entry beside `index.html`); the site generator reads it, so run the app build before the
generator.

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
- `src/core/midiremap.ts` — the only module that imports the WASM. `moduleLoader()` makes
  a loader that resolves to a `Midiremap` carrying the calls (`engines()`, `engineDrums()`,
  `engineNotes()`, `canonCatalog()`, `familyOrder()`, `parsePresetFile()`, `plan()`,
  `remap()`); its types are generated from Rust, and module errors become
  `WasmCallError`.
- `test/stubs/wasm.ts` — the WASM stand-in every test runs on (Vitest aliases `@wasm` to
  it); each export is a mock typed as the real one, reset before every test, so a test
  changes the module's answer with `vi.mocked(stub.plan).mockReturnValue(...)` and cannot
  return what the real module could not. No test replaces `core/midiremap` or
  `convert/converter`. `test/wasm.contract.test.ts` loads the real module and checks its
  shapes and errors, and that the stub returns the same fields and real drum keys.
- Tests run as two Vitest projects (`vite.config.ts`): `*.test.tsx` and `*.dom.test.ts` get
  a jsdom page and `test/setup.dom.ts`; every other `*.test.ts` runs in plain Node, which
  starts faster. A test of code that reads `document` or `window` and has no JSX is named
  `*.dom.test.ts`; in Node it fails on the missing global.
- The `App.stats.*` tests check the analytics events, one test per event and trigger: `fakeUmami()` in `test/umami.ts` installs a fake `window.umami` and returns its `track`, and each test checks `toHaveBeenCalledWith(name, props)`; `test/eventSteps.tsx` holds the app steps they share. `test/siteEvents.test.ts` checks that the events the templates and static scripts name are in the event map, and `test/siteFilter.dom.test.ts` runs `midiremap-site/static/filter.js` over a fixture (a fresh module per test, through `vi.resetModules()`). `converted`, `file-failed` and `convert-failed` are sent by `run` in `convert/useRemapper.ts` (tested in `test/convert/useRemapper.stats.test.tsx` and `App.stats.convert`); `load-failed` with kind `locale` is sent by `main.tsx` and covered by `e2e/locale.spec.ts`.
- `src/` is foldered by feature, and `test/` mirrors it (shared helpers stay at the top of
  `test/`). Imports point one way, from `convert` on top down through `editor`, the other
  features, `ui` and `locale` to `core`; no two folders import each other. The table
  `ALLOWED_IMPORTS` in `test/structure.test.ts` holds which folder may import which, and a
  test there fails on any import outside it.
- `src/core/` — what every feature shares and that is not UI: `midiremap.ts` (the WASM
  boundary), `errors.ts` (`AppError`, `toAppError`, `errorMessage`, `errorDetail`: the one
  conversion from anything caught to what the UI is told), `notes.ts` (note-name / octave
  helpers, octave base is display-only, over `src/wasm/note_naming.json`, the table the wasm
  build writes from the core), `canon.ts` (the module's drum `Vocabulary` by key, and
  `byCanon`), `enginePair.ts` (`EnginePair`, both engines of a conversion, `pairOf`, and `EngineNames` with `namesOf`), `drums.ts` (`drumLabels`: the target's drum names by note, and by canon for a stand-in), `outcome.ts` (what a plan row does: `playedNote`, `isPlayed`, `leadNote`, `playedOn`),
  `overrides.ts` (target and source edits → the `Overrides` the WASM takes; `StoredEdits` is
  what presets and the session carry, drum keys as unchecked text; `knownEdits` is the one
  function that turns them into `KnownEdits`, leaving out drums this version does not know (the editor loads nothing else);
  `parseEdits`, `parseSrcEdits` and `sameEdits` read and compare them), `missing.ts` (the
  missing-drums setting, Nearest / Drop, and its hint), `channel.ts`, `files.ts` (the accepted extensions, once: `ACCEPT_EXTENSIONS`, `splitFiles`, `withoutMidExtension`),
  `selection.ts` (`SelectionEvent`, handed to each reducer), `notice.ts`, `download.ts` (`saveBlob`: save a file made in memory, free its address after ten seconds),
  `umami.ts` (the 37 analytics events, each with its exact properties, and `send`, the typed call into Umami: the only code that reads `window.umami`; the static pages' script uses it alone) and `stats.ts` (`track`, the app's call, accepting the events of `AppEvent` only: it sends one only when its tier is on, `ENABLED_TIERS`; the four events only static pages send, `StaticOnlyEvent`, have no tier), `storage.ts` (the only module that touches `localStorage`: the closed `StorageKey` set, `storedName` which
  puts `midiremap:` in front of it, and `readStored`, `readStoredStrict` (blocked or `{ value }`), `writeStored`, `removeStored`, `clearStored`, `onStoredChange` (the one `storage` event subscription); eslint
  rejects `localStorage` anywhere else in `src`), `contact.ts` (the issue and contact addresses), `engineCode.ts`
  (the three-letter badge of an engine id).
- `src/convert/` — the converter screen: `useRemapper.ts` (screen state, Convert + Edit, the `View`: the editor's pair and arguments, only ever on show with both engines chosen; every
  selection change is one `SelectionEvent`), `runtime.ts` (`Runtime { load, converter }`, made
  once in `main.tsx` and handed to `App`; tests hand in `test/runtime.ts`), `converter.ts`,
  `convertWorker.ts`, `batch.ts` (conversion in a module Web Worker with its own WASM instance;
  a worker that dies after answering is replaced, one that cannot start or dies before
  answering leaves conversion to the main thread, a batch is stopped through its
  `AbortSignal`), `useConverter.ts` (its `Conv` `done` arm carries the pair it converted with), `useFileIntake.ts`, `useDropGuard.ts`, `session.ts` (the setup a reload brings back: engines, settings, unsaved
  edits; `EMPTY_SESSION` states the starting settings), `preselect.ts` (the engines a link names), `planBreakdown.ts`
  (the groups behind the "N of M drums remapped" pop-up), and FileChips/CardDropzone,
  OctaveToggle, ChannelSelect, MissingDrumsSetting, ConvertSettings, PlanControls, SummaryRow,
  ConvertButton (FollowTip: the reason beside the mouse), DonePanel, InfoPopover (the
  hover/click breakdowns).
- `src/editor/` — the note editor: EditView (with EditFilters, FamilyRows, EditFooter,
  SavePreset, PlanErrorNotice, `rowGrid.ts`), VoiceRow, NotePicker, SourceEditor, PianoKeyboard, PickerShell, PickerHeader (a picker's title line; CanonPicker uses it bare, the note pickers add the note name as its child), KeyboardPane (the octave tabs over the piano, shared by both note pickers)
  (+ `overlayAnchor`, on Floating UI), `useEditor.ts`, `editorState.ts` (the reducer: edits and one `overlay`, a target pick, a source pick or a notice),
  `useEngineData.ts` (the pair's drums, notes, vocabulary and family order; a failed lookup is its `error`), `families.ts`
  (`groupByFamily`: groups drums and plan rows, which carry their canon's `family`, in the core's family order, keeping any family it does not
  list), `editSummary.ts` and `useEditedSummary.ts` (the summary row's "edited" chip: which
  drums differ from the default mapping, their preview lines, and whether they match the open
  preset), `editorTally.ts` (what one editing session did, for the `editor-closed` event: picks on the piano and in the drum list, filter use, row resets), `useEditorHistory.ts` (opening the editor adds a history entry, so the browser's
  Back closes it instead of leaving the converter; a Forward onto it without both engines steps back).
- `src/engines/` — LibraryList, EngineColumns, `useEngineCatalog.ts`, `useFavorites.ts`.
- `src/presets/` — stored presets: `mappings.ts` (`PresetName`, generated from Rust, and its one parser `parsePresetName`: not blank, spacing kept, the UI trims typed text first; `uniqueName`; versioned; unreadable entries, a blank name among them, and an unreadable quarantine are kept in `midiremap:quarantine`, written, never read), `presetFile.ts`
  (`<name>-drumverter.json` export), `presetImport.ts` (any `.json` file imports),
  `useSavedMappings.ts` (its `unsaved` flag is drawn by `UnsavedNotice` in the convert view and the editor footer), `usePresetActions.ts`, SavedMappingChip(s).
- `src/report/` — ReportModal, ContactFooter, `report.ts` (one entry type per group: `DroppedEntry`, `ApproximatedEntry`, `UnrecognizedEntry`; `entryText`, a line as shown and the key that merges files), `useConversionReport.ts`,
  `reportLink.ts` (the "Wrong mapping? Report it" form link, told the engines and language).
- `src/tip/` — TipToast (pinned to the top) and `tipAsk.ts` (from the third saved file, at
  most once a day, paused 90 days after a tip).
- `src/locale/` — `i18n.ts` (`Translator`), `docs.ts` (the documents of a locale, `EN_DOCS`,
  `sectionBlocks`), `locale.ts` (the page's locale: read from the address, stored, put on
  `<html lang>`; `localePath`, `converterPath`), `localeContext.ts` (`useT()`),
  LocaleProvider, `languageChoice.ts`, `language.ts`, `detect.ts`, `startLocale.ts`, and the static pages' script, `staticPages.ts` with its entry
  `staticPagesEntry.ts`. Every text
  comes from `../locales/<code>/app.ftl` through `useT()`; the static pages' own messages sit
  in `site.ftl`, which the app never loads.
- `src/site/` — page chrome and addresses: `site.ts` (`href`, `localHref`, `targetLabel`), PageFrame (Page, Card), SiteHeader (brand + Converter · How
  to use · Note maps · FAQ), SiteFooter (section links that open modals, rendered by
  ContentBlocks from `../locales/<code>/docs.json`, the same source the static site pages
  use), LanguageMenu, GlobeIcon, ErrorBoundary, and `plainClick.ts`.
- `src/ui/` — shared presentational pieces: `styles.ts` (with `LabelTone`, `TagTone`, `TextTone`, `rowState`: the look of a pickable list row, its left rule included; `tip()` and `TIP_MAX_WIDTH_CLASS`: the small dark tip of FollowTip and the truncation tooltip), `useDialog.ts` (the open-dialog plumbing of Modal and PickerShell: it returns the `focus` and `panel` prop groups to spread), Button, TextButton, IconButton,
  ChipRadioGroup, ChipSelect, TextField, MonoLabel, ProseLink, Modal, Tooltip, Rich, ErrorText,
  `errorTitle.ts` (`errorParts`, `errorTitle`: an `AppError` as shown text), StatusNotice, FilterInput, and `useFocusIntent.ts` (moves focus after an
  action, `ref` / `request`), `useFilter.ts`, `useTruncationTooltip.tsx`, `reveal.ts`.

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
  target drum each row lands on (≈ when approximated, then the stand-in drum the converter
  chose, and after an arrow the stock drum on its note when a target edit moved it there).

## Keyboard

- Each engine picker is one Tab stop: type to filter, ↑/↓ (PgUp/PgDn) to move, Enter to pick,
  Ctrl/⌘+Enter to add or remove a favourite, Escape to clear the filter.
- Focus follows the task: after adding files it moves to the next missing step, after
  converting to the result, and back to where you were after leaving the editor or a menu.

## Engine catalog

The From/To lists are populated from `engine_catalog()` in the wasm module, which
covers every preset in the root `engines/*.toml` (87 today) — GetGood Drums kits,
Toontrack EZdrummer 3 / Superior Drummer 3, Addictive Drums 2, BFD3, General MIDI,
Guitar Pro, and more. The files are embedded in `midiremap-core` at build time; adding
one needs no code change.
