//: Horloge : démarrer, arrêter, silence
// ---------- Horloge ----------
function schedule() {
  if (!running) return;
  const now = performance.now();
  if (nextAt < now - 4 * tickMs) nextAt = now;   // rattrapage après onglet en veille
  step();
  nextAt += tickMs;
  timer = setTimeout(schedule, Math.max(0, nextAt - performance.now()));
}
function start() {
  ensureAudio();
  if (running) return;
  running = true; nextAt = performance.now();
  $play.textContent = t('pause'); $play.classList.add('on');
  sendPrograms();                            // les instruments sont renvoyés à chaque départ
  if (arec) arec.started = true;            // l'audio commence au premier Jouer
  schedule();
}
function stop() {
  running = false; clearTimeout(timer);
  $play.textContent = t('play'); $play.classList.remove('on');
  midiPanic();
}
function silence() {
  pulses = [];
  for (const s of slots) s.ph = null;
  midiPanic();
}
