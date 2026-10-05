# Hexacorde : cœur C++

Licence BSD 3 clauses (voir `../LICENSE`), y compris quand le cœur est copié dans le module VCV Rack (lui-même en GPLv3).

Le moteur du séquenceur en C++17, **sans dépendance** (en-têtes seulement), portage fidèle de `docs/src/js/01` à `06` et `15` de l'application web. Il ne fait ni son, ni MIDI, ni interface : à chaque pas, `Engine::step()` renvoie les notes jouées. Les coques (module VCV Rack dans `../vcv`, plugin JUCE dans `../juce`) s'en servent.

| Fichier | Rôle |
|---|---|
| `hexacorde.hpp` | `Engine` : hexagones, impulsions, `step()`, rotation, mutation, amorce, édition (`addSlot`, `setSides`, `shuffleCustom`, `setGridSize`...) |
| `setup.hpp` | `Engine::loadSetup` / `saveSetup` : même format JSON et mêmes vérifications que l'application web |
| `json.hpp` | mini JSON (analyse et écriture) |
| `tables.hpp` | **généré** par `gen_tables.js` depuis les sources JS de `docs/src/js/` : gammes (23, avec noms anglais et français), table du Roi Wen, noms des 64 hexagrammes |
| `test/` | test de fidélité contre l'application web |

## Utilisation

```cpp
#include "hexacorde.hpp"
hexa::Engine e;                         // les six hexagrammes de départ
e.prime(*e.byLabel('A'));               // amorcer A
for (const hexa::NoteEvent& n : e.step())   // un pas = une croche
    use(n.channel, n.midi, n.velocity);     // midi 0..127, vélocité 96 (plein) ou 56 (brisé)
std::string json = e.saveSetup();       // ou e.loadSetup(json, &err), même format que le setup web
```

Le son (`Engine::sound`, `chanSound`) et les instruments MIDI (`program`) ne sont que des **données** lues et écrites avec le setup ; la synthèse est l'affaire de la coque.

## Test de fidélité

`make core-test` (depuis la racine) génère `tables.hpp`, compile `test/test_core.cpp` et le compare à `test/ref.txt` : huit scénarios (mutation, rotation, heptagone, gammes, notes personnalisées, amorces, grille 8x5, hexagone désactivé...) dont la suite **exacte** de notes a été produite par l'application web dans Chrome ; le C++ doit rejouer la même, réécrire le même JSON de setup et donner les mêmes notes personnalisées sur les 23 gammes. Après une modification du JS qui change le comportement : `make core-ref` (demande `google-chrome`) régénère `ref.txt`, puis `make core-test`.
