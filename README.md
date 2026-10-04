# Hexacorde

**English** | [Français](README.fr.md)

An oracular step sequencer. Six I Ching hexagrams sit on a 6x6 grid of points. Each line of a hexagram is a note, and it sends that note toward another hexagram, which echoes it in turn. The piece grows out of how the hexagrams are laid out on the grid.

A single HTML page, plain JavaScript, no dependencies, no server. The interface is in French.

**Try it online**: the page is ready for GitHub Pages (see "Publishing on GitHub Pages" below).

## Running

Open `index.html` in a recent browser (Chrome, Firefox...), then click a hexagon. This primes it and starts the clock. The internal sound is an oscillator whose waveform, envelope and filter can be edited.

## Getting started

- **Click a hexagon**: prime it and start the clock.
- **Drag a hexagon**: move it to another free point of the grid.
- **Click a line**: toggle it between solid and broken.
- **Tirage** (draw): randomly draws the lines of the six hexagrams. **Placement au hasard**: scatters them on the grid.
- **Jouer / Pause**: starts and stops the clock. **Silence**: clears all pulses in flight.
- **Side panel, one block per hexagon**: choose its hexagram (among the 64, with its name), its scale, its MIDI channel, set its rotation, or **Réinit.** (reset) it.
- **Right-click a hexagon**: a menu with all its settings (hexagram, scale, MIDI channel, rotation, direction, speed, reset), a 60° step (↺ or ↻) and hand-picked notes (see below). The panel and the menu stay in sync.
- **"Hexagrammes : édition" arrow**: folds all the editing blocks so the bottom of the panel is easier to reach (the state is remembered). The **mouse wheel** on a hexagon also rotates it (down = clockwise, up = counterclockwise).
- **Setup** (foldable block at the bottom of the panel): save and reload the whole configuration.

## Hexagrams and their names

Each slot shows the number and name of its hexagram according to the I Ching (King Wen order), for example "11 Tai, La Paix" (Peace; names are in pinyin plus French): the short name is written under the hexagon and the full name in the panel menu. That menu also picks the hexagram you want among the 64. When you toggle a line or mutation acts, the name changes.

Line 1 of the hexagon is read as the first line of the hexagram (the bottom one in tradition), and lines 4 to 6 form the upper trigram.

**Réinit.** puts the hexagram back to its starting form (the one from loading, the last draw or the last choice in the menu), stops its rotation and clears its pending pulses. Its position, scale, channel and rotation settings do not change.

## How it works

### The hexagram

Each hexagram is drawn as a hexagon whose six sides are its six lines. The first line is at the top, then you follow the hexagon clockwise.

### Notes

- **Chromatic** (default): a solid line gives the natural note, a broken line gives the same note a semitone higher.

  | Line | 1 | 2 | 3 | 4 | 5 | 6 |
  |---|---|---|---|---|---|---|
  | Solid | C | D | E | F# | G# | A# |
  | Broken | C# | D# | F | G | A | B |

- **Scales** (chosen per hexagon): major, natural minor, dorian, phrygian, lydian, mixolydian, major or minor pentatonic. Side `k` plays degree `k` of the scale (wrapping up an octave when the scale has fewer than 6 notes). A solid line plays the note and sends it back. A broken line is silent and sends nothing.
- **Tonic**: a global setting that transposes everything.
- **Octave**: it depends on the grid row; low rows are low-pitched, high rows are high-pitched.

### Custom notes

For more variety, each hexagon can have its own notes. Right-click the hexagon, tick **Notes personnalisées**: for each of the 6 lines, pick the note of the solid line and of the broken line over two octaves (an apostrophe, as in "ré'", marks the octave above), or "silence" for the broken line. Changing a note turns the option on; unticking it goes back to the scale. **Reprendre la gamme** copies the notes of the current scale as a starting point. A broken line that has a note plays softly and sends a soft pulse, as in chromatic mode.

### Propagation

- When a hexagon is triggered, it plays its six sides one after another, one per step, starting from the side that was hit.
- Each played note sends a pulse in the direction of its side, toward the first hexagon met in that 60° sector. The farther it is, the more steps the pulse takes to arrive: the spacing of the hexagons sets the rhythm.
- **Solid line**: strong pulse, which travels as far as needed. On arrival, if the side it hits is solid, the hexagon **bounces** it and starts playing.
- **Broken line** (in chromatic mode): soft pulse with a short range. On arrival, if the side it hits is broken, the pulse **passes through** the hexagon without making it sound and goes straight on.
- A pulse with no target dies out.

### Options

- **Manual rotation**: right-click then ↺ / ↻, or the mouse wheel. It also works when stopped.
- **Rotation**: the hexagon turns in 60° steps. Each line keeps its note, but its sending direction and the side hit on reception change. Per hexagon: a checkbox to enable it, a ↻ / ↺ button for the **direction** (clockwise or counterclockwise) and a **speed**: ×1 (one 60° step per clock step), ×2 or ×3 (two or three 60° steps per step), ÷2, ÷3, ÷4 or ÷8 (one 60° step every 2, 3, 4 or 8 steps). A "↻ tous" checkbox enables rotation everywhere.
- **Mutation of lines**: a pulse of polarity opposite to the side it hits flips that line (strong on broken, soft on solid). The hexagram evolves as in a consultation.
- **Amorce A tous les N pas**: re-primes hexagon A at regular intervals.
- **Portée du trait brisé**: maximum distance (in cells) of soft pulses.
- **Pas**: duration of one clock step, in milliseconds.
- **Son interne : édition** (foldable block under "Son interne"): see the next section.

## Editing the internal sound

The foldable block **Son interne : édition** sets the sound of all hexagons (a global setting, kept in the setup under the `son` key). It has no effect on an external MIDI synth. **Son par défaut** restores the original settings.

- **Onde** (waveform): square (default), triangle, sawtooth or sine.
- **ADSR envelope**: a graph whose three points you drag with the mouse (A, D together with S, R), and four equivalent sliders: attack (1 to 500 ms), decay (10 to 1000 ms), sustain (0 to 100 %), release (10 to 1500 ms). The note is held for 90 % of a step, then the release starts.
- **Filter**: type (low-pass, high-pass, band-pass, notch), cutoff frequency (30 Hz to 16 kHz, logarithmic scale), resonance Q, and **Env**: depth of the envelope that opens the filter on each note, following A, D, S, R (up to 4 octaves). A curve shows the filter response. The default (low-pass 3200 Hz, Env 0) reproduces the original sound.

## Saving a setup

The foldable **Setup** block (bottom of the panel) keeps the layout, lines, scales, channels, rotations, custom notes, the sound and the settings (step, tonic, range, mutation, amorce). It does not keep pulses in flight, the volume or the MIDI output.

- **Nom**: prefilled with the date and time (`setup-2026-10-04_18-34-40`), refreshed at each save as long as you do not edit it. The setup also contains the date in ISO 8601.
- **Sauver / Charger / Suppr.**: in the browser's memory (localStorage), under that name.
- **Fichier .json** and **Ouvrir...**: download the setup or read one back from disk.
- **Texte / Copier** and **Appliquer**: write the setup as text (and copy it), or load the text pasted in the box. Handy to exchange it or keep it in a note.

The text is readable JSON, one hexagram per line (keys are in French):

```
{"hexacorde":1,"date":"2026-10-04T18:34:40+02:00","pas":240,"tonique":0,"portee":2.5,"mutation":false,"amorce":0,"son":{"onde":"square","a":5,"d":250,"s":0.1,"r":150,"filtre":"lowpass","coupure":3200,"q":0.7,"env":0},
"hexagrammes": [
  {"lettre":"A","pos":[2,4],"traits":"010000","depart":"010000","gamme":"phrygien","canal":1,"rotation":{"active":false,"sens":"horaire","vitesse":"x1","angle":0}},
  {"lettre":"D","pos":[1,3],"traits":"000000","depart":"000000","gamme":"phrygien","canal":4,"rotation":{"active":true,"sens":"horaire","vitesse":"x1","angle":0}},
  ...
]}
```

You can write or tweak it by hand: `pos` = column and row from 0 to 5, `traits` = 6 digits (1 solid, 0 broken, line 1 first) or `"numero": 11` instead, `vitesse` among `x1 x2 x3 /2 /3 /4 /8`, `angle` a multiple of 60. If the text is invalid, nothing changes and the precise error is shown.

## Driving an external synth (live MIDI)

1. Plug in the synth (or a MIDI interface), then click **Activer le MIDI** and allow access in the browser.
2. Pick the output in the menu next to the button.
3. Set the **channel** of each hexagon (A = 1, B = 2... by default).
4. Untick **Son interne** to hear only the synth.

Each played note sends a note on immediately, with its note off 90 % of a step later. An all notes off is sent on Pause, Silence, Réinit. and when the output or a channel changes.

Web MIDI works in Chrome, Edge and Firefox, not in Safari. **Firefox does not expose Web MIDI on a page opened from disk (`file://`)**: the button then shows an error message. Serve the page locally instead: `python3 -m http.server` in the folder, then open `http://localhost:8000` (or use the GitHub Pages version, which is HTTPS). (Checked with Firefox 157: `requestMIDIAccess` is undefined on `file://` and defined on `http://localhost`. Chrome accepts both.)

## Recording to a MIDI file

Tick **Enregistrer en fichier MIDI** and choose a **Nom**. Everything that sounds between Jouer and Pause is recorded. On Pause, the browser downloads `name-YYYYMMDD-HHMMSS.mid`. The date and time avoid overwriting an earlier take. To choose the folder each time, enable "Ask where to save" in the browser's download settings.

- Format 1, 480 PPQ, tempo following the "Pas" setting (one step = an eighth note).
- A tempo track, then one track per hexagon that sounded, with the channel chosen for each hexagon (A = channel 1, B = channel 2, ... F = channel 6 by default).
- Velocity 96 for a solid line, 56 for a broken line.

## Roadmap

- Program change and bank select per channel (choosing patches on the JV-880), MIDI clock.
- Draw with moving lines (second, mutated hexagram).
- uxn version.

## Publishing on GitHub Pages

The page is one static file, `index.html`, at the repository root (it is generated by `make` and must be committed). A `.nojekyll` file skips Jekyll processing.

1. Push the repository to GitHub, branch `main`.
2. In the repository: **Settings, Pages, Build and deployment, Source: Deploy from a branch**, branch `main`, folder `/ (root)`.
3. The page is served at `https://<user>.github.io/<repo>/`.

Bonus: over HTTPS, Web MIDI also works in Firefox (which refuses it on `file://`), with a permission prompt from the browser. After changing the code, run `make` and commit `index.html` along with the sources.

## Notes for developers

The code is split into modules in `src/` (`src/js/*.js`, `src/style.css`, `src/template.html`). **`index.html` is generated**: after a change, run `make` (and `make check` to verify the syntax). `make serve` serves the folder on `http://localhost:8000` (useful for Web MIDI in Firefox).

See `CLAUDE.md` (in French) for the details of the design rules, the code structure and how to test.

## License

BSD 3-Clause, see [LICENSE](LICENSE).
