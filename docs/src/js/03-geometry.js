//: Géométrie du polygone (6 ou 7 côtés) et de la grille (modn, px, vertexAt, sideEnds, sideMid, sideAng)
const modn = (a, n) => ((a % n) + n) % n;
const px = g => M + g * S;
const vertexAt = deg => { const a = deg * Math.PI / 180; return [R * Math.cos(a), R * Math.sin(a)]; };
// côté k d'un polygone à n côtés : le côté 0 est en haut, puis sens horaire ; angle en degrés depuis le haut
const sideAng = (k, n) => 360 * k / n;
const sideEnds = (k, n) => [vertexAt(270 + sideAng(k, n) - 180 / n), vertexAt(270 + sideAng(k, n) + 180 / n)];
const sideMid = (k, n) => { const a = (270 + sideAng(k, n)) * Math.PI / 180; return [Math.cos(a), Math.sin(a)]; };
