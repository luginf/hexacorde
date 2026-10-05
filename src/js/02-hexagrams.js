//: Les 64 hexagrammes du Yi Jing : tables, numéro et nom (anglais et français), traits (dépend de la langue courante)
// ---------- Les 64 hexagrammes (ordre du Roi Wen) ----------
// trigrammes dans l'ordre Qian, Zhen, Kan, Gen, Kun, Xun, Li, Dui ; KW[inférieur][supérieur]
// Les traits sont lus du trait 1 (bas dans la tradition) au trait 3 pour le trigramme inférieur.
const TRIGRAM = { '111': 0, '100': 1, '010': 2, '001': 3, '000': 4, '011': 5, '101': 6, '110': 7 };
const KW = [
  [ 1, 34,  5, 26, 11,  9, 14, 43],
  [25, 51,  3, 27, 24, 42, 21, 17],
  [ 6, 40, 29,  4,  7, 59, 64, 47],
  [33, 62, 39, 52, 15, 53, 56, 31],
  [12, 16,  8, 23,  2, 20, 35, 45],
  [44, 32, 48, 18, 46, 57, 50, 28],
  [13, 55, 63, 22, 36, 37, 30, 49],
  [10, 54, 60, 41, 19, 61, 38, 58],
];
const HEX_NAMES = [null,
  ['Qian', 'Le Créateur'], ['Kun', 'Le Réceptif'], ['Zhun', 'La Difficulté initiale'],
  ['Meng', 'La Folie juvénile'], ['Xu', "L'Attente"], ['Song', 'Le Conflit'],
  ['Shi', "L'Armée"], ['Bi', 'La Solidarité'], ['Xiao Xu', 'Le Pouvoir d\'apprivoisement du petit'],
  ['Lü', 'La Marche'], ['Tai', 'La Paix'], ['Pi', 'La Stagnation'],
  ['Tong Ren', 'Communauté avec les hommes'], ['Da You', 'Possession en grand'], ['Qian', "L'Humilité"],
  ['Yu', "L'Enthousiasme"], ['Sui', 'La Suite'], ['Gu', 'Le Travail sur ce qui est corrompu'],
  ['Lin', "L'Approche"], ['Guan', 'La Contemplation'], ['Shi He', 'Mordre au travers'],
  ['Bi', 'La Grâce'], ['Bo', "L'Éclatement"], ['Fu', 'Le Retour'],
  ['Wu Wang', "L'Innocence"], ['Da Xu', "Le Pouvoir d'apprivoisement du grand"], ['Yi', 'Les Commissures des lèvres'],
  ['Da Guo', 'La Prépondérance du grand'], ['Kan', "L'Insondable"], ['Li', "L'Adhérent, le Feu"],
  ['Xian', "L'Influence"], ['Heng', 'La Durée'], ['Dun', 'La Retraite'],
  ['Da Zhuang', 'La Puissance du grand'], ['Jin', 'Le Progrès'], ['Ming Yi', "L'Obscurcissement de la lumière"],
  ['Jia Ren', 'La Famille'], ['Kui', "L'Opposition"], ['Jian', "L'Obstacle"],
  ['Xie', 'La Libération'], ['Sun', 'La Diminution'], ['Yi', "L'Augmentation"],
  ['Guai', 'La Percée'], ['Gou', 'Venir à la rencontre'], ['Cui', 'Le Rassemblement'],
  ['Sheng', 'La Poussée vers le haut'], ['Kun', "L'Accablement"], ['Jing', 'Le Puits'],
  ['Ge', 'La Révolution'], ['Ding', 'Le Chaudron'], ['Zhen', "L'Ébranlement, le Tonnerre"],
  ['Gen', "L'Immobilisation, la Montagne"], ['Jian', 'Le Développement'], ['Gui Mei', "L'Épousée"],
  ['Feng', "L'Abondance"], ['Lü', 'Le Voyageur'], ['Xun', 'Le Doux, le Vent'],
  ['Dui', 'Le Serein, le Lac'], ['Huan', 'La Dissolution'], ['Jie', 'La Limitation'],
  ['Zhong Fu', 'La Vérité intérieure'], ['Xiao Guo', 'La Prépondérance du petit'],
  ['Ji Ji', "Après l'accomplissement"], ['Wei Ji', "Avant l'accomplissement"],
];
// numéro (1..64) de l'hexagramme formé par 6 traits
const hexNumber = lines =>
  KW[TRIGRAM[lines.slice(0, 3).join('')]][TRIGRAM[lines.slice(3, 6).join('')]];
// traits (6 bits) de l'hexagramme numéro n
const HEX_LINES = {};
for (let a = 0; a < 64; a++) {
  const lines = [5, 4, 3, 2, 1, 0].map(i => (a >> i) & 1);
  HEX_LINES[hexNumber(lines)] = lines;
}
// noms anglais (Wilhelm / Baynes) ; HEX_NAMES[n][1] donne le nom français
const HEX_EN = [null,
  'The Creative', 'The Receptive', 'Difficulty at the Beginning', 'Youthful Folly', 'Waiting', 'Conflict', 'The Army',
  'Holding Together', 'Small Taming', 'Treading', 'Peace', 'Standstill', 'Fellowship with Men', 'Possession in Great Measure',
  'Modesty', 'Enthusiasm', 'Following', 'Work on What Has Been Spoiled', 'Approach', 'Contemplation', 'Biting Through',
  'Grace', 'Splitting Apart', 'Return', 'Innocence', 'Great Taming', 'Nourishment', 'Preponderance of the Great',
  'The Abysmal', 'The Clinging, Fire', 'Influence', 'Duration', 'Retreat', 'The Power of the Great', 'Progress',
  'Darkening of the Light', 'The Family', 'Opposition', 'Obstruction', 'Deliverance', 'Decrease', 'Increase',
  'Breakthrough', 'Coming to Meet', 'Gathering Together', 'Pushing Upward', 'Oppression', 'The Well', 'Revolution',
  'The Cauldron', 'The Arousing, Thunder', 'Keeping Still, Mountain', 'Development', 'The Marrying Maiden', 'Abundance',
  'The Wanderer', 'The Gentle, Wind', 'The Joyous, Lake', 'Dispersion', 'Limitation', 'Inner Truth',
  'Preponderance of the Small', 'After Completion', 'Before Completion',
];
const hexName = n => (lang === 'fr' ? HEX_NAMES[n][1] : HEX_EN[n]);
const hexLabel = n => `${n}. ${HEX_NAMES[n][0]}, ${hexName(n)}`;
