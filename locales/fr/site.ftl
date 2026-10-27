section-guide-title = Convertir du MIDI batterie d’un plugin à l’autre
section-guide-description = Convertissez du MIDI batterie entre GetGood Drums, EZdrummer, Superior Drummer, Addictive Drums et plus de 80 plugins en trois étapes, gratuitement, dans votre navigateur.
section-faq-title = FAQ du convertisseur de MIDI batterie
section-faq-description = Tout sur Drumverter : prix, confidentialité, C-1 ou C-2, plusieurs fichiers à la fois et ce que deviennent les éléments absents du plugin cible.
section-issue-title = Signaler un problème
section-issue-description = Un élément mal mappé, ou un plugin qui manque dans Drumverter ? Signalez-le via le formulaire, sur GitHub ou par e-mail.
section-contact-title = Contact
section-contact-description = Questions, suggestions ou demandes de plugins pour Drumverter, le convertisseur de MIDI batterie gratuit qui fonctionne dans le navigateur.
section-terms-title = Conditions d’utilisation
section-terms-description = Conditions d’utilisation de Drumverter, le convertisseur de MIDI batterie gratuit dans le navigateur : fourni tel quel, fichiers jamais envoyés, statistiques anonymes sans cookies.
lang-offer = Cette page existe en français →
open-converter = Ouvrir le convertisseur
doc-ready-heading = Prêt à convertir ?
thanks-title = Merci
thanks-description = Merci de soutenir Drumverter, le convertisseur de MIDI batterie gratuit.
thanks-heading = Merci !
thanks-body = Grâce à votre café, Drumverter reste gratuit et sans pub. Stripe vous envoie le reçu par e-mail.
converter-description = Convertisseur de MIDI batterie gratuit : remappez vos MIDI batterie entre GetGood Drums, EZdrummer, Superior Drummer, Addictive Drums, General MIDI et Guitar Pro, dans le navigateur.
converter-og-description = Convertissez du MIDI batterie entre GetGood Drums, EZdrummer, Superior Drummer, Addictive Drums et plus de 80 autres plugins. Gratuit, dans le navigateur.
converter-image-alt = Drumverter — convertisseur de MIDI batterie
converter-twitter-description = Outil gratuit dans le navigateur pour remapper du MIDI batterie d’un plugin à l’autre.
converter-app-description = Outil gratuit dans le navigateur qui adapte le MIDI batterie au mapping de notes d’un autre plugin.
converter-noscript = Drumverter est un outil gratuit pour remapper du MIDI batterie. Il adapte un fichier MIDI batterie écrit pour le mapping de notes d’un plugin à celui d’un autre — par exemple de GetGood Drums vers EZdrummer, Superior Drummer, Addictive Drums, General MIDI ou Guitar Pro. Si un élément manque, il est remplacé par le plus proche, pour qu’aucune note ne se perde. Tout se passe dans votre navigateur ; activez JavaScript pour utiliser le convertisseur.
load-failed = Impossible de charger Drumverter. Vérifiez votre connexion Internet et actualisez la page.
load-failed-reload = Actualiser
maps-breadcrumb = Fil d’Ariane
maps-index-title =
    { $count ->
        [one] Mapping MIDI batterie de { $count } plugin
       *[other] Mappings MIDI batterie de { $count } plugins
    }
maps-index-description =
    { $count ->
        [one] Mapping MIDI batterie de { $count } plugin, et tables de conversion entre GetGood Drums, EZdrummer, Superior Drummer, Addictive Drums et d’autres.
       *[other] Mappings MIDI batterie de { $count } plugins, et tables de conversion entre GetGood Drums, EZdrummer, Superior Drummer, Addictive Drums et d’autres.
    }
maps-index-heading = Mappings MIDI batterie
maps-index-intro =
    { $count ->
        [one] Le mapping des notes de { $count } plugin de batterie et des tables de conversion — les données mêmes qu’utilise le convertisseur Drumverter.
       *[other] Les mappings de notes de { $count } plugins de batterie et des tables de conversion entre les plus populaires — les données mêmes qu’utilise le convertisseur Drumverter.
    }
maps-more-engines = Autres plugins
maps-matrix-corner = SOURCE ↓ CIBLE →
maps-quick-label = Plugins les plus utilisés
maps-note-count =
    { $count ->
        [one] { $count } note
       *[other] { $count } notes
    }
maps-matrix-heading = Toutes les paires entre les { $count } principaux
maps-matrix-share = { $percent } %
maps-matrix-share-label = { $source } vers { $target } : { $percent } % des notes correspondent exactement
maps-matrix-hint = Chaque case indique la part des notes qui correspondent exactement et ouvre cette table.
maps-all-engines =
    { $count ->
        [one] { $count } plugin
       *[other] Les { $count } plugins
    }
maps-filter-engines-label = Filtrer les plugins
maps-filter-engines-placeholder = Filtrer les plugins…
maps-no-engines = Aucun plugin ne correspond
maps-engine-title = { $engineMidi } : mapping des notes de batterie
maps-engine-title-long-name = Mapping MIDI : { $engine }
maps-engine-description =
    { $engine } : mapping MIDI batterie complet, { $total ->
        [one] { $total } note avec le nom de l’élément
       *[other] { $total } notes avec le nom des éléments
    }, en C-1 et en C-2.
maps-engine-description-short = { $engine } : mapping MIDI batterie avec les noms de notes en C-1 et C-2.
maps-engine-description-more = Convertissez gratuitement vos fichiers { $engineMidi } vers n’importe quel plugin.
maps-engine-heading = { $engine } : mapping MIDI batterie
maps-engine-intro =
    { $total ->
        [one] { $engine } répond à { $total } note MIDI, présentée ici avec son élément.
       *[other] { $engine } répond à { $total } notes MIDI, regroupées ici par élément.
    } Les noms de notes peuvent s’afficher en C-1 (Reaper) ou en C-2 (Ableton Live, Logic Pro, Cubase, Studio One).
maps-convert-to = Convertir vers { $engine }
maps-convert-from = Convertir depuis { $engine }
maps-filter-drums-label = Filtrer les éléments
maps-filter-drums-placeholder = Filtrer par élément ou note…
maps-octave-naming = Noms d’octave
maps-column-note = Note
maps-column-drum = Élément
maps-conversion-tables = Tables de conversion
maps-all-notes = Les { $total } notes
maps-groups-label = Groupes d’éléments
maps-extra-hint = Les lignes estompées sont des notes supplémentaires pour un élément qui a déjà une note principale.
maps-pairs-from = De { $engine } vers
maps-pairs-to = Vers { $engine } depuis
maps-core-heading = Les notes que vous utiliserez le plus
maps-core-hint = La note principale de chaque élément, celle qu’écrit le convertisseur.
maps-pair-heading = Convertir des fichiers { $sourceMidi } vers { $target }
maps-pair-title = Convertir des fichiers { $sourceMidi } vers { $target }
maps-pair-description =
    Convertir du MIDI batterie { $source } vers { $target } : { $exact } { $exact ->
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
maps-pair-description-short = Convertir du MIDI batterie { $source } vers { $target }.
maps-pair-summary =
    Sur { $total } { $total ->
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
maps-pair-rack-lead = Vous jouez en live dans Ableton ?
maps-pair-rack-link = Télécharger le rack (.adg)
maps-pair-rack = Placez-le devant { $target } : { $sourceMidi } joue juste, sans fichier à convertir. Live 11 et 12.
maps-pair-rack-dropped = Les éléments absents de { $target } restent muets ; leurs lignes n’affichent qu’un nom de note.
maps-steps-label = Convertir en trois étapes
maps-reverse = ⇄ Inverser le sens
maps-exact-count =
    { $count ->
        [one] { $count } exacte
       *[other] { $count } exactes
    }
maps-approximated-count =
    { $count ->
        [one] { $count } remplacée
       *[other] { $count } remplacées
    }
maps-dropped-count =
    { $count ->
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
maps-changes-heading = Ce qui change
maps-changes-plays = joue { $sources }
maps-changes-dropped = { $target } n’a aucun élément pour { $sources }.
maps-changes-none = Chaque note de { $source } tombe sur son propre élément dans { $target }.
maps-table-heading = Toutes les notes, élément par élément
maps-more-from = Autres conversions depuis { $engine }
maps-full-maps = Mappings complets :
maps-index-drum-maps = Drum maps pour votre DAW, pour chaque plugin : Cubase, Reaper, Studio One, Ableton Live et Logic Pro
maps-engine-description-drum-maps = Drum maps gratuites pour Cubase, Reaper, Studio One, Ableton et Logic.
maps-daw-heading = Drum maps pour votre DAW
maps-daw-intro = Chargez l’un de ces fichiers dans votre DAW pour voir sur les touches du piano roll les noms des éléments ({ $engine }), ou imprimez le mapping.
maps-daw-how = Charger une drum map dans Reaper, Cubase, Studio One, Ableton Live ou Logic Pro
maps-note-map-pdf = Mapping
maps-note-map-pdf-label = Mapping de { $engine } (PDF)
drum-maps-title =
    { $count ->
        [one] Drum maps pour Cubase, Reaper, Studio One, Ableton et Logic : { $count } plugin
       *[other] Drum maps pour Cubase, Reaper, Studio One, Ableton et Logic : { $count } plugins
    }
drum-maps-description =
    { $count ->
        [one] Drum maps gratuites pour { $count } plugin : drum maps Cubase (.drm), noms de notes Reaper (.txt), pitch lists Studio One (.pitchlist), racks Ableton Live (.adg) et modèles Step Sequencer de Logic Pro (.pattern).
       *[other] Drum maps gratuites pour { $count } plugins : drum maps Cubase (.drm), noms de notes Reaper (.txt), pitch lists Studio One (.pitchlist), racks Ableton Live (.adg) et modèles Step Sequencer de Logic Pro (.pattern).
    }
drum-maps-heading = Drum maps pour votre DAW
drum-maps-intro =
    { $count ->
        [one] Drum maps gratuites pour { $count } plugin de batterie, tirées des mêmes mappings que le convertisseur. Chaque fichier nomme toutes les notes que joue le plugin : le piano roll affiche les noms des éléments au lieu des numéros de note. Les fichiers utilisent les numéros de note MIDI et fonctionnent donc avec les deux conventions d’octave.
       *[other] Drum maps gratuites pour { $count } plugins de batterie, tirées des mêmes mappings que le convertisseur. Chaque fichier nomme toutes les notes que joue le plugin : le piano roll affiche les noms des éléments au lieu des numéros de note. Les fichiers utilisent les numéros de note MIDI et fonctionnent donc avec les deux conventions d’octave.
    }
drum-maps-pick-daw = Votre DAW
drum-maps-most-used = Les plus utilisés
drum-maps-how-heading = Charger une drum map
drum-maps-reaper = Dans l’éditeur MIDI, choisissez File → Note/CC names → Load note/CC names from file, puis le fichier .txt.
drum-maps-cubase = Ouvrez MIDI → Configuration des Drum Maps (Drum Map Setup), cliquez sur Charger et choisissez le fichier .drm. Sélectionnez ensuite la map dans le champ Drum Map de l’Inspecteur de la piste.
drum-maps-studio-one = Dans la vue Edit, cliquez sur l’icône de clé pour afficher les noms de notes, puis glissez le fichier .pitchlist dessus. Enregistrez-le depuis le menu Pitch Names pour le réutiliser.
drum-maps-ableton = Glissez le fichier .adg sur la piste de batterie dans Live 11 ou 12, devant le plugin. Ouvrez un clip : chaque ligne de l’éditeur MIDI affiche le nom de son élément. Les notes jouent telles quelles.
drum-maps-logic = Copiez le fichier .pattern sur votre Mac dans ~/Music/Audio Music Apps/Step Sequencer Settings/Patterns. Dans Logic Pro, ouvrez le Step Sequencer de la piste de batterie puis le Pattern Browser (⌥⇧B), choisissez Patterns → User et cliquez sur le modèle. Chaque ligne affiche le nom de son élément et joue sa note.
drum-maps-pdf = Ouvrez le .pdf dans n’importe quel lecteur PDF : il montre chaque note par élément, avec son numéro et son nom. Imprimez-le ou gardez-le à côté de votre DAW.
drum-maps-other = FL Studio et Bitwig Studio ne savent pas charger de fichiers de noms de notes. Servez-vous du mapping du plugin pour trouver chaque élément, ou convertissez votre MIDI vers le plugin que vous utilisez.
drum-maps-list-heading =
    { $count ->
        [one] Drum maps de { $count } plugin
       *[other] Drum maps des { $count } plugins
    }
drum-maps-download-label = Drum map { $engine } pour { $daw }
