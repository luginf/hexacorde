// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (c) 2026, luginf
// Horloge de pas, sans dépendance (testable sans JUCE) : un pas = une croche = une demi-noire.
// Elle dit à quels échantillons d'un bloc audio tombent les pas, soit sur la position de l'hôte (ppq),
// soit sur une horloge interne en BPM.
#pragma once
#include <climits>
#include <cmath>
#include <vector>

struct StepClock {
  double toNext = 0;                         // horloge interne : échantillons avant le prochain pas
  long long lastHostStep = LLONG_MIN;        // dernier pas émis sur la position de l'hôte
  double lastPpqEnd = 0;
  bool hostActive = false;

  void resetInternal() { toNext = 0; }       // le premier pas tombe au premier échantillon
  void resetHost() { hostActive = false; lastHostStep = LLONG_MIN; }

  static double samplesPerStep(double sr, double bpm) { return sr * 30.0 / bpm; }

  // horloge interne : décalages (en échantillons) des pas qui tombent dans les n prochains échantillons
  void internal(double sr, double bpm, int n, std::vector<int>& out) {
    out.clear();
    double per = samplesPerStep(sr, bpm), pos = toNext;
    while (pos < n) { out.push_back(pos <= 0 ? 0 : (int)std::ceil(pos)); pos += per; }
    toNext = pos - n;
  }

  // position de l'hôte : ppqStart = position (en noires) au premier échantillon du bloc
  void host(double sr, double bpm, double ppqStart, int n, std::vector<int>& out) {
    out.clear();
    const double bps = bpm / 60.0 / sr;                    // noires par échantillon
    const double ppqEnd = ppqStart + n * bps;
    long long first = (long long)std::ceil(ppqStart * 2 - 1e-6);
    if (!hostActive || std::fabs(ppqStart - lastPpqEnd) > 1e-3) lastHostStep = first - 1;   // départ ou saut (boucle, déplacement)
    hostActive = true;
    for (long long s = first; s * 0.5 < ppqEnd - 1e-9; s++) {
      if (s <= lastHostStep) continue;
      double off = (s * 0.5 - ppqStart) / bps;
      out.push_back(off <= 0 ? 0 : (int)std::lround(off) >= n ? n - 1 : (int)std::lround(off));
      lastHostStep = s;
    }
    lastPpqEnd = ppqEnd;
  }
};
