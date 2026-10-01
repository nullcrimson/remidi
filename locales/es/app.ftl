brand-tagline = conversor de MIDI de batería
nav-converter = Conversor
nav-note-maps = Mapas de notas
section-guide-label = Cómo usarlo
section-guide-heading = Cómo convertir MIDI de batería
section-guide-title = Cómo convertir MIDI de batería entre plugins | Drumverter
section-guide-description = Convierte MIDI de batería entre GetGood Drums, EZdrummer, Superior Drummer, Addictive Drums y más de 80 plugins en tres pasos, gratis y en tu navegador.
section-faq-label = FAQ
section-faq-heading = Preguntas frecuentes
section-faq-title = Preguntas frecuentes sobre el conversor de MIDI de batería | Drumverter
section-faq-description = Respuestas sobre Drumverter: precio, privacidad, convenciones de octava (C-1 o C-2), conversión de varios archivos a la vez y qué pasa con las piezas que no tienen equivalente.
section-issue-label = Reportar un problema
section-issue-heading = Reportar un problema
section-issue-title = Reportar un problema | Drumverter
section-issue-description = ¿Un mapeo incorrecto o falta un plugin en Drumverter? Repórtalo en GitHub o por correo.
section-contact-label = Contacto
section-contact-heading = Contacto
section-contact-title = Contacto | Drumverter
section-contact-description = Preguntas, comentarios o solicitudes de plugins para Drumverter, el conversor gratuito de MIDI de batería en el navegador.
section-terms-label = Términos
section-terms-heading = Términos de uso
section-terms-title = Términos de uso | Drumverter
section-terms-description = Términos de uso de Drumverter, el conversor gratuito de MIDI de batería en el navegador: se ofrece tal cual, los archivos nunca se suben y las estadísticas son anónimas y sin cookies.
skip-to-content = Saltar al contenido
nav-main = Principal
nav-site = Sitio
lang-menu-label = Idioma
lang-load-failed = No se pudo cargar el idioma { $language }. Revisa tu conexión a internet y vuelve a intentarlo.
lang-offer = Esta página está disponible en español →
open-converter = Abrir el conversor →
error-unknown-engine = Plugin de { $role ->
    [source] origen
   *[target] destino
} desconocido: “{ $id }”
error-bad-midi = El conversor no puede leer este archivo: no parece un MIDI
error-bad-preset = No es un archivo de preset
error-bad-overrides = No se pudieron leer los cambios de notas
error-bad-missing = Opción desconocida para las piezas que faltan
error-bad-channel = Opción de canal desconocida
error-internal = Algo salió mal
error-wasm-unavailable = No se pudo cargar el conversor
error-detail = Detalles: { $detail }
blocker-files-and-engines = Agrega un archivo .mid y elige los dos plugins
blocker-files = Primero agrega un archivo .mid
blocker-engines = Elige el ORIGEN y el DESTINO
channel-auto = Auto
channel-all = Todos los canales
channel-number = { $channel }
channel-hint-auto = pistas con golpes en el canal 10 · las demás sin cambios
channel-hint-all = se convierten todos los canales
channel-hint-one = solo se convierte el canal { $channel }
missing-nearest = Reemplazar
missing-drop = Quitar
missing-hint-nearest = se reemplazan por la pieza más parecida
missing-hint-drop = se quitan del archivo
missing-hint-moved = { $count ->
    [0] no se reemplaza ninguna pieza
    [one] se reemplaza { $count } pieza
   *[other] se reemplazan { $count } piezas
}
missing-hint-dropped = { $count ->
    [0] no se quita ninguna pieza
    [one] se quita { $count } pieza
   *[other] se quitan { $count } piezas
}
files-unreadable = { $count ->
    [one] No se pudo leer { $names } — vuelve a elegirlo.
   *[other] No se pudieron leer { $names } — vuelve a elegirlos.
}
preset-skipped = { $count ->
    [one] { $count } cambio en “{ $name }” usa una pieza que esta versión no reconoce; se omitió.
   *[other] { $count } cambios en “{ $name }” usan piezas que esta versión no reconoce; se omitieron.
}
import-failed = No se pudo importar { $file }: { $error }
import-at-cap = No se pudo importar { $file }: ya no caben más presets (máximo { $cap })
import-done = Preset “{ $name }” importado.
import-done-skipped = Preset “{ $name }” importado ({ $count ->
    [one] se omitió { $count } cambio
   *[other] se omitieron { $count } cambios
}).
edit-line = { $drum }: { $now } (predeterminado: { $byDefault })
edit-more = +{ $count } más
app-intro = Pasa MIDI de batería entre GetGood Drums, EZdrummer, Superior Drummer 3, Addictive Drums 2, General MIDI, Guitar Pro y más de 80 plugins. Todo pasa en tu navegador: tus archivos no se suben a ningún servidor.
app-loading = Cargando el conversor…
convert-error = Error: { $error }
notice-dismiss = Descartar
channel-label = Canal de batería
channel-tip-title = Qué notas se convierten
channel-tip = Auto convierte todas las pistas que usan el canal 10 —el canal de batería de General MIDI— y no toca los demás instrumentos. Si tu batería está en otro canal, elige ese canal o Todos los canales.
missing-label = Piezas que faltan
missing-tip-title = Si al plugin de destino le falta una pieza
missing-tip = Reemplazar la cambia por la pieza más parecida que tenga el plugin de destino: un China pasa a un crash, el Tom 4 al Tom 3. Quitar la saca del archivo. Las ghost notes, los rimshots y otras formas de tocar una pieza que el destino sí tiene siempre pasan a un golpe normal en esa pieza.
edited-review = { $count ->
    [one] { $count } pieza editada
   *[other] { $count } piezas editadas
} — revisa los cambios
edited-review-saved = { $count ->
    [one] { $count } pieza editada del preset { $name }
   *[other] { $count } piezas editadas del preset { $name }
} — revisa los cambios
edited-review-unsaved = { $count ->
    [one] { $count } pieza editada sin guardar en { $name }
   *[other] { $count } piezas editadas sin guardar en { $name }
} — revisa los cambios
edited-differ = { $count ->
    [one] { $count } pieza es distinta
   *[other] { $count } piezas son distintas
} del mapeo predeterminado
edited-click = Haz clic para revisar o restablecer.
edited-count = { $count ->
    [one] { $count } editada
   *[other] { $count } editadas
}
edited-count-unsaved = { $count ->
    [one] { $count } editada
   *[other] { $count } editadas
} · sin guardar
octave-label = Las octavas empiezan en
octave-tip-title = Solo cambia los nombres
octave-tip = Define en qué octava está la nota MIDI 0, para que los nombres de las notas coincidan con los de tu DAW. Solo cambia cómo se muestran: las notas del archivo no cambian.
canon-picker-label = Pieza para { $note }
canon-picker-heading = ORIGEN · { $note }
close = Cerrar
dropzone-heading = SUELTA .MID
dropzone-presets = o un preset exportado (.json)
convert-running = convirtiendo
convert-button = Convertir
engine-from = ORIGEN
engine-to = DESTINO
engine-swap = Intercambiar origen y destino
filter-clear = Borrar filtro
note-picker-label = Nota de destino para { $drum }
note-picker-heading = DESTINO · { $drum }
source-picker-label = Nota de origen para { $drum }
source-picker-heading = ENTRADA · { $drum }
mid-badge = MID
plan-error = No se pudo cargar el editor de notas: { $error }
plan-error-reset = Restablecer cambios
crash-heading = Algo salió mal
crash-body = El conversor tuvo un error y no pudo seguir. Casi siempre se arregla recargando la página; si vuelve a pasar, puede que un preset guardado esté dañado.
crash-reload = Recargar
crash-reset = Borrar datos guardados…
crash-reset-confirm = ¿Eliminar los presets guardados, los favoritos y la configuración?
crash-reset-do = Eliminar y recargar
cancel = Cancelar
saved-group = Mapeos guardados
saved-heading = GUARDADOS
edit-back = ← Atrás
edit-heading = Editar notas
edit-advanced = Avanzado — reasignar notas de origen
summary-remapped = Piezas reasignadas: { $remapped } de { $total }
summary-edit-tip-title = Ajusta cada pieza
summary-edit-tip = Asigna cualquier pieza a otra nota de destino: elígela en la lista de piezas o en el piano. Tus cambios se aplican a la conversión y puedes guardarlos como preset.
summary-edit = Editar notas una por una →
missing-detail-moved = Reemplazadas por otra pieza
missing-detail-dropped = Quitadas del archivo
detail-edit = Cambiar en el editor de notas →
summary-detail-heading = { $total ->
    [one] { $total } pieza en este mapa
   *[other] { $total } piezas en este mapa
}
summary-detail-moved = en una nota nueva
summary-detail-same = ya en la nota correcta
summary-detail-variant = en una variante parecida
summary-detail-swapped = reemplazadas por otra pieza
summary-detail-dropped = quitadas
summary-detail-unplayed = no están en el plugin de origen
summary-reason-same = misma nota en ambos plugins
summary-reason-variant = sin equivalente exacto en { $target }: suena una variante de la misma pieza
summary-reason-swapped = sin equivalente en { $target }: suena la pieza más parecida
summary-reason-dropped = sin equivalente en { $target }
summary-reason-unplayed = sin nota en { $source }
row-extras-dropped = { $count ->
    [one] Hay { $count } nota de origen más que hace sonar { $drum }: { $notes }. Ninguna tiene destino.
   *[other] Hay { $count } notas de origen más que hacen sonar { $drum }: { $notes }. Ninguna tiene destino.
}
row-extras = { $count ->
    [one] Hay { $count } nota de origen más que hace sonar { $drum }: { $notes }. Las dos van a { $target }.
   *[other] Hay { $count } notas de origen más que hacen sonar { $drum }: { $notes }. Todas van a { $target }.
}
row-reset = Restablecer { $drum }
edit-filter-label = Filtrar piezas
edit-filter-placeholder = filtrar piezas…
library-filter-placeholder = filtrar…
edit-show = Mostrar
edit-show-all = Todas { $count }
edit-show-changed = Cambiadas { $count }
edit-show-issues = Problemas { $count }
edit-actions = Acciones de edición
edit-changes = { $count ->
    [0] Sin cambios
    [one] { $count } cambio
   *[other] { $count } cambios
}
edit-reset-all = Restablecer todo
edit-done = Listo
row-no-source = sin origen
row-dropped = quitada
rows-drum = PIEZA
rows-source = ORIGEN
rows-target = DESTINO
rows-plays = SUENA
rows-none = Ninguna pieza coincide
rows-reassigned = { $note } era { $from } — ahora hace sonar { $drum }
preset-tip-title = Reutiliza este mapeo
preset-tip = Guarda el par ORIGEN→DESTINO y los cambios de notas como un botón en la pantalla principal: con un clic lo vuelves a cargar. Solo se guarda en este navegador.
preset-update-open = Actualizar preset
preset-save-open = Guardar como preset
preset-name = Nombre del preset
preset-update = Actualizar
preset-save-new = Guardar nuevo
preset-save = Guardar
preset-exists = Ya existe un preset para { $pair }.
preset-at-cap = Ya no caben más presets: el máximo es { $cap }.
source-unassigned = — sin asignar
source-unmapped = sin mapear
source-clear = Quitar la nota de origen { $note }
source-add-label = Agregar nota de origen
source-add-placeholder = agregar nota 0–127
source-add = agregar
source-add-invalid = Escribe un número de nota del 0 al 127
library-group = Plugin de { $side }
library-filter = Filtrar plugins de { $side }
library-hint = Escribe para filtrar. Las flechas mueven la selección, Enter elige y Ctrl+Enter agrega o quita un favorito.
library-list = Plugins de { $side }
library-favourites = Favoritos
library-all = Todos los plugins
library-none = sin resultados
files-skipped = Omitidos: { $names } — solo se pueden agregar archivos .mid y presets exportados (.json)
files-drop = Suelta uno o varios .mid en cualquier lugar
files-choose = Elegir archivos
files-presets = Los archivos de preset que exportaste (.json) se pueden soltar o elegir de la misma forma.
files-remove = Quitar { $name }
files-add-more = + agregar más
files-clear = quitar todo
chip-rename = Cambiar nombre
chip-duplicate = Duplicar
chip-export = Exportar
chip-delete = Eliminar
chip-rename-label = Cambiar el nombre de { $name }
chip-rename-save = Guardar nombre
chip-rename-cancel = Cancelar cambio de nombre
chip-overrides = { $count ->
    [one] { $count } cambio
   *[other] { $count } cambios
}
chip-unavailable = plugin no disponible
chip-edit = Editar notas de { $name }
chip-more = Más acciones para { $name }
chip-at-cap = no caben más presets
done-tag-converted = { $count ->
    [one] { $count } nota convertida
   *[other] { $count } notas convertidas
}
done-tag-nothing = no se convirtió nada
done-tag-approximated = { $count ->
    [one] { $count } reemplazada
   *[other] { $count } reemplazadas
}
done-tag-dropped = { $count ->
    [one] { $count } quitada
   *[other] { $count } quitadas
}
done-tag-unrecognized = { $count ->
    [one] { $count } no reconocida
   *[other] { $count } no reconocidas
}
done-tag-untouched = { $count } sin cambios en otros canales
done-tag-failed = { $count } con error
done-file-approximated = { $count } reempl.
done-file-dropped = { $count ->
    [one] { $count } quitada
   *[other] { $count } quitadas
}
done-file-unrecognized = { $count } no rec.
done-file-clean = sin pérdidas
done-heading = { $count ->
    [one] { $count } archivo convertido
   *[other] { $count } archivos convertidos
} → { $target }
done-edited = { $count ->
    [one] { $count } pieza editada
   *[other] { $count } piezas editadas
}
done-download-one = ↓ Descargar .mid
done-download-zip = ↓ Descargar { $count } archivos (.zip)
done-files = Archivos convertidos
done-file-download = ↓ .mid
tip-link = Invítame a un café
tip-ask = Hago Drumverter yo solo, en mi tiempo libre. Si te ahorró reasignar notas a mano, un café me ayuda a mantenerlo gratis y sin anuncios.
tip-amounts = Apoya el proyecto
tip-other = Otra cantidad
thanks-title = Gracias | Drumverter
thanks-description = Gracias por apoyar Drumverter, el conversor gratuito de MIDI de batería.
thanks-heading = ¡Gracias!
thanks-body = Tu café ayuda a que Drumverter siga siendo gratis y sin anuncios. Stripe te enviará el recibo por correo.
done-view-report = Ver informe →
done-convert-more = Nueva conversión
done-report-mapping = ¿Mapeo incorrecto? Avísame
drop-missing = Quitar las piezas que faltan y convertir de nuevo
report-dropped = Quitadas
report-approximated = Reemplazadas
report-unrecognized = No reconocidas
report-dropped-hint = { $target } no tiene esta pieza
report-approximated-hint = se reemplazaron por la pieza más parecida
report-unrecognized-hint = no están en el mapa de { $source } — se quitaron del archivo
report-pick-target = Elegir destino →
report-assign = Asignar →
report-across = { $summary } en { $count ->
    [one] { $count } archivo
   *[other] { $count } archivos
}
report-contact = ¿Un mapeo incorrecto o falta un plugin? Abre un { $issue } o escribe a { $email }.
report-contact-issue = issue en GitHub
report-unchanged = Sin cambios
report-unchanged-hint = otras pistas / canales
report-unchanged-entry = Notas de otras pistas o canales: quedan como estaban
report-channel = Canal de batería →
report-nothing = No se convirtió nada
report-nothing-channel = — no hay notas en el canal de batería elegido. Elige otro canal de batería o Todos los canales.
report-nothing-notes = — no se encontraron notas de batería en este archivo.
report-clean = Conversión sin pérdidas
report-clean-detail = — todas las piezas se asignaron directamente a { $target }.
report-heading = Informe de conversión
converter-title = Drumverter — conversor gratuito de MIDI de batería entre plugins
converter-description = Conversor gratuito de MIDI de batería: reasigna MIDI de batería entre GetGood Drums, EZdrummer, Superior Drummer, Addictive Drums, General MIDI y Guitar Pro en el navegador.
converter-og-description = Convierte MIDI de batería entre GetGood Drums, EZdrummer, Superior Drummer, Addictive Drums y más de 80 plugins. Gratis y en el navegador.
converter-image-alt = Drumverter — conversor de MIDI de batería entre plugins
converter-twitter-description = Reasigna MIDI de batería entre los mapas de notas de distintos plugins, gratis y en el navegador.
converter-app-description = Herramienta gratuita en el navegador que reasigna MIDI de batería entre los mapas de notas de distintos plugins.
converter-noscript = Drumverter es un conversor gratuito de MIDI de batería. Reasigna un archivo MIDI de batería escrito para el mapa de notas de un plugin al de otro —por ejemplo, de GetGood Drums a EZdrummer, Superior Drummer, Addictive Drums, General MIDI o Guitar Pro— y, si al destino le falta una pieza, usa la más parecida que tenga. Todo pasa en tu navegador; activa JavaScript para usar el conversor.
load-failed = No se pudo cargar Drumverter. Revisa tu conexión a internet y recarga la página.
load-failed-reload = Recargar
maps-breadcrumb = Ruta de navegación
maps-index-title = Mapas de notas MIDI de batería de { $count } plugins | Drumverter
maps-index-description = Mapas de notas MIDI de batería de { $count } plugins, además de tablas de conversión entre GetGood Drums, EZdrummer, Superior Drummer, Addictive Drums y otros.
maps-index-heading = Mapas de notas MIDI de batería
maps-index-intro = Mapas de notas de { $count } plugins de batería y tablas de conversión entre los más populares: los mismos datos de mapeo que usa el conversor de Drumverter.
maps-popular = Conversiones populares
maps-more-engines = Más plugins
maps-matrix-corner = ORIGEN ↓ DESTINO →
maps-pair-link = { $source } a { $target }
maps-matrix-hint = Cada flecha abre la tabla de conversión del plugin de la fila al de la columna.
maps-all-engines = Los { $count } plugins
maps-filter-engines-label = Filtrar plugins
maps-filter-engines-placeholder = Filtrar plugins…
maps-no-engines = Ningún plugin coincide
maps-engine-title = Mapa de notas y mapeo de batería de { $engineMidi } | Drumverter
maps-engine-title-long-name = Mapa de notas MIDI: { $engine } | Drumverter
maps-engine-description = Mapa de notas MIDI de batería de { $engine }: las { $total } notas con el nombre de cada pieza, en las convenciones de octava C-1 y C-2.
maps-engine-description-short = Mapa de notas MIDI de batería de { $engine } con los nombres de las notas en C-1 y C-2.
maps-engine-description-more = Convierte { $engineMidi } a cualquier plugin, gratis.
maps-engine-heading = Mapa de notas MIDI de batería de { $engine }
maps-engine-intro = Todas las notas MIDI a las que responde { $engine } ({ $total } en total), agrupadas por pieza. Los nombres de las notas siguen cualquiera de las dos convenciones de octava: C-1 (Reaper, Logic, Ableton, Guitar Pro) o C-2 (Studio One, Cubase, FL Studio).
maps-convert-to = Convertir a { $engine }
maps-convert-from = Convertir desde { $engine }
maps-filter-drums-label = Filtrar piezas
maps-filter-drums-placeholder = Filtrar por pieza o nota…
maps-octave-naming = Nombres de octava
maps-column-note = Nota
maps-column-drum = Pieza
maps-conversion-tables = Tablas de conversión
maps-pair-heading = Convertir { $sourceMidi } a { $target }
maps-pair-title = Convertir { $sourceMidi } a { $target } | Drumverter
maps-pair-description = Convierte MIDI de batería de { $source } a { $target }. Notas exactas: { $exact }, reemplazadas: { $approximated }, quitadas: { $dropped }.
maps-pair-description-more = Conversor gratuito en el navegador.
maps-pair-summary = De las { $total } notas de { $source }, { $exact } { $exact ->
    [one] coincide
   *[other] coinciden
} exactamente con { $target }, { $approximated } { $approximated ->
    [one] se reemplaza
   *[other] se reemplazan
} por la pieza disponible más parecida y { $dropped } { $dropped ->
    [one] no tiene
   *[other] no tienen
} equivalente.
maps-pair-convert = Convertir { $source } → { $target }
maps-reverse = ⇄ Invertir dirección
maps-exact-count = { $count ->
    [one] { $count } exacta
   *[other] { $count } exactas
}
maps-approximated-count = { $count ->
    [one] { $count } reemplazada
   *[other] { $count } reemplazadas
}
maps-dropped-count = { $count ->
    [one] { $count } quitada
   *[other] { $count } quitadas
}
maps-rows = Filas
maps-rows-changes = Cambios { $count }
maps-column-engine-note = Nota de { $engine }
maps-column-engine-drum = Pieza de { $engine }
maps-column-to = a
maps-column-result = Resultado
maps-no-equivalent = sin equivalente
maps-status-exact = exacta
maps-status-approximated = reemplazada
maps-status-dropped = quitada
maps-more-from = Más conversiones desde { $engine }
maps-full-maps = Mapas de notas completos:
