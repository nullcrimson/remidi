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

## Workspace

Three crates, a web app, and embedded engine presets:

| Component | Role | Depends on |
|-------|------|------------|
| `midiremap-core` | Pure engine. No I/O beyond parsing bytes handed to it. All the logic below. | `midly`, `serde`, `toml`, `serde_json`, `thiserror` |
| `midiremap-cli` | Offline `convert` / `list` binary. | core, `clap`, `anyhow` |
| `midiremap-wasm` | Browser bindings for the web app. | core, `wasm-bindgen`, `serde-wasm-bindgen` |
| `app/` | Vite + React + TypeScript converter UI over the WASM bindings. | Vite, React, Tailwind, Vitest |
| `engines/*.toml` | Preset note↔canon maps, embedded into core via a generated `include_str!` slice. | — |

`midiremap-core` never learns that `midly` or `std::fs` exist above its own
`midi` module; the CLI, WASM, and app layers own all real-world I/O and
presentation.

## Core modules (`midiremap-core/src`)

The dependency direction runs top to bottom; nothing lower depends on anything
higher.

```
conversion   ── end-to-end facade: bytes in → bytes + report out
   │
   ├── midi        ── MidiCodec (midly) + EventRewriter over the SMF stream
   │      │
   │      └── translate  ── Translator: note → Resolution; Report/ReportSink
   │             │
   │             ├── engine_map  ── Decoder / Encoder / EngineMap
   │             └── canon       ── Canon enum + FallbackResolver

catalog     ── MapProvider: BuiltinMaps (embedded) + LayeredMaps (user maps)
overrides   ── per-voice retargeting, layered over an Encoder and a Decoder
plan        ── per-voice source→target table (for UI display), no MIDI
```

### `canon` — the hub vocabulary

- `Canon`: a `Copy` hierarchical enum whose variants carry sub-enums and indices —
  `Kick(KickKind)`, `Snare(u8, SnareArtic)`, `Tom(TomPos, TomArtic)`,
  `Hat(HatOpen, HatZone)`, `Aux(u8, HatOpen, HatZone)`, cymbals, `Ride(u8, …)`,
  and aux percussion. Each `Canon` serializes to a stable **dotted lowercase key**
  via a hand-written `Serialize`/`Deserialize` (e.g. `kick.main`, `snare1.hit`,
  `tom.rack1.hit`, `hat.closed`, `crash.1.bell`, `ride.1`); these keys are the
  contract shared with the presets, JSON overrides, and the web app.
- `Canon::all()` enumerates every variant (used by exhaustiveness tests and to
  build the canon catalog), replacing an external iteration derive.
- `FallbackResolver` trait + `DefaultFallbacks`: given a canon, returns its
  ordered, nearest-first list of usable alternatives.

**Fallback invariant.** The resolver walk is *non-recursive*: it tries each slot
in the returned chain exactly once and does not expand that slot's own chain.
Therefore every chain must list the full transitive closure of alternatives,
nearest first, and the last element of any non-empty chain must itself have an
empty chain. The `chains_terminate` test enforces this.

### `engine_map` — one engine's note table

- `Decoder` (`note → Option<Canon>`) and `Encoder` (`Canon → Option<u8>`) traits.
- `EngineMap` implements both. Built from a TOML/JSON document (see below):
  - `to_canon: HashMap<u8, Canon>` — decode direction, one entry per listed note.
  - `from_canon: HashMap<Canon, u8>` — encode direction. A note flagged
    `primary` wins the reverse mapping; a duplicate primary for one canon is a
    build error. Non-primary notes fill a canon only if no primary claimed it.
- Note values are validated to `0..=127` at build time.

### `translate` — the pipeline, no MIDI

- `Translator { decoder, encoder, resolver }` — the hub-and-spoke pipeline as a
  pure function of one note number, with no side effects.
- Two result types keep partial cases unrepresentable:
  - `CanonResolution { Direct | Fallback | Dropped }` — total result of resolving
    a *canon* against the target. Cannot be "unmapped".
  - `Resolution { Resolved(CanonResolution) | Unmapped }` — result of resolving a
    *source note*, which may not decode at all.
  - `translate(note)` decodes then wraps `resolve_canon` in `Resolved`;
    `resolve_canon(canon)` is used directly by `plan` with no panic arm.
- `Report` + `ReportSink`: counting policy lives in one place, decoupled from the
  translation decision. `Report` tallies unmapped source notes, fallbacks used,
  and dropped canons; direct hits are not recorded.

### `midi` — the only module that knows `midly`

- `MidiCodec` trait + `StandardMidiCodec` (backed by `midly`). Used as a generic
  bound `C: MidiCodec`, never as `&dyn MidiCodec`, because `parse` is
  lifetime-generic (`Smf<'a>` borrows the input) and thus not object-safe. Every
  other trait in the crate *is* object-safe and is used behind `&dyn`.
- `EventRewriter` applies a `Translator` across the SMF event stream:
  - Note-on/off keys are rewritten to the resolved target note.
  - Unmapped / dropped notes are removed; a dropped event's delta is folded into
    the next kept event so timing does not shift.
  - Every non-note event (CC, meta, sysex) passes through untouched.
  - Each real note-on (velocity > 0) is reported once.

  No active `(channel, note)` tracking is needed: translation is a pure function
  of the note number, so a note-on and its note-off resolve identically and stay
  paired. The only accepted loss is many-to-one collisions (e.g. L/R kick → one
  note).

### `conversion` — end-to-end facade

- `Conversion { translator, codec }` with `run(bytes) → Converted { bytes, report }`.
- Free functions: `remap(mid, src, tgt)` and `remap_with_overrides(mid, src, tgt,
  ov)`. Empty overrides behave identically to `remap`.

### `catalog` — where engine maps come from

- `MapProvider` trait: `get(id)` / `ids()`.
- `BuiltinMaps`: every `engines/*.toml` (dozens of presets), embedded at compile
  time as a generated `embedded_engines::EMBEDDED` slice of `include_str!` sources
  and parsed once into a map keyed by engine id. A malformed embedded preset is a
  startup panic (covered by tests).
- `LayeredMaps<P>`: user-supplied JSON maps layered over a base provider. Lookups
  hit overrides first, then the base — a user map *shadows* a builtin, never
  mutates it. `ids()` returns the union.

### `overrides` — per-voice retargeting

- `Overrides { tgt: Vec<CanonNote>, src: Vec<CanonNote> }`, deserialized from
  `{ "tgt": [{ "canon", "note" }], "src": [{ "canon", "note" }] }`. `tgt` retargets
  the *encode* side ("encode this canon as this note"); `src` retargets the
  *decode* side ("read this source note as this canon"), which lets a note the
  source engine doesn't map be rescued to a canon. Note values validate to
  `0..=127`.
- `OverrideEncoder` wraps a base `Encoder`: an overridden canon uses the override
  note; everything else falls through to the base engine.
- `OverrideDecoder` wraps a base `Decoder`: an overridden source note decodes to
  the chosen canon; everything else falls through to the base engine.

### `plan` — the source→target table (UI, no MIDI)

- `plan(src, tgt, ov) → Vec<VoicePlan>`: one row per canon the *source* can
  produce, in `Canon::all()` order, giving `{ canon, src_note, tgt_note, status }`
  where status is `Direct | Fallback | Dropped`. `ov` is the same `Overrides`
  (`tgt` + `src`) used by conversion, so the preview matches the file the app
  would download. Powers the converter UI's mapping preview without touching a
  `.mid`.

## Engine preset format

Each `engines/*.toml` (and any user map, as JSON) is one engine:

```toml
id   = "ggd_invasion"
name = "GetGood Drums Invasion"
notes = [
  { note = 24, canon = "kick.main",   primary = true },
  { note = 25, canon = "kick.main"                    },  # duplicate note, decode-only
  { note = 26, canon = "snare1.hit",  primary = true },
  { note = 43, canon = "hat.closed",  primary = true },
]
```

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
midiremap convert <input.mid> <src_id> <tgt_id> <output.mid> [--user-map map.json]
midiremap list [--user-map map.json]
```

`convert` writes the remapped `.mid` and prints the loss report as pretty JSON to
stderr. `list` prints available engine ids.

### WASM (`midiremap-wasm`)

`wasm-bindgen` exports for the browser app:

- `remap(mid, src_id, tgt_id, overrides_json?) → { bytes, report }`
- `plan(src_id, tgt_id, overrides_json?) → [{ canon, label, src_note, tgt_note, status }]`
- `engine_catalog() → [{ id, name }]`
- `engine_drums(tgt_id) → [{ note, canon, label, family }]` — the target's playable
  voices, for the note editor's drum list.
- `engine_notes(src_id) → [{ note, canon, label, family }]` — the source's notes,
  for reassigning source notes.
- `canon_catalog() → [{ canon, label, family }]` — the full canon vocabulary, for
  the source-note canon picker.

Because each `Canon` serializes directly to its dotted string key, `Report`'s
`Canon`-keyed maps serialize to plain JS objects (the serializer is configured to
emit maps as objects); no separate re-keying step is needed.

### Web app (`app/`)

Vite + React + TypeScript + Tailwind, tested with Vitest/Testing-Library. It never
touches `.mid` bytes or the WASM edge directly; both are isolated so the rest of
the UI is pure data.

- **`lib/`** — framework-free logic and the boundary. `midiremap.ts` is the sole
  WASM adapter: a single init promise, `unknown → typed` casts confined here, and
  snake→camel normalization of the report and plan so the app never sees raw
  bindings. Sibling pure modules cover notes, mapping (de)serialization, the loss
  report builder, override assembly, file naming, and zipping.
- **`hooks/`** — `useRemapper` is the facade the UI consumes. It composes
  `useEngineCatalog` (load status + engine list), `useConverter` (files → results
  + report), and `useEditor` (per-note edits, the live `plan` preview, and derived
  counts) behind a stable return contract, plus a small selection reducer for
  source/target/octave/view. `useEditor`'s result is exposed as one nested
  `editor` bundle rather than a flat prop wall. Persistence lives in focused hooks
  (`useSavedMappings`, `useFavorites`).
- **`components/`** — the converter card (engine pickers, file chips, convert
  button, summary), the note editor (`EditView` + note/source pickers), and shared
  controlled-overlay modals (about/FAQ/engines/contact/terms, loss report). Modals
  are controlled overlays, not `<dialog>`, because the test environment lacks
  `showModal`.

Edit preview and downloaded output share one source of truth: the editor's rows
come from the core `plan` with the full overrides, so per-row target notes and
fallback propagation match the converted file exactly.

## Design rules (enforced)

- **Pure core.** All logic is I/O-free and unit-tested; the outer crates own bytes
  and presentation.
- **Make invalid states unrepresentable.** Trait direction (`Decoder` vs
  `Encoder`), the `Resolution` / `CanonResolution` split, and exhaustive `Canon`
  matches remove whole classes of error instead of documenting them.
- **Object-safe traits behind `&dyn`**, except `MidiCodec` (lifetime-generic
  `parse`), which is a generic bound.
- **Standard crates over hand-rolled** parsing, error handling, and serialization.
- The verify gate before every change is `fmt` + `test` + `clippy`, all clean.
```
