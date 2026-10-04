//: Son interne : oscillateur carré (WebAudio)
// ---------- Son : carré ----------
let ac = null, master = null, voices = 0;
function ensureAudio() {
  if (!ac) {
    ac = new (window.AudioContext || window.webkitAudioContext)();
    master = ac.createGain();
    master.gain.value = +$vol.value;
    const lp = ac.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 3200;
    master.connect(lp); lp.connect(ac.destination);
  }
  if (ac.state === 'suspended') ac.resume();
}
function playNote(midi, gain) {
  if (!ac || voices > 32 || !$internal.checked) return;
  const dur = Math.min(0.6, Math.max(0.08, tickMs / 1000 * 1.5));
  const t = ac.currentTime;
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = 'square';
  o.frequency.value = 440 * Math.pow(2, (midi - 69) / 12);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(gain, t + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(master);
  voices++;
  o.onended = () => { voices--; g.disconnect(); };
  o.start(t); o.stop(t + dur + 0.02);
}
