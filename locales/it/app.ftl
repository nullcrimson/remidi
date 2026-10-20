brand-tagline = converti e rimappa il MIDI di batteria
nav-converter = Convertitore
nav-note-maps = Mappe note
nav-drum-maps = Drum map
section-guide-label = Come si usa
section-guide-heading = Come convertire il MIDI di batteria
section-faq-label = FAQ
section-faq-heading = Domande frequenti
section-issue-label = Segnala un problema
section-issue-heading = Segnala un problema
section-contact-label = Contatti
section-contact-heading = Contatti
section-terms-label = Termini
section-terms-heading = Termini di utilizzo
skip-to-content = Vai al contenuto
nav-main = Principale
nav-site = Sito
lang-menu-label = Lingua
lang-load-failed = Impossibile caricare la lingua { $language }. Controlla la connessione a Internet e riprova.
error-unknown-engine = Plugin { $role ->
    [source] di origine
   *[target] di destinazione
} sconosciuto: “{ $id }”
error-bad-midi = Il convertitore non riesce a leggere questo file: non sembra un file MIDI
error-bad-preset = Non è un file di preset
error-bad-overrides = Impossibile leggere le modifiche alle note
error-bad-missing = Impostazione sconosciuta per gli strumenti mancanti
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
presets-unsaved = Impossibile salvare i preset: la memoria del browser è piena o bloccata. Andranno persi al ricaricamento.
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
row-chain-hint = { $target } non ha { $drum }, quindi suona { $standIn }. La tua modifica manda { $standIn } su { $landed }. Fai clic per andare a { $standIn }.
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
files-sample = Prova con un groove di esempio
files-sample-needs-from = Scegli prima il plugin di origine
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
done-view-report = Vedi report →
done-convert-more = Converti altri
done-report-mapping = Mappatura sbagliata? Segnalala
done-removed = { $count ->
    [one] { $count } nota del tuo file non è nella mappatura di { $source }, quindi è stata rimossa. Origine sbagliata?
   *[other] { $count } note del tuo file non sono nella mappatura di { $source }, quindi sono state rimosse. Origine sbagliata?
}
done-pick-source = Scegli un'altra origine
done-assign-notes = Assegna le note
source-fit-missing = { $missing ->
    [one] { $missing } nota su { $hits } del tuo file non è nella mappatura di { $source }.
   *[other] { $missing } note su { $hits } del tuo file non sono nella mappatura di { $source }.
} Più adatti: { $engines }
source-fit-all = { $engine } (tutte le note)
source-fit-some = { $engine } ({ $count ->
    [one] { $count } nota
   *[other] { $count } note
})
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
maps-popular = Conversioni più diffuse
maps-pair-link = Converti { $source } in { $target }
