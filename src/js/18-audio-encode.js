//: Encodeurs audio : WAV et FLAC (sans perte, 16 bits mono)
// ---------- Encodeurs audio ----------
// entrée : liste de blocs Int16Array (mono) et fréquence d'échantillonnage

function encodeWav(chunks, n, rate) {
  const buf = new ArrayBuffer(44 + 2 * n), v = new DataView(buf);
  const tag = (o, s) => { for (let i = 0; i < 4; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  tag(0, 'RIFF'); v.setUint32(4, 36 + 2 * n, true); tag(8, 'WAVE'); tag(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  tag(36, 'data'); v.setUint32(40, 2 * n, true);
  let o = 44;
  for (const c of chunks) for (let i = 0; i < c.length; i++, o += 2) v.setInt16(o, c[i], true);
  return new Uint8Array(buf);
}

const CRC8 = new Uint8Array(256), CRC16 = new Uint16Array(256);
for (let i = 0; i < 256; i++) {
  let a = i, b = i << 8;
  for (let k = 0; k < 8; k++) { a = a & 0x80 ? ((a << 1) ^ 0x07) & 255 : (a << 1) & 255; b = b & 0x8000 ? ((b << 1) ^ 0x8005) & 0xffff : (b << 1) & 0xffff; }
  CRC8[i] = a; CRC16[i] = b;
}
const crc8 = bytes => bytes.reduce((c, x) => CRC8[c ^ x], 0);
const crc16 = bytes => bytes.reduce((c, x) => ((c << 8) & 0xffff) ^ CRC16[(c >> 8) ^ x], 0);

// écrivain de bits (poids fort d'abord) ; put(v, n) avec n <= 24
function bitWriter() {
  const out = []; let acc = 0, nb = 0;
  const w = {
    out,
    put(v, n) {
      acc = (acc << n) | (v & ((1 << n) - 1)); nb += n;
      while (nb >= 8) { nb -= 8; out.push((acc >> nb) & 255); }
      acc &= (1 << nb) - 1;
    },
    unary(q) { while (q >= 16) { w.put(0, 16); q -= 16; } w.put(1, q + 1); },   // q zéros puis un 1
    align() { if (nb) w.put(0, 8 - nb); },
  };
  return w;
}
// numéro de trame : nombre codé façon UTF-8
function utf8num(n) {
  if (n < 0x80) return [n];
  let len = 2;
  while (n >= Math.pow(2, 5 * len + 1)) len++;
  const tail = [];
  for (let i = 0; i < len - 1; i++) { tail.unshift(0x80 | (n & 0x3f)); n = Math.floor(n / 64); }
  return [((0xff00 >> len) & 0xff) | n, ...tail];
}
const zig = r => (r >= 0 ? 2 * r : -2 * r - 1);

// coût en bits du codage de Rice de u[a..b) avec le paramètre k
function riceBits(u, a, b, k) { let s = (b - a) * (k + 1); for (let i = a; i < b; i++) s += Math.floor(u[i] / (1 << k)); return s; }
function bestK(u, a, b) {
  let sum = 0; for (let i = a; i < b; i++) sum += u[i];
  const mean = sum / Math.max(1, b - a);
  const k0 = Math.max(0, Math.min(14, Math.floor(Math.log2(mean * 0.6931 + 1e-9))));
  let best = k0, bb = riceBits(u, a, b, k0);
  if (k0 < 14) { const c = riceBits(u, a, b, k0 + 1); if (c < bb) { bb = c; best = k0 + 1; } }
  return { k: best, bits: bb };
}

// résidus du prédicteur fixe d'ordre o (les o premiers échantillons restent en clair)
function fixedResidual(x, o) {
  const r = new Array(x.length - o);
  for (let i = o; i < x.length; i++) {
    r[i - o] = o === 0 ? x[i] : o === 1 ? x[i] - x[i - 1]
      : o === 2 ? x[i] - 2 * x[i - 1] + x[i - 2]
      : o === 3 ? x[i] - 3 * x[i - 1] + 3 * x[i - 2] - x[i - 3]
      : x[i] - 4 * x[i - 1] + 6 * x[i - 2] - 4 * x[i - 3] + x[i - 4];
  }
  return r;
}

function flacSubframe(w, x) {
  const n = x.length;
  if (x.every(v => v === x[0])) { w.put(0, 8); w.put(x[0], 16); return; }        // CONSTANT
  let o = 0, bestAbs = Infinity;
  for (let k = 0; k <= 4 && k < n; k++) {
    const r = fixedResidual(x, k); let s = 0;
    for (const v of r) s += Math.abs(v);
    if (s < bestAbs) { bestAbs = s; o = k; }
  }
  const u = fixedResidual(x, o).map(zig);                // u[i] correspond à l'échantillon o + i
  let best = null;
  for (let p = 0; p <= 5; p++) {
    const parts = 1 << p, size = n >> p;
    if (n % parts || size <= o) break;
    let total = 0; const ks = [];
    for (let j = 0; j < parts; j++) {
      const a = j === 0 ? 0 : j * size - o, b = (j + 1) * size - o, r = bestK(u, a, b);
      ks.push(r.k); total += r.bits + 4;
    }
    if (!best || total < best.total) best = { p, ks, total, size };
  }
  w.put((0b001000 + o) << 1, 8);                          // FIXED, ordre o
  for (let i = 0; i < o; i++) w.put(x[i], 16);             // échantillons de départ
  w.put(0, 2); w.put(best.p, 4);                           // Rice 4 bits, ordre de partition
  best.ks.forEach((k, j) => {
    const a = j === 0 ? 0 : j * best.size - o, b = (j + 1) * best.size - o;
    w.put(k, 4);
    for (let i = a; i < b; i++) { w.unary(Math.floor(u[i] / (1 << k))); w.put(u[i] & ((1 << k) - 1), k); }
  });
}

function encodeFlac(chunks, n, rate) {
  const all = new Int16Array(n);
  let o = 0; for (const c of chunks) { all.set(c, o); o += c.length; }
  const BS = 4096, w = bitWriter();
  for (const b of [0x66, 0x4c, 0x61, 0x43, 0x80, 0, 0, 34]) w.put(b, 8);     // "fLaC", bloc STREAMINFO (dernier)
  w.put(BS, 16); w.put(BS, 16); w.put(0, 24); w.put(0, 24);                 // tailles de bloc et de trame
  w.put(rate >> 4, 16); w.put(rate & 15, 4); w.put(0, 3); w.put(15, 5);      // fréquence, 1 canal, 16 bits
  w.put(Math.floor(n / 4294967296), 4); w.put(n >>> 16, 16); w.put(n & 0xffff, 16);   // nombre d'échantillons
  for (let i = 0; i < 16; i++) w.put(0, 8);                                  // MD5 non calculée
  const frames = Math.max(1, Math.ceil(n / BS));
  for (let f = 0; f < frames; f++) {
    const x = all.subarray(f * BS, Math.min(n, (f + 1) * BS)), len = x.length;
    const fw = bitWriter();
    fw.put(0xff, 8); fw.put(0xf8, 8);                                       // synchro, taille de bloc fixe
    fw.put(len === BS ? 12 : 7, 4); fw.put(0, 4);                           // taille de bloc, fréquence dans STREAMINFO
    fw.put(0, 4); fw.put(4, 3); fw.put(0, 1);                               // mono, 16 bits
    for (const b of utf8num(f)) fw.put(b, 8);
    if (len !== BS) fw.put(len - 1, 16);
    fw.put(crc8(fw.out), 8);
    if (len) flacSubframe(fw, Array.from(x)); else fw.put(0, 8), fw.put(0, 16);
    fw.align();
    fw.put(crc16(fw.out), 16);
    for (const b of fw.out) w.out.push(b);
  }
  return Uint8Array.from(w.out);
}
