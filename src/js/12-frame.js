//: Animation : impulsions, éclats, rotation animée, état affiché
// animation : impulsions et éclats
const pulseEls = new Map();
function frame(now) {
  const tf = tick + (running ? Math.min(1, (now - lastTickAt) / tickMs) : 0);

  const seen = new Set();
  for (const p of pulses) {
    let c = pulseEls.get(p);
    if (!c) { c = el('circle', {}, pulseLayer); pulseEls.set(p, c); }
    seen.add(p);
    const u = Math.max(0, Math.min(1, (tf - p.t0) / (p.t1 - p.t0)));
    c.setAttribute('cx', px(p.x0 + (p.x1 - p.x0) * u));
    c.setAttribute('cy', px(p.y0 + (p.y1 - p.y0) * u));
    c.setAttribute('r', p.strong ? 6 : 4);
    c.setAttribute('fill', p.strong ? 'var(--yang)' : 'var(--yin)');
    c.setAttribute('opacity', p.target ? 1 : 1 - u);
  }
  for (const [p, c] of pulseEls) if (!seen.has(p)) { c.remove(); pulseEls.delete(p); }

  for (const slot of slots) {
    // rotation animée (un pas d'horloge pour la rotation auto, 160 ms pour la manuelle)
    const u = Math.min(1, Math.max(0, (now - slot.rotT0) / slot.rotDur));
    applyRotation(slot, 360 / slot.n * (slot.rot - slot.rotDelta * (1 - u * u * (3 - 2 * u))));
    for (let k = 0; k < slot.n; k++) {
      const f = Math.max(0, 1 - (tf - slot.flash[k]) / 2.5);
      const color = f > 0 ? (slot.lines[k] ? 'var(--yang)' : 'var(--yin)') : 'var(--ink)';
      for (const l of slot.sideEls[k]) {
        l.setAttribute('stroke', color);
        l.setAttribute('stroke-width', 5 + 3 * f);
        l.setAttribute('opacity', 0.55 + 0.45 * Math.max(f, 0.0));
      }
      slot.labelEls[k].setAttribute('fill', f > 0 ? 'var(--ink)' : 'var(--dim)');
    }
  }
  $status.textContent = `pas ${tick} · impulsions ${pulses.length}` +
    (rec ? ` · MIDI ${rec.events.length} notes${rec.live ? '' : ' (arrêté)'}` : '') +
    (arec ? ` · audio ${(arec.n / ac.sampleRate).toFixed(1)} s${arec.live ? '' : ' (arrêté)'}` : '');
  $recSave.disabled = !(rec && rec.events.length);
  $arecSave.disabled = !(arec && arec.n);
  requestAnimationFrame(frame);
}
