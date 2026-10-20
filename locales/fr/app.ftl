brand-tagline = convertisseur de MIDI batterie
nav-converter = Convertisseur
nav-note-maps = Mappings
nav-drum-maps = Drum maps
section-guide-label = Mode d’emploi
section-guide-heading = Comment convertir du MIDI batterie
section-faq-label = FAQ
section-faq-heading = Questions fréquentes
section-issue-label = Signaler un problème
section-issue-heading = Signaler un problème
section-contact-label = Contact
section-contact-heading = Contact
section-terms-label = Conditions
section-terms-heading = Conditions d’utilisation
skip-to-content = Aller au contenu
nav-main = Principal
nav-site = Site
lang-menu-label = Langue
lang-load-failed = Impossible de charger la langue { $language }. Vérifiez votre connexion Internet et réessayez.
error-unknown-engine = Plugin { $role ->
    [source] source
   *[target] cible
} inconnu : « { $id } »
error-bad-midi = Le convertisseur ne peut pas lire ce fichier : il ne ressemble pas à un fichier MIDI
error-bad-preset = Ce n’est pas un fichier de preset
error-bad-overrides = Impossible de lire les modifications de notes
error-bad-missing = Réglage inconnu pour les éléments manquants
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
presets-unsaved = Impossible d’enregistrer les presets : le stockage du navigateur est plein ou bloqué. Ils seront perdus au rechargement.
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
unrecognized-label = Notes non reconnues
unrecognized-tip-title = Quand le plugin source ne reconnaît pas une note
unrecognized-tip = Certaines notes d’un fichier peuvent être absentes du mapping du plugin source, par exemple une partie écrite pour un autre kit. « Supprimer » les retire du fichier. « Garder telles quelles » les écrit sans changement, sur la même note. Le rapport les liste dans les deux cas.
unrecognized-remove = Supprimer
unrecognized-keep = Garder telles quelles
unrecognized-hint-remove = supprimées du fichier
unrecognized-hint-keep = gardées inchangées
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
row-chain-hint = { $target } n’a pas { $drum } : { $standIn } joue à la place. Votre modification envoie { $standIn } vers { $landed }. Cliquez pour aller à { $standIn }.
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
files-sample = Essayer avec un groove d’exemple
files-sample-needs-from = Choisissez d’abord un plugin source
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
done-view-report = Voir le rapport →
done-convert-more = Nouvelle conversion
done-report-mapping = Mapping erroné ? Signalez-le
done-removed = { $count ->
    [one] { $count } note de votre fichier est absente du mapping { $source } : elle a donc été supprimée. Mauvais plugin source ?
   *[other] { $count } notes de votre fichier sont absentes du mapping { $source } : elles ont donc été supprimées. Mauvais plugin source ?
}
done-kept = { $count ->
    [one] { $count } note de votre fichier est absente du mapping { $source } : elle a donc été gardée telle quelle. Mauvais plugin source ?
   *[other] { $count } notes de votre fichier sont absentes du mapping { $source } : elles ont donc été gardées telles quelles. Mauvais plugin source ?
}
done-pick-source = Choisir une autre source
done-assign-notes = Attribuer les notes
source-fit-missing = { $missing ->
    [one] { $missing } note sur { $hits } de votre fichier est absente du mapping { $source }.
   *[other] { $missing } notes sur { $hits } de votre fichier sont absentes du mapping { $source }.
} Plus proches : { $engines }
source-fit-all = { $engine } (toutes les notes)
source-fit-some = { $engine } ({ $count ->
    [one] { $count } note
   *[other] { $count } notes
})
drop-missing =Supprimer les éléments manquants et reconvertir
report-dropped = Supprimés
report-approximated = Remplacés
report-unrecognized = Non reconnues
report-dropped-hint = { $target } n’a pas cet élément
report-approximated-hint = remplacés par l’élément le plus proche
report-unrecognized-hint = notes absentes du mapping { $source } — supprimées du fichier
report-unrecognized-hint-kept = notes absentes du mapping { $source } — gardées telles quelles
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
maps-popular = Conversions populaires
maps-pair-link = { $source } vers { $target }
