//: Constantes : grille, directions, noms de notes, gammes (SCALES)
// ---------- Géométrie ----------
const S = 90, M = 60, R = 36;           // pas de grille, marge, rayon de l'hexagone
const N = 6;                            // grille de N x N points
const SIDE_DIR = [[0,-1],[.866,-.5],[.866,.5],[0,1],[-.866,.5],[-.866,-.5]];
const NAMES = ['do','do#','ré','ré#','mi','fa','fa#','sol','sol#','la','la#','si'];
const LABELS = 'ABCDEF';
// gammes : demi-tons depuis la tonique. null = chromatique (trait brisé = +1 demi-ton)
const SCALES = {
  chromatique:  { label: 'Chromatique',          short: 'chr', steps: null },
  majeur:       { label: 'Majeur',               short: 'maj', steps: [0, 2, 4, 5, 7, 9, 11] },
  mineur:       { label: 'Mineur naturel',       short: 'min', steps: [0, 2, 3, 5, 7, 8, 10] },
  dorien:       { label: 'Dorien',               short: 'dor', steps: [0, 2, 3, 5, 7, 9, 10] },
  phrygien:     { label: 'Phrygien',             short: 'phr', steps: [0, 1, 3, 5, 7, 8, 10] },
  lydien:       { label: 'Lydien',               short: 'lyd', steps: [0, 2, 4, 6, 7, 9, 11] },
  mixolydien:   { label: 'Mixolydien',           short: 'mix', steps: [0, 2, 4, 5, 7, 9, 10] },
  pentamajeur:  { label: 'Pentatonique majeure', short: 'pm',  steps: [0, 2, 4, 7, 9] },
  pentamineur:  { label: 'Pentatonique mineure', short: 'pm-', steps: [0, 3, 5, 7, 10] },
};
const NS = 'http://www.w3.org/2000/svg';
