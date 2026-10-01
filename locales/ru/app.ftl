brand-tagline = конвертер MIDI плагинов для барабанов
nav-converter = Конвертер
nav-note-maps = Маппинги
section-guide-label = Как пользоваться
section-guide-heading = Как конвертировать MIDI ударных
section-guide-title = Как конвертировать MIDI ударных между плагинами | Drumverter
section-guide-description = Конвертируйте MIDI ударных между GetGood Drums, EZdrummer, Superior Drummer, Addictive Drums и ещё более чем 80 плагинами в три шага — бесплатно, прямо в браузере.
section-faq-label = FAQ
section-faq-heading = Частые вопросы
section-faq-title = Вопросы о конвертере MIDI плагинов для барабанов | Drumverter
section-faq-description = Ответы на частые вопросы: сколько стоит Drumverter, загружаются ли куда-то файлы, C-1 или C-2, можно ли конвертировать несколько файлов сразу и что будет, если в плагине нет нужного барабана.
section-issue-label = Сообщить о проблеме
section-issue-heading = Сообщить о проблеме
section-issue-title = Сообщить о проблеме | Drumverter
section-issue-description = Неправильная нота или в списке нет нужного плагина? Напишите через форму, на GitHub или на почту.
section-contact-label = Контакты
section-contact-heading = Контакты
section-contact-title = Контакты | Drumverter
section-contact-description = Вопросы, отзывы и пожелания по новым плагинам — пишите автору Drumverter, бесплатного конвертера MIDI плагинов для барабанов.
section-terms-label = Условия
section-terms-heading = Условия использования
section-terms-title = Условия использования | Drumverter
section-terms-description = Условия использования Drumverter — бесплатного конвертера MIDI плагинов для барабанов: всё «как есть», файлы никуда не загружаются, анонимная статистика без cookie.
skip-to-content = Перейти к содержимому
nav-main = Главное меню
nav-site = Сайт
lang-menu-label = Язык
lang-load-failed = Не удалось загрузить язык: { $language }. Проверьте интернет и попробуйте ещё раз.
lang-offer = Эта страница есть на русском →
open-converter = Открыть конвертер →
error-unknown-engine = Неизвестный { $role ->
    [source] исходный
   *[target] целевой
} плагин «{ $id }»
error-bad-midi = Конвертер не может прочитать этот файл — похоже, это не MIDI
error-bad-preset = Это не файл пресета
error-bad-overrides = Не удалось прочитать изменения нот
error-bad-missing = Неизвестная настройка для недостающих инструментов
error-bad-channel = Неизвестная настройка канала
error-internal = Что-то пошло не так
error-wasm-unavailable = Не удалось загрузить конвертер
error-detail = Подробности: { $detail }
blocker-files-and-engines = Добавьте файл .mid и выберите оба плагина
blocker-files = Сначала добавьте файл .mid
blocker-engines = Выберите, из какого плагина и в какой конвертировать
channel-auto = Авто
channel-all = Все каналы
channel-number = { $channel }
channel-hint-auto = конвертируются только ударные на канале 10 · остальные дорожки не меняются
channel-hint-all = конвертируются все каналы
channel-hint-one = конвертируется только канал { $channel }
missing-nearest = Заменить
missing-drop = Убрать
missing-hint-nearest = заменяются самым похожим инструментом
missing-hint-drop = убираются из файла
missing-hint-moved = { $count ->
    [0] ничего не заменяется
    [one] заменяется { $count } инструмент
    [few] заменяются { $count } инструмента
    [many] заменяются { $count } инструментов
   *[other] заменяется { $count } инструмента
}
missing-hint-dropped = { $count ->
    [0] ничего не убирается
    [one] убирается { $count } инструмент
    [few] убираются { $count } инструмента
    [many] убираются { $count } инструментов
   *[other] убирается { $count } инструмента
}
files-unreadable = Не удалось прочитать { $names }. Выберите { $count ->
    [1] файл
   *[other] файлы
} ещё раз.
preset-skipped = { $count ->
    [one] В «{ $name }» пропущено { $count } изменение: такого инструмента в этой версии больше нет.
    [few] В «{ $name }» пропущено { $count } изменения: таких инструментов в этой версии больше нет.
    [many] В «{ $name }» пропущено { $count } изменений: таких инструментов в этой версии больше нет.
   *[other] В «{ $name }» пропущено { $count } изменения: таких инструментов в этой версии больше нет.
}
import-failed = Не удалось импортировать { $file }: { $error }
import-at-cap = Не удалось импортировать { $file }: пресетов уже максимум ({ $cap })
import-done = Пресет «{ $name }» импортирован.
import-done-skipped = Пресет «{ $name }» импортирован, но пропущено { $count ->
    [one] { $count } изменение
    [few] { $count } изменения
    [many] { $count } изменений
   *[other] { $count } изменения
}.
edit-line = { $drum }: { $now } (по умолчанию { $byDefault })
edit-more = + ещё { $count }
app-intro = Конвертируйте MIDI для GetGood Drums, EZdrummer, Superior Drummer 3, Addictive Drums 2, General MIDI, Guitar Pro и ещё более чем 80 плагинов. Всё работает прямо в браузере — файлы никуда не загружаются.
app-loading = Загружаем конвертер…
convert-error = Ошибка: { $error }
notice-dismiss = Закрыть
channel-label = Канал ударных
channel-tip-title = Какие ноты конвертируются
channel-tip = В режиме «Авто» конвертируются все дорожки на канале 10 — это канал ударных в General MIDI, — а партии остальных инструментов не трогаются. Если ударные у вас на другом канале, выберите его или «Все каналы».
missing-label = Недостающие инструменты
missing-tip-title = Если в целевом плагине нет инструмента
missing-tip = «Заменить» ставит вместо него самый похожий инструмент: China — crash, Tom 4 — Tom 3. «Убрать» просто удаляет его ноты. Ghost notes, rimshot и другие приёмы на инструменте, который в плагине есть, всегда становятся обычным ударом.
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
} — посмотреть изменения (пресет «{ $name }»)
edited-review-unsaved = { $count ->
    [one] { $count } инструмент изменён
    [few] { $count } инструмента изменены
    [many] { $count } инструментов изменено
   *[other] { $count } инструмента изменено
} — посмотреть изменения, в пресет «{ $name }» не сохранены
edited-differ = { $count ->
    [one] { $count } инструмент отличается
    [few] { $count } инструмента отличаются
    [many] { $count } инструментов отличаются
   *[other] { $count } инструмента отличаются
} от стандартного маппинга
edited-click = Нажмите, чтобы посмотреть или сбросить.
edited-count = изменено: { $count }
edited-count-unsaved = изменено: { $count } · не сохранено
octave-label = Октавы начинаются с
octave-tip-title = Меняются только подписи
octave-tip = Задаёт, в какой октаве MIDI-нота 0, чтобы названия нот совпадали с вашей DAW. Сами ноты в файле не меняются.
canon-picker-label = Инструмент для ноты { $note }
canon-picker-heading = ИСТОЧНИК · { $note }
close = Закрыть
dropzone-heading = ПЕРЕТАЩИТЕ .MID
dropzone-presets = или экспортированный пресет (.json)
convert-running = конвертируем
convert-button = Конвертировать
engine-from = ИЗ
engine-to = В
engine-swap = Поменять местами
filter-clear = Очистить фильтр
note-picker-label = Целевая нота для { $drum }
note-picker-heading = ЦЕЛЬ · { $drum }
source-picker-label = Исходная нота для { $drum }
source-picker-heading = ВХОДЯЩИЕ · { $drum }
mid-badge = MID
plan-error = Не удалось загрузить редактор нот: { $error }
plan-error-reset = Сбросить изменения
crash-heading = Что-то пошло не так
crash-body = В конвертере произошла ошибка, и он не может работать дальше. Обычно помогает обновить страницу. Если ошибка повторяется, возможно, повреждён один из сохранённых пресетов.
crash-reload = Обновить
crash-reset = Сбросить сохранённые данные…
crash-reset-confirm = Удалить сохранённые пресеты, избранное и настройки?
crash-reset-do = Удалить и обновить
cancel = Отмена
saved-group = Сохранённые маппинги
saved-heading = ПРЕСЕТЫ
edit-back = ← Назад
edit-heading = Редактор нот
edit-advanced = Дополнительно — маппинг исходных нот
summary-remapped = { $total ->
    [one] Сконвертировано { $remapped } из { $total } инструмента
    [few] Сконвертировано { $remapped } из { $total } инструментов
    [many] Сконвертировано { $remapped } из { $total } инструментов
   *[other] Сконвертировано { $remapped } из { $total } инструмента
}
summary-edit-tip-title = Настройте любой инструмент
summary-edit-tip = Любому инструменту можно назначить другую ноту — выберите её в списке или на клавишах пианино. Изменения применятся при конвертации, и их можно сохранить как пресет.
summary-edit = Изменить отдельные ноты →
missing-detail-moved = Заменены другим инструментом
missing-detail-dropped = Убраны из файла
detail-edit = Изменить в редакторе нот →
summary-detail-heading = { $total ->
    [one] { $total } инструмент в этом маппинге
    [few] { $total } инструмента в этом маппинге
    [many] { $total } инструментов в этом маппинге
   *[other] { $total } инструмента в этом маппинге
}
summary-detail-moved = на новой ноте
summary-detail-same = уже на своей ноте
summary-detail-variant = на похожем варианте
summary-detail-swapped = заменены другим инструментом
summary-detail-dropped = убраны
summary-detail-unplayed = нет в исходном плагине
summary-reason-same = одна и та же нота в обоих плагинах
summary-reason-variant = в { $target } нет точного аналога — звучит вариант того же инструмента
summary-reason-swapped = в { $target } нет аналога — звучит самый похожий инструмент
summary-reason-dropped = в { $target } нет аналога
summary-reason-unplayed = нет ноты в { $source }
row-extras-dropped = { $count ->
    [one] Ещё { $count } исходная нота тоже запускает { $drum }: { $notes }. Целевой ноты для неё нет.
    [few] Ещё { $count } исходные ноты тоже запускают { $drum }: { $notes }. Целевой ноты для них нет.
    [many] Ещё { $count } исходных нот тоже запускают { $drum }: { $notes }. Целевой ноты для них нет.
   *[other] Ещё { $count } исходной ноты тоже запускают { $drum }: { $notes }. Целевой ноты для них нет.
}
row-extras = { $count ->
    [1] Ещё { $count } исходная нота тоже запускает { $drum }: { $notes }. Обе уходят на { $target }.
    [one] Ещё { $count } исходная нота тоже запускает { $drum }: { $notes }. Все уходят на { $target }.
    [few] Ещё { $count } исходные ноты тоже запускают { $drum }: { $notes }. Все уходят на { $target }.
    [many] Ещё { $count } исходных нот тоже запускают { $drum }: { $notes }. Все уходят на { $target }.
   *[other] Ещё { $count } исходной ноты тоже запускают { $drum }: { $notes }. Все уходят на { $target }.
}
row-reset = Сбросить { $drum }
edit-filter-label = Фильтр инструментов
edit-filter-placeholder = фильтр…
library-filter-placeholder = фильтр…
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
row-no-source = нет исходной ноты
row-dropped = убрано
rows-drum = ИНСТРУМЕНТ
rows-source = ИСТОЧНИК
rows-target = ЦЕЛЬ
rows-plays = ЗВУЧИТ
rows-none = Ничего не найдено
rows-reassigned = { $note } — раньше { $from }, теперь { $drum }
preset-tip-title = Сохраните маппинг на потом
preset-tip = Пара ИЗ→В и все изменения нот сохранятся кнопкой на главном экране — одно нажатие, и всё снова загружено. Хранится только в этом браузере.
preset-update-open = Обновить пресет
preset-save-open = Сохранить как пресет
preset-name = Название пресета
preset-update = Обновить
preset-save-new = Сохранить как новый
preset-save = Сохранить
preset-exists = Пресет для { $pair } уже есть.
preset-at-cap = Больше пресетов не поместится: максимум { $cap }.
source-unassigned = — не назначено
source-unmapped = нет в маппинге
source-clear = Убрать исходную ноту { $note }
source-add-label = Добавить исходную ноту
source-add-placeholder = номер ноты 0–127
source-add = добавить
source-add-invalid = Введите номер ноты от 0 до 127
library-group = Плагин: { $side }
library-filter = Фильтр плагинов: { $side }
library-hint = Начните вводить название. Стрелки — перемещение, Enter — выбрать, Ctrl+Enter — добавить в избранное или убрать из него.
library-list = Плагины: { $side }
library-favourites = Избранное
library-all = Все плагины
library-none = ничего не найдено
files-skipped = Пропущено: { $names }. Подходят только файлы .mid и экспортированные пресеты (.json)
files-drop = Перетащите один или несколько файлов .mid в любое место
files-choose = Выбрать файлы
files-presets = Экспортированные пресеты (.json) добавляются так же.
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
chip-at-cap = пресетов уже максимум
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
tip-link = Угостить кофе
tip-ask = Я делаю Drumverter один, в свободное время. Если он избавил вас от возни с нотами вручную, чашка кофе поможет ему и дальше оставаться бесплатным и без рекламы.
tip-amounts = Поддержать автора
tip-other = Другая сумма
thanks-title = Спасибо | Drumverter
thanks-description = Спасибо за поддержку Drumverter — бесплатного конвертера MIDI плагинов для барабанов.
thanks-heading = Спасибо!
thanks-body = Ваш кофе помогает Drumverter оставаться бесплатным и без рекламы. Чек придёт на почту от Stripe.
done-view-report = Посмотреть отчёт →
done-convert-more = Конвертировать ещё
done-report-mapping = Неправильная нота? Сообщить
drop-missing = Убрать недостающие инструменты и конвертировать заново
report-dropped = Убрано
report-approximated = Заменено
report-unrecognized = Не распознано
report-dropped-hint = в плагине { $target } нет такого инструмента
report-approximated-hint = заменены самым похожим инструментом
report-unrecognized-hint = нет в маппинге { $source } — убраны из файла
report-pick-target = Выбрать ноту →
report-assign = Назначить →
report-across = { $summary } в { $count ->
    [one] { $count } файле
    [few] { $count } файлах
    [many] { $count } файлах
   *[other] { $count } файлах
}
report-contact = Неправильная нота или в списке нет нужного плагина? Создайте { $issue } или напишите на { $email }.
report-contact-issue = issue на GitHub
report-unchanged = Без изменений
report-unchanged-hint = другие дорожки / каналы
report-unchanged-entry = Ноты на других дорожках и каналах остались как были
report-channel = Канал ударных →
report-nothing = Ничего не конвертировано
report-nothing-channel = — на выбранном канале нет нот ударных. Выберите другой канал или «Все каналы».
report-nothing-notes = — в файле не нашлось нот ударных.
report-clean = Конвертация без потерь
report-clean-detail = — все инструменты нашлись в { $target } один в один.
report-heading = Отчёт о конвертации
converter-title = Drumverter — бесплатный конвертер MIDI плагинов для барабанов
converter-description = Бесплатный конвертер MIDI плагинов для барабанов: переносите MIDI-партии между GetGood Drums, EZdrummer, Superior Drummer, Addictive Drums, General MIDI и Guitar Pro прямо в браузере.
converter-og-description = Конвертируйте MIDI ударных между GetGood Drums, EZdrummer, Superior Drummer, Addictive Drums и ещё более чем 80 плагинами. Бесплатно, в браузере.
converter-image-alt = Drumverter — конвертация и маппинг MIDI ударных
converter-twitter-description = Бесплатный конвертер MIDI плагинов для барабанов в браузере: переносит MIDI ударных с маппинга нот одного плагина на маппинг другого.
converter-app-description = Бесплатный сервис в браузере: переносит MIDI ударных с маппинга нот одного плагина на маппинг другого.
converter-noscript = Drumverter — бесплатный конвертер MIDI плагинов для барабанов. Он переносит MIDI-партию ударных с маппинга нот одного плагина на маппинг другого — например, из GetGood Drums в EZdrummer, Superior Drummer, Addictive Drums, General MIDI или Guitar Pro. Для каждого инструмента есть запасные варианты, так что ноты не теряются. Всё работает прямо в браузере; чтобы пользоваться конвертером, включите JavaScript.
load-failed = Не удалось загрузить Drumverter. Проверьте интернет и обновите страницу.
load-failed-reload = Обновить
maps-breadcrumb = Навигационная цепочка
maps-index-title = { $count ->
    [one] Маппинги нот MIDI ударных для { $count } плагина | Drumverter
    [few] Маппинги нот MIDI ударных для { $count } плагинов | Drumverter
    [many] Маппинги нот MIDI ударных для { $count } плагинов | Drumverter
   *[other] Маппинги нот MIDI ударных для { $count } плагина | Drumverter
}
maps-index-description = { $count ->
    [one] Маппинги нот MIDI ударных для { $count } плагина и таблицы конвертации между GetGood Drums, EZdrummer, Superior Drummer, Addictive Drums и другими.
    [few] Маппинги нот MIDI ударных для { $count } плагинов и таблицы конвертации между GetGood Drums, EZdrummer, Superior Drummer, Addictive Drums и другими.
    [many] Маппинги нот MIDI ударных для { $count } плагинов и таблицы конвертации между GetGood Drums, EZdrummer, Superior Drummer, Addictive Drums и другими.
   *[other] Маппинги нот MIDI ударных для { $count } плагина и таблицы конвертации между GetGood Drums, EZdrummer, Superior Drummer, Addictive Drums и другими.
}
maps-index-heading = Маппинги нот MIDI ударных
maps-index-intro = { $count ->
    [one] Маппинги нот для { $count } плагина ударных и таблицы конвертации между самыми популярными — на этих же данных работает конвертер Drumverter.
    [few] Маппинги нот для { $count } плагинов ударных и таблицы конвертации между самыми популярными — на этих же данных работает конвертер Drumverter.
    [many] Маппинги нот для { $count } плагинов ударных и таблицы конвертации между самыми популярными — на этих же данных работает конвертер Drumverter.
   *[other] Маппинги нот для { $count } плагина ударных и таблицы конвертации между самыми популярными — на этих же данных работает конвертер Drumverter.
}
maps-popular = Популярные конвертации
maps-more-engines = Другие плагины
maps-matrix-corner = ИЗ ↓ В →
maps-pair-link = Из { $source } в { $target }
maps-matrix-hint = Стрелка открывает таблицу конвертации: из плагина в строке в плагин в столбце.
maps-all-engines = Все плагины ({ $count })
maps-filter-engines-label = Фильтр плагинов
maps-filter-engines-placeholder = Фильтр…
maps-no-engines = Ничего не найдено
maps-engine-title = { $engineMidi }: маппинг нот ударных | Drumverter
maps-engine-title-long-name = Маппинг нот MIDI: { $engine } | Drumverter
maps-engine-description = { $total ->
    [one] { $engine }: маппинг нот MIDI ударных — всего { $total } нота с названиями инструментов, в нотации C-1 и C-2.
    [few] { $engine }: маппинг нот MIDI ударных — всего { $total } ноты с названиями инструментов, в нотации C-1 и C-2.
    [many] { $engine }: маппинг нот MIDI ударных — всего { $total } нот с названиями инструментов, в нотации C-1 и C-2.
   *[other] { $engine }: маппинг нот MIDI ударных — всего { $total } ноты с названиями инструментов, в нотации C-1 и C-2.
}
maps-engine-description-short = { $engine }: маппинг нот MIDI ударных с названиями нот в нотации C-1 и C-2.
maps-engine-description-more = Конвертируйте { $engineMidi } в любой другой плагин — бесплатно.
maps-engine-heading = MIDI-маппинг ударных { $engine }
maps-engine-intro = { $total ->
    [one] Все MIDI-ноты, на которые реагирует плагин { $engine } (всего { $total } нота), по инструментам. Названия нот можно показать в нумерации C-1 (Reaper, Logic, Ableton, Guitar Pro) или C-2 (Studio One, Cubase, FL Studio).
    [few] Все MIDI-ноты, на которые реагирует плагин { $engine } (всего { $total } ноты), по инструментам. Названия нот можно показать в нумерации C-1 (Reaper, Logic, Ableton, Guitar Pro) или C-2 (Studio One, Cubase, FL Studio).
    [many] Все MIDI-ноты, на которые реагирует плагин { $engine } (всего { $total } нот), по инструментам. Названия нот можно показать в нумерации C-1 (Reaper, Logic, Ableton, Guitar Pro) или C-2 (Studio One, Cubase, FL Studio).
   *[other] Все MIDI-ноты, на которые реагирует плагин { $engine } (всего { $total } ноты), по инструментам. Названия нот можно показать в нумерации C-1 (Reaper, Logic, Ableton, Guitar Pro) или C-2 (Studio One, Cubase, FL Studio).
}
maps-convert-to = Конвертировать в { $engine }
maps-convert-from = Конвертировать из { $engine }
maps-filter-drums-label = Фильтр инструментов
maps-filter-drums-placeholder = Фильтр: инструмент или нота…
maps-octave-naming = Нумерация октав
maps-column-note = Нота
maps-column-drum = Инструмент
maps-conversion-tables = Таблицы конвертации
maps-pair-heading = Конвертация { $sourceMidi } в { $target }
maps-pair-title = Конвертация { $sourceMidi } в { $target } | Drumverter
maps-pair-description = Конвертация MIDI ударных из { $source } в { $target }: точно — { $exact }, заменено — { $approximated }, убрано — { $dropped }.
maps-pair-description-more = Бесплатный конвертер прямо в браузере.
maps-pair-summary = Из { $total } { $total ->
    [one] ноты
    [few] нот
    [many] нот
   *[other] ноты
} плагина { $source }: { $exact } — точно в { $target }, { $approximated } — заменены самым похожим инструментом, { $dropped } — без аналога.
maps-pair-convert = Конвертировать { $source } → { $target }
maps-reverse = ⇄ В обратную сторону
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
maps-full-maps = Полные маппинги нот:
