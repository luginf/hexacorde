// Test de StepClock sans JUCE : make juce-test
#include <cstdio>
#include "../src/StepClock.h"

static int fails = 0;
#define CHECK(c) do { if (!(c)) { std::printf("ECHEC ligne %d : %s\n", __LINE__, #c); fails++; } } while (0)

int main() {
  const double sr = 48000, bpm = 120;                   // 120 BPM : un pas = 0,25 s = 12000 échantillons
  std::vector<int> v;
  {
    StepClock c; int total = 0, steps = 0;
    for (int b = 0; b < 100; b++) { c.internal(sr, bpm, 512, v); steps += (int)v.size(); total += 512; }
    CHECK(steps == (int)std::ceil(total / 12000.0));     // pas à 0, 12000, 24000...
    c.resetInternal(); c.internal(sr, bpm, 512, v);
    CHECK(v.size() == 1 && v[0] == 0);
  }
  {
    StepClock c; int steps = 0; double ppq = 0;           // hôte : 120 BPM, blocs de 480 échantillons = 0,02 noire
    for (int b = 0; b < 1000; b++) { c.host(sr, bpm, ppq, 480, v); steps += (int)v.size(); ppq += 480 * bpm / 60.0 / sr; }
    CHECK(steps == 40);                                   // 20 noires = 40 croches (pas à 0 compris)
    c.host(sr, bpm, 0.0, 480, v);                         // saut en arrière : repart
    CHECK(v.size() == 1 && v[0] == 0);
    c.host(sr, bpm, 0.0, 480, v);                         // même bloc rejoué (discontinuité) : pas doublé une fois repartie
    CHECK(v.size() == 1);
  }
  {
    StepClock c; double ppq = 0.3; int steps = 0;         // départ au milieu d'un pas
    c.host(sr, bpm, ppq, 4800, v);                        // 0,1 noire : 0,3 à 0,4, pas de frontière
    CHECK(v.empty());
    c.host(sr, bpm, ppq + 0.1, 24000, v);                 // 1 noire : franchit 0,5 et 1,0
    CHECK(v.size() == 2 && v[0] == 2400 && v[1] == 2400 + 12000);
    (void)steps;
  }
  std::printf(fails ? "%d echec(s)\n" : "StepClock : ok\n", fails);
  return fails ? 1 : 0;
}
