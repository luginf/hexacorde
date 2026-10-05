//: Édition du son interne : onde, graphique ADSR (points déplaçables), filtre
// ---------- Menu du son interne ----------
const SND_DEFAULT = { ...snd };
// le son édité : le son de base (editCh = null) ou celui d'un canal (le son propre n'existe qu'après une modification)
let cur = snd, editCh = null;
const envCv = $('envCv'), fltCv = $('fltCv');
const fcutToHz = v => 30 * Math.pow(16000 / 30, v), hzToFcut = f => Math.log(f / 30) / Math.log(16000 / 30);
const MAXA = 500, MAXD = 1000, MAXR = 1500;

// couleur d'une variable du thème (pour les canevas, qui ne lisent pas le CSS)
const cssVar = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
// listes d'onde et de filtre dans la langue courante (réappelée au changement de langue)
function fillSoundLists() {
  $('wave').innerHTML = Object.keys(WAVE_GAIN).map(w => `<option value="${w}">${t('wave.' + w)}</option>`).join('');
  $('ftype').innerHTML = Object.keys(FILTERS).map(k => `<option value="${k}">${t('filter.' + k)}</option>`).join('');
  $('preset').innerHTML = `<option value="">${t('snd.preset.ph')}</option>` +
    Object.keys(SOUND_PRESETS).map(k => `<option value="${k}">${t('preset.' + k)}</option>`).join('');
  fillSoundChannels();
}
// choix du canal dont on édite le son ; ● = canal ayant un son propre
function fillSoundChannels() {
  $('soundCh').innerHTML = `<option value="all">${t('snd.allch')}</option>` +
    Array.from({ length: 16 }, (_, i) => `<option value="${i}">${chanSnd[i] ? '● ' : ''}${t('snd.ch', i + 1)}</option>`).join('');
  $('soundCh').value = editCh === null ? 'all' : editCh;
}
fillSoundLists();

// géométrie du graphique : quatre quarts de largeur, la tenue (S) a une largeur fixe
function envPoints() {
  const W = envCv.width, H = envCv.height, x0 = 10, qw = (W - 20) / 4, top = 12, bot = H - 12;
  const xa = x0 + qw * cur.a / MAXA, xd = xa + qw * cur.d / MAXD, xs = xd + qw * 0.6, xr = xs + qw * cur.r / MAXR;
  const ys = bot - (bot - top) * cur.s;
  return { x0, qw, top, bot, pts: { a: [xa, top], d: [xd, ys], r: [xr, bot] }, xa, xd, xs, xr, ys };
}
function drawEnv() {
  const c = envCv.getContext('2d'), g = envPoints();
  c.clearRect(0, 0, envCv.width, envCv.height);
  c.strokeStyle = cssVar('--rule'); c.lineWidth = 1; c.beginPath();
  for (const x of [g.xa, g.xd, g.xs]) { c.moveTo(x, g.top); c.lineTo(x, g.bot); }
  c.stroke();
  c.beginPath(); c.moveTo(g.x0, g.bot); c.lineTo(g.xa, g.top); c.lineTo(g.xd, g.ys); c.lineTo(g.xs, g.ys); c.lineTo(g.xr, g.bot);
  c.globalAlpha = 0.18; c.fillStyle = cssVar('--yang'); c.fill(); c.globalAlpha = 1;
  c.strokeStyle = cssVar('--yang'); c.lineWidth = 2; c.stroke();
  c.fillStyle = cssVar('--ink');
  for (const [x, y] of Object.values(g.pts)) { c.beginPath(); c.arc(x, y, 5, 0, 7); c.fill(); }
}
// courbe de réponse du filtre (échelle log en fréquence, de -40 à +24 dB)
function drawFilter() {
  const c = fltCv.getContext('2d'), W = fltCv.width, H = fltCv.height, n = 136;
  c.clearRect(0, 0, W, H);
  try {
    const f = new OfflineAudioContext(1, 1, 44100).createBiquadFilter();
    f.type = cur.ftype; f.frequency.value = cur.fcut; f.Q.value = cur.fq;
    const fr = new Float32Array(n), mag = new Float32Array(n), ph = new Float32Array(n);
    for (let i = 0; i < n; i++) fr[i] = 20 * Math.pow(1000, i / (n - 1));
    f.getFrequencyResponse(fr, mag, ph);
    const Y = m => H - 4 - (H - 8) * (Math.min(24, Math.max(-40, 20 * Math.log10(m || 1e-5))) + 40) / 64;
    c.strokeStyle = cssVar('--rule'); c.beginPath(); c.moveTo(0, Y(1)); c.lineTo(W, Y(1)); c.stroke();
    c.beginPath();
    for (let i = 0; i < n; i++) c[i ? 'lineTo' : 'moveTo'](W * i / (n - 1), Y(mag[i]));
    c.strokeStyle = cssVar('--yin'); c.lineWidth = 2; c.stroke();
    const xc = W * Math.log(cur.fcut / 20) / Math.log(1000);
    c.strokeStyle = cssVar('--dim'); c.setLineDash([3, 3]); c.beginPath(); c.moveTo(xc, 0); c.lineTo(xc, H); c.stroke(); c.setLineDash([]);
  } catch (_) { /* pas d'OfflineAudioContext : graphique omis */ }
}
// met l'interface à jour depuis `snd` (après un réglage, un chargement ou une remise à zéro)
function showSound() {
  $('fmRow').hidden = cur.wave !== 'fm';
  $('fmr').value = cur.fmr; $('fmi').value = cur.fmi;
  $('oFmr').textContent = '× ' + cur.fmr; $('oFmi').textContent = cur.fmi.toFixed(1);
  $('soundInherit').hidden = editCh === null || !chanSnd[editCh];
  $('wave').value = cur.wave; $('ftype').value = cur.ftype;
  $('envA').value = cur.a; $('envD').value = cur.d; $('envS').value = cur.s; $('envR').value = cur.r;
  $('fcut').value = hzToFcut(cur.fcut); $('fq').value = cur.fq; $('fenv').value = cur.fenv;
  $('oA').textContent = cur.a + ' ms'; $('oD').textContent = cur.d + ' ms';
  $('oS').textContent = Math.round(cur.s * 100) + ' %'; $('oR').textContent = cur.r + ' ms';
  $('oFc').textContent = Math.round(cur.fcut) + ' Hz'; $('oQ').textContent = cur.fq.toFixed(1);
  $('oEnv').textContent = Math.round(cur.fenv * 100) + ' %';
  drawEnv(); drawFilter();
}
// après une modification : un canal édité garde désormais son propre son
function soundChanged() {
  if (editCh !== null && chanSnd[editCh] !== cur) { chanSnd[editCh] = cur; fillSoundChannels(); }
  showSound();
}
function selectSoundChannel(ch) {
  editCh = ch;
  cur = ch === null ? snd : (chanSnd[ch] || { ...snd });
  fillSoundChannels();
  showSound();
}
$('soundCh').addEventListener('change', e => selectSoundChannel(e.target.value === 'all' ? null : +e.target.value));
$('soundInherit').addEventListener('click', () => { chanSnd[editCh] = null; selectSoundChannel(editCh); });
$('preset').addEventListener('change', e => {
  if (SOUND_PRESETS[e.target.value]) { Object.assign(cur, { fmr: SND_DEFAULT.fmr, fmi: SND_DEFAULT.fmi }, SOUND_PRESETS[e.target.value]); soundChanged(); }
  e.target.value = '';
});
const clampTo = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
$('wave').addEventListener('change', e => { cur.wave = e.target.value; soundChanged(); });
$('ftype').addEventListener('change', e => { cur.ftype = e.target.value; soundChanged(); });
$('fmr').addEventListener('input', e => { cur.fmr = +e.target.value; soundChanged(); });
$('fmi').addEventListener('input', e => { cur.fmi = +e.target.value; soundChanged(); });
$('envA').addEventListener('input', e => { cur.a = +e.target.value; soundChanged(); });
$('envD').addEventListener('input', e => { cur.d = +e.target.value; soundChanged(); });
$('envS').addEventListener('input', e => { cur.s = +e.target.value; soundChanged(); });
$('envR').addEventListener('input', e => { cur.r = +e.target.value; soundChanged(); });
$('fcut').addEventListener('input', e => { cur.fcut = Math.round(fcutToHz(+e.target.value)); soundChanged(); });
$('fq').addEventListener('input', e => { cur.fq = +e.target.value; soundChanged(); });
$('fenv').addEventListener('input', e => { cur.fenv = +e.target.value; soundChanged(); });
$('soundReset').addEventListener('click', () => { Object.assign(cur, SND_DEFAULT); soundChanged(); });

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
  if (envDrag === 'a') cur.a = Math.round(clampTo((x - g.x0) / g.qw * MAXA, 1, MAXA));
  else if (envDrag === 'd') {
    cur.d = Math.round(clampTo((x - g.xa) / g.qw * MAXD, 10, MAXD));
    cur.s = Math.round(clampTo((g.bot - y) / (g.bot - g.top), 0, 1) * 100) / 100;
  } else cur.r = Math.round(clampTo((x - g.xs) / g.qw * MAXR, 10, MAXR));
  soundChanged();
});
const envUp = () => { envDrag = null; };
envCv.addEventListener('pointerup', envUp);
envCv.addEventListener('pointercancel', envUp);
showSound();
