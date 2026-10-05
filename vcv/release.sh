#!/usr/bin/env bash
# Exporte le module VCV Rack comme dépôt autonome : la VCV Library compile la RACINE du dépôt
# (plugin.json et Makefile à la racine), alors qu'ici le module est dans vcv/ et utilise ../core.
#   vcv/release.sh [dossier]      (par défaut ../hexacorde-vcv, à côté du dépôt)
#   REPO_URL=https://github.com/luginf/hexacorde-vcv vcv/release.sh
# Le dépôt d'origine reste la source de vérité : on ré-exporte après chaque modification de core/ ou vcv/.
set -euo pipefail
here=$(cd "$(dirname "$0")" && pwd)
root=$(dirname "$here")
out=${1:-$root/../hexacorde-vcv}
repo=${REPO_URL:-https://github.com/luginf/hexacorde-vcv}

make -s -C "$root" core/tables.hpp
mkdir -p "$out/core"
rm -rf "$out/src" "$out/res" "$out/core"/* "$out/plugin.json" "$out/Makefile"      # on garde un éventuel .git
mkdir -p "$out/core"
cp -r "$here/src" "$here/res" "$out/"
cp "$root"/core/hexacorde.hpp "$root"/core/setup.hpp "$root"/core/json.hpp "$root"/core/tables.hpp "$out/core/"
cp "$root/LICENSE" "$out/core/LICENSE"            # licence BSD 3 clauses du cœur
cp "$here/LICENSE" "$out/LICENSE"                 # GPLv3 du module
cp "$here/CHANGELOG.md" "$out/CHANGELOG.md"
sed 's#-I\.\./core#-Icore#' "$here/Makefile" > "$out/Makefile"
jq --arg r "$repo" '.pluginUrl=$r | .sourceUrl=$r | .manualUrl=($r + "#readme") | .changelogUrl=($r + "/blob/main/CHANGELOG.md")' \
   "$here/plugin.json" > "$out/plugin.json"
printf 'build/\ndist/\nplugin.so\n' > "$out/.gitignore"
cat > "$out/README.md" <<README
# Hexacorde for VCV Rack 2

An oracular step sequencer: I Ching hexagrams on a grid send notes to each other. Each line of a hexagram is a note; a played note sends a pulse toward the next hexagram, which echoes it in turn. Play the board with the mouse, patch the outputs into your voices.

Web version (play in the browser): https://luginf.github.io/hexacorde/ - main project: https://github.com/luginf/hexacorde

## Module

| | |
|---|---|
| **TEMPO** + **RUN** | internal clock in BPM (one step = an eighth note), used when CLOCK is not patched |
| **CLOCK** | one pulse = one step |
| **RESET** | clears the pulses in flight and resets the step counter |
| **PRIME** (poly) | a pulse on channel *i* primes hexagon *i* |
| **ROTATE** (poly) | a pulse on channel *i* turns hexagon *i* by one step |
| **PITCH** (poly) | 1 V/oct, C4 = 0 V; one channel per hexagon (up to 16) |
| **GATE** (poly) | 10 V for 90 % of a step on each note |
| **VEL** (poly) | 0 to 10 V (solid line 7.6 V, broken line 4.4 V) |
| **STEP** | a trigger on every step |

Board: click a hexagon to prime it; click a line to toggle solid / broken; drag a line to rotate; drag the body to move; mouse wheel rotates. **Right-click a hexagon** for its hexagram, scale (23), tonic, octave, rotation, priming every N steps, 7th side (heptagon), custom notes, reset, deactivate, delete. **Right-click the module** for the global tonality, settings, grid size, new hexagram, random draw / scatter, and import / export of setup \`.json\` files (the same files as the web version). The whole state is saved in the patch.

## Build

Download the Rack SDK 2.x, then \`make RACK_DIR=/path/to/Rack-SDK\` (C++17), \`make install\` or \`make dist\`.

## License

The module is licensed under GPL-3.0-or-later (see \`LICENSE\`). The engine in \`core/\` is a copy of the BSD 3-Clause licensed core of the main project (see \`core/LICENSE\`). This repository is generated from the main project: please send issues and changes there.
README
echo "Dépôt autonome exporté dans $out"
