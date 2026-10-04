# Hexacorde

[English](README.md) | **Français**

Un séquenceur oraculaire. Six hexagrammes du Yi Jing sont posés sur une grille de 6x6 points. Chaque trait d'un hexagramme est une note, et il envoie cette note vers un autre hexagramme, qui la répercute à son tour. Le morceau naît de la disposition des hexagrammes sur la grille.

Une seule page HTML, du JavaScript pur, aucune dépendance, aucun serveur. L'interface est en français.

**Essayer en ligne** : la page est prête pour GitHub Pages (voir « Publier sur GitHub Pages » plus bas).

## Lancer

Ouvrir `index.html` dans un navigateur récent (Chrome, Firefox...), puis cliquer sur un hexagone. Cela l'amorce et lance l'horloge. Le son interne est un oscillateur dont on peut changer l'onde et l'enveloppe.

## Prise en main

- **Cliquer un hexagone** : l'amorcer et lancer l'horloge.
- **Glisser un hexagone** : le déplacer sur un autre point libre de la grille.
- **Cliquer un trait** : le basculer entre plein et brisé.
- **Tirage** : tire au hasard les traits des six hexagrammes. **Placement au hasard** : les redispose sur la grille.
- **Jouer / Pause** : démarre et arrête l'horloge. **Silence** : efface toutes les impulsions en cours.
- **Panneau, un bloc par hexagone** : choisir son hexagramme (parmi les 64, avec son nom), sa gamme, son canal MIDI, régler sa rotation, ou le **Réinit.**
- **Clic droit sur un hexagone** : menu avec tous ses réglages (hexagramme, gamme, canal MIDI, rotation, sens, vitesse, Réinit.), un cran de 60° (↺ ou ↻) et le choix de ses notes à la main (voir plus bas). Le panneau et le menu restent synchronisés.
- **Flèche « Hexagrammes : édition »** : replie tous les blocs d'édition pour atteindre plus vite le bas du panneau (l'état est retenu). La **molette** le tourne aussi (bas = horaire, haut = antihoraire).
- **Setup** (bloc repliable en bas du panneau) : sauvegarder et recharger toute la configuration.

## Les hexagrammes et leur nom

Chaque emplacement affiche le numéro et le nom de son hexagramme selon le Yi Jing (ordre du Roi Wen), par exemple « 11 Tai, La Paix » : le nom court est écrit sous l'hexagone et le nom complet dans le menu du panneau. Ce menu sert aussi à choisir l'hexagramme voulu, parmi les 64. Quand on bascule un trait ou que la mutation agit, le nom change.

Le trait 1 de l'hexagone est lu comme le premier trait de l'hexagramme (celui du bas dans la tradition), et les traits 4 à 6 forment le trigramme supérieur.

**Réinit.** remet l'hexagramme à sa forme de départ (celle du chargement, du dernier tirage ou du dernier choix dans le menu), arrête sa rotation et efface ses impulsions en attente. Sa position, sa gamme, son canal et ses réglages de rotation ne changent pas.

## Comment ça marche

### L'hexagramme

Chaque hexagramme est dessiné comme un hexagone, dont les six côtés sont ses six traits. Le premier trait est en haut, puis on suit l'hexagone dans le sens horaire.

### Les notes

- **Chromatique** (par défaut) : le trait plein donne la note naturelle, le trait brisé donne la même note un demi-ton plus haut.

  | Trait | 1 | 2 | 3 | 4 | 5 | 6 |
  |---|---|---|---|---|---|---|
  | Plein | do | ré | mi | fa# | sol# | la# |
  | Brisé | do# | ré# | fa | sol | la | si |

- **Gammes** (au choix pour chaque hexagone) : majeur, mineur naturel, dorien, phrygien, lydien, mixolydien, pentatonique majeure ou mineure. Le côté `k` joue le degré `k` de la gamme (on repart à l'octave quand elle a moins de 6 notes). Un trait plein joue la note et la renvoie. Un trait brisé fait silence et ne renvoie rien.
- **Tonique** : réglage global qui transpose l'ensemble.
- **Octave** : elle dépend de la rangée de la grille, les rangées du bas sont graves et celles du haut sont aiguës.

### Notes personnalisées

Pour plus de variété, chaque hexagone peut avoir ses propres notes. Clic droit sur l'hexagone, case **Notes personnalisées** : pour chacun des 6 traits, on choisit la note du trait plein et celle du trait brisé, sur deux octaves (une apostrophe, comme dans « ré' », marque l'octave du dessus), ou « silence » pour le trait brisé. Modifier une note active l'option, la décocher revient à la gamme. **Reprendre la gamme** copie les notes de la gamme actuelle pour partir de là. Un trait brisé qui a une note joue doucement et envoie une impulsion douce, comme en chromatique.

### La propagation

- Quand un hexagone est déclenché, il joue ses six côtés à la suite, un par pas, en partant du côté touché.
- Chaque note jouée envoie une impulsion dans la direction de son côté, vers le premier hexagone rencontré dans ce secteur de 60°. Plus il est loin, plus l'impulsion met de pas à arriver : l'espacement des hexagones fixe donc le rythme.
- **Trait plein** : impulsion forte, qui va aussi loin qu'il faut. À l'arrivée, si le côté touché est plein, l'hexagone **rebondit** et se met à jouer.
- **Trait brisé** (en chromatique) : impulsion douce, de portée courte. À l'arrivée, si le côté touché est brisé, l'impulsion **traverse** l'hexagone sans le faire sonner et continue tout droit.
- Une impulsion sans cible s'éteint.

### Options

- **Rotation à la main** : clic droit puis ↺ / ↻, ou molette. Elle fonctionne aussi à l'arrêt.
- **Rotation** : l'hexagone tourne par pas de 60°. Chaque trait garde sa note, mais sa direction d'envoi et le trait touché à la réception changent. Pour chaque hexagone : une case pour l'activer, un bouton ↻ / ↺ pour le **sens** (horaire ou antihoraire) et une **vitesse** : ×1 (un pas de 60° à chaque pas d'horloge), ×2 ou ×3 (deux ou trois pas de 60° par pas), ÷2, ÷3, ÷4 ou ÷8 (un pas de 60° tous les 2, 3, 4 ou 8 pas). Case « ↻ tous » pour activer la rotation partout.
- **Mutation des traits** : une impulsion de polarité opposée au côté touché inverse ce trait (forte sur brisé, douce sur plein). L'hexagramme évolue comme dans une consultation.
- **Amorce A tous les N pas** : relance l'hexagone A à intervalle régulier.
- **Portée du trait brisé** : distance maximale (en cases) des impulsions douces.
- **Pas** : durée d'un pas de l'horloge, en millisecondes.
- **Son interne : édition** (bloc repliable sous « Son interne ») : voir la section suivante.

## Éditer le son interne

Le bloc repliable **Son interne : édition** règle le son de tous les hexagones (réglage global, gardé dans le setup sous la clé `son`). Il est sans effet sur un synthé MIDI externe. **Son par défaut** remet les réglages d'origine.

- **Onde** : carré (par défaut), triangle, dent de scie ou sinus.
- **Enveloppe ADSR** : un graphique dont on déplace les trois points à la souris (A, D avec S, R), et quatre curseurs équivalents : attaque (1 à 500 ms), déclin (10 à 1000 ms), sustain (0 à 100 %), relâchement (10 à 1500 ms). La note est tenue 90 % d'un pas, puis le relâchement commence.
- **Filtre** : type (passe-bas, passe-haut, passe-bande, coupe-bande), fréquence de coupure (30 Hz à 16 kHz, échelle logarithmique), résonance Q, et **Env** : profondeur de l'enveloppe qui ouvre le filtre à chaque note en suivant A, D, S, R (jusqu'à 4 octaves). Une courbe montre la réponse du filtre. Le défaut (passe-bas 3200 Hz, Env 0) reproduit le son d'origine.

## Sauvegarder un setup

Le bloc repliable **Setup** (en bas du panneau) garde la disposition, les traits, les gammes, les canaux, les rotations, les notes personnalisées et les réglages (pas, tonique, portée, mutation, amorce). Il ne garde pas les impulsions en cours, le volume ni la sortie MIDI.

- **Nom** : pré-rempli avec la date et l'heure (`setup-2026-10-04_18-34-40`), mises à jour à chaque sauvegarde tant que vous ne le modifiez pas. Le setup contient aussi la date en ISO 8601.
- **Sauver / Charger / Suppr.** : dans la mémoire du navigateur, sous ce nom.
- **Fichier .json** et **Ouvrir...** : télécharger le setup ou en relire un depuis le disque.
- **Texte / Copier** et **Appliquer** : écrit le setup en texte (et le copie), ou charge le texte collé dans la zone. Pratique pour l'échanger ou le garder dans une note.

Le texte est un JSON lisible, un hexagramme par ligne :

```
{"hexacorde":1,"date":"2026-10-04T18:34:40+02:00","pas":240,"tonique":0,"portee":2.5,"mutation":false,"amorce":0,"son":{"onde":"square","a":5,"d":250,"s":0.1,"r":150,"filtre":"lowpass","coupure":3200,"q":0.7,"env":0},
"hexagrammes": [
  {"lettre":"A","pos":[2,4],"traits":"010000","depart":"010000","gamme":"phrygien","canal":1,"rotation":{"active":false,"sens":"horaire","vitesse":"x1","angle":0}},
  {"lettre":"D","pos":[1,3],"traits":"000000","depart":"000000","gamme":"phrygien","canal":4,"rotation":{"active":true,"sens":"horaire","vitesse":"x1","angle":0}},
  ...
]}
```

On peut l'écrire ou le retoucher à la main : `pos` = colonne et ligne de 0 à 5, `traits` = 6 chiffres (1 plein, 0 brisé, trait 1 en premier) ou `"numero": 11` à la place, `vitesse` parmi `x1 x2 x3 /2 /3 /4 /8`, `angle` multiple de 60. Si le texte est invalide, rien ne change et l'erreur précise est affichée.

## Piloter un synthé externe (MIDI en direct)

1. Brancher le synthé (ou une interface MIDI), puis cliquer **Activer le MIDI** et autoriser l'accès dans le navigateur.
2. Choisir la sortie dans le menu à côté du bouton.
3. Régler le **canal** de chaque hexagone (A = 1, B = 2... par défaut).
4. Décocher **Son interne** pour n'entendre que le synthé.

Chaque note jouée part en note on immédiatement, avec son note off 90 % d'un pas plus tard. Un all notes off est envoyé à la Pause, au Silence, au Réinit. et au changement de sortie ou de canal.

Web MIDI fonctionne dans Chrome, Edge et Firefox, pas dans Safari. **Firefox n'expose pas Web MIDI sur une page ouverte depuis le disque (`file://`)** : le bouton affiche alors un message d'erreur. Il faut servir la page en local : `python3 -m http.server` dans le dossier, puis ouvrir `http://localhost:8000`. (Vérifié avec Firefox 157 : `requestMIDIAccess` est indéfini en `file://` et défini en `http://localhost`. Chrome accepte les deux.)

## Enregistrer en fichier MIDI

Cocher **Enregistrer en fichier MIDI** et choisir un **Nom**. Tout ce qui sonne entre Jouer et Pause est enregistré. À la Pause, le navigateur télécharge `nom-AAAAMMJJ-HHMMSS.mid`. La date et l'heure évitent d'écraser une prise précédente. Pour choisir le dossier à chaque fois, activer « Demander où enregistrer » dans les réglages de téléchargement du navigateur.

- Format 1, 480 PPQ, tempo suivant le réglage « Pas » (un pas = une croche).
- Une piste de tempo, puis une piste par hexagone ayant sonné, avec le canal choisi pour chaque hexagone (A = canal 1, B = canal 2, ... F = canal 6 par défaut).
- Vélocité 96 pour un trait plein, 56 pour un trait brisé.

## À venir

- Program change et bank select par canal (choisir les patchs du JV-880), clock MIDI.
- Tirage avec lignes mobiles (second hexagramme de mutation).
- Version uxn.

## Publier sur GitHub Pages

La page est un seul fichier statique, `index.html`, à la racine du dépôt (il est généré par `make` et doit être commité). Un fichier `.nojekyll` évite le traitement Jekyll.

1. Pousser le dépôt sur GitHub, branche `main`.
2. Dans le dépôt : **Settings, Pages, Build and deployment, Source : Deploy from a branch**, branche `main`, dossier `/ (root)`.
3. La page est servie sur `https://<utilisateur>.github.io/<dépôt>/`.

Avantage : en HTTPS, Web MIDI fonctionne aussi dans Firefox (qui le refuse en `file://`), avec une demande d'autorisation du navigateur. Après une modification du code, lancer `make` et commiter `index.html` avec les sources.

## Notes pour développeurs

Le code est découpé en modules dans `src/` (`src/js/*.js`, `src/style.css`, `src/template.html`). **`index.html` est généré** : après une modification, lancer `make` (et `make check` pour vérifier la syntaxe). `make serve` sert le dossier sur `http://localhost:8000` (utile pour Web MIDI dans Firefox).

Voir `CLAUDE.md` pour le détail des règles de conception, la structure du code et la façon de tester.

## Licence

BSD 3 clauses, voir [LICENSE](LICENSE).
