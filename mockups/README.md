# Handoff: MIDI Drum Remapper — Minimalist direction

## Overview
A free, no-account tool that converts MIDI drums written for one drum library to another (e.g. **EZdrummer 3 → GetGood Drums Modern & Massive**) by remapping note numbers. This is the **minimalist direction** of the redesign: a single calm screen, warm-neutral palette, no panels/skeuomorphism, type-led.

It is **one app with two views**:
- **Convert** (default): drop a file → pick **From** / **To** libraries → set octave numbering → **Convert & download**.
- **Edit mapping**: opened via "Edit individual notes" — a per-voice editor where each drum's **source and target** note can be reassigned with an octave-tabbed piano picker. **Save mapping** returns to Convert.

## About the Design Files
The files in this bundle are **design references created in HTML** — a prototype showing intended look and behavior, **not production code to copy directly**. The task is to **recreate this design in the target codebase (React)** using its established component patterns and styling approach. The MIDI parsing/remapping is **mocked** (fake progress, hardcoded note maps); real implementation must read a `.mid`, apply the note map, and write/download the result (see *State* and *Behavior*).

## Fidelity
**High-fidelity.** Final colors, typography, spacing, and interaction states are specified below and visible in the prototype. Fonts (Google Fonts): **Space Grotesk** (buttons/headings), **IBM Plex Sans** (body), **IBM Plex Mono** (note values, technical labels).

## How to view the prototype
Open **`MIDI Remapper Minimal (standalone preview).html`** in any browser (self-contained, offline). `MIDI Remapper Minimal.dc.html` is the editable source (a streaming "Design Component"; `support.js` is its runtime and is **not** part of the design to implement).

## Views

### Convert view (default)
A centered card, **480px** wide (`max-width:100%`, full-width on mobile), bg `#100f0d`, 1px border `rgba(255,255,255,.06)`, radius 18px, padding `34px 34px 30px`, vertical flex `gap:28px`. Top-aligned on the page (`padding:6vh 20px 60px`), bg `#0c0e11`.

Top to bottom:
1. **Header row:** "midiremap" wordmark (mono 13px, `#888076`) left, "free" (mono 11px, `#46423b`) right.
2. **File row:** `MID` tag (mono, accent `#c7c0ad`) + filename (`metalcore-groove_01.mid`, 14px `#ece8e0`, truncates) + "replace" link (hover → red `#ff8a8a`). Bottom hairline.
3. **From / To:** 2-column grid, `gap:22px`. Each column = uppercase mono label (`FROM`/`TO`, `#57524a`, letter-spacing `.14em`) above a **scrollable list** of libraries (`max-height:176px`). List items are plain text rows (no boxes): selected = accent left-bar (`2px #c7c0ad`) + brighter text (`#ece8e0`, weight 600); unselected = `#888076`, weight 400; hover brightens to `#ece8e0`. The scroll area has a **thin rounded accent scrollbar** (6px, thumb `rgba(199,192,173,.28)`, → `.5` on hover) and a **top/bottom fade mask** (`mask-image:linear-gradient(180deg,transparent,#000 14px,#000 calc(100% - 14px),transparent)`).
4. **Octave numbering:** "Octaves start at **C-1**" — C-1/C-2 is a dashed-underline toggle (mono, `#ece8e0`, hover accent) + a "switch ⇄" affordance (right-aligned). A second line shows the matching DAWs in dim mono (`#6e6753`): C-1 → "Reaper · Logic · Ableton", C-2 → "Studio One · Cubase · FL Studio".
5. **Summary + edit:** top hairline, then "**N** of 14 drums remapped" (N accent) left, and "✎ Edit individual notes →" link (dashed underline, hover accent) right → switches to Edit view.
6. **Convert (3 states):**
   - *idle:* full-width **outline** button, border+text accent `#c7c0ad`, label "Convert & download". Hover fills (bg `#c7c0ad`, text `#1b1813`) — implemented with `!important` so the fill text color wins (see *Gotchas*).
   - *running:* "remapping" + percent (mono) over a 2px track (`rgba(255,255,255,.08)`) with an accent fill animating to 100%.
   - *done:* "↓ download .mid" + summary "N remapped · M kept → GGD" + an "again" reset link.

### Edit mapping view
Same card, padding `26px 30px 24px`, `gap:20px`.
1. **Header:** "← back" (→ Convert) + "Edit mapping" title; right side shows "EZD → GGD" (short lib names, mono).
2. **Voice list:** one row per drum (14), grid `1fr auto 16px auto`, bottom hairlines. Each row = voice name (`#b3ada0`, truncates) + **source chip** + "→" + **target chip**. Chips are clickable mono pills (`padding:3px 9px`, radius 6px). Target chip is accent-tinted when its note differs from source (`changed`); both chips show an active accent border/bg when their picker is open.
3. **Note picker (inline accordion):** clicking a chip expands a picker beneath that row (bg `rgba(255,255,255,.018)`, 1px `rgba(199,192,173,.18)`, radius 10px):
   - **Header:** "SOURCE · {voice}" or "TARGET · {voice}" (mono caps) + current note name big accent + a "×" close.
   - **Octave tabs:** wrapping row of buttons `-1 … 7`; selected = accent border + tint.
   - **Piano:** one octave drawn as a real keyboard — 7 white naturals (flex row, light keys `#cfc9bb`, dark text, `height:86px`) with 5 black sharps absolutely positioned over them (`#16140d`, `height:54px`, `width:8.6%`, lefts `[10.0, 24.3, 52.8, 67.1, 81.4]%`). The currently-set note is highlighted accent (white key: accent fill + inset ring; black key: accent fill + glow). Clicking a key sets that side's note and closes the picker.
4. **Footer:** "● = remapped" legend (left) + a filled **"✓ Save mapping"** pill (right) → returns to Convert.

## Interactions & Behavior
- **Library select** sets From/To and resets the convert state to idle. Picking the two libraries **is** the remap (preset-based note map). 
- **Octave toggle** flips C-1 ⇄ C-2 (your DAW's octave-labeling convention; affects how note names display, not which library). Default C-1.
- **Edit individual notes** → Edit view; **Save mapping** / **← back** → Convert view (closes any open picker).
- **Note picker:** open via a chip, change octave via tabs, pick a key → updates that voice's source/target note number; the row's chip + the "N remapped" counter update live; "changed" coloring follows `srcNote !== tgtNote`.
- **Convert flow:** idle → running → done. In the prototype *running* animates ~7–14%/110ms to 100%; **replace with the real remap job** (parse → remap note numbers → re-encode → download), driving progress from real work or an indeterminate spinner.
- **Note naming:** MIDI standard, C-1 = note 0 (so 60 = C4). Display name = `NAMES[n % 12] + (floor(n/12) - 1)`.

## State
- `src`, `tgt` — selected library indices (into the 12-item library list).
- `oct` — `'c1' | 'c2'`.
- `conv` — `'idle' | 'running' | 'done'`; `prog` — 0–100.
- `view` — `'convert' | 'edit'`.
- `edits` — map of `"{voiceIndex}-{src|tgt}" → noteNumber` overriding defaults.
- `pick` — `null | { idx, side: 'src'|'tgt', oct }` (which picker is open + its current octave).
- **Real remap logic (to build):** read MIDI, build a source→target note-number map from the chosen libraries (overridden per-voice by `edits`), apply, re-encode, download. The octave setting only changes display unless your engine needs it for I/O.

## Design Tokens
**Colors (warm neutral):** accent (bone) `#c7c0ad`; accent tints `rgba(199,192,173, α)` (α .06 .08 .12 .15 .18 .28 .35 .5 .7); text-on-accent `#1b1813`; backgrounds `#0c0e11` (page), `#100f0d` (card), inset `rgba(255,255,255,.018)`; piano white key `#cfc9bb`, black key `#16140d`, key border `#2a2620`; LCD/deep accents `#8c8473`, `#6e6753`; text `#ece8e0` / `#b3ada0` / `#9c9486` / `#888076` / `#57524a` / `#46423b`; remapped-marker reuse accent; destructive-hover `#ff8a8a`; hairlines `rgba(255,255,255,.045–.06)`.
**Type:** Space Grotesk (buttons), IBM Plex Sans (body 11–14px), IBM Plex Mono (note values, uppercase labels with `.04–.14em` tracking).
**Radius:** card 18px · chips/pills 6–11px · keys 0 0 4–5px. **Scrollbar:** 6px, rounded accent thumb + edge fade mask.

## Assets
- **Fonts:** Google Fonts — Space Grotesk, IBM Plex Sans, IBM Plex Mono.
- **Glyphs:** typographic only (`→`, `↓`, `✎`, `✓`, `×`, `●`, `⇄`) — swap for your icon set if preferred. No images/logos.
- **Sample data:** 12 libraries (GM Standard, EZdrummer 3, Superior Drummer 3, GetGood Drums M&M, GGD Invasion, GGD Matt Halpern, Steven Slate SSD5, Addictive Drums 2, BFD3, MODO Drum, Toontrack Metal!, Ugritone KVLT) and a 14-voice drum map with source/target note numbers — illustrative; use real library mappings in production.

## Gotchas for implementation
- **Hover that changes a property also set inline:** in the prototype, inline styles win specificity over `:hover` rules, so any hover that recolors text/bg that's also set inline must use `!important` (or you keep the value in the hover, not inline). In React with CSS modules / styled-components this isn't an issue — just author the hover states normally.
- **Black-key positions** are percentages of the keyboard width assuming zero gap between white keys; keep white keys gapless or recompute the lefts.
- The two views share one card; animate the transition if desired (the prototype just swaps).

## Files
- `MIDI Remapper Minimal (standalone preview).html` — self-contained; open to interact with the design.
- `MIDI Remapper Minimal.dc.html` — editable source. Logic lives in the `class Component` script at the bottom (state, the remap data in `DATA`, library list in `LIBS`, and `renderVals()` which builds all view models). `support.js` is runtime only — not part of the design.
