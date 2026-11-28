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
it as unmapped either way, with its fate: removed, kept on a number the target leaves
free, or kept onto the target drum that plays on its number
(`Mapping::kept`).

The **missing drums** setting (`MissingDrums`) decides how far the chain may reach:
`Nearest` (the default) takes the first entry the target plays, which may be another
drum (a China on a crash, Tom 4 on Tom 3); `Drop` keeps only entries on the same drum
(`Canon::same_drum`: a rimshot still becomes a snare hit), else drops the hit.

## Workspace

Twelve crates, a web app, and embedded engine presets:

| Component | Role | Depends on |
|-------|------|------------|
| `midiremap-core` | Pure engine. No I/O beyond parsing bytes handed to it. What a file plays, the conversion, the files for other programs, and the facade: the one crate the CLI, the WASM and the site depend on. | kit, mapping, note, smf, `midly`, `plist`, `quick-xml`, `uuid`, `serde`, `serde_bytes`, `serde_json`, `strum`, `thiserror` (`flate2` behind the feature `gzip`; `tsify` and `wasm-bindgen` behind the feature `ts`) |
| `midiremap-mapping` | One engine pair compiled into where each note and drum lands, and the all-pairs proofs. | kit, note, `serde`, `strum`, `thiserror` |
| `midiremap-kit` | The drum vocabulary (`canon`), the spreads (`spread`), each engine's note table and the catalog (`engine`), `NonBlank`. | idx, note, `serde`, `serde_json`, `strum`, `thiserror` (`toml` at build time and behind `testing`) |
| `midiremap-smf` | A MIDI file as bytes, tracks and channels (`midi`), and its parts (`parts`). | idx, note, `midly`, `serde`, `thiserror` |
| `midiremap-note` | `Note`, `OctaveBase` and note names. | `serde`, `strum`, `thiserror` |
| `midiremap-idx` | `Idx<MAX>`, a 1-based position in `1..=MAX`. | `serde`, `thiserror` |
| `midiremap-cli` | Offline `convert` / `list` binary. | core, `clap`, `anyhow` |
| `midiremap-wasm` | Browser bindings for the web app. | core (feature `ts`), `wasm-bindgen`, `tsify`, `serde`, `serde_bytes`, `console_error_panic_hook` |
| `app/` | Vite + React + TypeScript converter UI over the WASM bindings. | Vite, React, Tailwind, Vitest |
| `midiremap-site` | Static SEO pages (engine note maps, pair tables, drum maps, FAQ / guide / legal pages) in the app's style. | core (feature `gzip`), `askama`, `fluent-bundle`, `fluent-syntax`, `clap`, `serde`, `serde_json`, `thiserror` (`fluent-syntax`, `heck`, `serde` in `build.rs`) |
| `midiremap-testkit` | Test-only: builds and reads small SMFs (channels `1..=16`) and engine maps for the other crates' tests; a key, channel or delta out of range panics. | `midly`, `serde_json` |
| `midiremap-layers` | Test-only: reads which module of a crate uses which (on `syn`) and lists every use outside a table of allowed uses; the site checks itself with it. | `syn`, `proc-macro2`, `walkdir` |
| `xtask` | `cargo xtask gate`: every check, scheduled over the steps' needs. | `cargo_metadata`, `clap`, `anyhow`, `blake3`, `walkdir`, `serde`, `strum` |
| `engines/*.toml` | Preset note↔canon maps; kit's `build.rs` converts them to one embedded JSON table. | — |

Outside tests only `midiremap-smf` (its `midi` folder and `parts/scan.rs`) and core's
`convert/rewrite.rs` and `files/sample.rs` name `midly`, and nothing in the engine crates reads
a file; the CLI, WASM, and app layers own all real-world I/O and presentation.

## Core crates

The engine is six crates: two sides and one crate on top of them. The **drum side**
(`midiremap-kit`: `canon`, `spread`, `engine`; `midiremap-mapping`) knows drums and notes and
never names `midly` or a MIDI event. The **MIDI side** (`midiremap-smf`: `midi`, `parts`)
knows files, tracks and channels and never names a drum. **`midiremap-core`** (`inspect`,
`convert`, `files`, `xml`) is the only crate that uses both. Under them all sit two
one-concept crates, `midiremap-idx` and `midiremap-note`; `NonBlank` lives in kit, its first
user.

```
          midiremap-cli   midiremap-wasm   midiremap-site
                    \          |          /
                         midiremap-core            (inspect, convert, files, xml, facade)
                        /       |       \
          midiremap-mapping     |     midiremap-smf      (midi, parts; midly)
                   |            |        /     \
             midiremap-kit -----+       /       \        (non_blank, canon, spread, engine)
               /        \              /         \
   midiremap-idx <-------\------------+           |
                          +---- midiremap-note ---+
```

| Crate | Uses (workspace) | Dev-dependencies (workspace) |
|---|---|---|
| `midiremap-idx`, `midiremap-note` | nothing | none |
| `midiremap-kit` | idx, note | note (`testing`), testkit |
| `midiremap-mapping` | kit, note | kit (`testing`), note (`testing`) |
| `midiremap-smf` | idx, note | note (`testing`) |
| `midiremap-core` | kit, mapping, note, smf | kit (`testing`), note (`testing`), testkit |

Cargo holds these edges: kit cannot name the mapping, smf cannot name a drum, kit and the
mapping cannot name `midly` or a MIDI event, and nothing below core can name `inspect`,
`convert` or `files`. It does not hold the order of the folders inside one crate. That order
is written in the rustdoc of each crate's `lib.rs` and held by review:

| Crate | Order, lowest first |
|---|---|
| `midiremap-kit` | `non_blank`; `canon` → `spread` → `engine` |
| `midiremap-smf` | `midi` → `parts` |
| `midiremap-core` | `xml`; `inspect` → `convert`; `files` (uses `xml`, not `inspect` or `convert`) |

Each folder's `mod.rs` declares its files privately and re-exports what other folders and
crates use, so they write `midiremap_mapping::Outcome` or `crate::canon::Canon`, never a path
into a file; the one exception is `canon::rules`, which only the proofs read.

**Features.** `midiremap-note` and `midiremap-kit` have a feature `testing` that adds test
helpers and nothing else (`n`; `k`, `canon::rules`, `engine::from_toml` and the kit
accessors the proofs read). Only dev-dependencies enable it, so no shipped build has it.
Each engine crate but idx has a feature `ts` (the `tsify` derives); core's `ts` forwards to
kit, mapping, note and smf.

```
midiremap-idx/src/lib.rs     ── Idx<MAX>: a 1-based position in 1..=MAX
midiremap-note/src/lib.rs    ── Note (0..=127), OctaveBase, note names

midiremap-kit/build.rs       ── engines/*.toml → one embedded JSON table
midiremap-kit/src/
   lib.rs          ── the four folders, public; their order in its rustdoc
   non_blank.rs    ── NonBlank: a string that is not blank
   canon/          ── Canon (opaque), Canon::all, the named drums, CORE_KIT, same_drum
      ├── slot.rs        ── Slot, its part enums and positions (TomPos, CymSlot, Rung, OpenLevel, …)
      ├── key.rs         ── the dotted key: Display, FromStr, serde
      ├── label.rs       ── each drum's label, CanonEntry
      ├── family.rs      ── Family, declared in display order
      ├── piece.rs       ── Piece: the part of the kit a drum is
      ├── fallback.rs    ── fallback_chain: the stand-in rules
      └── rules.rs       ── (tests, `testing`) the agreed rule table
   spread/         ── Kit, Spreads, SpreadStroke: where a pair's spreads play each tom and cymbal stroke
      ├── toms.rs        ── TomKit, TomSpread
      ├── cymbals.rs     ── CymbalKit, CymbalPlace, CymbalSpread, the three steps over Placed
      ├── assign.rs      ── SpreadPos, Places, Aim, spread(): the least-cost ordered assignment
      └── landings.rs    ── Landings, Moved: where each place landed, and which moved
   engine/         ── one engine's notes, and every engine
      ├── map.rs         ── EngineMap, Drum, EngineId, MapError, reading a map
      ├── ladder.rs      ── HatLadder: the main hi-hat's rungs, loose and open, per zone
      └── catalog.rs     ── Catalog: the built-in presets and user maps

midiremap-mapping/src/
   lib.rs          ── Mapping: the stages composed, and its readers; Destination
   route.rs        ── Route, Routes                                   (stage 1)
   drums.rs        ── DrumTable and its one land()                    (stage 2)
   chain.rs        ── resolve, resolve_on: one drum against one note lookup
   outcome.rs      ── Outcome { Direct(Landing) | Fallback(StandIn) | Dropped }
   settings.rs     ── MissingDrums, Unrecognized
   overrides.rs    ── Overrides: edits to either side, as two maps
   preview.rs      ── VoicePlan, Mapping::preview: per-drum rows for the editor
   proofs/         ── (tests) the all-pairs proofs: chains, pairs, open hats, toms, cymbals, gaps
midiremap-mapping/tests/golden/  ── rules.txt, known_gaps.txt: what the proofs compare with

midiremap-smf/src/
   lib.rs          ── the two folders, public; their order in its rustdoc
   midi/           ── a MIDI file as bytes and events
      ├── codec.rs       ── parse / write (midly), Parsed, CodecError, Damage
      ├── track.rs       ── TrackNo, END_OF_TRACK, track_at
      ├── meter.rs       ── Tick, Bar, Position, Meter: a track's ticks as bars
      ├── channel.rs     ── Channel (Idx<16>), ChannelFilter
      └── event.rs       ── NoteEvent (Touch, Release), hit(), channel and note wire converters
   parts/          ── the parts of a file and what a selection selects in it
      ├── part.rs        ── Part, Parts, PartSet
      ├── selection.rs   ── Selection, ChannelScope
      ├── scan.rs        ── PartIndex: a file's parts, read once
      ├── choose.rs      ── choose (judged by HitFate) → Choice, AskReason, TrackFilters, hit_notes
      └── error.rs       ── ConvertError

midiremap-core/src/
   lib.rs          ── the facade: re-exports only, the public API; the folders' order in its rustdoc
   xml.rs          ── the one XML writer (quick-xml), public: the site writes its sitemap with it
   inspect/        ── what a file plays, without converting it
      ├── hits.rs        ── NoteHits (and its played notes), note_hits
      ├── summary.rs     ── PartSummary, Plays, part_summaries, auto_question (Known → AutoQuestion, QuestionReason)
      ├── fit.rs         ── SourceFit, Lacks, first_above (the ranking key, one home; crate-private but Lacks)
      └── advice.rs      ── source_advice → Advised { source, target, advice: SourceAdvice }, Lacks
   share.rs        ── Share, Fraction (crate-private): a part of a non-empty whole, compared without division
   convert/        ── convert(bytes, &Mapping, Selection) → Conversion (Done | Ask)
      ├── rewrite.rs     ── rewrite(): one pure step per event, Voicing (voice table, merge, retrigger), DeltaFold
      └── report.rs      ── Report, FallbackTally, Unmapped: what a conversion did with each hit; Loss (read, lost, is_heavy)
   files/          ── files for other programs
      ├── preset.rs      ── parse_preset: the preset file the app exports and the CLI reads
      ├── sample.rs      ── sample_file: a two-bar groove on the notes one engine plays
      └── daw/           ── Daw and its Format registry
             ├── formats.rs ── Reaper, Cubase and Studio One drum maps
             ├── logic.rs   ── the Logic Pro Step Sequencer template
             ├── ableton.rs ── rack_file, RackFile, the note-name rack
             ├── file.rs    ── FileStem
             └── packing.rs ── Packing { Text | Gzip }
```

Every concept is one concrete type or function. The one trait, the crate-private
`SpreadPos`, lets one assignment serve both spreads.

**Public surface.** The CLI, the WASM and the site depend on `midiremap-core` alone. Every
module of core but `xml` is private; its root re-exports the API they use (`Canon`,
`Catalog`, `EngineMap`, `Mapping`, `Outcome`, `resolve_on`, `convert`, `Report`, `Channel`,
`ChannelScope`, `Daw`, the preset and error types) from its own folders and the crates below
it. The crates below make public what the crates above them use, and every crate has
`#![warn(unreachable_pub)]`, which keeps anything else from becoming public by accident. No
`midly` type appears in a signature reachable from `midiremap-core`: smf's conversions
between `Channel` and `midly`'s `u4` are the functions `channel_from_wire` and
`channel_wire`, which core does not re-export, and `Parsed` keeps its fields private behind
`smf()` and `into_parts()`. Errors keep their causes as `source()`
(`CodecError`, `MapError::Parse`, `PresetError::Parse`); the CLI prints the chain through
anyhow and the WASM joins it into one message (`outer: inner`).

### `note`, `idx`, `non_blank` — checked values

- `Note` (`midiremap-note`): a MIDI note number that is always in `0..=127`. It deserializes
  from a plain number, rejecting anything larger. Every note in the engine — engine maps,
  edits, the mapping, the report and the preview — is a `Note`. smf's `midi/event.rs`
  converts it to and from `midly`'s `u7` (`note_from_key`, `note_key`), so
  `midiremap-note` does not name `midly`.
- `Note::name(OctaveBase)` names a note (`F#2`) and `Note::octave(OctaveBase)` numbers
  its octave; `OctaveBase::{C1, C2}` (`OctaveBase::ALL`) is the octave convention. The
  site calls them directly. The app reads a table of them: its wasm build calls the
  module's `note_naming` and writes the result to `app/src/wasm/note_naming.json`, which
  `core/notes.ts` imports, so the app names notes before the module has loaded and holds
  no naming rule of its own.
- `Idx<const MAX: u8>` (`midiremap-idx`, shared by `canon` and `Channel`, which must not see
  each other) holds a 1-based position that is always in `1..=MAX` (`SnareIdx = Idx<2>`,
  `RackIdx = Idx<8>`, `FloorIdx = Idx<4>`, `OpenLevel = Idx<6>`, …). Every valid range is
  written once, as a type, so an out-of-range slot cannot be constructed.
- `NonBlank` (kit's `non_blank.rs`): a string that is not blank, for an engine's short name
  and vendor and a preset's name.

### `canon` — the hub vocabulary

- `Canon` is an opaque `Copy` value over a crate-private hierarchical enum `Slot`
  (`canon/slot.rs`), whose variants carry sub-enums and bounded positions: `Kick(KickKind)`,
  `Snare(SnareIdx, SnareArtic)`, `Tom(TomPos, TomArtic)`, `Hat(HatOpen, HatZone)`,
  `Aux(AuxIdx, HatOpen, HatZone)`, `Cymbal(CymSlot, CymArtic)`, `Ride(RideIdx, RideArtic)`,
  `Perc(PercKind)` and `Hand(HandDrum)`. Only `canon`'s own files see the `Slot`; the rest
  of the core names drums by key, by `Canon::all()`, by the named constants (`Canon::KICK`,
  `SNARE`, `CLOSED_HAT`, `CRASH`, `RIDE`, `CORE_KIT`), or through accessors that read one
  kind of drum (`tom()`, `cymbal()`, `rung()`).
- A hi-hat's opening carries a `Rung { Loose | Level(OpenLevel) }` for every opening past
  closed: `Rung::all()` lists them from the least open, `distance` counts loose as level 0.
  `Canon::rung()` reads the main hi-hat's rung and zone, `at_rung` moves it to another.
- `CymSlot { Crash(Idx<6>) | China(Idx<3>) | Splash(Idx<3>) | Stack(Idx<4>) | Bell(Idx<2>) }`
  gives each cymbal kind its own range.
- `Canon::family() → Family`. `Family` (`canon/family.rs`) is declared in display order
  (`Kick, Snare, Toms, Hi-Hat, Cymbals, Percussion, Aux`, `Family::ALL`) and serializes
  as its label; the app and the site both group drums by it, so the order lives here
  only. `CanonEntry` (`canon/label.rs`) is a drum as people read it (canon, label,
  family); its one constructor is `From<Canon>`, so its label and family always belong to
  its canon.
- `Canon::piece() → Piece` (`canon/piece.rs`) is the part of the kit a drum is, whichever
  way it is played; the Logic template picks each row's icon by it.
- Each `Canon` displays and serializes to a stable **dotted lowercase key**
  (`canon/key.rs`; e.g. `kick.main`, `snare1.hit`, `tom.rack1.hit`, `hat.closed`,
  `crash.1.bell`, `ride.1`); these keys are the contract shared with the presets, the
  edits, and the web app (where `Canon` is a branded string).
- `Canon::all()` is every slot, built once. `FromStr` is a lookup table built from
  `all()` and `Display` (plus the alias `ride.N.bow`), so every key round-trips by
  construction.
- `Canon::fallback_chain()` (`canon/fallback.rs`): the ordered, nearest-first list of
  alternatives to try when a target cannot play a slot.
- The part enums (`SnareArtic`, `CymArtic`, …) derive `strum::VariantArray`, so
  `all()` enumerates them without hand-kept lists; tests check through
  `strum::EnumDiscriminants` that `all()` reaches every variant of `Slot`, `HatOpen`,
  `TomPos`, `CymSlot` and `HandDrum`.

**Fallback rules.** A chain first lists the strokes of the same drum that may stand in
(`variants`, explicit allow-lists: a fancy stroke falls to a plain one, never the
reverse; hi-hats keep closed with closed and open with open, foot with foot, and never
fall onto the bell), then walks breadth-first to other drums (`neighbours`, used only
by Nearest: the other snare, the nearest toms, the nearest cymbal of the same kind,
crash 1 for china/splash/stack and for a ride edge, the ride bell for a bell cymbal
and for a crash bell, the main hat for an aux hat), each with its own allow-list.
"Nearest" is one rule (`nearest`: the others by distance, the first in order on a tie)
shared by toms, cymbals and hat openings; toms measure it by `TomPos::distance` and
cymbals by `CymSlot::distance`, as the spreads do. A chain judges one drum alone; where a
pair matches a drum as a whole (open hats by level, toms and cymbals by the spreads), the
mapping's routes do that before any chain is walked. No stand-in → the drum is dropped.
Chains are built once for every slot. `canon/rules.rs` writes the agreed rules as a table
(its snapshot is `midiremap-mapping/tests/golden/rules.txt`), and the proofs in the
mapping's `proofs/` check every chain and every built-in pair against it. `tests/same_drum_stands_in.rs` holds the agreed
same-drum rules as an independent table and checks every slot's chain against it, and
every built-in engine pair in both missing-drum modes: the first agreed stand-in the target
has is played, nothing else on the same drum, and Nearest only crosses to drums the rules
allow.

### `spread` — one kit's toms and cymbals on another's

- `spread` knows no engine, no note and no outcome. A `Kit` is the toms (`TomKit`) and
  cymbals (`CymbalKit`) among a list of drums (`Kit::of`); each `EngineMap` keeps its own.
  `Spreads::new(source, target, stand_in)` spreads one kit over another, where `stand_in`
  gives the target stroke a stroke plays as when nothing spreads it. `stroke(canon)` gives
  the `SpreadStroke` of a stroke a spread moves off its own drum: the target stroke it plays
  as (`plays`) and the stroke of the target drum its strokes count as (`drum`). `moved(canon)`
  says whether the target has the drum `canon` is a stroke of and the source's drum of that
  name plays on another.
- The `TomSpread` lands the source's tom hits on the target's in pitch order, on as many
  target toms as possible, racks on racks and floors on floors wherever that leaves no
  target tom idle, nearest first, the higher tom on a tie; rimshots follow their tom's hit;
  rims spread the same way over the target's rims, each on its hit's tom whenever that tom
  has a rim.
- The `CymbalSpread` lands cymbals the same way, kind first. A cymbal is in a kit when the
  engine plays any stroke of it other than its bell. It is three steps, each handing the
  next a `Placed` value (the cymbals placed so far and the places taken):
  `own_kinds` spreads each kind over the target's cymbals of that kind like the toms, so a
  kind the target has never leaves its kind; `missing_kinds` gives each cymbal of a kind the
  target lacks (kinds in canon order: china, splash, stack, bell cymbal) the unused cymbal
  nearest its number of the first other kind its chain reaches that the target plays (china
  and stack: each other, then crashes; splash: crashes; bell cymbal: ride bells), else
  leaves it to land as its chain would; `crash_bells` plays a crash's bell on its spread
  crash's bell, else on the nearest unused bell of another crash, else on the first unused
  ride bell (a ride bell the source's own ride bell lands on is used). Every other stroke
  follows its cymbal: a `CymbalPlace` (a cymbal or a ride's bell) plays a stroke the same
  way on a cymbal, and on a ride's bell as `CymArtic::on_ride_bell` names it, the one rule
  the fallback chains use too. Rides are not spread.
- Both spreads use `spread()` (`spread/assign.rs`): the least-cost ordered assignment of
  one row of `Places` onto another, generic over `SpreadPos`, which `TomPos` and `CymSlot`
  implement. It counts splits, then merges, then crossings, then distance. `Landings`
  records where each place landed, and `Moved` also which places the target has but plays
  elsewhere.

### `engine` — one engine's note table, and the catalog

- `EngineMap::decode(Note) → Option<Canon>` and `encode(Canon) → Option<Note>`
  (`engine/map.rs`). Built from a TOML/JSON document (see below):
  - `to_canon: HashMap<Note, Canon>` — decode direction, one entry per listed note.
  - `from_canon: HashMap<Canon, Note>` — encode direction. A note flagged
    `primary` wins the reverse mapping; a duplicate primary for one canon is an error
    (`MapError::DuplicatePrimary`). Non-primary notes fill a canon only if no primary
    claimed it.
- A map also keeps its `HatLadder` (`engine/ladder.rs`: the rungs its main hi-hat plays in
  each zone, loose first, and which open level is its normal open hat; `toward` gives the
  rung another engine plays a rung at, as many steps from that engine's normal open hat as
  it is from this one's) and its spread `Kit`, both read once when it loads.
- `EngineId` is an engine's id as the catalog names it (a branded string in the app);
  `Drum` is a note and the `CanonEntry` it plays.
- An `EngineMap` is never copied or patched: edits are applied by `Mapping`.
- `Catalog` (`engine/catalog.rs`): engine maps keyed by id in a `BTreeMap`, with
  `get(id)`, and `ids()` / `engines()` in id order, so no caller sorts. `EngineMap`
  exposes `id()` / `name()` and reads user maps with `EngineMap::from_json`; a map that
  lists a note twice is a `MapError::DuplicateNote`. A map may list former ids as
  `aliases`; `get` and `canonical_id` resolve them, so renaming an engine never breaks a
  saved preset. `from_maps` rejects an alias that is also an id or belongs to two engines
  (`MapError::AliasCollision`). No built-in preset has an alias yet. A map may be a
  `variant` of another engine (another mapping of the same kit); `variants(base)` and
  `base_of(map)` relate them.
- `Catalog::builtin()`: every `engines/*.toml` (dozens of presets). Kit's `build.rs`
  globs the directory, parses each file with `toml`, rejects invalid TOML or a
  duplicate engine id as a build error naming the file, and writes one JSON table
  that is embedded with `include_str!`. Adding a preset needs no code change, and
  `toml` stays out of the runtime (and the WASM). `builtin()` parses the table and
  cannot fail: the table is fixed at build time, and the test `every_embedded_engine_loads`
  proves every preset in it loads; `Catalog::shared()` is a process-wide `LazyLock`
  instance, so the WASM parses presets once per page instead of once per call.
- `with_user_json(json)` adds a user map that *shadows* a builtin with the same id;
  `from_maps(maps)` builds a catalog from any maps (tests, generators).
- `tests/engine_facts.rs` pins what the built-in engines play on the notes worth checking
  (each names its vendor, UJAM's mute keys, BFD3's tom slots, …). It shares the drum-key
  helper `k` and the note helper `n` in `tests/support/mod.rs` with five other
  integration tests; the module re-exports kit's and note's own, behind their `testing`
  features, and holds the proofs' groove generators (`support/grooves.rs`).
- `tests/stable_ids.rs` guards saved data: every drum key and engine id ever released is
  recorded in `tests/golden/`, must still parse or resolve (through an alias after a
  rename), and every new one must be appended.
- `tests/walkthrough.rs` converts every note of the richest kit to every builtin target
  and compares the output keys and the report with `tests/golden/walkthrough.txt`, one
  recorded line per target. A line changes only when a preset or the fallback order
  does; the change is then reviewed in the diff of that file.
- `tests/suggestions.rs` proves the source advice over the whole catalog: three corpora
  (`tests/support/grooves.rs`: each engine's core-kit groove, its full layout, and the
  product's sample), each true source's groove read under every engine that is neither it
  nor the target, for Superior Drummer 3 and General MIDI (25,281 pairs a run). It asserts
  what holds by construction (a file read by its own source fits; a named engine recognizes
  more than the source; a kit groove converted from its own source is not a heavy loss) and
  writes what can only be measured, whether converting as the advice says gives the true
  source's MIDI events, to `tests/golden/suggestions.txt`: counts per corpus and target, and
  every kit pair's verdict grouped per true source. A new engine file moves it; the diff is
  reviewed (`UPDATE_EXPECT=1 cargo test -p midiremap-core --test suggestions`). About 8 s in
  a debug build.

### `mapping` — one engine pair, compiled in stages

`Mapping::new(src, tgt, &Overrides, MissingDrums)` borrows the two engines and compiles
one conversion in stages. Each stage is a pure function whose product is built once:

| # | Stage | Where | Consumes | Produces |
|---|---|---|---|---|
| 1 | route | `mapping/route.rs` | source, target, `MissingDrums` | `Routes`: a `Route` for every drum |
| 2 | land | `mapping/drums.rs` | `Routes`, target, target edits, `MissingDrums` | `DrumTable`: an `Outcome` for every drum |
| 3 | decode | `mapping/mod.rs` | source, source edits | each source note's drum |
| 4 | join | `Mapping::new` | stages 2 and 3 | the outcome of each of the 128 source notes |

Nothing is resolved after construction, so the fallback search never runs per MIDI event.
`with_unrecognized(Unrecognized)` sets, once, what the conversion does with notes that do
not decode (`Remove` unless set); it changes neither the outcomes nor the report, only
whether those notes are written.

- **Stage 1, routes.** A `Route` says how a drum finds the target drum that plays it:
  `Chain` (by its own name, else its fallback chain), `Opening(Rung)` (a loose or open main
  hi-hat on the target's rung as many steps from its normal open hat as the source's, when
  both engines name their normal open hat) or `Spread { stroke, named }` (under `Nearest`, a tom or cymbal stroke a
  spread moves; `named` when the target has the stroke itself). Routes are decided from the
  two engines as they ship, so no edit changes one. `Mapping::matched_drum(canon)` reads
  them: the target drum a drum lands on by match rather than by its chain.
- **Stage 2, landing.** `DrumTable::compile` lands every drum through one total function,
  `land`. A drum with an edit of its own plays that edit, whatever its route. A `Chain`
  drum resolves on the target with every edit. A matched rung of the main hi-hat, loose or
  open, resolves on the target as it ships, so it follows only its own row's edit. A spread stroke resolves the stroke it
  plays as on the target with every edit but those of the drums a spread moved off their
  own name, so an edit of a moved row moves only that row and every other stand-in follows
  the edit of the drum it lands on. `TargetNotes` names these three readings of the target
  (`stock`, `edited`, `following`); edits are chained after the engine's notes, so an edit
  wins. `opened` and `spread` relabel what landed as the drum's own outcome: a tom or
  cymbal the target has stays `Direct` (its `Landing` plays the spread drum), one the
  target lacks is a `Fallback` to another drum, and a stroke is judged against the stroke
  of the drum its strokes count as. `Mapping::unedited()` is stage 2 compiled again with no
  edits, so that rule is written once.
- **One drum against one note lookup** (`mapping/chain.rs`). `resolve(canon, encode,
  missing)` takes the target's lookup as a function: the drum itself when the target has
  it, else the first drum of its fallback chain the target has that `missing` allows, else
  dropped. `resolve_on(map, canon, missing)` is the same on an engine as it ships, with no
  edits: what the converter writes for that drum. Both stages, the sample groove and the
  proofs call it.
- **Outcomes** (`mapping/outcome.rs`). `Outcome` is where a drum lands, total by
  construction: `Direct(Landing)` (the target has it: the drum itself, or matched to the
  source's at another opening, tom or cymbal, the only pairings `Landing`'s constructors
  `itself`, `opened_to` and `spread_to` build), `Fallback(StandIn)` (another drum plays
  it), or `Dropped { other_drum }` (nothing plays it). `Drop` walks the same chain as
  `Nearest` filtered to `Canon::same_drum` (`MissingDrums::allows`), so both modes share
  one order. `StandIn` keeps its fields private and computes in its one constructor whether
  the stand-in is another drum than the one it is judged against. `moves_to_other_drum()`
  says whether the missing-drums setting decides the drum: a fallback to another drum, or a
  drop that another drum could have played. `Outcome` serializes tagged by `status`,
  without the drum itself.
- **Settings** (`mapping/settings.rs`): `MissingDrums { Nearest | Drop }` and
  `Unrecognized { Remove | Keep }`, each parsed from and serialized as its lowercase name.
- **Readers.** `resolve_canon(canon)` (a drum's outcome), `played()` (each source note
  that plays a drum, with its outcome), `dropped_drums()` (the one rule for "a drum the
  source plays that the target leaves out", read by the site's pair pages and the rack's
  `dropped` count), and `destination(note)` → `Destination` (a type the facade does not
  re-export, read by core), the one rule
  for where a source note plays: on a drum and its note, unchanged
  (`Unrecognized::Keep`: `Destination::Kept(Kept { note, plays })`), or nowhere. `kept(note)`
  gives that `Kept` for a note the source does not recognize, or `None` under `Remove`; its
  `plays` is the private `target_drum_on(note)`, the one rule for which target drum sits on
  a note: the drum a
  target edit puts there (of two, the first in `Canon` order, the edits map's own), else
  the drum the stock target plays there, also when an edit moved that drum off it, since
  the stock note may still sound. `rewrite` and the Ableton rack both read it, so the
  rack plays every note where the converted file puts it (`tests/ableton_racks.rs` checks
  that note for note over five engines' pairs, both Missing drums and both Unrecognized
  settings, with and without edits).
- **Edits** (`mapping/overrides.rs`). `Overrides { edits: { canon: note }, srcEdits:
  { "note": canon | null } }`, both maps required: one shape from the app's state through
  the WASM to the preset file. `edits` retargets the *encode* side ("encode this canon as
  this note"); `srcEdits` retargets the *decode* side ("read this source note as this
  canon"), which lets a note the source engine doesn't map be rescued to a canon, or (with
  `null`) a note it does map be unassigned — how the editor replaces a drum's source note.
  Notes are `Note`s and drums `Canon`s, so an out-of-range value fails deserialization.
  `Mapping::new` applies them (target edits in stage 2, source edits in stage 3), and
  anything not overridden falls through to the engine.
- **Preview** (`mapping/preview.rs`, UI, no MIDI). `Mapping::preview() → Vec<VoicePlan>`:
  per-drum rows from the same `Mapping` the conversion uses. One row per canon the source
  engine defines or any note decodes to, in `Canon::all()` order, serialized as
  `{ canon, label, family, srcNotes, defaultTgtNote, outcome }`:
  - `srcNotes`: every source note that plays this drum — overridden notes first,
    then the engine's primary note, then the rest. Empty for a *silent* drum (its
    notes were reassigned); the row stays so its target remains editable.
  - `outcome`: the drum's `Outcome`, with target edits applied (the app names a
    stand-in after `standIn`, followed by what the stock target has on the note when a
    target edit moved it there); `defaultTgtNote`: the target note without target edits,
    read from `unedited()`.
  - A row's drum comes from its outcome, so the two cannot disagree.
  `tests/preview_matches_conversion.rs` converts every note for every builtin pair
  (Nearest, Drop, and with edits) and checks the preview against the output.
- **Proofs.** The mapping's `proofs/` (tests only) checks it over every built-in pair:
  `proofs/pairs.rs` the agreed stand-ins, `proofs/open_hats.rs` the openings,
  `proofs/toms.rs` the tom spread, `proofs/cymbals.rs` the cymbal spread, and
  `proofs/audit.rs` that every gap a pair leaves is a known one
  (`midiremap-mapping/tests/golden/known_gaps.txt`).

### `midi` and `parts` — the MIDI side

- `midi/codec.rs`: `parse(bytes)` → `Parsed` (the file and its `damage`, read through
  `smf()` and `into_parts()`) / `write(&smf)`, the `midly` codec. `parse` refuses a header whose SMPTE rate byte is `0x80` (`CodecError::SmpteRate`)
  before midly sees it: midly 0.5.3 negates it with an overflow, a panic in builds with
  overflow checks (found by fuzzing). `damage` lists what the file had lost before it was
  read, since midly (not strict) reads a damaged file as far as it goes without saying so:
  `Damage::TrackCut` for a track with no End-of-Track (every loss of events leaves one, a
  bad event or a cut download alike), placed at the bar of its last event read (`Meter`,
  or the tick in a file timed in SMPTE frames), and `Damage::TracksMissing` when the
  header declares more tracks than were read.
- `midi/track.rs`: `TrackNo` (counted from 1), `END_OF_TRACK`, and `track_at`, which
  builds a track from events at absolute ticks (it checks that the ticks never go back).
  `midi/meter.rs`: `Tick`, `Bar`, `Position` and `Meter`, which turns a file's ticks into
  bars by its time signatures.
- `midi/channel.rs`: `Channel` is a MIDI channel `1..=16` (an `Idx<16>`), numbered as people
  count them (`Channel::DRUMS` is 10). `ChannelFilter` is a set of the sixteen channels
  (`ALL`, `NONE`, `with(channel)`).
- `midi/event.rs`: `NoteEvent::of(kind)` reads an event as a note event (its `Channel`,
  `Note`, velocity and `Touch`: a hit, a note-on with velocity > 0; a `Release` by note-off
  or by silent note-on; a choke, poly aftertouch) and `kind()` writes it back. `hit(kind)`,
  the one predicate for a hit, reads it, as do the converter, the part scan (so the hit
  counts `inspect` ranks engines by) and the `Auto` scope. `channel_from_wire` and `channel_wire` convert a `Channel` to and
  from the `u4` a MIDI file stores, as `note_from_key` and `note_key` do for a `Note`.
- `ChannelScope { Auto | Only(Channel) | All }` (`parts/selection.rs`) chooses which
  channels a conversion rewrites; it parses from `auto`, `all` or `1`..=`16`. A `Selection`
  is a scope or a user's `Parts`.
- A `Part { track: TrackNo, channel }` (`parts/part.rs`) is one track's notes on one
  channel, both counted from 1 (`2:10`); `Parts` is a set that holds at least one, a
  user's pick for one file (`Selection::Parts`), and a picked part the file has no hit in
  is `ConvertError::NoSuchPart` (`parts/error.rs`). The CLI takes it as
  `--parts 1:10,2:1`, the WASM as the `remap` selection `{ parts: [...] }`.
- `PartIndex::of(&smf)` (`parts/scan.rs`) reads a file's parts once: how many tracks it
  has, the note of every hit of each part in order, and the name each track gives itself.
  The choice of what to convert, the hit notes and the part summaries all read it instead
  of scanning the file again.
- `choose(&index, &selection, judge)` (`parts/choose.rs`) is the one place a selection becomes
  `Choice::Convert { filters, picked, offers }` or `Choice::Ask { parts, why }`. `judge` is
  what the caller knows of each note, `HitFate { Played, Dropped, Unknown }`: `convert`
  judges by its mapping (`Unknown` for a note the source does not know, `Dropped` for a
  drum the target has none of), `auto_question` the same when it is given the mapping, and
  `hit_notes` (so `note_hits` and the source advice) judges every note played, since no mapping
  exists while a source is fitted (the target only breaks ties). `TrackFilters` is
  one `ChannelFilter` per track of that file, built only there. `Auto` (the default) picks
  parts and never guesses: a file with channel-10 hits converts its channel-10 parts and
  offers each other part of the tracks those are in (Mjód: 168 drum hits on channel 1
  beside channel 10, which nothing in the file tells from a one-track band file's piano); a
  file whose hits are all on one part converts it (drum packs); any other file converts
  nothing and asks which parts are the drums (`AskReason::NoChannelTen`), since 123 of 160
  layouts read half a piano or bass range and only the user can tell. It also asks, listing
  every part, when channel 10 has hits on notes the source knows, the target plays none of
  them, and other parts have hits (`AskReason::ChannelTenUnplayed { dropped }`, the hits on
  known notes it would drop: a kit on channel 1 beside a tambourine on channel 10 would
  otherwise convert to nothing); hits on notes the
  source does not know take no part in it, so a kit read with the wrong source converts
  and the done card asks "Wrong source?". A file whose only parts are on channel 10 never
  asks. Nothing is deleted without saying so: an
  untouched part is counted `untouched`. `hit_notes` is the note of every hit a selection
  would rewrite.

### `inspect` — what a file plays

- `note_hits(midi, selection) → NoteHits` (`inspect/hits.rs`): the hits on each note a
  conversion with that selection would rewrite; none when it would ask.
- The ranking (`inspect/fit.rs`, crate-private): `first_above(&catalog, &hits, recognized,
  target?)` is the best engine for the target among those that recognize more of the hits
  than `recognized`, by one total key (`Fitted::rank`): the most hits its map decodes
  (`recognized`), then the better `Standing` (the standard, then a major, then any other),
  then the most it decodes as a kick, a snare or a hi-hat (`Family::is_core`; a ranking key
  only, not on the fit), then the engines of the target's vendor (no preference without a
  target or a vendor), then the target itself, then by id. The target is ranked like any
  engine, and the source, recognizing no more than itself, never comes first. Each
  `SourceFit` holds what of the kick and the snare it reads none of (`Option<Lacks>`), and
  `missed()`, the share of the hits its map does not decode (`Option<Share>`, `None` without
  hits), counted in the same pass as `recognized`.
- `source_advice(&catalog, &hits, src, tgt?) → Advised` (`inspect/advice.rs`): one call ranks
  for the target and advises, so the two cannot differ, and `Advised` carries the source and
  target ids it was computed for. `SourceAdvice` is `Fits` (the source recognizes every hit),
  `Suggest { engine, named }` (the best engine that recognizes more, `fit::first_above`),
  `LooksLikeTarget(named)` when that engine is the target `Advised` holds, or `Unknown` when
  there is none; `Named { missing, hits, recognized, ask }` is what both say, flattened into
  the variant on the wire, and `SourceAdvice::named()` is the one reader of either.
  `ask: Option<Lacks>` comes only from the private `asks`: 16 or more hits read, a third or more
  missed (`Share::reaches(ASK_MISSED)`), the source reads no kick or no snare, the engine named
  reads both; it holds in the target case too. `tests/engine_facts.rs` pins the incident (a
  Toontrack file read as GGD Invasion (Halpern) names the target for Superior Drummer 3, and
  asks, and for EZdrummer 3, and suggests EZdrummer 3 for EZdrummer 2, General MIDI and
  Addictive Drums 2), and `tests/suggestions.rs` proves the advice over the whole catalog (see Tests).
- `part_summaries(midi, source?)` (`inspect/summary.rs`) lists a file's parts (track name,
  hits, and what they `Plays` as a source), and `auto_question(midi, known)` gives
  `AutoQuestion { parts, why }` only when `Auto` would ask. `known` is what the caller has,
  `Known { Nothing | Source(map) | Mapping(&mapping) }`; given the mapping it asks exactly
  when `convert` through that mapping does. Its `why` is a `QuestionReason`, the
  `AskReason` with the mapping's target added to `ChannelTenUnplayed { dropped, target }`
  (only a mapping judges a hit dropped), so the app words it from the question alone. Both, and `convert`'s offers, come from one
  crate-private `summaries`.

### `convert` — the entry point

- `convert(midi, &Mapping, impl Into<Selection>) → Result<Conversion, ConvertError>`
  (`convert/mod.rs`) is the single entry point for the CLI and the WASM; it crosses to the
  app as it is. Its stages:

  | # | Stage | Function | Produces |
  |---|---|---|---|
  | 1 | parse | `midi::parse`, `Parsed::into_parts` | the `smf` and its `damage` |
  | 2 | scan | `PartIndex::of` | the file's parts |
  | 3 | choose | `choose`, judged by the mapping | `Choice::Convert { filters, picked, offers }` or `Choice::Ask { parts, why }` |
  | 4 | summarize offers | `summaries` | the offers, as the source plays them |
  | 5 | rewrite | `rewrite` | the new `smf` and its `Report` |
  | 6 | write | `midi::write` | bytes |

  The result is `Conversion::Done(Converted { bytes, report, damage, picked, offers })`, or
  `Conversion::Ask { parts, why, damage }` when `Auto` must ask (nothing written). The CLI
  prints the damage and exits 3; the app names each damaged file on the done panel.
- `rewrite(smf, &Mapping, filters) → (Smf, Report)` (`convert/rewrite.rs`) runs one pure
  `step` per event, which says what it is on its own (`Stepped`): an event that passes as it
  is (no note, or one on a rejected channel; `Untouched` when it is a hit there), a hit on its
  source note with the key its destination plays it on (or none), or a release or a choke of
  its source note with the key the mapping gives. `rewrite_track` tallies each in the report and
  drives the track's one `Voicing`, which owns the output, the `DeltaFold`, the running tick
  and the voice table: for each channel and source note, its open hits in the order they
  came, each with the key it went to and whether it is *written* (a note-on of its own),
  *merged* (it sounds inside another hit's note-on) or *closed* (a retrigger ended it).
  What sounds on a key, by whom and since which tick, is read from that table alone.
  - A hit is written on its key when nothing, or only its own source note, sounds there.
    When another source note sounds there and the newest note-on on the key is of the
    same tick, the hit merges into it: not written, that note-on takes the higher velocity,
    and the report counts it `merged` (GM 35 and 36 at one tick onto Invasion's one kick
    are one note). When the newest note-on is older, the hit retriggers the key: one
    `NoteOff` of velocity 0 per note-on still open there, every hit sounding there closed,
    then the hit written. Kept unrecognized notes take part like any other. Notes in two
    tracks are not merged, also on one channel.
  - A release takes its source note's oldest open hit, first in, first out: a closed one's
    release goes; a written or merged one's is written on its key unless other hits still
    sound in that note (it then goes, and a written hit hands its note-on to a merged one),
    so a merged note ends when the last of its hits ends and notes stay paired. A release
    with no hit moves by the mapping. A choke (poly aftertouch) goes to the key of its
    source note's newest hit that still sounds, and goes when all of them are closed, so a
    choke of a cymbal another retriggered does not cut the other.
  - Dropped notes are removed, and so are unmapped ones unless the mapping's
    `Unrecognized` is `Keep`, which writes them out unchanged (same key, channel, velocity
    and tick), where they play whatever target drum is on that key; a removed event's delta
    is folded into the next written event (`DeltaFold`) so timing does not shift. A folded
    gap past the `u28` maximum fails the conversion with `CodecError::DeltaOverflow`
    instead of moving later events. A track that lacks its End-of-Track gains one.
  - Every other event, and every event on a rejected channel, passes through
    untouched.
  - Each real note-on (velocity > 0) is reported once; those on a rejected
    channel or skipped track count as `untouched`.

  With a mapping that gives each source note one key, the key of a release or a choke from
  the table is the one the mapping gives, so a file in which no two source notes share a
  target key converts as each event would alone. A source note that overlaps itself is
  written as it comes (not this table's business).
- `Report` (`convert/report.rs`) keeps its counters private and hands them out as
  iterators and totals (`loss()` is a `Loss`: `read()` every hit the scope selected, `lost()`
  every one of them dropped or removed, a kept unrecognized hit not lost, never more than
  read: it holds the lost share of the read, `Option<Share>`, `None` when nothing was read,
  and goes on the wire as `{ read, lost }`; `is_heavy()` a quarter or more lost, and losses
  `Sum`); `hits()` is `read + untouched`, every note-on
  seen); only the converter tallies
  them, in a `Tally` (`record`, `record_unmapped`, `record_untouched`, `record_merged`),
  which `closed` turns into the `Report`, setting the `Loss` once from the final
  counts. `rewrite`'s `step` says on each hit in scope how
  the source hears it (`Heard::Recognized(outcome)` or `Unrecognized`), which the tally
  reads without asking the mapping again. `record` keeps the counting
  policy in one place: it tallies fallbacks used (each a `FallbackTally`: the stand-in drum
  the converter chose, the target note it landed on and the hit count) and dropped
  canons; direct hits are not recorded. `record_unmapped` counts the hits of a note the
  source does not recognize, and the closing tally gives each such note its `UnmappedFate`
  (`Removed`, `KeptFree`, `KeptOnto(canon)`) once, from the mapping's `kept(note)`, making
  one `Unmapped { hits, fate }` per note; the app names a kept note's drum from that
  canon. `converted` counts hits the output plays (direct or approximated), each on its
  own note-on or merged into another's; `untouched` counts note-ons the channel scope left
  alone, which are not loss; `merged` counts hits, converted or kept, that sound inside
  another's note-on of their tick, so the output holds `converted + kept unrecognized +
  untouched - merged` note-ons. It serializes in camelCase (`unmappedSource`, `fallbackUsed`,
  `dropped`, `untouched`, `converted`, `merged`, `read`, `lost`) with its `BTreeMap`s in a stable order and note
  keys as strings, so the CLI and WASM print the same JSON. An `unmappedSource` entry is
  `{ hits, fate }`, the fate `"removed"`, `"keptFree"` or `{ "keptOnto": canon }`. A `fallbackUsed` entry is
  `{ standIn, note, count }`; the app names the report line after `standIn`, and when a
  target edit moved the stand-in onto another note it adds what the stock target has
  there ("China → Crash 2 → Ride").
- `tests/rewrite_props.rs` (proptest) checks this on generated multi-track files, with
  the built-in pair, missing setting, unrecognized setting and scope drawn at random:
  kept events keep their absolute tick and everything but the key and a merged note-on's
  raised velocity, only note events are removed, and the only events added are the
  retrigger's `NoteOff`s before a hit on its key; notes stay paired per channel and key, and
  `converted + dropped + unmapped + untouched` equals the input's note-ons; keeping
  unrecognized notes changes no count but `merged`, only the fates (`Removed` against
  `KeptFree` or `KeptOnto`), and writes `converted + unmapped + untouched - merged`
  note-ons. On files where no note overlaps itself and every note lasts a tick, no key of a
  converted channel sounds two notes at once or starts twice at one tick (a note of no
  length ends where it starts, so a hit after it at that tick starts again).
- `fuzz/` (cargo-fuzz, its own workspace) feeds `convert` arbitrary bytes: no panic,
  the output parses, and the counts add up. It runs daily in CI (`fuzz.yml`); locally,
  on Linux or WSL with a nightly toolchain:
  `cd midiremap-core && cargo +nightly fuzz run convert fuzz/corpus/convert fuzz/seeds -- -dict=fuzz/midi.dict -max_total_time=600`.
  Crashes found become files in `fuzz/seeds/`. The gate's `fuzz` step formats and lints
  the target on every run (its own build directory, `target/fuzz`), so an API change that
  breaks it fails the gate instead of the next day's fuzz run.

### `files` — files for other programs

- `parse_preset(json, &Catalog) → LoadedPreset { preset: SavedPreset, skipped }`
  (`files/preset.rs`) reads `{ "format": "drumverter-preset", "version": 1, name, src,
  tgt, edits: { canon: note }, srcEdits: { "note": canon | null } }` — the file the web
  app exports. `SavedPreset` is `{ name: PresetName, src: EngineId, tgt: EngineId }` with
  its `Overrides` flattened in, so the edits are stored in the same shape the app keeps
  and the WASM takes. The engines are resolved through the catalog's aliases to current
  ids; an unknown engine is `PresetError::UnknownSource` / `UnknownTarget`. Another format
  or version, or a blank name or engine, is an error; an edit it cannot read (unknown
  drum, note out of range) is skipped and listed in `skipped` as a `SkippedEdit` (kind +
  key/value; `Display` gives the CLI's line), never fatal. The app's export and this
  parser share the fixture `midiremap-core/tests/golden/my-kit.drumverter.json`, which the
  CLI's, the wasm crate's and the app's tests read from there.
- `sample_file(&engine)` (`files/sample.rs`) writes a two-bar groove on the notes one
  engine plays, each drum on the engine's own note or its nearest stand-in's
  (`resolve_on` under `Nearest`).
- `Daw { Reaper, Cubase, StudioOne, AbletonLive, Logic }` (`files/daw/mod.rs`,
  `Daw::ALL`) and one `Format` entry per DAW: its names, the drum-map file's extension,
  how the file is packed and how its text is written for an engine.
  `daw.drum_map(map, credit)` writes an engine's drum map: Reaper note names (with
  `credit` in the header), a Cubase `.drm`, a Studio One `.pitchlist`
  (`files/daw/formats.rs`), an Ableton note-name rack (`files/daw/ableton.rs`) and a
  Logic Pro Step Sequencer template (`files/daw/logic.rs`: `.pattern`, an XML plist
  written with the `plist` crate: one row per played note, family by family, named after
  its drum and set to its note, every step off).
- `rack_file(&Mapping, Option<&PresetName>) → RackFile { file_name, xml, packing, dropped }`
  (`files/daw/ableton.rs`) is the Ableton Live MIDI Effect Rack that plays a mapping: one
  chain per source note, shifted onto where the conversion puts it; a kept unrecognized
  note's chain has no device and is named "Unknown, plays Kick" after the target drum on
  its number, or "Unknown, kept" when there is none.
- They write their XML with the core's one XML writer (`xml`: `document`, `element`, `nest`,
  `empty`, `text`), which the site's sitemap uses too. The tests read the files back with
  `roxmltree`. `FileStem` (`files/daw/file.rs`) cleans a name into a file name every system
  accepts. `Packing { Text | Gzip }` (`files/daw/packing.rs`) says how a file is stored;
  `Packing::pack` is behind the feature `gzip`, which the site enables (the app packs with
  `fflate`), so the core writes text only by default.

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
  maps, required for every built-in preset (`tests/engine_facts.rs` checks it). Blank values are
  errors (`NonBlank`).
- `note` — MIDI note number `0..=127`.
- `canon` — a canon's dotted string key (see the `canon` module).
- `primary` — optional (default `false`); the note used when *encoding* this
  canon. Multiple notes may decode to the same canon; at most one may be primary, and
  with none the first one listed encodes it.
- `aliases` — optional; former ids that still resolve to this engine (see `engine`).
- `hub` — optional; `{ standing = "standard" | "major", column = "SD3", order = 4 }`
  makes the engine a hub (`EngineMap::hub`, `engine/standing.rs`): `standing` is its
  `Standing` (`standing()`; a file declares only `HubStanding`'s two, `Other` is an engine without a hub), which ranks
  source suggestions;
  `column` labels its column in the site's index matrix and `order` places it among the
  hubs. All three are required together. General MIDI is the standard; GGD Invasion,
  EZdrummer 3, Superior Drummer 3, Addictive Drums 2, SSD5, BFD3 and Guitar Pro are majors.

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
                  [--user-map map.json] [--preset my-kit-drumverter.json]
                  [--channel auto|all|1-16 | --parts 1:10,2:1] [--missing nearest|drop]
                  [--unrecognized remove|keep]
midiremap list [--user-map map.json]
```

`convert` writes the remapped `.mid` and prints the loss report as pretty JSON to
stderr. `--preset` takes the note edits of a preset exported from the web app (its
engines, resolved through aliases, must be the command's; skipped edits are printed).
`--missing drop` leaves out drums the target lacks instead of playing them on the
nearest drum. `--unrecognized keep` writes notes the source layout does not recognize
out unchanged instead of removing them, where they play whatever target drum is on their
number; the report lists them as `unmappedSource` either way, each with its hits and fate
(`removed`, `keptFree`, or `keptOnto` naming that drum). `--parts` names the drum parts as `track:channel` (both from 1) in place of
`--channel`. `list` prints available engine ids. The exit code is 0 when the file was
written whole (even with dropped notes: read the report), 3 when the input was damaged
(what it still held is written, and the damage printed), 4 when `auto` asks which parts are
the drums (nothing is written; why, the parts and a `--parts` value are printed), 1 on any other
error and 2 on a usage error. Parts left beside channel-10 drums are printed with the
`--parts` value that converts them too.

### WASM (`midiremap-wasm`)

`wasm-bindgen` exports for the browser app:

- `remap(mid, src_id, tgt_id, overrides?, selection?, missing?, unrecognized?) → Conversion`
  (`auto_question(mid, src_id?, tgt_id?, overrides?, missing?, unrecognized?) → AutoQuestion |
  undefined` gives the parts `auto` would ask about and why, the same question `remap` asks
  when the engines and settings are its own: both build their mapping through one `paired`) — `overrides` is an `Overrides` object; `selection` is `{ scope }` with `auto`
  (the default), `all` or `1`-`16`, or `{ parts }`, a non-empty `Part[]` (a picked part the
  file lacks is `noSuchPart`); `missing` is `nearest` (the default) or `drop`; `unrecognized` is `remove`
  (the default) or `keep`. Like `selection`, a value outside its set is `internal`: the app
  only sends its own typed values. `plan` does not take it, since no plan row is an
  unrecognized note.
- `remap_rack(src_id, tgt_id, overrides?, missing?, unrecognized?, preset_name?) → RackFile { fileName, xml, packing, dropped }` —
  core's `rack_file` from a `Mapping` built the way `remap` builds its own, so the rack and
  the `.mid` read the same settings: the Ableton rack's XML, its file name (`<preset>.adg`, or
  `<FROM> to <TO>.adg`), how to pack it (`gzip`; the app packs it with `fflate`, core writes
  text only) and how many played drums the target drops. A blank `preset_name` is
  `badPreset`. The channel setting does not apply: the rack sits on the drum track.
- `plan(src_id, tgt_id, overrides?, missing?) → VoicePlan[]` — the core's preview rows
  (`canon, label, family, srcNotes, defaultTgtNote, outcome`, the outcome tagged by
  `status`); the app reads it through `core/outcome.ts` (`playedNote`, `movesToOtherDrum`, `isPlayed`, `leadNote`).
- `engine_catalog() → [{ id, name, fullName }]` — `name` is the display name,
  `fullName` the catalog name.
- `source_advice(files: { bytes, selection }[], src_id, tgt_id?) → { source, target, advice }` —
  core `source_advice` over the hits of all `files` that converting each with its selection
  reads (core `note_hits`, summed); `advice` is tagged by `kind` (`fits`, `unknown`,
  `looksLikeTarget`, `suggest`). A file that does not parse, or lacks a picked part, is left
  out; an unknown source or target is `unknownEngine` with its role.
- `loss_is_heavy(losses) → boolean` — core `Loss::is_heavy` of the `Loss` summed over
  `losses` (`{ lost, read }[]`): a quarter or more of the hits read left out; a loss of more
  than was read throws `internal`. The worker's batch hands it every converted file's report
  (`BatchResult.heavy`).
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
unit), then `wasm-opt -Oz` (npm `binaryen`) on the bindgen output: about 613 KB, 189.4 KB
gzipped, against a 192 KB budget (`scripts/check-size.ts`); the rack writer (`quick-xml`)
is about 14 KB of it. `opt-level` s / z made it
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
  page and the spinner stay responsive. The same worker advises on the added files' source
  (`Converter.advice`, an `AdviceRequest` naming the source and the target; `useSourceAdvice`
  asks again when the files, the channel or the pair change and ignores a stale answer); the
  rules live in core (`source_advice`), and the app only shows them. `offeredAdvice`
  (`convert/sourceOffer.ts`) offers the advice when it is for the pair on show (the
  stale-pair rule) and no source notes are edited: an `Offered`, a `suggest` or a
  `looksLikeTarget` with the source it is for and, for `looksLikeTarget`, the target from
  `Advised`. `useTrackedRun` asks the converter for the advice of the setup it ran and sends
  the engine it suggests as `converted.closer` (a `SuggestedProp` of `core/umami.ts`: the
  engine id, empty for none, or `advice-failed` when the advice fails). One surface speaks about the source at a time:
  `sourceSurface(sourceStage(conv, offer, unrecognized))` (`convert/sourceSurface.ts`) gives
  `notice` or `question`, each with the `Offered`, `done` or `none`, and a converted file is
  always `done`. `SourceAdviceNotice` says what the source
  misses (the live region) and what the named engine knows, with "Use {engine}" for a
  suggestion; the words come from `convert/sourceWords.ts`. `App` reads its place once
  (`convert/noticePlace.ts`, `useNoticePlace` over `ui/useNarrowScreen.ts`, whose width a
  test pins to `--breakpoint-sm` of `index.css`) and renders it there: under the engine
  pickers from `sm` up, and on a phone in the file step under the chips, inside the height
  the empty card keeps (`convert/FileIntake.tsx` lays the drop card and the chips,
  `convert/FileChips.tsx`, in one grid cell below `sm` and keeps the card's frame with its
  content `invisible` and `inert`), so adding a file shifts nothing below the step.
  `FileIntake` holds the step's one file input, mounted as long as the step is, so a file
  chosen in it is never lost to the change from the empty card to the chips. Shares on the app side are only
  the events' buckets (`core/share.ts`: `share`, `shareBucket`); the thresholds are
  core's. `useRemapper` gives `conversion`: `unready`, with no run on show, until
  both engines are chosen, then `ready` with the `actions` (`convert/convertActions.ts`, made
  from the `ChosenSelection` and the `ConvertSetup` on show) and the run's `conv`: every way
  to start a conversion, among them `convertFrom`, `swapAndConvert` and `goBack(left)`, each
  building the next setup with `setupAfter` (`convert/convertSetup.ts`), which runs the
  selection's `switchedSelection` (a chosen selection stays chosen) and the editor's
  `overridesAfter` on the event, so a switch's run converts the setup the next screen shows. On the done card `UnrecognizedNotes` converts again from the suggestion
  ("Convert again from {engine}", secondary: Download stays the only primary), or, when the
  target is named, the other way through `TargetLine`, the only place the swap line shows;
  `ReadAs` (`convert/ReadAs.tsx`), under the heading, names the layout the file was read as
  with a way back, there only when the suggestion left a pair, that restores the pair, its
  edits and its preset whole (`Left`, carried by the source's `via`). Before converting,
  `ConvertStepEnd` shows `SourceQuestion`, a warning panel, in the Convert button's place
  while the surface is the question: `useSourceQuestion` gives the `QuestionState`: `none`,
  `offered`, `due` (an `ask`, and the files, picks, channel and source not answered for yet;
  the sample conversion never asks) or `open` (`ask()`, `close()`), each but `none` with the
  `Offered`. It offers "Convert as {engine}" or, when the target is
  named, "Pick another source", and "Convert anyway", and sends every `source-answered`
  itself. The done card turns to the danger tone with `WarnIcon` when the batch's loss is
  heavy (`BatchResult.heavy`, judged in the worker by core's `loss_is_heavy`). The worker loads its own copy of the WASM; the
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
  `useEngineCatalog` (one `Catalog` union: loading, ready with the module and its engine list, or the error), `useConverter` (files → results, and the drum parts picked per file),
  `usePartQuestions` (`convert/partQuestions.ts`: the files `auto` would ask about through
  `auto_question`, given the pair, the edits and the settings the conversion
  reads, the ones still waiting for a pick, and the parts a conversion offers;
  `PartPicker` asks under the files, saying why by the question's reason, Convert takes only the files that do not wait, and
  `PartOffers` in the done panel converts an offer by picking the file's parts again),
  and `useEditor` (per-note edits, the live `plan` preview, and derived
  counts) behind a stable return contract, plus a small selection reducer
  (`convert/selectionState.ts`) for
  source/target/octave/channel/missing drums/unrecognized notes/view/open preset. The source is
  `{ id, via } | null`, so one cannot be held without the other: `via` says how it came to be
  (`link`, `restored`, `picked`, or `suggested` with the `Left` it left behind), set from the event
  that chose it, and a link that names the session's own source marks it `link` through a
  selection-only action. An engine not chosen is `null`, and `useRemapper` derives
  the one `EnginePair` (`core/enginePair.ts`) once both are chosen; `plan`, `remap`, the converter and the
  editor take that pair, so they cannot be called without both. The `View` is `convert` or `edit` carrying the
  pair, the filter and `assigning` (`editor/assigning.ts`: one source note with its picker open, or a list of notes given rows, or `null`), so entering the editor states them and leaving drops them;
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
    global element ids for focus. After files are picked or dropped with both engines
    chosen, focus goes to Convert, except while the notice's place is the file step (a
    phone): there `convert/useAddedFocus.ts` waits for the advice (`useSourceAdvice`'s
    `settled`, the remapper's `adviceSettled`) and focuses the notice's first sentence (the
    target `sourceNotice`, whose focus scrolls the whole notice into view) when the notice
    shows, Convert when it does not. The sample groove converts at once and focuses at once.
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
come from the WASM `plan` (the core's `Mapping::preview`), built from the same `Mapping` the converter uses, and a
core test checks per-row target notes against the converted file for every builtin pair.
The loss report labels substitutes from the target note recorded during
conversion, not from the live rows. The drum channel picker beside the octave
picker (Auto by default, not saved with mappings) is passed to every conversion;
notes it leaves alone are shown on the done card and in the report as unchanged,
not as loss.

### Static site (`midiremap-site`)

`npm run build:site` builds the app, then generates `/engines/`, one page per engine,
one per pair of the eight popular engines (the hubs: `Catalog::hubs`, the engines whose file
declares a `hub`, in its `order`), and one per content section into `dist/`.
The pages link the app's own built stylesheet (named in `dist/site.json`); Tailwind
scans the askama templates through `@source`, so both surfaces share one set of tokens
and utilities. Octave naming and "Changes only" on pair pages are CSS-only radios; the
scripts are the filters on the engine and index pages (`/filter.js`) and the language
choice on every page (the app's `src/staticPagesEntry.ts`, built as its own small entry). FAQ, How to use, Report an
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
pages), and the static pages' script with the chunks it imports, so every page states the same policy
and counts visits the same way. `site.json` is build data, not a page: no sitemap lists it. The filter script is `/filter.js`, not inline, so the policy needs no
`'unsafe-inline'`. Links and chrome
that both surfaces draw are `@utility` classes in `index.css` (`prose-link`,
`nav-link`, `skip-link`, `brand-mark`), used by the React components and the templates
alike. Pair-page rows take their status from the core (the `Outcome` of each source
note); the site only names it (exact / approximated / dropped) and sorts
changes first.

Drum maps and racks are files beside the pages, under `/drum-maps/files/` (robots keep
crawlers out; no sitemap lists them). Every engine has one per `Daw`: Reaper note names,
a Cubase drum map, a Studio One pitch list and an Ableton Live names rack (`note_name_rack`,
one empty chain per note, named after its drum). Every pair page has its rack under
`racks/`, core's `rack_file` of the converter's default mapping (Nearest, Remove, no edits).
`Site::files()` lists both, written by one loop; `packed` in `pages.rs` gzips a file whose
`Packing` says so (`flate2`, mtime 0, so builds are byte-stable). `/drum-maps/` shows one
DAW's files at a time through a CSS-only picker, and each engine page offers all four; a pair page names its rack
under Convert, outside the sticky bar, and says when the target leaves drums silent.

Tips go through Stripe Payment Links, listed once in `content/tip.json` (the
app imports it; `build.rs` writes its amounts as `TIP_AMOUNTS` and its `other` link as
`TIP_HREF` into `OUT_DIR/tip.rs`, which the site's `tip` module includes). Every footer
ends with a `tip-link` to the any-amount page, counted as `tip-answered` from the footer.
Every tip surface draws its cup with the one `tip-cup` utility (an SVG mask, no emoji).
The same link stands in the right margin beside the column (`tip-side-rail`, `tip-side`):
vertical text, sticky at mid-height, from `lg` beside a static page and from `xl` beside
the converter (`TipSide` in `Page`; never in the note editor or on `/thanks/`), counted from
the `side`. It hides while the tip ask is open (`:root:has(.tip-toast:not([hidden]))`) and
while a tip pauses the asks (`:root[data-tip-paused]`); its letter spacing follows
`--tip-side-tracking`, which `gen-i18n.ts` widens for each locale with its own fonts.
The tip ask, pinned to the top of the screen, offers the fixed amounts; it is built twice
from the same `tip-*` and `icon-button` utilities, by `TipToast` in the
converter and by the `tip_toast` macro on the pages with downloads (engine, drum-maps and
pair pages carry it hidden), and an e2e test holds the two builds equal.

`src/tip/tipAsk.ts` is the one rule, over one `localStorage` record shared by every tab
and every page: every download of a file the visitor keeps counts (a converted file, a rack,
a drum map, a note-map PDF; a preset export does not), and the ask comes from the
`FIRST_ASK`th, at most once per `GAP`,
not within `AFTER_TIP` of a tip, and never when the count cannot be saved. It also owns the
amount format (`tipEuros`), the answers (`answerTip`) and the pause mark: `rememberTip`
sets `data-tip-paused` on the root, and `showTipPause` sets it from the record at start
(`main.tsx` before the first render, `runTipScript` on every static page) and again on every
`storage` event, so a tip made on `/thanks/` in another tab hides the margin link here. The converter raises the ask
through `tipNote.ts` (`noteDownload`, read by the one `ConverterTip` in `App`); the static
pages through `pageTip.ts`, run by `src/staticPagesEntry.ts`, which counts clicks on links
inside `[data-download]` (the site's `DownloadKind`) and none on a phone, which cannot use
the files. `tip-asked` names the download (`after`) and both events the surface (`site`).
The ask never takes focus, closes on Escape only from inside, and gives focus back to the
download it followed. All are plain links in a new tab, so no Stripe code loads here.
Stripe returns the visitor to `/thanks/`, rendered in every locale, marked `noindex`, left
out of the sitemap, and marked `data-tipped`, which pauses the ask as a chosen amount does.

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
language change re-renders text in place and keeps every other state. A list a message names
(files, notes, drums) is formatted by `listed(locale, items)` (`src/locale/list.ts`, over
`Intl.ListFormat`), the one way the app joins one.

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
sitemap lists every URL with `xhtml:link` alternates. On a phone (a coarse pointer below
`sm`, the `phone-handoff` utility of `index.css`) the engine, drum-maps and pair pages, like
the converter's empty file step (`convert/PhoneHandoff.tsx`), offer "Send this page":
`core/sharePage.ts` opens the share sheet with the address, copies it where there is none or
the sheet fails other than by the visitor closing it, and else the page shows the address to
copy by hand; the converter's address is built from the engines chosen
(`converterAddress` in `convert/preselect.ts`, beside the reader of the same fragment). The
templates' `phone_handoff(page)` boxes are wired by `core/pageHandoff.ts`, which throws on a
page `HANDOFF_PAGES` does not know (`test/siteEvents.test.ts` pins the templates' names to
it). `src/staticPagesEntry.ts` (an entry over `staticPages.ts` and
`core/pageHandoff.ts`) stores the
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
  total `Outcome`, the opaque `Canon` and exhaustive matches over its `Slot` remove
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
  page load. `converted`, `file-failed` and `convert-failed` are sent by the run of
  `convert/useTrackedRun.ts` from the outcome `useConverter` returns, every prop read from the
  `ConvertSetup` the run was handed (`convert/convertSetup.ts`: the pair, edits, settings,
  preset, `via` and what the question led to, `asked`) and never from the screen's state when
  it ends, so a run started in the same event as a change of source reports the new pair;
  `load-failed` is sent
  by the engine catalog (the module failed to load) and by `main.tsx` (kind `locale`: the
  page's language failed to load). The static pages load only `core/umami.ts` of the
  analytics (`StaticOnlyEvent` names the four events only they send; `language-picked` from a static
  page also goes through `send`, and `page-shared`, tier 2 in the app through `track`, is
  sent from them by `core/pageHandoff.ts`, its `page` one of `HANDOFF_PAGES` and its `how`
  from `SHARED_HOW`, nothing for a closed share sheet), so those sends are outside the tier switches and their
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
