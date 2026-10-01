brand-tagline = conversor e remapeador de MIDI de bateria
nav-converter = Conversor
nav-note-maps = Mapas de notas
section-guide-label = Como usar
section-guide-heading = Como converter MIDI de bateria
section-guide-title = Como converter MIDI de bateria entre plugins | Drumverter
section-guide-description = Converta MIDI de bateria entre GetGood Drums, EZdrummer, Superior Drummer, Addictive Drums e mais de 80 plugins em três passos, grátis e no navegador.
section-faq-label = FAQ
section-faq-heading = Perguntas frequentes
section-faq-title = FAQ do conversor de MIDI de bateria | Drumverter
section-faq-description = Respostas sobre o Drumverter: preço, privacidade, convenções de oitava (C-1 ou C-2), conversão em lote e o que acontece com peças sem equivalente.
section-issue-label = Relatar um problema
section-issue-heading = Relatar um problema
section-issue-title = Relatar um problema | Drumverter
section-issue-description = Achou um mapeamento de bateria errado ou quer um plugin novo no Drumverter? Avise pelo GitHub ou por e-mail.
section-contact-label = Contato
section-contact-heading = Contato
section-contact-title = Contato | Drumverter
section-contact-description = Dúvidas, sugestões ou pedidos de plugins para o Drumverter, o conversor de MIDI de bateria grátis no navegador.
section-terms-label = Termos
section-terms-heading = Termos de uso
section-terms-title = Termos de uso | Drumverter
section-terms-description = Termos de uso do Drumverter, o conversor de MIDI de bateria grátis no navegador: fornecido no estado em que se encontra, arquivos nunca enviados, estatísticas anônimas sem cookies.
skip-to-content = Pular para o conteúdo
nav-main = Principal
nav-site = Site
lang-menu-label = Idioma
lang-load-failed = Não foi possível carregar o idioma { $language }. Verifique sua conexão com a internet e tente de novo.
lang-offer = Esta página também está em português →
open-converter = Abrir o conversor →
error-unknown-engine = Plugin de { $role ->
    [source] origem
   *[target] destino
} desconhecido: “{ $id }”
error-bad-midi = O conversor não consegue ler este arquivo — parece que não é MIDI
error-bad-preset = Não é um arquivo de preset
error-bad-overrides = Não foi possível ler as alterações de notas
error-bad-missing = Opção desconhecida para peças que faltam
error-bad-channel = Configuração de canal desconhecida
error-internal = Algo deu errado
error-wasm-unavailable = Não foi possível carregar o conversor
error-detail = Detalhes: { $detail }
blocker-files-and-engines = Adicione um arquivo .mid e escolha os dois plugins
blocker-files = Primeiro adicione um arquivo .mid
blocker-engines = Escolha os plugins de origem e de destino
channel-auto = Auto
channel-all = Todos os canais
channel-number = { $channel }
channel-hint-auto = faixas com notas no canal 10 · as outras não mudam
channel-hint-all = todos os canais são convertidos
channel-hint-one = só o canal { $channel } é convertido
missing-nearest = Substituir
missing-drop = Remover
missing-hint-nearest = trocadas pela peça mais parecida
missing-hint-drop = removidas do arquivo
missing-hint-moved = { $count ->
    [0] nenhuma peça substituída
    [one] { $count } peça substituída
   *[other] { $count } peças substituídas
}
missing-hint-dropped = { $count ->
    [0] nenhuma peça removida
    [one] { $count } peça removida
   *[other] { $count } peças removidas
}
files-unreadable = Não foi possível ler { $names } — escolha { $count ->
    [one] o arquivo
   *[other] os arquivos
} de novo.
preset-skipped = { $count ->
    [one] { $count } alteração em “{ $name }” usa uma peça que esta versão não conhece; ignorada.
   *[other] { $count } alterações em “{ $name }” usam peças que esta versão não conhece; ignoradas.
}
import-failed = Não foi possível importar { $file }: { $error }
import-at-cap = Não foi possível importar { $file }: não cabem mais presets (máximo { $cap })
import-done = Preset “{ $name }” importado.
import-done-skipped = Preset “{ $name }” importado ({ $count ->
    [one] { $count } alteração ignorada
   *[other] { $count } alterações ignoradas
}).
edit-line = { $drum }: { $now } (padrão: { $byDefault })
edit-more = +{ $count } outras
app-intro = Converta MIDI de bateria entre GetGood Drums, EZdrummer, Superior Drummer 3, Addictive Drums 2, General MIDI, Guitar Pro e mais de 80 plugins. Tudo roda no seu navegador: seus arquivos não são enviados para lugar nenhum.
app-loading = Carregando o conversor…
convert-error = Erro: { $error }
notice-dismiss = Dispensar
channel-label = Canal de bateria
channel-tip-title = Quais notas são convertidas
channel-tip = Auto converte todas as faixas que usam o canal 10 — o canal de bateria do General MIDI — e não mexe nos outros instrumentos. Escolha um canal ou Todos os canais se a sua bateria estiver em outro lugar.
missing-label = Peças que faltam
missing-tip-title = Quando falta uma peça no destino
missing-tip = Substituir troca a peça pela mais parecida que o destino tem — um China vira crash, o Tom 4 vira Tom 3. Remover tira a peça do arquivo. Ghost notes, rimshots e outras formas de tocar uma peça que o destino tem sempre viram uma nota normal nessa peça.
edited-review = { $count ->
    [one] { $count } peça editada
   *[other] { $count } peças editadas
} — revisar alterações
edited-review-saved = { $count ->
    [one] { $count } peça editada
   *[other] { $count } peças editadas
} do preset { $name } — revisar alterações
edited-review-unsaved = { $count ->
    [one] { $count } peça editada
   *[other] { $count } peças editadas
} sem salvar em { $name } — revisar alterações
edited-differ = { $count ->
    [one] { $count } peça está diferente
   *[other] { $count } peças estão diferentes
} do mapeamento padrão
edited-click = Clique para revisar ou redefinir.
edited-count = { $count ->
    [one] { $count } editada
   *[other] { $count } editadas
}
edited-count-unsaved = { $count ->
    [one] { $count } editada · sem salvar
   *[other] { $count } editadas · sem salvar
}
octave-label = Oitavas começam em
octave-tip-title = Só o nome das oitavas
octave-tip = Define em qual oitava fica a nota MIDI 0, para que os nomes das notas batam com os da sua DAW. Só muda o nome que aparece na tela — as notas do arquivo continuam iguais.
canon-picker-label = Peça para a nota { $note }
canon-picker-heading = ORIGEM · { $note }
close = Fechar
dropzone-heading = SOLTE UM .MID
dropzone-presets = ou um preset exportado (.json)
convert-running = convertendo
convert-button = Converter
engine-from = DE
engine-to = PARA
engine-swap = Inverter origem e destino
filter-clear = Limpar filtro
note-picker-label = Nota de destino para { $drum }
note-picker-heading = DESTINO · { $drum }
source-picker-label = Nota de origem para { $drum }
source-picker-heading = ENTRADA · { $drum }
mid-badge = MID
plan-error = Não foi possível carregar o editor de notas: { $error }
plan-error-reset = Redefinir
crash-heading = Algo deu errado
crash-body = O conversor deu um erro e não conseguiu continuar. Recarregar a página costuma resolver; se continuar acontecendo, talvez um preset salvo esteja corrompido.
crash-reload = Recarregar
crash-reset = Excluir dados salvos…
crash-reset-confirm = Excluir presets salvos, favoritos e configurações?
crash-reset-do = Excluir e recarregar
cancel = Cancelar
saved-group = Mapeamentos salvos
saved-heading = SALVOS
edit-back = ← Voltar
edit-heading = Editar notas
edit-advanced = Avançado — reatribuir notas de origem
summary-remapped = { $total ->
    [0] { $remapped } de { $total } peças remapeadas
    [one] { $remapped } de { $total } peça remapeada
   *[other] { $remapped } de { $total } peças remapeadas
}
summary-edit-tip-title = Ajuste cada peça
summary-edit-tip = Atribua qualquer peça a outra nota de destino — escolha na lista de peças ou no piano. Suas alterações valem para a conversão e podem ser salvas como preset.
summary-edit = Editar nota por nota →
missing-detail-moved = Trocadas por outra peça
missing-detail-dropped = Removidas do arquivo
detail-edit = Alterar no editor de notas →
summary-detail-heading = { $total ->
    [one] { $total } peça neste mapa
   *[other] { $total } peças neste mapa
}
summary-detail-moved = em uma nota nova
summary-detail-same = já na nota certa
summary-detail-variant = em uma variante parecida
summary-detail-swapped = trocadas por outra peça
summary-detail-dropped = removidas
summary-detail-unplayed = não existem no plugin de origem
summary-reason-same = mesma nota nos dois plugins
summary-reason-variant = sem equivalente exato em { $target }: toca uma variante da mesma peça
summary-reason-swapped = sem equivalente em { $target }: toca a peça mais parecida
summary-reason-dropped = sem equivalente em { $target }
summary-reason-unplayed = sem nota em { $source }
row-extras-dropped = { $count ->
    [one] Mais { $count } nota de origem toca { $drum }: { $notes }. Nenhuma tem destino.
   *[other] Mais { $count } notas de origem tocam { $drum }: { $notes }. Nenhuma tem destino.
}
row-extras = { $count ->
    [one] Mais { $count } nota de origem toca { $drum }: { $notes }. As duas vão para { $target }.
   *[other] Mais { $count } notas de origem tocam { $drum }: { $notes }. Todas vão para { $target }.
}
row-reset = Redefinir { $drum }
edit-filter-label = Filtrar peças
edit-filter-placeholder = filtrar peças…
library-filter-placeholder = filtrar…
edit-show = Mostrar
edit-show-all = Todas { $count }
edit-show-changed = Alteradas { $count }
edit-show-issues = Avisos { $count }
edit-actions = Ações de edição
edit-changes = { $count ->
    [0] Nenhuma alteração
    [one] { $count } alteração
   *[other] { $count } alterações
}
edit-reset-all = Redefinir tudo
edit-done = Concluído
row-no-source = sem origem
row-dropped = removida
rows-drum = PEÇA
rows-source = ORIGEM
rows-target = DESTINO
rows-plays = TOCA
rows-none = Nenhuma peça encontrada
rows-reassigned = { $note } era { $from } — agora toca { $drum }
preset-tip-title = Reutilize este mapeamento
preset-tip = Salva o par origem→destino e as alterações de notas como um atalho na tela principal — um clique carrega tudo de novo. Fica salvo só neste navegador.
preset-update-open = Atualizar preset
preset-save-open = Salvar como preset
preset-name = Nome do preset
preset-update = Atualizar
preset-save-new = Salvar novo
preset-save = Salvar
preset-exists = Já existe um preset para { $pair }.
preset-at-cap = Não cabem mais presets: o máximo é { $cap }.
source-unassigned = — não atribuída
source-unmapped = sem peça
source-clear = Remover a nota de origem { $note }
source-add-label = Adicionar nota de origem
source-add-placeholder = nova nota 0–127
source-add = adicionar
source-add-invalid = Digite um número de nota de 0 a 127
library-group = Plugin: { $side }
library-filter = Filtrar plugins: { $side }
library-hint = Digite para filtrar. As setas movem, Enter escolhe, Ctrl+Enter adiciona ou remove dos favoritos.
library-list = Plugins: { $side }
library-favourites = Favoritos
library-all = Todos os plugins
library-none = nenhum resultado
files-skipped = Ignorados: { $names } — só é possível adicionar arquivos .mid e presets exportados (.json)
files-drop = Solte um ou mais .mid em qualquer lugar
files-choose = Escolher arquivos
files-presets = Arquivos de preset que você exportou (.json) podem ser soltos ou escolhidos do mesmo jeito.
files-remove = Remover { $name }
files-add-more = + adicionar mais
files-clear = limpar tudo
chip-rename = Renomear
chip-duplicate = Duplicar
chip-export = Exportar
chip-delete = Excluir
chip-rename-label = Renomear { $name }
chip-rename-save = Salvar nome
chip-rename-cancel = Cancelar renomeação
chip-overrides = { $count ->
    [0] { $count } alterações
    [one] { $count } alteração
   *[other] { $count } alterações
}
chip-unavailable = plugin indisponível
chip-edit = Editar notas de { $name }
chip-more = Mais ações para { $name }
chip-at-cap = não cabem mais presets
done-tag-converted = { $count ->
    [one] { $count } nota convertida
   *[other] { $count } notas convertidas
}
done-tag-nothing = nada convertido
done-tag-approximated = { $count ->
    [one] { $count } substituída
   *[other] { $count } substituídas
}
done-tag-dropped = { $count ->
    [one] { $count } removida
   *[other] { $count } removidas
}
done-tag-unrecognized = { $count ->
    [one] { $count } não reconhecida
   *[other] { $count } não reconhecidas
}
done-tag-untouched = { $count ->
    [one] { $count } inalterada em outros canais
   *[other] { $count } inalteradas em outros canais
}
done-tag-failed = { $count } com erro
done-file-approximated = { $count } subst.
done-file-dropped = { $count ->
    [one] { $count } removida
   *[other] { $count } removidas
}
done-file-unrecognized = { $count } não rec.
done-file-clean = sem perdas
done-heading = { $count ->
    [one] { $count } arquivo convertido
   *[other] { $count } arquivos convertidos
} → { $target }
done-edited = { $count ->
    [one] { $count } peça editada
   *[other] { $count } peças editadas
}
done-download-one = ↓ Baixar .mid
done-download-zip = ↓ Baixar { $count } arquivos (.zip)
done-files = Arquivos convertidos
done-file-download = ↓ .mid
tip-link = Me pague um café
tip-ask = Faço o Drumverter sozinho, no meu tempo livre. Se ele poupou seu trabalho de remapear tudo à mão, um café ajuda a mantê-lo grátis e sem anúncios.
tip-amounts = Apoie o projeto
tip-other = Outro valor
thanks-title = Obrigado | Drumverter
thanks-description = Obrigado por apoiar o Drumverter, o conversor gratuito de MIDI de bateria.
thanks-heading = Obrigado!
thanks-body = Seu café ajuda a manter o Drumverter grátis e sem anúncios. A Stripe envia o recibo para o seu e-mail.
done-view-report = Ver relatório →
done-convert-more = Nova conversão
done-report-mapping = Mapeamento errado? Me avise
drop-missing = Remover as peças que faltam e converter de novo
report-dropped = Removidas
report-approximated = Substituídas
report-unrecognized = Não reconhecidas
report-dropped-hint = { $target } não tem essa peça
report-approximated-hint = trocadas pela peça mais parecida
report-unrecognized-hint = fora do mapa de { $source } — removidas do arquivo
report-pick-target = Escolher destino →
report-assign = Atribuir →
report-across = { $summary } em { $count } arquivos
report-contact = Mapeamento errado ou plugin faltando? Abra uma { $issue } ou mande um e-mail para { $email }.
report-contact-issue = issue no GitHub
report-unchanged = Inalteradas
report-unchanged-hint = outras faixas / canais
report-unchanged-entry = Notas em outras faixas ou canais: ficam como estavam
report-channel = Canal de bateria →
report-nothing = Nada foi convertido
report-nothing-channel = — nenhuma nota no canal de bateria escolhido. Escolha outro canal de bateria ou Todos os canais.
report-nothing-notes = — nenhuma nota de bateria encontrada neste arquivo.
report-clean = Conversão sem perdas
report-clean-detail = — todas as peças foram mapeadas direto para { $target }.
report-heading = Relatório de conversão
converter-title = Drumverter — conversor e remapeador de MIDI de bateria grátis
converter-description = Conversor de MIDI de bateria grátis: remapeie MIDI de bateria entre GetGood Drums, EZdrummer, Superior Drummer, Addictive Drums, General MIDI e Guitar Pro no navegador.
converter-og-description = Converta MIDI de bateria entre GetGood Drums, EZdrummer, Superior Drummer, Addictive Drums e mais de 80 plugins. Grátis, no navegador.
converter-image-alt = Drumverter — conversor e remapeador de MIDI de bateria
converter-twitter-description = Remapeador de MIDI de bateria grátis no navegador — remapeie MIDI de bateria entre os mapas de notas de plugins de bateria.
converter-app-description = Ferramenta grátis no navegador que remapeia MIDI de bateria entre os mapas de notas de plugins de bateria.
converter-noscript = O Drumverter é um remapeador de MIDI de bateria grátis. Ele converte um arquivo MIDI de bateria feito para o mapa de notas de um plugin de bateria no mapa de outro — por exemplo, de GetGood Drums para EZdrummer, Superior Drummer, Addictive Drums, General MIDI ou Guitar Pro — e, quando falta uma peça no destino, usa a mais parecida que ele tiver. Tudo roda no seu navegador; ative o JavaScript para usar o conversor.
load-failed = Não foi possível carregar o Drumverter. Verifique sua conexão com a internet e recarregue a página.
load-failed-reload = Recarregar
maps-breadcrumb = Trilha de navegação
maps-index-title = Mapas de notas MIDI de bateria de { $count } plugins | Drumverter
maps-index-description = Mapas de notas MIDI de bateria de { $count } plugins, além de tabelas de conversão entre GetGood Drums, EZdrummer, Superior Drummer, Addictive Drums e outros.
maps-index-heading = Mapas de notas MIDI de bateria
maps-index-intro = Mapas de notas de { $count } plugins de bateria e tabelas de conversão entre os mais populares — os mesmos dados de mapeamento que o conversor do Drumverter usa.
maps-popular = Conversões populares
maps-more-engines = Mais plugins
maps-matrix-corner = DE ↓ PARA →
maps-pair-link = { $source } para { $target }
maps-matrix-hint = Cada seta abre a tabela de conversão do plugin da linha para o plugin da coluna.
maps-all-engines = Todos os { $count } plugins
maps-filter-engines-label = Filtrar plugins
maps-filter-engines-placeholder = Filtrar plugins…
maps-no-engines = Nenhum plugin encontrado
maps-engine-title = { $engineMidi }: mapa de notas e mapeamento de bateria | Drumverter
maps-engine-title-long-name = Mapa de notas MIDI: { $engine } | Drumverter
maps-engine-description = { $engine }: mapa de notas MIDI de bateria com todas as { $total } notas e os nomes das peças nas convenções de oitava C-1 e C-2.
maps-engine-description-short = { $engine }: mapa de notas MIDI de bateria com nomes de notas em C-1 e C-2.
maps-engine-description-more = Converta { $engineMidi } para qualquer plugin, grátis.
maps-engine-heading = Mapa de notas MIDI de bateria: { $engine }
maps-engine-intro = { $engine }: todas as notas MIDI reconhecidas — { $total } no total — agrupadas por peça. Os nomes das notas podem seguir qualquer uma das convenções de oitava: C-1 (Reaper, Logic, Ableton, Guitar Pro) ou C-2 (Studio One, Cubase, FL Studio).
maps-convert-to = Converter para { $engine }
maps-convert-from = Converter de { $engine }
maps-filter-drums-label = Filtrar peças
maps-filter-drums-placeholder = Filtrar por peça ou nota…
maps-octave-naming = Nomes das oitavas
maps-column-note = Nota
maps-column-drum = Peça
maps-conversion-tables = Tabelas de conversão
maps-pair-heading = Converter { $sourceMidi } para { $target }
maps-pair-title = Converter { $sourceMidi } para { $target } | Drumverter
maps-pair-description = Converta MIDI de bateria de { $source } para { $target }: { $exact } { $exact ->
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
maps-pair-summary = Das { $total } notas de { $source }, { $exact } { $exact ->
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
maps-reverse = ⇄ Inverter direção
maps-exact-count = { $count ->
    [0] { $count } exatas
    [one] { $count } exata
   *[other] { $count } exatas
}
maps-approximated-count = { $count ->
    [one] { $count } substituída
   *[other] { $count } substituídas
}
maps-dropped-count = { $count ->
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
maps-more-from = Outras conversões de { $engine }
maps-full-maps = Mapas de notas completos:
