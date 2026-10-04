//: Menu du clic droit : tous les réglages d'un hexagone (comme le panneau), rotation, notes personnalisées
// ---------- Menu du clic droit : réglages de l'hexagone, rotation, notes personnalisées ----------
const menu = document.createElement('div');
menu.id = 'ctxMenu'; menu.hidden = true;
document.body.appendChild(menu);
const noteOpts = (withSilence, sel) => {
  let h = withSilence ? `<option value=""${sel === null ? ' selected' : ''}>· silence</option>` : '';
  for (let i = 0; i < 24; i++)
    h += `<option value="${i}"${sel === i ? ' selected' : ''}>${NAMES[(opt.tonic + i) % 12]}${i >= 12 ? "'" : ''}</option>`;
  return h;
};
function closeMenu() { menu.hidden = true; }
function openMenu(slot, x, y) {
  const reopen = () => openMenu(slot, x, y);     // pour rafraîchir le titre après un changement d'hexagramme
  menu.innerHTML = `
    <div class="ctitle">${LABELS[slot.id]} : ${hexLabel(hexNumber(slot.lines))}</div>
    <div class="cform">
      <span>Hexagramme</span><select id="mHex">${hexOptions}</select>
      <span>Gamme</span><select id="mMode">${scaleOptions()}</select>
      <span>Canal MIDI</span><select id="mChan">${chanOptions}</select>
      <span>Rotation</span>
      <div class="crow"><label><input type="checkbox" id="mRot"> active</label>
        <button id="mDir" title="Sens de rotation">↻</button>
        <select id="mSpd" title="Vitesse de rotation">${SPEEDS.map(([v, t]) => `<option value="${v}">${t}</option>`).join('')}</select></div>
      <span>Tourner</span>
      <div class="crow"><button data-r="-1" title="Tourner de 60° dans le sens antihoraire">↺ 60°</button>
        <button data-r="1" title="Tourner de 60° dans le sens horaire">↻ 60°</button></div>
    </div>
    <div class="csep"></div>
    <label class="crow"><input type="checkbox" id="cOn"${slot.customOn ? ' checked' : ''}> Notes personnalisées</label>
    <div class="cgrid"><b>trait</b><b>plein</b><b>brisé</b>${[0, 1, 2, 3, 4, 5].map(k =>
      `<span>${k + 1}</span><select data-k="${k}" data-w="p">${noteOpts(false, slot.custom[k].p)}</select>` +
      `<select data-k="${k}" data-w="b">${noteOpts(true, slot.custom[k].b)}</select>`).join('')}</div>
    <div class="crow"><button id="cFill" title="Copie les notes de la gamme actuelle">Reprendre la gamme</button></div>
    <div class="csep"></div>
    <div class="crow"><button id="mReset" title="Remettre cet hexagramme à sa forme de départ">Réinit.</button>
      <button id="cClose">Fermer</button></div>`;
  const q = s => menu.querySelector(s);

  // réglages (mêmes fonctions que le panneau)
  q('#mHex').value = hexNumber(slot.lines);
  q('#mHex').addEventListener('change', e => { setHexagram(slot, +e.target.value); reopen(); });
  q('#mMode').value = slot.mode;
  q('#mMode').addEventListener('change', e => setMode(slot, e.target.value));
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
  for (const b of menu.querySelectorAll('[data-r]')) b.addEventListener('click', () => rotateBy(slot, +b.dataset.r));
  q('#mReset').addEventListener('click', () => { resetSlot(slot); reopen(); });

  // notes personnalisées
  const on = q('#cOn');
  on.addEventListener('change', () => { slot.customOn = on.checked; drawSlot(slot); });
  for (const sel of menu.querySelectorAll('select[data-k]')) sel.addEventListener('change', () => {
    const c = slot.custom[+sel.dataset.k];
    c[sel.dataset.w] = sel.value === '' ? null : +sel.value;
    slot.customOn = true; on.checked = true;     // modifier une note active l'option
    drawSlot(slot);
  });
  q('#cFill').addEventListener('click', () => {
    fillCustom(slot); slot.customOn = true; drawSlot(slot);
    reopen();
  });
  q('#cClose').addEventListener('click', closeMenu);

  menu.hidden = false;
  const w = menu.offsetWidth, h = menu.offsetHeight;
  menu.style.left = Math.max(4, Math.min(x, innerWidth - w - 8)) + 'px';
  menu.style.top = Math.max(4, Math.min(y, innerHeight - h - 8)) + 'px';
}
document.addEventListener('pointerdown', e => { if (!menu.hidden && !menu.contains(e.target)) closeMenu(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });
