//: Barre de menus en haut : menus déroulants (un seul ouvert à la fois)
// ---------- Barre de menus ----------
const dds = Array.from(document.querySelectorAll('.dd'));
function closeDd(except) {
  for (const d of dds) if (d !== except) { d.classList.remove('open'); d.querySelector('.ddp').hidden = true; }
}
for (const d of dds) {
  const p = d.querySelector('.ddp');
  d.querySelector('.ddb').addEventListener('click', () => {
    const open = p.hidden;
    closeDd();
    p.hidden = !open; d.classList.toggle('open', open);
    if (open) {                                   // garde le menu dans la fenêtre
      p.style.marginLeft = '0px';
      const r = p.getBoundingClientRect();
      if (r.right > innerWidth - 4) p.style.marginLeft = (innerWidth - 4 - r.right) + 'px';
    }
  });
}
// les boutons marqués .closes referment leur menu après l'action
for (const b of document.querySelectorAll('.ddp .closes')) b.addEventListener('click', () => closeDd());
document.addEventListener('pointerdown', e => { if (!e.target.closest('.dd')) closeDd(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeDd(); });
