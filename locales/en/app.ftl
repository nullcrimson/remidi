brand-tagline = drum MIDI converter & remapper
nav-converter = Converter
nav-note-maps = Note maps
section-guide-label = How to use
section-guide-heading = How to convert drum MIDI
section-guide-title = How to Convert Drum MIDI Between Engines | Drumverter
section-guide-description = Convert drum MIDI between GetGood Drums, EZdrummer, Superior Drummer, Addictive Drums and 80+ engines in three steps, free and in your browser.
section-faq-label = FAQ
section-faq-heading = Frequently asked questions
section-faq-title = Drum MIDI Converter FAQ | Drumverter
section-faq-description = Answers about Drumverter: cost, privacy, octave conventions (C-1 vs C-2), batch conversion and what happens to drums with no equivalent.
section-issue-label = Report an issue
section-issue-heading = Report an issue
section-issue-title = Report an Issue | Drumverter
section-issue-description = Found a wrong drum mapping, or want an engine added to Drumverter? Report it on GitHub or by email.
section-contact-label = Contact
section-contact-heading = Contact
section-contact-title = Contact | Drumverter
section-contact-description = Questions, feedback or engine requests for Drumverter, the free in-browser drum MIDI converter.
section-terms-label = Terms
section-terms-heading = Terms of use
section-terms-title = Terms of Use | Drumverter
section-terms-description = Terms of use for Drumverter, the free in-browser drum MIDI converter: provided as is, files never uploaded, anonymous cookieless statistics.
skip-to-content = Skip to content
nav-main = Main
nav-site = Site
lang-menu-label = Language
lang-load-failed = Couldn't load { $language }. Check your connection and try again.
lang-offer = This page is available in English →
open-converter = Open the converter →
error-unknown-engine = Unknown { $role ->
    [source] source
   *[target] target
} engine '{ $id }'
error-bad-midi = Not a MIDI file this converter can read
error-bad-preset = Not a preset file
error-bad-overrides = The note edits couldn't be read
error-bad-missing = Unknown missing-drums setting
error-bad-channel = Unknown channel setting
error-internal = Something went wrong
error-wasm-unavailable = Failed to load converter
error-detail = Details: { $detail }
blocker-files-and-engines = Add a .mid file and pick both engines
blocker-files = Add a .mid file to convert
blocker-engines = Pick a FROM and a TO engine
channel-auto = Auto
channel-all = All channels
channel-number = { $channel }
channel-hint-auto = tracks with channel-10 hits · others unchanged
channel-hint-all = every channel is converted
channel-hint-one = only channel { $channel } is converted
missing-nearest = Nearest
missing-drop = Drop
missing-hint-nearest = play on the closest drum
missing-hint-drop = leave them out
missing-hint-moved = { $count ->
    [0] no drum moves to another drum
    [one] { $count } drum played on another drum
   *[other] { $count } drums played on another drum
}
missing-hint-dropped = { $count ->
    [0] no drums dropped
    [one] { $count } drum dropped
   *[other] { $count } drums dropped
}
files-unreadable = Couldn't read { $names } — pick { $count ->
    [one] it
   *[other] them
} again.
preset-skipped = { $count ->
    [one] { $count } edit in '{ $name }' uses a drum this version doesn't know; skipped.
   *[other] { $count } edits in '{ $name }' use drums this version doesn't know; skipped.
}
import-failed = Couldn't import { $file }: { $error }
import-at-cap = Couldn't import { $file }: preset limit reached ({ $cap })
import-done = Imported '{ $name }'.
import-done-skipped = Imported '{ $name }' ({ $count ->
    [one] { $count } edit
   *[other] { $count } edits
} skipped).
edit-line = { $drum }: { $now } (default { $byDefault })
edit-more = +{ $count } more
app-intro = Convert drum MIDI between GetGood Drums, EZdrummer, Superior Drummer 3, Addictive Drums 2, General MIDI, Guitar Pro and 80+ other engine layouts. Runs in your browser; files are never uploaded.
app-loading = Loading converter…
convert-error = Error: { $error }
notice-dismiss = Dismiss
channel-label = Drum channel
channel-tip-title = Which notes get converted
channel-tip = Auto converts every track that uses channel 10 — the General MIDI drum channel — and leaves other instruments alone. Pick a channel or All if your drums are elsewhere.
missing-label = Missing drums
missing-tip-title = When the target lacks a drum
missing-tip = Nearest plays it on the closest drum the target has — a China on a crash, Tom 4 on Tom 3. Drop leaves it out. Ghost notes, rimshots and other ways of playing a drum the target does have always fall back to a plain hit on that drum.
edited-review = { $count ->
    [one] { $count } drum
   *[other] { $count } drums
} edited — review changes
edited-review-saved = { $count ->
    [one] { $count } drum
   *[other] { $count } drums
} edited — review changes, from preset { $name }
edited-review-unsaved = { $count ->
    [one] { $count } drum
   *[other] { $count } drums
} edited — review changes, not saved to { $name }
edited-differ = { $count ->
    [one] { $count } drum differs
   *[other] { $count } drums differ
} from the default mapping
edited-click = Click to review or reset.
edited-count = { $count } edited
edited-count-unsaved = { $count } edited · unsaved
octave-label = Octaves start at
octave-tip-title = Octave naming only
octave-tip = Sets which octave MIDI note 0 sits in, so note names match your DAW. Display label only — the notes written to the file never change.
canon-picker-label = Canon for { $note }
canon-picker-heading = SOURCE · { $note }
close = Close
dropzone-heading = DROP .MID
dropzone-presets = or an exported preset (.json)
convert-running = remapping
convert-button = Convert
engine-from = FROM
engine-to = TO
engine-swap = Swap FROM and TO
filter-clear = Clear filter
note-picker-label = Target note for { $drum }
note-picker-heading = TARGET · { $drum }
source-picker-label = Source note for { $drum }
source-picker-heading = INCOMING · { $drum }
mid-badge = MID
plan-error = The note editor could not load: { $error }
plan-error-reset = Reset edits
crash-heading = Something went wrong
crash-body = The converter hit an error it could not recover from. Reloading usually fixes it; if it keeps happening, a saved preset may be damaged.
crash-reload = Reload
crash-reset = Reset saved data…
crash-reset-confirm = Delete saved presets, favourites and settings?
crash-reset-do = Delete and reload
cancel = Cancel
saved-group = Saved mappings
saved-heading = SAVED
edit-back = ← Back
edit-heading = Edit notes
edit-advanced = Advanced — reassign source notes
summary-remapped = { $total ->
    [one] { $remapped } of { $total } drum remapped
   *[other] { $remapped } of { $total } drums remapped
}
summary-edit-tip-title = Fine-tune each drum
summary-edit-tip = Reassign any drum to a different target note — pick from the drum list or the piano. Your changes apply to the conversion and can be saved as a preset.
summary-edit = Edit individual notes →
missing-detail-moved = Played on another drum
missing-detail-dropped = Left out of the file
detail-edit = Change in note editor →
summary-detail-heading = { $total ->
    [one] { $total } drum in this mapping
   *[other] { $total } drums in this mapping
}
summary-detail-moved = on a new note
summary-detail-same = already on the right note
summary-detail-variant = played on a close variant
summary-detail-swapped = played on another drum
summary-detail-dropped = left out
summary-detail-unplayed = not in the source engine
summary-reason-same = same note in both engines
summary-reason-variant = no exact match in { $target } — a variant of the same drum plays
summary-reason-swapped = not in { $target } — the closest drum plays instead
summary-reason-dropped = not in { $target }, so left out
summary-reason-unplayed = no note in { $source }
row-extras-dropped = { $count ->
    [one] { $count } more source note plays { $drum }: { $notes }. None has a target.
   *[other] { $count } more source notes play { $drum }: { $notes }. None has a target.
}
row-extras = { $count ->
    [one] { $count } more source note plays { $drum }: { $notes }. Both go to { $target }.
   *[other] { $count } more source notes play { $drum }: { $notes }. All go to { $target }.
}
row-reset = Reset { $drum }
edit-filter-label = Filter drums
edit-filter-placeholder = filter drums…
library-filter-placeholder = filter…
edit-show = Show
edit-show-all = All { $count }
edit-show-changed = Changed { $count }
edit-show-issues = Issues { $count }
edit-actions = Edit actions
edit-changes = { $count ->
    [0] No changes
    [one] { $count } change
   *[other] { $count } changes
}
edit-reset-all = Reset all
edit-done = Done
row-no-source = no source
row-dropped = dropped
rows-drum = DRUM
rows-source = SOURCE
rows-target = TARGET
rows-plays = PLAYS
rows-none = No drums match
rows-reassigned = { $note } was { $from } — now plays { $drum }
preset-tip-title = Reuse this mapping
preset-tip = Saves the FROM→TO pair and any note changes as a chip on the main screen — one click reloads it. Kept in this browser only.
preset-update-open = Update preset
preset-save-open = Save as preset
preset-name = Preset name
preset-update = Update
preset-save-new = Save new
preset-save = Save
preset-exists = A preset for { $pair } already exists.
preset-at-cap = Preset limit reached ({ $cap }).
source-unassigned = — unassigned
source-unmapped = unmapped
source-clear = Clear source note { $note }
source-add-label = Add source note
source-add-placeholder = add note 0–127
source-add = add
source-add-invalid = Enter a note number from 0 to 127
library-group = { $side } engine
library-filter = Filter { $side } engines
library-hint = Type to filter. Arrow keys move, Enter picks, Ctrl+Enter adds or removes a favourite.
library-list = { $side } engines
library-favourites = Favourites
library-all = All engines
library-none = no matches
files-skipped = Skipped { $names } — only .mid files and exported presets (.json) can be added
files-drop = Drop one or more .mid files anywhere
files-choose = Choose files
files-presets = Preset files you exported (.json) can be dropped or chosen the same way.
files-remove = Remove { $name }
files-add-more = + add more
files-clear = clear all
chip-rename = Rename
chip-duplicate = Duplicate
chip-export = Export
chip-delete = Delete
chip-rename-label = Rename { $name }
chip-rename-save = Save name
chip-rename-cancel = Cancel rename
chip-overrides = { $count ->
    [one] { $count } override
   *[other] { $count } overrides
}
chip-unavailable = engine unavailable
chip-edit = Edit notes for { $name }
chip-more = More actions for { $name }
chip-at-cap = preset limit reached
done-tag-converted = { $count ->
    [one] { $count } note converted
   *[other] { $count } notes converted
}
done-tag-nothing = nothing converted
done-tag-approximated = { $count } approximated
done-tag-dropped = { $count } dropped
done-tag-unrecognized = { $count } unrecognized
done-tag-untouched = { $count } on other channels unchanged
done-tag-failed = { $count } failed
done-file-approximated = { $count } approx
done-file-dropped = { $count } dropped
done-file-unrecognized = { $count } unrec.
done-file-clean = clean
done-heading = { $count ->
    [one] { $count } file
   *[other] { $count } files
} converted → { $target }
done-edited = { $count ->
    [one] { $count } drum
   *[other] { $count } drums
} edited
done-download-one = ↓ Download .mid
done-download-zip = ↓ Download { $count } files (.zip)
done-files = Converted files
done-file-download = ↓ .mid
tip-link = Buy me a coffee
tip-ask = I build Drumverter alone, in my spare time. If it saved you some remapping, a coffee keeps it free and ad-free.
tip-amounts = Leave a tip
tip-other = Other amount
thanks-title = Thank you | Drumverter
thanks-description = Thank you for supporting Drumverter, the free drum MIDI converter.
thanks-heading = Thank you!
thanks-body = Your coffee keeps Drumverter free and ad-free. Stripe emails you the receipt.
done-view-report = View report →
done-convert-more = Convert more
done-report-mapping = Wrong mapping? Report it
drop-missing = Drop missing drums & convert again
report-dropped = Dropped
report-approximated = Approximated
report-unrecognized = Unrecognized
report-dropped-hint = { $target } has no such drum
report-approximated-hint = played on the nearest drum
report-unrecognized-hint = not in the { $source } map — removed from the file
report-pick-target = Pick a target →
report-assign = Assign →
report-across = { $summary } across { $count } files
report-contact = Wrong mapping or missing engine? Open a { $issue } or email { $email }.
report-contact-issue = GitHub issue
report-unchanged = Unchanged
report-unchanged-hint = other tracks / channels
report-unchanged-entry = Notes on other tracks or channels, left as they were
report-channel = Drum channel →
report-nothing = Nothing was converted
report-nothing-channel = — no notes on the selected drum channel. Pick another drum channel or All.
report-nothing-notes = — no drum notes found in this file.
report-clean = Clean conversion
report-clean-detail = — every drum mapped directly to { $target }.
report-heading = Conversion report
converter-title = Drumverter — free drum MIDI remapper & converter
converter-description = Free drum MIDI converter: remap drum MIDI between GetGood Drums, EZdrummer, Superior Drummer, Addictive Drums, General MIDI and Guitar Pro in-browser.
converter-og-description = Convert drum MIDI between GetGood Drums, EZdrummer, Superior Drummer, Addictive Drums and 80+ more engines. Free, in-browser.
converter-image-alt = Drumverter — drum MIDI converter and remapper
converter-twitter-description = Free in-browser drum MIDI remapper — remap drum MIDI between sample-engine note layouts.
converter-app-description = Free in-browser tool that remaps drum MIDI between sample-engine note layouts.
converter-noscript = Drumverter is a free drum MIDI remapper. It remaps a drum MIDI file written for one sample engine's note layout into another's — for example remapping GetGood Drums to EZdrummer, Superior Drummer, Addictive Drums, General MIDI, or Guitar Pro — using a canonical drum vocabulary with per-slot fallbacks. This MIDI remapping runs entirely in your browser; enable JavaScript to use the converter.
load-failed = Drumverter couldn't load. Check your connection and reload the page.
load-failed-reload = Reload
maps-breadcrumb = Breadcrumb
maps-index-title = Drum MIDI Note Maps for { $count } Drum Engines | Drumverter
maps-index-description = Drum MIDI note maps for { $count } drum engines, plus conversion tables between GetGood Drums, EZdrummer, Superior Drummer, Addictive Drums and more.
maps-index-heading = Drum MIDI note maps
maps-index-intro = Note charts for { $count } drum engines and conversion tables between the most popular ones — the same mapping data the Drumverter converter uses.
maps-popular = Popular conversions
maps-more-engines = More engines
maps-matrix-corner = FROM ↓ TO →
maps-pair-link = { $source } to { $target }
maps-matrix-hint = Each arrow opens the conversion table from the row’s engine to the column’s.
maps-all-engines = All { $count } engines
maps-filter-engines-label = Filter engines
maps-filter-engines-placeholder = Filter engines…
maps-no-engines = No engines match
maps-engine-title = { $engineMidi } Note Map & Drum Mapping | Drumverter
maps-engine-title-long-name = MIDI Note Map: { $engine } | Drumverter
maps-engine-description = { $engine } drum MIDI note map: all { $total } notes with drum names in C-1 and C-2 octave conventions.
maps-engine-description-short = { $engine } drum MIDI note map with C-1 and C-2 note names.
maps-engine-description-more = Convert { $engineMidi } to any engine, free.
maps-engine-heading = { $engine } drum MIDI note map
maps-engine-intro = Every MIDI note { $engine } responds to — { $total } in total — grouped by drum. Note names follow either octave convention: C-1 (Reaper, Logic, Ableton, Guitar Pro) or C-2 (Studio One, Cubase, FL Studio).
maps-convert-to = Convert to { $engine }
maps-convert-from = Convert from { $engine }
maps-filter-drums-label = Filter drums
maps-filter-drums-placeholder = Filter by drum or note…
maps-octave-naming = Octave naming
maps-column-note = Note
maps-column-drum = Drum
maps-conversion-tables = Conversion tables
maps-pair-heading = Convert { $sourceMidi } to { $target }
maps-pair-title = Convert { $sourceMidi } to { $target } | Drumverter
maps-pair-description = Convert { $source } drum MIDI to { $target }: { $exact } { $exact ->
    [one] note maps
   *[other] notes map
} exactly, { $approximated } approximated, { $dropped } dropped.
maps-pair-description-more = Free in-browser converter.
maps-pair-summary = Of { $total } { $source } notes, { $exact } { $exact ->
    [one] maps
   *[other] map
} exactly to { $target }, { $approximated } { $approximated ->
    [one] is
   *[other] are
} approximated with the closest available drum, and { $dropped } { $dropped ->
    [one] has
   *[other] have
} no equivalent.
maps-pair-convert = Convert { $source } → { $target }
maps-reverse = ⇄ Reverse direction
maps-exact-count = { $count } exact
maps-approximated-count = { $count } approximated
maps-dropped-count = { $count } dropped
maps-rows = Rows
maps-rows-changes = Changes { $count }
maps-column-engine-note = { $engine } note
maps-column-engine-drum = { $engine } drum
maps-column-to = to
maps-column-result = Result
maps-no-equivalent = no equivalent
maps-status-exact = exact
maps-status-approximated = approximated
maps-status-dropped = dropped
maps-more-from = More from { $engine }
maps-full-maps = Full note maps:
