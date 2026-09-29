brand-tagline = конвертер MIDI ударных
nav-converter = Конвертер
nav-note-maps = Раскладки нот
section-guide-label = Как это работает
section-guide-heading = Как конвертировать MIDI ударных
section-guide-title = Как конвертировать MIDI ударных между плагинами | Drumverter
section-guide-description = Конвертируйте MIDI ударных между GetGood Drums, EZdrummer, Superior Drummer, Addictive Drums и ещё более чем 80 плагинами за четыре шага — бесплатно и прямо в браузере.
section-faq-label = FAQ
section-faq-heading = Частые вопросы
section-faq-title = Вопросы о конвертере MIDI ударных | Drumverter
section-faq-description = Ответы на вопросы о сервисе Drumverter: стоимость, конфиденциальность, нумерация октав (C-1 или C-2), конвертация нескольких файлов и что происходит с инструментами без аналога.
section-issue-label = Сообщить о проблеме
section-issue-heading = Сообщить о проблеме
section-issue-title = Сообщить о проблеме | Drumverter
section-issue-description = Нашли неверное сопоставление инструмента или хотите, чтобы в сервис Drumverter добавили плагин? Сообщите на GitHub или по электронной почте.
section-contact-label = Контакты
section-contact-heading = Контакты
section-contact-title = Контакты | Drumverter
section-contact-description = Вопросы, отзывы и запросы на новые плагины для Drumverter — бесплатного конвертера MIDI ударных в браузере.
section-terms-label = Условия
section-terms-heading = Условия использования
section-terms-title = Условия использования | Drumverter
section-terms-description = Условия использования сервиса Drumverter, бесплатного конвертера MIDI ударных в браузере: предоставляется «как есть», файлы никуда не загружаются, анонимная статистика без cookie.
skip-to-content = Перейти к содержимому
nav-main = Основное меню
nav-site = Сайт
lang-menu-label = Язык
lang-load-failed = Не удалось загрузить язык: { $language }. Проверьте подключение и попробуйте ещё раз.
lang-offer = Эта страница есть на русском →
open-converter = Открыть конвертер →
error-unknown-engine = Неизвестный { $role ->
    [source] исходный
   *[target] целевой
} плагин «{ $id }»
error-bad-midi = Это не MIDI-файл, или конвертер не может его прочитать
error-bad-preset = Это не файл пресета
error-bad-overrides = Не удалось прочитать изменения нот
error-bad-missing = Неизвестная настройка для недостающих инструментов
error-bad-channel = Неизвестная настройка канала
error-internal = Что-то пошло не так
error-wasm-unavailable = Не удалось загрузить конвертер
error-detail = Подробности: { $detail }
blocker-files-and-engines = Добавьте файл .mid и выберите оба плагина
blocker-files = Добавьте файл .mid для конвертации
blocker-engines = Выберите, откуда и куда конвертировать
channel-auto = Авто
channel-all = Все каналы
channel-number = { $channel }
channel-hint-auto = дорожки с нотами на канале 10 · остальные не меняются
channel-hint-all = конвертируются все каналы
channel-hint-one = конвертируется только канал { $channel }
missing-nearest = Ближайший
missing-drop = Убрать
missing-hint-nearest = звучат на ближайшем инструменте
missing-hint-drop = убираются из файла
missing-hint-moved = { $count ->
    [0] ни один инструмент не заменяется
    [one] { $count } инструмент звучит на другом
    [few] { $count } инструмента звучат на других
    [many] { $count } инструментов звучат на других
   *[other] { $count } инструмента звучат на других
}
missing-hint-dropped = { $count ->
    [0] ничего не убрано
    [one] { $count } инструмент убран
    [few] { $count } инструмента убраны
    [many] { $count } инструментов убрано
   *[other] { $count } инструмента убрано
}
files-unreadable = Не удалось прочитать { $names }. Выберите { $count ->
    [1] файл
   *[other] файлы
} ещё раз.
preset-skipped = { $count ->
    [one] { $count } изменение в «{ $name }» использует инструмент, которого нет в этой версии, — пропущено.
    [few] { $count } изменения в «{ $name }» используют инструменты, которых нет в этой версии, — пропущены.
    [many] { $count } изменений в «{ $name }» используют инструменты, которых нет в этой версии, — пропущены.
   *[other] { $count } изменения в «{ $name }» используют инструменты, которых нет в этой версии, — пропущены.
}
import-failed = Не удалось импортировать { $file }: { $error }
import-at-cap = Не удалось импортировать { $file }: достигнут лимит пресетов ({ $cap })
import-done = Пресет «{ $name }» импортирован.
import-done-skipped = Пресет «{ $name }» импортирован (пропущено { $count ->
    [one] { $count } изменение
    [few] { $count } изменения
    [many] { $count } изменений
   *[other] { $count } изменения
}).
edit-line = { $drum }: { $now } (по умолчанию { $byDefault })
edit-more = + ещё { $count }
app-intro = Конвертируйте MIDI ударных между раскладками GetGood Drums, EZdrummer, Superior Drummer 3, Addictive Drums 2, General MIDI, Guitar Pro и ещё более чем 80 плагинов. Всё работает в браузере — файлы никуда не загружаются.
app-loading = Загрузка конвертера…
convert-error = Ошибка: { $error }
notice-dismiss = Закрыть
channel-label = Канал ударных
channel-tip-title = Какие ноты конвертируются
channel-tip = «Авто» конвертирует все дорожки, где используется канал 10 — канал ударных в General MIDI, — и не трогает партии других инструментов. Если ударные записаны на другом канале, выберите его или «Все каналы».
missing-label = Нет в плагине
missing-tip-title = Если в целевом плагине нет инструмента
missing-tip = «Ближайший» переносит его на самый похожий инструмент целевого плагина: China — на crash, Tom 4 — на Tom 3. «Убрать» просто удаляет его ноты. Ghost notes, rimshot и другие приёмы игры на инструменте, который в целевом плагине есть, всегда заменяются обычным ударом по этому инструменту.
edited-review = { $count ->
    [one] { $count } инструмент изменён
    [few] { $count } инструмента изменены
    [many] { $count } инструментов изменено
   *[other] { $count } инструмента изменено
} — посмотреть изменения
edited-review-saved = { $count ->
    [one] { $count } инструмент изменён
    [few] { $count } инструмента изменены
    [many] { $count } инструментов изменено
   *[other] { $count } инструмента изменено
} — посмотреть изменения, из пресета «{ $name }»
edited-review-unsaved = { $count ->
    [one] { $count } инструмент изменён
    [few] { $count } инструмента изменены
    [many] { $count } инструментов изменено
   *[other] { $count } инструмента изменено
} — посмотреть изменения, не сохранено в пресет «{ $name }»
edited-differ = { $count ->
    [one] { $count } инструмент отличается
    [few] { $count } инструмента отличаются
    [many] { $count } инструментов отличаются
   *[other] { $count } инструмента отличаются
} от стандартной раскладки
edited-click = Нажмите, чтобы посмотреть или сбросить.
edited-count = изменено: { $count }
edited-count-unsaved = изменено: { $count } · не сохранено
octave-label = Октавы начинаются с
octave-tip-title = Меняются только подписи
octave-tip = Задаёт, в какой октаве находится MIDI-нота 0, чтобы названия нот совпадали с теми, что показывает ваш DAW. Ноты, записанные в файл, остаются прежними.
canon-picker-label = Инструмент для ноты { $note }
canon-picker-heading = ИСТОЧНИК · { $note }
close = Закрыть
dropzone-heading = ПЕРЕТАЩИТЕ .MID
dropzone-presets = или экспортированный пресет (.drumverter.json)
convert-running = конвертация
convert-button = Конвертировать и скачать
engine-from = ОТКУДА
engine-to = КУДА
engine-swap = Поменять местами
filter-clear = Очистить поиск
note-picker-label = Целевая нота для { $drum }
note-picker-heading = ЦЕЛЬ · { $drum }
source-picker-label = Исходная нота для { $drum }
source-picker-heading = ВХОДЯЩИЕ · { $drum }
mid-badge = MID
plan-error = Не удалось загрузить редактор нот: { $error }
plan-error-reset = Сбросить изменения
crash-heading = Что-то пошло не так
crash-body = В конвертере произошла ошибка, после которой он не может продолжить работу. Обычно помогает обновление страницы. Если ошибка повторяется, возможно, повреждён один из сохранённых пресетов.
crash-reload = Обновить
crash-reset = Сбросить сохранённые данные…
crash-reset-confirm = Удалить сохранённые пресеты, избранное и настройки?
crash-reset-do = Удалить и обновить
cancel = Отмена
saved-group = Сохранённые раскладки
saved-heading = ПРЕСЕТЫ
edit-back = ← Назад
edit-heading = Редактор нот
edit-advanced = Дополнительно — переназначить исходные ноты
summary-remapped = { $total ->
    [one] Переназначено { $remapped } из { $total } инструмента
    [few] Переназначено { $remapped } из { $total } инструментов
    [many] Переназначено { $remapped } из { $total } инструментов
   *[other] Переназначено { $remapped } из { $total } инструмента
}
summary-edit-tip-title = Настройте каждый инструмент
summary-edit-tip = Назначьте любому инструменту другую целевую ноту — выберите её в списке инструментов или на клавишах пианино. Изменения применяются при конвертации, и их можно сохранить как пресет.
summary-edit = Изменить отдельные ноты →
row-extras-dropped = { $count ->
    [one] Ещё { $count } исходная нота тоже запускает { $drum }: { $notes }. Целевой ноты нет ни у одной.
    [few] Ещё { $count } исходные ноты тоже запускают { $drum }: { $notes }. Целевой ноты нет ни у одной.
    [many] Ещё { $count } исходных нот тоже запускают { $drum }: { $notes }. Целевой ноты нет ни у одной.
   *[other] Ещё { $count } исходной ноты тоже запускают { $drum }: { $notes }. Целевой ноты нет ни у одной.
}
row-extras = { $count ->
    [1] Ещё { $count } исходная нота тоже запускает { $drum }: { $notes }. Обе попадают на { $target }.
    [one] Ещё { $count } исходная нота тоже запускает { $drum }: { $notes }. Все попадают на { $target }.
    [few] Ещё { $count } исходные ноты тоже запускают { $drum }: { $notes }. Все попадают на { $target }.
    [many] Ещё { $count } исходных нот тоже запускают { $drum }: { $notes }. Все попадают на { $target }.
   *[other] Ещё { $count } исходной ноты тоже запускают { $drum }: { $notes }. Все попадают на { $target }.
}
row-reset = Сбросить { $drum }
edit-filter-label = Поиск инструментов
edit-filter-placeholder = найти инструмент…
library-filter-placeholder = поиск…
edit-show = Показать
edit-show-all = Все { $count }
edit-show-changed = Изменённые { $count }
edit-show-issues = Проблемы { $count }
edit-actions = Действия редактора
edit-changes = { $count ->
    [0] Нет изменений
    [one] { $count } изменение
    [few] { $count } изменения
    [many] { $count } изменений
   *[other] { $count } изменения
}
edit-reset-all = Сбросить всё
edit-done = Готово
row-no-source = нет источника
row-dropped = убрано
rows-drum = ИНСТРУМЕНТ
rows-source = ИСТОЧНИК
rows-target = ЦЕЛЬ
rows-plays = ЗВУЧИТ
rows-none = Ничего не найдено
rows-reassigned = { $note } — было { $from }, теперь звучит { $drum }
preset-tip-title = Сохраните раскладку на потом
preset-tip = Сохраняет пару ОТКУДА→КУДА и все изменения нот в виде кнопки на главном экране — одно нажатие загружает её снова. Хранится только в этом браузере.
preset-update-open = Обновить пресет
preset-save-open = Сохранить как пресет
preset-name = Название пресета
preset-update = Обновить
preset-save-new = Сохранить как новый
preset-save = Сохранить
preset-exists = Пресет для { $pair } уже есть.
preset-at-cap = Достигнут лимит пресетов ({ $cap }).
source-unassigned = — не назначено
source-unmapped = нет в раскладке
source-clear = Убрать исходную ноту { $note }
source-add-label = Добавить исходную ноту
source-add-placeholder = номер ноты 0–127
source-add = добавить
source-add-invalid = Введите номер ноты от 0 до 127
library-group = Плагин: { $side }
library-filter = Поиск плагина: { $side }
library-hint = Начните вводить название. Стрелки — перемещение, Enter — выбор, Ctrl+Enter — добавить в избранное или убрать из него.
library-list = Плагины: { $side }
library-favourites = Избранное
library-all = Все плагины
library-none = ничего не найдено
files-skipped = Пропущено: { $names }. Можно добавлять только файлы .mid и экспортированные пресеты (.drumverter.json)
files-drop = Перетащите файл .mid в любое место или нажмите, чтобы выбрать
files-presets = Экспортированные пресеты (.drumverter.json) можно так же перетащить или выбрать.
files-remove = Убрать { $name }
files-add-more = + добавить ещё
files-clear = очистить
chip-rename = Переименовать
chip-duplicate = Дублировать
chip-export = Экспортировать
chip-delete = Удалить
chip-rename-label = Переименовать { $name }
chip-rename-save = Сохранить название
chip-rename-cancel = Отменить переименование
chip-overrides = изменено: { $count }
chip-unavailable = плагин недоступен
chip-edit = Изменить ноты: { $name }
chip-more = Другие действия: { $name }
chip-at-cap = достигнут лимит пресетов
done-tag-converted = { $count ->
    [one] { $count } нота конвертирована
    [few] { $count } ноты конвертированы
    [many] { $count } нот конвертировано
   *[other] { $count } ноты конвертировано
}
done-tag-nothing = ничего не конвертировано
done-tag-approximated = заменено: { $count }
done-tag-dropped = убрано: { $count }
done-tag-unrecognized = не распознано: { $count }
done-tag-untouched = без изменений на других каналах: { $count }
done-tag-failed = ошибок: { $count }
done-file-approximated = заменено: { $count }
done-file-dropped = убрано: { $count }
done-file-unrecognized = не распозн.: { $count }
done-file-clean = без потерь
done-heading = { $count ->
    [one] { $count } файл конвертирован
    [few] { $count } файла конвертированы
    [many] { $count } файлов конвертировано
   *[other] { $count } файла конвертировано
} → { $target }
done-edited = { $count ->
    [one] { $count } инструмент изменён
    [few] { $count } инструмента изменены
    [many] { $count } инструментов изменено
   *[other] { $count } инструмента изменено
}
done-download-one = ↓ Скачать .mid
done-download-zip = ↓ Скачать { $count ->
    [one] { $count } файл
    [few] { $count } файла
    [many] { $count } файлов
   *[other] { $count } файла
} (.zip)
done-files = Конвертированные файлы
done-file-download = ↓ .mid
done-view-report = Открыть отчёт →
done-convert-more = Конвертировать ещё
drop-missing = Убрать недостающие и конвертировать заново
report-dropped = Убрано
report-approximated = Заменено
report-unrecognized = Не распознано
report-dropped-hint = в плагине { $target } нет такого инструмента
report-approximated-hint = звучат на ближайшем инструменте
report-unrecognized-hint = нет в раскладке { $source } — убраны из файла
report-pick-target = Выбрать ноту →
report-assign = Назначить →
report-across = { $summary } в { $count ->
    [one] { $count } файле
    [few] { $count } файлах
    [many] { $count } файлах
   *[other] { $count } файлах
}
report-contact = Неверное сопоставление или нет нужного плагина? Создайте { $issue } или напишите на { $email }.
report-contact-issue = issue на GitHub
report-unchanged = Без изменений
report-unchanged-hint = другие дорожки / каналы
report-unchanged-entry = Ноты на других дорожках или каналах остались как были
report-channel = Канал ударных →
report-nothing = Ничего не конвертировано
report-nothing-channel = — на выбранном канале ударных нет нот. Выберите другой канал или «Все каналы».
report-nothing-notes = — в этом файле не найдено нот ударных.
report-clean = Конвертация без потерь
report-clean-detail = — каждый инструмент перенесён в { $target } напрямую.
report-heading = Отчёт о конвертации
converter-title = Drumverter — бесплатный конвертер MIDI ударных
converter-description = Бесплатный конвертер MIDI ударных: переносите MIDI-партии между GetGood Drums, EZdrummer, Superior Drummer, Addictive Drums, General MIDI и Guitar Pro прямо в браузере.
converter-og-description = Конвертируйте MIDI ударных между GetGood Drums, EZdrummer, Superior Drummer, Addictive Drums и ещё более чем 80 плагинами. Бесплатно, в браузере.
converter-image-alt = Drumverter — конвертация и переназначение MIDI ударных
converter-twitter-description = Бесплатный конвертер MIDI ударных в браузере — переносит MIDI ударных между раскладками нот разных плагинов.
converter-app-description = Бесплатный сервис в браузере, который переносит MIDI ударных между раскладками нот разных плагинов.
converter-noscript = Drumverter — бесплатный конвертер MIDI ударных. Он переносит MIDI-файл ударных, написанный под раскладку нот одного плагина, на раскладку другого — например, из GetGood Drums в EZdrummer, Superior Drummer, Addictive Drums, General MIDI или Guitar Pro — через общий словарь инструментов с запасными вариантами для каждого слота. Всё переназначение нот идёт прямо в браузере; чтобы пользоваться конвертером, включите JavaScript.
load-failed = Не удалось загрузить Drumverter. Проверьте подключение и обновите страницу.
load-failed-reload = Обновить
maps-breadcrumb = Навигационная цепочка
maps-index-title = { $count ->
    [one] Раскладки нот MIDI ударных для { $count } плагина | Drumverter
    [few] Раскладки нот MIDI ударных для { $count } плагинов | Drumverter
    [many] Раскладки нот MIDI ударных для { $count } плагинов | Drumverter
   *[other] Раскладки нот MIDI ударных для { $count } плагина | Drumverter
}
maps-index-description = { $count ->
    [one] Раскладки нот MIDI ударных для { $count } плагина и таблицы конвертации между GetGood Drums, EZdrummer, Superior Drummer, Addictive Drums и другими.
    [few] Раскладки нот MIDI ударных для { $count } плагинов и таблицы конвертации между GetGood Drums, EZdrummer, Superior Drummer, Addictive Drums и другими.
    [many] Раскладки нот MIDI ударных для { $count } плагинов и таблицы конвертации между GetGood Drums, EZdrummer, Superior Drummer, Addictive Drums и другими.
   *[other] Раскладки нот MIDI ударных для { $count } плагина и таблицы конвертации между GetGood Drums, EZdrummer, Superior Drummer, Addictive Drums и другими.
}
maps-index-heading = Раскладки нот MIDI ударных
maps-index-intro = { $count ->
    [one] Раскладки нот для { $count } плагина ударных и таблицы конвертации между самыми популярными из них — те же данные, на которых работает конвертер Drumverter.
    [few] Раскладки нот для { $count } плагинов ударных и таблицы конвертации между самыми популярными из них — те же данные, на которых работает конвертер Drumverter.
    [many] Раскладки нот для { $count } плагинов ударных и таблицы конвертации между самыми популярными из них — те же данные, на которых работает конвертер Drumverter.
   *[other] Раскладки нот для { $count } плагина ударных и таблицы конвертации между самыми популярными из них — те же данные, на которых работает конвертер Drumverter.
}
maps-popular = Популярные конвертации
maps-more-engines = Другие плагины
maps-matrix-corner = ОТКУДА ↓ КУДА →
maps-pair-link = Из { $source } в { $target }
maps-matrix-hint = Стрелка открывает таблицу конвертации из плагина строки в плагин столбца.
maps-all-engines = Все плагины ({ $count })
maps-filter-engines-label = Поиск плагинов
maps-filter-engines-placeholder = Найти плагин…
maps-no-engines = Плагины не найдены
maps-engine-title = { $engineMidi }: раскладка нот ударных | Drumverter
maps-engine-title-long-name = Раскладка нот MIDI: { $engine } | Drumverter
maps-engine-description = { $total ->
    [one] { $engine }: раскладка нот MIDI ударных — всего { $total } нота с названиями инструментов, в нотации C-1 и C-2.
    [few] { $engine }: раскладка нот MIDI ударных — всего { $total } ноты с названиями инструментов, в нотации C-1 и C-2.
    [many] { $engine }: раскладка нот MIDI ударных — всего { $total } нот с названиями инструментов, в нотации C-1 и C-2.
   *[other] { $engine }: раскладка нот MIDI ударных — всего { $total } ноты с названиями инструментов, в нотации C-1 и C-2.
}
maps-engine-description-short = { $engine }: раскладка нот MIDI ударных с названиями нот в нотации C-1 и C-2.
maps-engine-description-more = Конвертируйте { $engineMidi } в любой плагин бесплатно.
maps-engine-heading = MIDI-раскладка ударных { $engine }
maps-engine-intro = { $total ->
    [one] Все MIDI-ноты, на которые реагирует плагин { $engine }, — всего { $total } нота — сгруппированы по инструментам. Названия нот можно показать в любой из двух систем нумерации октав: C-1 (Reaper, Logic, Ableton, Guitar Pro) или C-2 (Studio One, Cubase, FL Studio).
    [few] Все MIDI-ноты, на которые реагирует плагин { $engine }, — всего { $total } ноты — сгруппированы по инструментам. Названия нот можно показать в любой из двух систем нумерации октав: C-1 (Reaper, Logic, Ableton, Guitar Pro) или C-2 (Studio One, Cubase, FL Studio).
    [many] Все MIDI-ноты, на которые реагирует плагин { $engine }, — всего { $total } нот — сгруппированы по инструментам. Названия нот можно показать в любой из двух систем нумерации октав: C-1 (Reaper, Logic, Ableton, Guitar Pro) или C-2 (Studio One, Cubase, FL Studio).
   *[other] Все MIDI-ноты, на которые реагирует плагин { $engine }, — всего { $total } ноты — сгруппированы по инструментам. Названия нот можно показать в любой из двух систем нумерации октав: C-1 (Reaper, Logic, Ableton, Guitar Pro) или C-2 (Studio One, Cubase, FL Studio).
}
maps-convert-to = Конвертировать в { $engine }
maps-convert-from = Конвертировать из { $engine }
maps-filter-drums-label = Поиск инструментов
maps-filter-drums-placeholder = Найти инструмент или ноту…
maps-octave-naming = Нумерация октав
maps-column-note = Нота
maps-column-drum = Инструмент
maps-conversion-tables = Таблицы конвертации
maps-pair-heading = Конвертация { $sourceMidi } в { $target }
maps-pair-title = Конвертация { $sourceMidi } в { $target } | Drumverter
maps-pair-description = Конвертация MIDI ударных из { $source } в { $target }: точно — { $exact }, заменено — { $approximated }, убрано — { $dropped }.
maps-pair-description-more = Бесплатный конвертер в браузере.
maps-pair-summary = Из { $total } { $total ->
    [one] ноты
    [few] нот
    [many] нот
   *[other] ноты
} плагина { $source }: { $exact } — точно в { $target }, { $approximated } — с заменой на ближайший доступный инструмент, { $dropped } — без аналога.
maps-pair-convert = Конвертировать { $source } → { $target }
maps-reverse = ⇄ Обратное направление
maps-exact-count = точно: { $count }
maps-approximated-count = заменено: { $count }
maps-dropped-count = убрано: { $count }
maps-rows = Строки
maps-rows-changes = Изменённые { $count }
maps-column-engine-note = Нота { $engine }
maps-column-engine-drum = Инструмент { $engine }
maps-column-to = в
maps-column-result = Результат
maps-no-equivalent = нет аналога
maps-status-exact = точно
maps-status-approximated = заменено
maps-status-dropped = убрано
maps-more-from = Другие конвертации из { $engine }
maps-full-maps = Полные раскладки нот:
