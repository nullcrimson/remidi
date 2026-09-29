brand-tagline = converti e rimappa il MIDI di batteria
nav-converter = Convertitore
nav-note-maps = Mappe note
section-guide-label = Come funziona
section-guide-heading = Come convertire il MIDI di batteria
section-guide-title = Come convertire il MIDI di batteria tra plugin | Drumverter
section-guide-description = Converti il MIDI di batteria tra GetGood Drums, EZdrummer, Superior Drummer, Addictive Drums e oltre 80 plugin in quattro passaggi, gratis e nel browser.
section-faq-label = FAQ
section-faq-heading = Domande frequenti
section-faq-title = Convertitore MIDI per batteria: FAQ | Drumverter
section-faq-description = Risposte su Drumverter: costi, privacy, convenzioni delle ottave (C-1 o C-2), conversione di più file e cosa succede agli strumenti senza equivalente.
section-issue-label = Segnala un problema
section-issue-heading = Segnala un problema
section-issue-title = Segnala un problema | Drumverter
section-issue-description = Hai trovato una mappatura sbagliata o vuoi un nuovo plugin in Drumverter? Segnalalo su GitHub o via email.
section-contact-label = Contatti
section-contact-heading = Contatti
section-contact-title = Contatti | Drumverter
section-contact-description = Domande, feedback o richieste di nuovi plugin per Drumverter, il convertitore MIDI per batteria gratuito che funziona nel browser.
section-terms-label = Termini
section-terms-heading = Termini di utilizzo
section-terms-title = Termini di utilizzo | Drumverter
section-terms-description = Termini di utilizzo di Drumverter, il convertitore MIDI per batteria gratuito nel browser: fornito così com'è, file mai caricati, statistiche anonime senza cookie.
skip-to-content = Vai al contenuto
nav-main = Principale
nav-site = Sito
lang-menu-label = Lingua
lang-load-failed = Impossibile caricare la lingua { $language }. Controlla la connessione e riprova.
lang-offer = Questa pagina è disponibile in italiano →
open-converter = Apri il convertitore →
error-unknown-engine = Plugin { $role ->
    [source] di origine
   *[target] di destinazione
} sconosciuto: “{ $id }”
error-bad-midi = Non è un file MIDI leggibile da questo convertitore
error-bad-preset = Non è un file di preset
error-bad-overrides = Impossibile leggere le modifiche alle note
error-bad-missing = Impostazione degli strumenti mancanti sconosciuta
error-bad-channel = Impostazione del canale sconosciuta
error-internal = Qualcosa è andato storto
error-wasm-unavailable = Impossibile caricare il convertitore
error-detail = Dettagli: { $detail }
blocker-files-and-engines = Aggiungi un file .mid e scegli i plugin
blocker-files = Aggiungi un file .mid da convertire
blocker-engines = Scegli entrambi i plugin
channel-auto = Auto
channel-all = Tutti i canali
channel-number = { $channel }
channel-hint-auto = tracce con note sul canale 10 · altre invariate
channel-hint-all = vengono convertiti tutti i canali
channel-hint-one = viene convertito solo il canale { $channel }
missing-nearest = Più vicino
missing-drop = Scarta
missing-hint-nearest = li suona sullo strumento più vicino
missing-hint-drop = li scarta
missing-hint-moved = { $count ->
    [0] nessuno strumento spostato su un altro
    [one] { $count } strumento spostato su un altro
   *[other] { $count } strumenti spostati su altri
}
missing-hint-dropped = { $count ->
    [0] nessuno strumento scartato
    [one] { $count } strumento scartato
   *[other] { $count } strumenti scartati
}
files-unreadable = Impossibile leggere { $names }: { $count ->
    [one] sceglilo
   *[other] sceglili
} di nuovo.
preset-skipped = { $count ->
    [one] { $count } modifica in “{ $name }” usa uno strumento che questa versione non conosce: ignorata.
   *[other] { $count } modifiche in “{ $name }” usano strumenti che questa versione non conosce: ignorate.
}
import-failed = Impossibile importare { $file }: { $error }
import-at-cap = Impossibile importare { $file }: raggiunto il limite di preset ({ $cap })
import-done = Preset “{ $name }” importato.
import-done-skipped = Preset “{ $name }” importato ({ $count ->
    [one] { $count } modifica ignorata
   *[other] { $count } modifiche ignorate
}).
edit-line = { $drum }: { $now } (predefinito: { $byDefault })
edit-more = { $count ->
    [one] +{ $count } altra
   *[other] +{ $count } altre
}
app-intro = Converti il MIDI di batteria tra GetGood Drums, EZdrummer, Superior Drummer 3, Addictive Drums 2, General MIDI, Guitar Pro e le mappature di oltre 80 altri plugin. Funziona nel browser: i file non vengono mai caricati.
app-loading = Caricamento del convertitore…
convert-error = Errore: { $error }
notice-dismiss = Ignora
channel-label = Canale batteria
channel-tip-title = Quali note vengono convertite
channel-tip = Auto converte ogni traccia che usa il canale 10, il canale della batteria in General MIDI, e lascia invariate le altre tracce. Scegli un canale o Tutti i canali se la batteria è altrove.
missing-label = Strumenti mancanti
missing-tip-title = Se nel plugin di destinazione manca uno strumento
missing-tip = Più vicino lo suona sullo strumento più vicino presente nel plugin di destinazione: un China su un crash, il Tom 4 sul Tom 3. Scarta lo elimina. Ghost note, rimshot e altre articolazioni di uno strumento presente nel plugin di destinazione diventano sempre un colpo normale su quello strumento.
edited-review = { $count ->
    [one] { $count } strumento modificato
   *[other] { $count } strumenti modificati
} — rivedi le modifiche
edited-review-saved = { $count ->
    [one] { $count } strumento modificato
   *[other] { $count } strumenti modificati
} — rivedi le modifiche, dal preset { $name }
edited-review-unsaved = { $count ->
    [one] { $count } strumento modificato
   *[other] { $count } strumenti modificati
} — rivedi le modifiche, non salvate in { $name }
edited-differ = { $count ->
    [one] { $count } strumento differisce
   *[other] { $count } strumenti differiscono
} dalla mappatura predefinita
edited-click = Fai clic per rivedere o ripristinare.
edited-count = { $count ->
    [one] { $count } modificato
   *[other] { $count } modificati
}
edited-count-unsaved = { $count ->
    [one] { $count } modificato · non salvato
   *[other] { $count } modificati · non salvati
}
octave-label = Le ottave partono da
octave-tip-title = Solo i nomi delle ottave
octave-tip = Imposta in quale ottava si trova la nota MIDI 0, così i nomi delle note corrispondono a quelli della tua DAW. Cambia solo l'etichetta: le note scritte nel file non cambiano mai.
canon-picker-label = Strumento per { $note }
canon-picker-heading = ORIGINE · { $note }
close = Chiudi
dropzone-heading = TRASCINA .MID
dropzone-presets = o un preset esportato (.drumverter.json)
convert-running = rimappatura
convert-button = Converti e scarica
engine-from = DA
engine-to = A
engine-swap = Inverti origine e destinazione
filter-clear = Cancella filtro
note-picker-label = Nota di destinazione per { $drum }
note-picker-heading = DESTINAZIONE · { $drum }
source-picker-label = Nota di origine per { $drum }
source-picker-heading = IN ENTRATA · { $drum }
mid-badge = MID
plan-error = Impossibile caricare l'editor delle note: { $error }
plan-error-reset = Ripristina
crash-heading = Qualcosa è andato storto
crash-body = Il convertitore ha riscontrato un errore da cui non riesce a riprendersi. Di solito basta ricaricare la pagina; se il problema si ripete, un preset salvato potrebbe essere danneggiato.
crash-reload = Ricarica
crash-reset = Cancella dati salvati…
crash-reset-confirm = Eliminare i preset salvati, i preferiti e le impostazioni?
crash-reset-do = Elimina e ricarica
cancel = Annulla
saved-group = Mappature salvate
saved-heading = SALVATE
edit-back = ← Indietro
edit-heading = Modifica note
edit-advanced = Avanzate — riassegna le note di origine
summary-remapped = Strumenti rimappati: { $remapped } su { $total }
summary-edit-tip-title = Regola ogni strumento
summary-edit-tip = Assegna qualsiasi strumento a un'altra nota di destinazione: sceglila dall'elenco degli strumenti o dalla tastiera. Le modifiche valgono per la conversione e puoi salvarle come preset.
summary-edit = Modifica le singole note →
row-extras-dropped = { $count ->
    [one] { $count } altra nota di origine suona { $drum }: { $notes }. Nessuna delle due ha una destinazione.
   *[other] Altre { $count } note di origine suonano { $drum }: { $notes }. Nessuna ha una destinazione.
}
row-extras = { $count ->
    [one] { $count } altra nota di origine suona { $drum }: { $notes }. Entrambe vanno su { $target }.
   *[other] Altre { $count } note di origine suonano { $drum }: { $notes }. Tutte vanno su { $target }.
}
row-reset = Ripristina { $drum }
edit-filter-label = Filtra strumenti
edit-filter-placeholder = filtra strumenti…
library-filter-placeholder = filtra…
edit-show = Mostra
edit-show-all = Tutti { $count }
edit-show-changed = Modificati { $count }
edit-show-issues = Problemi { $count }
edit-actions = Azioni di modifica
edit-changes = { $count ->
    [0] Nessuna modifica
    [one] { $count } modifica
   *[other] { $count } modifiche
}
edit-reset-all = Ripristina tutto
edit-done = Fine
row-no-source = nessuna origine
row-dropped = scartato
rows-drum = STRUMENTO
rows-source = ORIGINE
rows-target = DESTINAZIONE
rows-plays = SUONA
rows-none = Nessuno strumento trovato
rows-reassigned = { $note } era { $from }, ora suona { $drum }
preset-tip-title = Riusa questa mappatura
preset-tip = Salva la coppia origine→destinazione e le eventuali modifiche alle note come pulsante nella schermata principale: un clic la ricarica. Resta solo in questo browser.
preset-update-open = Aggiorna preset
preset-save-open = Salva come preset
preset-name = Nome preset
preset-update = Aggiorna
preset-save-new = Salva copia
preset-save = Salva
preset-exists = Esiste già un preset per { $pair }.
preset-at-cap = Limite di preset raggiunto ({ $cap }).
source-unassigned = — non assegnata
source-unmapped = non mappata
source-clear = Rimuovi la nota di origine { $note }
source-add-label = Aggiungi nota di origine
source-add-placeholder = aggiungi nota 0–127
source-add = aggiungi
source-add-invalid = Inserisci un numero di nota da 0 a 127
library-group = Plugin: { $side }
library-filter = Filtra plugin: { $side }
library-hint = Digita per filtrare. Le frecce spostano la selezione, Invio sceglie, Ctrl+Invio aggiunge o rimuove dai preferiti.
library-list = Elenco plugin: { $side }
library-favourites = Preferiti
library-all = Tutti i plugin
library-none = nessun risultato
files-skipped = Impossibile aggiungere { $names }: sono accettati solo file .mid e preset esportati (.drumverter.json)
files-drop = Trascina un .mid ovunque o fai clic per sceglierlo
files-presets = Anche i file di preset che hai esportato (.drumverter.json) si possono trascinare o scegliere allo stesso modo.
files-remove = Rimuovi { $name }
files-add-more = + aggiungi altri
files-clear = svuota
chip-rename = Rinomina
chip-duplicate = Duplica
chip-export = Esporta
chip-delete = Elimina
chip-rename-label = Rinomina { $name }
chip-rename-save = Salva nome
chip-rename-cancel = Annulla ridenominazione
chip-overrides = { $count ->
    [one] { $count } modifica
   *[other] { $count } modifiche
}
chip-unavailable = plugin non disponibile
chip-edit = Modifica le note di { $name }
chip-more = Altre azioni per { $name }
chip-at-cap = limite di preset raggiunto
done-tag-converted = { $count ->
    [one] { $count } nota convertita
   *[other] { $count } note convertite
}
done-tag-nothing = nessuna nota convertita
done-tag-approximated = { $count ->
    [one] { $count } approssimata
   *[other] { $count } approssimate
}
done-tag-dropped = { $count ->
    [one] { $count } scartata
   *[other] { $count } scartate
}
done-tag-unrecognized = { $count ->
    [one] { $count } non riconosciuta
   *[other] { $count } non riconosciute
}
done-tag-untouched = { $count ->
    [one] { $count } invariata su altri canali
   *[other] { $count } invariate su altri canali
}
done-tag-failed = { $count ->
    [one] { $count } errore
   *[other] { $count } errori
}
done-file-approximated = { $count } appross.
done-file-dropped = { $count ->
    [one] { $count } scartata
   *[other] { $count } scartate
}
done-file-unrecognized = { $count } non riconosc.
done-file-clean = pulito
done-heading = { $count ->
    [one] { $count } file convertito
   *[other] { $count } file convertiti
} → { $target }
done-edited = { $count ->
    [one] { $count } strumento modificato
   *[other] { $count } strumenti modificati
}
done-download-one = ↓ Scarica .mid
done-download-zip = ↓ Scarica { $count } file (.zip)
done-files = File convertiti
done-file-download = ↓ .mid
done-view-report = Vedi report →
done-convert-more = Converti altri
drop-missing = Scarta gli strumenti mancanti e riconverti
report-dropped = Scartate
report-approximated = Approssimate
report-unrecognized = Non riconosciute
report-dropped-hint = { $target } non ha questo strumento
report-approximated-hint = suonate sullo strumento più vicino
report-unrecognized-hint = assenti nella mappa di { $source }: rimosse dal file
report-pick-target = Scegli destinazione →
report-assign = Assegna →
report-across = { $summary } in { $count } file
report-contact = Mappatura sbagliata o plugin mancante? Apri una { $issue } o scrivi a { $email }.
report-contact-issue = segnalazione su GitHub
report-unchanged = Invariate
report-unchanged-hint = altre tracce / canali
report-unchanged-entry = Note su altre tracce o canali, lasciate come erano
report-channel = Canale batteria →
report-nothing = Nessuna nota convertita
report-nothing-channel = — nessuna nota sul canale batteria selezionato. Scegli un altro canale batteria o Tutti i canali.
report-nothing-notes = — nessuna nota di batteria trovata in questo file.
report-clean = Conversione pulita
report-clean-detail = — ogni strumento è mappato direttamente su { $target }.
report-heading = Report di conversione
converter-title = Drumverter — converti e rimappa il MIDI di batteria gratis
converter-description = Convertitore MIDI per batteria gratuito: rimappa il MIDI di batteria tra GetGood Drums, EZdrummer, Superior Drummer, Addictive Drums, General MIDI e Guitar Pro nel browser.
converter-og-description = Converti il MIDI di batteria tra GetGood Drums, EZdrummer, Superior Drummer, Addictive Drums e oltre 80 altri plugin. Gratis, nel browser.
converter-image-alt = Drumverter — converti e rimappa il MIDI di batteria
converter-twitter-description = Rimappa gratis il MIDI di batteria nel browser, tra le mappature delle note dei plugin di batteria.
converter-app-description = App gratuita nel browser che rimappa il MIDI di batteria tra le mappature delle note dei plugin di batteria.
converter-noscript = Drumverter rimappa gratis il MIDI di batteria. Prende un file MIDI di batteria scritto per la mappatura delle note di un plugin e lo adatta a quella di un altro, ad esempio da GetGood Drums a EZdrummer, Superior Drummer, Addictive Drums, General MIDI o Guitar Pro, usando un vocabolario comune degli strumenti con sostituti per ogni slot. La rimappatura avviene interamente nel browser: attiva JavaScript per usare il convertitore.
load-failed = Impossibile caricare Drumverter. Controlla la connessione e ricarica la pagina.
load-failed-reload = Ricarica
maps-breadcrumb = Percorso di navigazione
maps-index-title = Mappe delle note MIDI per batteria di { $count } plugin | Drumverter
maps-index-description = Mappe delle note MIDI per batteria di { $count } plugin, più tabelle di conversione tra GetGood Drums, EZdrummer, Superior Drummer, Addictive Drums e altri.
maps-index-heading = Mappe delle note MIDI per batteria
maps-index-intro = Le mappe delle note di { $count } plugin di batteria e le tabelle di conversione tra i più diffusi: gli stessi dati di mappatura usati dal convertitore Drumverter.
maps-popular = Conversioni più diffuse
maps-more-engines = Altri plugin
maps-matrix-corner = DA ↓ A →
maps-pair-link = Converti { $source } in { $target }
maps-matrix-hint = Ogni freccia apre la tabella di conversione dal plugin della riga a quello della colonna.
maps-all-engines = { $count ->
    [one] { $count } plugin
   *[other] Tutti i { $count } plugin
}
maps-filter-engines-label = Filtra plugin
maps-filter-engines-placeholder = Filtra plugin…
maps-no-engines = Nessun plugin trovato
maps-engine-title = { $engineMidi }: mappa delle note della batteria | Drumverter
maps-engine-title-long-name = Mappa delle note MIDI: { $engine } | Drumverter
maps-engine-description = { $total ->
    [one] Mappa delle note MIDI di { $engine }: { $total } nota con il nome dello strumento, nelle convenzioni di ottava C-1 e C-2.
   *[other] Mappa delle note MIDI di { $engine }: tutte le { $total } note con i nomi degli strumenti, nelle convenzioni di ottava C-1 e C-2.
}
maps-engine-description-short = Mappa delle note MIDI di { $engine } con i nomi delle note in C-1 e C-2.
maps-engine-description-more = Converti { $engineMidi } in qualsiasi altro plugin, gratis.
maps-engine-heading = Mappa delle note MIDI di { $engine }
maps-engine-intro = { $total ->
    [one] La nota MIDI a cui risponde { $engine }, { $total } in tutto, con il suo strumento. I nomi delle note seguono l'una o l'altra convenzione di ottava: C-1 (Reaper, Logic, Ableton, Guitar Pro) o C-2 (Studio One, Cubase, FL Studio).
   *[other] Tutte le note MIDI a cui risponde { $engine }, { $total } in tutto, raggruppate per strumento. I nomi delle note seguono l'una o l'altra convenzione di ottava: C-1 (Reaper, Logic, Ableton, Guitar Pro) o C-2 (Studio One, Cubase, FL Studio).
}
maps-convert-to = Converti in { $engine }
maps-convert-from = Converti da { $engine }
maps-filter-drums-label = Filtra strumenti
maps-filter-drums-placeholder = Filtra per strumento o nota…
maps-octave-naming = Nomi delle ottave
maps-column-note = Nota
maps-column-drum = Strumento
maps-conversion-tables = Tabelle di conversione
maps-pair-heading = Converti { $sourceMidi } in { $target }
maps-pair-title = Converti { $sourceMidi } in { $target } | Drumverter
maps-pair-description = Converti il MIDI di batteria di { $source } in { $target }: { $exact } { $exact ->
    [one] nota esatta
   *[other] note esatte
}, { $approximated } { $approximated ->
    [one] approssimata
   *[other] approssimate
}, { $dropped } { $dropped ->
    [one] scartata
   *[other] scartate
}.
maps-pair-description-more = Convertitore gratuito nel browser.
maps-pair-summary = Su { $total } { $total ->
    [one] nota
   *[other] note
} di { $source }, { $exact } { $exact ->
    [one] ha
   *[other] hanno
} una corrispondenza esatta in { $target }, { $approximated } { $approximated ->
    [one] è approssimata
   *[other] sono approssimate
} con lo strumento disponibile più vicino e { $dropped } { $dropped ->
    [one] non ha
   *[other] non hanno
} un equivalente.
maps-pair-convert = Converti { $source } → { $target }
maps-reverse = ⇄ Inverti direzione
maps-exact-count = { $count ->
    [one] { $count } esatta
   *[other] { $count } esatte
}
maps-approximated-count = { $count ->
    [one] { $count } approssimata
   *[other] { $count } approssimate
}
maps-dropped-count = { $count ->
    [one] { $count } scartata
   *[other] { $count } scartate
}
maps-rows = Righe
maps-rows-changes = Differenze { $count }
maps-column-engine-note = Nota { $engine }
maps-column-engine-drum = Strumento { $engine }
maps-column-to = verso
maps-column-result = Risultato
maps-no-equivalent = nessun equivalente
maps-status-exact = esatta
maps-status-approximated = approssimata
maps-status-dropped = scartata
maps-more-from = Altre conversioni da { $engine }
maps-full-maps = Mappe complete delle note:
