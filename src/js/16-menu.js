//: Menu du clic droit : tous les réglages d'un hexagone (comme le panneau), rotation, notes personnalisées
// ---------- Menu du clic droit : réglages de l'hexagone, rotation, notes personnalisées ----------
const menu = document.createElement('div');
menu.id = 'ctxMenu'; menu.hidden = true;
document.body.appendChild(menu);
// 24 notes proposées ; celles de la gamme de l'hexagone sont en couleur vive (classe `in`), les autres
// en gris (classe `out`), et la tonique est marquée
const noteOpts = (slot, withSilence, sel) => {
  if (sel === undefined) sel = null;
  const steps = scaleSteps(slot);
  let h = withSilence ? `<option value=""${sel === null ? ' selected' : ''}>· silence</option>` : '';
  for (let i = 0; i < 24; i++) {
    const cls = !steps || steps.includes(i % 12) ? 'in' : 'out';
    const st = cls === 'in' ? 'color:#ffb000;font-weight:700' : 'color:#7a7a86';
    h += `<option class="${cls}" style="${st}" value="${i}"${sel === i ? ' selected' : ''}>${steps && cls === 'in' ? '● ' : ''}${NAMES[(slotTonic(slot) + i) % 12]}${i >= 12 ? "'" : ''}${i % 12 === 0 ? ' (tonique)' : ''}</option>`;
  }
  return h;
};
// mélange l'ordre des notes personnalisées entre les traits. Gamme : toutes les notes (y compris celle qui
// n'avait pas de trait plein) sont redistribuées, les n premières sur les traits pleins, les autres sur des
// traits brisés au hasard. Chromatique : chaque paire plein / brisé reste ensemble.
// Si l'option n'est pas active, on part des notes de la gamme.
function shuffleCustom(slot) {
  if (!slot.customOn) fillCustom(slot);
  const c = slot.custom, n = slot.n;
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  if (!SCALES[slot.mode].steps) shuffle(c);
  else {
    const pool = shuffle(c.flatMap(x => [x.p, x.b]).filter(v => v !== null));
    const where = shuffle(Array.from({ length: n }, (_, k) => k));
    c.forEach((x, k) => { x.p = k < pool.length ? pool[k] : null; x.b = null; });
    pool.slice(n).forEach((v, i) => { c[where[i]].b = v; });
  }
  slot.customOn = true;
  drawSlot(slot);
}
function closeMenu() { menu.hidden = true; }
function openMenu(slot, x, y) {
  const reopen = () => openMenu(slot, x, y);     // pour rafraîchir le titre après un changement d'hexagramme
  menu.innerHTML = `
    <div class="ctitle">${slot.label} : ${hexLabel(hexOf(slot))}</div>
    <div class="cform">
      <span>Hexagramme</span><select id="mHex">${hexOptions}</select>
      <span>Gamme</span><select id="mMode">${scaleOptions()}</select>
      <span>Canal MIDI</span><select id="mChan">${chanOptions}</select>
      <span>Tonique</span><select id="mTonic">${tonicOptions}</select>
      <span>Octave</span><select id="mOct">${octOptions}</select>
      <span>Rotation</span>
      <div class="crow"><label><input type="checkbox" id="mRot"> active</label>
        <button id="mDir" title="Sens de rotation">↻</button>
        <select id="mSpd" title="Vitesse de rotation">${SPEEDS.map(([v, t]) => `<option value="${v}">${t}</option>`).join('')}</select></div>
      <span>Côtés</span>
      <div class="crow"><label><input type="checkbox" id="mSev"> 7e côté (heptagone)</label></div>
      <span>Amorce</span>
      <div class="crow"><label><input type="checkbox" id="mLoop"> tous les</label>
        <input type="number" id="mLoopN" min="2" max="128" style="width:56px"> pas</div>
      <span>Tourner</span>
      <div class="crow"><button data-r="-1" title="Tourner de 60° dans le sens antihoraire">↺ 60°</button>
        <button data-r="1" title="Tourner de 60° dans le sens horaire">↻ 60°</button></div>
    </div>
    <div class="csep"></div>
    <label class="crow"><input type="checkbox" id="cOn"${slot.customOn ? ' checked' : ''}> Notes personnalisées</label>
    <div class="hint">Gamme ${SCALES[slot.mode].label}, tonique ${NAMES[slotTonic(slot)]}</div>
    <div class="cgrid"><b>trait</b><b>plein</b><b>brisé</b>${Array.from({ length: slot.n }, (_, k) => k).map(k =>
      `<span>${k + 1}</span><select data-k="${k}" data-w="p">${noteOpts(slot, true, slot.custom[k].p)}</select>` +
      `<select data-k="${k}" data-w="b">${noteOpts(slot, true, slot.custom[k].b)}</select>`).join('')}</div>
    <div class="crow"><button id="cFill" title="Copie les notes de la gamme actuelle">Reprendre la gamme</button>
      <button id="cShuffle" title="Change au hasard l'ordre des notes entre les traits, la note en trop de la gamme comprise">Mélanger l'ordre</button></div>
    <div class="csep"></div>
    <div class="crow"><button id="mReset" title="Remettre cet hexagramme à sa forme de départ">Réinit.</button>
      <button id="mAct" title="Griser l'hexagone : il ne joue ni ne reçoit">${slot.active ? 'Désactiver' : 'Activer'}</button>
      <button id="mDel" title="Supprimer cet hexagone">Supprimer</button>
      <button id="cClose">Fermer</button></div>`;
  const q = s => menu.querySelector(s);

  // réglages (mêmes fonctions que le panneau)
  q('#mHex').value = hexOf(slot);
  q('#mHex').addEventListener('change', e => { setHexagram(slot, +e.target.value); reopen(); });
  q('#mMode').value = slot.mode;
  q('#mMode').addEventListener('change', e => { setMode(slot, e.target.value); reopen(); });   // les notes proposées suivent la gamme
  q('#mTonic').value = slot.tonic === null ? '' : slot.tonic;
  q('#mTonic').addEventListener('change', e => { setTonic(slot, e.target.value); reopen(); });
  q('#mOct').value = slot.octave;
  q('#mOct').addEventListener('change', e => setOctave(slot, +e.target.value));
  q('#mChan').value = slot.channel;
  q('#mChan').addEventListener('change', e => setChannel(slot, +e.target.value));
  q('#mRot').checked = slot.rotOn;
  q('#mRot').addEventListener('change', e => setRotOn(slot, e.target.checked));
  q('#mDir').textContent = slot.rotDir > 0 ? '↻' : '↺';
  q('#mDir').addEventListener('click', e => {
    setRotDir(slot, -slot.rotDir);
    e.target.textContent = slot.rotDir > 0 ? '↻' : '↺';
  });
  q('#mSpd').value = slot.rotSpeed;
  q('#mSpd').addEventListener('change', e => setRotSpeed(slot, +e.target.value));
  q('#mSev').checked = slot.n === 7;
  q('#mSev').addEventListener('change', e => { setSides(slot, e.target.checked ? 7 : 6); reopen(); });
  q('#mLoop').checked = slot.loopOn; q('#mLoopN').value = slot.loopN;
  q('#mLoop').addEventListener('change', e => setLoop(slot, e.target.checked, q('#mLoopN').value));
  q('#mLoopN').addEventListener('input', e => { slot.loopN = Math.max(2, +e.target.value || 24); slot.loopNum.value = slot.loopN; });
  q('#mAct').addEventListener('click', () => { setActive(slot, !slot.active); reopen(); });
  q('#mDel').addEventListener('click', () => removeSlot(slot));
  for (const b of menu.querySelectorAll('[data-r]')) b.addEventListener('click', () => rotateBy(slot, +b.dataset.r));
  q('#mReset').addEventListener('click', () => { resetSlot(slot); reopen(); });

  // notes personnalisées
  const on = q('#cOn');
  on.addEventListener('change', () => { slot.customOn = on.checked; drawSlot(slot); });
  // le sélecteur fermé prend la couleur de la note choisie (ambre = dans la gamme)
  const tint = sel => { const o = sel.selectedOptions[0]; sel.style.color = o && o.classList.contains('in') ? '#ffb000' : o && o.classList.contains('out') ? '#9a9aa6' : ''; };
  menu.querySelectorAll('select[data-k]').forEach(tint);
  for (const sel of menu.querySelectorAll('select[data-k]')) sel.addEventListener('change', () => {
    tint(sel);
    const c = slot.custom[+sel.dataset.k];
    c[sel.dataset.w] = sel.value === '' ? null : +sel.value;
    slot.customOn = true; on.checked = true;     // modifier une note active l'option
    drawSlot(slot);
  });
  q('#cFill').addEventListener('click', () => {
    fillCustom(slot); slot.customOn = true; drawSlot(slot);
    reopen();
  });
  q('#cShuffle').addEventListener('click', () => { shuffleCustom(slot); reopen(); });
  q('#cClose').addEventListener('click', closeMenu);

  placeMenu(x, y);
}
function placeMenu(x, y) {
  menu.hidden = false;
  const w = menu.offsetWidth, h = menu.offsetHeight;
  menu.style.left = Math.max(4, Math.min(x, innerWidth - w - 8)) + 'px';
  menu.style.top = Math.max(4, Math.min(y, innerHeight - h - 8)) + 'px';
}
// menu du clic droit sur plusieurs hexagrammes sélectionnés
function openSelMenu(x, y) {
  const sel = selected();
  menu.innerHTML = `
    <div class="ctitle">${sel.length} hexagrammes sélectionnés</div>
    <div class="crow"><button id="sDel">Supprimer</button>
      <button id="sOff">Désactiver</button><button id="sOn">Activer</button></div>
    <div class="crow"><button id="sClear">Désélectionner</button><button id="cClose">Fermer</button></div>`;
  const q = s => menu.querySelector(s);
  q('#sDel').addEventListener('click', deleteSelected);
  q('#sOff').addEventListener('click', () => { sel.forEach(s => setActive(s, false)); closeMenu(); });
  q('#sOn').addEventListener('click', () => { sel.forEach(s => setActive(s, true)); closeMenu(); });
  q('#sClear').addEventListener('click', () => { clearSel(); closeMenu(); });
  q('#cClose').addEventListener('click', closeMenu);
  placeMenu(x, y);
}
// menu du clic droit sur la grille : nouvel hexagramme, taille de la grille
function openBoardMenu(x, y, gx, gy) {
  const free = freeCellNear(gx, gy);
  const canShrink = N > N_MIN && !slots.some(s => s.gx >= N - 1 || s.gy >= N - 1);
  menu.innerHTML = `
    <div class="ctitle">Grille ${N}x${N}</div>
    <div class="crow"><button id="bAdd"${free && slots.length < LABELS.length ? '' : ' disabled'}
      title="Ajoute un hexagramme tiré au hasard sur le point libre le plus proche">Nouvel hexagramme ici</button></div>
    <div class="crow"><button id="bGrow"${N < N_MAX ? '' : ' disabled'}>Agrandir (${N + 1}x${N + 1})</button>
      <button id="bShrink"${canShrink ? '' : ' disabled'}
        title="${canShrink ? '' : 'Un hexagone occupe la dernière ligne ou colonne (ou taille minimale)'}">Réduire (${N - 1}x${N - 1})</button></div>
    ${selected().length ? `<div class="crow"><button id="bSel" title="Supprime les hexagrammes sélectionnés">Supprimer la sélection (${selected().length})</button></div>` : ''}
    <div class="crow"><button id="cClose">Fermer</button></div>`;
  const q = s => menu.querySelector(s);
  if (q('#bSel')) q('#bSel').addEventListener('click', deleteSelected);
  q('#bAdd').addEventListener('click', () => {
    if (free) addSlot({ gx: free[0], gy: free[1], lines: randomLines() });
    closeMenu();
  });
  q('#bGrow').addEventListener('click', () => { setGridSize(N + 1); openBoardMenu(x, y, gx, gy); });
  q('#bShrink').addEventListener('click', () => { setGridSize(N - 1); openBoardMenu(x, y, gx, gy); });
  q('#cClose').addEventListener('click', closeMenu);
  placeMenu(x, y);
}
svg.addEventListener('contextmenu', e => {
  e.preventDefault();
  const p = svgPoint(e);
  openBoardMenu(e.clientX, e.clientY,
    Math.max(0, Math.min(N - 1, Math.round((p.x - M) / S))), Math.max(0, Math.min(N - 1, Math.round((p.y - M) / S))));
});
document.addEventListener('pointerdown', e => { if (!menu.hidden && !menu.contains(e.target)) closeMenu(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });
