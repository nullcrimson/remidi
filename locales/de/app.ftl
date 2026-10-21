brand-tagline = Drum-MIDI konvertieren & umbelegen
nav-converter = Konverter
nav-note-maps = Notenbelegungen
nav-drum-maps = DAW-Drum-Maps
section-guide-label = Anleitung
section-guide-heading = So konvertieren Sie Drum-MIDI
section-faq-label = FAQ
section-faq-heading = Häufige Fragen
section-issue-label = Problem melden
section-issue-heading = Problem melden
section-contact-label = Kontakt
section-contact-heading = Kontakt
section-terms-label = Nutzungsbedingungen
section-terms-heading = Nutzungsbedingungen
skip-to-content = Zum Inhalt springen
nav-main = Hauptnavigation
nav-site = Website
lang-menu-label = Sprache
lang-load-failed = { $language } konnte nicht geladen werden. Prüfen Sie Ihre Internetverbindung und versuchen Sie es noch einmal.
error-unknown-engine = Unbekanntes { $role ->
    [source] Quell
   *[target] Ziel
}-Plugin „{ $id }“
error-bad-midi = Der Konverter kann diese Datei nicht lesen – sie sieht nicht nach MIDI aus
error-bad-preset = Das ist keine Preset-Datei
error-bad-overrides = Die Notenänderungen konnten nicht gelesen werden
error-bad-missing = Unbekannte Einstellung für fehlende Instrumente
error-internal = Etwas ist schiefgelaufen
error-wasm-unavailable = Der Konverter konnte nicht geladen werden
error-detail = Details: { $detail }
blocker-files-and-engines = .mid-Datei hinzufügen und beide Plugins wählen
blocker-files = Erst eine .mid-Datei hinzufügen
blocker-engines = Plugins für VON und NACH wählen
channel-auto = Auto
channel-all = Alle Kanäle
channel-number = { $channel }
channel-hint-auto = Spuren mit Noten auf Kanal 10 · andere unverändert
channel-hint-all = alle Kanäle werden konvertiert
channel-hint-one = nur Kanal { $channel } wird konvertiert
missing-nearest = Ersetzen
missing-drop = Entfernen
missing-hint-nearest = werden durch das ähnlichste Instrument ersetzt
missing-hint-drop = werden aus der Datei entfernt
missing-hint-moved = { $count ->
    [0] nichts wird ersetzt
    [one] { $count } Instrument wird ersetzt
   *[other] { $count } Instrumente werden ersetzt
}
missing-hint-dropped = { $count ->
    [0] nichts wird entfernt
    [one] { $count } Instrument wird entfernt
   *[other] { $count } Instrumente werden entfernt
}
files-unreadable = { $count ->
    [one] { $names } konnte nicht gelesen werden – bitte wählen Sie die Datei noch einmal aus.
   *[other] { $names } konnten nicht gelesen werden – bitte wählen Sie die Dateien noch einmal aus.
}
preset-skipped = { $count ->
    [one] { $count } Änderung in „{ $name }“ übersprungen: Das Instrument kennt diese Version nicht.
   *[other] { $count } Änderungen in „{ $name }“ übersprungen: Diese Instrumente kennt diese Version nicht.
}
import-failed = { $file } konnte nicht importiert werden: { $error }
import-at-cap = { $file } konnte nicht importiert werden: Kein Platz für weitere Presets, maximal { $cap }
presets-unsaved = Presets konnten nicht gespeichert werden: Der Speicher des Browsers ist voll oder gesperrt. Nach dem Neuladen sind sie weg.
import-done = Preset „{ $name }“ importiert.
import-done-skipped = Preset „{ $name }“ importiert ({ $count ->
    [one] { $count } Änderung
   *[other] { $count } Änderungen
} übersprungen).
edit-line = { $drum }: { $now } (Standard: { $byDefault })
edit-more = +{ $count } weitere
app-intro = Konvertieren Sie Drum-MIDI zwischen GetGood Drums, EZdrummer, Superior Drummer 3, Addictive Drums 2, General MIDI, Guitar Pro und über 80 weiteren Drum-Plugins. Alles läuft in Ihrem Browser – Ihre Dateien werden nirgendwohin hochgeladen.
app-loading = Konverter wird geladen…
convert-error = Fehler: { $error }
notice-dismiss = Schließen
channel-label = Drum-Kanal
channel-tip-title = Welche Noten konvertiert werden
channel-tip = Bei „Auto“ wird jede Spur auf Kanal 10 konvertiert – dem Drum-Kanal von General MIDI. Alle anderen Spuren bleiben, wie sie sind. Liegen Ihre Drums auf einem anderen Kanal, wählen Sie diesen oder „Alle“.
missing-label = Fehlende Instrumente
missing-tip-title = Wenn das Ziel-Plugin ein Instrument nicht hat
missing-tip = „Ersetzen“ nimmt stattdessen das ähnlichste Instrument im Ziel-Plugin – etwa ein Crash statt eines China, Tom 3 statt Tom 4. „Entfernen“ lässt die Noten weg. Fehlt nur eine Spieltechnik wie Ghost Notes oder Rimshots, wird daraus immer ein normaler Schlag auf dasselbe Instrument.
unrecognized-label = Unbekannte Noten
unrecognized-tip-title = Wenn das Quell-Plugin eine Note nicht kennt
unrecognized-tip = Manche Noten einer Datei stehen nicht in der Notenbelegung des Quell-Plugins – etwa ein Part, der für ein anderes Kit geschrieben wurde. „Entfernen“ lässt sie weg. „Unverändert lassen“ übernimmt sie so, wie sie sind, auf derselben Note. Der Bericht führt sie in beiden Fällen auf.
unrecognized-remove = Entfernen
unrecognized-keep = Unverändert lassen
unrecognized-hint-remove = werden aus der Datei entfernt
unrecognized-hint-keep = bleiben unverändert in der Datei
edited-review = { $count ->
    [one] { $count } Instrument
   *[other] { $count } Instrumente
} geändert – Änderungen ansehen
edited-review-saved = { $count ->
    [one] { $count } Instrument
   *[other] { $count } Instrumente
} geändert (Preset { $name }) – Änderungen ansehen
edited-review-unsaved = { $count ->
    [one] { $count } Instrument
   *[other] { $count } Instrumente
} geändert, nicht in { $name } gespeichert – Änderungen ansehen
edited-differ = { $count ->
    [one] { $count } Instrument weicht
   *[other] { $count } Instrumente weichen
} von der Standardzuordnung ab
edited-click = Klicken zum Ansehen oder Zurücksetzen.
edited-count = { $count } geändert
edited-count-unsaved = { $count } geändert · nicht gespeichert
octave-label = Oktaven beginnen bei
octave-tip-title = Ändert nur die Notennamen
octave-tip = Legt fest, in welcher Oktave die MIDI-Note 0 liegt, damit die Notennamen zu Ihrer DAW passen. Die Noten in der Datei bleiben, wie sie sind.
canon-picker-label = Instrument für { $note }
canon-picker-heading = QUELLE · { $note }
close = Schließen
dropzone-heading = .MID ABLEGEN
dropzone-presets = oder ein exportiertes Preset (.json)
convert-running = wird konvertiert
convert-button = Konvertieren
convert-button-ready = { $count ->
    [one] 1 Datei
   *[other] { $count } Dateien
} für { $target } konvertieren
settings-heading = Einstellungen
engine-from = VON
engine-to = NACH
engine-swap = VON und NACH tauschen
engine-choose = Drum-Plugin wählen…
engine-picker-heading = Plugin für { $side } wählen
filter-clear = Filter löschen
note-picker-label = Zielnote für { $drum }
note-picker-heading = ZIEL · { $drum }
source-picker-label = Quellnote für { $drum }
source-picker-heading = EINGANG · { $drum }
mid-badge = MID
plan-error = Der Noteneditor konnte nicht geladen werden: { $error }
plan-error-reset = Änderungen zurücksetzen
crash-heading = Etwas ist schiefgelaufen
crash-body = Der Konverter ist auf einen Fehler gestoßen und kommt nicht weiter. Meist hilft es, die Seite neu zu laden. Passiert das immer wieder, ist womöglich ein gespeichertes Preset beschädigt.
crash-reload = Neu laden
crash-reset = Gespeicherte Daten zurücksetzen…
crash-reset-confirm = Gespeicherte Presets, Favoriten und Einstellungen löschen?
crash-reset-do = Löschen und neu laden
cancel = Abbrechen
saved-group = Gespeicherte Zuordnungen
saved-heading = PRESETS
edit-back = ← Zurück
edit-heading = Noten bearbeiten
edit-advanced = Erweitert – Quellnoten neu zuweisen
summary-remapped = { $total ->
    [one] { $remapped } von { $total } Instrument umbelegt
   *[other] { $remapped } von { $total } Instrumenten umbelegt
}
summary-edit-tip-title = Instrumente einzeln anpassen
summary-edit-tip = Sie können jedem Instrument eine andere Zielnote geben – in der Instrumentenliste oder auf der Klaviatur. Die Änderungen gelten für die Konvertierung und lassen sich als Preset speichern.
summary-edit = Einzelne Noten bearbeiten →
summary-rack-label = Ableton-Rack für { $source } → { $target } herunterladen (.adg)
missing-detail-moved = Durch ein anderes Instrument ersetzt
missing-detail-dropped = Aus der Datei entfernt
detail-edit = Im Noten-Editor ändern →
summary-detail-heading = { $total ->
    [one] { $total } Instrument in dieser Drum-Map
   *[other] { $total } Instrumente in dieser Drum-Map
}
summary-detail-moved = auf neuer Note
summary-detail-same = schon auf der richtigen Note
summary-detail-variant = auf ähnlicher Variante
summary-detail-swapped = durch anderes Instrument ersetzt
summary-detail-dropped = entfernt
summary-detail-unplayed = nicht im Quell-Plugin
summary-reason-same = gleiche Note in beiden Plugins
summary-reason-variant = kein exaktes Gegenstück in { $target } – eine Variante desselben Instruments spielt
summary-reason-swapped = kein Gegenstück in { $target } – das ähnlichste Instrument spielt stattdessen
summary-reason-dropped = kein Gegenstück in { $target }
summary-reason-unplayed = keine Note in { $source }
row-extras-dropped = { $count ->
    [one] Auch { $count } weitere Quellnote spielt { $drum }: { $notes }. Sie hat kein Ziel.
   *[other] Auch { $count } weitere Quellnoten spielen { $drum }: { $notes }. Keine davon hat ein Ziel.
}
row-extras = { $count ->
    [one] Auch { $count } weitere Quellnote spielt { $drum }: { $notes }. Beide landen auf { $target }.
   *[other] Auch { $count } weitere Quellnoten spielen { $drum }: { $notes }. Alle landen auf { $target }.
}
row-reset = { $drum } zurücksetzen
edit-filter-label = Instrumente filtern
edit-filter-placeholder = Instrumente filtern…
library-filter-placeholder = filtern…
edit-show = Anzeigen
edit-show-all = Alle { $count }
edit-show-changed = Geändert { $count }
edit-show-issues = Probleme { $count }
edit-actions = Aktionen
edit-changes = { $count ->
    [0] Keine Änderungen
    [one] { $count } Änderung
   *[other] { $count } Änderungen
}
edit-reset-all = Alle zurücksetzen
edit-done = Fertig
row-no-source = keine Quelle
row-dropped = entfernt
row-chain-hint = In { $target } fehlt { $drum }, daher spielt { $standIn }. Ihre Änderung legt { $standIn } auf { $landed }. Klicken Sie, um zu { $standIn } zu springen.
rows-drum = INSTRUMENT
rows-source = QUELLE
rows-target = ZIEL
rows-plays = SPIELT
rows-none = Keine passenden Instrumente
rows-reassigned = { $note } war { $from } – spielt jetzt { $drum }
preset-tip-title = Zuordnung für später speichern
preset-tip = Speichert VON→NACH samt Ihren Notenänderungen als Schaltfläche auf der Startseite – ein Klick, und alles ist wieder geladen. Bleibt nur in diesem Browser.
preset-update-open = Preset aktualisieren
preset-save-open = Als Preset speichern
preset-name = Preset-Name
preset-update = Aktualisieren
preset-save-new = Als neues speichern
preset-save = Speichern
preset-exists = Für { $pair } gibt es schon ein Preset.
preset-at-cap = Kein Platz für weitere Presets: maximal { $cap }.
source-unassigned = — nicht zugewiesen
source-unmapped = ohne Zuordnung
source-clear = Quellnote { $note } entfernen
source-add-label = Quellnote hinzufügen
source-add-placeholder = Note 0–127
source-add = hinzufügen
source-add-invalid = Geben Sie eine Notennummer von 0 bis 127 ein
library-group = Plugin: { $side }
library-filter = Plugins filtern: { $side }
library-hint = Tippen zum Filtern. Pfeiltasten zum Blättern, Enter zum Auswählen, Strg+Enter setzt oder entfernt einen Favoriten.
library-list = Plugins: { $side }
library-favourites = Favoriten
library-all = Alle Plugins
library-none = keine Treffer
files-skipped = { $names } übersprungen – nur .mid-Dateien und exportierte Presets (.json) sind möglich
files-drop = Eine oder mehrere .mid-Dateien irgendwo ablegen
files-choose = Dateien auswählen
files-presets = Exportierte Presets (.json) können Sie genauso ablegen oder auswählen.
files-sample = Mit einem Beispiel-Groove ausprobieren
files-sample-needs-from = Erst ein Plugin für VON wählen
files-remove = { $name } entfernen
files-add-more = + hinzufügen
files-clear = alle entfernen
step-file = Deine Drum-Datei
step-engines = Von einem Drum-Layout in ein anderes
step-convert = Konvertieren
step-done = erledigt
files-sample-lead = Keine Datei zur Hand?
chip-rename = Umbenennen
chip-duplicate = Duplizieren
chip-export = Exportieren
chip-delete = Löschen
chip-rename-label = { $name } umbenennen
chip-rename-save = Namen speichern
chip-rename-cancel = Umbenennen abbrechen
chip-overrides = { $count ->
    [one] { $count } Änderung
   *[other] { $count } Änderungen
}
chip-unavailable = Plugin nicht verfügbar
chip-edit = Noten für { $name } bearbeiten
chip-more = Weitere Aktionen für { $name }
chip-at-cap = kein Platz für weitere Presets
done-tag-converted = { $count ->
    [one] { $count } Note konvertiert
   *[other] { $count } Noten konvertiert
}
done-tag-nothing = nichts konvertiert
done-tag-approximated = { $count } ersetzt
done-tag-dropped = { $count } entfernt
done-tag-unrecognized = { $count } unbekannt
done-tag-untouched = { $count } auf anderen Kanälen unverändert
done-tag-failed = { $count } fehlgeschlagen
done-file-approximated = { $count } ersetzt
done-file-dropped = { $count } entfernt
done-file-unrecognized = { $count } unbek.
done-file-clean = verlustfrei
done-heading = { $count ->
    [one] { $count } Datei
   *[other] { $count } Dateien
} konvertiert → { $target }
done-edited = { $count ->
    [one] { $count } Instrument geändert
   *[other] { $count } Instrumente geändert
}
done-download-one = ↓ .mid herunterladen
done-download-zip = ↓ { $count } Dateien herunterladen (.zip)
done-files = Konvertierte Dateien
done-file-download = ↓ .mid
tip-link = Kaffee spendieren
tip-ask = Ich entwickle Drumverter allein in meiner Freizeit. Hat es Ihnen Arbeit beim Umbelegen erspart? Mit einem Kaffee bleibt es kostenlos und werbefrei.
tip-amounts = Drumverter unterstützen
tip-other = Anderer Betrag
done-view-report = Bericht anzeigen →
done-convert-more = Weitere konvertieren
done-convert-more-hint = Nächste Datei? Plugins und Einstellungen bleiben, wie sie sind.
done-report-mapping = Falsche Zuordnung? Melden
done-removed = { $count ->
    [one] { $count } Note Ihrer Datei ist nicht in der Notenbelegung von { $source } und wurde deshalb entfernt. Falsche Quelle?
   *[other] { $count } Noten Ihrer Datei sind nicht in der Notenbelegung von { $source } und wurden deshalb entfernt. Falsche Quelle?
}
done-kept = { $count ->
    [one] { $count } Note Ihrer Datei ist nicht in der Notenbelegung von { $source } und wurde deshalb unverändert übernommen. Falsche Quelle?
   *[other] { $count } Noten Ihrer Datei sind nicht in der Notenbelegung von { $source } und wurden deshalb unverändert übernommen. Falsche Quelle?
}
done-pick-source = Andere Quelle wählen
done-assign-notes = Noten zuweisen
source-fit-missing = { $missing ->
    [one] { $missing } von { $hits } Noten Ihrer Datei ist nicht in der Notenbelegung von { $source }.
   *[other] { $missing } von { $hits } Noten Ihrer Datei sind nicht in der Notenbelegung von { $source }.
} Passen besser: { $engines }
source-fit-all = { $engine } (alle Noten)
source-fit-some = { $engine } ({ $count ->
    [one] { $count } Note
   *[other] { $count } Noten
})
drop-missing = Fehlende entfernen & neu konvertieren
report-dropped = Entfernt
report-approximated = Ersetzt
report-unrecognized = Unbekannt
report-dropped-hint = { $target } hat dieses Instrument nicht
report-approximated-hint = durch das ähnlichste Instrument ersetzt
report-unrecognized-hint = nicht in der Notenbelegung von { $source } – aus der Datei entfernt
report-unrecognized-hint-kept = nicht in der Notenbelegung von { $source } – unverändert in der Datei
report-pick-target = Ziel wählen →
report-assign = Zuweisen →
report-across = { $summary } in { $count } Dateien
report-contact = Falsche Zuordnung oder fehlt ein Plugin? Erstellen Sie ein { $issue } oder schreiben Sie an { $email }.
report-contact-issue = GitHub-Issue
report-unchanged = Unverändert
report-unchanged-hint = andere Spuren / Kanäle
report-unchanged-entry = Noten auf anderen Spuren oder Kanälen – bleiben, wie sie sind
report-channel = Drum-Kanal →
report-nothing = Nichts konvertiert
report-nothing-channel = — auf dem gewählten Drum-Kanal liegen keine Noten. Wählen Sie einen anderen Kanal oder „Alle“.
report-nothing-notes = — in dieser Datei gibt es keine Drum-Noten.
report-clean = Verlustfrei konvertiert
report-clean-detail = — alle Instrumente passen 1:1 auf { $target }.
report-heading = Konvertierungsbericht
converter-title = Drumverter – Drum-MIDI kostenlos konvertieren & umbelegen
maps-popular = Beliebte Konvertierungen
maps-pair-link = { $source } nach { $target }
