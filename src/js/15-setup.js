//: Setup : sauvegarde et chargement (mémoire, fichier, texte)
// ---------- Setup : sauvegarde et chargement ----------
const $setupText = $('setupText'), $setupMsg = $('setupMsg'), $setupList = $('setupList'), $setupName = $('setupName');
const STORE_KEY = 'hexacorde.setups';

// date et heure locales : `iso` (ISO 8601 avec fuseau) pour le contenu, `name` pour le nom de fichier
// (pas de « : » dans un nom de fichier)
function stamp() {
  const d = new Date(), p = n => String(n).padStart(2, '0');
  const off = -d.getTimezoneOffset(), sg = off >= 0 ? '+' : '-';
  const day = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  const hms = [d.getHours(), d.getMinutes(), d.getSeconds()].map(p);
  return {
    iso: `${day}T${hms.join(':')}${sg}${p(Math.floor(Math.abs(off) / 60))}:${p(Math.abs(off) % 60)}`,
    name: `hexacorde_${day}_${hms.join('-')}`,
  };
}
// le champ Nom est pré-rempli avec la date et l'heure tant qu'on n'y a pas écrit soi-même ;
// il est rafraîchi à chaque sauvegarde pour que l'heure soit celle de la sauvegarde
let autoName = true;
function refreshName() { if (autoName) $setupName.value = stamp().name; }
$setupName.addEventListener('input', () => { autoName = false; });
refreshName();
const speedCode = v => (SPEEDS.find(x => Math.abs(x[0] - v) < 1e-6) || SPEEDS[4])[2];

const soundToJson = x => ({ onde: x.wave, a: x.a, d: x.d, s: x.s, r: x.r, filtre: x.ftype, coupure: x.fcut, q: x.fq, env: x.fenv,
  ...(x.wave === 'fm' ? { fm: x.fmr, indice: x.fmi } : {}) });
// son lu dans un setup : chaque champ est facultatif (valeur de def sinon) et borné
function parseSound(so, def) {
  const num = (v, lo, hi, d) => (Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d);
  so = so || {};
  return {
    wave: WAVE_GAIN[so.onde] ? so.onde : def.wave,
    a: Math.round(num(so.a, 1, 500, def.a)), d: Math.round(num(so.d, 10, 1000, def.d)),
    s: num(so.s, 0, 1, def.s), r: Math.round(num(so.r, 10, 1500, def.r)),
    ftype: FILTERS[so.filtre] ? so.filtre : def.ftype, fcut: Math.round(num(so.coupure, 30, 16000, def.fcut)),
    fq: num(so.q, 0.1, 20, def.fq), fenv: num(so.env, 0, 1, def.fenv),
    fmr: num(so.fm, 0.5, 12, def.fmr), fmi: num(so.indice, 0, 12, def.fmi),
  };
}

function getSetup() {
  return {
    hexacorde: 1,
    date: stamp().iso,
    grille: [NX, NY], gamme: opt.scale, canalUnique: opt.chanAll === null ? undefined : opt.chanAll + 1, uniforme: opt.uniform || undefined, pas: tickMs, tonique: opt.tonic, octave: opt.octave, portee: opt.softRange, mutation: opt.mutate,
    son: soundToJson(snd),
    // sons propres à un canal (numéro de canal 1 à 16) : seulement ceux qui existent
    ...(chanSnd.some(Boolean) ? { sons: Object.fromEntries(chanSnd.map((x, i) => [i + 1, x]).filter(([, x]) => x).map(([i, x]) => [i, soundToJson(x)])) } : {}),
    ...(prog.some(p => p !== null) ? { programmes: Object.fromEntries(prog.map((p, i) => [i + 1, p]).filter(([, p]) => p !== null)) } : {}),
    hexagrammes: slots.map(s => ({
      lettre: s.label, pos: [s.gx, s.gy], traits: s.lines.join(''), depart: s.initial.join(''),
      gamme: s.mode, canal: s.channel + 1,
      rotation: { active: s.rotOn, sens: s.rotDir > 0 ? 'horaire' : 'antihoraire',
                  vitesse: speedCode(s.rotSpeed), angle: modn(s.rot, s.n) * 60 },
      ...(s.active ? {} : { actif: false }),
      ...(s.tonic === null ? {} : { tonique: s.tonic }), ...(s.octave ? { octave: s.octave } : {}),
      ...(s.loopOn ? { amorce: s.loopN } : {}),
      // les notes personnalisées ne sont écrites que si elles sont actives (sinon la gamme suffit)
      ...(s.customOn ? { notes: { active: true, plein: s.custom.map(c => c.p), brise: s.custom.map(c => c.b) } } : {}),
    })),
  };
}
// JSON lisible : un hexagramme par ligne
function setupToText(d) {
  const { hexagrammes, ...head } = d;
  const h = JSON.stringify(head).slice(1, -1);
  return `{${h},\n"hexagrammes": [\n${hexagrammes.map(x => '  ' + JSON.stringify(x)).join(',\n')}\n]}`;
}

// vérifie tout avant de toucher à l'état ; renvoie { error } ou { cfg }
function parseSetup(text) {
  let d;
  try { d = JSON.parse(text); }
  catch (_) {
    const a = text.indexOf('{'), b = text.lastIndexOf('}');
    try { d = JSON.parse(text.slice(a, b + 1)); } catch (e2) { return { error: t('err.json') }; }
  }
  if (!d || d.hexacorde !== 1 || !Array.isArray(d.hexagrammes)) return { error: t('err.notsetup') };
  const num = (v, lo, hi, def) => (Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : def);
  const gr = Array.isArray(d.grille) ? d.grille : [d.grille, d.grille];     // un nombre = grille carrée
  const cols = Math.round(num(gr[0], N_MIN, N_MAX, 6)), rows = Math.round(num(gr[1], N_MIN, N_MAX, 6));
  if (d.hexagrammes.length > LABELS.length) return { error: t('err.max', LABELS.length) };
  const used = new Set(), list = [], labels = new Set();
  for (const [i, x] of d.hexagrammes.entries()) {
    const L = typeof x.lettre === 'string' && x.lettre.length === 1 && LABELS.includes(x.lettre) && !labels.has(x.lettre) ? x.lettre : '#' + (i + 1);
    const label = L[0] === '#' ? undefined : L;
    if (label) labels.add(label);
    const pos = x.pos;
    if (!Array.isArray(pos) || !Number.isInteger(pos[0]) || !Number.isInteger(pos[1]) || pos.length !== 2 || pos[0] < 0 || pos[0] >= cols || pos[1] < 0 || pos[1] >= rows)
      return { error: t('err.pos', L, cols - 1, rows - 1) };
    if (used.has(pos.join())) return { error: t('err.occupied', L) };
    used.add(pos.join());
    let lines = null;
    if (typeof x.traits === 'string' && /^[01]{6,7}$/.test(x.traits)) lines = bits(x.traits);
    else if (Number.isInteger(x.numero) && HEX_LINES[x.numero]) lines = HEX_LINES[x.numero].slice();
    if (!lines) return { error: t('err.lines', L) };
    const initial = typeof x.depart === 'string' && /^[01]{6,7}$/.test(x.depart) && x.depart.length === lines.length ? bits(x.depart) : lines.slice();
    const mode = x.gamme === undefined ? 'chromatique' : x.gamme;
    if (!SCALES[mode]) return { error: t('err.scale', L, x.gamme) };
    const canal = x.canal === undefined ? (label ? LABELS.indexOf(label) : i) % 16 + 1 : x.canal;
    if (!Number.isInteger(canal) || canal < 1 || canal > 16) return { error: t('err.chan', L) };
    const r = x.rotation || {};
    const sp = SPEEDS.find(v => v[2] === (r.vitesse === undefined ? 'x1' : r.vitesse));
    if (!sp) return { error: t('err.speed', L, r.vitesse) };
    const angle = r.angle === undefined ? 0 : r.angle;
    if (!Number.isInteger(angle) || angle % 60) return { error: t('err.angle', L) };
    let custom = null, customOn = false;
    if (x.notes !== undefined) {
      const n = x.notes || {};
      const six = a => Array.isArray(a) && a.length === lines.length;
      const inRange = v => Number.isInteger(v) && v >= 0 && v < 24;   // null = silence
      if (!six(n.plein) || !n.plein.every(v => v === null || inRange(v)) || !six(n.brise) || !n.brise.every(v => v === null || inRange(v)))
        return { error: t('err.notes', L) };
      custom = n.plein.map((p, k) => ({ p, b: n.brise[k] }));
      customOn = !!n.active;
    }
    // amorce : par hexagone ; l'ancien format avait un seul réglage global, pour le premier hexagone
    const tonic = Number.isInteger(x.tonique) && x.tonique >= 0 && x.tonique < 12 ? x.tonique : null;
    const oct = Number.isInteger(x.octave) ? Math.max(-3, Math.min(3, x.octave)) : 0;
    const am = x.amorce !== undefined ? x.amorce : (i === 0 ? d.amorce : 0);
    const loopOn = Number.isFinite(am) && am >= 2;
    list.push({ label, gx: pos[0], gy: pos[1], lines, initial, mode, channel: canal - 1, custom, customOn,
                active: x.actif !== false, tonic, octave: oct, loopOn, loopN: loopOn ? Math.min(128, Math.round(am)) : 24,
                rotOn: !!r.active, rotDir: r.sens === 'antihoraire' ? -1 : 1, rotSpeed: sp[0], rot: modn(angle / 60, lines.length) });
  }
  const son = parseSound(d.son, SND_DEFAULT);
  const sons = {};
  for (const [k, v] of Object.entries(d.sons && typeof d.sons === 'object' ? d.sons : {}))
    if (Number.isInteger(+k) && +k >= 1 && +k <= 16) sons[+k - 1] = parseSound(v, son);
  const programmes = {};
  for (const [k, v] of Object.entries(d.programmes && typeof d.programmes === 'object' ? d.programmes : {}))
    if (Number.isInteger(+k) && +k >= 1 && +k <= 16 && Number.isInteger(v) && v >= 0 && v <= 127) programmes[+k - 1] = v;
  return { cfg: {
    slots: list, son, sons, programmes, cols, rows, gamme: SCALES[d.gamme] ? d.gamme : 'chromatique', uniforme: !!d.uniforme,
    canalUnique: Number.isInteger(d.canalUnique) && d.canalUnique >= 1 && d.canalUnique <= 16 ? d.canalUnique - 1 : null,
    pas: Math.round(num(d.pas, 80, 700, 240)), tonique: Math.round(num(d.tonique, 0, 11, 0)), octave: Math.round(num(d.octave, -3, 3, 0)),
    portee: num(d.portee, 1, 9, 2.5), mutation: !!d.mutation,
  } };
}

function applySetup(cfg) {
  silence();
  setTempo(cfg.pas);
  opt.tonic = cfg.tonique; $('tonic').value = opt.tonic;
  opt.octave = cfg.octave; $('octave').value = opt.octave;
  opt.softRange = cfg.portee; $('soft').value = opt.softRange;
  opt.mutate = cfg.mutation; $('mutate').checked = opt.mutate;
  Object.assign(snd, cfg.son);
  chanSnd.fill(null); for (const [ch, x] of Object.entries(cfg.sons)) chanSnd[+ch] = x;
  prog.fill(null); for (const [ch, p] of Object.entries(cfg.programmes)) prog[+ch] = p;
  selectSoundChannel(null); fillPrograms(); sendPrograms();
  // on reconstruit tous les hexagones : le nombre et la taille de la grille peuvent changer
  for (const s of slots.slice()) removeSlot(s, true);
  opt.scale = cfg.gamme; $('scaleBase').value = opt.scale;
  setChanAll(cfg.canalUnique);
  opt.uniform = cfg.uniforme; $('uniform').checked = opt.uniform;
  setGridSize(cfg.cols, cfg.rows);
  for (const c of cfg.slots) addSlot({ ...c, rot: c.rot });
}

const say = msg => { $setupMsg.textContent = msg; };
function loadText(text, label) {
  const r = parseSetup(text);
  if (r.error) { say(t('setup.msg.error', r.error)); return false; }
  applySetup(r.cfg);
  say(t('setup.msg.loaded', label));
  return true;
}

// mémoire du navigateur
function readStore() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch (_) { return {}; }
}
function refreshList(select) {
  const names = Object.keys(readStore()).sort();
  $setupList.innerHTML = names.length
    ? names.map(n => `<option>${n.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</option>`).join('')
    : '<option value="">' + t('setup.empty') + '</option>';
  if (select && names.includes(select)) $setupList.value = select;
}
$('setupSave').addEventListener('click', () => {
  refreshName();
  const name = $setupName.value.trim() || 'hexacorde', store = readStore();
  store[name] = getSetup();
  try { localStorage.setItem(STORE_KEY, JSON.stringify(store)); say(t('setup.msg.saved', name)); }
  catch (_) { say(t('setup.msg.nostore')); }
  refreshList(name);
});
$('setupLoad').addEventListener('click', () => {
  const name = $setupList.value, d = readStore()[name];
  if (!d) { say(t('setup.msg.nothing')); return; }
  if (loadText(JSON.stringify(d), `« ${name} »`)) { $setupName.value = name; autoName = false; }
});
$('setupDel').addEventListener('click', () => {
  const name = $setupList.value, store = readStore();
  if (!(name in store)) return;
  delete store[name];
  try { localStorage.setItem(STORE_KEY, JSON.stringify(store)); } catch (_) { /* ignoré */ }
  say(t('setup.msg.deleted', name));
  refreshList();
});
refreshList();

// fichier
$('setupFile').addEventListener('click', () => {
  refreshName();
  const name = ($setupName.value.trim() || 'hexacorde').replace(/[^\p{L}\p{N}_. -]+/gu, '_');
  download(new TextEncoder().encode(setupToText(getSetup()) + '\n'), `${name}.json`, 'application/json');
  say(t('setup.msg.file', name));
});
$('setupOpen').addEventListener('click', () => $('setupPick').click());
$('setupPick').addEventListener('change', async e => {
  const f = e.target.files[0];
  e.target.value = '';
  if (!f) return;
  const text = await f.text();
  $setupText.value = text;
  if (loadText(text, f.name)) { $setupName.value = f.name.replace(/\.[^.]*$/, ''); autoName = false; }
});

// texte, copier / coller
$('setupCopy').addEventListener('click', async () => {
  $setupText.value = setupToText(getSetup());
  try { await navigator.clipboard.writeText($setupText.value); say(t('setup.msg.copied')); }
  catch (_) { $setupText.select(); say(t('setup.msg.manual')); }
});
$('setupApply').addEventListener('click', () => loadText($setupText.value, t('setup.text')));
