brand-tagline = convertisseur de MIDI batterie
nav-converter = Convertisseur
nav-note-maps = Mappings
section-guide-label = Mode d’emploi
section-guide-heading = Comment convertir du MIDI batterie
section-guide-title = Convertir du MIDI batterie d’un plugin à l’autre | Drumverter
section-guide-description = Convertissez du MIDI batterie entre GetGood Drums, EZdrummer, Superior Drummer, Addictive Drums et plus de 80 plugins en trois étapes, gratuitement, dans votre navigateur.
section-faq-label = FAQ
section-faq-heading = Questions fréquentes
section-faq-title = FAQ du convertisseur de MIDI batterie | Drumverter
section-faq-description = Tout sur Drumverter : prix, confidentialité, C-1 ou C-2, plusieurs fichiers à la fois et ce que deviennent les éléments absents du plugin cible.
section-issue-label = Signaler un problème
section-issue-heading = Signaler un problème
section-issue-title = Signaler un problème | Drumverter
section-issue-description = Un élément mal mappé, ou un plugin qui manque dans Drumverter ? Signalez-le via le formulaire, sur GitHub ou par e-mail.
section-contact-label = Contact
section-contact-heading = Contact
section-contact-title = Contact | Drumverter
section-contact-description = Questions, suggestions ou demandes de plugins pour Drumverter, le convertisseur de MIDI batterie gratuit qui fonctionne dans le navigateur.
section-terms-label = Conditions
section-terms-heading = Conditions d’utilisation
section-terms-title = Conditions d’utilisation | Drumverter
section-terms-description = Conditions d’utilisation de Drumverter, le convertisseur de MIDI batterie gratuit dans le navigateur : fourni tel quel, fichiers jamais envoyés, statistiques anonymes sans cookies.
skip-to-content = Aller au contenu
nav-main = Principal
nav-site = Site
lang-menu-label = Langue
lang-load-failed = Impossible de charger la langue { $language }. Vérifiez votre connexion Internet et réessayez.
lang-offer = Cette page existe en français →
open-converter = Ouvrir le convertisseur →
error-unknown-engine = Plugin { $role ->
    [source] source
   *[target] cible
} inconnu : « { $id } »
error-bad-midi = Le convertisseur ne peut pas lire ce fichier : il ne ressemble pas à un fichier MIDI
error-bad-preset = Ce n’est pas un fichier de preset
error-bad-overrides = Impossible de lire les modifications de notes
error-bad-missing = Réglage inconnu pour les éléments manquants
error-bad-channel = Réglage de canal inconnu
error-internal = Une erreur s’est produite
error-wasm-unavailable = Impossible de charger le convertisseur
error-detail = Détails : { $detail }
blocker-files-and-engines = Ajoutez un fichier .mid et choisissez les deux plugins
blocker-files = Ajoutez d’abord un fichier .mid
blocker-engines = Choisissez un plugin source et un plugin cible
channel-auto = Auto
channel-all = Tous les canaux
channel-number = { $channel }
channel-hint-auto = pistes avec des notes sur le canal 10 · autres inchangées
channel-hint-all = tous les canaux sont convertis
channel-hint-one = seul le canal { $channel } est converti
missing-nearest = Remplacer
missing-drop = Supprimer
missing-hint-nearest = remplacés par l’élément le plus proche
missing-hint-drop = supprimés du fichier
missing-hint-moved = { $count ->
    [0] aucun élément remplacé
    [one] { $count } élément remplacé par un autre
   *[other] { $count } éléments remplacés par d’autres
}
missing-hint-dropped = { $count ->
    [0] aucun élément supprimé
    [one] { $count } élément supprimé
   *[other] { $count } éléments supprimés
}
files-unreadable = Impossible de lire { $names }. Choisissez { $count ->
    [one] ce fichier
   *[other] ces fichiers
} à nouveau.
preset-skipped = { $count ->
    [one] { $count } modification ignorée dans « { $name } » : cette version ne connaît pas l’élément.
   *[other] { $count } modifications ignorées dans « { $name } » : cette version ne connaît pas ces éléments.
}
import-failed = Impossible d’importer { $file } : { $error }
import-at-cap = Impossible d’importer { $file } : plus de place, { $cap } presets maximum
import-done = Preset « { $name } » importé.
import-done-skipped = Preset « { $name } » importé ({ $count ->
    [one] { $count } modification ignorée
   *[other] { $count } modifications ignorées
}).
edit-line = { $drum } : { $now } (par défaut : { $byDefault })
edit-more = { $count ->
    [one] +{ $count } autre
   *[other] +{ $count } autres
}
app-intro = Convertissez du MIDI batterie entre GetGood Drums, EZdrummer, Superior Drummer 3, Addictive Drums 2, General MIDI, Guitar Pro et plus de 80 autres plugins. Tout se passe dans votre navigateur : vos fichiers ne sont envoyés nulle part.
app-loading = Chargement du convertisseur…
convert-error = Erreur : { $error }
notice-dismiss = Fermer
channel-label = Canal batterie
channel-tip-title = Quelles notes sont converties
channel-tip = En mode « Auto », toutes les pistes sur le canal 10 (le canal batterie du General MIDI) sont converties, et les autres instruments ne bougent pas. Si votre batterie est sur un autre canal, choisissez-le, ou « Tous les canaux ».
missing-label = Éléments manquants
missing-tip-title = Quand le plugin cible n’a pas l’élément
missing-tip = « Remplacer » prend à la place l’élément le plus proche du plugin cible : une crash au lieu d’une China, le Tom 3 au lieu du Tom 4. « Supprimer » retire ses notes du fichier. S’il ne manque qu’un mode de jeu (ghost notes, rimshots…), la note devient toujours un coup simple sur le même élément.
edited-review = { $count ->
    [one] { $count } élément modifié
   *[other] { $count } éléments modifiés
} — voir les modifications
edited-review-saved = { $count ->
    [one] { $count } élément modifié
   *[other] { $count } éléments modifiés
} (preset { $name }) — voir les modifications
edited-review-unsaved = { $count ->
    [one] { $count } élément modifié
   *[other] { $count } éléments modifiés
} — voir les modifications (non enregistrées dans { $name })
edited-differ = { $count ->
    [one] { $count } élément diffère
   *[other] { $count } éléments diffèrent
} du mapping par défaut
edited-click = Cliquez pour voir ou réinitialiser.
edited-count = { $count ->
    [one] { $count } modifié
   *[other] { $count } modifiés
}
edited-count-unsaved = { $count ->
    [one] { $count } modifié · non enregistré
   *[other] { $count } modifiés · non enregistrés
}
octave-label = Première octave
octave-tip-title = Ne change que l’affichage
octave-tip = Indique dans quelle octave se trouve la note MIDI 0, pour que les noms de notes soient les mêmes que dans votre DAW. Les notes du fichier, elles, ne changent pas.
canon-picker-label = Élément pour { $note }
canon-picker-heading = SOURCE · { $note }
close = Fermer
dropzone-heading = DÉPOSEZ UN .MID
dropzone-presets = ou un preset exporté (.json)
convert-running = conversion
convert-button = Convertir
engine-from = SOURCE
engine-to = CIBLE
engine-swap = Inverser source et cible
filter-clear = Effacer le filtre
note-picker-label = Note cible pour { $drum }
note-picker-heading = CIBLE · { $drum }
source-picker-label = Note source pour { $drum }
source-picker-heading = ENTRÉE · { $drum }
mid-badge = MID
plan-error = Impossible de charger l’éditeur de notes : { $error }
plan-error-reset = Réinitialiser les modifications
crash-heading = Une erreur s’est produite
crash-body = Le convertisseur a rencontré une erreur et ne peut pas continuer. En général, il suffit d’actualiser la page. Si le problème revient, un preset enregistré est peut-être endommagé.
crash-reload = Actualiser
crash-reset = Effacer les données enregistrées…
crash-reset-confirm = Supprimer les presets, favoris et réglages enregistrés ?
crash-reset-do = Supprimer et actualiser
cancel = Annuler
saved-group = Mappings enregistrés
saved-heading = PRESETS
edit-back = ← Retour
edit-heading = Modifier les notes
edit-advanced = Avancé — réattribuer les notes sources
summary-remapped = Éléments remappés : { $remapped } sur { $total }
summary-edit-tip-title = Réglez chaque élément
summary-edit-tip = Vous pouvez donner une autre note cible à n’importe quel élément, depuis la liste ou le clavier. Vos modifications sont prises en compte à la conversion et peuvent être enregistrées comme preset.
summary-edit = Modifier note par note →
missing-detail-moved = Remplacés par un autre élément
missing-detail-dropped = Supprimés du fichier
detail-edit = Modifier dans l’éditeur de notes →
summary-detail-heading = { $total ->
    [one] { $total } élément dans ce mapping
   *[other] { $total } éléments dans ce mapping
}
summary-detail-moved = sur une nouvelle note
summary-detail-same = déjà sur la bonne note
summary-detail-variant = sur une variante proche
summary-detail-swapped = remplacés par un autre élément
summary-detail-dropped = supprimés
summary-detail-unplayed = absents du plugin source
summary-reason-same = même note dans les deux plugins
summary-reason-variant = pas d’équivalent exact dans { $target } — une variante du même élément joue
summary-reason-swapped = pas d’équivalent dans { $target } — l’élément le plus proche joue à la place
summary-reason-dropped = pas d’équivalent dans { $target }
summary-reason-unplayed = aucune note dans { $source }
row-extras-dropped = { $count ->
    [one] { $count } autre note source joue aussi { $drum } : { $notes }. Elle n’a pas de cible.
   *[other] { $count } autres notes sources jouent aussi { $drum } : { $notes }. Aucune n’a de cible.
}
row-extras = { $count ->
    [one] { $count } autre note source joue aussi { $drum } : { $notes }. Les deux vont sur { $target }.
   *[other] { $count } autres notes sources jouent aussi { $drum } : { $notes }. Toutes vont sur { $target }.
}
row-reset = Réinitialiser { $drum }
edit-filter-label = Filtrer les éléments
edit-filter-placeholder = filtrer les éléments…
library-filter-placeholder = filtrer…
edit-show = Afficher
edit-show-all = Tous { $count }
edit-show-changed = Modifiés { $count }
edit-show-issues = Problèmes { $count }
edit-actions = Actions d’édition
edit-changes = { $count ->
    [0] Aucune modification
    [one] { $count } modification
   *[other] { $count } modifications
}
edit-reset-all = Tout réinitialiser
edit-done = Terminé
row-no-source = aucune source
row-dropped = supprimé
rows-drum = ÉLÉMENT
rows-source = SOURCE
rows-target = CIBLE
rows-plays = SON
rows-none = Aucun élément ne correspond
rows-reassigned = { $note } jouait { $from } — joue maintenant { $drum }
preset-tip-title = Garder ce mapping pour plus tard
preset-tip = Enregistre SOURCE→CIBLE et vos modifications de notes dans un raccourci sur l’écran principal : un clic, et tout est rechargé. Reste uniquement dans ce navigateur.
preset-update-open = Mettre à jour le preset
preset-save-open = Enregistrer comme preset
preset-name = Nom du preset
preset-update = Mettre à jour
preset-save-new = Créer
preset-save = Enregistrer
preset-exists = Il y a déjà un preset pour { $pair }.
preset-at-cap = Plus de place pour d’autres presets : { $cap } maximum.
source-unassigned = — non attribuée
source-unmapped = non mappée
source-clear = Retirer la note source { $note }
source-add-label = Ajouter une note source
source-add-placeholder = note de 0 à 127
source-add = ajouter
source-add-invalid = Saisissez un numéro de note entre 0 et 127
library-group = Plugin { $side }
library-filter = Filtrer les plugins { $side }
library-hint = Tapez pour filtrer. Les flèches déplacent la sélection, Entrée choisit, Ctrl+Entrée ajoute ou retire un favori.
library-list = Plugins { $side }
library-favourites = Favoris
library-all = Tous les plugins
library-none = aucun résultat
files-skipped = Impossible d’ajouter { $names } : seuls les fichiers .mid et les presets exportés (.json) sont acceptés
files-drop = Déposez un ou plusieurs fichiers .mid n’importe où
files-choose = Choisir des fichiers
files-presets = Les presets que vous avez exportés (.json) se déposent ou se choisissent de la même façon.
files-remove = Retirer { $name }
files-add-more = + ajouter
files-clear = tout retirer
chip-rename = Renommer
chip-duplicate = Dupliquer
chip-export = Exporter
chip-delete = Supprimer
chip-rename-label = Renommer { $name }
chip-rename-save = Enregistrer le nom
chip-rename-cancel = Annuler le renommage
chip-overrides = { $count ->
    [one] { $count } modification
   *[other] { $count } modifications
}
chip-unavailable = plugin indisponible
chip-edit = Modifier les notes de { $name }
chip-more = Plus d’actions pour { $name }
chip-at-cap = plus de place pour d’autres presets
done-tag-converted = { $count ->
    [one] { $count } note convertie
   *[other] { $count } notes converties
}
done-tag-nothing = aucune note convertie
done-tag-approximated = { $count ->
    [one] { $count } remplacée
   *[other] { $count } remplacées
}
done-tag-dropped = { $count ->
    [one] { $count } supprimée
   *[other] { $count } supprimées
}
done-tag-unrecognized = { $count ->
    [one] { $count } non reconnue
   *[other] { $count } non reconnues
}
done-tag-untouched = { $count ->
    [one] { $count } inchangée sur un autre canal
   *[other] { $count } inchangées sur d’autres canaux
}
done-tag-failed = { $count ->
    [one] { $count } échec
   *[other] { $count } échecs
}
done-file-approximated = { $count } rempl.
done-file-dropped = { $count } suppr.
done-file-unrecognized = { $count } non rec.
done-file-clean = sans perte
done-heading = { $count ->
    [one] { $count } fichier converti
   *[other] { $count } fichiers convertis
} → { $target }
done-edited = { $count ->
    [one] { $count } élément modifié
   *[other] { $count } éléments modifiés
}
done-download-one = ↓ Télécharger le .mid
done-download-zip = ↓ Télécharger { $count } fichiers (.zip)
done-files = Fichiers convertis
done-file-download = ↓ .mid
tip-link = Offrez-moi un café
tip-ask = Je développe Drumverter seul, sur mon temps libre. S’il vous a évité de remapper à la main, un café l’aide à rester gratuit et sans pub.
tip-amounts = Soutenir Drumverter
tip-other = Autre montant
thanks-title = Merci | Drumverter
thanks-description = Merci de soutenir Drumverter, le convertisseur de MIDI batterie gratuit.
thanks-heading = Merci !
thanks-body = Grâce à votre café, Drumverter reste gratuit et sans pub. Stripe vous envoie le reçu par e-mail.
done-view-report = Voir le rapport →
done-convert-more = Nouvelle conversion
done-report-mapping = Mapping erroné ? Signalez-le
drop-missing = Supprimer les éléments manquants et reconvertir
report-dropped = Supprimés
report-approximated = Remplacés
report-unrecognized = Non reconnues
report-dropped-hint = { $target } n’a pas cet élément
report-approximated-hint = remplacés par l’élément le plus proche
report-unrecognized-hint = notes absentes du mapping { $source } — supprimées du fichier
report-pick-target = Choisir une cible →
report-assign = Attribuer →
report-across = { $summary } dans { $count } fichiers
report-contact = Mapping erroné ou plugin manquant ? Ouvrez un { $issue } ou écrivez à { $email }.
report-contact-issue = ticket GitHub
report-unchanged = Inchangées
report-unchanged-hint = autres pistes / canaux
report-unchanged-entry = Notes sur d’autres pistes ou canaux, laissées telles quelles
report-channel = Canal batterie →
report-nothing = Rien n’a été converti
report-nothing-channel = — aucune note sur le canal batterie choisi. Choisissez un autre canal ou « Tous les canaux ».
report-nothing-notes = — aucune note de batterie dans ce fichier.
report-clean = Conversion sans perte
report-clean-detail = — tous les éléments existent tels quels dans { $target }.
report-heading = Rapport de conversion
converter-title = Drumverter — convertisseur de MIDI batterie gratuit
converter-description = Convertisseur de MIDI batterie gratuit : remappez vos MIDI batterie entre GetGood Drums, EZdrummer, Superior Drummer, Addictive Drums, General MIDI et Guitar Pro, dans le navigateur.
converter-og-description = Convertissez du MIDI batterie entre GetGood Drums, EZdrummer, Superior Drummer, Addictive Drums et plus de 80 autres plugins. Gratuit, dans le navigateur.
converter-image-alt = Drumverter — convertisseur de MIDI batterie
converter-twitter-description = Outil gratuit dans le navigateur pour remapper du MIDI batterie d’un plugin à l’autre.
converter-app-description = Outil gratuit dans le navigateur qui adapte le MIDI batterie au mapping de notes d’un autre plugin.
converter-noscript = Drumverter est un outil gratuit pour remapper du MIDI batterie. Il adapte un fichier MIDI batterie écrit pour le mapping de notes d’un plugin à celui d’un autre — par exemple de GetGood Drums vers EZdrummer, Superior Drummer, Addictive Drums, General MIDI ou Guitar Pro. Si un élément manque, il est remplacé par le plus proche, pour qu’aucune note ne se perde. Tout se passe dans votre navigateur ; activez JavaScript pour utiliser le convertisseur.
load-failed = Impossible de charger Drumverter. Vérifiez votre connexion Internet et actualisez la page.
load-failed-reload = Actualiser
maps-breadcrumb = Fil d’Ariane
maps-index-title = { $count ->
    [one] Mapping MIDI batterie de { $count } plugin | Drumverter
   *[other] Mappings MIDI batterie de { $count } plugins | Drumverter
}
maps-index-description = { $count ->
    [one] Mapping MIDI batterie de { $count } plugin, et tables de conversion entre GetGood Drums, EZdrummer, Superior Drummer, Addictive Drums et d’autres.
   *[other] Mappings MIDI batterie de { $count } plugins, et tables de conversion entre GetGood Drums, EZdrummer, Superior Drummer, Addictive Drums et d’autres.
}
maps-index-heading = Mappings MIDI batterie
maps-index-intro = { $count ->
    [one] Le mapping des notes de { $count } plugin de batterie et des tables de conversion — les données mêmes qu’utilise le convertisseur Drumverter.
   *[other] Les mappings de notes de { $count } plugins de batterie et des tables de conversion entre les plus populaires — les données mêmes qu’utilise le convertisseur Drumverter.
}
maps-popular = Conversions populaires
maps-more-engines = Autres plugins
maps-matrix-corner = SOURCE ↓ CIBLE →
maps-pair-link = { $source } vers { $target }
maps-matrix-hint = Chaque flèche ouvre la table de conversion du plugin de la ligne vers celui de la colonne.
maps-all-engines = { $count ->
    [one] { $count } plugin
   *[other] Les { $count } plugins
}
maps-filter-engines-label = Filtrer les plugins
maps-filter-engines-placeholder = Filtrer les plugins…
maps-no-engines = Aucun plugin ne correspond
maps-engine-title = { $engineMidi } : mapping des notes de batterie | Drumverter
maps-engine-title-long-name = Mapping MIDI : { $engine } | Drumverter
maps-engine-description = { $engine } : mapping MIDI batterie complet, { $total ->
    [one] { $total } note avec le nom de l’élément
   *[other] { $total } notes avec le nom des éléments
}, en C-1 et en C-2.
maps-engine-description-short = { $engine } : mapping MIDI batterie avec les noms de notes en C-1 et C-2.
maps-engine-description-more = Convertissez gratuitement vos fichiers { $engineMidi } vers n’importe quel plugin.
maps-engine-heading = { $engine } : mapping MIDI batterie
maps-engine-intro = { $total ->
    [one] { $engine } répond à { $total } note MIDI, présentée ici avec son élément.
   *[other] { $engine } répond à { $total } notes MIDI, regroupées ici par élément.
} Les noms de notes peuvent s’afficher en C-1 (Reaper, Logic, Ableton, Guitar Pro) ou en C-2 (Studio One, Cubase, FL Studio).
maps-convert-to = Convertir vers { $engine }
maps-convert-from = Convertir depuis { $engine }
maps-filter-drums-label = Filtrer les éléments
maps-filter-drums-placeholder = Filtrer par élément ou note…
maps-octave-naming = Noms d’octave
maps-column-note = Note
maps-column-drum = Élément
maps-conversion-tables = Tables de conversion
maps-pair-heading = Convertir des fichiers { $sourceMidi } vers { $target }
maps-pair-title = Convertir des fichiers { $sourceMidi } vers { $target } | Drumverter
maps-pair-description = Convertir du MIDI batterie { $source } vers { $target } : { $exact } { $exact ->
    [one] note exacte
   *[other] notes exactes
}, { $approximated } { $approximated ->
    [one] remplacée
   *[other] remplacées
}, { $dropped } { $dropped ->
    [one] supprimée
   *[other] supprimées
}.
maps-pair-description-more = Convertisseur gratuit dans le navigateur.
maps-pair-summary = Sur { $total } { $total ->
    [one] note
   *[other] notes
} { $source }, { $exact } { $exact ->
    [one] a
   *[other] ont
} un équivalent exact dans { $target }, { $approximated } { $approximated ->
    [one] est remplacée
   *[other] sont remplacées
} par l’élément le plus proche, et { $dropped } { $dropped ->
    [one] n’a
   *[other] n’ont
} pas d’équivalent.
maps-pair-convert = Convertir { $source } → { $target }
maps-reverse = ⇄ Inverser le sens
maps-exact-count = { $count ->
    [one] { $count } exacte
   *[other] { $count } exactes
}
maps-approximated-count = { $count ->
    [one] { $count } remplacée
   *[other] { $count } remplacées
}
maps-dropped-count = { $count ->
    [one] { $count } supprimée
   *[other] { $count } supprimées
}
maps-rows = Lignes
maps-rows-changes = Différences { $count }
maps-column-engine-note = Note { $engine }
maps-column-engine-drum = Élément { $engine }
maps-column-to = vers
maps-column-result = Résultat
maps-no-equivalent = aucun équivalent
maps-status-exact = exacte
maps-status-approximated = remplacée
maps-status-dropped = supprimée
maps-more-from = Autres conversions depuis { $engine }
maps-full-maps = Mappings complets :
