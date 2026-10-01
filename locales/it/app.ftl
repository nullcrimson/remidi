brand-tagline = converti e rimappa il MIDI di batteria
nav-converter = Convertitore
nav-note-maps = Mappe note
section-guide-label = Come si usa
section-guide-heading = Come convertire il MIDI di batteria
section-guide-title = Come convertire il MIDI di batteria tra plugin | Drumverter
section-guide-description = Converti il MIDI di batteria tra GetGood Drums, EZdrummer, Superior Drummer, Addictive Drums e oltre 80 plugin in tre passaggi, gratis e nel browser.
section-faq-label = FAQ
section-faq-heading = Domande frequenti
section-faq-title = Convertitore MIDI per batteria: FAQ | Drumverter
section-faq-description = Risposte su Drumverter: costi, privacy, C-1 o C-2, più file insieme e cosa succede se nel plugin di destinazione manca uno strumento.
section-issue-label = Segnala un problema
section-issue-heading = Segnala un problema
section-issue-title = Segnala un problema | Drumverter
section-issue-description = Hai trovato una mappatura sbagliata o manca un plugin in Drumverter? Segnalalo con il modulo, su GitHub o via email.
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
lang-load-failed = Impossibile caricare la lingua { $language }. Controlla la connessione a Internet e riprova.
lang-offer = Questa pagina è disponibile in italiano →
open-converter = Apri il convertitore →
error-unknown-engine = Plugin { $role ->
    [source] di origine
   *[target] di destinazione
} sconosciuto: “{ $id }”
error-bad-midi = Il convertitore non riesce a leggere questo file: non sembra un file MIDI
error-bad-preset = Non è un file di preset
error-bad-overrides = Impossibile leggere le modifiche alle note
error-bad-missing = Impostazione sconosciuta per gli strumenti mancanti
error-bad-channel = Impostazione del canale sconosciuta
error-internal = Qualcosa è andato storto
error-wasm-unavailable = Impossibile caricare il convertitore
error-detail = Dettagli: { $detail }
blocker-files-and-engines = Aggiungi un file .mid e scegli i plugin
blocker-files = Prima aggiungi un file .mid
blocker-engines = Scegli entrambi i plugin
channel-auto = Auto
channel-all = Tutti i canali
channel-number = { $channel }
channel-hint-auto = tracce con note sul canale 10 · altre invariate
channel-hint-all = vengono convertiti tutti i canali
channel-hint-one = viene convertito solo il canale { $channel }
missing-nearest = Sostituisci
missing-drop = Rimuovi
missing-hint-nearest = sostituiti con lo strumento più simile
missing-hint-drop = rimossi dal file
missing-hint-moved = { $count ->
    [0] nessuno strumento sostituito
    [one] { $count } strumento sostituito
   *[other] { $count } strumenti sostituiti
}
missing-hint-dropped = { $count ->
    [0] nessuno strumento rimosso
    [one] { $count } strumento rimosso
   *[other] { $count } strumenti rimossi
}
files-unreadable = Impossibile leggere { $names }: { $count ->
    [one] sceglilo
   *[other] sceglili
} di nuovo.
preset-skipped = { $count ->
    [one] { $count } modifica in “{ $name }” ignorata: questa versione non conosce lo strumento.
   *[other] { $count } modifiche in “{ $name }” ignorate: questa versione non conosce quegli strumenti.
}
import-failed = Impossibile importare { $file }: { $error }
import-at-cap = Impossibile importare { $file }: non c'è spazio per altri preset (massimo { $cap })
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
app-intro = Converti il MIDI di batteria tra GetGood Drums, EZdrummer, Superior Drummer 3, Addictive Drums 2, General MIDI, Guitar Pro e oltre 80 altri plugin. Funziona tutto nel browser: i tuoi file non vengono caricati da nessuna parte.
app-loading = Stiamo caricando il convertitore…
convert-error = Errore: { $error }
notice-dismiss = Ignora
channel-label = Canale batteria
channel-tip-title = Quali note vengono convertite
channel-tip = Con Auto vengono convertite tutte le tracce sul canale 10 (il canale della batteria in General MIDI), mentre le altre tracce restano come sono. Se la batteria è su un altro canale, sceglilo oppure scegli Tutti i canali.
missing-label = Strumenti mancanti
missing-tip-title = Se nel plugin di destinazione manca uno strumento
missing-tip = “Sostituisci” usa al suo posto lo strumento più simile del plugin di destinazione: un crash al posto di un China, il Tom 3 al posto del Tom 4. “Rimuovi” toglie le sue note dal file. Se manca solo un'articolazione (ghost note, rimshot…), la nota diventa sempre un colpo normale sullo stesso strumento.
edited-review = { $count ->
    [one] { $count } strumento modificato
   *[other] { $count } strumenti modificati
} — vedi le modifiche
edited-review-saved = { $count ->
    [one] { $count } strumento modificato
   *[other] { $count } strumenti modificati
} (preset { $name }) — vedi le modifiche
edited-review-unsaved = { $count ->
    [one] { $count } strumento modificato
   *[other] { $count } strumenti modificati
} — vedi le modifiche, non ancora salvate in { $name }
edited-differ = { $count ->
    [one] { $count } strumento è diverso
   *[other] { $count } strumenti sono diversi
} dalla mappatura predefinita
edited-click = Fai clic per vederle o ripristinarle.
edited-count = { $count ->
    [one] { $count } modificato
   *[other] { $count } modificati
}
edited-count-unsaved = { $count ->
    [one] { $count } modificato · non salvato
   *[other] { $count } modificati · non salvati
}
octave-label = Le ottave partono da
octave-tip-title = Cambia solo i nomi delle note
octave-tip = Imposta in quale ottava si trova la nota MIDI 0, così i nomi delle note sono gli stessi della tua DAW. Le note nel file restano come sono.
canon-picker-label = Strumento per { $note }
canon-picker-heading = ORIGINE · { $note }
close = Chiudi
dropzone-heading = TRASCINA .MID
dropzone-presets = o un preset esportato (.json)
convert-running = conversione
convert-button = Converti
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
crash-body = Il convertitore si è bloccato per un errore. Di solito basta ricaricare la pagina; se succede di nuovo, un preset salvato potrebbe essere danneggiato.
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
summary-edit-tip = Puoi dare a qualsiasi strumento un'altra nota di destinazione, scegliendola dall'elenco o dalla tastiera. Le modifiche valgono per la conversione e puoi salvarle come preset.
summary-edit = Modifica le singole note →
missing-detail-moved = Sostituiti con un altro strumento
missing-detail-dropped = Rimossi dal file
detail-edit = Modifica nell’editor delle note →
summary-detail-heading = { $total ->
    [one] { $total } strumento in questa mappa
   *[other] { $total } strumenti in questa mappa
}
summary-detail-moved = su una nota nuova
summary-detail-same = già sulla nota giusta
summary-detail-variant = su una variante simile
summary-detail-swapped = sostituiti con un altro strumento
summary-detail-dropped = rimossi
summary-detail-unplayed = non presenti nel plugin di origine
summary-reason-same = stessa nota in entrambi i plugin
summary-reason-variant = nessun equivalente esatto in { $target }: suona una variante dello stesso strumento
summary-reason-swapped = nessun equivalente in { $target }: suona lo strumento più simile
summary-reason-dropped = nessun equivalente in { $target }
summary-reason-unplayed = nessuna nota in { $source }
row-extras-dropped = { $count ->
    [one] Anche { $count } altra nota di origine suona { $drum }: { $notes }. Nessuna delle due ha una destinazione.
   *[other] Anche altre { $count } note di origine suonano { $drum }: { $notes }. Nessuna ha una destinazione.
}
row-extras = { $count ->
    [one] Anche { $count } altra nota di origine suona { $drum }: { $notes }. Entrambe vanno su { $target }.
   *[other] Anche altre { $count } note di origine suonano { $drum }: { $notes }. Tutte vanno su { $target }.
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
row-dropped = rimosso
rows-drum = STRUMENTO
rows-source = ORIGINE
rows-target = DESTINAZIONE
rows-plays = SUONA
rows-none = Nessuno strumento trovato
rows-reassigned = { $note } era { $from }, ora suona { $drum }
preset-tip-title = Salva la mappatura per dopo
preset-tip = Salva DA→A e le modifiche alle note come pulsante nella schermata principale: con un clic ricarichi tutto. Resta solo in questo browser.
preset-update-open = Aggiorna preset
preset-save-open = Salva come preset
preset-name = Nome preset
preset-update = Aggiorna
preset-save-new = Salva copia
preset-save = Salva
preset-exists = C'è già un preset per { $pair }.
preset-at-cap = Non c'è spazio per altri preset: massimo { $cap }.
source-unassigned = — non assegnata
source-unmapped = non mappata
source-clear = Rimuovi la nota di origine { $note }
source-add-label = Aggiungi nota di origine
source-add-placeholder = aggiungi nota 0–127
source-add = aggiungi
source-add-invalid = Inserisci un numero di nota da 0 a 127
library-group = Plugin: { $side }
library-filter = Filtra plugin: { $side }
library-hint = Digita per filtrare. Le frecce spostano la selezione, Invio sceglie, Ctrl+Invio aggiunge o toglie dai preferiti.
library-list = Elenco plugin: { $side }
library-favourites = Preferiti
library-all = Tutti i plugin
library-none = nessun risultato
files-skipped = Impossibile aggiungere { $names }: si possono aggiungere solo file .mid e preset esportati (.json)
files-drop = Trascina uno o più .mid ovunque
files-choose = Scegli file
files-presets = Anche i preset esportati (.json) si trascinano o si scelgono allo stesso modo.
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
chip-at-cap = non c'è spazio per altri preset
done-tag-converted = { $count ->
    [one] { $count } nota convertita
   *[other] { $count } note convertite
}
done-tag-nothing = nessuna nota convertita
done-tag-approximated = { $count ->
    [one] { $count } sostituita
   *[other] { $count } sostituite
}
done-tag-dropped = { $count ->
    [one] { $count } rimossa
   *[other] { $count } rimosse
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
done-file-approximated = { $count } sostit.
done-file-dropped = { $count ->
    [one] { $count } rimossa
   *[other] { $count } rimosse
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
tip-link = Offrimi un caffè
tip-ask = Sviluppo Drumverter da solo, nel tempo libero. Se ti ha evitato di rimappare a mano, con un caffè resta gratuito e senza pubblicità.
tip-amounts = Sostieni Drumverter
tip-other = Altro importo
thanks-title = Grazie | Drumverter
thanks-description = Grazie per il supporto a Drumverter, il convertitore MIDI per batteria gratuito.
thanks-heading = Grazie!
thanks-body = Grazie al tuo caffè, Drumverter resta gratuito e senza pubblicità. Stripe ti invierà la ricevuta via email.
done-view-report = Vedi report →
done-convert-more = Converti altri
done-report-mapping = Mappatura sbagliata? Segnalala
drop-missing = Rimuovi gli strumenti mancanti e riconverti
report-dropped = Rimosse
report-approximated = Sostituite
report-unrecognized = Non riconosciute
report-dropped-hint = { $target } non ha questo strumento
report-approximated-hint = sostituite con lo strumento più simile
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
report-nothing-channel = — nessuna nota sul canale batteria scelto. Scegli un altro canale o Tutti i canali.
report-nothing-notes = — in questo file non ci sono note di batteria.
report-clean = Conversione pulita
report-clean-detail = — tutti gli strumenti esistono tali e quali in { $target }.
report-heading = Report di conversione
converter-title = Drumverter — converti e rimappa il MIDI di batteria gratis
converter-description = Convertitore MIDI per batteria gratuito: rimappa il MIDI di batteria tra GetGood Drums, EZdrummer, Superior Drummer, Addictive Drums, General MIDI e Guitar Pro nel browser.
converter-og-description = Converti il MIDI di batteria tra GetGood Drums, EZdrummer, Superior Drummer, Addictive Drums e oltre 80 altri plugin. Gratis, nel browser.
converter-image-alt = Drumverter — converti e rimappa il MIDI di batteria
converter-twitter-description = Rimappa gratis il MIDI di batteria nel browser, dalla mappatura delle note di un plugin a quella di un altro.
converter-app-description = App gratuita nel browser che adatta il MIDI di batteria dalla mappatura delle note di un plugin a quella di un altro.
converter-noscript = Drumverter rimappa gratis il MIDI di batteria. Prende un file MIDI di batteria scritto per la mappatura delle note di un plugin e lo adatta a quella di un altro, ad esempio da GetGood Drums a EZdrummer, Superior Drummer, Addictive Drums, General MIDI o Guitar Pro. Se uno strumento manca, viene sostituito con il più simile, così nessuna nota va persa. Funziona tutto nel browser: attiva JavaScript per usare il convertitore.
load-failed = Impossibile caricare Drumverter. Controlla la connessione a Internet e ricarica la pagina.
load-failed-reload = Ricarica
maps-breadcrumb = Percorso di navigazione
maps-index-title = Mappe delle note MIDI per batteria di { $count } plugin | Drumverter
maps-index-description = Mappe delle note MIDI per batteria di { $count } plugin, più tabelle di conversione tra GetGood Drums, EZdrummer, Superior Drummer, Addictive Drums e altri.
maps-index-heading = Mappe delle note MIDI per batteria
maps-index-intro = Le mappe delle note di { $count } plugin di batteria e le tabelle di conversione tra i più diffusi: sono gli stessi dati che usa il convertitore Drumverter.
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
    [one] Mappa delle note MIDI di { $engine }: { $total } nota con il nome dello strumento, in C-1 e in C-2.
   *[other] Mappa delle note MIDI di { $engine }: tutte le { $total } note con i nomi degli strumenti, in C-1 e in C-2.
}
maps-engine-description-short = Mappa delle note MIDI di { $engine } con i nomi delle note in C-1 e C-2.
maps-engine-description-more = Converti { $engineMidi } in qualsiasi altro plugin, gratis.
maps-engine-heading = Mappa delle note MIDI di { $engine }
maps-engine-intro = { $total ->
    [one] { $engine } risponde a { $total } nota MIDI, mostrata con il suo strumento. Puoi vedere i nomi delle note in C-1 (Reaper, Logic, Ableton, Guitar Pro) o in C-2 (Studio One, Cubase, FL Studio).
   *[other] { $engine } risponde a { $total } note MIDI, raggruppate per strumento. Puoi vedere i nomi delle note in C-1 (Reaper, Logic, Ableton, Guitar Pro) o in C-2 (Studio One, Cubase, FL Studio).
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
    [one] sostituita
   *[other] sostituite
}, { $dropped } { $dropped ->
    [one] rimossa
   *[other] rimosse
}.
maps-pair-description-more = Convertitore gratuito nel browser.
maps-pair-summary = Su { $total } { $total ->
    [one] nota
   *[other] note
} di { $source }, { $exact } { $exact ->
    [one] ha
   *[other] hanno
} una corrispondenza esatta in { $target }, { $approximated } { $approximated ->
    [one] è sostituita
   *[other] sono sostituite
} con lo strumento più simile e { $dropped } { $dropped ->
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
    [one] { $count } sostituita
   *[other] { $count } sostituite
}
maps-dropped-count = { $count ->
    [one] { $count } rimossa
   *[other] { $count } rimosse
}
maps-rows = Righe
maps-rows-changes = Differenze { $count }
maps-column-engine-note = Nota { $engine }
maps-column-engine-drum = Strumento { $engine }
maps-column-to = verso
maps-column-result = Risultato
maps-no-equivalent = nessun equivalente
maps-status-exact = esatta
maps-status-approximated = sostituita
maps-status-dropped = rimossa
maps-more-from = Altre conversioni da { $engine }
maps-full-maps = Mappe complete delle note:
