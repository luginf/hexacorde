#!/usr/bin/env python3
"""Regénère ref.txt : suites de notes produites par l'application web (index.html) dans Chrome headless.
Le test C++ (test_core.cpp) rejoue les mêmes setups et compare note par note.
Usage : python3 core/test/make_ref.py   (depuis la racine du dépôt ; demande google-chrome)"""
import subprocess, tempfile, os, re, sys, html, json

root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
src = open(os.path.join(root, 'docs', 'index.html')).read()

HOOK = r'''
window.__t = (() => {
  const out = [];
  const events = [];
  midiNote = (slot, midi, vel) => events.push(`E ${tick} ${slot.label} ${chanOf(slot)} ${midi} ${vel} ${slot.ph ? slot.ph.side : -1}`);
  const run = (name, steps, prime) => {
    // le setup courant est rechargé tel quel : c'est ce que lira le C++
    const text = JSON.stringify(getSetup());
    const r = parseSetup(text); if (r.error) throw new Error(name + ': ' + r.error);
    applySetup(r.cfg); tick = 0; pulses = []; for (const s of slots) { s.ph = null; }
    if (prime) { const s = slots.find(x => x.label === prime); s.ph = { side: 0, left: s.n }; }
    events.length = 0;
    for (let i = 0; i < steps; i++) step();
    out.push(`SCENARIO ${name}`, `STEPS ${steps}`, `PRIME ${prime || '-'}`, `SETUP ${text}`, ...events, 'END');
  };
  const fresh = () => { applySetup(parseSetup(JSON.stringify(getSetup())).cfg); };
  const base = JSON.stringify(getSetup());
  const reset = () => { applySetup(parseSetup(base).cfg); opt.chanAll = null; opt.uniform = false; };

  // 1 : les six hexagrammes de départ, amorce de A
  reset(); run('default', 80, 'A');
  // 2 : mutation, rotation de tous à des vitesses variées, sens inversés
  reset(); opt.mutate = true;
  const sp = [1, 2, 0.5, 1 / 3, 3, 0.25];
  slots.forEach((s, i) => { s.rotOn = true; s.rotSpeed = sp[i]; s.rotDir = i % 2 ? -1 : 1; });
  run('mutation-rotation', 120, 'A');
  // 3 : gammes, notes perso, heptagone, tonique et octave par hexagone, octave uniforme, canal commun
  reset();
  slots[0].mode = 'lydien'; fillCustom(slots[0]);
  slots[1].mode = 'pentamajeur'; setSides(slots[1], 7);
  slots[2].mode = 'blues'; slots[2].tonic = 7; slots[2].octave = 1; drawSlot(slots[2]);
  slots[3].mode = 'majeur'; slots[3].customOn = true; fillCustom(slots[3]); slots[3].custom[0].p = null; slots[3].custom[2].b = 5;
  slots[4].mode = 'hirajoshi'; setSides(slots[4], 7); slots[4].rotOn = true; slots[4].rotSpeed = 1;
  slots[5].mode = 'dim12'; slots[5].active = true;
  opt.tonic = 2; opt.octave = 1; opt.softRange = 4; opt.mutate = true;
  run('scales-heptagon', 150, 'B');
  reset(); opt.uniform = true; opt.chanAll = 5; slots.forEach((s, i) => { s.mode = i % 2 ? 'mineurharm' : 'chromatique'; });
  run('uniform-common-channel', 80, 'C');
  // 4 : amorces périodiques, rien d'amorcé à la main
  reset(); slots[0].loopOn = true; slots[0].loopN = 5; slots[3].loopOn = true; slots[3].loopN = 7; run('loop', 90, null);
  // 5 : grille 8x5, autre disposition, un hexagone désactivé
  reset(); setGridSize(8, 5);
  const pos = [[0, 0], [3, 1], [7, 4], [4, 4], [1, 3], [6, 2]];
  slots.forEach((s, i) => { s.gx = pos[i][0]; s.gy = pos[i][1]; });
  slots[4].active = false; opt.softRange = 3.5;
  run('grid-8x5-inactive', 100, 'A');
  // 6 : gammes variées sur un plateau dense, mutation
  reset(); setGridSize(5, 5);
  const pos2 = [[0, 0], [1, 1], [2, 2], [3, 3], [4, 4], [2, 0]];
  slots.forEach((s, i) => { s.gx = pos2[i][0]; s.gy = pos2[i][1]; s.mode = ['phrygiendom', 'doubleharm', 'bebop', 'insen', 'tons', 'mineurmel'][i]; });
  slots[1].lines = [1, 0, 1, 0, 1, 0]; slots[3].lines = [0, 0, 1, 1, 0, 1];
  opt.mutate = true; run('dense-mutation', 100, 'F');
  // 7 : setup relu et sauvegardé : sons, instruments (aller-retour JSON)
  reset(); Object.assign(snd, { wave: 'fm', fmr: 3.5, fmi: 4 }); chanSnd[2] = { ...snd, wave: 'sine' }; prog[0] = 25; prog[9] = 80;
  run('sounds-programs', 30, 'A');
  // 8 : opérations d'édition sur toutes les gammes (notes personnalisées, 7e côté aller-retour)
  reset();
  for (const mode of Object.keys(SCALES)) {
    const s = slots[0]; setSides(s, 6); s.mode = mode; s.customOn = false; fillCustom(s);
    const dump = () => JSON.stringify(s.custom.map(c => [c.p === null ? -1 : c.p, c.b === null ? -1 : c.b]));
    const a = dump(); setSides(s, 7); const b = dump(); setSides(s, 6); const c = dump();
    out.push(`CUSTOM ${mode} ${a} ${b} ${c}`);
  }
  document.title = out.join('\n');
  return out;
})();
requestAnimationFrame(frame);
})();'''

page = src.replace("requestAnimationFrame(frame);\n})();", HOOK)
with tempfile.TemporaryDirectory() as td:
    p = os.path.join(td, 'ref.html')
    open(p, 'w').write(page)
    r = subprocess.run(['google-chrome', '--headless=new', '--no-sandbox', '--disable-gpu', '--virtual-time-budget=3000',
                        '--dump-dom', 'file://' + p], capture_output=True, text=True)
m = re.search(r'<title>(.*?)</title>', r.stdout, re.S)
if not m:
    sys.exit('pas de résultat : ' + r.stderr[:500])
text = html.unescape(m.group(1))
if 'Error' in text and 'SCENARIO' not in text:
    sys.exit(text)
text = re.sub(r'"date":"[^"]*",', '', text)
open(os.path.join(os.path.dirname(__file__), 'ref.txt'), 'w').write(text + '\n')
print(text.count('SCENARIO'), 'scénarios,', len(re.findall(r'^E ', text, re.M)), 'notes')
