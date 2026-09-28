# Architecture

`midiremap` converts a drum `.mid` written for one sample engine's note layout
(e.g. GetGood Drums Invasion) into another's (EZdrummer, Superior Drummer 3,
Addictive Drums 2, General MIDI, Guitar Pro) without changing the performance —
only the note numbers each hit lands on.

## Core idea: hub and spoke

Engines do not translate to each other directly. Every engine note is decoded to
a shared **canonical drum vocabulary** (`Canon`), and the canon is then encoded to
the target engine's note. This keeps the mapping cost linear: `N` engines need
`N` note tables, not `N²` engine-to-engine tables.

```
source .mid ──decode──▶ Canon ──encode──▶ target .mid
             (source     (hub)   (target
              engine)             engine)
```

When the target engine cannot play a canon directly, a **fallback chain** walks
toward a coarser articulation it can play (e.g. an open hi-hat steps toward a
closed one: `hat.loose → hat.closed → hat.tight`). If the chain is exhausted, the
hit is **dropped** and recorded in a loss report. A source note with no canonical
meaning is **unmapped** and dropped.

The **missing drums** setting (`MissingDrums`) decides how far the chain may reach:
`Nearest` (the default) takes the first entry the target plays, which may be another
drum (a China on a crash, Tom 4 on Tom 3); `Drop` keeps only entries on the same drum
(`Canon::same_drum`: a rimshot still becomes a snare hit), else drops the hit.

## Workspace

Five crates, a web app, and embedded engine presets:

| Component | Role | Depends on |
|-------|------|------------|
| `midiremap-core` | Pure engine. No I/O beyond parsing bytes handed to it. All the logic below. | `midly`, `serde`, `serde_json`, `thiserror` (`toml` at build time only) |
| `midiremap-cli` | Offline `convert` / `list` binary. | core, `clap`, `anyhow` |
| `midiremap-wasm` | Browser bindings for the web app. | core (feature `ts`), `wasm-bindgen`, `tsify` |
| `app/` | Vite + React + TypeScript converter UI over the WASM bindings. | Vite, React, Tailwind, Vitest |
| `midiremap-site` | Static SEO pages (engine note maps, pair tables, FAQ / guide / legal pages) in the app's style. | core, `askama`, `serde_json` |
| `midiremap-testkit` | Test-only: builds and reads small SMFs (channels `1..=16`) for the other crates' tests. | `midly` |
| `engines/*.toml` | Preset note↔canon maps; core's `build.rs` converts them to one embedded JSON table. | — |

`midiremap-core` never learns that `midly` or `std::fs` exist above its own
`midi` module; the CLI, WASM, and app layers own all real-world I/O and
presentation.

## Core modules (`midiremap-core/src`)

The dependency direction runs top to bottom; nothing lower depends on anything
higher.

```
conversion   ── convert(bytes, &Mapping, ChannelScope) → bytes + report
   │
   ├── midi        ── parse / write (midly) + rewrite over the SMF stream
   │      │
   │      └── table      ── NoteTable: every source note's Resolution, compiled once
   │
   └── translate   ── Mapping: note → Resolution; Report
          │              (used by table, midi, conversion and plan)
          ├── engine_map  ── EngineMap (+ override patching), Note
          └── canon       ── Canon enum + fallback chains

catalog     ── Catalog: builtin presets (embedded) + user maps
overrides   ── Overrides: per-note / per-drum edits, applied by EngineMap
plan        ── per-drum view of the NoteTable (for UI display), no MIDI
```

Every concept is one concrete type or function; the core defines no traits.

**Public surface.** Every module is private; the crate root re-exports the API the
CLI, the WASM and the site use (`Canon`, `Catalog`, `EngineMap`, `Mapping`,
`convert`, `plan`, `Report`, `Channel`, `ChannelScope`, the preset and error types).
`#![warn(unreachable_pub)]` keeps anything else from becoming public by accident, and
no `midly` type appears in a public signature. `canon` is split into `key` (key text,
`FromStr`, serde), `label` and `fallback` (the graph). Errors keep their causes as
`source()` (`CodecError`, `MapError::Parse`, `PresetError::Parse`); the CLI prints the
chain through anyhow and the WASM joins it into one message (`outer: inner`).

### `canon` — the hub vocabulary

- `Canon`: a `Copy` hierarchical enum whose variants carry sub-enums and bounded
  positions — `Kick(KickKind)`, `Snare(SnareIdx, SnareArtic)`, `Tom(TomPos, TomArtic)`,
  `Hat(HatOpen, HatZone)`, `Aux(AuxIdx, HatOpen, HatZone)`,
  `Cymbal(CymSlot, CymArtic)`, `Ride(RideIdx, RideArtic)` and percussion.
- `Canon::family() → Family`. `Family` (module `family`) is declared in display order
  (`Kick, Snare, Toms, Hi-Hat, Cymbals, Percussion, Aux`, `Family::ALL`) and serializes
  as its label; the app and the site both group drums by it, so the order lives here
  only.
- `Note::name(OctaveBase)` names a note (`F#2`); `OctaveBase::{C1, C2}` is the octave
  convention. The site uses it directly; the app keeps a synchronous copy that the
  contract test checks against the WASM `note_names` for all 128 notes.
- `Idx<const MAX: u8>` holds a 1-based position that is always in `1..=MAX`
  (`SnareIdx = Idx<2>`, `RackIdx = Idx<8>`, `FloorIdx = Idx<4>`, `OpenLevel = Idx<6>`,
  …); `CymSlot { Crash(Idx<6>) | China(Idx<3>) | Splash(Idx<3>) | Stack(Idx<4>) |
  Bell(Idx<2>) }` gives each cymbal kind its own range. Every valid range is written
  once, as a type, so an out-of-range slot cannot be constructed.
- Each `Canon` displays and serializes to a stable **dotted lowercase key**
  (e.g. `kick.main`, `snare1.hit`, `tom.rack1.hit`, `hat.closed`, `crash.1.bell`,
  `ride.1`); these keys are the contract shared with the presets, JSON overrides,
  and the web app.
- `Canon::all()` is every slot, built once. `FromStr` is a lookup table built from
  `all()` and `Display` (plus the alias `ride.N.bow`), so every key round-trips by
  construction.
- `Canon::fallback_chain()`: the ordered, nearest-first list of alternatives to try
  when a target cannot play a slot.
- The part enums (`SnareArtic`, `CymArtic`, …) derive `strum::VariantArray`, so
  `all()` enumerates them without hand-kept lists; a test checks through
  `strum::EnumDiscriminants` that `all()` reaches every variant of `Canon`, `HatOpen`,
  `TomPos` and `CymSlot`.

**Fallback invariant.** `single_step` gives a slot's immediate, nearest
alternatives; `fallback` is the breadth-first closure of that relation, so a chain
lists every reachable alternative once, nearest first, never the slot itself. The
`chain_is_closed_no_self_no_dupes` test enforces this.

### `engine_map` — one engine's note table

- `Note` (module `note`): a MIDI note number that is always in `0..=127`. It
  deserializes from a plain number, rejecting anything larger, and converts to and
  from `midly`'s `u7` at the MIDI boundary. Every note in the core — engine maps,
  overrides, the note table, the report and the plan — is a `Note`.
- `EngineMap::decode(Note) → Option<Canon>` and `encode(Canon) → Option<Note>`.
  Built from a TOML/JSON document (see below):
  - `to_canon: HashMap<Note, Canon>` — decode direction, one entry per listed note.
  - `from_canon: HashMap<Canon, Note>` — encode direction. A note flagged
    `primary` wins the reverse mapping; a duplicate primary for one canon is a
    build error. Non-primary notes fill a canon only if no primary claimed it.
- `with_source_overrides(&[SrcNote])` / `with_target_overrides(&[CanonNote])`
  return a patched copy (decode or encode side); the last entry for a note or canon
  wins. A source entry without a canon removes the note from the decode side.

### `translate` — the pipeline, no MIDI

- `Mapping::new(src, tgt, &Overrides, MissingDrums)` owns the source and target maps
  with the overrides applied: the hub-and-spoke pipeline as a pure function of one note.
  `resolve(canon, &EngineMap, MissingDrums)` resolves a canon against any target;
  `Drop` walks the same chain filtered to `Canon::same_drum`, so both modes share one
  order. `moves_to_other_drum(canon)` says whether the setting decides a canon (the
  target lacks it and its nearest stand-in is another drum).
- Two result types keep partial cases unrepresentable:
  - `CanonResolution { Direct | Fallback | Dropped }` — total result of resolving
    a *canon* against the target. Cannot be "unmapped".
  - `Resolution { Resolved(CanonResolution) | Unmapped }` — result of resolving a
    *source note*, which may not decode at all.
  - `translate(note)` decodes then wraps `resolve_canon` in `Resolved`;
    `resolve_canon(canon)` is used directly by `plan`.
  - Every `CanonResolution` carries the canon it resolved.
- `Report`'s counters are private, read through accessors; only the converter tallies
  them (`record`, `record_untouched`).
- `Report::record` keeps the counting policy in one place: it tallies unmapped
  source notes, fallbacks used (with the target note each one landed on), and
  dropped canons; direct hits are not recorded. `converted` counts hits written to
  the output (direct or approximated); `untouched` counts note-ons the channel scope
  left alone, which are not loss. It serializes in camelCase (`unmappedSource`,
  `fallbackUsed`, `dropped`, `untouched`, `converted`) with its `BTreeMap`s in a
  stable order and note keys as strings, so the CLI and WASM print the same JSON.

### `table` — the single source of truth

- `NoteTable` holds the `Resolution` of all 128 source notes, compiled once per
  `Mapping` by calling `Mapping::translate` for each note.
- The converter, the edit preview (`plan`) and therefore the report all read the
  same table, so the fallback search never runs per MIDI event and the preview
  cannot disagree with the downloaded file.

### `midi` — the only module that knows `midly`

- `parse(bytes)` / `write(&smf)`: the `midly` codec. `parse` refuses a header whose
  SMPTE rate byte is `0x80` before midly sees it: midly 0.5.3 negates it with an
  overflow, a panic in builds with overflow checks (found by fuzzing).
- `Channel` is a MIDI channel `1..=16`, numbered as people count them
  (`Channel::DRUMS` is 10).
- `ChannelScope { Auto | Only(Channel) | All }` chooses which channels a conversion
  rewrites; `resolve(&smf)` turns it into one `ChannelFilter { Only | All | Skip }`
  per track. `Auto` (the default) converts every channel of each track that has a
  channel-10 note-on and skips the other tracks; when no track has one, it converts
  everything. Multi-track song exports keep their bass and keys, drum tracks split
  across channels convert whole, and files with drums elsewhere convert as before.
  Parses from `auto`, `all` or `1`..=`16`.
- `rewrite(&mut smf, &NoteTable, ChannelScope, &mut Report)` applies the table to
  the events each track's filter accepts:
  - Note-on/off and poly aftertouch keys are rewritten to the resolved target
    note, so cymbal chokes follow their cymbal.
  - Unmapped / dropped notes (and their aftertouch) are removed; a removed event's
    delta is folded into the next kept event so timing does not shift. Folded
    deltas saturate at the `u28` maximum instead of wrapping.
  - Every other event, and every event on a rejected channel, passes through
    untouched.
  - Each real note-on (velocity > 0) is reported once; those on a rejected
    channel or skipped track count as `untouched`.

  No active `(channel, note)` tracking is needed: translation is a pure function
  of the note number, so a note-on and its note-off resolve identically and stay
  paired. The only accepted loss is many-to-one collisions (e.g. L/R kick → one
  note).
- `tests/rewrite_props.rs` (proptest) checks this on generated multi-track files for
  every built-in pair, missing setting and scope: kept events keep their absolute tick
  and everything but the key, only note events are removed, notes stay paired per
  channel and key, and `converted + dropped + unmapped + untouched` equals the input's
  note-ons.
- `fuzz/` (cargo-fuzz, its own workspace) feeds `convert` arbitrary bytes: no panic,
  the output parses, and the counts add up. It runs daily in CI (`fuzz.yml`); locally,
  on Linux or WSL with a nightly toolchain:
  `cd midiremap-core && cargo +nightly fuzz run convert fuzz/corpus/convert fuzz/seeds -- -dict=fuzz/midi.dict -max_total_time=600`.
  Crashes found become files in `fuzz/seeds/`.

### `conversion` — end-to-end facade

- `convert(midi, &Mapping, ChannelScope) → Converted { bytes, report }`: parse,
  compile the `NoteTable`, rewrite, write. The single entry point for the CLI and
  the WASM.

### `catalog` — where engine maps come from

- `Catalog`: engine maps keyed by id in a `BTreeMap`, with `get(id)`, and `ids()` /
  `engines()` in id order, so no caller sorts. `EngineMap` exposes `id()` / `name()`
  and reads user maps with `EngineMap::from_json`; a map that lists a note twice is a
  `MapError::DuplicateNote`. A map may list former
  ids as `aliases`; `get` and `canonical_id` resolve them, so renaming an engine never
  breaks a saved preset. `check_aliases` rejects an alias that is also an id or belongs
  to two engines.
- `Catalog::builtin()`: every `engines/*.toml` (dozens of presets). Core's `build.rs`
  globs the directory, parses each file with `toml`, rejects invalid TOML or a
  duplicate engine id as a build error naming the file, and writes one JSON table
  that is embedded with `include_str!`. Adding a preset needs no code change, and
  `toml` stays out of the runtime (and the WASM). `builtin()` parses the table;
  `Catalog::shared()` is a process-wide `LazyLock` instance, so the
  WASM parses presets once per page instead of once per call. A semantically invalid
  preset (unknown canon, duplicate primary or note) is a startup panic caught by tests.
- `with_user_json(json)` adds a user map that *shadows* a builtin with the same id;
  `from_maps(maps)` builds a catalog from any maps (tests, generators).
- `tests/stable_ids.rs` guards saved data: every drum key and engine id ever released is
  recorded in `tests/golden/`, must still parse or resolve (through an alias after a
  rename), and every new one must be appended.

### `preset` — the preset file

- `parse_preset(json) → LoadedPreset { preset: SavedPreset, skipped }` reads
  `{ "format": "drumverter-preset", "version": 1, name, src, tgt, edits: { canon: note },
  srcEdits: { "note": canon | null } }` — the file the web app exports. Another format or
  version, or a blank name/engine, is an error; an edit it cannot read (unknown drum,
  note out of range) is skipped and described in `skipped`, never fatal.
  `SavedPreset::overrides()` turns it into `Overrides`. The app's export and this parser
  share the fixture `app/test/fixtures/my-kit.drumverter.json`.

### `overrides` — per-voice retargeting

- `Overrides { tgt: Vec<CanonNote>, src: Vec<SrcNote> }`, deserialized from
  `{ "tgt": [{ "canon", "note" }], "src": [{ "note", "canon" | null }] }`. `tgt` retargets
  the *encode* side ("encode this canon as this note"); `src` retargets the
  *decode* side ("read this source note as this canon"), which lets a note the
  source engine doesn't map be rescued to a canon, or (with `canon: null`) a note it
  does map be unassigned — how the editor replaces a drum's source note. Notes are
  `Note`s, so an out-of-range value fails deserialization.
- `Mapping::new` applies them through `EngineMap::with_source_overrides` and
  `with_target_overrides`; anything not overridden falls through to the engine.

### `plan` — the source→target table (UI, no MIDI)

- `plan(src, tgt, ov, missing) → Vec<VoicePlan>`: a per-drum view of the `NoteTable`
  compiled with the same `Overrides` and `MissingDrums` conversion uses. One row per
  canon the source engine defines or any note decodes to, in `Canon::all()` order,
  giving `{ canon, src_notes, tgt_note, default_tgt_note, status, other_drum }`
  (`other_drum`: the missing-drums setting decides this row):
  - `src_notes`: every source note that plays this drum — overridden notes first,
    then the engine's primary note, then the rest. Empty for a *silent* drum (its
    notes were reassigned); the row stays so its target remains editable.
  - `tgt_note` / `status` (`Direct | Fallback | Dropped`): the drum resolved with
    target overrides; `default_tgt_note`: without them.
  - Duplicate overrides resolve last-wins, as in conversion.
  A property test converts every note for every builtin pair and checks the
  preview against the output.

## Engine preset format

Each `engines/*.toml` (and any user map, as JSON) is one engine:

```toml
id         = "ggd_invasion"
name       = "GGD Invasion (Default Mapping 'Invasion')"
short_name = "GetGood Drums Invasion"
vendor     = "GetGood Drums"
notes = [
  { note = 24, canon = "kick.main",   primary = true },
  { note = 25, canon = "kick.main"                    },  # duplicate note, decode-only
  { note = 26, canon = "snare1.hit",  primary = true },
  { note = 43, canon = "hat.closed",  primary = true },
]
```

- `short_name` — optional; the name the app and site show (`display_name`), falling
  back to `name`. The app's engine filter still matches `name`.
- `vendor` — who makes the engine; groups the site's engine index. Optional for user
  maps, required for every built-in preset (a catalog test checks it). Blank values are
  errors.
- `note` — MIDI note number `0..=127`.
- `canon` — a canon's dotted string key (see the `canon` module).
- `primary` — optional (default `false`); the note used when *encoding* this
  canon. Multiple notes may decode to the same canon; exactly one may be primary.

Built-in presets: dozens of engines spanning GetGood Drums, Toontrack EZdrummer /
Superior Drummer, Addictive Drums 2, BFD3, Steven Slate SSD5, Native Instruments,
MixWave, ML Drums / Perfect Drums, e-kit and DAW-native drummers, General MIDI, and
Guitar Pro. The full set is whatever `engines/*.toml` ships; `list` (CLI) and
`engine_catalog` (WASM) enumerate the ids at runtime.

## Consumer surfaces

### CLI (`midiremap-cli`)

`clap`-parsed subcommands, `anyhow` for error reporting (prints the error chain to
stderr and exits non-zero):

```
midiremap convert <input.mid> <src_id> <tgt_id> <output.mid>
                  [--user-map map.json] [--overrides edits.json] [--channel auto|all|1-16]
                  [--missing nearest|drop] [--preset my-kit.drumverter.json]
midiremap list [--user-map map.json]
```

`convert` writes the remapped `.mid` and prints the loss report as pretty JSON to
stderr. `--overrides` takes note edits as
`{"tgt":[{"canon","note"}],"src":[{"note","canon"}]}` (the `Overrides` shape);
`--preset` takes a preset exported from the web app instead (its engines, resolved
through aliases, must match the command's; skipped edits are printed). `--missing drop`
leaves out drums the target lacks instead of playing them on the nearest drum. `list`
prints available engine ids.

### WASM (`midiremap-wasm`)

`wasm-bindgen` exports for the browser app:

- `remap(mid, src_id, tgt_id, overrides?, channel?, missing?) → RemapOutput { bytes, report }` —
  `overrides` is an `Overrides` object; `channel` is `auto` (the default), `all` or
  `1`-`16`; `missing` is `nearest` (the default) or `drop`.
- `plan(src_id, tgt_id, overrides?, missing?) → VoiceRow[]` — a core `VoicePlan`
  (`canon, srcNotes, tgtNote, defaultTgtNote, status, otherDrum`) plus its `label`.
- `engine_catalog() → [{ id, name, fullName }]` — `name` is the display name,
  `fullName` the catalog name.
- `family_order() → Family[]` — drum families in display order; `note_names(base) →
  string[]` — the 128 note names.
- `engine_drums(tgt_id) → [{ note, canon, label, family }]` — the target's playable
  voices, for the note editor's drum list.
- `engine_notes(src_id) → [{ note, canon, label, family }]` — the source's notes,
  for reassigning source notes.
- `canon_catalog() → [{ canon, label, family }]` — the full canon vocabulary, for
  the source-note canon picker.
- `parse_preset_file(json) → { name, src, tgt, edits, srcEdits, skipped }` — a preset
  file for import, engines resolved to current ids; an unknown engine is an error.
- A `start` function installs `console_error_panic_hook`, so a panic prints its message.

The browser build uses the `wasm` Cargo profile (release with LTO and one codegen
unit), then `wasm-opt -Oz` (npm `binaryen`) on the bindgen output: 718 → 543 KB, 197 →
163 KB gzipped. `opt-level` s / z made it larger — a quarter of the module is the
embedded engine table.

One contract, generated from Rust. Every value crossing the boundary is a serde type
that also derives `tsify::Tsify` (in core behind the opt-in feature `ts`, which only
this crate enables), and crosses as `Ts<T>`, so wasm-bindgen writes the real
TypeScript types into `midiremap_wasm.d.ts` instead of `any`. Each type declares
`missing_as_null` and `hashmap_as_object`, so the declared type and the runtime value
agree: missing notes are `null`, maps are plain objects, `Note` is `number`, `Canon`
is `string`, converted bytes are a `Uint8Array`. A field renamed in Rust changes the
`.d.ts`, and the app's `tsc` fails.

Every export throws a `WasmError { kind, message, id }`; `kind` is `unknownEngine`
(`id` names the engine), `badOverrides`, `badMissing`, `badChannel`, `badMidi`,
`badPreset` or `internal`.

### Web app (`app/`)

Vite + React + TypeScript + Tailwind, tested with Vitest/Testing-Library. It never
touches `.mid` bytes or the WASM edge directly; both are isolated so the rest of
the UI is pure data.

- **`lib/`** — framework-free logic and the boundary. `midiremap.ts` is the sole
  WASM adapter: a single init promise, the generated types re-exported under the
  app's names, and a thrown `WasmError` turned into a `WasmCallError` (an `Error`
  with `kind` and `id`). Sibling pure modules cover notes, mapping (de)serialization, the loss
  report builder, override assembly, file naming, and zipping.
- **Conversion off the main thread.** `converter.ts` sends each batch to one module
  Web Worker (`convertWorker.ts`), which loads the WASM itself and runs the shared
  `runBatch` (`batch.ts`); converted bytes come back as transferred buffers, so the
  page and the spinner stay responsive. If a worker cannot be created or dies, the
  same batch runs on the main thread; a batch the worker could not convert (the WASM
  failed to load) is rejected and shown as an error, never retried or left spinning.
  The editor's `plan` preview stays on the main thread (it takes well under a
  millisecond); a `plan` failure (e.g. a damaged preset) becomes a notice with Reset
  edits, and anything else that throws while rendering reaches the root
  `ErrorBoundary` (Reload, Report an issue, two-step Reset saved data).
- **`hooks/`** — `useRemapper` is the facade the UI consumes. It composes
  `useEngineCatalog` (load status + engine list), `useConverter` (files → results
  + report), and `useEditor` (per-note edits, the live `plan` preview, and derived
  counts) behind a stable return contract, plus a small selection reducer for
  source/target/octave/channel/view. `useEditor`'s result is exposed as one nested
  `editor` bundle; the editor screen owns it and hands its parts only what they read.
  Its reducer lives in `lib/editorState.ts`; the pair's drums, notes, vocabulary and
  family order come from `useEngineData`.
  - Every change to what is converted (pick FROM/TO, swap, a link's pair, load a
    preset, channel, missing drums) is one `SelectionEvent` (`lib/selection.ts`) that
    `useRemapper` hands to the selection, editor and converter reducers alike; each
    decides what it means (the editor drops edits when the pair changes, the converter
    goes idle and cancels a running batch). No action resets another hook by hand.
  - `usePresetActions` assembles preset payloads (save, update, duplicate, load, edit);
    `useFileIntake` takes dropped files and presets; `useConversionReport` builds the
    report and decides whether "drop missing drums" applies.
  - Focus after an action goes through `useFocusIntent`: a component registers a
    target with `ref(target)`, the action calls `request(target)`, and focus moves once
    the render is on screen and any closing dialog has handed focus back. There are no
    global element ids for focus.
  Persistence lives in focused hooks
  (`useSavedMappings`, `useFavorites`) and `lib/session.ts`:
  - Presets are stored as `{ version: 1, items }` (a legacy bare array reads as version
    0). Storage is written only after a user action; entries this version cannot read
    are moved to `midiremap:quarantine` on the next write, never dropped. A `storage`
    event reloads presets and favourites, so tabs stay in sync.
  - The session (`midiremap:session`, versioned) keeps engines, octave, channel,
    missing drums, the open preset id and unsaved edits; `useRemapper` restores it on
    load and saves every change. When the catalog loads, a link's `?from/&to` pair
    wins (dropping edits made for another pair), unknown engines are cleared and
    unknown drums in restored edits are left out.
  - Loading a preset leaves out edits for drums this version does not know and says
    so; presets export to and import from `.drumverter.json` files (import parses
    through the WASM `parse_preset_file`).
- **`components/`** — the converter card (engine pickers, file chips, convert
  button, summary), the note editor (`EditView` + note/source pickers), and shared
  controlled-overlay modals (guide/FAQ/issue/contact/terms, loss report). The header
  and footer (`SiteHeader`, `SiteFooter`) frame every view; the footer's links go to
  the site's pages and open the same text in a modal on a plain click. Overlays use
  Floating UI throughout: `Modal` (focus trap, scroll lock, Escape and backdrop close,
  focus back to the opener; closed, its content stays in the page, hidden, for
  crawlers), `PickerShell` (the note pickers: focus in, Escape or a press outside its
  row closes, focus back; the row is its `OverlayAnchor`), menus and tooltips. The
  editor's parts live in `components/edit/`. A structure test keeps every component
  and hook within 250 lines; the style test keeps raw `rgba(` and `shadow-[` out of
  components (shadows are `@theme` tokens in `index.css`).

Edit preview and downloaded output share one source of truth: the editor's rows
come from the core `plan`, a view of the same `NoteTable` the converter uses, so
per-row target notes and fallback propagation match the converted file exactly.
The loss report labels substitutes from the target note recorded during
conversion, not from the live rows. The drum channel picker beside the octave
picker (Auto by default, not saved with mappings) is passed to every conversion;
notes it leaves alone are shown on the done card and in the report as unchanged,
not as loss.

### Static site (`midiremap-site`)

`npm run build:site` builds the app, then generates `/engines/`, one page per engine,
one per pair of the eight popular engines, and one per content section into `dist/`.
The pages link the app's own built stylesheet (read from `dist/index.html`); Tailwind
scans the askama templates through `@source`, so both surfaces share one set of tokens
and utilities. Octave naming and "Changes only" on pair pages are CSS-only radios; the
filters on the engine and index pages are the only script. FAQ, How it works, Report an
issue, Contact and Terms come from `app/src/content/pages.json`, which also feeds the
app's modals; their FAQPage / HowTo schema is written on `/faq/` and `/how-it-works/`,
and `/` carries only the SoftwareApplication block in `index.html`. Besides the
stylesheet, each page copies two things from the built `index.html`: the content security
policy (defined once in `vite.config.ts`, injected into the build only) and the
Cloudflare Web Analytics beacon, so every page states the same policy and counts visits
the same way. The filter script is `/filter.js`, not inline, so the policy needs no
`'unsafe-inline'`. Links and chrome
that both surfaces draw are `@utility` classes in `index.css` (`prose-link`,
`nav-link`, `skip-link`, `brand-mark`), used by the React components and the templates
alike. Pair-page rows take their status from the core (`PlanStatus` of each source
note's resolution); the site only names it (exact / approximated / dropped) and sorts
changes first.

## Design rules (enforced)

- **Pure core.** All logic is I/O-free and unit-tested; the outer crates own bytes
  and presentation.
- **Make invalid states unrepresentable.** `Note`, `Idx<MAX>` / `CymSlot`, the
  `Resolution` / `CanonResolution` split, and exhaustive `Canon` matches remove
  whole classes of error instead of documenting them.
- **Concrete types, no single-implementation traits.** One conversion entry point
  (`convert`), one catalog type, one mapping type.
- **Standard crates over hand-rolled** parsing, error handling, and serialization.
- The verify gate before every change is `fmt` + `test` + `clippy`, all clean.
- **Nothing third-party without a reason.** Fonts are self-hosted (`@fontsource`,
  variable Space Grotesk and IBM Plex Sans, IBM Plex Mono 400/600 — the faces the pages
  load). The one outside origin is the analytics beacon; the CSP allows only it,
  `'self'` and `'wasm-unsafe-eval'`, and the e2e suite fails on any other request.
- **Budgets and audits.** `npm run size` fails the build when gzipped wasm, JS or CSS, or
  the latin font files, grow past `scripts/check-size.ts`'s budgets. `audit.yml` runs
  `cargo deny` (advisories, licences, sources; `deny.toml`) and `npm audit` on every
  push and weekly; Dependabot proposes updates; every action is pinned to a commit.
- **IndexNow pings only changed pages.** `scripts/indexnow.ts` hashes each sitemap
  page (asset file names blanked), publishes `page-hashes.json`, and submits the pages
  whose hash differs from the live copy.
- **Browser behaviour is tested in a browser.** `app/e2e` (Playwright, Chromium desktop
  and a Pixel 7 profile) runs against the built site in CI before deploy: conversion
  through the real WASM, keyboard walk and focus, drag and drop, the report dialog,
  tap-target sizes, and the static pages' filters and toggles. Any console error
  fails a test.
```
