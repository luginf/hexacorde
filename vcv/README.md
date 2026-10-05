# Hexacorde pour VCV Rack 2

Le séquenceur oraculaire en module VCV Rack, construit sur le cœur C++ de `../core`. Les hexagrammes se manipulent comme dans l'application web ; le son vient des autres modules du rack (VCO, filtres, enveloppes, FM...).

## Compiler et installer

1. Télécharger le **Rack SDK** 2.x (https://vcvrack.com/downloads) et le décompresser, par exemple dans `~/src/rack/Rack-SDK`.
2. `make RACK_DIR=~/src/rack/Rack-SDK` (ou, depuis la racine du dépôt, `make vcv`) puis `make install RACK_DIR=...` copie le plugin dans le dossier utilisateur de Rack. `make dist` fabrique `dist/Hexacorde-2.x.y-lin-x64.vcvplugin`.

Le module est compilé en C++17 (le cœur l'exige). Test fait avec Rack Free 2.6.6 sous Linux.

## Le module

| | |
|---|---|
| **TEMPO** + **RUN** | horloge interne en BPM (un pas = une croche), utilisée quand CLOCK n'est pas branchée |
| **CLOCK** | une impulsion = un pas (remplace l'horloge interne) |
| **RESET** | efface les impulsions en vol et remet le compteur de pas à 0 |
| **PRIME** (poly) | une impulsion sur le canal *i* amorce l'hexagone *i* |
| **ROTATE** (poly) | une impulsion sur le canal *i* fait tourner l'hexagone *i* d'un cran (sens horaire) |
| **PITCH** (poly) | V/oct, do4 = 0 V ; un canal par hexagone (16 au plus, dans l'ordre des lettres) |
| **GATE** (poly) | 10 V pendant 90 % d'un pas à chaque note |
| **VEL** (poly) | 0 à 10 V : trait plein 7,6 V (vélocité 96), trait brisé 4,4 V (56) |
| **STEP** | impulsion à chaque pas |

Plateau : clic sur un hexagone = l'amorcer ; clic sur un trait = plein / brisé ; glisser un trait = tourner par crans ; glisser le corps = déplacer ; molette = tourner ; **clic droit sur un hexagone** = hexagramme (par trigrammes), gamme (23), tonique, octave, rotation et vitesse, amorce tous les N pas, 7e côté, notes personnalisées (par trait, silence permis, recharger, mélanger), réinitialiser, désactiver, supprimer. **Clic droit sur le module** : tonalité globale (tonique, octave, gamme de tous), réglages (mutation, octave uniforme, portée douce), taille de la grille (colonnes x lignes, 3 à 12), nouvel hexagramme, tirage, placement au hasard, silence, **import / export d'un setup `.json`** (le même fichier que l'application web).

L'état complet est enregistré dans le patch (au format de setup de l'application web, clé `setup`).

## Limites de cette première version

Pas de sélection multiple au rectangle, interface et menus en anglais seulement, thème sombre seulement, 16 hexagones au plus en sortie (les suivants jouent mais ne sont pas câblés). Le son interne, les instruments MIDI et l'enregistrement de l'application web n'ont pas d'équivalent : on utilise les modules de Rack.

## Licence et publication

Le module est sous **GPL-3.0-or-later** (`LICENSE`, `plugin.json`), la licence que VCV recommande ; le cœur `../core` reste en BSD 3 clauses (la GPL peut l'inclure). Toutes les sources ont été écrites par le même auteur, ce qui permet cette répartition.

**Publier dans la VCV Library** : elle compile la *racine* d'un dépôt (`plugin.json` et `Makefile` à la racine), alors qu'ici le module est dans `vcv/` et utilise `../core`. `make vcv-release` (depuis la racine du dépôt, `OUT=dossier` pour choisir la destination, par défaut `../hexacorde-vcv`) exporte donc un **dépôt autonome** : le plugin, une copie des quatre en-têtes du cœur dans `core/` (avec sa licence BSD), les deux licences, un README anglais, un `.gitignore`, et un `plugin.json` dont les URL pointent vers ce dépôt (`REPO_URL=...` pour en changer, par défaut `https://github.com/luginf/hexacorde-vcv`). Le dépôt d'origine reste la source de vérité : on ré-exporte après chaque modification de `core/` ou `vcv/`.

Étapes : (1) `make vcv-release` ; (2) dans le dossier exporté : `git init`, commit, créer le dépôt GitHub `luginf/hexacorde-vcv` et pousser ; (3) compléter `authorEmail` si on le souhaite dans `vcv/plugin.json` (laissé vide : il serait public) et ré-exporter ; (4) ouvrir **un seul ticket** dans https://github.com/VCVRack/library/issues, titré exactement `Hexacorde` (le slug, libre dans la Library au 2026-10-05), avec l'URL du dépôt et le **hash du commit** (`git rev-parse HEAD`) ; l'équipe VCV compile pour Windows, Mac et Linux et publie ; (5) pour une mise à jour : augmenter `version` dans `vcv/plugin.json` (et `vcv/CHANGELOG.md`), ré-exporter, pousser, puis commenter le ticket avec la nouvelle version et le nouveau hash.

Non testé : la compilation sous Windows et Mac (la Library s'en charge et peut demander des corrections).
