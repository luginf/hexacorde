// Génère tables.hpp (gammes, hexagrammes, noms) à partir des sources JS, pour que le C++ ne diverge pas.
// Usage : node core/gen_tables.js > core/tables.hpp   (le Makefile le fait)
const fs = require('fs');
const read = f => fs.readFileSync(__dirname + '/../docs/src/js/' + f, 'utf8');
const I18N = { en: {}, fr: {} };
new Function('I18N', read('00b-lang-en.js') + '\n' + read('00c-lang-fr.js'))(I18N);
const mod = new Function(read('01-constants.js') + '\n' + read('02-hexagrams.js') +
  '\nreturn { SCALES, KW, TRIGRAM, HEX_NAMES, HEX_EN, LABELS };')();
const q = s => JSON.stringify(s);
let o = '// Fichier généré par core/gen_tables.js : ne pas éditer à la main.\n#pragma once\n#include <vector>\n#include <string>\n\nnamespace hexa {\n\n';
o += 'struct ScaleDef { const char* key; std::vector<int> steps; const char* en; const char* fr; };   // steps vide = chromatique\n';
o += 'inline const std::vector<ScaleDef>& scaleTable() {\n  static const std::vector<ScaleDef> t = {\n';
for (const [k, v] of Object.entries(mod.SCALES)) o += `    { ${q(k)}, { ${(v.steps || []).join(', ')} }, ${q(I18N.en['scale.' + k])}, ${q(I18N.fr['scale.' + k])} },\n`;
o += '  };\n  return t;\n}\n\n';
o += 'inline const int (&kwTable())[8][8] {\n  static const int t[8][8] = {\n';
for (const r of mod.KW) o += `    { ${r.join(', ')} },\n`;
o += '  };\n  return t;\n}\n\n';
o += 'inline int trigramIndex(const std::string& bits3) {\n';
for (const [k, v] of Object.entries(mod.TRIGRAM)) o += `  if (bits3 == ${q(k)}) return ${v};\n`;
o += '  return 0;\n}\n\n';
o += 'struct HexName { const char* pinyin; const char* fr; const char* en; };\n';
o += 'inline const HexName& hexName(int n) {\n  static const HexName t[65] = {\n    { "", "", "" },\n';
for (let n = 1; n <= 64; n++) o += `    { ${q(mod.HEX_NAMES[n][0])}, ${q(mod.HEX_NAMES[n][1])}, ${q(mod.HEX_EN[n])} },\n`;
o += '  };\n  return t[n < 1 || n > 64 ? 0 : n];\n}\n\n}  // namespace hexa\n';
process.stdout.write(o);
