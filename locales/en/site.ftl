section-guide-title = How to Convert Drum MIDI Between Engines
section-guide-description = Convert drum MIDI between GetGood Drums, EZdrummer, Superior Drummer, Addictive Drums and 80+ engines in three steps, free and in your browser.
section-faq-title = Drum MIDI Converter FAQ
section-faq-description = Answers about Drumverter: cost, privacy, octave conventions (C-1 vs C-2), batch conversion and what happens to drums with no equivalent.
section-issue-title = Report an Issue
section-issue-description = Found a wrong drum mapping, or want an engine added to Drumverter? Report it on GitHub or by email.
section-contact-title = Contact
section-contact-description = Questions, feedback or engine requests for Drumverter, the free in-browser drum MIDI converter.
section-terms-title = Terms of Use
section-terms-description = Terms of use for Drumverter, the free in-browser drum MIDI converter: provided as is, files never uploaded, anonymous cookieless statistics.
lang-offer = This page is available in English →
open-converter = Open the converter
thanks-title = Thank you
thanks-description = Thank you for supporting Drumverter, the free drum MIDI converter.
thanks-heading = Thank you!
thanks-body = Your coffee keeps Drumverter free and ad-free. Stripe emails you the receipt.
converter-description = Free drum MIDI converter: remap drum MIDI between GetGood Drums, EZdrummer, Superior Drummer, Addictive Drums, General MIDI and Guitar Pro in-browser.
converter-og-description = Convert drum MIDI between GetGood Drums, EZdrummer, Superior Drummer, Addictive Drums and 80+ more engines. Free, in-browser.
converter-image-alt = Drumverter — drum MIDI converter and remapper
converter-twitter-description = Free in-browser drum MIDI remapper — remap drum MIDI between sample-engine note layouts.
converter-app-description = Free in-browser tool that remaps drum MIDI between sample-engine note layouts.
converter-noscript = Drumverter is a free drum MIDI remapper. It remaps a drum MIDI file written for one sample engine's note layout into another's — for example remapping GetGood Drums to EZdrummer, Superior Drummer, Addictive Drums, General MIDI, or Guitar Pro — using a canonical drum vocabulary with per-slot fallbacks. This MIDI remapping runs entirely in your browser; enable JavaScript to use the converter.
load-failed = Drumverter couldn't load. Check your connection and reload the page.
load-failed-reload = Reload
maps-breadcrumb = Breadcrumb
maps-index-title = Drum MIDI Note Maps for { $count } Drum Engines
maps-index-description = Drum MIDI note maps for { $count } drum engines, plus conversion tables between GetGood Drums, EZdrummer, Superior Drummer, Addictive Drums and more.
maps-index-heading = Drum MIDI note maps
maps-index-intro = Note charts for { $count } drum engines and conversion tables between the most popular ones — the same mapping data the Drumverter converter uses.
maps-more-engines = More engines
maps-matrix-corner = FROM ↓ TO →
maps-matrix-hint = Each arrow opens the conversion table from the row’s engine to the column’s.
maps-all-engines = All { $count } engines
maps-filter-engines-label = Filter engines
maps-filter-engines-placeholder = Filter engines…
maps-no-engines = No engines match
maps-engine-title = { $engineMidi } Note Map & Drum Mapping
maps-engine-title-long-name = MIDI Note Map: { $engine }
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
maps-all-notes = All { $total } notes
maps-groups-label = Drum groups
maps-extra-hint = Dimmed rows are extra notes for a drum that already has a main note.
maps-pairs-from = From { $engine } to
maps-pairs-to = To { $engine } from
maps-core-heading = The notes you will use most
maps-core-hint = The main note of each drum, the one the converter writes.
maps-pair-heading = Convert { $sourceMidi } to { $target }
maps-pair-title = Convert { $sourceMidi } to { $target }
maps-pair-description = Convert { $source } drum MIDI to { $target }: { $exact } { $exact ->
    [one] note maps
   *[other] notes map
} exactly, { $approximated } approximated, { $dropped } dropped.
maps-pair-description-more = Free in-browser converter.
maps-pair-description-short = Convert { $source } drum MIDI to { $target }.
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
maps-steps-label = Convert in three steps
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
maps-changes-heading = What changes
maps-changes-plays = plays { $sources }
maps-changes-dropped = { $target } has no drum for { $sources }.
maps-changes-none = Every { $source } note lands on its own drum in { $target }.
maps-table-heading = Every note, drum by drum
maps-more-from = More from { $engine }
maps-full-maps = Full note maps:
maps-index-drum-maps = DAW drum maps for every engine: Cubase, Reaper and Studio One
maps-engine-description-drum-maps = Free Cubase, Reaper and Studio One drum maps.
maps-daw-heading = DAW drum maps
maps-daw-intro = Load one of these files in your DAW to see { $engine } drum names on the keys of the piano roll.
maps-daw-how = How to load a drum map in Reaper, Cubase or Studio One
drum-maps-title = Drum Maps for Cubase, Reaper & Studio One: { $count } Engines
drum-maps-description = Free DAW drum maps for { $count } drum engines: Cubase drum maps (.drm), Reaper note names (.txt) and Studio One pitch lists (.pitchlist).
drum-maps-heading = DAW drum maps
drum-maps-intro = Free drum maps for { $count } drum engines, made from the same note maps the converter uses. Each file names every note the engine plays, so your piano roll shows drum names instead of note numbers. The files use MIDI note numbers, so they work with either octave convention.
drum-maps-how-heading = How to load a drum map
drum-maps-reaper = In the MIDI editor, choose File → Note/CC names → Load note/CC names from file, and pick the .txt file.
drum-maps-cubase = Open MIDI → Drum Map Setup, click Load and pick the .drm file. Then choose the map in the Drum Map field of the track's Inspector.
drum-maps-studio-one = In the Edit view, click the wrench icon to show the pitch names, then drag the .pitchlist file onto them. Save it from the Pitch Names menu to reuse it.
drum-maps-other = Logic Pro, Ableton Live, FL Studio and Bitwig Studio cannot load note-name files. Use the engine's note map to find each drum, or convert your MIDI to the engine you play.
drum-maps-list-heading = Drum maps for all { $count } engines
drum-maps-download-label = { $engine } drum map for { $daw }
