// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (c) 2026, luginf
// Petit synthé interne : un oscillateur (carré, dent de scie, triangle, sinus, FM) avec enveloppe ADSR et filtre
// biquad par note, comme le son interne de l'application web (sans l'enveloppe de filtre).
#pragma once
#include <juce_audio_basics/juce_audio_basics.h>
#include "hexacorde.hpp"

struct SoundLite {                      // copie sans chaîne de hexa::Sound, lisible depuis le fil audio
  enum Wave { Square, Saw, Triangle, Sine, FM };
  enum Filter { Low, High, Band };
  int wave = Square, ftype = Low;
  float a = 0.005f, d = 0.25f, s = 0.1f, r = 0.15f;      // secondes, niveau
  float fcut = 3200, fq = 0.7f, fmr = 2, fmi = 3;

  static SoundLite from(const hexa::Sound& x) {
    SoundLite o;
    o.wave = x.wave == "sawtooth" ? Saw : x.wave == "triangle" ? Triangle : x.wave == "sine" ? Sine : x.wave == "fm" ? FM : Square;
    o.ftype = x.ftype == "highpass" ? High : x.ftype == "bandpass" ? Band : Low;
    o.a = x.a / 1000.f; o.d = x.d / 1000.f; o.r = x.r / 1000.f; o.s = (float)x.s;
    o.fcut = (float)x.fcut; o.fq = (float)x.fq; o.fmr = (float)x.fmr; o.fmi = (float)x.fmi;
    return o;
  }
};

class SimpleSynth {
 public:
  void prepare(double sampleRate) { sr = sampleRate; for (auto& v : voices) v.on = false; }
  void allOff() { for (auto& v : voices) v.on = false; }

  void noteOn(int ch, int note, int velocity, const SoundLite& snd) {
    Voice* v = nullptr;
    for (auto& x : voices) if (!x.on) { v = &x; break; }
    if (!v) { v = &voices[0]; for (auto& x : voices) if (x.age < v->age) v = &x; }   // vole la plus ancienne
    v->on = true; v->released = false; v->ch = ch; v->note = note; v->age = ++counter;
    v->snd = snd;
    v->freq = 440.0 * std::pow(2.0, (note - 69) / 12.0);
    v->ph = v->mph = 0;
    v->gain = 0.16f * velocity / 96.f;
    v->env.setSampleRate(sr);
    v->env.setParameters({std::max(0.001f, snd.a), std::max(0.001f, snd.d), juce::jlimit(0.f, 1.f, snd.s), std::max(0.005f, snd.r)});
    v->env.noteOn();
    const float fc = juce::jlimit(20.f, (float)(sr * 0.45), snd.fcut), q = juce::jmax(0.1f, snd.fq);
    v->filt.setCoefficients(snd.ftype == SoundLite::High ? juce::IIRCoefficients::makeHighPass(sr, fc, q)
                            : snd.ftype == SoundLite::Band ? juce::IIRCoefficients::makeBandPass(sr, fc, q)
                                                           : juce::IIRCoefficients::makeLowPass(sr, fc, q));
    v->filt.reset();
  }
  void noteOff(int ch, int note) {
    for (auto& v : voices) if (v.on && !v.released && v.ch == ch && v.note == note) { v.released = true; v.env.noteOff(); }
  }

  // ajoute le son de `num` échantillons à partir de `start` (mono recopié sur tous les canaux)
  void render(juce::AudioBuffer<float>& buf, int start, int num, float volume) {
    const int nch = buf.getNumChannels();
    for (auto& v : voices) {
      if (!v.on) continue;
      const double inc = v.freq / sr;
      for (int i = 0; i < num; i++) {
        float e = v.env.getNextSample();
        if (!v.env.isActive()) { v.on = false; break; }
        float x;
        switch (v.snd.wave) {
          case SoundLite::Saw: x = (float)(2 * v.ph - 1); break;
          case SoundLite::Triangle: x = (float)(4 * std::fabs(v.ph - 0.5) - 1); break;
          case SoundLite::Sine: x = (float)std::sin(juce::MathConstants<double>::twoPi * v.ph); break;
          case SoundLite::FM: {
            const double mf = v.freq * v.snd.fmr;
            x = (float)std::sin(juce::MathConstants<double>::twoPi * v.ph + v.snd.fmi * e * std::sin(juce::MathConstants<double>::twoPi * v.mph));
            v.mph += mf / sr; if (v.mph >= 1) v.mph -= 1;
            break;
          }
          default: x = v.ph < 0.5 ? 1.f : -1.f;
        }
        v.ph += inc; if (v.ph >= 1) v.ph -= 1;
        x = v.filt.processSingleSampleRaw(x) * e * v.gain * volume;
        for (int c = 0; c < nch; c++) buf.addSample(c, start + i, x);
      }
    }
  }

 private:
  struct Voice {
    bool on = false, released = false;
    int ch = 0, note = 0; long long age = 0;
    double freq = 440, ph = 0, mph = 0;
    float gain = 0.1f;
    SoundLite snd;
    juce::ADSR env;
    juce::IIRFilter filt;
  };
  Voice voices[32];
  double sr = 44100;
  long long counter = 0;
};
