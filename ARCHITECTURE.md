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
toward a coarser articulation it can play (e.g. `HatOpen3 → HatOpen2 → HatOpen1 →
HatClosed`). If the chain is exhausted, the hit is **dropped** and recorded in a
loss report. A source note with no canonical meaning is **unmapped** and dropped.

## Workspace

Three crates plus embedded engine presets:

| Crate | Role | Depends on |
|-------|------|------------|
| `midiremap-core` | Pure engine. No I/O beyond parsing bytes handed to it. All the logic below. | `midly`, `serde`, `toml`, `serde_json`, `thiserror`, `strum` |
| `midiremap-cli` | Offline `convert` / `list` binary. | core, `clap`, `anyhow` |
| `midiremap-wasm` | Browser bindings for the React UI. | core, `wasm-bindgen`, `serde-wasm-bindgen` |
| `engines/*.toml` | Preset note↔canon maps, embedded into core via `include_str!`. | — |

`midiremap-core` never learns that `midly` or `std::fs` exist above its own
`midi` module; the CLI and WASM layers own all real-world I/O and presentation.

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
overrides   ── per-voice target note overrides, layered over an Encoder
plan        ── per-voice source→target table (for UI display), no MIDI
```

### `canon` — the hub vocabulary

- `Canon`: a `Copy` fieldless enum of ~30 drum articulations (kicks, snare
  variants, hats, toms, cymbals, aux). Derives `serde` (variant-name
  (de)serialization), `strum::EnumIter` (exhaustiveness tests), and
  `strum::IntoStaticStr` (stable string keys for JSON, used by the WASM layer).
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
- `BuiltinMaps`: the six presets, embedded at compile time via `include_str!` and
  parsed once. A malformed embedded preset is a startup panic (covered by tests).
- `LayeredMaps<P>`: user-supplied JSON maps layered over a base provider. Lookups
  hit overrides first, then the base — a user map *shadows* a builtin, never
  mutates it. `ids()` returns the union.

### `overrides` — per-voice retargeting

- `Overrides { tgt: Vec<CanonNote> }` — "encode this canon as this note",
  deserialized from `{ "tgt": [{ "canon", "note" }] }`.
- `OverrideEncoder` wraps a base `Encoder`: an overridden canon uses the override
  note, everything else falls through to the base engine.

### `plan` — the source→target table (UI, no MIDI)

- `plan(src, tgt, ov) → Vec<VoicePlan>`: one row per canon the *source* can
  encode, in `Canon` declaration order, giving `{ canon, src_note, tgt_note,
  status }` where status is `Direct | Fallback | Dropped`. Powers the converter
  UI's mapping preview without touching a `.mid`.

## Engine preset format

Each `engines/*.toml` (and any user map, as JSON) is one engine:

```toml
id   = "ggd_invasion"
name = "GetGood Drums Invasion"
notes = [
  { note = 24, canon = "KickMain",    primary = true },
  { note = 23, canon = "KickMain"                    },  # L kick, decode-only
  { note = 26, canon = "SnareCenter", primary = true },
  { note = 43, canon = "HatClosed",   primary = true },
]
```

- `note` — MIDI note number `0..=127`.
- `canon` — a `Canon` variant name.
- `primary` — optional (default `false`); the note used when *encoding* this
  canon. Multiple notes may decode to the same canon; exactly one may be primary.

Built-in engines: `ggd_invasion`, `ezdrummer`, `addictive_drums2`, `general_midi`,
`guitar_pro`, `superior_drummer3`.

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

`Report`'s `Canon`/`u8` map keys are re-keyed to strings (via `IntoStaticStr`) so
the payload serializes to plain JS objects.

## Design rules (enforced)

- **Pure core.** All logic is I/O-free and unit-tested; the outer crates own bytes
  and presentation.
- **Make invalid states unrepresentable.** Trait direction (`Decoder` vs
  `Encoder`), the `Resolution` / `CanonResolution` split, and exhaustive `Canon`
  matches remove whole classes of error instead of documenting them.
- **Object-safe traits behind `&dyn`**, except `MidiCodec` (lifetime-generic
  `parse`), which is a generic bound.
- **Standard crates over hand-rolled** parsing, error handling, and serialization.
- See `the engineering guidelines` for the full engineering rules (formatting, proof-by-test,
  comment policy) and the verify gate (`fmt` + `test` + `clippy`).
```
