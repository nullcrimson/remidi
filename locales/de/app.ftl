brand-tagline = Drum-MIDI konvertieren & umbelegen
nav-converter = Konverter
nav-note-maps = Drum-Maps
section-guide-label = So funktioniert’s
section-guide-heading = So konvertieren Sie Drum-MIDI
section-guide-title = So konvertieren Sie Drum-MIDI zwischen Plugins | Drumverter
section-guide-description = Konvertieren Sie Drum-MIDI zwischen GetGood Drums, EZdrummer, Superior Drummer, Addictive Drums und über 80 Plugins – in vier Schritten, kostenlos und im Browser.
section-faq-label = FAQ
section-faq-heading = Häufig gestellte Fragen
section-faq-title = FAQ zum Drum-MIDI-Konverter | Drumverter
section-faq-description = Antworten zu Drumverter: Kosten, Datenschutz, Oktavbezeichnung (C-1 oder C-2), mehrere Dateien auf einmal und was mit Instrumenten ohne Entsprechung passiert.
section-issue-label = Problem melden
section-issue-heading = Problem melden
section-issue-title = Problem melden | Drumverter
section-issue-description = Falsche Zuordnung entdeckt oder soll Drumverter ein weiteres Plugin unterstützen? Melden Sie es auf GitHub oder per E-Mail.
section-contact-label = Kontakt
section-contact-heading = Kontakt
section-contact-title = Kontakt | Drumverter
section-contact-description = Fragen, Feedback oder Plugin-Wünsche an Drumverter, den kostenlosen Drum-MIDI-Konverter im Browser.
section-terms-label = Nutzungsbedingungen
section-terms-heading = Nutzungsbedingungen
section-terms-title = Nutzungsbedingungen | Drumverter
section-terms-description = Nutzungsbedingungen für Drumverter, den kostenlosen Drum-MIDI-Konverter im Browser: ohne Gewähr, keine Datei-Uploads, anonyme Statistiken ohne Cookies.
skip-to-content = Zum Inhalt springen
nav-main = Hauptnavigation
nav-site = Website
lang-menu-label = Sprache
lang-load-failed = { $language } konnte nicht geladen werden. Prüfen Sie Ihre Verbindung und versuchen Sie es erneut.
lang-offer = Diese Seite gibt es auch auf Deutsch →
open-converter = Konverter öffnen →
error-unknown-engine = Unbekanntes { $role ->
    [source] Quell
   *[target] Ziel
}-Plugin „{ $id }“
error-bad-midi = Keine MIDI-Datei, die dieser Konverter lesen kann
error-bad-preset = Keine Preset-Datei
error-bad-overrides = Die Notenänderungen konnten nicht gelesen werden
error-bad-missing = Unbekannte Einstellung für fehlende Instrumente
error-bad-channel = Unbekannte Kanaleinstellung
error-internal = Etwas ist schiefgelaufen
error-wasm-unavailable = Konverter konnte nicht geladen werden
error-detail = Details: { $detail }
blocker-files-and-engines = .mid-Datei hinzufügen und beide Plugins wählen
blocker-files = .mid-Datei zum Konvertieren hinzufügen
blocker-engines = Plugin für VON und NACH wählen
channel-auto = Auto
channel-all = Alle Kanäle
channel-number = { $channel }
channel-hint-auto = Spuren mit Noten auf Kanal 10 · andere unverändert
channel-hint-all = jeder Kanal wird konvertiert
channel-hint-one = nur Kanal { $channel } wird konvertiert
missing-nearest = Ersetzen
missing-drop = Entfernen
missing-hint-nearest = spielt sie auf dem ähnlichsten Instrument
missing-hint-drop = entfernt sie
missing-hint-moved = { $count ->
    [0] kein Instrument wird ersetzt
    [one] { $count } Instrument wird ersetzt
   *[other] { $count } Instrumente werden ersetzt
}
missing-hint-dropped = { $count ->
    [0] keine Instrumente entfernt
    [one] { $count } Instrument entfernt
   *[other] { $count } Instrumente entfernt
}
files-unreadable = { $count ->
    [one] { $names } konnte nicht gelesen werden – wählen Sie die Datei erneut aus.
   *[other] { $names } konnten nicht gelesen werden – wählen Sie die Dateien erneut aus.
}
preset-skipped = { $count ->
    [one] { $count } Änderung in „{ $name }“ verwendet ein Instrument, das diese Version nicht kennt; übersprungen.
   *[other] { $count } Änderungen in „{ $name }“ verwenden Instrumente, die diese Version nicht kennt; übersprungen.
}
import-failed = { $file } konnte nicht importiert werden: { $error }
import-at-cap = { $file } konnte nicht importiert werden: Preset-Limit erreicht ({ $cap })
import-done = „{ $name }“ importiert.
import-done-skipped = „{ $name }“ importiert ({ $count ->
    [one] { $count } Änderung
   *[other] { $count } Änderungen
} übersprungen).
edit-line = { $drum }: { $now } (Standard: { $byDefault })
edit-more = +{ $count } weitere
app-intro = Konvertieren Sie Drum-MIDI zwischen GetGood Drums, EZdrummer, Superior Drummer 3, Addictive Drums 2, General MIDI, Guitar Pro und über 80 weiteren Drum-Plugins. Läuft in Ihrem Browser; Dateien werden nie hochgeladen.
app-loading = Konverter wird geladen…
convert-error = Fehler: { $error }
notice-dismiss = Schließen
channel-label = Drum-Kanal
channel-tip-title = Welche Noten konvertiert werden
channel-tip = Auto konvertiert jede Spur, die Kanal 10 nutzt – den Drum-Kanal von General MIDI – und lässt alle anderen Spuren unverändert. Wählen Sie einen Kanal oder „Alle“, wenn Ihre Drums auf einem anderen Kanal liegen.
missing-label = Fehlende Instrumente
missing-tip-title = Wenn dem Ziel ein Instrument fehlt
missing-tip = Ersetzen spielt es auf dem ähnlichsten Instrument des Ziel-Plugins – ein China auf einem Crash, Tom 4 auf Tom 3. Entfernen lässt es weg. Ghost Notes, Rimshots und andere Spielweisen eines Instruments, das es im Ziel gibt, werden immer zu einem normalen Schlag auf dieses Instrument.
edited-review = { $count ->
    [one] { $count } Instrument
   *[other] { $count } Instrumente
} geändert – Änderungen prüfen
edited-review-saved = { $count ->
    [one] { $count } Instrument
   *[other] { $count } Instrumente
} geändert – Änderungen prüfen, aus Preset { $name }
edited-review-unsaved = { $count ->
    [one] { $count } Instrument
   *[other] { $count } Instrumente
} geändert – Änderungen prüfen, nicht in { $name } gespeichert
edited-differ = { $count ->
    [one] { $count } Instrument weicht
   *[other] { $count } Instrumente weichen
} von der Standardzuordnung ab
edited-click = Zum Prüfen oder Zurücksetzen klicken.
edited-count = { $count } geändert
edited-count-unsaved = { $count } geändert · nicht gespeichert
octave-label = Oktaven beginnen bei
octave-tip-title = Nur die Oktavbezeichnung
octave-tip = Legt fest, in welcher Oktave die MIDI-Note 0 liegt, damit die Notennamen zu Ihrer DAW passen. Betrifft nur die Anzeige – die in die Datei geschriebenen Noten ändern sich nie.
canon-picker-label = Instrument für { $note }
canon-picker-heading = QUELLE · { $note }
close = Schließen
dropzone-heading = .MID ABLEGEN
dropzone-presets = oder ein exportiertes Preset (.drumverter.json)
convert-running = wird umbelegt
convert-button = Konvertieren & herunterladen
engine-from = VON
engine-to = NACH
engine-swap = VON und NACH tauschen
filter-clear = Filter löschen
note-picker-label = Zielnote für { $drum }
note-picker-heading = ZIEL · { $drum }
source-picker-label = Quellnote für { $drum }
source-picker-heading = EINGANG · { $drum }
mid-badge = MID
plan-error = Der Noteneditor konnte nicht geladen werden: { $error }
plan-error-reset = Änderungen zurücksetzen
crash-heading = Etwas ist schiefgelaufen
crash-body = Im Konverter ist ein Fehler aufgetreten, den er nicht beheben konnte. Neu laden hilft meistens; tritt der Fehler weiter auf, ist womöglich ein gespeichertes Preset beschädigt.
crash-reload = Neu laden
crash-reset = Daten zurücksetzen…
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
summary-edit-tip = Weisen Sie jedem Instrument eine andere Zielnote zu – aus der Instrumentenliste oder auf der Klaviatur. Ihre Änderungen gelten für die Konvertierung und lassen sich als Preset speichern.
summary-edit = Einzelne Noten bearbeiten →
row-extras-dropped = { $count ->
    [one] { $count } weitere Quellnote spielt { $drum }: { $notes }. Keine davon hat ein Ziel.
   *[other] { $count } weitere Quellnoten spielen { $drum }: { $notes }. Keine davon hat ein Ziel.
}
row-extras = { $count ->
    [one] { $count } weitere Quellnote spielt { $drum }: { $notes }. Beide landen auf { $target }.
   *[other] { $count } weitere Quellnoten spielen { $drum }: { $notes }. Alle landen auf { $target }.
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
rows-drum = INSTRUMENT
rows-source = QUELLE
rows-target = ZIEL
rows-plays = SPIELT
rows-none = Keine passenden Instrumente
rows-reassigned = { $note } war { $from } – spielt jetzt { $drum }
preset-tip-title = Diese Zuordnung wiederverwenden
preset-tip = Speichert das Paar VON→NACH samt Notenänderungen als Schaltfläche auf der Startseite – ein Klick lädt es wieder. Wird nur in diesem Browser gespeichert.
preset-update-open = Preset aktualisieren
preset-save-open = Als Preset speichern
preset-name = Preset-Name
preset-update = Aktualisieren
preset-save-new = Als neues speichern
preset-save = Speichern
preset-exists = Für { $pair } gibt es bereits ein Preset.
preset-at-cap = Preset-Limit erreicht ({ $cap }).
source-unassigned = — nicht zugewiesen
source-unmapped = ohne Zuordnung
source-clear = Quellnote { $note } entfernen
source-add-label = Quellnote hinzufügen
source-add-placeholder = Note 0–127
source-add = hinzufügen
source-add-invalid = Geben Sie eine Notennummer von 0 bis 127 ein
library-group = Plugin: { $side }
library-filter = Plugins filtern: { $side }
library-hint = Zum Filtern tippen. Mit den Pfeiltasten navigieren, mit Enter auswählen, mit Strg+Enter als Favorit hinzufügen oder entfernen.
library-list = Plugins: { $side }
library-favourites = Favoriten
library-all = Alle Plugins
library-none = keine Treffer
files-skipped = { $names } übersprungen – nur .mid-Dateien und exportierte Presets (.drumverter.json) können hinzugefügt werden
files-drop = .mid-Datei irgendwo ablegen oder zum Auswählen klicken
files-presets = Exportierte Preset-Dateien (.drumverter.json) können Sie genauso ablegen oder auswählen.
files-remove = { $name } entfernen
files-add-more = + hinzufügen
files-clear = alle entfernen
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
chip-at-cap = Preset-Limit erreicht
done-tag-converted = { $count ->
    [one] { $count } Note konvertiert
   *[other] { $count } Noten konvertiert
}
done-tag-nothing = nichts konvertiert
done-tag-approximated = { $count } angenähert
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
done-view-report = Bericht anzeigen →
done-convert-more = Weitere konvertieren
drop-missing = Fehlende entfernen & neu konvertieren
report-dropped = Entfernt
report-approximated = Angenähert
report-unrecognized = Unbekannt
report-dropped-hint = { $target } hat dieses Instrument nicht
report-approximated-hint = auf dem ähnlichsten Instrument gespielt
report-unrecognized-hint = nicht in der Belegung von { $source } – aus der Datei entfernt
report-pick-target = Ziel wählen →
report-assign = Zuweisen →
report-across = { $summary } in { $count } Dateien
report-contact = Falsche Zuordnung oder fehlendes Plugin? Erstellen Sie ein { $issue } oder schreiben Sie an { $email }.
report-contact-issue = GitHub-Issue
report-unchanged = Unverändert
report-unchanged-hint = andere Spuren / Kanäle
report-unchanged-entry = Noten auf anderen Spuren oder Kanälen, unverändert übernommen
report-channel = Drum-Kanal →
report-nothing = Nichts konvertiert
report-nothing-channel = — keine Noten auf dem gewählten Drum-Kanal. Wählen Sie einen anderen Drum-Kanal oder „Alle“.
report-nothing-notes = — keine Drum-Noten in dieser Datei gefunden.
report-clean = Verlustfreie Konvertierung
report-clean-detail = — jedes Instrument hat in { $target } eine direkte Entsprechung.
report-heading = Konvertierungsbericht
converter-title = Drumverter – Drum-MIDI kostenlos konvertieren & umbelegen
converter-description = Kostenloser Drum-MIDI-Konverter im Browser: Drum-MIDI zwischen GetGood Drums, EZdrummer, Superior Drummer, Addictive Drums, General MIDI und Guitar Pro umbelegen.
converter-og-description = Konvertieren Sie Drum-MIDI zwischen GetGood Drums, EZdrummer, Superior Drummer, Addictive Drums und über 80 weiteren Plugins. Kostenlos, im Browser.
converter-image-alt = Drumverter – Drum-MIDI konvertieren und umbelegen
converter-twitter-description = Kostenlos im Browser: Drum-MIDI zwischen den Notenbelegungen verschiedener Drum-Plugins umbelegen.
converter-app-description = Kostenloses Browser-Tool, das Drum-MIDI zwischen den Notenbelegungen von Drum-Plugins umbelegt.
converter-noscript = Drumverter ist ein kostenloses Tool zum Umbelegen von Drum-MIDI. Es überträgt eine Drum-MIDI-Datei von der Notenbelegung eines Sample-Plugins auf die eines anderen – zum Beispiel von GetGood Drums auf EZdrummer, Superior Drummer, Addictive Drums, General MIDI oder Guitar Pro – über ein einheitliches Drum-Vokabular mit Ersatzinstrumenten für jeden Slot. Die Umbelegung läuft vollständig in Ihrem Browser; aktivieren Sie JavaScript, um den Konverter zu nutzen.
load-failed = Drumverter konnte nicht geladen werden. Prüfen Sie Ihre Verbindung und laden Sie die Seite neu.
load-failed-reload = Neu laden
maps-breadcrumb = Brotkrümelnavigation
maps-index-title = Drum-MIDI-Notenbelegungen für { $count } Drum-Plugins | Drumverter
maps-index-description = Drum-MIDI-Notenbelegungen für { $count } Drum-Plugins, dazu Konvertierungstabellen zwischen GetGood Drums, EZdrummer, Superior Drummer, Addictive Drums und weiteren.
maps-index-heading = Drum-MIDI-Notenbelegungen
maps-index-intro = Notenbelegungen für { $count } Drum-Plugins und Konvertierungstabellen zwischen den beliebtesten – dieselben Zuordnungsdaten, mit denen auch der Konverter von Drumverter arbeitet.
maps-popular = Beliebte Konvertierungen
maps-more-engines = Weitere Plugins
maps-matrix-corner = VON ↓ NACH →
maps-pair-link = { $source } nach { $target }
maps-matrix-hint = Jeder Pfeil öffnet die Konvertierungstabelle vom Plugin der Zeile zum Plugin der Spalte.
maps-all-engines = Alle { $count } Plugins
maps-filter-engines-label = Plugins filtern
maps-filter-engines-placeholder = Plugins filtern…
maps-no-engines = Keine passenden Plugins
maps-engine-title = { $engineMidi }: Notenbelegung & Drum-Map | Drumverter
maps-engine-title-long-name = MIDI-Notenbelegung: { $engine } | Drumverter
maps-engine-description = { $engine }: Drum-MIDI-Notenbelegung mit allen { $total } Noten und Instrumentennamen in den Oktavbezeichnungen C-1 und C-2.
maps-engine-description-short = { $engine }: Drum-MIDI-Notenbelegung mit Notennamen in C-1 und C-2.
maps-engine-description-more = { $engineMidi } kostenlos für jedes andere Plugin konvertieren.
maps-engine-heading = { $engine }: Drum-MIDI-Notenbelegung
maps-engine-intro = Alle { $total } MIDI-Noten, auf die { $engine } reagiert, nach Instrument gruppiert. Die Notennamen folgen wahlweise einer der beiden Oktavbezeichnungen: C-1 (Reaper, Logic, Ableton, Guitar Pro) oder C-2 (Studio One, Cubase, FL Studio).
maps-convert-to = Nach { $engine } konvertieren
maps-convert-from = Von { $engine } konvertieren
maps-filter-drums-label = Instrumente filtern
maps-filter-drums-placeholder = Instrument oder Note…
maps-octave-naming = Oktavbezeichnung
maps-column-note = Note
maps-column-drum = Instrument
maps-conversion-tables = Konvertierungstabellen
maps-pair-heading = { $sourceMidi } nach { $target } konvertieren
maps-pair-title = { $sourceMidi } nach { $target } konvertieren | Drumverter
maps-pair-description = Drum-MIDI von { $source } nach { $target } konvertieren: { $exact } { $exact ->
    [one] Note exakt zugeordnet
   *[other] Noten exakt zugeordnet
}, { $approximated } angenähert, { $dropped } entfernt.
maps-pair-description-more = Kostenloser Konverter im Browser.
maps-pair-summary = Von { $total } { $total ->
    [one] Note
   *[other] Noten
} in { $source } { $exact ->
    [one] wird { $exact } exakt auf { $target } übertragen
   *[other] werden { $exact } exakt auf { $target } übertragen
}, { $approximated } { $approximated ->
    [one] wird
   *[other] werden
} mit dem ähnlichsten verfügbaren Instrument angenähert und { $dropped } { $dropped ->
    [one] hat
   *[other] haben
} keine Entsprechung.
maps-pair-convert = { $source } → { $target } konvertieren
maps-reverse = ⇄ Richtung umkehren
maps-exact-count = { $count } exakt
maps-approximated-count = { $count } angenähert
maps-dropped-count = { $count } entfernt
maps-rows = Zeilen
maps-rows-changes = Geändert { $count }
maps-column-engine-note = Note in { $engine }
maps-column-engine-drum = Instrument in { $engine }
maps-column-to = nach
maps-column-result = Ergebnis
maps-no-equivalent = keine Entsprechung
maps-status-exact = exakt
maps-status-approximated = angenähert
maps-status-dropped = entfernt
maps-more-from = Weitere Konvertierungen von { $engine }
maps-full-maps = Vollständige Notenbelegungen:
