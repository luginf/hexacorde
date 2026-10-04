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
    pas: tickMs, tonique: opt.tonic, portee: opt.softRange, mutation: opt.mutate,
    amorce: opt.loop ? opt.loopN : 0,
    hexagrammes: slots.map(s => ({
      lettre: LABELS[s.id], pos: [s.gx, s.gy], traits: s.lines.join(''), depart: s.initial.join(''),
      gamme: s.mode, canal: s.channel + 1,
      rotation: { active: s.rotOn, sens: s.rotDir > 0 ? 'horaire' : 'antihoraire',
                  vitesse: speedCode(s.rotSpeed), angle: mod6(s.rot) * 60 },
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
  if (d.hexagrammes.length !== slots.length) return { error: `il faut ${slots.length} hexagrammes` };
  const used = new Set(), list = [];
  for (const [i, x] of d.hexagrammes.entries()) {
    const L = LABELS[i];
    const pos = x.pos;
    if (!Array.isArray(pos) || !pos.every(v => Number.isInteger(v) && v >= 0 && v < N) || pos.length !== 2)
      return { error: `${L} : position invalide (deux entiers de 0 à ${N - 1})` };
    if (used.has(pos.join())) return { error: `${L} : position déjà occupée` };
    used.add(pos.join());
    let lines = null;
    if (typeof x.traits === 'string' && /^[01]{6}$/.test(x.traits)) lines = bits(x.traits);
    else if (Number.isInteger(x.numero) && HEX_LINES[x.numero]) lines = HEX_LINES[x.numero].slice();
    if (!lines) return { error: `${L} : "traits" (6 chiffres 0 ou 1) ou "numero" (1 à 64) attendu` };
    const initial = typeof x.depart === 'string' && /^[01]{6}$/.test(x.depart) ? bits(x.depart) : lines.slice();
    const mode = x.gamme === undefined ? 'chromatique' : x.gamme;
    if (!SCALES[mode]) return { error: `${L} : gamme inconnue "${x.gamme}"` };
    const canal = x.canal === undefined ? i + 1 : x.canal;
    if (!Number.isInteger(canal) || canal < 1 || canal > 16) return { error: `${L} : canal de 1 à 16` };
    const r = x.rotation || {};
    const sp = SPEEDS.find(v => v[2] === (r.vitesse === undefined ? 'x1' : r.vitesse));
    if (!sp) return { error: `${L} : vitesse inconnue "${r.vitesse}" (x1 x2 x3 /2 /3 /4 /8)` };
    const angle = r.angle === undefined ? 0 : r.angle;
    if (!Number.isInteger(angle) || angle % 60) return { error: `${L} : angle multiple de 60` };
    let custom = null, customOn = false;
    if (x.notes !== undefined) {
      const n = x.notes || {};
      const six = a => Array.isArray(a) && a.length === 6;
      const inRange = v => Number.isInteger(v) && v >= 0 && v < 24;
      if (!six(n.plein) || !n.plein.every(inRange) || !six(n.brise) || !n.brise.every(v => v === null || inRange(v)))
        return { error: `${L} : notes : "plein" et "brise" = 6 valeurs de 0 à 23 demi-tons (null = silence pour le brisé)` };
      custom = n.plein.map((p, k) => ({ p, b: n.brise[k] }));
      customOn = !!n.active;
    }
    list.push({ gx: pos[0], gy: pos[1], lines, initial, mode, channel: canal - 1, custom, customOn,
                rotOn: !!r.active, rotDir: r.sens === 'antihoraire' ? -1 : 1, rotSpeed: sp[0], rot: mod6(angle / 60) });
  }
  const num = (v, lo, hi, def) => (Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : def);
  return { cfg: {
    slots: list,
    pas: Math.round(num(d.pas, 80, 700, 240)), tonique: Math.round(num(d.tonique, 0, 11, 0)),
    portee: num(d.portee, 1, 9, 2.5), mutation: !!d.mutation,
    amorce: Number.isFinite(d.amorce) && d.amorce >= 2 ? Math.min(128, Math.round(d.amorce)) : 0,
  } };
}

function applySetup(cfg) {
  silence();
  tickMs = cfg.pas; $('tempo').value = tickMs; $('tempoVal').textContent = tickMs + ' ms';
  opt.tonic = cfg.tonique; $('tonic').value = opt.tonic;
  opt.softRange = cfg.portee; $('soft').value = opt.softRange;
  opt.mutate = cfg.mutation; $('mutate').checked = opt.mutate;
  opt.loop = cfg.amorce > 0; $('loop').checked = opt.loop;
  if (opt.loop) { opt.loopN = cfg.amorce; $('loopN').value = opt.loopN; }
  slots.forEach((s, i) => {
    const c = cfg.slots[i];
    Object.assign(s, { gx: c.gx, gy: c.gy, lines: c.lines, initial: c.initial, mode: c.mode, channel: c.channel,
      rotOn: c.rotOn, rotDir: c.rotDir, rotSpeed: c.rotSpeed, rot: c.rot,
      rotAcc: 0, rotDelta: 0, rotT0: -1e9, flash: [-99, -99, -99, -99, -99, -99] });
    s.customOn = c.customOn;
    if (c.custom) s.custom = c.custom; else fillCustom(s);
    s.modeSel.value = s.mode; s.chanSel.value = s.channel; s.rotChk.checked = s.rotOn;
    s.dirBtn.textContent = s.rotDir > 0 ? '↻' : '↺'; s.spdSel.value = s.rotSpeed;
    drawSlot(s);                              // met aussi à jour le menu d'hexagramme
  });
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
