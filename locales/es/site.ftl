section-guide-title = Cómo convertir MIDI de batería entre plugins
section-guide-description = Convierte MIDI de batería entre GetGood Drums, EZdrummer, Superior Drummer, Addictive Drums y más de 80 plugins en tres pasos, gratis y en tu navegador.
section-faq-title = Preguntas frecuentes sobre el conversor de MIDI de batería
section-faq-description = Respuestas sobre Drumverter: precio, privacidad, convenciones de octava (C-1 o C-2), conversión de varios archivos a la vez y qué pasa con las piezas que no tienen equivalente.
section-issue-title = Reportar un problema
section-issue-description = ¿Un mapeo incorrecto o falta un plugin en Drumverter? Repórtalo en GitHub o por correo.
section-contact-title = Contacto
section-contact-description = Preguntas, comentarios o solicitudes de plugins para Drumverter, el conversor gratuito de MIDI de batería en el navegador.
section-terms-title = Términos de uso
section-terms-description = Términos de uso de Drumverter, el conversor gratuito de MIDI de batería en el navegador: se ofrece tal cual, los archivos nunca se suben y las estadísticas son anónimas y sin cookies.
lang-offer = Esta página está disponible en español →
open-converter = Abrir el conversor
doc-ready-heading = ¿Listo para convertir?
thanks-title = Gracias
thanks-description = Gracias por apoyar Drumverter, el conversor gratuito de MIDI de batería.
thanks-heading = ¡Gracias!
thanks-body = Tu café ayuda a que Drumverter siga siendo gratis y sin anuncios. Stripe te enviará el recibo por correo.
converter-description = Conversor gratuito de MIDI de batería: reasigna MIDI de batería entre GetGood Drums, EZdrummer, Superior Drummer, Addictive Drums, General MIDI y Guitar Pro en el navegador.
converter-og-description = Convierte MIDI de batería entre GetGood Drums, EZdrummer, Superior Drummer, Addictive Drums y más de 80 plugins. Gratis y en el navegador.
converter-image-alt = Drumverter — conversor de MIDI de batería entre plugins
converter-twitter-description = Reasigna MIDI de batería entre los mapas de notas de distintos plugins, gratis y en el navegador.
converter-app-description = Herramienta gratuita en el navegador que reasigna MIDI de batería entre los mapas de notas de distintos plugins.
converter-noscript = Drumverter es un conversor gratuito de MIDI de batería. Reasigna un archivo MIDI de batería escrito para el mapa de notas de un plugin al de otro —por ejemplo, de GetGood Drums a EZdrummer, Superior Drummer, Addictive Drums, General MIDI o Guitar Pro— y, si al destino le falta una pieza, usa la más parecida que tenga. Todo pasa en tu navegador; activa JavaScript para usar el conversor.
load-failed = No se pudo cargar Drumverter. Revisa tu conexión a internet y recarga la página.
load-failed-reload = Recargar
maps-breadcrumb = Ruta de navegación
maps-index-title = Mapas de notas MIDI de batería de { $count } plugins
maps-index-description = Mapas de notas MIDI de batería de { $count } plugins, además de tablas de conversión entre GetGood Drums, EZdrummer, Superior Drummer, Addictive Drums y otros.
maps-index-heading = Mapas de notas MIDI de batería
maps-index-intro = Mapas de notas de { $count } plugins de batería y tablas de conversión entre los más populares: los mismos datos de mapeo que usa el conversor de Drumverter.
maps-more-engines = Más plugins
maps-matrix-corner = ORIGEN ↓ DESTINO →
maps-quick-label = Plugins más usados
maps-note-count =
    { $count ->
        [one] { $count } nota
       *[other] { $count } notas
    }
maps-matrix-heading = Todos los pares entre los { $count } principales
maps-matrix-share = { $percent } %
maps-matrix-share-label = { $source } a { $target }: el { $percent } % de las notas coincide exactamente
maps-matrix-hint = Cada celda muestra el porcentaje de notas que coinciden exactamente y abre esa tabla.
maps-all-engines = Los { $count } plugins
maps-filter-engines-label = Filtrar plugins
maps-filter-engines-placeholder = Filtrar plugins…
maps-no-engines = Ningún plugin coincide
maps-engine-title = Mapa de notas y mapeo de batería de { $engineMidi }
maps-engine-title-long-name = Mapa de notas MIDI: { $engine }
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
maps-all-notes = Las { $total } notas
maps-groups-label = Grupos de piezas
maps-extra-hint = Las filas atenuadas son notas adicionales de una pieza que ya tiene una nota principal.
maps-pairs-from = De { $engine } a
maps-pairs-to = A { $engine } desde
maps-core-heading = Las notas que más vas a usar
maps-core-hint = La nota principal de cada pieza, la que escribe el conversor.
maps-pair-heading = Convertir { $sourceMidi } a { $target }
maps-pair-title = Convertir { $sourceMidi } a { $target }
maps-pair-description = Convierte MIDI de batería de { $source } a { $target }. Notas exactas: { $exact }, reemplazadas: { $approximated }, quitadas: { $dropped }.
maps-pair-description-more = Conversor gratuito en el navegador.
maps-pair-description-short = Convierte MIDI de batería de { $source } a { $target }.
maps-pair-summary =
    De las { $total } notas de { $source }, { $exact } { $exact ->
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
maps-pair-rack-lead = ¿Tocas en directo con Ableton?
maps-pair-rack-link = Descarga el rack (.adg)
maps-pair-rack = Ponlo delante de { $target }: { $sourceMidi } suena bien, sin convertir ningún archivo. Live 11 y 12.
maps-pair-rack-dropped = Las piezas que le faltan a { $target } quedan en silencio; sus filas solo muestran un nombre de nota.
maps-steps-label = Convertir en tres pasos
maps-reverse = ⇄ Invertir dirección
maps-exact-count =
    { $count ->
        [one] { $count } exacta
       *[other] { $count } exactas
    }
maps-approximated-count =
    { $count ->
        [one] { $count } reemplazada
       *[other] { $count } reemplazadas
    }
maps-dropped-count =
    { $count ->
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
maps-changes-heading = Qué cambia
maps-changes-plays = toca { $sources }
maps-changes-dropped = { $target } no tiene pieza para { $sources }.
maps-changes-none = Cada nota de { $source } cae en su propia pieza en { $target }.
maps-table-heading = Todas las notas, pieza por pieza
maps-more-from = Más conversiones desde { $engine }
maps-full-maps = Mapas de notas completos:
maps-index-drum-maps = Mapas de batería para tu DAW de cada plugin: Cubase, Reaper, Studio One, Ableton Live y Logic Pro
maps-engine-description-drum-maps = Mapas de batería gratis para Cubase, Reaper, Studio One, Ableton y Logic.
maps-daw-heading = Mapas de batería para tu DAW
maps-daw-intro = Carga uno de estos archivos en tu DAW para ver los nombres de la batería de { $engine } en las teclas del piano roll.
maps-daw-how = Cómo cargar un mapa de batería en Reaper, Cubase, Studio One, Ableton Live o Logic Pro
drum-maps-title = Mapas de batería para Cubase, Reaper, Studio One, Ableton y Logic: { $count } plugins
drum-maps-description = Mapas de batería gratis de { $count } plugins: drum maps de Cubase (.drm), nombres de notas de Reaper (.txt), pitch lists de Studio One (.pitchlist), racks de Ableton Live (.adg) y plantillas del Step Sequencer de Logic Pro (.pattern).
drum-maps-heading = Mapas de batería para tu DAW
drum-maps-intro = Mapas de batería gratis de { $count } plugins, hechos con los mismos mapas de notas que usa el conversor. Cada archivo nombra todas las notas que toca el plugin, así el piano roll muestra nombres de piezas en vez de números de nota. Los archivos usan números de nota MIDI, así que funcionan con cualquiera de las dos convenciones de octava.
drum-maps-pick-daw = Tu DAW
drum-maps-most-used = Los más usados
drum-maps-how-heading = Cómo cargar un mapa de batería
drum-maps-reaper = En el editor MIDI, elige File → Note/CC names → Load note/CC names from file y selecciona el archivo .txt.
drum-maps-cubase = Abre MIDI → Drum Map Setup, pulsa Load y selecciona el archivo .drm. Después elige el mapa en el campo Drum Map del Inspector de la pista.
drum-maps-studio-one = En la vista Edit, pulsa el icono de la llave para mostrar los nombres de nota y arrastra el archivo .pitchlist sobre ellos. Guárdalo desde el menú Pitch Names para reutilizarlo.
drum-maps-ableton = Arrastra el archivo .adg a la pista de batería en Live 11 o 12, delante del plugin. Abre un clip: cada fila del editor MIDI muestra el nombre de su pieza. Las notas suenan sin cambios.
drum-maps-logic = Copia el archivo .pattern en tu Mac a ~/Music/Audio Music Apps/Step Sequencer Settings/Patterns. En Logic Pro, abre el Step Sequencer de la pista de batería y el Pattern Browser (⌥⇧B), elige Patterns → User y haz clic en la plantilla. Cada fila muestra el nombre de su pieza y toca su nota.
drum-maps-other = FL Studio y Bitwig Studio no pueden cargar archivos de nombres de notas. Usa el mapa de notas del plugin para encontrar cada pieza, o convierte tu MIDI al plugin que usas.
drum-maps-list-heading = Mapas de batería de los { $count } plugins
drum-maps-download-label = Mapa de batería de { $engine } para { $daw }
