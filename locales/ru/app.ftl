brand-tagline = конвертер MIDI плагинов для барабанов
nav-converter = Конвертер
nav-note-maps = Маппинги
nav-drum-maps = Драм-карты
section-guide-label = Как пользоваться
section-guide-heading = Как конвертировать MIDI ударных
section-faq-label = FAQ
section-faq-heading = Частые вопросы
section-issue-label = Сообщить о проблеме
section-issue-heading = Сообщить о проблеме
section-contact-label = Контакты
section-contact-heading = Контакты
section-terms-label = Условия
section-terms-heading = Условия использования
skip-to-content = Перейти к содержимому
nav-main = Главное меню
nav-site = Сайт
lang-menu-label = Язык
lang-load-failed = Не удалось загрузить язык: { $language }. Проверьте интернет и попробуйте ещё раз.
error-unknown-engine = Неизвестный { $role ->
    [source] исходный
   *[target] целевой
} плагин «{ $id }»
error-bad-midi = Конвертер не может прочитать этот файл — похоже, это не MIDI
error-bad-preset = Это не файл пресета
error-bad-overrides = Не удалось прочитать изменения нот
error-bad-missing = Неизвестная настройка для недостающих инструментов
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
presets-unsaved = Не удалось сохранить пресеты: хранилище браузера переполнено или заблокировано. После перезагрузки они пропадут.
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
unrecognized-label = Нераспознанные ноты
unrecognized-tip-title = Если исходный плагин не знает ноту
unrecognized-tip = В файле могут быть ноты, которых нет в маппинге исходного плагина, — например, партия, написанная для другой установки. «Убрать» удаляет их из файла. «Оставить как есть» записывает их без изменений, на той же ноте. В отчёте они видны в обоих случаях.
unrecognized-remove = Убрать
unrecognized-keep = Оставить как есть
unrecognized-hint-remove = убираются из файла
unrecognized-hint-keep = остаются без изменений
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
engine-choose = Выберите барабанный плагин…
engine-picker-heading = Выберите плагин: { $side }
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
row-chain-hint = В { $target } нет { $drum }, поэтому звучит { $standIn }. Правка отправляет { $standIn } на { $landed }. Нажмите, чтобы перейти к { $standIn }.
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
files-sample = Попробовать на примере грува
files-sample-needs-from = Сначала выберите, из какого плагина конвертировать
files-remove = Убрать { $name }
files-add-more = + добавить ещё
files-clear = очистить
step-file = Ваш файл с барабанами
step-engines = Из одной раскладки барабанов в другую
step-convert = Конвертировать
step-done = готово
files-sample-lead = Нет файла под рукой?
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
done-view-report = Посмотреть отчёт →
done-convert-more = Конвертировать ещё
done-report-mapping = Неправильная нота? Сообщить
done-removed = { $count ->
    [one] { $count } нота из вашего файла отсутствует в маппинге { $source }, поэтому она удалена. Не тот источник?
    [few] { $count } ноты из вашего файла отсутствуют в маппинге { $source }, поэтому они удалены. Не тот источник?
    [many] { $count } нот из вашего файла отсутствуют в маппинге { $source }, поэтому они удалены. Не тот источник?
   *[other] { $count } ноты из вашего файла отсутствуют в маппинге { $source }, поэтому они удалены. Не тот источник?
}
done-kept = { $count ->
    [one] { $count } нота из вашего файла отсутствует в маппинге { $source }, поэтому она оставлена без изменений. Не тот источник?
    [few] { $count } ноты из вашего файла отсутствуют в маппинге { $source }, поэтому они оставлены без изменений. Не тот источник?
    [many] { $count } нот из вашего файла отсутствуют в маппинге { $source }, поэтому они оставлены без изменений. Не тот источник?
   *[other] { $count } ноты из вашего файла отсутствуют в маппинге { $source }, поэтому они оставлены без изменений. Не тот источник?
}
done-pick-source = Выбрать другой источник
done-assign-notes = Назначить ноты
source-fit-missing = Нет в маппинге { $source }: { $missing } из { $hits } нот вашего файла. Подходят лучше: { $engines }
source-fit-all = { $engine } (все ноты)
source-fit-some = { $engine } ({ $count ->
    [one] { $count } нота
    [few] { $count } ноты
    [many] { $count } нот
   *[other] { $count } ноты
})
drop-missing = Убрать недостающие инструменты и конвертировать заново
report-dropped = Убрано
report-approximated = Заменено
report-unrecognized = Не распознано
report-dropped-hint = в плагине { $target } нет такого инструмента
report-approximated-hint = заменены самым похожим инструментом
report-unrecognized-hint = нет в маппинге { $source } — убраны из файла
report-unrecognized-hint-kept = нет в маппинге { $source } — оставлены без изменений
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
maps-popular = Популярные конвертации
maps-pair-link = Из { $source } в { $target }
