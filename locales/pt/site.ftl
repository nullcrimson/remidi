section-guide-title = Como converter MIDI de bateria entre plugins
section-guide-description = Converta MIDI de bateria entre GetGood Drums, EZdrummer, Superior Drummer, Addictive Drums e mais de 80 plugins em três passos, grátis e no navegador.
section-faq-title = FAQ do conversor de MIDI de bateria
section-faq-description = Respostas sobre o Drumverter: preço, privacidade, convenções de oitava (C-1 ou C-2), conversão em lote e o que acontece com peças sem equivalente.
section-issue-title = Relatar um problema
section-issue-description = Achou um mapeamento de bateria errado ou quer um plugin novo no Drumverter? Avise pelo GitHub ou por e-mail.
section-contact-title = Contato
section-contact-description = Dúvidas, sugestões ou pedidos de plugins para o Drumverter, o conversor de MIDI de bateria grátis no navegador.
section-terms-title = Termos de uso
section-terms-description = Termos de uso do Drumverter, o conversor de MIDI de bateria grátis no navegador: fornecido no estado em que se encontra, arquivos nunca enviados, estatísticas anônimas sem cookies.
lang-offer = Esta página também está em português →
open-converter = Abrir o conversor
doc-ready-heading = Pronto para converter?
thanks-title = Obrigado
thanks-description = Obrigado por apoiar o Drumverter, o conversor gratuito de MIDI de bateria.
thanks-heading = Obrigado!
thanks-body = Seu café ajuda a manter o Drumverter grátis e sem anúncios. A Stripe envia o recibo para o seu e-mail.
converter-description = Conversor de MIDI de bateria grátis: remapeie MIDI de bateria entre GetGood Drums, EZdrummer, Superior Drummer, Addictive Drums, General MIDI e Guitar Pro no navegador.
converter-og-description = Converta MIDI de bateria entre GetGood Drums, EZdrummer, Superior Drummer, Addictive Drums e mais de 80 plugins. Grátis, no navegador.
converter-image-alt = Drumverter — conversor e remapeador de MIDI de bateria
converter-twitter-description = Remapeador de MIDI de bateria grátis no navegador — remapeie MIDI de bateria entre os mapas de notas de plugins de bateria.
converter-app-description = Ferramenta grátis no navegador que remapeia MIDI de bateria entre os mapas de notas de plugins de bateria.
converter-noscript = O Drumverter é um remapeador de MIDI de bateria grátis. Ele converte um arquivo MIDI de bateria feito para o mapa de notas de um plugin de bateria no mapa de outro — por exemplo, de GetGood Drums para EZdrummer, Superior Drummer, Addictive Drums, General MIDI ou Guitar Pro — e, quando falta uma peça no destino, usa a mais parecida que ele tiver. Tudo roda no seu navegador; ative o JavaScript para usar o conversor.
load-failed = Não foi possível carregar o Drumverter. Verifique sua conexão com a internet e recarregue a página.
load-failed-reload = Recarregar
maps-breadcrumb = Trilha de navegação
maps-index-title = Mapas de notas MIDI de bateria de { $count } plugins
maps-index-description = Mapas de notas MIDI de bateria de { $count } plugins, além de tabelas de conversão entre GetGood Drums, EZdrummer, Superior Drummer, Addictive Drums e outros.
maps-index-heading = Mapas de notas MIDI de bateria
maps-index-intro = Mapas de notas de { $count } plugins de bateria e tabelas de conversão entre os mais populares — os mesmos dados de mapeamento que o conversor do Drumverter usa.
maps-more-engines = Mais plugins
maps-matrix-corner = DE ↓ PARA →
maps-quick-label = Plugins mais usados
maps-note-count =
    { $count ->
        [one] { $count } nota
       *[other] { $count } notas
    }
maps-matrix-heading = Todos os pares entre os { $count } principais
maps-matrix-share = { $percent }%
maps-matrix-share-label = { $source } para { $target }: { $percent }% das notas batem exatamente
maps-matrix-hint = Cada célula mostra a parcela de notas que batem exatamente e abre essa tabela.
maps-all-engines = Todos os { $count } plugins
maps-filter-engines-label = Filtrar plugins
maps-filter-engines-placeholder = Filtrar plugins…
maps-no-engines = Nenhum plugin encontrado
maps-engine-title = { $engineMidi }: mapa de notas e mapeamento de bateria
maps-engine-title-long-name = Mapa de notas MIDI: { $engine }
maps-engine-description = { $engine }: mapa de notas MIDI de bateria com todas as { $total } notas e os nomes das peças nas convenções de oitava C-1 e C-2.
maps-engine-description-short = { $engine }: mapa de notas MIDI de bateria com nomes de notas em C-1 e C-2.
maps-engine-description-more = Converta { $engineMidi } para qualquer plugin, grátis.
maps-engine-heading = Mapa de notas MIDI de bateria: { $engine }
maps-engine-intro = { $engine }: todas as notas MIDI reconhecidas — { $total } no total — agrupadas por peça. Os nomes das notas podem seguir qualquer uma das convenções de oitava: C-1 (Reaper) ou C-2 (Ableton Live, Logic Pro, Cubase, Studio One).
maps-convert-to = Converter para { $engine }
maps-convert-from = Converter de { $engine }
maps-filter-drums-label = Filtrar peças
maps-filter-drums-placeholder = Filtrar por peça ou nota…
maps-octave-naming = Nomes das oitavas
maps-column-note = Nota
maps-column-drum = Peça
maps-conversion-tables = Tabelas de conversão
maps-all-notes = Todas as { $total } notas
maps-groups-label = Grupos de peças
maps-extra-hint = As linhas esmaecidas são notas extras de uma peça que já tem uma nota principal.
maps-pairs-from = De { $engine } para
maps-pairs-to = Para { $engine } de
maps-core-heading = As notas que você mais vai usar
maps-core-hint = A nota principal de cada peça, a que o conversor escreve.
maps-pair-heading = Converter { $sourceMidi } para { $target }
maps-pair-title = Converter { $sourceMidi } para { $target }
maps-pair-description =
    Converta MIDI de bateria de { $source } para { $target }: { $exact } { $exact ->
        [0] notas mapeadas
        [one] nota mapeada
       *[other] notas mapeadas
    } exatamente, { $approximated } { $approximated ->
        [0] substituídas
        [one] substituída
       *[other] substituídas
    } e { $dropped } { $dropped ->
        [0] removidas
        [one] removida
       *[other] removidas
    }.
maps-pair-description-more = Conversor grátis no navegador.
maps-pair-description-short = Converta MIDI de bateria de { $source } para { $target }.
maps-pair-summary =
    Das { $total } notas de { $source }, { $exact } { $exact ->
        [0] são mapeadas
        [one] é mapeada
       *[other] são mapeadas
    } exatamente para { $target }, { $approximated } { $approximated ->
        [0] são substituídas
        [one] é substituída
       *[other] são substituídas
    } pela peça disponível mais parecida e { $dropped } { $dropped ->
        [0] não têm
        [one] não tem
       *[other] não têm
    } equivalente.
maps-pair-convert = Converter { $source } → { $target }
maps-pair-rack-lead = Tocando ao vivo no Ableton?
maps-pair-rack-link = Baixe o rack (.adg)
maps-pair-rack = Coloque-o antes do { $target }: { $sourceMidi } toca certo, sem arquivo para converter. Live 11 e 12.
maps-pair-rack-dropped = As peças que faltam no { $target } ficam mudas; as linhas delas mostram só um nome de nota.
maps-steps-label = Converter em três passos
maps-reverse = ⇄ Inverter direção
maps-exact-count =
    { $count ->
        [0] { $count } exatas
        [one] { $count } exata
       *[other] { $count } exatas
    }
maps-approximated-count =
    { $count ->
        [one] { $count } substituída
       *[other] { $count } substituídas
    }
maps-dropped-count =
    { $count ->
        [one] { $count } removida
       *[other] { $count } removidas
    }
maps-rows = Linhas
maps-rows-changes = Alteradas { $count }
maps-column-engine-note = Nota ({ $engine })
maps-column-engine-drum = Peça ({ $engine })
maps-column-to = para
maps-column-result = Resultado
maps-no-equivalent = sem equivalente
maps-status-exact = exata
maps-status-approximated = substituída
maps-status-dropped = removida
maps-changes-heading = O que muda
maps-changes-plays = toca { $sources }
maps-changes-dropped = { $target } não tem peça para { $sources }.
maps-changes-none = Cada nota de { $source } cai na sua própria peça em { $target }.
maps-table-heading = Todas as notas, peça por peça
maps-more-from = Outras conversões de { $engine }
maps-full-maps = Mapas de notas completos:
maps-index-drum-maps = Mapas de bateria para a sua DAW de cada plugin: Cubase, Reaper, Studio One, Ableton Live e Logic Pro
maps-engine-description-drum-maps = Mapas de bateria grátis para Cubase, Reaper, Studio One, Ableton e Logic.
maps-daw-heading = Mapas de bateria para a sua DAW
maps-daw-intro = Carregue um destes arquivos na sua DAW para ver os nomes das peças de { $engine } nas teclas do piano roll, ou imprima o mapa de notas.
maps-daw-how = Como carregar um mapa de bateria no Reaper, Cubase, Studio One, Ableton Live ou Logic Pro
maps-note-map-pdf = Mapa de notas
maps-note-map-pdf-label = Mapa de notas do { $engine } (PDF)
drum-maps-title = Mapas de bateria para Cubase, Reaper, Studio One, Ableton e Logic: { $count } plugins
drum-maps-description = Mapas de bateria grátis de { $count } plugins: drum maps do Cubase (.drm), nomes de notas do Reaper (.txt), pitch lists do Studio One (.pitchlist), racks do Ableton Live (.adg) e templates do Step Sequencer do Logic Pro (.pattern).
drum-maps-heading = Mapas de bateria para a sua DAW
drum-maps-intro = Mapas de bateria grátis de { $count } plugins, feitos com os mesmos mapas de notas que o conversor usa. Cada arquivo dá nome a todas as notas que o plugin toca, então o piano roll mostra nomes das peças em vez de números de nota. Os arquivos usam números de nota MIDI, então funcionam com qualquer convenção de oitava.
drum-maps-pick-daw = Sua DAW
drum-maps-most-used = Os mais usados
drum-maps-how-heading = Como carregar um mapa de bateria
drum-maps-reaper = No editor MIDI, escolha File → Note/CC names → Load note/CC names from file e selecione o arquivo .txt.
drum-maps-cubase = Abra MIDI → Drum Map Setup, clique em Load e selecione o arquivo .drm. Depois escolha o mapa no campo Drum Map do Inspector da faixa.
drum-maps-studio-one = Na janela Edit, clique no ícone da chave inglesa para mostrar os nomes das notas e arraste o arquivo .pitchlist sobre eles. Salve-o pelo menu Pitch Names para usar de novo.
drum-maps-ableton = Arraste o arquivo .adg para a faixa de bateria no Live 11 ou 12, antes do plugin. Abra um clipe: cada linha do editor MIDI mostra o nome da sua peça. As notas tocam sem mudança.
drum-maps-logic = Copie o arquivo .pattern no seu Mac para ~/Music/Audio Music Apps/Step Sequencer Settings/Patterns. No Logic Pro, abra o Step Sequencer da faixa de bateria e o Pattern Browser (⌥⇧B), escolha Patterns → User e clique no template. Cada linha mostra o nome da sua peça e toca a sua nota.
drum-maps-pdf = Abra o .pdf em qualquer leitor de PDF: ele mostra cada nota por peça, com número e nome. Imprima ou deixe aberto ao lado da sua DAW.
drum-maps-other = FL Studio e Bitwig Studio não carregam arquivos de nomes de notas. Use o mapa de notas do plugin para achar cada peça, ou converta seu MIDI para o plugin que você usa.
drum-maps-list-heading = Mapas de bateria dos { $count } plugins
drum-maps-download-label = Mapa de bateria de { $engine } para { $daw }
