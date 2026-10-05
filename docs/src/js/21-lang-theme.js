//: Langue (ENG / FRA) et thème : changement à chaud, mémorisé dans localStorage
// ---------- Langue et thème ----------
const THEMES = ['dark', 'light', 'sepia', 'green'];
let theme = 'dark';
try { const th = localStorage.getItem('hexacorde.theme'); if (THEMES.includes(th)) theme = th; } catch (_) { /* ignoré */ }

function fillThemeList() {
  $('theme').innerHTML = THEMES.map(k => `<option value="${k}">${t('theme.' + k)}</option>`).join('');
  $('theme').value = theme;
}
function applyTheme(name) {
  theme = name;
  document.documentElement.dataset.theme = name;
  try { localStorage.setItem('hexacorde.theme', name); } catch (_) { /* ignoré */ }
  showSound();                                    // les canevas du son relisent les couleurs du thème
}

// refait tout ce qui contient du texte : HTML statique, listes, blocs des hexagones, menus
function applyLang(l) {
  lang = l;
  try { localStorage.setItem('hexacorde.lang', l); } catch (_) { /* ignoré */ }
  document.documentElement.lang = l;
  NAMES.splice(0, 12, ...NOTE_NAMES[l]);
  closeMenu();
  translateDom(document);
  $('lang').value = l;
  $play.textContent = running ? t('pause') : t('play');
  fillTonalityLists(); fillSoundLists(); fillPrograms(); fillThemeList(); showSound();
  $('midiOut').options[0].textContent = t('midi.noout');
  if (midiAccess) refreshPorts();
  refreshList($setupList.value);
  svg.setAttribute('aria-label', t('grid.aria', NX, NY));
  // blocs du menu Hexagrammes : reconstruits dans l'ordre
  for (const s of slots) s.box.remove();
  for (const s of slots) { buildSlotPanel(s); drawSlot(s); }
  recSay('');
}
$('lang').addEventListener('change', e => applyLang(e.target.value));
$('theme').addEventListener('change', e => applyTheme(e.target.value));

// état initial
document.documentElement.dataset.theme = theme;
applyLang(lang);
applyTheme(theme);
