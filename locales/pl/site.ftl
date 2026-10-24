section-guide-title = Jak konwertować MIDI perkusji między wtyczkami
section-guide-description = Konwertuj MIDI perkusji między GetGood Drums, EZdrummer, Superior Drummer, Addictive Drums i 80+ wtyczkami w trzech krokach, za darmo, w przeglądarce.
section-faq-title = FAQ konwertera MIDI perkusji
section-faq-description = Drumverter w pytaniach: koszt, prywatność, oktawy (C-1 czy C-2), konwersja wielu plików i co się dzieje z instrumentami bez odpowiednika.
section-issue-title = Zgłoś problem
section-issue-description = Błędne mapowanie instrumentu lub brak wtyczki w aplikacji Drumverter? Zgłoś to na GitHubie lub e-mailem.
section-contact-title = Kontakt
section-contact-description = Pytania, uwagi i prośby o nowe wtyczki — Drumverter, darmowy konwerter MIDI perkusji w przeglądarce.
section-terms-title = Warunki korzystania
section-terms-description = Warunki korzystania z aplikacji Drumverter: bez gwarancji, pliki nigdy nie są wysyłane, anonimowe statystyki bez plików cookie.
lang-offer = Ta strona jest też po polsku →
open-converter = Otwórz konwerter
doc-ready-heading = Czas na konwersję?
thanks-title = Dziękuję
thanks-description = Dziękuję za wsparcie aplikacji Drumverter — darmowego konwertera MIDI perkusji.
thanks-heading = Dziękuję!
thanks-body = Dzięki kawie aplikacja Drumverter pozostaje darmowa i bez reklam. Potwierdzenie płatności Stripe wyśle e-mailem.
converter-description = Darmowy konwerter MIDI perkusji: mapuj MIDI między GetGood Drums, EZdrummer, Superior Drummer, Addictive Drums, General MIDI i Guitar Pro w przeglądarce.
converter-og-description = Konwertuj MIDI perkusji między GetGood Drums, EZdrummer, Superior Drummer, Addictive Drums i ponad 80 innymi wtyczkami. Za darmo, w przeglądarce.
converter-image-alt = Drumverter — konwerter i remapper MIDI perkusji
converter-twitter-description = Darmowy remapper MIDI perkusji w przeglądarce — przenosi MIDI perkusji między układami nut wtyczek perkusyjnych.
converter-app-description = Darmowe narzędzie w przeglądarce, które przenosi MIDI perkusji między układami nut wtyczek perkusyjnych.
converter-noscript = Drumverter to darmowy remapper MIDI perkusji. Przenosi plik MIDI perkusji napisany dla układu nut jednej wtyczki perkusyjnej na układ innej — na przykład z GetGood Drums na EZdrummer, Superior Drummer, Addictive Drums, General MIDI lub Guitar Pro. Gdy wtyczce docelowej brakuje instrumentu, wybiera najbardziej podobny. Wszystko dzieje się w przeglądarce; włącz JavaScript, aby użyć konwertera.
load-failed = Nie udało się wczytać aplikacji Drumverter. Sprawdź połączenie z internetem i odśwież stronę.
load-failed-reload = Odśwież
maps-breadcrumb = Ścieżka nawigacyjna
maps-index-title =
    { $count ->
        [one] Mapa nut MIDI perkusji dla { $count } wtyczki
       *[other] Mapy nut MIDI perkusji dla { $count } wtyczek
    }
maps-index-description =
    { $count ->
        [one] Mapy nut MIDI perkusji dla { $count } wtyczki, plus tabele konwersji między GetGood Drums, EZdrummer, Superior Drummer, Addictive Drums i innymi.
       *[other] Mapy nut MIDI perkusji dla { $count } wtyczek, plus tabele konwersji między GetGood Drums, EZdrummer, Superior Drummer, Addictive Drums i innymi.
    }
maps-index-heading = Mapy nut MIDI perkusji
maps-index-intro =
    { $count ->
        [one] Mapa nut dla { $count } wtyczki perkusyjnej i tabele konwersji między najpopularniejszymi z nich — te same dane, na których działa konwerter Drumverter.
       *[other] Mapy nut dla { $count } wtyczek perkusyjnych i tabele konwersji między najpopularniejszymi z nich — te same dane, na których działa konwerter Drumverter.
    }
maps-more-engines = Pozostałe wtyczki
maps-matrix-corner = ŹRÓDŁO ↓ CEL →
maps-quick-label = Najczęściej używane wtyczki
maps-note-count =
    { $count ->
        [one] { $count } nuta
        [few] { $count } nuty
       *[many] { $count } nut
    }
maps-matrix-heading = Wszystkie pary spośród { $count } najpopularniejszych
maps-matrix-share = { $percent }%
maps-matrix-share-label = { $source } na { $target }: { $percent }% nut pasuje dokładnie
maps-matrix-hint = Każda komórka pokazuje odsetek nut, które pasują dokładnie, i otwiera tę tabelę.
maps-all-engines =
    { $count ->
        [one] Wszystkie { $count } wtyczka
        [few] Wszystkie { $count } wtyczki
       *[many] Wszystkie { $count } wtyczek
    }
maps-filter-engines-label = Filtruj wtyczki
maps-filter-engines-placeholder = Filtruj wtyczki…
maps-no-engines = Żadna wtyczka nie pasuje
maps-engine-title = { $engineMidi }: mapa nut i instrumentów
maps-engine-title-long-name = Mapa nut MIDI: { $engine }
maps-engine-description =
    { $total ->
        [one] { $engine }: mapa nut MIDI perkusji z { $total } nutą i nazwami instrumentów w C-1 i C-2.
       *[other] { $engine }: mapa nut MIDI perkusji z { $total } nutami i nazwami instrumentów w C-1 i C-2.
    }
maps-engine-description-short = { $engine }: mapa nut MIDI perkusji z nazwami w C-1 i C-2.
maps-engine-description-more = Konwertuj { $engineMidi } na dowolną wtyczkę za darmo.
maps-engine-heading = Mapa nut MIDI perkusji { $engine }
maps-engine-intro =
    { $total ->
        [one] Nuta MIDI, na którą reaguje { $engine }, pogrupowana według instrumentu — { $total } nuta w sumie. Nazwy nut są zgodne z konwencją oktaw: C-1 (Reaper, Logic, Ableton, Guitar Pro) albo C-2 (Studio One, Cubase, FL Studio).
        [few] Wszystkie nuty MIDI, na które reaguje { $engine }, pogrupowane według instrumentu — { $total } nuty w sumie. Nazwy nut są zgodne z konwencją oktaw: C-1 (Reaper, Logic, Ableton, Guitar Pro) albo C-2 (Studio One, Cubase, FL Studio).
       *[many] Wszystkie nuty MIDI, na które reaguje { $engine }, pogrupowane według instrumentu — { $total } nut w sumie. Nazwy nut są zgodne z konwencją oktaw: C-1 (Reaper, Logic, Ableton, Guitar Pro) albo C-2 (Studio One, Cubase, FL Studio).
    }
maps-convert-to = Konwertuj na { $engine }
maps-convert-from = Konwertuj z { $engine }
maps-filter-drums-label = Filtruj instrumenty
maps-filter-drums-placeholder = Szukaj instrumentu lub nuty…
maps-octave-naming = Nazwy oktaw
maps-column-note = Nuta
maps-column-drum = Instrument
maps-conversion-tables = Tabele konwersji
maps-all-notes = Wszystkie nuty ({ $total })
maps-groups-label = Grupy instrumentów
maps-extra-hint = Przygaszone wiersze to dodatkowe nuty instrumentu, który ma już nutę główną.
maps-pairs-from = Z { $engine } na
maps-pairs-to = Na { $engine } z
maps-core-heading = Nuty, których użyjesz najczęściej
maps-core-hint = Główna nuta każdego instrumentu, ta, którą zapisuje konwerter.
maps-pair-heading = Konwertuj { $sourceMidi } na { $target }
maps-pair-title = Konwertuj { $sourceMidi } na { $target }
maps-pair-description = Konwertuj MIDI { $source } na { $target }. Dokładne: { $exact }, zastąpione: { $approximated }, usunięte: { $dropped }.
maps-pair-description-more = Darmowy konwerter w przeglądarce.
maps-pair-description-short = Konwertuj MIDI { $source } na { $target }.
maps-pair-summary = Z { $total } nut { $source }: { $exact } zmapowano dokładnie na { $target }, { $approximated } zastąpiono najbardziej podobnym dostępnym instrumentem, a dla { $dropped } nie ma odpowiednika.
maps-pair-convert = Konwertuj { $source } → { $target }
maps-pair-rack-lead = Grasz na żywo w Abletonie?
maps-pair-rack-link = Pobierz rack (.adg)
maps-pair-rack = Wstaw go przed { $target }: { $sourceMidi } zagra dobrze, bez konwertowania pliku. Live 11 i 12.
maps-pair-rack-dropped = Instrumenty, których brakuje w { $target }, milkną; ich wiersze pokazują tylko nazwę nuty.
maps-steps-label = Konwersja w trzech krokach
maps-reverse = ⇄ Odwróć kierunek
maps-exact-count = dokładne: { $count }
maps-approximated-count = zastąpione: { $count }
maps-dropped-count = usunięte: { $count }
maps-rows = Wiersze
maps-rows-changes = Zmienione { $count }
maps-column-engine-note = Nuta { $engine }
maps-column-engine-drum = Instrument { $engine }
maps-column-to = na
maps-column-result = Wynik
maps-no-equivalent = brak odpowiednika
maps-status-exact = dokładny
maps-status-approximated = zastąpiony
maps-status-dropped = usunięty
maps-changes-heading = Co się zmienia
maps-changes-plays = gra { $sources }
maps-changes-dropped = { $target } nie ma instrumentu dla: { $sources }.
maps-changes-none = Każda nuta z { $source } trafia w { $target } na swój własny instrument.
maps-table-heading = Wszystkie nuty, instrument po instrumencie
maps-more-from = Więcej z { $engine }
maps-full-maps = Pełne mapy nut:
maps-index-drum-maps = Mapy perkusji do DAW dla każdej wtyczki: Cubase, Reaper, Studio One i Ableton Live
maps-engine-description-drum-maps = Darmowe mapy perkusji do Cubase, Reapera, Studio One i Ableton Live.
maps-daw-heading = Mapy perkusji do DAW
maps-daw-intro = Wczytaj jeden z tych plików do DAW, a na klawiszach piano rolla zobaczysz nazwy instrumentów { $engine }.
maps-daw-how = Jak wczytać mapę perkusji w Reaperze, Cubase, Studio One lub Ableton Live
drum-maps-title =
    { $count ->
        [one] Mapy perkusji do Cubase, Reapera, Studio One i Abletona: { $count } wtyczka
        [few] Mapy perkusji do Cubase, Reapera, Studio One i Abletona: { $count } wtyczki
       *[many] Mapy perkusji do Cubase, Reapera, Studio One i Abletona: { $count } wtyczek
    }
drum-maps-description =
    { $count ->
        [one] Darmowe mapy perkusji dla { $count } wtyczki: drum mapy Cubase (.drm), nazwy nut Reapera (.txt), pitch listy Studio One (.pitchlist) i racki Ableton Live (.adg).
       *[other] Darmowe mapy perkusji dla { $count } wtyczek: drum mapy Cubase (.drm), nazwy nut Reapera (.txt), pitch listy Studio One (.pitchlist) i racki Ableton Live (.adg).
    }
drum-maps-heading = Mapy perkusji do DAW
drum-maps-intro =
    { $count ->
        [one] Darmowe mapy perkusji dla { $count } wtyczki, zrobione z tych samych map nut, których używa konwerter. Każdy plik nazywa wszystkie nuty, które gra wtyczka, więc piano roll pokazuje nazwy instrumentów zamiast numerów nut. Pliki używają numerów nut MIDI, więc działają z oboma konwencjami oktaw.
       *[other] Darmowe mapy perkusji dla { $count } wtyczek, zrobione z tych samych map nut, których używa konwerter. Każdy plik nazywa wszystkie nuty, które gra wtyczka, więc piano roll pokazuje nazwy instrumentów zamiast numerów nut. Pliki używają numerów nut MIDI, więc działają z oboma konwencjami oktaw.
    }
drum-maps-pick-daw = Twój DAW
drum-maps-most-used = Najczęściej używane
drum-maps-how-heading = Jak wczytać mapę perkusji
drum-maps-reaper = W edytorze MIDI wybierz File → Note/CC names → Load note/CC names from file i wskaż plik .txt.
drum-maps-cubase = Otwórz MIDI → Drum Map Setup, kliknij Load i wskaż plik .drm. Potem wybierz mapę w polu Drum Map w Inspectorze ścieżki.
drum-maps-studio-one = W widoku Edit kliknij ikonę klucza, żeby pokazać nazwy nut, i przeciągnij na nie plik .pitchlist. Zapisz go z menu Pitch Names, żeby używać go ponownie.
drum-maps-ableton = Przeciągnij plik .adg na ścieżkę perkusji w Live 11 lub 12, przed wtyczkę. Otwórz klip: każdy wiersz edytora MIDI pokazuje nazwę swojego instrumentu. Nuty grają bez zmian.
drum-maps-other = Logic Pro, FL Studio i Bitwig Studio nie wczytują plików z nazwami nut. Znajdź instrument na mapie nut wtyczki albo przekonwertuj MIDI na wtyczkę, której używasz.
drum-maps-list-heading =
    { $count ->
        [one] Mapy perkusji { $count } wtyczki
       *[other] Mapy perkusji wszystkich { $count } wtyczek
    }
drum-maps-download-label = Mapa perkusji { $engine } do { $daw }
