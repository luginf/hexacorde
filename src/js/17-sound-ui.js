//: Édition du son interne : onde, graphique ADSR (points déplaçables), filtre
// ---------- Menu du son interne ----------
const SND_DEFAULT = { ...snd };
const envCv = $('envCv'), fltCv = $('fltCv');
const fcutToHz = v => 30 * Math.pow(16000 / 30, v), hzToFcut = f => Math.log(f / 30) / Math.log(16000 / 30);
const MAXA = 500, MAXD = 1000, MAXR = 1500;

$('wave').innerHTML = Object.keys(WAVE_GAIN).map(w =>
  `<option value="${w}">${{ square: 'carré', triangle: 'triangle', sawtooth: 'dent de scie', sine: 'sinus' }[w]}</option>`).join('');
$('ftype').innerHTML = Object.entries(FILTERS).map(([k, v]) => `<option value="${k}">${v}</option>`).join('');

// géométrie du graphique : quatre quarts de largeur, la tenue (S) a une largeur fixe
function envPoints() {
  const W = envCv.width, H = envCv.height, x0 = 10, qw = (W - 20) / 4, top = 12, bot = H - 12;
  const xa = x0 + qw * snd.a / MAXA, xd = xa + qw * snd.d / MAXD, xs = xd + qw * 0.6, xr = xs + qw * snd.r / MAXR;
  const ys = bot - (bot - top) * snd.s;
  return { x0, qw, top, bot, pts: { a: [xa, top], d: [xd, ys], r: [xr, bot] }, xa, xd, xs, xr, ys };
}
function drawEnv() {
  const c = envCv.getContext('2d'), g = envPoints();
  c.clearRect(0, 0, envCv.width, envCv.height);
  c.strokeStyle = '#2c2c34'; c.lineWidth = 1; c.beginPath();
  for (const x of [g.xa, g.xd, g.xs]) { c.moveTo(x, g.top); c.lineTo(x, g.bot); }
  c.stroke();
  c.beginPath(); c.moveTo(g.x0, g.bot); c.lineTo(g.xa, g.top); c.lineTo(g.xd, g.ys); c.lineTo(g.xs, g.ys); c.lineTo(g.xr, g.bot);
  c.fillStyle = 'rgba(255,176,0,.15)'; c.fill();
  c.strokeStyle = '#ffb000'; c.lineWidth = 2; c.stroke();
  c.fillStyle = '#e8e0c8';
  for (const [x, y] of Object.values(g.pts)) { c.beginPath(); c.arc(x, y, 5, 0, 7); c.fill(); }
}
// courbe de réponse du filtre (échelle log en fréquence, de -40 à +24 dB)
function drawFilter() {
  const c = fltCv.getContext('2d'), W = fltCv.width, H = fltCv.height, n = 136;
  c.clearRect(0, 0, W, H);
  try {
    const f = new OfflineAudioContext(1, 1, 44100).createBiquadFilter();
    f.type = snd.ftype; f.frequency.value = snd.fcut; f.Q.value = snd.fq;
    const fr = new Float32Array(n), mag = new Float32Array(n), ph = new Float32Array(n);
    for (let i = 0; i < n; i++) fr[i] = 20 * Math.pow(1000, i / (n - 1));
    f.getFrequencyResponse(fr, mag, ph);
    const Y = m => H - 4 - (H - 8) * (Math.min(24, Math.max(-40, 20 * Math.log10(m || 1e-5))) + 40) / 64;
    c.strokeStyle = '#2c2c34'; c.beginPath(); c.moveTo(0, Y(1)); c.lineTo(W, Y(1)); c.stroke();
    c.beginPath();
    for (let i = 0; i < n; i++) c[i ? 'lineTo' : 'moveTo'](W * i / (n - 1), Y(mag[i]));
    c.strokeStyle = '#5fc8d8'; c.lineWidth = 2; c.stroke();
    const xc = W * Math.log(snd.fcut / 20) / Math.log(1000);
    c.strokeStyle = '#8a8574'; c.setLineDash([3, 3]); c.beginPath(); c.moveTo(xc, 0); c.lineTo(xc, H); c.stroke(); c.setLineDash([]);
  } catch (_) { /* pas d'OfflineAudioContext : graphique omis */ }
}
// met l'interface à jour depuis `snd` (après un réglage, un chargement ou une remise à zéro)
function showSound() {
  $('wave').value = snd.wave; $('ftype').value = snd.ftype;
  $('envA').value = snd.a; $('envD').value = snd.d; $('envS').value = snd.s; $('envR').value = snd.r;
  $('fcut').value = hzToFcut(snd.fcut); $('fq').value = snd.fq; $('fenv').value = snd.fenv;
  $('oA').textContent = snd.a + ' ms'; $('oD').textContent = snd.d + ' ms';
  $('oS').textContent = Math.round(snd.s * 100) + ' %'; $('oR').textContent = snd.r + ' ms';
  $('oFc').textContent = Math.round(snd.fcut) + ' Hz'; $('oQ').textContent = snd.fq.toFixed(1);
  $('oEnv').textContent = Math.round(snd.fenv * 100) + ' %';
  drawEnv(); drawFilter();
}
const clampTo = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
$('wave').addEventListener('change', e => { snd.wave = e.target.value; showSound(); });
$('ftype').addEventListener('change', e => { snd.ftype = e.target.value; showSound(); });
$('envA').addEventListener('input', e => { snd.a = +e.target.value; showSound(); });
$('envD').addEventListener('input', e => { snd.d = +e.target.value; showSound(); });
$('envS').addEventListener('input', e => { snd.s = +e.target.value; showSound(); });
$('envR').addEventListener('input', e => { snd.r = +e.target.value; showSound(); });
$('fcut').addEventListener('input', e => { snd.fcut = Math.round(fcutToHz(+e.target.value)); showSound(); });
$('fq').addEventListener('input', e => { snd.fq = +e.target.value; showSound(); });
$('fenv').addEventListener('input', e => { snd.fenv = +e.target.value; showSound(); });
$('soundReset').addEventListener('click', () => { Object.assign(snd, SND_DEFAULT); showSound(); });

// points déplaçables : A (abscisse), D et S (abscisse et ordonnée), R (abscisse)
let envDrag = null;
function envXY(e) {
  const r = envCv.getBoundingClientRect();
  return [(e.clientX - r.left) * envCv.width / r.width, (e.clientY - r.top) * envCv.height / r.height];
}
envCv.addEventListener('pointerdown', e => {
  const [x, y] = envXY(e), g = envPoints();
  let best = null, bd = 18;
  for (const [k, [px, py]] of Object.entries(g.pts)) { const d = Math.hypot(x - px, y - py); if (d < bd) { bd = d; best = k; } }
  if (!best) return;
  envDrag = best;
  try { envCv.setPointerCapture(e.pointerId); } catch (_) { /* ignoré */ }
});
envCv.addEventListener('pointermove', e => {
  if (!envDrag) return;
  const [x, y] = envXY(e), g = envPoints();
  if (envDrag === 'a') snd.a = Math.round(clampTo((x - g.x0) / g.qw * MAXA, 1, MAXA));
  else if (envDrag === 'd') {
    snd.d = Math.round(clampTo((x - g.xa) / g.qw * MAXD, 10, MAXD));
    snd.s = Math.round(clampTo((g.bot - y) / (g.bot - g.top), 0, 1) * 100) / 100;
  } else snd.r = Math.round(clampTo((x - g.xs) / g.qw * MAXR, 10, MAXR));
  showSound();
});
const envUp = () => { envDrag = null; };
envCv.addEventListener('pointerup', envUp);
envCv.addEventListener('pointercancel', envUp);
showSound();
