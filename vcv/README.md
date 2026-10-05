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

Licence : BSD 3 clauses pour le code d'Hexacorde. Rack est sous GPLv3 : vérifier les conditions du Rack SDK avant de distribuer un binaire (par exemple dans la VCV Library).
