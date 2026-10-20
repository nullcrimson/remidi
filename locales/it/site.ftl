section-guide-title = Come convertire il MIDI di batteria tra plugin
section-guide-description = Converti il MIDI di batteria tra GetGood Drums, EZdrummer, Superior Drummer, Addictive Drums e oltre 80 plugin in tre passaggi, gratis e nel browser.
section-faq-title = Convertitore MIDI per batteria: FAQ
section-faq-description = Risposte su Drumverter: costi, privacy, C-1 o C-2, più file insieme e cosa succede se nel plugin di destinazione manca uno strumento.
section-issue-title = Segnala un problema
section-issue-description = Hai trovato una mappatura sbagliata o manca un plugin in Drumverter? Segnalalo con il modulo, su GitHub o via email.
section-contact-title = Contatti
section-contact-description = Domande, feedback o richieste di nuovi plugin per Drumverter, il convertitore MIDI per batteria gratuito che funziona nel browser.
section-terms-title = Termini di utilizzo
section-terms-description = Termini di utilizzo di Drumverter, il convertitore MIDI per batteria gratuito nel browser: fornito così com'è, file mai caricati, statistiche anonime senza cookie.
lang-offer = Questa pagina è disponibile in italiano →
open-converter = Apri il convertitore
thanks-title = Grazie
thanks-description = Grazie per il supporto a Drumverter, il convertitore MIDI per batteria gratuito.
thanks-heading = Grazie!
thanks-body = Grazie al tuo caffè, Drumverter resta gratuito e senza pubblicità. Stripe ti invierà la ricevuta via email.
converter-description = Convertitore MIDI per batteria gratuito: rimappa il MIDI di batteria tra GetGood Drums, EZdrummer, Superior Drummer, Addictive Drums, General MIDI e Guitar Pro nel browser.
converter-og-description = Converti il MIDI di batteria tra GetGood Drums, EZdrummer, Superior Drummer, Addictive Drums e oltre 80 altri plugin. Gratis, nel browser.
converter-image-alt = Drumverter — converti e rimappa il MIDI di batteria
converter-twitter-description = Rimappa gratis il MIDI di batteria nel browser, dalla mappatura delle note di un plugin a quella di un altro.
converter-app-description = App gratuita nel browser che adatta il MIDI di batteria dalla mappatura delle note di un plugin a quella di un altro.
converter-noscript = Drumverter rimappa gratis il MIDI di batteria. Prende un file MIDI di batteria scritto per la mappatura delle note di un plugin e lo adatta a quella di un altro, ad esempio da GetGood Drums a EZdrummer, Superior Drummer, Addictive Drums, General MIDI o Guitar Pro. Se uno strumento manca, viene sostituito con il più simile, così nessuna nota va persa. Funziona tutto nel browser: attiva JavaScript per usare il convertitore.
load-failed = Impossibile caricare Drumverter. Controlla la connessione a Internet e ricarica la pagina.
load-failed-reload = Ricarica
maps-breadcrumb = Percorso di navigazione
maps-index-title = Mappe delle note MIDI per batteria di { $count } plugin
maps-index-description = Mappe delle note MIDI per batteria di { $count } plugin, più tabelle di conversione tra GetGood Drums, EZdrummer, Superior Drummer, Addictive Drums e altri.
maps-index-heading = Mappe delle note MIDI per batteria
maps-index-intro = Le mappe delle note di { $count } plugin di batteria e le tabelle di conversione tra i più diffusi: sono gli stessi dati che usa il convertitore Drumverter.
maps-more-engines = Altri plugin
maps-matrix-corner = DA ↓ A →
maps-matrix-hint = Ogni freccia apre la tabella di conversione dal plugin della riga a quello della colonna.
maps-all-engines = { $count ->
    [one] { $count } plugin
   *[other] Tutti i { $count } plugin
}
maps-filter-engines-label = Filtra plugin
maps-filter-engines-placeholder = Filtra plugin…
maps-no-engines = Nessun plugin trovato
maps-engine-title = { $engineMidi }: mappa delle note della batteria
maps-engine-title-long-name = Mappa delle note MIDI: { $engine }
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
maps-pair-title = Converti { $sourceMidi } in { $target }
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
maps-pair-description-short = Converti il MIDI di batteria di { $source } in { $target }.
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
maps-index-drum-maps = Drum map per la tua DAW di ogni plugin: Cubase, Reaper e Studio One
maps-engine-description-drum-maps = Drum map gratuite per Cubase, Reaper e Studio One.
maps-daw-heading = Drum map per la tua DAW
maps-daw-intro = Carica uno di questi file nella tua DAW per vedere i nomi dei pezzi di { $engine } sui tasti del piano roll.
maps-daw-how = Come caricare una drum map in Reaper, Cubase o Studio One
drum-maps-title = Drum map per Cubase, Reaper e Studio One: { $count } plugin
drum-maps-description = Drum map gratuite per { $count } plugin: drum map di Cubase (.drm), nomi delle note di Reaper (.txt) e pitch list di Studio One (.pitchlist).
drum-maps-heading = Drum map per la tua DAW
drum-maps-intro = Drum map gratuite per { $count } plugin di batteria, ricavate dalle stesse mappe delle note che usa il convertitore. Ogni file dà un nome a tutte le note suonate dal plugin, così il piano roll mostra i nomi dei pezzi invece dei numeri di nota. I file usano i numeri di nota MIDI, quindi funzionano con entrambe le convenzioni di ottava.
drum-maps-how-heading = Come caricare una drum map
drum-maps-reaper = Nell’editor MIDI scegli File → Note/CC names → Load note/CC names from file e seleziona il file .txt.
drum-maps-cubase = Apri MIDI → Drum Map Setup, fai clic su Load e seleziona il file .drm. Poi scegli la mappa nel campo Drum Map dell’Inspector della traccia.
drum-maps-studio-one = Nella vista Edit fai clic sull’icona della chiave inglese per mostrare i nomi delle note e trascinaci sopra il file .pitchlist. Salvalo dal menu Pitch Names per riutilizzarlo.
drum-maps-other = Logic Pro, Ableton Live, FL Studio e Bitwig Studio non caricano file di nomi delle note. Usa la mappa delle note del plugin per trovare ogni pezzo, oppure converti il tuo MIDI per il plugin che usi.
drum-maps-list-heading = { $count ->
    [one] Drum map di { $count } plugin
   *[other] Drum map di tutti i { $count } plugin
}
drum-maps-download-label = Drum map di { $engine } per { $daw }
