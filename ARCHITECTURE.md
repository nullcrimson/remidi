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
toward a stroke it can play: first another stroke of the same drum (a rimshot becomes
a plain hit: `snare1.rimshot → snare1.hit`), then a neighbouring drum. If the chain is exhausted, the
hit is **dropped** and recorded in a loss report. A source note with no canonical
meaning is **unmapped**: removed, or written out unchanged when the **unrecognized notes**
setting (`Unrecognized { Remove | Keep }`, default `Remove`) says `Keep`; the report lists
it as unmapped either way.

The **missing drums** setting (`MissingDrums`) decides how far the chain may reach:
`Nearest` (the default) takes the first entry the target plays, which may be another
drum (a China on a crash, Tom 4 on Tom 3); `Drop` keeps only entries on the same drum
(`Canon::same_drum`: a rimshot still becomes a snare hit), else drops the hit.

## Workspace

Five crates, a web app, and embedded engine presets:

| Component | Role | Depends on |
|-------|------|------------|
| `midiremap-core` | Pure engine. No I/O beyond parsing bytes handed to it. All the logic below. | `midly`, `serde`, `serde_json`, `strum`, `thiserror` (`toml` at build and test time only; `tsify` and `wasm-bindgen` behind the feature `ts`) |
| `midiremap-cli` | Offline `convert` / `list` binary. | core, `clap`, `anyhow` |
| `midiremap-wasm` | Browser bindings for the web app. | core (feature `ts`), `wasm-bindgen`, `tsify`, `serde`, `serde_bytes`, `console_error_panic_hook` |
| `app/` | Vite + React + TypeScript converter UI over the WASM bindings. | Vite, React, Tailwind, Vitest |
| `midiremap-site` | Static SEO pages (engine note maps, pair tables, FAQ / guide / legal pages) in the app's style. | core, `askama`, `fluent-bundle`, `clap`, `serde_json`, `thiserror` (`fluent-syntax`, `heck` in `build.rs`) |
| `midiremap-testkit` | Test-only: builds and reads small SMFs (channels `1..=16`) for the other crates' tests; a key, channel or delta out of range panics. | `midly` |
| `engines/*.toml` | Preset note↔canon maps; core's `build.rs` converts them to one embedded JSON table. | — |

Inside `midiremap-core` only the `midi`, `channel`, `rewrite` and `sample` modules, and
`note`'s `u7` conversion, name `midly`, and nothing reads a file; the CLI, WASM, and app layers own
all real-world I/O and presentation.

## Core modules (`midiremap-core/src`)

The dependency direction runs top to bottom; nothing lower depends on anything
higher.

```
conversion   ── convert(bytes, &Mapping, ChannelScope) → bytes + report
   │
   ├── midi        ── parse / write (midly), is_hit
   │
   └── rewrite     ── applies a NoteTable to the SMF stream, folds removed deltas
          │
          ├── channel     ── Channel (Idx<16>), ChannelScope → per-track ChannelFilter
          │      └── midi, idx
          ├── midi
          ├── report      ── Report: what a conversion did with each hit
          └── table       ── NoteTable: every source note's Resolution, compiled once
   │
   └── translate   ── Mapping: note → Resolution
          │              (used by table, rewrite, report, conversion and plan)
          ├── engine_map  ── EngineMap
          │      └── canon, family, note, non_blank
          ├── overrides   ── Overrides: edits to either side, last entry wins
          └── canon       ── Canon enum + fallback chains
                 ├── family ── Family, declared in display order
                 └── idx    ── Idx<MAX>: a 1-based position in 1..=MAX

note        ── Note (0..=127), OctaveBase, note names
non_blank   ── NonBlank: a string that is not blank
catalog     ── Catalog: builtin presets (embedded) + user maps
fit         ── note_hits / source_fits: how well each engine's layout covers a file's hits
plan        ── per-drum rows from the Mapping the converter uses (for UI display), no MIDI
preset      ── the preset file the app exports and the CLI reads
sample      ── sample_file: a two-bar groove on the notes one engine plays, written by midi
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
- `Note::name(OctaveBase)` names a note (`F#2`) and `Note::octave(OctaveBase)` numbers
  its octave; `OctaveBase::{C1, C2}` (`OctaveBase::ALL`) is the octave convention. The
  site calls them directly. The app reads a table of them: its wasm build calls the
  module's `note_naming` and writes the result to `app/src/wasm/note_naming.json`, which
  `core/notes.ts` imports, so the app names notes before the module has loaded and holds
  no naming rule of its own.
- `Idx<const MAX: u8>` (module `idx`, shared with `Channel`) holds a 1-based position
  that is always in `1..=MAX` (`SnareIdx = Idx<2>`, `RackIdx = Idx<8>`, `FloorIdx = Idx<4>`, `OpenLevel = Idx<6>`,
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

**Fallback rules.** A chain first lists the strokes of the same drum that may stand in
(`variants`, explicit allow-lists: a fancy stroke falls to a plain one, never the
reverse; hi-hats keep closed with closed and open with open, foot with foot, and never
fall onto the bell), then walks breadth-first to other drums (`neighbours`, used only
by Nearest: the other snare, the nearest toms, the nearest cymbal of the same kind,
crash 1 for china/splash/stack and for a ride edge, the ride bell for a cymbal bell,
the main hat for an aux hat), each with its own allow-list. No stand-in → the drum is
dropped. Chains are built once for every slot. `tests/same_drum_stands_in.rs` holds the
agreed rules as an independent table and checks every slot's chain against it, and
every built-in engine pair in both missing-drum modes: the first agreed stand-in the
target has is played, nothing else on the same drum, and Nearest only crosses to drums
the rules allow.

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
- An `EngineMap` is never copied or patched: edits are applied by `Mapping`.

### `translate` — the pipeline, no MIDI

- `Mapping::new(src, tgt, &Overrides, MissingDrums)` compiles one conversion: the
  source's decode table with the source edits applied (an edit without a canon removes
  the note), and, from the target's encode table with the target edits applied, the
  outcome of every drum in the vocabulary. Nothing is resolved after construction:
  `resolve_canon(canon)` reads the compiled outcome, and `translate(note)` decodes the
  note and reads the same outcome. `with_unrecognized(Unrecognized)` sets, once, what the
  conversion does with notes that do not decode (`Remove` unless set); the `NoteTable`
  compiled from the mapping carries that choice to `rewrite`. It changes neither the
  resolutions nor the report, only whether those notes are written.
- A drum the target has plays on its own note. Otherwise the first drum of its fallback
  chain that the target has stands in; `Drop` walks the same chain filtered to
  `Canon::same_drum`, so both modes share one order. `moves_to_other_drum()` on the
  outcome says whether the setting decides the drum (the target lacks it and its nearest
  stand-in is another drum): a `Fallback` to another drum, or a `Dropped` that another
  drum could have played (`other_drum`).
- Two result types keep partial cases unrepresentable:
  - `CanonResolution { Direct | Fallback | Dropped }` — total result of resolving
    a *canon* against the target. Cannot be "unmapped". Every variant carries the canon
    it resolved; `Fallback` also carries the drum that stands in, and `played()` gives
    the target drum and note that play it.
  - `Resolution { Resolved(CanonResolution) | Unmapped }` — result of resolving a
    *source note*, which may not decode at all; internal to the core.
- `Report` (module `report`) keeps its counters private and hands them out as
  iterators and totals (`hits()` is every note-on seen); only the converter tallies
  them (`record`, `record_untouched`).
- `Report::record` keeps the counting policy in one place: it tallies unmapped
  source notes, fallbacks used (each with the stand-in drum the converter chose, the
  target note it landed on and the hit count), and dropped canons; direct hits are not recorded. `converted` counts hits written to
  the output (direct or approximated); `untouched` counts note-ons the channel scope
  left alone, which are not loss. It serializes in camelCase (`unmappedSource`,
  `fallbackUsed`, `dropped`, `untouched`, `converted`) with its `BTreeMap`s in a
  stable order and note keys as strings, so the CLI and WASM print the same JSON. A
  `fallbackUsed` entry is `{ standIn, note, count }`; the app names the report line
  after `standIn`, and when a target edit moved the stand-in onto another note it adds
  what the stock target has there ("China → Crash 2 → Ride").

### `table` — the single source of truth

- `NoteTable` holds the `Resolution` of all 128 source notes, compiled once per
  `Mapping` by calling `Mapping::translate` for each note.
- The converter reads the table for every event, so the fallback search never runs
  per MIDI event, and the report records what the table said.
- The edit preview (`plan`) compiles the same table to group source notes by drum, and
  reads each drum's outcome from the same `Mapping`, which is where the table's entries
  come from: the preview and the file share one compiled outcome per drum.
  `tests/preview_matches_conversion.rs` checks the preview against the converted file
  for every builtin pair.

### `midi`, `channel`, `rewrite` — the modules that know `midly`

- `midi`: `parse(bytes)` / `write(&smf)`, the `midly` codec, and `is_hit` (a note-on
  with velocity > 0). `parse` refuses a header whose SMPTE rate byte is `0x80`
  (`CodecError::SmpteRate`) before midly sees it: midly 0.5.3 negates it with an
  overflow, a panic in builds with overflow checks (found by fuzzing).
- `channel`: `Channel` is a MIDI channel `1..=16` (an `Idx<16>`), numbered as people
  count them (`Channel::DRUMS` is 10).
- `ChannelScope { Auto | Only(Channel) | All }` chooses which channels a conversion
  rewrites; `resolve(&smf)` turns it into one `ChannelFilter { Only | All | Skip }`
  per track. `Auto` (the default) converts every channel of each track that has a
  channel-10 note-on and skips the other tracks; when no track has one, it converts
  everything. Multi-track song exports keep their bass and keys, drum tracks split
  across channels convert whole, and files with drums elsewhere convert as before.
  Parses from `auto`, `all` or `1`..=`16`.
- `rewrite`: `rewrite(&mut smf, &NoteTable, ChannelScope, &mut Report)` applies the
  table to the events each track's filter accepts:
  - Note-on/off and poly aftertouch keys are rewritten to the resolved target
    note, so cymbal chokes follow their cymbal.
  - Dropped notes (and their aftertouch) are removed, and so are unmapped ones unless
    the table's `Unrecognized` is `Keep`, which writes them out unchanged (same key,
    channel, velocity and tick); a removed event's
    delta is folded into the next kept event (`DeltaFold`) so timing does not shift.
    A folded gap past the `u28` maximum fails the conversion with
    `CodecError::DeltaOverflow` instead of moving later events.
  - Every other event, and every event on a rejected channel, passes through
    untouched.
  - Each real note-on (velocity > 0) is reported once; those on a rejected
    channel or skipped track count as `untouched`.

  No active `(channel, note)` tracking is needed: translation is a pure function
  of the note number, so a note-on and its note-off resolve identically and stay
  paired. The only accepted loss is many-to-one collisions (e.g. L/R kick → one
  note).
- `tests/rewrite_props.rs` (proptest) checks this on generated multi-track files, with
  the built-in pair, missing setting, unrecognized setting and scope drawn at random: kept events keep their absolute tick
  and everything but the key, only note events are removed, notes stay paired per
  channel and key, and `converted + dropped + unmapped + untouched` equals the input's
  note-ons; keeping unrecognized notes changes no count and writes
  `converted + unmapped + untouched` note-ons.
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
  breaks a saved preset. `from_maps` rejects an alias that is also an id or belongs
  to two engines (`MapError::AliasCollision`). No built-in preset has an alias yet.
- `Catalog::builtin()`: every `engines/*.toml` (dozens of presets). Core's `build.rs`
  globs the directory, parses each file with `toml`, rejects invalid TOML or a
  duplicate engine id as a build error naming the file, and writes one JSON table
  that is embedded with `include_str!`. Adding a preset needs no code change, and
  `toml` stays out of the runtime (and the WASM). `builtin()` parses the table;
  `Catalog::shared()` is a process-wide `LazyLock` instance, so the
  WASM parses presets once per page instead of once per call. A semantically invalid
  preset (unknown canon, duplicate primary or note) makes `builtin()` and `shared()`
  return a `MapError`; the catalog test `every_embedded_engine_loads` fails the gate on one.
- `with_user_json(json)` adds a user map that *shadows* a builtin with the same id;
  `from_maps(maps)` builds a catalog from any maps (tests, generators).
- `tests/stable_ids.rs` guards saved data: every drum key and engine id ever released is
  recorded in `tests/golden/`, must still parse or resolve (through an alias after a
  rename), and every new one must be appended.
- `tests/walkthrough.rs` converts every note of the richest kit to every builtin target
  and compares the output keys and the report with `tests/golden/walkthrough.txt`, one
  recorded line per target. A line changes only when a preset or the fallback order
  does; the change is then reviewed in the diff of that file.

### `preset` — the preset file

- `parse_preset(json) → LoadedPreset { preset: SavedPreset, skipped }` reads
  `{ "format": "drumverter-preset", "version": 1, name, src, tgt, edits: { canon: note },
  srcEdits: { "note": canon | null } }` — the file the web app exports. Another format or
  version, or a blank name/engine (`NonBlank`), is an error; an edit it cannot read
  (unknown drum, note out of range) is skipped and listed in `skipped` as a
  `SkippedEdit` (kind + key/value; `Display` gives the CLI's line), never fatal.
  `SavedPreset::overrides()` turns it into `Overrides`. The app's export and this parser
  share the fixture `midiremap-core/tests/golden/my-kit.drumverter.json`, which the CLI's,
  the wasm crate's and the app's tests read from there.

### `overrides` — per-voice retargeting

- `Overrides` keeps its entries private, deserialized from
  `{ "tgt": [{ "canon", "note" }], "src": [{ "note", "canon" | null }] }`. `tgt` retargets
  the *encode* side ("encode this canon as this note"); `src` retargets the
  *decode* side ("read this source note as this canon"), which lets a note the
  source engine doesn't map be rescued to a canon, or (with `canon: null`) a note it
  does map be unassigned — how the editor replaces a drum's source note. Notes are
  `Note`s, so an out-of-range value fails deserialization.
- `target()` and `source()` hand the edits out with the last entry for a drum or a note
  already chosen; `Overrides::new` builds them from a preset. `Mapping::new` applies
  them, and anything not overridden falls through to the engine; `plan` reads `source()`
  only to list a drum's edited notes first.

### `plan` — the source→target table (UI, no MIDI)

- `plan(src, tgt, ov, missing) → Vec<VoicePlan>`: per-drum rows from a `Mapping` built
  with the same `Overrides` and `MissingDrums` conversion uses. One row per
  canon the source engine defines or any note decodes to, in `Canon::all()` order,
  giving `{ canon, src_notes, default_tgt_note, outcome }`:
  - `src_notes`: every source note that plays this drum — overridden notes first,
    then the engine's primary note, then the rest. Empty for a *silent* drum (its
    notes were reassigned); the row stays so its target remains editable.
  - `outcome` (`PlanOutcome`): `Direct { tgt_note }`, `Fallback { stand_in, tgt_note, other_drum }`
    or `Dropped { other_drum }` (`stand_in` is the drum the converter plays it on, so the
    app names that drum, followed by what the stock target has on the note when a target edit moved it there), the drum resolved with target overrides, so a dropped
    drum cannot carry a note; `other_drum` means the missing-drums setting decides the
    row. `default_tgt_note`: the target note without target overrides.
  - Duplicate overrides resolve last-wins, as in conversion.
  `tests/preview_matches_conversion.rs` converts every note for every builtin pair
  (Nearest, Drop, and with overrides) and checks the preview against the output.

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
  errors (`NonBlank`).
- `note` — MIDI note number `0..=127`.
- `canon` — a canon's dotted string key (see the `canon` module).
- `primary` — optional (default `false`); the note used when *encoding* this
  canon. Multiple notes may decode to the same canon; at most one may be primary, and
  with none the first one listed encodes it.
- `aliases` — optional; former ids that still resolve to this engine (see `catalog`).

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
                  [--missing nearest|drop] [--unrecognized remove|keep]
                  [--preset my-kit-drumverter.json]
midiremap list [--user-map map.json]
```

`convert` writes the remapped `.mid` and prints the loss report as pretty JSON to
stderr. `--overrides` takes note edits as
`{"tgt":[{"canon","note"}],"src":[{"note","canon"}]}` (the `Overrides` shape);
`--preset` takes a preset exported from the web app instead (its engines, resolved
through aliases, must match the command's; skipped edits are printed). `--missing drop`
leaves out drums the target lacks instead of playing them on the nearest drum.
`--unrecognized keep` writes notes the source layout does not recognize out unchanged
instead of removing them; the report lists them as `unmappedSource` either way. `list`
prints available engine ids. `--overrides` and `--preset` exclude each other. The exit
code is 0 when the file was written (even with dropped notes: read the report), 1 on any
error and 2 on a usage error.

### WASM (`midiremap-wasm`)

`wasm-bindgen` exports for the browser app:

- `remap(mid, src_id, tgt_id, overrides?, channel?, missing?, unrecognized?) → RemapOutput { bytes, report }` —
  `overrides` is an `Overrides` object; `channel` is `auto` (the default), `all` or
  `1`-`16`; `missing` is `nearest` (the default) or `drop`; `unrecognized` is `remove`
  (the default) or `keep`. Like `channel`, a value outside its set is `internal`: the app
  only sends its own typed values. `plan` does not take it, since no plan row is an
  unrecognized note.
- `plan(src_id, tgt_id, overrides?, missing?) → VoiceRow[]` — a core `VoicePlan`
  (`canon, srcNotes, defaultTgtNote, outcome`, the outcome tagged by `status`) plus its
  `label` and its canon's `family`; the app reads it through `core/outcome.ts` (`playedNote`, `movesToOtherDrum`, `isPlayed`, `leadNote`).
- `engine_catalog() → [{ id, name, fullName }]` — `name` is the display name,
  `fullName` the catalog name.
- `source_fits(mids, channel?) → { hits, ranked: [{ engine, recognized }] }` — every engine fitted to
  the hits of all `mids` that a conversion with `channel` reads (core `note_hits`, summed,
  then `source_fits`: a hit is recognized when the engine's map decodes its note), best
  first, ties in catalog order; a file that does not parse is left out.
- `sample_file(engine) → Uint8Array` — a two-bar 4/4 groove at 120 bpm on channel 10 (core
  `sample_file`): eighth notes on the closed hi-hat (the ride where an engine has none) over
  kick and snare, a crash on the first beat, each drum on the engine's own note or its
  nearest stand-in's (`Canon::fallback_chain`), so the engine recognizes every hit; an
  unknown engine is an `unknownEngine` error with the role `source`.
- `family_order() → Family[]` — drum families in display order; `note_naming() →
  Record<OctaveBase, { names, octaves }>` — the 128 note names and octave numbers per
  convention, called by the app's build, not by the app.
- `engine_drums(tgt_id) → [{ note, canon, label, family }]` — the target's playable
  voices, for the note editor's drum list.
- `engine_notes(src_id) → [{ note, canon, label, family }]` — the source's notes,
  for reassigning source notes.
- `canon_catalog() → [{ canon, label, family }]` — the full canon vocabulary, for
  the source-note canon picker.
- `parse_preset_file(json) → { name, src, tgt, edits, srcEdits, skipped }` (`name` is the generated `PresetName` brand) — a preset
  file for import, engines resolved to current ids; an unknown engine is an error.
  `skipped` is a list of tagged `SkippedEdit`s; the app shows only their count.
- A `start` function installs `console_error_panic_hook`, so a panic prints its message.

The browser build uses the `wasm` Cargo profile (release with LTO and one codegen
unit), then `wasm-opt -Oz` (npm `binaryen`) on the bindgen output: about 536 KB, 160 KB
gzipped, against a 166 KB budget (`scripts/check-size.ts`). `opt-level` s / z made it
larger — a quarter of the module is the embedded engine table.

One contract, generated from Rust. Every value crossing the boundary is a serde type
that also derives `tsify::Tsify` (in core behind the opt-in feature `ts`, which only
this crate enables: the CLI reads `Overrides` and prints `Report` through the same
serde shapes, so the types stay in core and are not copied here), and crosses as
`Ts<T>`, so wasm-bindgen writes the real
TypeScript types into `midiremap_wasm.d.ts` instead of `any`. Each type declares
`missing_as_null` and `hashmap_as_object`, so the declared type and the runtime value
agree: missing notes are `null`, maps are plain objects, `Note` is `number`, `Canon`
is `string`, converted bytes are a `Uint8Array`. A field renamed in Rust changes the
`.d.ts`, and the app's `tsc` fails.

Every export but `start` returns a `Result` and throws its error as a `WasmError`, a tagged enum: `{ kind: "unknownEngine", role, id }`
(`role` is `source` or `target`), or `{ kind, detail }` for `badOverrides`,
`badMissing`, `badMidi`, `badPreset` and `internal`. It carries no English
sentence: the app translates `kind` (and `role`), and `detail` is the technical cause
chain (`outer: inner: innermost`), shown untranslated under the message.

The channel scope has no error of its own. It crosses as `ChannelScope`, a union of the
eighteen values `ChannelScope::all()` yields (a wasm test holds the union to them), and
the app's list of them in `core/channel.ts` is typed by that union, so a scope added or
renamed in Rust fails the app's `tsc`.

### Web app (`app/`)

Vite + React + TypeScript + Tailwind, tested with Vitest/Testing-Library. Reading
`.mid` bytes (`core/files.ts`) and calling the WASM (`core/midiremap.ts`) each happen in
one module, so the rest of the UI is pure data.

`app/src` is foldered by feature (`core`, `locale`, `ui`, `site`, `tip`, `engines`, `presets`,
`report`, `editor`, `convert`) and `app/test` mirrors it. Imports point one way, from the
screen down to what it is built on: `convert` on top, then `editor`, then the other features,
then `ui`, `locale` and `core` at the bottom, and no two folders import each other. The table
`ALLOWED_IMPORTS` in `app/test/structure.test.ts` states which folder may import which, and a
test in that file fails on any import outside it.

- **`core/`** — framework-free logic and the boundary. `midiremap.ts` is the sole
  WASM adapter: `moduleLoader()` makes a loader that loads the module once and resolves
  to a `Midiremap`, an object that carries every call, so nothing can call the module
  before it has loaded and no module-level state holds it; the generated types are
  re-exported, and a thrown `WasmError` becomes a `WasmCallError` (an `Error` holding
  that `WasmError`). `Note` and `Canon` are branded types generated from Rust. A `Note`
  is made only in `notes.ts` (`parseNote`, bounded by the core's note table); a `Canon`
  is never made in the app: it comes from the module, and drum keys read from storage
  stay text (`StoredEdits`) until `knownEdits` looks them up in the module's vocabulary
  (`canon.ts`) and returns `KnownEdits`, the only form the note editor loads; a preset's
  name is a `PresetName`, a brand generated from Rust like `Note` and `Canon`; a preset file's name arrives as one
  (Rust's `NonBlank`: not blank, spacing kept) and every other name is read by `parsePresetName` (not blank, spacing
  kept; the UI trims typed text first) in `presets/mappings.ts`, and a stored entry whose name does not parse is kept aside and
  quarantined like any unreadable one. Sibling pure modules cover override assembly (`overrides.ts`) and file
  naming (`files.ts`); the other features keep their own.
- **One runtime, handed in.** `convert/runtime.ts` names what the app takes from outside
  React: `Runtime { load, converter }`. `main.tsx` makes the browser's
  (`browserRuntime()`) and gives it to `App`, which hands it to `useRemapper`; no hook
  or component reaches a module-level instance. Tests hand in the same runtime over
  the stubbed module, or one whose `load` is pending or fails.
- **Conversion off the main thread.** `converter.ts` sends each batch to one module
  Web Worker. The worker entry (`convertWorker.ts`) only wires `self.onmessage` to
  `answerRequest` in `workerProtocol.ts`, which holds the request and reply types and answers
  with the shared `runBatch` of `batch.ts`, so the reply logic is tested without a worker; converted bytes come back
  as transferred buffers, so the
  page and the spinner stay responsive. The same worker fits the added files to every engine's
  layout (`Converter.fits`, a `FitRequest`; `useSourceFits` asks again when the files or the
  channel change and ignores a stale answer), which `CloserSourcesNotice` under the engine
  pickers reads to suggest a source that recognizes more of the file's notes. The worker loads its own copy of the WASM; the
  main thread's copy serves the catalog, `plan` and preset import. The worker's state
  is one value (`unstarted`, `running`, `unavailable`). A worker that dies after it has
  answered a batch is replaced and the batches it left go to the new one; a worker that
  cannot be created, or dies before answering anything, ends the use of workers, and
  those batches and every later one run on the main thread. A batch the worker could
  not convert (the WASM failed to load) is rejected and shown as an error, never
  retried or left spinning. A batch is stopped through its `AbortSignal`: the converter
  ends the worker converting it (a new one answers in about 20 ms) and moves any other
  pending batch to the next worker; on the main thread a conversion cannot be
  interrupted, so its result is discarded.
  The editor's `plan` preview stays on the main thread (it takes well under a
  millisecond); a `plan` failure (e.g. a damaged preset) becomes a notice with Reset
  edits, and anything else that throws while rendering reaches the root
  `ErrorBoundary` (Reload, Report an issue, two-step Reset saved data).
- **Screen state** (`convert/useRemapper.ts` and the hooks of each feature) — `useRemapper` is the facade the UI consumes. It composes
  `useEngineCatalog` (one `Catalog` union: loading, ready with the module and its engine list, or the error), `useConverter` (files → results),
  and `useEditor` (per-note edits, the live `plan` preview, and derived
  counts) behind a stable return contract, plus a small selection reducer
  (`convert/selectionState.ts`) for
  source/target/octave/channel/missing drums/unrecognized notes/view/open preset. An engine not chosen is `null`, and `useRemapper` derives
  the one `EnginePair` (`core/enginePair.ts`) once both are chosen; `plan`, `remap`, the converter and the
  editor take that pair, so they cannot be called without both. The `View` is `convert` or `edit` carrying the
  pair, the filter and the source note the editor opens on, so entering the editor states them and leaving drops them;
  the selection reducer opens the editor only with both engines chosen and keeps its pair current, so the editor is never
  on show without one, and `useEditorHistory` steps back off the editor's entry when Forward lands on it without a pair.
  `Conv`'s `done` arm carries the pair it converted with. `useEditor`'s result is exposed as one nested
  `editor` bundle; the editor screen owns it and hands its parts only what they read.
  Its reducer lives in `editor/editorState.ts`: edits plus one `overlay`, which is a target pick, a source pick
  (each holds only its own fields) or the notice a pick left behind; the pair's drums, notes, vocabulary and
  family order come from `useEngineData`, and a lookup that fails there reaches the editor as the same error
  as a failed `plan`.
  - Every change to what is converted (pick FROM/TO, swap, a link's pair, load a
    preset, channel, missing drums, unrecognized notes) is one `SelectionEvent` (`core/selection.ts`) that
    `useRemapper` hands to the selection, editor and converter reducers alike; each
    decides what it means (the editor drops edits when the pair changes, the converter
    goes idle and stops a running batch through its abort signal).
    Octave, view and the open preset change only the selection reducer. The session
    restore is the one place that loads edits into the editor directly: the editor
    starts empty, and when the module has loaded the session's stored edits go through
    `knownEdits` into it.
  - `usePresetActions` assembles preset payloads (save, update, duplicate, load, edit);
    `useFileIntake` takes dropped files and presets; `useSampleFile` offers the sample
    groove in the empty file area (disabled, with a hint, until FROM is chosen): it takes
    the module's `sample_file` for FROM in as `sample-<engineCode>.mid` through the same
    intake (`midi-added` with `via: 'sample'`) and, with TO chosen too, converts it at once
    (`convert` takes the files when they were added in the same event; `sample-used` says
    whether it did); `useConversionReport` builds the
    report and decides whether "drop missing drums" applies.
  - Focus after an action goes through `useFocusIntent`: a component registers a
    target with `ref(target)`, the action calls `request(target)`, and focus moves once
    the render is on screen and any closing dialog has handed focus back. There are no
    global element ids for focus.
  Persistence lives in focused hooks
  (`useSavedMappings`, `useFavorites`) and `convert/session.ts`:
  - Presets are stored as `{ version: 1, items }` (a legacy bare array reads as version
    0). Storage is written only after a user action; entries this version cannot read
    are moved to `midiremap:quarantine` on the next write, never dropped; a quarantine
    that does not parse is kept whole as one entry of the new list. The quarantine is
    write-only: nothing reads it back. A preset the browser cannot store (full or
    blocked storage) stays in the list for the session and `useSavedMappings` reports
    `unsaved` until a later change is stored; `UnsavedNotice` (`presets-unsaved`, says it will
    be gone on reload) is drawn from that state beside the status notice in the convert view
    and in the editor's footer above the save controls, so no other notice replaces or dismisses
    it. A write is skipped, and counts as unsaved, when the presets cannot be read, so entries
    never quarantined are not written over. `onStoredChange` reloads presets and favourites
    when another tab changes them, so tabs stay in sync.
  - `core/storage.ts` is the only module that reaches `localStorage` (eslint rejects it
    elsewhere in `src`). It owns the `midiremap:` prefix and the closed `StorageKey` set
    (`session`, `missing`, `mappings`, `quarantine`, `locale`, `locale-offer`, `tip`,
    `favorites:from`, `favorites:to`); `storedName` gives the stored name, and a test pins
    each one. `writeStored` says whether the value was saved; `readStoredStrict` tells a blocked
    read from an empty one (`'blocked'` or `{ value }`), `readStored` treats both as null, and
    `onStoredChange(key, changed)` is the one `storage` event subscription.
  - The session (`midiremap:session`, versioned) keeps engines (the empty string for one not chosen), octave, channel,
    missing drums, unrecognized notes (a session saved before that setting reads as `remove`), the open preset id and unsaved edits; `EMPTY_SESSION` is the one place the starting settings are stated; `useRemapper` restores it on
    load and saves every change. When the catalog loads, a link's `?from/&to` pair
    wins (dropping edits made for another pair), unknown engines are cleared and
    unknown drums in restored edits are left out. Until it has loaded, the session's
    stored edits are written back unchanged, so a reload or a failed load loses none.
  - Loading a preset leaves out edits for drums this version does not know and says
    so; presets export to `<name>-drumverter.json` and import from any `.json` file (import parses
    through the WASM `parse_preset_file`).
- **Components** — the converter card (engine pickers, file chips, convert
  button, summary), the note editor (`EditView` + note/source pickers), and shared
  controlled-overlay modals (guide/FAQ/issue/contact/terms, loss report). The header
  and footer (`SiteHeader`, `SiteFooter`) frame every view; the footer's links go to
  the site's pages and open the same text in a modal on a plain click. Overlays use
  Floating UI throughout, the open dialog's plumbing (focus on open, focus back to the
  opener, Escape, press outside) being the one hook `ui/useDialog.ts` (two prop groups to spread, `focus` and `panel`): `Modal` (focus trap, scroll lock, Escape and backdrop close,
  focus back to the opener; closed, its content stays in the page, hidden, for
  crawlers), `PickerShell` (the note pickers: focus in, Escape or a press outside its
  row closes, focus back; the row is its `OverlayAnchor`), menus and tooltips. The
  editor's parts live in `editor/`; the pickers share `PickerHeader.tsx` (the title line)
  and the note pickers `KeyboardPane.tsx` (the octave tabs over the piano). A file made in memory reaches the
  browser through `core/download.ts` `saveBlob`, which frees its address after ten
  seconds; the accepted file extensions are listed once, in `core/files.ts`. A structure test keeps every source file under `src`
  within 250 lines; the style test keeps arbitrary text sizes and radii, raw
  `rgba(` and `shadow-[` out of `src` (shadows are `@theme` tokens in `index.css`).

Edit preview and downloaded output share one source of truth: the editor's rows
come from the core `plan`, built from the same `Mapping` the converter uses, and a
core test checks per-row target notes against the converted file for every builtin pair.
The loss report labels substitutes from the target note recorded during
conversion, not from the live rows. The drum channel picker beside the octave
picker (Auto by default, not saved with mappings) is passed to every conversion;
notes it leaves alone are shown on the done card and in the report as unchanged,
not as loss.

### Static site (`midiremap-site`)

`npm run build:site` builds the app, then generates `/engines/`, one page per engine,
one per pair of the eight popular engines, and one per content section into `dist/`.
The pages link the app's own built stylesheet (named in `dist/site.json`); Tailwind
scans the askama templates through `@source`, so both surfaces share one set of tokens
and utilities. Octave naming and "Changes only" on pair pages are CSS-only radios; the
scripts are the filters on the engine and index pages (`/filter.js`) and the language
choice on every page (the app's `src/locale/staticPagesEntry.ts`, built as its own small entry). FAQ, How to use, Report an
issue, Contact and Terms are the documents in `locales/<code>/docs.json`, which
also feed the app's modals; their FAQPage / HowTo schema is written on `/faq/` and
`/how-it-works/`. The generator also writes the converter shell: the marked regions of
the built `index.html` (`<!--app-head-->`, `<!--app-noscript-->`, `<!--app-title-->`) get
the title, descriptions, social cards, the SoftwareApplication block, the no-script text,
the hidden load-failure notice and a visually hidden `<h1>` inside `#root` (for crawlers
that run no script; React replaces it on mount) from the locale's messages; the markers stay, so a second run rewrites the
same regions. On every page the skip link, header and footer links sit in
`data-nosnippet` blocks, so search results quote the page, not its chrome. Besides the
stylesheet, each page takes what the app's build writes to `dist/site.json` (emitted by a
plugin in `vite.config.ts`, typed by `scripts/siteManifest.ts`, read by the generator's
`manifest.rs` (`SiteManifest`, together with the converter's `index.html`) with `serde`; a
missing `index.html` or `site.json`, or a malformed one, stops it with "run the app build first"): the content
security policy (defined once in `vite.config.ts`, injected into the build only), the
Cloudflare Web Analytics beacon and the Umami script (data in `vite.config.ts`, injected
into the converter's `index.html` by a plugin and written by the templates on the static
pages), and the locale script with the chunks it imports, so every page states the same policy
and counts visits the same way. `site.json` is build data, not a page: no sitemap lists it. The filter script is `/filter.js`, not inline, so the policy needs no
`'unsafe-inline'`. Links and chrome
that both surfaces draw are `@utility` classes in `index.css` (`prose-link`,
`nav-link`, `skip-link`, `brand-mark`), used by the React components and the templates
alike. Pair-page rows take their status from the core (`PlanStatus` of each source
note's resolution); the site only names it (exact / approximated / dropped) and sorts
changes first.

Tips go through Stripe Payment Links, listed once in `content/tip.json` (the
app imports it; `build.rs` turns its `other` link into `TIP_HREF`). Every footer ends
with a `tip-link` to the any-amount page; the app's tip toast (`TipToast`), pinned to the top of the
screen, offers the fixed amounts. `src/tip/tipAsk.ts` decides when, from one
`localStorage` record shared by every tab: never on a visitor's first two saved files, then
at most once a day, and not for 90 days after a tip link is chosen. All are plain links in a new tab, so no
Stripe code loads here. Stripe returns the visitor to `/thanks/`, rendered in every
locale, marked `noindex` and left out of the sitemap.

## Translations

Sources, one owner per text:

- `locales/locales.json` — the 11 locales in menu order (code, URL prefix, language tag,
  native name, system fonts): en, es, pt (`pt-BR`), de, ja, fr, ru, pl, it, zh
  (`zh-Hans`), ko. ja, zh and ko use system font stacks.
- `locales/<code>/app.ftl` — every message the converter app shows, in
  [Fluent](https://projectfluent.org/) syntax; `en` is the reference. The app bundles it
  and the site reads it too.
- `locales/<code>/site.ftl` — the messages only the site generator reads (page titles and
  descriptions, the note-map, conversion and drum-map pages, the converter shell's head,
  no-script text and load-failure notice, the thanks page), kept out of the app's bundle.
  A message lives in one of the two files, the one English puts it in. `locales/GLOSSARY.md` holds the shared rules (what is
  never translated, tone); `locales/<code>/GLOSSARY.md` each language's terms;
  `locales/<code>/same-as-english.txt` the messages meant to read exactly as in English.
- `content/structure.json` — the route paths (`routes`: the converter's `/` and the note
  maps' `/engines/`), section keys and slugs, and the nav and footer as targets
  (`{ route: "converter" | "noteMaps" }` or `{ section }`). `midiremap-site/tests/golden/nav-links.json`
  records the address every nav and footer link has in every locale; a test in
  `routes.rs` and one in `app/test/site/site.test.ts` each build that table from their own
  `href` and compare it with the file.
- `locales/<code>/docs.json` — the guide, FAQ and legal documents, by section.
  Every locale has every section; a locale without one would link to the English page.

Generated, never committed: `midiremap-site/build.rs` (with `fluent-syntax`) writes
`Locale`, `SectionKey` and `MessageId` (with each message's variables and file) into `OUT_DIR/i18n.rs`, and
`NavTarget`, `NAV`/`FOOTER` and the two route paths (`CONVERTER`, `NOTE_MAPS`) into `OUT_DIR/routes.rs`, which
`src/routes.rs` includes beside `SitePath` / `LocalPath` (an address before and after a locale prefix),
`href` and `label`; `npm run gen:i18n` (`app/scripts/gen-i18n.ts`, with
`@fluent/syntax`) writes the same types to `app/src/generated/i18n.ts` (with `ROUTE_PATHS`), the locale codes alone to
`localeCodes.ts` (all the static pages' script loads of the table), plus
`lang.css` (`:lang()` rules setting the sans, display and mono stacks) and `TRANSLATED_SECTIONS` (the keys of each
locale's documents). A nav target naming an unknown section fails both
generators; a section missing its label or heading message fails `tsc`,
and one missing any of its four (those, the title and the description) fails the site crate's build.

Runtime: a `Translator` (`src/locale/i18n.ts`) holds a locale, its `t(message)` and its
documents. `t` formats a `Message` — `{ id }`, or `{ id, args }` with exactly the variables
`en` declares, checked by `tsc`. English is bundled (`ENGLISH`); `loadTranslator(locale)`
loads another locale's `.ftl` and `docs.json` together as lazy chunks
(`assets/locale-<code>-messages-*.js` and `-docs-*.js`, named by
`scripts/localeChunk.ts`, budgeted per file apart from the app's JS). `LocaleProvider` holds
the current translator in a React context; components read `useT()` / `useLocale()`, so a
language change re-renders text in place and keeps every other state.

- Start (`main.tsx`): the address names the locale (`src/locale/locale.ts`, the only reader of
  `location.pathname`). On `/`, the stored choice, or with none the first browser language
  the site speaks (`locale/detect.ts`: same language and script by `Intl.Locale.maximize`, so
  `pt-PT` finds Português but `zh-TW` does not find Simplified Chinese), is loaded and the address replaced
  (`history.replaceState`, query and hash kept) — no redirect, no reload. If that chunk fails, `/` stays
  English. If the address's own locale fails, the shell's `#load-failed` notice shows.
- Switch: the header's globe menu (`LanguageMenu`, an HTML `popover`) holds plain links to
  each converter; a plain click switches in place,
  stores the choice (`midiremap:locale`, `locale/locale.ts`) and `pushState`s the
  locale's converter URL. The latest request wins; Back/forward switch in place. A failed
  load keeps the current language and shows a "couldn't load" line in the header.

Library code returns
`Message` values, never English strings; components call `t`. Errors are `AppError`
(`WasmError` or `wasmUnavailable`); `toAppError` is the one conversion from anything
caught, and `ErrorText` shows the translated line with the untranslated `detail`.

The site formats with `fluent-bundle` over both files: `Messages::load` proves every
locale's `app.ftl` and `site.ftl` hold every English id, each in the file English puts it
in, with exactly its variables, and no id in both; `href(target, locale, docs)` links a
section to the locale's page, or to the English page when the locale lacks it;
`local_href` points a document's internal link at the same page in the reader's
language. `Messages::format` fills a message's variables (Fluent plurals included) for
the note-map pages. The parity test checks every locale's documents keep English's block shapes and links, and
that every locale translates the guide and FAQ.

The generator writes, per locale, a converter shell (`/`, `/pl/`, …), the note-map index,
engine and pair pages (`/pl/engines/…`, `/pl/convert/…`) and the translated sections
(`/pl/faq/`), each with `<html lang>` and `hreflang` alternates for exactly its versions
plus `x-default`. Engine and drum names stay as the engines name them. Every static page carries the same language menu as the app
(plain links: `page_in` gives the same page in a locale, or that locale's converter). The
sitemap lists every URL with `xhtml:link` alternates. `src/locale/staticPagesEntry.ts` (a two-line entry over
`staticPages.ts`) stores the
choice when a language link is clicked. With a stored choice, a page that exists in that
language replaces itself with that version (`location.replace`); with none, it shows a
dismissible offer of the same page in the browser's language, matched by the same
language-and-script rule as `locale/detect.ts`: the script imports `locale/language.ts`
(`sameLanguage`), `core/storage.ts` and `locale/languageChoice.ts` (the stored language choice) rather than copying them, and none of
them imports the locale table, so a static page loads about 650 B gzipped in two files (the
entry and the chunk it shares with the app, which the templates `modulepreload`).

Fonts: the display stack falls back to IBM Plex Sans, whose Cyrillic subset draws Russian
headings (Space Grotesk has no Cyrillic); ja, zh and ko replace all three stacks with the
system fonts and load no web font. English pages load the same font files as before.

Guards beyond parity: `test/untranslated.test.ts` fails when a message reads exactly as in
English unless its locale lists it in `same-as-english.txt`; `e2e/layout.spec.ts` walks the
converter's states (empty, language menu, file loaded, editor, done, report, each footer
document) and six static pages in every locale, on desktop and phone, and fails on
horizontal page scroll or text cut off by its box (`e2e/layout.ts`). The pseudo-locale
`en-XA` (English accented, lengthened and bracketed by `pseudo-localization`) runs the
converter walk by serving itself in place of `/pl/`'s messages chunk; it exists only in the
test.

Lint: `i18next/no-literal-string` rejects literal text in JSX and in text props; symbols,
"Drumverter", "MIDI" and ".mid" are allowed.

## Design rules (enforced)

- **Pure core.** All logic is I/O-free and unit-tested; the outer crates own bytes
  and presentation.
- **Make invalid states unrepresentable.** `Note`, `Idx<MAX>` / `CymSlot`, the
  `Resolution` / `CanonResolution` split, and exhaustive `Canon` matches remove
  whole classes of error instead of documenting them.
- **Concrete types, no single-implementation traits.** One conversion entry point
  (`convert`), one catalog type, one mapping type.
- **Standard crates over hand-rolled** parsing, error handling, and serialization.
- **One gate.** `cargo xtask gate` (the `xtask` crate) runs every check and owns every
  check's flags: fmt (on the nightly named in `nightly-toolchain`), clippy (`-D warnings`)
  and tests, both `--locked`, run once over the crates as they ship (the workspace without
  `midiremap-wasm`, so core is built without `ts`, as the CLI and the site generator link
  it) and once for `midiremap-wasm` (core with `ts`), the two at the same time, each cargo
  pass in a target directory of its own (`target/clippy`, `target/clippy-browser`,
  `target/browser`; the shipped tests share `target/` with the wasm build); tests skip
  doctests (there are none);
  the i18n types, the wasm build,
  eslint, tsc, vitest, the app build, the site build, size budgets and Playwright, the app's
  through their npm scripts without the pre-hooks. The site generator compiles at the start
  in its own target directory (`target/site`), and the site build runs that binary, so the
  chain to the browser tests never waits for cargo's lock behind clippy or the tests. The
  steps are an enum that names what each one needs, what it holds while it runs and how
  urgent it is. A step holds its cargo build directories, which cargo would lock anyway;
  the unit and the browser tests both hold the test workers, since each spreads over most
  of the cores and gigabytes of memory, so they take turns. A step starts as soon as its
  needs have passed and no running step holds what it holds (the longer chain to the
  browser tests first). The chain to the browser tests (the i18n types, the wasm build, the
  site generator, the app and site builds, the unit tests just before them, the browser
  tests) runs at normal priority, every other step below normal (the Windows process class,
  `nice` elsewhere, inherited by cargo's and npm's children), so the Rust checks, eslint and
  tsc take only the CPU that chain leaves. The unit tests take every core and the browser
  tests three quarters. A check keeps its pass: its fingerprint hashes the toolchains
  (rustc, node, the nightly), its source files (what `git ls-files` lists under its paths,
  untracked ones included) and the build outputs it reads (`app/src/generated`,
  `app/src/wasm`, `app/dist`), and a check whose fingerprint passed before reports `cached`
  instead of running (`target/gate/passes.json`). The app build and the site build, which
  write `app/dist` one after the other, keep one pass between them: both are skipped while
  what they read (the app's sources, the generated types and wasm, the site generator
  binary, so the app build waits for that to compile) and `app/dist` as the site build left
  it are unchanged, which the site build records. The other builds always run; cargo and the
  wasm script skip their work themselves when nothing changed. `--fresh` runs every check
  and build and keeps the new passes; the quick gate reads the kept passes and keeps none; CI
  neither reads nor keeps them. On 16 threads (2026-10-20) the whole gate took 105 s with
  everything run and 3 s with nothing changed, against 243 s before passes were kept, the
  steps ranked and the unit tests moved to happy-dom. A step whose need failed is
  skipped. It takes groups (`rust`, `app`, `dist`) or single steps as
  arguments; a partial run adds the i18n types and the site generator when a chosen step
  needs them and takes the other builds as done. Each run writes a log per step and
  `timings.json` (each step's start and duration) to `target/gate/`. `cargo xtask
  gate --quick` is a local shortcut, never CI: every step but the size budgets, the unit
  tests of changed files (`vitest --changed`), the changed browser test files on the
  desktop only (and the app and site builds only when there are any), and the wasm module
  with thin LTO, which is larger than the shipped one. Each CI job runs one
  group (`rust`, `app`, and `dist` after the build), on every push to `master` and every
  pull request, and a push deploys only when all pass; CI differs only in how it builds (the
  wasm module from a cache, the site generator as a cached release binary). Both jobs that
  need the app set it up through the composite action `.github/actions/app-with-wasm`.
- **Nothing third-party without a reason.** Fonts are self-hosted (`@fontsource`,
  variable Space Grotesk and IBM Plex Sans, IBM Plex Mono 400/600 — the faces the pages
  load). The only outside origins are cookieless analytics: the Cloudflare beacon (visits)
  and Umami (`data-domains` keeps local and test runs out). The CSP allows only them,
  `'self'` and `'wasm-unsafe-eval'`, and the e2e suite aborts their requests and fails on
  any other.
- **Analytics are anonymous, closed and typed.** Umami counts the events of
  `StatEvents` (`core/umami.ts`: each event name with exactly its properties, so a wrong
  name, a missing or extra property or a value outside its set does not compile) and page
  views, nothing else. What is sent: event names, engine ids, locale codes, error kinds,
  counts, booleans and values from closed sets. Never sent: file names or contents,
  preset names, typed text (filters, names), the free-text detail of an error, note
  numbers. Two modules: `core/umami.ts` is the typed sender `send(event, props)` (the
  `window.umami` call, no table), and `core/stats.ts` is `track` for the app: it gives
  every event the app sends a tier (1 funnel, 2 feature use, 3 detail; `TIER_OF`, typed
  over `AppEvent`, so an app event without a tier does not compile and an event only the
  static pages send does not pass `track`) and `ENABLED_TIERS` says which tiers are sent,
  so one constant turns a tier off. The note editor reports once, on closing
  (`editor-closed`: `targets` and `sources` count the notes whose edit differs from what
  it was when the editor opened, `keyboard` and `list` the target picks by how they were
  made; its tally is kept by `editor/editorTally.ts`); `presets-unsaved` is sent once per
  page load. `converted`, `file-failed` and `convert-failed` are sent by `run` in
  `convert/useRemapper.ts` from the outcome `useConverter` returns; `load-failed` is sent
  by the engine catalog (the module failed to load) and by `main.tsx` (kind `locale`: the
  page's language failed to load). The static pages load only `core/umami.ts`
  (`StaticOnlyEvent` names the four events only they send; `language-picked` from a static
  page also goes through `send`), so those sends are outside the tier switches and their
  script carries no table: `converter-opened` is markup alone
  (`data-umami-event` and `data-umami-event-page`, `-from`, `-to` on every link into the
  converter, written by the templates; the page kind comes from `PageKind` in
  `render.rs`), `maps-filtered` is sent by `filter.js` on the first input to a list filter
  (the page kind from its `data-page`), and the language offer and a language picked from
  a static page's menu are sent by `locale/staticPages.ts` (the offer on the window `load` event, once the Umami tag has run; the answers and the pick before the link navigates).
  `test/siteEvents.test.ts` reads the templates and scripts and fails on an event or
  property the map does not have.
- **Budgets and audits.** `npm run size` fails the build when gzipped wasm, JS or CSS, or
  the latin font files, or the largest locale chunk, or the script a static page loads, grow
  past `scripts/check-size.ts`'s budgets. `audit.yml` runs `cargo deny` (advisories, licences, sources; `deny.toml`) and
  `npm audit` on every push to `master`, every pull request and weekly; Dependabot proposes updates; every action is pinned to a commit.
- **Changed pages get a new date and an IndexNow ping; others keep theirs.**
  `scripts/indexnow.ts` hashes each sitemap page (asset file names blanked), compares
  with the live `page-hashes.json`, writes each page's `<lastmod>` into `sitemap.xml`
  (the live date if unchanged, the deploy day if new or changed), publishes the hashes
  with their dates, and submits the changed pages to IndexNow. Only a missing live file
  (404) counts as "nothing published yet"; any other failure to read it fails the deploy
  rather than redating every page. It runs on deploys only, so the Rust generator's
  sitemap stays date-free and reproducible.
- **Browser behaviour is tested in a browser.** `app/e2e` (Playwright, Chromium desktop
  and a Pixel 7 profile) runs against the built site in CI before deploy: conversion
  through the real WASM, keyboard walk and focus, drag and drop, the report dialog,
  tap-target sizes, and the static pages' filters and toggles. Any console error
  fails a test.
