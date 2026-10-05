# Hexacorde

**English** | [Français](README.fr.md)

An oracular step sequencer. Six I Ching hexagrams sit on a grid of points (6x6 by default; you can add more hexagrams and choose any grid size from 3x3 to 12x12). Each line of a hexagram is a note, and it sends that note toward another hexagram, which echoes it in turn. The piece grows out of how the hexagrams are laid out on the grid.

A single HTML page, plain JavaScript, no dependencies, no server. The interface is in English by default, with a French version (**ENG / FRA** switch, top right) and four themes.

**Try it online**: [https://luginf.github.io/hexacorde/](https://luginf.github.io/hexacorde/)

## Running

Open `index.html` in a recent browser (Chrome, Firefox...), then click a hexagon. This primes it and starts the clock. The internal sound is an oscillator whose waveform, envelope and filter can be edited.

## Getting started

- **Click a hexagon**: prime it and start the clock.
- **Drag a hexagon**: move it to another free point of the grid.
- **Click a line**: toggle it between solid and broken. **Drag a line**: grab one side and turn around the centre; the hexagon rotates in 60° steps, in either direction. The **mouse wheel** also rotates it (down = clockwise).
- **Drag a rectangle** on the empty grid: selects several hexagrams (outlined; Shift adds, a click on the background clears). Right-click one of them to delete, deactivate or activate them all (the Delete key deletes too).
- **Right-click a hexagram**: all its settings (hexagram, scale, MIDI channel, tonic, octave, rotation, 7th side, priming every N steps, reset), a 60° step, the custom notes (see below), **Deactivate** (the hexagon turns grey: it neither plays nor receives) and **Delete**.
- **Right-click the grid**: **New hexagram here** (random lines, global scale and tonic, on the nearest free point; up to 26 hexagrams) and a custom **grid size** (columns x rows, 3 to 12 each; refused while a hexagon would fall outside).

### The menu bar

**Play / Pause**, **Silence** (clears the pulses in flight), the step (**Step** in ms, with its **BPM** equivalent) and the volume are always visible at the top. Then the menus, in this order (only one is open at a time; click elsewhere or press Esc to close it):

- **Tonality**: the global **tonic**, the global **octave** (-3 to +3) and the base **scale**. Choosing a scale applies it to all hexagrams and to the ones you add later.
- **Hexagrams**: one block per hexagram: hexagram (among the 64, with its name), active, delete, scale, MIDI channel, its own tonic and octave, rotation, priming, 7th side, reset.
- **Settings**: soft line range, line mutation, rotation for all, **uniform octave**, **theme**.
- **Sound**: the internal sound, its editor, instrument presets, FM sounds and a sound per MIDI channel (see below).
- **MIDI**: live MIDI output, MIDI **channels** (one per hexagon, or the same for all) and an **instrument** (program change) per channel.
- **File**: **Recording** (MIDI and audio) and **Setup** (save and load).
- **Draw**: **Draw lines at random** (random lines for every hexagram) and **Scatter at random** (random points of the grid).
- **ENG / FRA** and **Help** at the right.

Language and theme (dark, light, sepia, green) are remembered by the browser.

## Hexagrams and their names

Each hexagram shows its number and name according to the I Ching (King Wen order), for example "11 Tai" under the hexagon and "11. Tai, Peace" in the menus. The names are in pinyin plus English (Wilhelm / Baynes) or French (Wilhelm / Javary), following the language. The Hexagrams menu also picks the hexagram you want among the 64. When you toggle a line or mutation acts, the name changes.

Line 1 of the hexagon is read as the first line of the hexagram (the bottom one in tradition), and lines 4 to 6 form the upper trigram.

**Reset** puts the hexagram back to its starting form (the one from loading, the last draw or the last choice in the menu), stops its rotation and clears its pending pulses. Its position, scale, channel and rotation settings do not change.

## How it works

### The hexagram

Each hexagram is drawn as a hexagon whose six sides are its six lines. The first line is at the top, then you follow the hexagon clockwise. A hexagon can get a **7th side** (see below).

### Notes

- **Chromatic** (default): a solid line gives the natural note, a broken line gives the same note a semitone higher.

  | Line | 1 | 2 | 3 | 4 | 5 | 6 |
  |---|---|---|---|---|---|---|
  | Solid | C | D | E | F# | G# | A# |
  | Broken | C# | D# | F | G | A | B |

- **Scales** (chosen per hexagon, or for all in the Tonality menu): chromatic, major, natural minor, dorian, phrygian, lydian, mixolydian, locrian, harmonic minor, melodic minor, whole tone, blues, major and minor pentatonic, Hungarian minor, phrygian dominant, double harmonic, two diminished scales, in sen, hirajoshi, bebop dominant and augmented (23 in all). Side `k` plays degree `k` of the scale (wrapping up an octave when the scale has fewer notes). A solid line plays the note and sends it back. A broken line is silent and sends nothing. More scales are one line in the `SCALES` table of `src/js/01-constants.js` plus two names in the language files.
- **Tonic**: global (Tonality menu), it transposes everything; each hexagon can have its own ("global tonic" follows the global one). **Octave**: a global base octave (-3 to +3) plus an optional octave per hexagon.
- **Octave by row**: the grid is spread over 3 octaves, whatever its size: low rows are low-pitched, high rows high-pitched. The **Uniform octave** option (Settings) puts every row in the same middle octave.

### Custom notes

For more variety, each hexagon can have its own notes. Right-click the hexagon, tick **Custom notes**: for each line, pick the note of the solid line and of the broken line over two octaves (an apostrophe, as in "D'", marks the octave above), or "silence" (for either line). All 24 notes are offered; those of the hexagon's scale are marked ● and shown in the bright colour, the others dimmed, and the tonic is marked "(tonic)". Changing a note turns the option on; unticking it goes back to the scale. **Reload the scale** copies the notes of the current scale as a starting point; with a scale that has more notes than sides, the extra ones go on broken lines, so the whole scale is present (a broken line only sounds when hit). **Shuffle the order** shuffles the notes at random: with a scale, every note (including the extra one) is redistributed, the first ones on the solid lines and the rest on random broken lines; in chromatic mode each solid/broken pair stays together. A broken line that has a note plays softly and sends a soft pulse.

### The 7th side

The **7th side** option (Hexagrams menu or right-click) turns the hexagon into a heptagon. The 7th side is an extra solid line with the next note of the scale; it sends and receives pulses like the others and rotation steps become 360/7 degrees. The hexagram name is that of the first six lines ("+1" is added). A scale with fewer than 7 notes takes the missing notes of a matching 7-note scale instead of octaves (for example major for the major pentatonic). Unticking it goes back to six sides. If the custom notes are still those of the scale, they are redistributed over the new number of sides; notes you edited are kept.

### Propagation

- When a hexagon is triggered, it plays its sides one after another, one per step, starting from the side that was hit.
- Each played note sends a pulse in the direction of its side, toward the first hexagon met in that sector (60° for a hexagon). The farther it is, the more steps the pulse takes to arrive: the spacing of the hexagons sets the rhythm.
- **Solid line**: strong pulse, which travels as far as needed. On arrival, if the side it hits is solid, the hexagon **bounces** it and starts playing.
- **Broken line** (in chromatic mode, or with a custom note): soft pulse with a short range. On arrival, if the side it hits is broken, the pulse **passes through** the hexagon without making it sound and goes straight on.
- A pulse with no target dies out. A deactivated hexagon is not a target.

### Options

- **Rotation** (per hexagon): the hexagon turns in 60° steps. Each line keeps its note, but its sending direction and the side hit on reception change. A checkbox to enable it, a ↻ / ↺ button for the **direction** and a **speed**: ×1 (one step per clock step), ×2 or ×3, ÷2, ÷3, ÷4 or ÷8. "↻ all" (Settings) enables rotation everywhere. Manual rotation (drag a line, mouse wheel, right-click then ↺ / ↻) also works when stopped.
- **Mutation of lines**: a pulse of polarity opposite to the side it hits flips that line (strong on broken, soft on solid). The hexagram evolves as in a consultation.
- **Priming** (per hexagon, in the Hexagrams menu and the right-click menu): plays a note of that hexagon every N steps.
- **Soft line range**: maximum distance (in cells) of soft pulses.
- **Step**: duration of one clock step, in milliseconds. The **BPM** field gives the same setting (one step is an eighth note, so BPM = 30000 / step in ms; 240 ms = 125 BPM) and can be edited too (43 to 375 BPM).

## Editing the internal sound

The **Sound** menu sets the internal sound. It has no effect on an external MIDI synth; untick **Internal sound** to hear only the synth. **Default sound** restores the original settings.

- **Edit the sound of**: *All channels* (the default sound) or one MIDI channel (1 to 16). A channel with its own sound is marked ●, and the hexagrams on that channel (their channel, or the common channel) play it; the others play the default sound. **Use the all-channels sound** removes a channel's own sound.
- **Instrument**: ready-made sounds (square lead, soft sine, saw bass, pluck, pad, bell, organ, brass and six FM sounds) copied into the sound being edited, to be tweaked afterwards.
- **Wave**: square (default), triangle, sawtooth, sine or **FM** (two operators: a sine carrier modulated in frequency by a sine of frequency ratio x note; **FM** is the ratio and **Idx** the modulation index; the index follows the A, D, S, R envelope, so the attack is bright and the sustain softer).
- **ADSR envelope**: a graph whose three points you drag with the mouse (A, D together with S, R), and four equivalent sliders: attack (1 to 500 ms), decay (10 to 1000 ms), sustain (0 to 100 %), release (10 to 1500 ms). The note is held for 90 % of a step, then the release starts.
- **Filter**: type (low-pass, high-pass, band-pass, notch), cutoff frequency (30 Hz to 16 kHz, logarithmic scale), resonance Q, and **Env**: depth of the envelope that opens the filter on each note, following A, D, S, R (up to 4 octaves). A curve shows the filter response. The default (low-pass 3200 Hz, Env 0) reproduces the original sound.

## Setup (save and load)

The **Setup** part of the **File** menu keeps the layout, the sounds (default and per channel), the MIDI instruments, the common channel, lines, scales, channels, rotations, custom notes, per-hexagon tonic, octave and priming, the sound and the settings (step, tonic, octave, base scale, uniform octave, range, mutation). The number of hexagons, the grid size and which hexagons are disabled are kept too. It does not keep pulses in flight, the volume, the theme, the language or the MIDI output.

- **Name**: prefilled with `hexacorde_` and the date and time (`hexacorde_2026-10-04_18-34-40`), refreshed at each save as long as you do not edit it. The setup also contains the date in ISO 8601.
- **Save / Load / Delete**: in the browser's memory (localStorage), under that name.
- **.json file** and **Open...**: download the setup or read one back from disk.
- **Text / Copy** and **Apply**: write the setup as text (and copy it), or load the text pasted in the box. Handy to exchange it or keep it in a note.

The text is readable JSON, one hexagram per line (the keys are in French, whatever the interface language):

```
{"hexacorde":1,"date":"2026-10-04T18:34:40+02:00","grille":[6,6],"gamme":"chromatique","pas":240,"tonique":0,"octave":0,"portee":2.5,"mutation":false,"son":{"onde":"square","a":5,"d":250,"s":0.1,"r":150,"filtre":"lowpass","coupure":3200,"q":0.7,"env":0},
"hexagrammes": [
  {"lettre":"A","pos":[2,4],"traits":"010000","depart":"010000","gamme":"phrygien","canal":1,"rotation":{"active":false,"sens":"horaire","vitesse":"x1","angle":0}},
  {"lettre":"D","pos":[1,3],"traits":"000000","depart":"000000","gamme":"phrygien","canal":4,"rotation":{"active":true,"sens":"horaire","vitesse":"x1","angle":0}},
  ...
]}
```

You can write or tweak it by hand: `grille` = `[columns, rows]` (3 to 12 each; a single number means a square grid), `gamme` = base scale (key as in the `SCALES` table, e.g. `majeur`, `pentamineur`, `lydien`), `uniforme: true` = uniform octave, `octave` = global octave (-3 to 3), `canalUnique` = common MIDI channel (1 to 16), `sons` = own sounds by channel number (same fields as `son`; FM adds `fm` and `indice`), `programmes` = instrument by channel number (0 to 127), `pos` = column and row, `traits` = 6 or 7 digits (1 solid, 0 broken, line 1 first; 7 digits = heptagon) or `"numero": 11` instead, `actif: false` = disabled hexagon, `tonique` (0 to 11) and `octave` (-3 to 3) in a hexagon = its own tonic and octave, `amorce: N` = priming every N steps, `plein` / `brise` in `notes` accept `null` = silence, `vitesse` among `x1 x2 x3 /2 /3 /4 /8`, `angle` a multiple of 60. If the text is invalid, nothing changes and the precise error is shown.

## Driving an external synth (live MIDI)

1. Plug in the synth (or a MIDI interface), then open the **MIDI** menu, click **Enable MIDI** and allow access in the browser.
2. Pick the output in the menu next to the button.
3. Set the **channel** of each hexagon (A = 1, B = 2... by default), or choose **Same channel for all** in the MIDI menu (the individual channels are kept, just greyed, and come back with **Individual**).
4. Pick an **instrument** (program change) for each channel in the MIDI menu: it is sent when the output changes and at each Play, and written at the start of each track of the MIDI file. The names are General MIDI; on another synth only the number counts.
5. Untick **Internal sound** (Sound menu) to hear only the synth.

Each played note sends a note on immediately, with its note off 90 % of a step later. An all notes off is sent on Pause, Silence, Reset and when the output or a channel changes.

Web MIDI works in Chrome, Edge and Firefox, not in Safari. **Firefox does not expose Web MIDI on a page opened from disk (`file://`)**: the button then shows an error message. Serve the page locally instead: `python3 -m http.server` in the folder, then open `http://localhost:8000` (or use the GitHub Pages version, which is HTTPS). (Checked with Firefox 157: `requestMIDIAccess` is undefined on `file://` and defined on `http://localhost`. Chrome accepts both.)

## Recording (MIDI and audio)

In the **File** menu, set a **File name**. Recording and saving are separate steps, so there is no hidden action:

- **Record MIDI**: tick it to start recording every note played (Pause does not stop it, so you can pause and resume within one take). **Save the recording** stops the recording and downloads `name-YYYYMMDD-HHMMSS.mid`. Unticking the box only stops recording; the take stays until you save it (ticking it again starts a new take).
- **Record audio**: the same for the internal sound, saved as **.flac** (lossless, default) or **.wav**. Mono, 16 bits, at the browser's sample rate; the take starts at the first Play, and the volume setting is included.

The date and time avoid overwriting an earlier take. To choose the folder each time, enable "Ask where to save" in the browser's download settings.

MIDI file details:

- Format 1, 480 PPQ, tempo following the step setting (one step = an eighth note).
- A tempo track, then one track per hexagon that sounded, with the channel chosen for each hexagon (A = channel 1, B = channel 2, ... by default).
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

The code is split into modules in `src/` (`src/js/*.js`, `src/style.css`, `src/template.html`). **`index.html` is generated**: after a change, run `make` (and `make check` to verify the syntax). `make serve` serves the folder on `http://localhost:8000` (useful for Web MIDI in Firefox). The interface texts live in `src/js/00b-lang-en.js` and `src/js/00c-lang-fr.js`; the themes are CSS variables in `src/style.css`.

See `CLAUDE.md` (in French) for the details of the design rules, the code structure and how to test.

## License

BSD 3-Clause, see [LICENSE](LICENSE).
