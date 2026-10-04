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
    name: `setup-${day}_${hms.join('-')}`,
  };
}
// le champ Nom est pré-rempli avec la date et l'heure tant qu'on n'y a pas écrit soi-même ;
// il est rafraîchi à chaque sauvegarde pour que l'heure soit celle de la sauvegarde
let autoName = true;
function refreshName() { if (autoName) $setupName.value = stamp().name; }
$setupName.addEventListener('input', () => { autoName = false; });
refreshName();
const speedCode = v => (SPEEDS.find(x => Math.abs(x[0] - v) < 1e-6) || SPEEDS[4])[2];

function getSetup() {
  return {
    hexacorde: 1,
    date: stamp().iso,
    grille: N, pas: tickMs, tonique: opt.tonic, octave: opt.octave, portee: opt.softRange, mutation: opt.mutate,
    son: { onde: snd.wave, a: snd.a, d: snd.d, s: snd.s, r: snd.r,
           filtre: snd.ftype, coupure: snd.fcut, q: snd.fq, env: snd.fenv },
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
    try { d = JSON.parse(text.slice(a, b + 1)); } catch (e2) { return { error: 'texte illisible (JSON invalide)' }; }
  }
  if (!d || d.hexacorde !== 1 || !Array.isArray(d.hexagrammes)) return { error: 'ce n\'est pas un setup Hexacorde' };
  const num = (v, lo, hi, def) => (Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : def);
  const grille = Math.round(num(d.grille, N_MIN, N_MAX, 6));
  if (d.hexagrammes.length > LABELS.length) return { error: `${LABELS.length} hexagrammes au plus` };
  const used = new Set(), list = [], labels = new Set();
  for (const [i, x] of d.hexagrammes.entries()) {
    const L = typeof x.lettre === 'string' && x.lettre.length === 1 && LABELS.includes(x.lettre) && !labels.has(x.lettre) ? x.lettre : '#' + (i + 1);
    const label = L[0] === '#' ? undefined : L;
    if (label) labels.add(label);
    const pos = x.pos;
    if (!Array.isArray(pos) || !pos.every(v => Number.isInteger(v) && v >= 0 && v < grille) || pos.length !== 2)
      return { error: `${L} : position invalide (deux entiers de 0 à ${grille - 1})` };
    if (used.has(pos.join())) return { error: `${L} : position déjà occupée` };
    used.add(pos.join());
    let lines = null;
    if (typeof x.traits === 'string' && /^[01]{6,7}$/.test(x.traits)) lines = bits(x.traits);
    else if (Number.isInteger(x.numero) && HEX_LINES[x.numero]) lines = HEX_LINES[x.numero].slice();
    if (!lines) return { error: `${L} : "traits" (6 ou 7 chiffres 0 ou 1) ou "numero" (1 à 64) attendu` };
    const initial = typeof x.depart === 'string' && /^[01]{6,7}$/.test(x.depart) && x.depart.length === lines.length ? bits(x.depart) : lines.slice();
    const mode = x.gamme === undefined ? 'chromatique' : x.gamme;
    if (!SCALES[mode]) return { error: `${L} : gamme inconnue "${x.gamme}"` };
    const canal = x.canal === undefined ? (label ? LABELS.indexOf(label) : i) % 16 + 1 : x.canal;
    if (!Number.isInteger(canal) || canal < 1 || canal > 16) return { error: `${L} : canal de 1 à 16` };
    const r = x.rotation || {};
    const sp = SPEEDS.find(v => v[2] === (r.vitesse === undefined ? 'x1' : r.vitesse));
    if (!sp) return { error: `${L} : vitesse inconnue "${r.vitesse}" (x1 x2 x3 /2 /3 /4 /8)` };
    const angle = r.angle === undefined ? 0 : r.angle;
    if (!Number.isInteger(angle) || angle % 60) return { error: `${L} : angle multiple de 60` };
    let custom = null, customOn = false;
    if (x.notes !== undefined) {
      const n = x.notes || {};
      const six = a => Array.isArray(a) && a.length === lines.length;
      const inRange = v => Number.isInteger(v) && v >= 0 && v < 24;   // null = silence
      if (!six(n.plein) || !n.plein.every(v => v === null || inRange(v)) || !six(n.brise) || !n.brise.every(v => v === null || inRange(v)))
        return { error: `${L} : notes : "plein" et "brise" = autant de valeurs que de traits (6 ou 7), de 0 à 23 demi-tons (null = silence)` };
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
  const so = d.son || {}, son = {
    wave: WAVE_GAIN[so.onde] ? so.onde : snd.wave,
    a: Math.round(num(so.a, 1, 500, snd.a)), d: Math.round(num(so.d, 10, 1000, snd.d)),
    s: num(so.s, 0, 1, snd.s), r: Math.round(num(so.r, 10, 1500, snd.r)),
    ftype: FILTERS[so.filtre] ? so.filtre : snd.ftype, fcut: Math.round(num(so.coupure, 30, 16000, snd.fcut)),
    fq: num(so.q, 0.1, 20, snd.fq), fenv: num(so.env, 0, 1, snd.fenv),
  };
  return { cfg: {
    slots: list, son, grille,
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
  Object.assign(snd, cfg.son); showSound();
  // on reconstruit tous les hexagones : le nombre et la taille de la grille peuvent changer
  for (const s of slots.slice()) removeSlot(s, true);
  setGridSize(cfg.grille);
  for (const c of cfg.slots) addSlot({ ...c, rot: c.rot });
}

const say = msg => { $setupMsg.textContent = msg; };
function loadText(text, label) {
  const r = parseSetup(text);
  if (r.error) { say('Erreur : ' + r.error); return false; }
  applySetup(r.cfg);
  say(`${label} chargé.`);
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
    : '<option value="">(rien en mémoire)</option>';
  if (select && names.includes(select)) $setupList.value = select;
}
$('setupSave').addEventListener('click', () => {
  refreshName();
  const name = $setupName.value.trim() || 'setup', store = readStore();
  store[name] = getSetup();
  try { localStorage.setItem(STORE_KEY, JSON.stringify(store)); say(`« ${name} » gardé en mémoire.`); }
  catch (_) { say('Mémoire du navigateur inaccessible : utiliser le fichier ou le texte.'); }
  refreshList(name);
});
$('setupLoad').addEventListener('click', () => {
  const name = $setupList.value, d = readStore()[name];
  if (!d) { say('Rien à charger.'); return; }
  if (loadText(JSON.stringify(d), `« ${name} »`)) { $setupName.value = name; autoName = false; }
});
$('setupDel').addEventListener('click', () => {
  const name = $setupList.value, store = readStore();
  if (!(name in store)) return;
  delete store[name];
  try { localStorage.setItem(STORE_KEY, JSON.stringify(store)); } catch (_) { /* ignoré */ }
  say(`« ${name} » supprimé de la mémoire.`);
  refreshList();
});
refreshList();

// fichier
$('setupFile').addEventListener('click', () => {
  refreshName();
  const name = ($setupName.value.trim() || 'setup').replace(/[^\p{L}\p{N}_. -]+/gu, '_');
  download(new TextEncoder().encode(setupToText(getSetup()) + '\n'), `${name}.json`, 'application/json');
  say(`Fichier ${name}.json téléchargé.`);
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
  try { await navigator.clipboard.writeText($setupText.value); say('Texte copié dans le presse-papiers.'); }
  catch (_) { $setupText.select(); say('Texte écrit dans la zone : le copier à la main (Ctrl+C).'); }
});
$('setupApply').addEventListener('click', () => loadText($setupText.value, 'Texte'));
