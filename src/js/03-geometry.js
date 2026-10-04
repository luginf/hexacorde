//: Géométrie de l'hexagone et de la grille (mod6, px, vertex, sideEnds, sideMid)
const mod6 = n => ((n % 6) + 6) % 6;
const px = g => M + g * S;
const vertex = i => { const a = i * Math.PI / 3; return [R * Math.cos(a), R * Math.sin(a)]; };
// côté k (0 = haut, sens horaire) relie les sommets 4+k et 5+k
const sideEnds = k => [vertex((4 + k) % 6), vertex((5 + k) % 6)];
const sideMid = k => { const a = (270 + 60 * k) * Math.PI / 180; return [Math.cos(a), Math.sin(a)]; };
