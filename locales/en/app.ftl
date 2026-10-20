brand-tagline = drum MIDI converter & remapper
nav-converter = Converter
nav-note-maps = Note maps
nav-drum-maps = Drum maps
section-guide-label = How to use
section-guide-heading = How to convert drum MIDI
section-faq-label = FAQ
section-faq-heading = Frequently asked questions
section-issue-label = Report an issue
section-issue-heading = Report an issue
section-contact-label = Contact
section-contact-heading = Contact
section-terms-label = Terms
section-terms-heading = Terms of use
skip-to-content = Skip to content
nav-main = Main
nav-site = Site
lang-menu-label = Language
lang-load-failed = Couldn't load { $language }. Check your connection and try again.
error-unknown-engine = Unknown { $role ->
    [source] source
   *[target] target
} engine '{ $id }'
error-bad-midi = Not a MIDI file this converter can read
error-bad-preset = Not a preset file
error-bad-overrides = The note edits couldn't be read
error-bad-missing = Unknown missing-drums setting
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
presets-unsaved = Couldn't save presets: the browser's storage is full or blocked. They will be gone when you reload.
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
unrecognized-label = Unknown notes
unrecognized-tip-title = When the source doesn't know a note
unrecognized-tip = Some notes in a file may not be in the source layout — a part written for another kit, say. Remove leaves them out of the file. Keep as they are writes them out unchanged, on the same note. The report lists them either way.
unrecognized-remove = Remove
unrecognized-keep = Keep as they are
unrecognized-hint-remove = leave them out of the file
unrecognized-hint-keep = write them out unchanged
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
convert-button-ready = { $count ->
    [one] Convert 1 file
   *[other] Convert { $count } files
} to { $target }
settings-heading = Settings
engine-from = FROM
engine-to = TO
engine-swap = Swap FROM and TO
engine-choose = Choose a drum plugin…
engine-picker-heading = Choose the { $side } engine
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
row-chain-hint = { $target } has no { $drum }, so { $standIn } plays it. Your edit sends { $standIn } to { $landed }. Click to go to { $standIn }.
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
files-sample = Try it with a sample groove
files-sample-needs-from = Pick a FROM engine first
files-remove = Remove { $name }
files-add-more = + add more
files-clear = clear all
step-file = Your drum file
step-engines = From one drum layout to another
step-convert = Convert
step-done = done
files-sample-lead = No file handy?
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
done-view-report = View report →
done-convert-more = Convert more
done-report-mapping = Wrong mapping? Report it
done-removed = { $count ->
    [one] { $count } note in your file isn't in the { $source } layout, so it was removed. Wrong source?
   *[other] { $count } notes in your file aren't in the { $source } layout, so they were removed. Wrong source?
}
done-kept = { $count ->
    [one] { $count } note in your file isn't in the { $source } layout, so it was kept unchanged. Wrong source?
   *[other] { $count } notes in your file aren't in the { $source } layout, so they were kept unchanged. Wrong source?
}
done-pick-source = Pick another source
done-assign-notes = Assign the notes
source-fit-missing = { $missing ->
    [one] { $missing } of { $hits } notes in your file isn't in the { $source } layout.
   *[other] { $missing } of { $hits } notes in your file aren't in the { $source } layout.
} Closer fits: { $engines }
source-fit-all = { $engine } (all notes)
source-fit-some = { $engine } ({ $count ->
    [one] { $count } note
   *[other] { $count } notes
})
drop-missing = Drop missing drums & convert again
report-dropped = Dropped
report-approximated = Approximated
report-unrecognized = Unrecognized
report-dropped-hint = { $target } has no such drum
report-approximated-hint = played on the nearest drum
report-unrecognized-hint = not in the { $source } map — removed from the file
report-unrecognized-hint-kept = not in the { $source } map — kept unchanged in the file
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
maps-popular = Popular conversions
maps-pair-link = { $source } to { $target }
