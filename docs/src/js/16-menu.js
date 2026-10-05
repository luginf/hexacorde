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
  let h = withSilence ? `<option value=""${sel === null ? ' selected' : ''}>${t('m.silence')}</option>` : '';
  for (let i = 0; i < 24; i++) {
    const cls = !steps || steps.includes(i % 12) ? 'in' : 'out';
    const st = cls === 'in' ? 'color:var(--yang);font-weight:700' : 'color:var(--dim)';
    h += `<option class="${cls}" style="${st}" value="${i}"${sel === i ? ' selected' : ''}>${steps && cls === 'in' ? '● ' : ''}${NAMES[(slotTonic(slot) + i) % 12]}${i >= 12 ? "'" : ''}${i % 12 === 0 ? t('m.tonicMark') : ''}</option>`;
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
      <span>${t('m.hex')}</span><select id="mHex">${hexOptions()}</select>
      <span>${t('m.scale')}</span><select id="mMode">${scaleOptions()}</select>
      <span>${t('m.chan')}</span><select id="mChan">${chanOptions}</select>
      <span>${t('m.tonic')}</span><select id="mTonic">${tonicOptions(true)}</select>
      <span>${t('m.oct')}</span><select id="mOct">${octOptions()}</select>
      <span>${t('m.rot')}</span>
      <div class="crow"><label><input type="checkbox" id="mRot"> ${t('m.rot.active')}</label>
        <button id="mDir" title="${t('dir.title')}">↻</button>
        <select id="mSpd" title="${t('spd.title')}">${SPEEDS.map(([v, tt]) => `<option value="${v}">${tt}</option>`).join('')}</select></div>
      <span>${t('m.sides')}</span>
      <div class="crow"><label><input type="checkbox" id="mSev"> ${t('m.seven')}</label></div>
      <span>${t('m.loop')}</span>
      <div class="crow"><label><input type="checkbox" id="mLoop"> ${t('m.loop.every')}</label>
        <input type="number" id="mLoopN" min="2" max="128" style="width:56px"> ${t('steps')}</div>
      <span>${t('m.turn')}</span>
      <div class="crow"><button data-r="-1" title="${t('m.ccw.title')}">↺ 60°</button>
        <button data-r="1" title="${t('m.cw.title')}">↻ 60°</button></div>
    </div>
    <div class="csep"></div>
    <label class="crow"><input type="checkbox" id="cOn"${slot.customOn ? ' checked' : ''}> ${t('m.custom')}</label>
    <div class="hint">${t('m.hint', scaleLabel(slot.mode), NAMES[slotTonic(slot)])}</div>
    <div class="cgrid"><b>${t('m.line')}</b><b>${t('m.solid')}</b><b>${t('m.broken')}</b>${Array.from({ length: slot.n }, (_, k) => k).map(k =>
      `<span>${k + 1}</span><select data-k="${k}" data-w="p">${noteOpts(slot, true, slot.custom[k].p)}</select>` +
      `<select data-k="${k}" data-w="b">${noteOpts(slot, true, slot.custom[k].b)}</select>`).join('')}</div>
    <div class="crow"><button id="cFill" title="${t('m.fill.title')}">${t('m.fill')}</button>
      <button id="cShuffle" title="${t('m.shuffle.title')}">${t('m.shuffle')}</button></div>
    <div class="csep"></div>
    <div class="crow"><button id="mReset" title="${t('reset.title')}">${t('reset')}</button>
      <button id="mAct" title="${t('m.deact.title')}">${slot.active ? t('m.deactivate') : t('m.activate')}</button>
      <button id="mDel" title="${t('del.title')}">${t('m.delete')}</button>
      <button id="cClose">${t('m.close')}</button></div>`;
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
  q('#mChan').value = slot.channel; q('#mChan').disabled = opt.chanAll !== null;
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
  const tint = sel => { const o = sel.selectedOptions[0]; sel.style.color = o && o.classList.contains('in') ? 'var(--yang)' : o && o.classList.contains('out') ? 'var(--dim)' : ''; };
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
    <div class="ctitle">${t('sel.title', sel.length)}</div>
    <div class="crow"><button id="sDel">${t('m.delete')}</button>
      <button id="sOff">${t('m.deactivate')}</button><button id="sOn">${t('m.activate')}</button></div>
    <div class="crow"><button id="sClear">${t('sel.clear')}</button><button id="cClose">${t('m.close')}</button></div>`;
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
  menu.innerHTML = `
    <div class="ctitle">${t('board.title', NX, NY)}</div>
    <div class="crow"><button id="bAdd"${free && slots.length < LABELS.length ? '' : ' disabled'}
      title="${t('board.add.title')}">${t('board.add')}</button></div>
    <div class="cgrid2"><span>${t('board.size')}</span>
      <input type="number" id="bCols" min="${N_MIN}" max="${N_MAX}" value="${NX}" title="${t('board.cols')}"> x
      <input type="number" id="bRows" min="${N_MIN}" max="${N_MAX}" value="${NY}" title="${t('board.rows')}">
      <button id="bApply">${t('board.apply')}</button></div>
    <div class="hint" id="bMsg">${t('board.hint', N_MIN, N_MAX)}</div>
    ${selected().length ? `<div class="crow"><button id="bSel" title="${t('board.delsel.title')}">${t('board.delsel', selected().length)}</button></div>` : ''}
    <div class="crow"><button id="cClose">${t('m.close')}</button></div>`;
  const q = s => menu.querySelector(s);
  if (q('#bSel')) q('#bSel').addEventListener('click', deleteSelected);
  q('#bAdd').addEventListener('click', () => {
    if (free) addSlot({ gx: free[0], gy: free[1], lines: randomLines() });
    closeMenu();
  });
  q('#bApply').addEventListener('click', () => {
    const c = Math.round(+q('#bCols').value), r = Math.round(+q('#bRows').value);
    if (setGridSize(c, r)) closeMenu();
    else q('#bMsg').textContent = t('board.nofit', N_MIN, N_MAX);
  });
  q('#cClose').addEventListener('click', closeMenu);
  placeMenu(x, y);
}
svg.addEventListener('contextmenu', e => {
  e.preventDefault();
  const p = svgPoint(e);
  openBoardMenu(e.clientX, e.clientY,
    Math.max(0, Math.min(NX - 1, Math.round((p.x - M) / S))), Math.max(0, Math.min(NY - 1, Math.round((p.y - M) / S))));
});
document.addEventListener('pointerdown', e => { if (!menu.hidden && !menu.contains(e.target)) closeMenu(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });
