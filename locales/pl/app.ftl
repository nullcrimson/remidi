brand-tagline = konwerter i remapper MIDI perkusji
nav-converter = Konwerter
nav-note-maps = Mapy nut
section-guide-label = Jak używać
section-guide-heading = Jak konwertować MIDI perkusji
section-guide-title = Jak konwertować MIDI perkusji między wtyczkami | Drumverter
section-guide-description = Konwertuj MIDI perkusji między GetGood Drums, EZdrummer, Superior Drummer, Addictive Drums i 80+ wtyczkami w trzech krokach, za darmo, w przeglądarce.
section-faq-label = FAQ
section-faq-heading = Najczęściej zadawane pytania
section-faq-title = FAQ konwertera MIDI perkusji | Drumverter
section-faq-description = Drumverter w pytaniach: koszt, prywatność, oktawy (C-1 czy C-2), konwersja wielu plików i co się dzieje z instrumentami bez odpowiednika.
section-issue-label = Zgłoś problem
section-issue-heading = Zgłoś problem
section-issue-title = Zgłoś problem | Drumverter
section-issue-description = Błędne mapowanie instrumentu lub brak wtyczki w aplikacji Drumverter? Zgłoś to na GitHubie lub e-mailem.
section-contact-label = Kontakt
section-contact-heading = Kontakt
section-contact-title = Kontakt | Drumverter
section-contact-description = Pytania, uwagi i prośby o nowe wtyczki — Drumverter, darmowy konwerter MIDI perkusji w przeglądarce.
section-terms-label = Warunki
section-terms-heading = Warunki korzystania
section-terms-title = Warunki korzystania | Drumverter
section-terms-description = Warunki korzystania z aplikacji Drumverter: bez gwarancji, pliki nigdy nie są wysyłane, anonimowe statystyki bez plików cookie.
skip-to-content = Przejdź do treści
nav-main = Główna
nav-site = Witryna
lang-menu-label = Język
lang-load-failed = Nie udało się wczytać wersji: { $language }. Sprawdź połączenie z internetem i spróbuj ponownie.
lang-offer = Ta strona jest też po polsku →
open-converter = Otwórz konwerter →
error-unknown-engine = Nieznana wtyczka { $role ->
    [source] źródłowa
   *[target] docelowa
} „{ $id }”
error-bad-midi = Konwerter nie może odczytać tego pliku — to chyba nie jest MIDI
error-bad-preset = To nie jest plik presetu
error-bad-overrides = Nie udało się odczytać zmian nut
error-bad-missing = Nieznane ustawienie brakujących instrumentów
error-bad-channel = Nieznane ustawienie kanału
error-internal = Coś poszło nie tak
error-wasm-unavailable = Nie udało się wczytać konwertera
error-detail = Szczegóły: { $detail }
blocker-files-and-engines = Dodaj plik .mid i wybierz obie wtyczki
blocker-files = Najpierw dodaj plik .mid
blocker-engines = Wybierz wtyczkę źródłową i docelową
channel-auto = Auto
channel-all = Wszystkie kanały
channel-number = { $channel }
channel-hint-auto = ścieżki z uderzeniami na kanale 10 · pozostałe bez zmian
channel-hint-all = konwertowany jest każdy kanał
channel-hint-one = konwertowany jest tylko kanał { $channel }
missing-nearest = Zastąp
missing-drop = Usuń
missing-hint-nearest = zastępowane podobnym instrumentem
missing-hint-drop = usuwane z pliku
missing-hint-moved = { $count ->
    [0] nic nie jest zastępowane
    [one] { $count } instrument zastąpiony
    [few] { $count } instrumenty zastąpione
   *[many] { $count } instrumentów zastąpionych
}
missing-hint-dropped = { $count ->
    [0] nic nie jest usuwane
    [one] { $count } instrument usunięty
    [few] { $count } instrumenty usunięte
   *[many] { $count } instrumentów usuniętych
}
files-unreadable = Nie udało się odczytać: { $names } — wybierz { $count ->
    [one] go
   *[other] je
} ponownie.
preset-skipped = { $count ->
    [one] { $count } zmiana w „{ $name }” używa instrumentu, którego ta wersja nie zna; pominięto.
    [few] { $count } zmiany w „{ $name }” używają instrumentów, których ta wersja nie zna; pominięto.
   *[many] { $count } zmian w „{ $name }” używa instrumentów, których ta wersja nie zna; pominięto.
}
import-failed = Nie udało się zaimportować { $file }: { $error }
import-at-cap = Nie udało się zaimportować { $file }: więcej presetów się nie zmieści (maks. { $cap })
import-done = Zaimportowano „{ $name }”.
import-done-skipped = Zaimportowano „{ $name }” (pominięto { $count ->
    [one] { $count } zmianę
    [few] { $count } zmiany
   *[many] { $count } zmian
}).
edit-line = { $drum }: { $now } (domyślnie { $byDefault })
edit-more = +{ $count } więcej
app-intro = Konwertuj MIDI perkusji między GetGood Drums, EZdrummer, Superior Drummer 3, Addictive Drums 2, General MIDI, Guitar Pro i ponad 80 innymi wtyczkami. Wszystko dzieje się w przeglądarce — pliki nigdzie nie są wysyłane.
app-loading = Wczytywanie konwertera…
convert-error = Błąd: { $error }
notice-dismiss = Zamknij
channel-label = Kanał perkusji
channel-tip-title = Które nuty są konwertowane
channel-tip = Auto konwertuje każdą ścieżkę na kanale 10 — kanale perkusji General MIDI — i nie rusza innych instrumentów. Wybierz kanał lub Wszystkie, jeśli perkusja jest gdzie indziej.
missing-label = Brakujące instrumenty
missing-tip-title = Gdy wtyczce docelowej brakuje instrumentu
missing-tip = Zastąp wstawia zamiast niego najbardziej podobny instrument wtyczki docelowej — China zamienia się w crash, Tom 4 w Tom 3. Usuń po prostu wyrzuca jego nuty z pliku. Ghost notes, rimshoty i inne warianty gry na instrumencie, który jest we wtyczce docelowej, zawsze zamieniają się w zwykłe uderzenie w ten instrument.
edited-review = { $count ->
    [one] { $count } instrument zmieniony
    [few] { $count } instrumenty zmienione
   *[many] { $count } instrumentów zmienionych
} — przejrzyj zmiany
edited-review-saved = { $count ->
    [one] { $count } instrument zmieniony
    [few] { $count } instrumenty zmienione
   *[many] { $count } instrumentów zmienionych
} z presetu { $name } — przejrzyj zmiany
edited-review-unsaved = { $count ->
    [one] { $count } instrument zmieniony, niezapisany w { $name }
    [few] { $count } instrumenty zmienione, niezapisane w { $name }
   *[many] { $count } instrumentów zmienionych, niezapisanych w { $name }
} — przejrzyj zmiany
edited-differ = { $count ->
    [one] { $count } instrument różni się
    [few] { $count } instrumenty różnią się
   *[many] { $count } instrumentów różni się
} od domyślnego mapowania
edited-click = Kliknij, aby przejrzeć lub przywrócić.
edited-count = zmienione: { $count }
edited-count-unsaved = zmienione: { $count } · niezapisane
octave-label = Oktawy zaczynają się od
octave-tip-title = Tylko nazwy oktaw
octave-tip = Określa, w której oktawie leży nuta MIDI 0, aby nazwy nut zgadzały się z DAW. Zmienia tylko to, co widać na ekranie — nuty w pliku zostają bez zmian.
canon-picker-label = Instrument dla { $note }
canon-picker-heading = ŹRÓDŁO · { $note }
close = Zamknij
dropzone-heading = UPUŚĆ .MID
dropzone-presets = lub wyeksportowany preset (.json)
convert-running = mapowanie
convert-button = Konwertuj
engine-from = ŹRÓDŁO
engine-to = CEL
engine-swap = Zamień źródło i cel
filter-clear = Wyczyść filtr
note-picker-label = Nuta docelowa dla { $drum }
note-picker-heading = CEL · { $drum }
source-picker-label = Nuta źródłowa dla { $drum }
source-picker-heading = WEJŚCIE · { $drum }
mid-badge = MID
plan-error = Nie udało się wczytać edytora nut: { $error }
plan-error-reset = Przywróć zmiany
crash-heading = Coś poszło nie tak
crash-body = Wystąpił błąd, z którym konwerter nie mógł sobie poradzić. Zwykle pomaga odświeżenie strony — a jeśli błąd wraca, jeden z zapisanych presetów może być uszkodzony.
crash-reload = Odśwież
crash-reset = Wyczyść zapisane dane…
crash-reset-confirm = Usunąć zapisane presety, ulubione i ustawienia?
crash-reset-do = Usuń i odśwież
cancel = Anuluj
saved-group = Zapisane mapowania
saved-heading = ZAPISANE
edit-back = ← Wstecz
edit-heading = Edycja nut
edit-advanced = Zaawansowane — przypisz nuty źródłowe
summary-remapped = { $total ->
    [one] Przemapowano { $remapped } z { $total } instrumentu
   *[other] Przemapowano { $remapped } z { $total } instrumentów
}
summary-edit-tip-title = Dopracuj każdy instrument
summary-edit-tip = Przypisz dowolny instrument do innej nuty docelowej — wybierz go z listy instrumentów albo z pianina. Zmiany obowiązują w konwersji i można je zapisać jako preset.
summary-edit = Edytuj pojedyncze nuty →
missing-detail-moved = Zastąpione innym instrumentem
missing-detail-dropped = Usunięte z pliku
detail-edit = Zmień w edytorze nut →
summary-detail-heading = { $total ->
    [one] { $total } instrument w tej mapie
    [few] { $total } instrumenty w tej mapie
    [many] { $total } instrumentów w tej mapie
   *[other] { $total } instrumentu w tej mapie
}
summary-detail-moved = na nowej nucie
summary-detail-same = już na właściwej nucie
summary-detail-variant = na podobnym wariancie
summary-detail-swapped = zastąpione innym instrumentem
summary-detail-dropped = usunięte
summary-detail-unplayed = brak we wtyczce źródłowej
summary-reason-same = ta sama nuta w obu wtyczkach
summary-reason-variant = brak dokładnego odpowiednika w { $target } — gra wariant tego samego instrumentu
summary-reason-swapped = brak odpowiednika w { $target } — gra najbliższy instrument
summary-reason-dropped = brak odpowiednika w { $target }
summary-reason-unplayed = brak nuty w { $source }
row-extras-dropped = { $count ->
    [one] Jeszcze { $count } nuta źródłowa gra { $drum }: { $notes }. Żadna nie ma celu.
    [few] Jeszcze { $count } nuty źródłowe grają { $drum }: { $notes }. Żadna nie ma celu.
   *[many] Jeszcze { $count } nut źródłowych gra { $drum }: { $notes }. Żadna nie ma celu.
}
row-extras = { $count ->
    [one] Jeszcze { $count } nuta źródłowa gra { $drum }: { $notes }. Obie trafiają na { $target }.
    [few] Jeszcze { $count } nuty źródłowe grają { $drum }: { $notes }. Wszystkie trafiają na { $target }.
   *[many] Jeszcze { $count } nut źródłowych gra { $drum }: { $notes }. Wszystkie trafiają na { $target }.
}
row-reset = Przywróć { $drum }
edit-filter-label = Filtruj instrumenty
edit-filter-placeholder = filtruj instrumenty…
library-filter-placeholder = szukaj…
edit-show = Pokaż
edit-show-all = Wszystkie { $count }
edit-show-changed = Zmienione { $count }
edit-show-issues = Problemy { $count }
edit-actions = Akcje edycji
edit-changes = { $count ->
    [0] Brak zmian
    [one] { $count } zmiana
    [few] { $count } zmiany
   *[many] { $count } zmian
}
edit-reset-all = Przywróć wszystko
edit-done = Gotowe
row-no-source = brak źródła
row-dropped = usunięty
rows-drum = INSTRUMENT
rows-source = ŹRÓDŁO
rows-target = CEL
rows-plays = GRA
rows-none = Żaden instrument nie pasuje
rows-reassigned = { $note } było { $from } — teraz gra { $drum }
preset-tip-title = Użyj tego mapowania ponownie
preset-tip = Zapisuje parę ŹRÓDŁO→CEL i zmiany nut jako przycisk na ekranie głównym — jedno kliknięcie wczytuje je ponownie. Zapisane tylko w tej przeglądarce.
preset-update-open = Zaktualizuj preset
preset-save-open = Zapisz jako preset
preset-name = Nazwa presetu
preset-update = Zaktualizuj
preset-save-new = Zapisz nowy
preset-save = Zapisz
preset-exists = Preset dla { $pair } już istnieje.
preset-at-cap = Więcej presetów się nie zmieści: maksymalnie { $cap }.
source-unassigned = — nieprzypisane
source-unmapped = niezmapowane
source-clear = Usuń nutę źródłową { $note }
source-add-label = Dodaj nutę źródłową
source-add-placeholder = dodaj nutę 0–127
source-add = dodaj
source-add-invalid = Wpisz numer nuty od 0 do 127
library-group = Wtyczka: { $side }
library-filter = Filtruj wtyczki: { $side }
library-hint = Pisz, aby filtrować. Strzałki przesuwają, Enter wybiera, Ctrl+Enter dodaje do ulubionych lub z nich usuwa.
library-list = Wtyczki: { $side }
library-favourites = Ulubione
library-all = Wszystkie wtyczki
library-none = brak wyników
files-skipped = Pominięto { $names } — można dodać tylko pliki .mid i wyeksportowane presety (.json)
files-drop = Upuść jeden lub kilka plików .mid w dowolnym miejscu
files-choose = Wybierz pliki
files-presets = Wyeksportowane pliki presetów (.json) można upuścić lub wybrać tak samo.
files-remove = Usuń { $name }
files-add-more = + dodaj więcej
files-clear = wyczyść wszystko
chip-rename = Zmień nazwę
chip-duplicate = Duplikuj
chip-export = Eksportuj
chip-delete = Usuń
chip-rename-label = Zmień nazwę { $name }
chip-rename-save = Zapisz nazwę
chip-rename-cancel = Anuluj zmianę nazwy
chip-overrides = { $count ->
    [one] { $count } zmiana
    [few] { $count } zmiany
   *[many] { $count } zmian
}
chip-unavailable = wtyczka niedostępna
chip-edit = Edytuj nuty dla { $name }
chip-more = Więcej akcji dla { $name }
chip-at-cap = brak miejsca na presety
done-tag-converted = { $count ->
    [one] { $count } nuta przekonwertowana
    [few] { $count } nuty przekonwertowane
   *[many] { $count } nut przekonwertowanych
}
done-tag-nothing = nic nie przekonwertowano
done-tag-approximated = zastąpione: { $count }
done-tag-dropped = usunięte: { $count }
done-tag-unrecognized = nierozpoznane: { $count }
done-tag-untouched = bez zmian na innych kanałach: { $count }
done-tag-failed = błędy: { $count }
done-file-approximated = zast.: { $count }
done-file-dropped = usun.: { $count }
done-file-unrecognized = nierozp.: { $count }
done-file-clean = bez strat
done-heading = { $count ->
    [one] { $count } plik przekonwertowany
    [few] { $count } pliki przekonwertowane
   *[many] { $count } plików przekonwertowanych
} → { $target }
done-edited = { $count ->
    [one] { $count } instrument zmieniony
    [few] { $count } instrumenty zmienione
   *[many] { $count } instrumentów zmienionych
}
done-download-one = ↓ Pobierz .mid
done-download-zip = ↓ Pobierz pliki: { $count } (.zip)
done-files = Przekonwertowane pliki
done-file-download = ↓ .mid
tip-link = Postaw mi kawę
tip-ask = Robię Drumverter sam, po godzinach. Jeśli zaoszczędził trochę ręcznego przestawiania nut, kawa pomoże, żeby dalej był darmowy i bez reklam.
tip-amounts = Wesprzyj projekt
tip-other = Inna kwota
thanks-title = Dziękuję | Drumverter
thanks-description = Dziękuję za wsparcie aplikacji Drumverter — darmowego konwertera MIDI perkusji.
thanks-heading = Dziękuję!
thanks-body = Dzięki kawie aplikacja Drumverter pozostaje darmowa i bez reklam. Potwierdzenie płatności Stripe wyśle e-mailem.
done-view-report = Zobacz raport →
done-convert-more = Nowa konwersja
done-report-mapping = Błędne mapowanie? Zgłoś
drop-missing = Usuń brakujące instrumenty i konwertuj ponownie
report-dropped = Usunięte
report-approximated = Zastąpione
report-unrecognized = Nierozpoznane
report-dropped-hint = { $target } nie ma takiego instrumentu
report-approximated-hint = zastąpione podobnym instrumentem
report-unrecognized-hint = brak w mapie { $source } — usunięte z pliku
report-pick-target = Wybierz cel →
report-assign = Przypisz →
report-across = { $summary } w { $count ->
    [one] { $count } pliku
   *[other] { $count } plikach
}
report-contact = Błędne mapowanie lub brak wtyczki? Otwórz { $issue } lub napisz na { $email }.
report-contact-issue = zgłoszenie na GitHubie
report-unchanged = Bez zmian
report-unchanged-hint = inne ścieżki / kanały
report-unchanged-entry = Nuty na innych ścieżkach lub kanałach — zostają bez zmian
report-channel = Kanał perkusji →
report-nothing = Nic nie przekonwertowano
report-nothing-channel = — brak nut na wybranym kanale perkusji. Wybierz inny kanał perkusji lub Wszystkie.
report-nothing-notes = — w tym pliku nie znaleziono nut perkusji.
report-clean = Konwersja bez strat
report-clean-detail = — każdy instrument zmapowany bezpośrednio na { $target }.
report-heading = Raport konwersji
converter-title = Drumverter — darmowy konwerter i remapper MIDI perkusji
converter-description = Darmowy konwerter MIDI perkusji: mapuj MIDI między GetGood Drums, EZdrummer, Superior Drummer, Addictive Drums, General MIDI i Guitar Pro w przeglądarce.
converter-og-description = Konwertuj MIDI perkusji między GetGood Drums, EZdrummer, Superior Drummer, Addictive Drums i ponad 80 innymi wtyczkami. Za darmo, w przeglądarce.
converter-image-alt = Drumverter — konwerter i remapper MIDI perkusji
converter-twitter-description = Darmowy remapper MIDI perkusji w przeglądarce — przenosi MIDI perkusji między układami nut wtyczek perkusyjnych.
converter-app-description = Darmowe narzędzie w przeglądarce, które przenosi MIDI perkusji między układami nut wtyczek perkusyjnych.
converter-noscript = Drumverter to darmowy remapper MIDI perkusji. Przenosi plik MIDI perkusji napisany dla układu nut jednej wtyczki perkusyjnej na układ innej — na przykład z GetGood Drums na EZdrummer, Superior Drummer, Addictive Drums, General MIDI lub Guitar Pro. Gdy wtyczce docelowej brakuje instrumentu, wybiera najbardziej podobny. Wszystko dzieje się w przeglądarce; włącz JavaScript, aby użyć konwertera.
load-failed = Nie udało się wczytać aplikacji Drumverter. Sprawdź połączenie z internetem i odśwież stronę.
load-failed-reload = Odśwież
maps-breadcrumb = Ścieżka nawigacyjna
maps-index-title = { $count ->
    [one] Mapa nut MIDI perkusji dla { $count } wtyczki | Drumverter
   *[other] Mapy nut MIDI perkusji dla { $count } wtyczek | Drumverter
}
maps-index-description = { $count ->
    [one] Mapy nut MIDI perkusji dla { $count } wtyczki, plus tabele konwersji między GetGood Drums, EZdrummer, Superior Drummer, Addictive Drums i innymi.
   *[other] Mapy nut MIDI perkusji dla { $count } wtyczek, plus tabele konwersji między GetGood Drums, EZdrummer, Superior Drummer, Addictive Drums i innymi.
}
maps-index-heading = Mapy nut MIDI perkusji
maps-index-intro = { $count ->
    [one] Mapa nut dla { $count } wtyczki perkusyjnej i tabele konwersji między najpopularniejszymi z nich — te same dane, na których działa konwerter Drumverter.
   *[other] Mapy nut dla { $count } wtyczek perkusyjnych i tabele konwersji między najpopularniejszymi z nich — te same dane, na których działa konwerter Drumverter.
}
maps-popular = Popularne konwersje
maps-more-engines = Pozostałe wtyczki
maps-matrix-corner = ŹRÓDŁO ↓ CEL →
maps-pair-link = { $source } na { $target }
maps-matrix-hint = Każda strzałka otwiera tabelę konwersji z wtyczki w wierszu na wtyczkę w kolumnie.
maps-all-engines = { $count ->
    [one] Wszystkie { $count } wtyczka
    [few] Wszystkie { $count } wtyczki
   *[many] Wszystkie { $count } wtyczek
}
maps-filter-engines-label = Filtruj wtyczki
maps-filter-engines-placeholder = Filtruj wtyczki…
maps-no-engines = Żadna wtyczka nie pasuje
maps-engine-title = { $engineMidi }: mapa nut i instrumentów | Drumverter
maps-engine-title-long-name = Mapa nut MIDI: { $engine } | Drumverter
maps-engine-description = { $total ->
    [one] { $engine }: mapa nut MIDI perkusji z { $total } nutą i nazwami instrumentów w C-1 i C-2.
   *[other] { $engine }: mapa nut MIDI perkusji z { $total } nutami i nazwami instrumentów w C-1 i C-2.
}
maps-engine-description-short = { $engine }: mapa nut MIDI perkusji z nazwami w C-1 i C-2.
maps-engine-description-more = Konwertuj { $engineMidi } na dowolną wtyczkę za darmo.
maps-engine-heading = Mapa nut MIDI perkusji { $engine }
maps-engine-intro = { $total ->
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
maps-pair-heading = Konwertuj { $sourceMidi } na { $target }
maps-pair-title = Konwertuj { $sourceMidi } na { $target } | Drumverter
maps-pair-description = Konwertuj MIDI { $source } na { $target }. Dokładne: { $exact }, zastąpione: { $approximated }, usunięte: { $dropped }.
maps-pair-description-more = Darmowy konwerter w przeglądarce.
maps-pair-summary = Z { $total } nut { $source }: { $exact } zmapowano dokładnie na { $target }, { $approximated } zastąpiono najbardziej podobnym dostępnym instrumentem, a dla { $dropped } nie ma odpowiednika.
maps-pair-convert = Konwertuj { $source } → { $target }
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
maps-more-from = Więcej z { $engine }
maps-full-maps = Pełne mapy nut:
