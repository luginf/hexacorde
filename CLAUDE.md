# Hexacorde

Séquenceur oraculaire en HTML + JS pur (un seul fichier, `index.html`, aucune dépendance). Six hexagrammes du Yi Jing sont posés sur une grille de 6x6 points. Chaque trait joué envoie une impulsion vers un autre hexagramme, et les impulsions se répercutent de proche en proche.

Le son interne est un simple oscillateur carré (WebAudio), désactivable. La sortie MIDI en direct (Web MIDI) vers un synthé externe (JV-880, D110...) et l'export en fichier .mid existent (voir plus bas). Une version uxn est envisagée plus tard.

Fonctions actuelles : 6 hexagrammes sur grille 6x6, propagation d'impulsions, choix de l'hexagramme parmi les 64 avec son nom du Yi Jing, chromatique ou gammes par hexagone, notes personnalisées par hexagone, tonique globale, rotation individuelle (vitesse et sens) et rotation manuelle, réinitialisation individuelle, sauvegarde et chargement de setups (mémoire, fichier, texte), mutation des traits, amorce automatique, tirage et placement aléatoires, sortie MIDI en direct, enregistrement vers un fichier MIDI. Voir `README.md` pour la présentation côté utilisateur.

## Conventions de conception

### Hexagramme et géométrie
- Un hexagramme = 6 bits dans `slot.lines` (1 = trait plein / yang, 0 = trait brisé / yin).
- Convention d'Alan : le trait 1 est **en haut**, puis on suit l'hexagone dans le **sens horaire** (haut, haut-droite, bas-droite, bas, bas-gauche, haut-gauche). Ce n'est pas la convention traditionnelle (trait 1 en bas).
- Hexagone à côté plat en haut. Le côté `k` regarde dans la direction `SIDE_DIR[k]`.
- 6 emplacements (A à F) sur les points d'une grille 6x6, un hexagone maximum par point.

### Nom et choix de l'hexagramme (Yi Jing)
- Les 64 hexagrammes suivent l'ordre du Roi Wen (tables `KW`, `HEX_NAMES`, `TRIGRAM`). Nom affiché : numéro, nom pinyin et nom français (Wilhelm / Javary approximatifs), sous l'hexagone sur la grille (numéro et pinyin) et en entier dans le menu du panneau.
- **Convention de lecture** : `lines[0]` est le trait 1 de l'hexagramme (le trait du bas dans la tradition), `lines[0..2]` forment le trigramme inférieur et `lines[3..5]` le supérieur, chaque trigramme lu de bas en haut. La disposition « trait 1 en haut » de l'hexagone n'est qu'une présentation. Si Alan veut l'inverse (trait 1 = trait du haut de la tradition), il suffit d'inverser les traits dans `hexNumber` et `HEX_LINES`.
- Le menu d'hexagramme de chaque emplacement fait les deux : il affiche l'hexagramme courant (mis à jour quand on bascule un trait, par mutation ou par tirage) et permet d'en choisir un (`setHexagram`), ce qui devient aussi sa forme de départ.
- **Réinitialisation** (bouton Réinit. par hexagone, `resetSlot`) : traits remis à `slot.initial` (forme du chargement, du dernier tirage ou du dernier choix dans le menu ; les clics sur les traits et la mutation ne la modifient pas), rotation à 0, playhead et impulsions en attente vers cet hexagone effacés. Position, gamme, canal et réglages de rotation inchangés.

### Notes
- **Chromatique** (défaut) : le côté `k` donne la paire de demi-tons `2k` (plein) / `2k+1` (brisé) : do/do#, ré/ré#, mi/fa, fa#/sol, sol#/la, la#/si. Un hexagramme est donc un hexacorde qui couvre les 12 notes.
- **Gammes** (choisies par hexagone) : le côté `k` joue le degré `k` de la gamme (au-delà de la dernière note, on repart à l'octave : `steps[k % n] + 12 * floor(k / n)`). Trait plein : la note est jouée **et renvoyée**. Trait brisé : **silence, aucune impulsion émise**. Gammes : majeur, mineur naturel, dorien, phrygien, lydien, mixolydien, pentatonique majeure et mineure. Table `SCALES`.
- **Notes personnalisées** (optionnelles, par hexagone, `slot.customOn` / `slot.custom`) : pour chacun des 6 traits, une note pour le trait plein (`p`) et une pour le trait brisé (`b`, ou `null` = silence), de 0 à 23 demi-tons au-dessus de la tonique (2 octaves ; une apostrophe `'` dans les étiquettes marque l'octave supérieure). Elles remplacent alors la table chromatique ou la gamme (`offsetOf`). Un brisé avec une note joue en doux et émet une impulsion douce comme en chromatique ; un brisé à `null` est muet et n'émet rien. `fillCustom` copie la gamme actuelle comme point de départ. Les valeurs restent mémorisées quand l'option est décochée.
- La tonique est globale (`opt.tonic`) et transpose tout, chromatique et notes personnalisées compris.
- L'octave dépend de la rangée de la grille : rangées du bas graves (do3), rangées du haut aiguës (do5) (voir `midiOf`).
- Vélocité : trait plein fort (0.16), trait brisé doux (0.08).

### Propagation
- Horloge discrète (un pas = `tickMs`). Chaque hexagone déclenché a un playhead qui joue ses 6 côtés à la suite, un par pas, en partant du côté d'entrée (`slot.ph`).
- À chaque côté joué, une impulsion part dans la direction du côté. Cible = l'hexagone le plus proche dans le secteur de 60° centré sur cette direction (secteurs demi-ouverts `[k*60-30, k*60+30)` depuis le haut, sens horaire, donc l'horizontale exacte va au secteur du bas). Délai = `ceil(distance)` pas, donc l'espacement fixe le rythme.
- Pas de cible ou hors de portée : l'impulsion s'éteint (étincelle visuelle).
- Émission : trait plein = impulsion forte, portée illimitée. Trait brisé (chromatique seulement) = impulsion douce, portée courte (`opt.softRange`, 2.5 cases).
- Réception sur le côté `(k+3)%6` : si le côté touché est plein, l'hexagone **rebondit** (playhead relancé sur ce côté) ; s'il est brisé, l'impulsion **traverse** et repart dans la même direction avec sa portée restante, sans faire sonner.
- **Rotation** (case par hexagone, ou « ↻ tous ») : l'hexagone tourne par pas de 60° à la fin de chaque pas d'horloge. Réglages par hexagone : **sens** `rotDir` (+1 horaire ↻, -1 antihoraire ↺, bouton) et **vitesse** `rotSpeed` (×1, ×2, ×3 = 1, 2 ou 3 pas de 60° par pas ; ÷2, ÷3, ÷4, ÷8 = un pas de 60° tous les 2, 3, 4 ou 8 pas, via l'accumulateur `rotAcc`). `slot.rot` est un entier signé qui n'est jamais ramené à 0 (donc toujours utiliser `mod6`). Chaque trait **garde sa note** (le trait 1 reste do), mais il est à la position physique `(k + rot) % 6`. Donc l'émission du trait `k` part vers `mod6(k + rot)`, et un côté physique `s` touché à la réception correspond au trait `mod6(s - rot)`. Les traits (et leurs zones de clic) sont dans le groupe SVG `slot.rotG` qui tourne ; les étiquettes de note suivent mais restent droites (`applyRotation`). L'animation est pilotée par le temps réel : `slot.rotT0` (date du dernier tour en ms), `slot.rotDur` (un pas d'horloge pour la rotation auto, 160 ms pour la manuelle) et `slot.rotDelta` (dernier tour signé), donc elle joue aussi à l'arrêt.
- **Rotation manuelle** (`rotateBy(slot, +1|-1)`) : boutons ↺ 60° / ↻ 60° du menu clic droit, ou molette sur l'hexagone (bas = horaire, haut = antihoraire). Elle modifie `slot.rot` comme la rotation automatique.
- Mutation (option) : une impulsion de polarité opposée au côté touché inverse ce trait (forte sur brisé, douce sur plein), après le traitement de la réception.
- Garde-fou : `MAX_PULSES` impulsions en vol maximum.

### Interface
- Clic gauche sur un hexagone : l'amorcer (côté 0) et lancer l'horloge. Glisser : déplacer (accroche sur un point libre). Clic sur un trait : le basculer. Les autres boutons de la souris n'amorcent pas (`beginDrag` ignore `button !== 0`).
- **Clic droit** sur un hexagone : menu flottant (`openMenu`, fichier `16-menu.js`) qui reprend **tous les réglages du bloc du panneau** (hexagramme, gamme, canal MIDI, rotation active / sens / vitesse, Réinit.), plus les boutons ↺ / ↻ de 60° et l'éditeur de notes personnalisées (modifier une note active l'option, « Reprendre la gamme » recopie la gamme). Se ferme au clic ailleurs ou avec Échap. Pas d'équivalent tactile pour l'instant.
- **Panneau et menu partagent leurs réglages** : `setMode`, `setChannel`, `setRotOn`, `setRotDir`, `setRotSpeed` (dans `13-controls.js`) mettent à jour l'état **et** les contrôles du panneau ; `setHexagram` et `resetSlot` passent par `drawSlot` qui resynchronise le menu d'hexagramme. Le menu est reconstruit à chaque ouverture, donc il reflète toujours l'état. Tout nouveau réglage par hexagone doit passer par un setter de ce type et être ajouté aux deux endroits.
- **Repli** : toute la zone des blocs par hexagone est dans `<details id="hexEdit">` (flèche « Hexagrammes : édition »), pour atteindre vite le bas du panneau ; l'état ouvert / fermé est retenu dans `localStorage` (`hexacorde.hexEditOpen`).
- Panneau : jouer / pause, pas, volume, portée douce, mutation, amorce automatique de A, MIDI en direct (activer, sortie, son interne), enregistrement en fichier MIDI et nom du fichier, tonique, tirage, placement au hasard. Puis un bloc par hexagone : choix de l'hexagramme (avec nom), gamme, canal MIDI, rotation (case, sens, vitesse) et Réinit. Menu « Tous » pour la gamme et case « ↻ tous » pour la rotation. Enfin un bloc repliable « Setup » (voir plus bas).

### Setup : sauvegarde et chargement
- Le setup contient : pas, tonique, portée douce, mutation, amorce, et pour chaque hexagone position, traits, forme de départ, gamme, canal, rotation (active, sens, vitesse, angle) et notes personnalisées (seulement si actives). Il ne contient pas les impulsions en cours, le volume, la sortie MIDI, ni le son interne.
- **Date et nom** : le setup contient `"date"` (ISO 8601 local avec fuseau, ex. `2026-10-04T18:34:40+02:00`, ignorée au chargement). Le champ Nom est pré-rempli avec `setup-AAAA-MM-JJ_HH-MM-SS` (pas de « : » dans un nom de fichier) et rafraîchi à chaque sauvegarde (Sauver, Fichier) tant que l'utilisateur ne l'a pas modifié ni chargé un setup (`autoName`, `refreshName`, `stamp` dans `15-setup.js`).
- **Texte** : JSON lisible, un hexagramme par ligne (`setupToText`). Exemple de champ : `{"lettre":"A","pos":[2,4],"traits":"010000","depart":"010000","gamme":"phrygien","canal":1,"rotation":{"active":false,"sens":"horaire","vitesse":"x1","angle":0}}`. Vitesses : `x1 x2 x3 /2 /3 /4 /8`. Angle multiple de 60. À la main, on peut remplacer `traits` par `"numero": 1..64`. Le champ `hexacorde: 1` est la version du format. Les clés sont en français.
- **Mémoire** : `localStorage`, clé `hexacorde.setups` (objet nom -> setup). Boutons Sauver, Charger, Suppr. **Fichier** : bouton « Fichier .json » (téléchargement) et « Ouvrir... » (lecture d'un .json ou .txt). **Copier / coller** : « Texte / Copier » écrit le setup dans la zone et le copie ; « Appliquer » charge le texte de la zone (tolère du texte autour de l'objet JSON).
- Le chargement vérifie tout avant de modifier l'état (`parseSetup` renvoie `{ error }` ou `{ cfg }`) : 6 hexagrammes, positions entières dans la grille et distinctes, traits ou numéro, gamme connue, canal 1 à 16, vitesse et angle valides, notes de 0 à 23. En cas d'erreur, rien ne change et le message s'affiche sous la zone. `applySetup` appelle `silence()` puis met à jour le panneau.
- Code : `15-setup.js` (`getSetup`, `setupToText`, `parseSetup`, `applySetup`).

### Sortie MIDI en direct (Web MIDI)
- Bouton « Activer le MIDI » : `navigator.requestMIDIAccess()` (Chrome, Edge, Firefox ; pas Safari). **Firefox masque `navigator.requestMIDIAccess` en `file://`** (vérifié avec Firefox 157 : `undefined` en `file://`, `function` en `http://localhost`, `isSecureContext` vrai dans les deux cas) : il faut servir la page (`python3 -m http.server`, puis `http://localhost:8000`). Chrome fonctionne aussi en `file://`. Le message d'erreur de la page distingue les deux cas, puis menu des sorties, rafraîchi aux branchements (`onstatechange`).
- Chaque hexagone a son **canal** (`slot.channel`, A = 1 par défaut, réglable de 1 à 16). À chaque note jouée (`step`) : note on immédiat, note off planifié par le navigateur à `performance.now() + 0.9 * tickMs` (aucun `setTimeout`). Même vélocité que le fichier (96 / 56).
- `midiPanic()` (CC 123 sur les 16 canaux) à Pause, Silence, Réinit., changement de sortie ou de canal, et à la fermeture de la page.
- Case « Son interne » : décochée, l'oscillateur carré est coupé pour n'entendre que le synthé.
- Pas de program change, de bank select ni de clock envoyés pour l'instant.

### Enregistrement en fichier MIDI
- Case « Enregistrer en fichier MIDI » + champ « Nom ». Quand elle est cochée, tout ce qui sonne entre Jouer et Pause est enregistré ; à la Pause (ou en décochant), le fichier `nom-AAAAMMJJ-HHMMSS.mid` est téléchargé par le navigateur (un fichier horodaté par prise, rien n'est écrasé).
- Format 1, 480 PPQ. Piste 0 = tempo et signature 4/4. Ensuite une piste par hexagone ayant sonné, **canal = canal choisi pour l'hexagone** (A = canal 1 ... F = canal 6 par défaut), noté dans chaque événement au moment où il est joué. Nom de piste : `Hexacorde A <gamme>`.
- Un pas de simulation = une croche (240 ticks), donc tempo = `2 * tickMs` ms par noire. Les changements de pas en cours d'enregistrement deviennent des événements de tempo. Les événements sont stockés par numéro de pas (aucune gigue) et le silence de tête est supprimé à l'export.
- Vélocité : trait plein 96, trait brisé 56. Durée de note : 90 % d'un pas.
- Code : `beginRecording`, `recNote(slot, midi, vel)`, `recTempo`, `buildMidi`, `finishRecording`.

## Code et build
**`index.html` est généré : ne pas l'éditer à la main.** Les sources sont dans `src/` et `make` les assemble (il est conservé dans le dossier pour pouvoir simplement l'ouvrir).

- `src/template.html` : le HTML, avec deux repères `/*@@CSS@@*/` et `//@@JS@@`.
- `src/style.css` : le CSS.
- `src/js/NN-nom.js` : le JS, concaténé **dans l'ordre des numéros** par le `Makefile` à l'intérieur d'une seule fonction `(() => { 'use strict'; ... })();`. Les fichiers partagent donc la même portée (pas de `import` / `export`) : ils ne sont pas isolés, mais chacun a une responsabilité. Un fichier ne doit utiliser au chargement que ce que les fichiers précédents ont défini (les fonctions et gestionnaires peuvent, eux, appeler des choses définies plus loin, puisqu'ils s'exécutent après le chargement).
- `Makefile` : `make` (construit `index.html`), `make check` (`node --check` sur le JS assemblé), `make serve` (serveur local sur le port 8000, nécessaire à Firefox pour Web MIDI), `make clean` (supprime `build/`). `build/app.js` est le JS assemblé intermédiaire.

Fichiers JS, dans l'ordre :
| Fichier | Rôle |
|---|---|
| `01-constants.js` | grille, directions, noms de notes, gammes (`SCALES`) |
| `02-hexagrams.js` | 64 hexagrammes : `KW`, `HEX_NAMES`, `hexNumber`, `HEX_LINES`, `hexLabel` (sans dépendance) |
| `03-geometry.js` | `mod6`, `px`, `vertex`, `sideEnds`, `sideMid` |
| `04-state.js` | `slots`, impulsions, horloge, `opt` |
| `05-simulation.js` | notes (`offsetOf`, `midiOf`), cibles, `emit`, `receive`, `step`, `rotateBy`, `resetSlot`, `setHexagram` |
| `06-clock.js` | `schedule`, `start`, `stop`, `silence` |
| `07-midi-file.js` | enregistrement et export `.mid`, `download` |
| `08-midi-out.js` | `midiNote`, `midiPanic` (Web MIDI) |
| `09-audio.js` | son interne carré |
| `10-board.js` | SVG, `drawSlot`, `applyRotation` |
| `11-drag.js` | glisser-déposer, clic sur un hexagone |
| `12-frame.js` | boucle d'animation `frame` |
| `13-controls.js` | panneau : réglages, bloc par hexagone, tirage, placement |
| `14-midi-ports.js` | interface MIDI : activer, choisir la sortie |
| `15-setup.js` | sauvegarde et chargement de setups |
| `16-menu.js` | menu du clic droit |
| `99-start.js` | lance l'animation |

Pour ajouter un module : créer `src/js/NN-nom.js` (numéro entre ceux des fichiers dont il dépend et de ceux qui l'utilisent) avec une première ligne `//: description`, puis `make`. Comme tout est dans une seule portée, deux fichiers ne peuvent pas déclarer le même nom.

Points d'attention :
- Dans `step`, chaque note jouée passe par `playNote`, `midiNote` et `recNote` avec le même `midi` calculé par `midiOf(slot, off)`.
- État d'un hexagone (`slots[i]`) : voir plus haut.
- Mise en page : la grille reste fixe en haut, le panneau latéral défile seul ; en dessous de 820 px, tout s'empile.

## Existant et originalité (recherche web du 2026-10-04)
Trois recherches rapides (outil limité aux résultats américains, donc non exhaustif) n'ont trouvé aucun séquenceur équivalent. Rapprochements partiels :
- **Propagation d'impulsions sur une grille** : [Grid Music](https://cdm.link/newswires/grid-music-goes-beyond-traditional-synths-sequencers-through-its-unique-generative-propagation-model/) (impulsions entre cellules, changements de direction aléatoires), [Gridi](https://github.com/bobbymeyer/gridi/pull/1) (séquenceur MIDI spatial, nœuds reliés par des lignes), [Grid de Bitwig](https://www.bitwig.com/the-grid/). Cases ou câbles, pas d'hexagones orientés.
- **Yi Jing et musique** : [Music of Changing Lines](https://arxiv.org/html/2605.20386) (tirage aux pièces interprété par une IA, musique générée en Web Audio / Tone.js), [John Cage](https://interlude.hk/new-music-for-the-20th-century-john-cage-inspired-by-the-book-of-i-ching/) (hexagrammes comme source de hasard pour les paramètres). L'hexagramme y est une source de hasard ou de sens, pas un instrument.
- **« I Ching Sequencer »** en Flash : compare l'ordre du Roi Wen à d'autres ordres en faisant défiler les hexagrammes ; aucun détail trouvé sur une sortie MIDI. Voir aussi [Visualizing I-Ching (OSU)](https://designviz.osu.edu/iching/).
- **Non trouvé** : un outil où chaque trait d'un hexagramme est une note, où l'hexagone émet vers le voisin qu'il regarde (trait plein ou brisé = rebond ou traversée), et où il tourne de 60° par pas. C'est l'angle original d'Hexacorde.
- Pistes de recherche non faites : GitHub, forums de musique générative et de modulaire (Lines, VCV Rack, Max/MSP).

## Pistes d'évolution
- MIDI en direct : program change / bank select par canal (pour choisir les patchs du JV-880), clock MIDI, entrée MIDI pour amorcer.
- Pas de sauvegarde de l'état (disposition, traits, gammes, rotations, canaux) : à ajouter, par exemple en JSON ou dans le hash de l'URL.
- Tirage avec lignes mobiles (pièces 6/7/8/9) pour produire un second hexagramme de mutation (les noms existent déjà).
- Version uxn.

## Tester
- Construire puis vérifier la syntaxe : `make && make check`.
- Navigateur headless : `google-chrome --headless=new --no-sandbox --disable-gpu --virtual-time-budget=... --screenshot=...`. Le temps virtuel rend l'horloge peu fiable : pour valider la logique, faire une copie de `index.html` où l'on remplace la dernière ligne `requestAnimationFrame(frame);` suivie de `})();` par un `window.__t = { step, slots, getSetup, parseSetup, ... }` (tout est dans une même portée, donc rien n'est exposé par défaut), puis appeler `step()` en boucle et lire le résultat dans `document.title` avec `--dump-dom`. L'audio exige un vrai geste utilisateur, donc il ne s'entend pas en headless.
- Test de l'accès MIDI : sans matériel, injecter un faux port dans la copie de test (`midiOut = { send(msg, t) {...} }`) et lire les messages.
- Menu du clic droit : déclencher un `MouseEvent('contextmenu', ...)` sur le groupe SVG d'un hexagone (`polygon.parentNode`).
- Firefox : `firefox --headless --screenshot ...` fonctionne pour tester ce qui dépend du navigateur (c'est ainsi qu'a été trouvé le problème de Web MIDI en `file://`).

## Règles de rédaction
- Pas de tiret quadratin (U+2014) : utiliser `-` (consigne globale d'Alan).
- Interface et commentaires en français.
