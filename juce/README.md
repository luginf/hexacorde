# Hexacorde : plugin JUCE

Plugin (VST3 et application autonome, LV2 en option) construit sur le cœur C++ de `../core` : mêmes hexagrammes, même propagation, mêmes fichiers de setup `.json` que l'application web et le module VCV Rack.

**Licence : GPL-3.0-or-later** pour le code de ce dossier (`LICENSE`). JUCE lui-même est sous AGPL-3.0 ou licence commerciale : un binaire construit avec JUCE sous AGPL doit être distribué sous AGPL. Le cœur (`../core`) reste en BSD 3 clauses.

## Construire

```
make juce                            # depuis la racine : télécharge JUCE 8.0.9, compile en Release
make juce JUCE_DIR=~/src/JUCE        # avec une copie locale de JUCE
cmake -S juce -B juce/build -DHEXA_LV2=ON   # aussi le format LV2
make juce-test                       # teste l'horloge, puis processBlock sans interface ni carte son
```

Sous Linux il faut les paquets de développement habituels de JUCE (`libasound2-dev libfreetype-dev libfontconfig1-dev libx11-dev libxrandr-dev libxinerama-dev libxcursor-dev libgl1-mesa-dev`). Les produits sont dans `juce/build/Hexacorde_artefacts/Release/` (`Standalone/Hexacorde`, `VST3/Hexacorde.vst3`).

## Fonctionnement

- **Un pas = une croche** (une demi-noire). Quand l'hôte joue (et que « Follow the host transport » est coché), les pas tombent sur la position de l'hôte, au tempo de l'hôte (`StepClock::host`). Sinon, l'horloge interne tourne à `Tempo (BPM)` quand `Run` est coché (`StepClock::internal`). Cliquer un hexagone l'amorce et lance l'horloge interne, comme sur la page web.
- **Sortie MIDI** : une note par trait joué, sur le canal de l'hexagone (réglable par hexagone, ou un canal commun), vélocité 96 (plein) / 56 (brisé), durée 90 % d'un pas. Elle va vers l'hôte (le plugin déclare une sortie MIDI) et, en plus, vers un port MIDI choisi dans `Options > MIDI output` (port virtuel « Hexacorde » sous Linux et macOS, utile en application autonome). Les program change du setup sont envoyés au démarrage et au changement de sortie.
- **Entrée MIDI** : une note reçue amorce un hexagone (numéro de note modulo nombre d'hexagones).
- **Synthé interne** (`Options > Internal synth`, volume en paramètre) : oscillateur carré, dent de scie, triangle, sinus ou FM, enveloppe ADSR et filtre, lus dans le `son` / `sons` du setup. Pas d'enveloppe de filtre pour l'instant.
- **Plateau** : mêmes gestes que le web (clic = amorcer, clic sur un trait = le basculer, glisser un trait ou molette = tourner, glisser le corps = déplacer, clic droit = menu de l'hexagone ou du plateau).
- **Paramètres exposés à l'hôte** : tempo, horloge interne, suivi de l'hôte, synthé, volume. L'état complet (setup, sortie MIDI choisie) est sauvegardé avec le projet de l'hôte, dans le même format de setup que le web.

## Fichiers

| Fichier | Rôle |
|---|---|
| `src/StepClock.h` | horloge de pas sans dépendance (position de l'hôte ou BPM interne), testée par `test/test_clock.cpp` |
| `test/test_processor.cpp` | appelle `processBlock` à la main (horloge interne, hôte simulé, état) et compare les notes MIDI, échantillon par échantillon, à celles du cœur seul |
| `src/PluginProcessor.*` | `processBlock` : pas, notes, note off différés, sortie MIDI, état |
| `src/SimpleSynth.h` | synthé interne |
| `src/PluginEditor.*` | barre d'outils, plateau (`BoardComponent`), menus |

Le moteur est protégé par un `std::mutex` : le fil audio ne le prend qu'aux pas et aux amorces, l'interface en prend une copie à chaque image.
