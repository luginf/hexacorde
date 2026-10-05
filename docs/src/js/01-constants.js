//: Constantes : grille, directions, noms de notes, gammes (SCALES)
// ---------- Géométrie ----------
const S = 90, M = 60, R = 36;           // pas de grille, marge, rayon de l'hexagone
let NX = 6, NY = 6;                     // grille de NX colonnes x NY lignes (modifiable au clic droit)
const N_MIN = 3, N_MAX = 12;
const LABELS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';   // 26 hexagones au plus
// gammes : demi-tons depuis la tonique. null = chromatique (trait brisé = +1 demi-ton).
// Les noms sont dans les dictionnaires (clés scale.<clé> et scale.<clé>.s) ; les clés restent en français
// car elles sont écrites dans les setups. Pour ajouter une gamme : une ligne ici et ses deux noms dans 00b / 00c.
const SCALES = {
  chromatique:  { steps: null },
  majeur:       { steps: [0, 2, 4, 5, 7, 9, 11] },
  mineur:       { steps: [0, 2, 3, 5, 7, 8, 10] },
  dorien:       { steps: [0, 2, 3, 5, 7, 9, 10] },
  phrygien:     { steps: [0, 1, 3, 5, 7, 8, 10] },
  lydien:       { steps: [0, 2, 4, 6, 7, 9, 11] },
  mixolydien:   { steps: [0, 2, 4, 5, 7, 9, 10] },
  locrien:      { steps: [0, 1, 3, 5, 6, 8, 10] },
  mineurharm:   { steps: [0, 2, 3, 5, 7, 8, 11] },
  mineurmel:    { steps: [0, 2, 3, 5, 7, 9, 11] },
  tons:         { steps: [0, 2, 4, 6, 8, 10] },
  blues:        { steps: [0, 3, 5, 6, 7, 10] },
  pentamajeur:  { steps: [0, 2, 4, 7, 9] },
  pentamineur:  { steps: [0, 3, 5, 7, 10] },
  hongrois:     { steps: [0, 2, 3, 6, 7, 8, 11] },
  phrygiendom:  { steps: [0, 1, 4, 5, 7, 8, 10] },
  doubleharm:   { steps: [0, 1, 4, 5, 7, 8, 11] },
  dim12:        { steps: [0, 1, 3, 4, 6, 7, 9, 10] },
  dim21:        { steps: [0, 2, 3, 5, 6, 8, 9, 11] },
  insen:        { steps: [0, 1, 5, 7, 10] },
  hirajoshi:    { steps: [0, 2, 3, 7, 8] },
  bebop:        { steps: [0, 2, 4, 5, 7, 9, 10, 11] },
  augmentee:    { steps: [0, 3, 4, 7, 8, 11] },
};
const scaleLabel = k => t('scale.' + k), scaleShort = k => t('scale.' + k + '.s');
const NS = 'http://www.w3.org/2000/svg';
