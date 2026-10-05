# Hexacorde

[English](README.md) | **Français**

Un séquenceur oraculaire. Six hexagrammes du Yi Jing sont posés sur une grille de points (6x6 au départ ; on peut ajouter des hexagrammes et choisir n'importe quelle taille de grille de 3x3 à 12x12). Chaque trait d'un hexagramme est une note, et il envoie cette note vers un autre hexagramme, qui la répercute à son tour. Le morceau naît de la disposition des hexagrammes sur la grille.

Une seule page HTML, du JavaScript pur, aucune dépendance, aucun serveur. L'interface est en anglais par défaut, avec une version française (bascule **ENG / FRA** en haut à droite) et quatre thèmes.

**À essayer en ligne** : [https://luginf.github.io/hexacorde/](https://luginf.github.io/hexacorde/)

### Contenu du dépôt

| Dossier | Contenu |
|---|---|
| `docs/` | **la version web**, publiée sur GitHub Pages à https://luginf.github.io/hexacorde/ (`docs/index.html` est la page, `docs/src/` ses sources) |
| `core/` | le cœur C++17 du séquenceur, sans dépendance (portage du moteur web, vérifié contre lui) |
| `vcv/` | le module VCV Rack 2, construit sur `core/` |

La suite de ce README décrit la version web.

## Lancer

Ouvrir `docs/index.html` dans un navigateur récent (Chrome, Firefox...), puis cliquer sur un hexagone. Cela l'amorce et lance l'horloge. Le son interne est un oscillateur dont on peut changer l'onde, l'enveloppe et le filtre.

## Prise en main

- **Cliquer un hexagone** : l'amorcer et lancer l'horloge.
- **Glisser un hexagone** : le déplacer sur un autre point libre de la grille.
- **Cliquer un trait** : le basculer entre plein et brisé. **Glisser un trait** : on saisit un côté et on tourne autour du centre ; l'hexagone pivote par crans de 60°, dans un sens ou dans l'autre. La **molette** le tourne aussi (bas = horaire).
- **Tirer un rectangle** sur le fond de la grille : sélectionne plusieurs hexagrammes (entourés ; Maj ajoute, un clic sur le fond désélectionne). Clic droit sur l'un d'eux pour les supprimer, désactiver ou activer tous (la touche Suppr supprime aussi).
- **Clic droit sur un hexagramme** : tous ses réglages (hexagramme, gamme, canal MIDI, tonique, octave, rotation, 7e côté, amorce tous les N pas, Réinit.), un cran de 60°, les notes personnalisées (voir plus bas), **Désactiver** (l'hexagone devient grisé : il ne joue ni ne reçoit) et **Supprimer**.
- **Clic droit sur la grille** : **Nouvel hexagramme ici** (traits au hasard, gamme et tonique globales, sur le point libre le plus proche ; 26 hexagrammes au plus) et **taille de la grille** à votre goût (colonnes x lignes, de 3 à 12 ; refusée si un hexagone sortirait).

### La barre de menus

**Jouer / Pause**, **Silence** (efface les impulsions en vol), le pas (**Pas** en ms, avec son équivalent en **BPM**) et le volume sont toujours visibles en haut. Puis les menus, dans cet ordre (un seul est ouvert à la fois ; cliquer ailleurs ou Échap le ferme) :

- **Tonalité** : la **tonique** globale, l'**octave** globale (-3 à +3) et la **gamme** de base. Choisir une gamme l'applique à tous les hexagrammes et à ceux ajoutés plus tard.
- **Hexagrammes** : un bloc par hexagramme : hexagramme (parmi les 64, avec son nom), actif, supprimer, gamme, canal MIDI, tonique et octave propres, rotation, amorce, 7e côté, Réinit.
- **Réglages** : portée du trait brisé, mutation des traits, rotation pour tous, **octave uniforme**, **thème**.
- **Son** : le son interne, son éditeur, des instruments prédéfinis, des sons FM et un son par canal MIDI (voir plus bas).
- **MIDI** : sortie MIDI en direct, **canaux** MIDI (un par hexagone, ou le même pour tous) et un **instrument** (program change) par canal.
- **Fichier** : **Enregistrement** (MIDI et audio) et **Setup** (sauvegarde et chargement).
- **Tirage** : **Tirage des traits au hasard** (traits au hasard pour chaque hexagramme) et **Placement au hasard** (points au hasard de la grille).
- **ENG / FRA** et **Aide** à droite.

La langue et le thème (sombre, clair, sépia, vert) sont retenus par le navigateur.

## Les hexagrammes et leur nom

Chaque hexagramme affiche son numéro et son nom selon le Yi Jing (ordre du Roi Wen), par exemple « 11 Tai » sous l'hexagone et « 11. Tai, La Paix » dans les menus. Les noms sont en pinyin plus anglais (Wilhelm / Baynes) ou français (Wilhelm / Javary), selon la langue. Le menu Hexagrammes sert aussi à choisir l'hexagramme voulu, parmi les 64. Quand on bascule un trait ou que la mutation agit, le nom change.

Le trait 1 de l'hexagone est lu comme le premier trait de l'hexagramme (celui du bas dans la tradition), et les traits 4 à 6 forment le trigramme supérieur.

**Réinit.** remet l'hexagramme à sa forme de départ (celle du chargement, du dernier tirage ou du dernier choix dans le menu), arrête sa rotation et efface ses impulsions en attente. Sa position, sa gamme, son canal et ses réglages de rotation ne changent pas.

## Comment ça marche

### L'hexagramme

Chaque hexagramme est dessiné comme un hexagone dont les six côtés sont ses six traits. Le premier trait est en haut, puis on suit l'hexagone dans le sens horaire. Un hexagone peut recevoir un **7e côté** (voir plus bas).

### Les notes

- **Chromatique** (défaut) : un trait plein donne la note naturelle, un trait brisé la même note un demi-ton plus haut.

  | Trait | 1 | 2 | 3 | 4 | 5 | 6 |
  |---|---|---|---|---|---|---|
  | Plein | do | ré | mi | fa# | sol# | la# |
  | Brisé | do# | ré# | fa | sol | la | si |

  (En anglais, les noms de notes sont C D E F# G# A# / C# D# F G A B.)

- **Gammes** (au choix pour chaque hexagone, ou pour tous dans le menu Tonalité) : chromatique, majeur, mineur naturel, dorien, phrygien, lydien, mixolydien, locrien, mineur harmonique, mineur mélodique, par tons, blues, pentatoniques majeure et mineure, mineur hongrois, phrygien dominant, double harmonique, deux gammes diminuées, in sen, hirajoshi, bebop dominante et augmentée (23 au total). Le côté `k` joue le degré `k` de la gamme (on repart à l'octave quand elle a moins de notes). Un trait plein joue la note et la renvoie. Un trait brisé fait silence et ne renvoie rien. Ajouter une gamme : une ligne dans la table `SCALES` de `src/js/01-constants.js` et deux noms dans les fichiers de langue.
- **Tonique** : globale (menu Tonalité), elle transpose l'ensemble ; chaque hexagone peut avoir la sienne (« tonique globale » suit le réglage global). **Octave** : octave de base globale (-3 à +3) plus une octave facultative par hexagone.
- **Octave par rangée** : la grille est répartie sur 3 octaves, quelle que soit sa taille : rangées du bas graves, rangées du haut aiguës. L'option **Octave uniforme** (Réglages) met toutes les rangées dans la même octave du milieu.

### Notes personnalisées

Pour plus de variété, chaque hexagone peut avoir ses propres notes. Clic droit sur l'hexagone, case **Notes personnalisées** : pour chaque trait, on choisit la note du trait plein et celle du trait brisé, sur deux octaves (une apostrophe, comme dans « ré' », marque l'octave du dessus), ou « silence » (pour l'un comme pour l'autre). Les 24 notes sont proposées ; celles de la gamme de l'hexagone sont marquées ● et en couleur vive, les autres atténuées, et la tonique est marquée « (tonique) ». Modifier une note active l'option, la décocher revient à la gamme. **Reprendre la gamme** copie les notes de la gamme actuelle pour partir de là ; avec une gamme qui a plus de notes que de côtés, les notes en trop vont sur des traits brisés, pour que toute la gamme soit présente (un brisé ne sonne que s'il est touché). **Mélanger l'ordre** mélange les notes au hasard : avec une gamme, toutes les notes (y compris celle en trop) sont redistribuées, les premières sur les traits pleins et les autres sur des traits brisés au hasard ; en chromatique, chaque paire plein / brisé reste ensemble. Un trait brisé qui a une note joue doucement et envoie une impulsion douce.

### Le 7e côté

L'option **7e côté** (menu Hexagrammes ou clic droit) transforme l'hexagone en heptagone. Le 7e côté est un trait plein de plus avec la note suivante de la gamme ; il envoie et reçoit des impulsions comme les autres et les crans de rotation valent 360/7 degrés. Le nom d'hexagramme est celui des six premiers traits (avec « +1 »). Une gamme de moins de 7 notes prend les notes manquantes d'une gamme à 7 notes correspondante au lieu d'octaves (par exemple le majeur pour la pentatonique majeure). Décocher revient à six côtés. Si les notes personnalisées sont encore celles de la gamme, elles sont redistribuées sur le nouveau nombre de côtés ; les notes modifiées à la main sont conservées.

### La propagation

- Quand un hexagone est déclenché, il joue ses côtés l'un après l'autre, un par pas, en partant du côté touché.
- Chaque note jouée envoie une impulsion dans la direction de son côté, vers le premier hexagone rencontré dans ce secteur (60° pour un hexagone). Plus il est loin, plus l'impulsion met de pas à arriver : l'espacement des hexagones fixe le rythme.
- **Trait plein** : impulsion forte, qui va aussi loin qu'il faut. À l'arrivée, si le côté touché est plein, l'hexagone **rebondit** et se met à jouer.
- **Trait brisé** (en chromatique, ou avec une note personnalisée) : impulsion douce de courte portée. À l'arrivée, si le côté touché est brisé, l'impulsion **traverse** l'hexagone sans le faire sonner et repart tout droit.
- Une impulsion sans cible s'éteint. Un hexagone désactivé n'est pas une cible.

### Options

- **Rotation** (par hexagone) : l'hexagone tourne par pas de 60°. Chaque trait garde sa note, mais sa direction d'envoi et le côté touché à la réception changent. Une case pour l'activer, un bouton ↻ / ↺ pour le **sens** et une **vitesse** : ×1 (un pas par pas d'horloge), ×2 ou ×3, ÷2, ÷3, ÷4 ou ÷8. « ↻ tous » (Réglages) active la rotation partout. La rotation à la main (glisser un trait, molette, clic droit puis ↺ / ↻) fonctionne aussi à l'arrêt.
- **Mutation des traits** : une impulsion de polarité opposée au côté touché inverse ce trait (forte sur brisé, douce sur plein). L'hexagramme évolue comme dans une consultation.
- **Amorce** (par hexagone, dans le menu Hexagrammes et le clic droit) : joue une note de cet hexagone tous les N pas.
- **Portée du trait brisé** : distance maximale (en cases) des impulsions douces.
- **Pas** : durée d'un pas de l'horloge, en millisecondes. Le champ **BPM** donne le même réglage (un pas est une croche, donc BPM = 30000 / pas en ms ; 240 ms = 125 BPM) et peut aussi être modifié (de 43 à 375 BPM).

## Éditer le son interne

Le menu **Son** règle le son interne. Il est sans effet sur un synthé MIDI externe ; décocher **Son interne** pour n'entendre que le synthé. **Son par défaut** remet les réglages d'origine.

- **Éditer le son de** : *Tous les canaux* (le son par défaut) ou un canal MIDI (1 à 16). Un canal qui a son propre son est marqué ●, et les hexagrammes de ce canal (leur canal, ou le canal commun) le jouent ; les autres jouent le son par défaut. **Reprendre le son de tous les canaux** supprime le son propre d'un canal.
- **Instrument** : sons prêts à l'emploi (lead carré, sinus doux, basse dent de scie, pizzicato, nappe, cloche, orgue, cuivres et six sons FM) copiés dans le son édité, à retoucher ensuite.
- **Onde** : carré (défaut), triangle, dent de scie, sinus ou **FM** (deux opérateurs : une porteuse sinus modulée en fréquence par un sinus de fréquence rapport x note ; **FM** est le rapport et **Idx** l'indice de modulation ; l'indice suit l'enveloppe A, D, S, R, donc l'attaque est brillante et le sustain plus doux).
- **Enveloppe ADSR** : un graphique dont on déplace les trois points à la souris (A, D avec S, R), et quatre curseurs équivalents : attaque (1 à 500 ms), déclin (10 à 1000 ms), sustain (0 à 100 %), relâchement (10 à 1500 ms). La note est tenue 90 % d'un pas, puis le relâchement commence.
- **Filtre** : type (passe-bas, passe-haut, passe-bande, coupe-bande), fréquence de coupure (30 Hz à 16 kHz, échelle logarithmique), résonance Q, et **Env** : profondeur de l'enveloppe qui ouvre le filtre à chaque note en suivant A, D, S, R (jusqu'à 4 octaves). Une courbe montre la réponse du filtre. Le défaut (passe-bas 3200 Hz, Env 0) reproduit le son d'origine.

## Setup (sauvegarde et chargement)

La partie **Setup** du menu **Fichier** garde la disposition, les sons (par défaut et par canal), les instruments MIDI, le canal commun, les traits, les gammes, les canaux, les rotations, les notes personnalisées, la tonique, l'octave et l'amorce de chaque hexagone, le son et les réglages (pas, tonique, octave, gamme de base, octave uniforme, portée, mutation). Elle garde aussi le nombre d'hexagones, la taille de la grille et les hexagones désactivés. Elle ne garde pas les impulsions en cours, le volume, le thème, la langue ni la sortie MIDI.

- **Nom** : pré-rempli avec `hexacorde_` suivi de la date et de l'heure (`hexacorde_2026-10-04_18-34-40`), rafraîchi à chaque sauvegarde tant qu'on ne l'a pas modifié. Le setup contient aussi la date en ISO 8601.
- **Sauver / Charger / Suppr.** : dans la mémoire du navigateur (localStorage), sous ce nom.
- **Fichier .json** et **Ouvrir...** : télécharger le setup ou en relire un depuis le disque.
- **Texte / Copier** et **Appliquer** : écrire le setup en texte (et le copier), ou charger le texte collé dans la zone. Pratique pour l'échanger ou le garder dans une note.

Le texte est du JSON lisible, un hexagramme par ligne (les clés sont en français, quelle que soit la langue de l'interface) :

```
{"hexacorde":1,"date":"2026-10-04T18:34:40+02:00","grille":[6,6],"gamme":"chromatique","pas":240,"tonique":0,"octave":0,"portee":2.5,"mutation":false,"son":{"onde":"square","a":5,"d":250,"s":0.1,"r":150,"filtre":"lowpass","coupure":3200,"q":0.7,"env":0},
"hexagrammes": [
  {"lettre":"A","pos":[2,4],"traits":"010000","depart":"010000","gamme":"phrygien","canal":1,"rotation":{"active":false,"sens":"horaire","vitesse":"x1","angle":0}},
  {"lettre":"D","pos":[1,3],"traits":"000000","depart":"000000","gamme":"phrygien","canal":4,"rotation":{"active":true,"sens":"horaire","vitesse":"x1","angle":0}},
  ...
]}
```

On peut l'écrire ou le retoucher à la main : `grille` = `[colonnes, lignes]` (3 à 12 chacune ; un seul nombre = grille carrée), `gamme` = gamme de base (clé de la table `SCALES`, par exemple `majeur`, `pentamineur`, `lydien`), `uniforme: true` = octave uniforme, `octave` = octave globale (-3 à 3), `canalUnique` = canal MIDI commun (1 à 16), `sons` = sons propres par numéro de canal (mêmes champs que `son` ; la FM ajoute `fm` et `indice`), `programmes` = instrument par numéro de canal (0 à 127), `pos` = colonne et ligne, `traits` = 6 ou 7 chiffres (1 plein, 0 brisé, trait 1 en premier ; 7 chiffres = heptagone) ou `"numero": 11` à la place, `actif: false` = hexagone désactivé, `tonique` (0 à 11) et `octave` (-3 à 3) dans un hexagone = sa tonique et son octave propres, `amorce: N` = amorce tous les N pas, `plein` / `brise` dans `notes` acceptent `null` = silence, `vitesse` parmi `x1 x2 x3 /2 /3 /4 /8`, `angle` multiple de 60. Si le texte est invalide, rien ne change et l'erreur précise est affichée.

## Piloter un synthé externe (MIDI en direct)

1. Brancher le synthé (ou une interface MIDI), puis ouvrir le menu **MIDI**, cliquer **Activer le MIDI** et autoriser l'accès dans le navigateur.
2. Choisir la sortie dans le menu à côté du bouton.
3. Régler le **canal** de chaque hexagone (A = 1, B = 2... par défaut), ou choisir **Même canal pour tous** dans le menu MIDI (les canaux individuels sont conservés, seulement grisés, et reviennent avec **Individuels**).
4. Choisir un **instrument** (program change) pour chaque canal dans le menu MIDI : il est envoyé au changement de sortie et à chaque Jouer, et écrit au début de chaque piste du fichier MIDI. Les noms sont General MIDI ; sur un autre synthé, seul le numéro compte.
5. Décocher **Son interne** (menu Son) pour n'entendre que le synthé.

Chaque note jouée envoie un note on immédiat, avec son note off 90 % d'un pas plus tard. Un all notes off est envoyé à la Pause, au Silence, à la Réinit. et quand la sortie ou un canal change.

Web MIDI fonctionne dans Chrome, Edge et Firefox, pas dans Safari. **Firefox n'expose pas Web MIDI sur une page ouverte depuis le disque (`file://`)** : le bouton affiche alors un message d'erreur. Servir plutôt la page en local : `python3 -m http.server` dans le dossier, puis ouvrir `http://localhost:8000` (ou utiliser la version GitHub Pages, en HTTPS). (Vérifié avec Firefox 157 : `requestMIDIAccess` est indéfini en `file://` et défini en `http://localhost`. Chrome accepte les deux.)

## Enregistrer (MIDI et audio)

Dans le menu **Fichier**, choisir un **Nom des fichiers**. L'enregistrement et la sauvegarde sont deux gestes séparés, rien n'est caché :

- **Enregistrer le MIDI** : la case lance l'enregistrement de toutes les notes jouées (la Pause ne l'arrête pas, on peut donc faire pause et reprendre dans la même prise). **Sauvegarder l'enregistrement** l'arrête et télécharge `nom-AAAAMMJJ-HHMMSS.mid`. Décocher la case arrête seulement l'enregistrement : la prise reste jusqu'à sa sauvegarde (recocher lance une nouvelle prise).
- **Enregistrer l'audio** : pareil pour le son interne, sauvegardé en **.flac** (sans perte, par défaut) ou en **.wav**. Mono, 16 bits, à la fréquence d'échantillonnage du navigateur ; la prise commence au premier Jouer et tient compte du volume.

La date et l'heure évitent d'écraser une prise précédente. Pour choisir le dossier à chaque fois, activer « Demander où enregistrer » dans les réglages de téléchargement du navigateur.

Détails du fichier MIDI :

- Format 1, 480 PPQ, tempo suivant le réglage du pas (un pas = une croche).
- Une piste de tempo, puis une piste par hexagone ayant sonné, avec le canal choisi pour chaque hexagone (A = canal 1, B = canal 2, ... par défaut).
- Vélocité 96 pour un trait plein, 56 pour un trait brisé.

## Cœur C++ et module VCV Rack

En plus de la page web, le séquenceur existe sous forme d'un **cœur C++17** sans dépendance (`core/`, portage fidèle du moteur JavaScript, vérifié note par note contre la page web par `make core-test`) et, construit dessus, d'un **module pour VCV Rack 2** (`vcv/`) : un séquenceur polyphonique pitch / gate / vélocité dont on joue le plateau comme sur la page web, avec import et export des mêmes fichiers de setup `.json`. et d'un **plugin JUCE** (`juce/`, VST3 et autonome) : le séquenceur suit le transport de l'hôte (ou une horloge interne), envoie des notes MIDI (un canal par hexagone) à l'hôte et à un port MIDI choisi, et a un petit synthé interne. Voir `core/README.md`, `vcv/README.md` et `juce/README.md`.

## À venir

- Program change et bank select par canal (choisir les patchs du JV-880), horloge MIDI.
- Tirage à lignes mobiles (second hexagramme, muté).
- Version uxn.

## Publier sur GitHub Pages

La version web est dans le dossier `docs/` (le seul dossier que GitHub Pages sait servir, avec la racine du dépôt) : `docs/index.html` est un seul fichier statique, généré par `make` depuis `docs/src/` et commité. Un fichier `.nojekyll` dans `docs/` évite le traitement Jekyll. `core/` et `vcv/` sont hors de `docs/`, donc ils ne sont pas servis.

1. Pousser le dépôt sur GitHub, branche `main`.
2. Dans le dépôt : **Settings, Pages, Build and deployment, Source : Deploy from a branch**, branche `main`, dossier `/docs`.
3. La page est servie sur `https://<utilisateur>.github.io/<dépôt>/` (ici : https://luginf.github.io/hexacorde/).

Bonus : en HTTPS, Web MIDI fonctionne aussi dans Firefox (qui le refuse en `file://`), avec une demande d'autorisation du navigateur. Après une modification du code, lancer `make` et commiter `docs/index.html` avec les sources.

## Notes pour les développeurs

Le dépôt a trois parties : `docs/` (l'application web : sources dans `docs/src/`, page générée `docs/index.html`), `core/` (le cœur C++) et `vcv/` (le module VCV Rack). Le code web est découpé en modules dans `docs/src/` (`docs/src/js/*.js`, `docs/src/style.css`, `docs/src/template.html`). **`docs/index.html` est généré** : après une modification, lancer `make` (et `make check` pour vérifier la syntaxe). `make serve` sert `docs/` sur `http://localhost:8000` (utile pour Web MIDI dans Firefox). Les textes de l'interface sont dans `docs/src/js/00b-lang-en.js` et `docs/src/js/00c-lang-fr.js` ; les thèmes sont des variables CSS dans `docs/src/style.css`.

Voir `CLAUDE.md` pour le détail des règles de conception, de la structure du code et de la façon de tester.

## Licence

- La version web (`docs/`) et le cœur C++ (`core/`) : BSD 3 clauses, voir [LICENSE](LICENSE).
- Le module VCV Rack (`vcv/`) : GPL-3.0-or-later, voir [vcv/LICENSE](vcv/LICENSE) (la licence que VCV recommande pour les plugins Rack). Il est aussi publié dans un dépôt autonome, généré par `make vcv-release`, parce que la VCV Library compile la racine d'un dépôt.
