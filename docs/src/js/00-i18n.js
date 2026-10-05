//: Langues (ENG par défaut, FRA) : dictionnaires I18N, t(), translateDom
// ---------- Langues ----------
// Les textes de l'interface sont dans les dictionnaires I18N.en et I18N.fr (fichiers 00b et 00c).
// Les éléments du HTML portent data-i (texte), data-i-title, data-i-ph (placeholder) ou data-i-html (HTML).
const I18N = { en: {}, fr: {} };
let lang = 'en';
try { const l = localStorage.getItem('hexacorde.lang'); if (l === 'fr' || l === 'en') lang = l; } catch (_) { /* stockage inaccessible */ }
// texte traduit ; {0}, {1}... sont remplacés par les arguments
const t = (key, ...a) => {
  let s = I18N[lang][key];
  if (s === undefined) s = I18N.en[key] === undefined ? key : I18N.en[key];
  a.forEach((v, i) => { s = s.split('{' + i + '}').join(v); });
  return s;
};
const NOTE_NAMES = {
  en: ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'],
  fr: ['do', 'do#', 'ré', 'ré#', 'mi', 'fa', 'fa#', 'sol', 'sol#', 'la', 'la#', 'si'],
};
const NAMES = NOTE_NAMES[lang].slice();      // noms de notes dans la langue courante
function translateDom(root) {
  for (const e of root.querySelectorAll('[data-i]')) e.textContent = t(e.dataset.i);
  for (const e of root.querySelectorAll('[data-i-html]')) e.innerHTML = t(e.dataset.iHtml);
  for (const e of root.querySelectorAll('[data-i-title]')) e.title = t(e.dataset.iTitle);
  for (const e of root.querySelectorAll('[data-i-ph]')) e.placeholder = t(e.dataset.iPh);
}
