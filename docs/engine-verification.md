# Engine map verification

Each engine map in `engines/*.toml` says which drum every MIDI note plays. Most maps were first
imported from a third-party list. On 2026-10-28 every map was checked against the best source
available. This file records what each map rests on and what still needs a recheck.

## How a map is checked

1. **In the plugin:** a screenshot of the plugin's own mapping page (for GetGood Drums: Settings →
   Mappings, per mapping preset; for EZdrummer 3: MIDI In → Mapping, per drum), compared note by
   note.
2. **Played:** an A/B test in Ableton Live. File A hits every drum of one mapping preset once; file
   B is the same file converted to the plugin's default map. Played through the matching preset,
   both must sound the same hit for hit. A drum-names rack on each track names the hits.
3. **Vendor document:** the vendor's manual, key map PDF or published note list.
4. **Third party:** lists made by users (pitch lists, DAW racks, forum posts). Lower confidence,
   especially where two lists disagree.

Every fix gets a decode test in `midiremap-core/src/catalog.rs` that failed before the fix, and
the walkthrough golden (`midiremap-core/tests/golden/walkthrough.txt`) shows how each target's
written notes change.

## Checked

| Engine | Source | Notes |
|---|---|---|
| `ggd_invasion_ggd`, `ggd_modernmassive_ggd`, `ggd_modernmassive_gm` | in the plugin, then played | fixed 2026-10-28 (toms, crashes and china choke; open hats; hi-hat "Ching") |
| `ggd_modernmassive` | in the plugin | added 35 (floor tom 1, second key) and 44 (hi-hat "Ching") |
| `ggd_dryfunky` | in the plugin | added 36, 54, 55, read only (second keys of the plugin's explicit "Invasion" preset) |
| `ggd_architects` | in the plugin | removed 28 |
| `ggd_dryfunky_ggd`, `ggd_dryfunky_gm`, `ggd_dryfunky_halpern`, `ggd_classicrock`, `ggd_classicrock_ggd`, `ggd_classicrock_gm`, `ggd_classicrock_halpern`, `ggd_brutal`, `ggd_modernfusion`, `ggd_poppunk`, `ggd_p5_halpern` | in the plugin | match |
| `ujam_heavy` | in the plugin | fixed: 58 removed (a mute-mode key), 39 clap, 40 rimshot, keys from 60 up are grooves |
| `ezdrummer` | in the plugin (Drumkit from Hell kit) | keys every kit shares match; 39 ruff and 69 flam fixed |
| `bfd3` | vendor manual (BFD3.5 §3.1) | fixed: Ride 1 and Cymbal 1 were filed as ride 1 and ride 2; 18/20/22 removed; 39 open hat shank |
| `guitar_pro` | vendor docs (Guitar Pro 8) | fixed: 31 sticks, 37 side stick, 59 second ride edge, 35 second kick, 40 second snare |
| `addictive_drums2` | vendor key map PDF | fixed: 101 is a Flexi slot (percussion), not a snare |
| `ni_abbeyroad_modern` | vendor manual | fixed: crash 1 and crash 2 were swapped |
| `general_midi` | GM1 standard | added 39 hand clap, 40 electric snare, 69/70 shakers |
| `perfectdrums`, `alanvista_royotoms` | vendor manual | added 2026-10-28 |
| `ggd_invasion`, `ggd_aggressiverock`, `ggd_metal`, `ni_studiodrummer`, `mt_power`, `bogren_trivium`, `roomsound_blastingroom`, `rsdrums_monarch`, `soniccouture_sun` | vendor document | match |
| `mixwave_wackerman` | vendor document | first page matches; the rest not checked |
| `superior_drummer3` | third party (full pitch list) | 39 ruff fixed; see the recheck list |
| `midiremap_standard` | none needed | Drumverter's own layout |

## To recheck

None of these can be settled from public sources. Each needs someone with the plugin: a
screenshot of its mapping page (or the vendor's support), then a test-first fix.

### Suspected wrong drum

| Engine | Notes | Question |
|---|---|---|
| `ggd_p4_halpern` | 77 | splash 3 (ours) or mini hats? |
| `ggd_modernmassive2` | 37 | sticks (ours) or snare cross stick? |
| `hertz2` | 13; 5, 10, 11 | 13 closed hat (ours) or hi-hat choke? Do 38, 40, 37 play the same as 11, 10, 5? |
| `roomsound_ballou` | 84–95, 66 | the cymbal layout differs between volumes |
| `mixwave_fang` | 5–12 | rack toms (ours) or timbales? |
| `mixwave_mangini` | 24, 36 | the Default preset puts the kick on 24 and floor toms on 36/35/33/31 |
| `drumforge_bergstrand` | 69, 74 | a separate bell cymbal (ours) or the ride bell played with the shaft? |
| `klangmacht` | 88, 97, 100, 105, 110 | the cymbal type in each slot changes per kit |

### Wrong stroke or missing notes

| Engine | Notes |
|---|---|
| `ggd_halpern` | 63, 68 (crash bell or bow tip?); 25, 65, 70, 82 missing |
| `ggd_modernmassive2` | 44, 46, 48 (second tom keys); 53–77 unchecked |
| `bogren_krimh` | 37 (tom FX or floor tom 3?), 54 (crash 1 or 2?) |
| `drumforge_ultimate` | 41 (mid tom), 55/56 (loose or closed hat), 72–80 (second ride, china, splash) |
| `odeholm_alt`, `odeholm` | 36/37 and 41/43: floor toms swapped? |
| `goran_grooves_handy` | 40, 73, 83, 85 |
| `rsdrums_fairview` | 63 (ride bell tip or bow tip?) |
| `spectre_ele_masterkit` | 68 (ride tip edge or bow tip?) |
| `soundblind_counterkit` | 40 (rimshot or rim?), 64/65 (CC-controlled hat?) |
| `redpack_dsdrum` | 91 (silent?), 103 (missing?) |
| `mixwave_duplantier` | 12–15, 58, 62, 64, 70 (timbales and an extra cymbal missing) |
| `hertz2` | 84–89 (tambourine and cowbell missing) |
| `klangmacht` | 38, 65, 68 |

### No public map: compare the whole map

- GetGood Drums: `ggd_bennygreb`, `ggd_grooveplayer` (25 missing?), `ggd_numetal`, `ggd_halpern_ggd`,
  `ggd_halpern_gm`.
- MixWave: `mixwave_royster` (tom and rim numbering looks crossed), `mixwave_archey`,
  `mixwave_gillespie`, `mixwave_holland`, `mixwave_pridgen`, `mixwave_weinberg`.
- Others: `drumforge_greiner`, `ugritone`, `hertz` (looks like an older layout),
  `mdltone_ultimateheavy`, `prenc_kinglake` (the vendor lists 8 toms and 2 kicks; ours has 4 and
  1), `solemntones_mjolnir`, `fotis_benardo` (51 hat bark or pedal splash? 4 or 5 toms?),
  `ni_butchvig`, `ni_drumlab`, `eastwest_prodrummer`, `dw_soundworks`, `impact_xt`,
  `impact_xt_roomyrock`, `ml_drums`.

### Major vendors, partly checked

| Engine | Open |
|---|---|
| `ezdrummer` | 65 (closed hat edge or sequenced hits?), 95, 56: need the core kit |
| `ezdrummer2` | 39 and 69 (ruff and flam as in EZdrummer 3?), 65 (we write percussion there; the source says sequenced hats) |
| `superior_drummer3` | 65 (as above), 20 (hat shaft or bell trigger?), 67 and 127 (brush strokes or side stick?) |
| `bfd3` | are the tom pairs in reverse pitch order? |
| `logic_pro_drummer` | 47 (separate high-mid tom?), 34 (snare edge?), 75 (silent?) |
| `roland_td17` | snare rim = rimshot? closed hat mapped as tight? |
| `beatbuddy` | 33: metronome or sticks? |
| `ml_drums_free` | 57, 65: does the free version have a second china? |
| `ssd5` | third-party sources only; 90 |
| `guitar_pro` | 126, 127 (third-party source only) |
| `general_midi` | 60–68, 71–81 (Latin percussion) have no drum slot in the shared vocabulary yet |
| `ni_abbeyroad_modern` | 79, 80 (hat openings) |
