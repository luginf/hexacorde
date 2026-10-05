// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (c) 2026, luginf
// Plugin Hexacorde (JUCE) : le cœur C++ de ../../core dans un plugin (VST3, standalone...).
// Un pas du séquenceur = une croche : sur la position de l'hôte quand il joue, sinon sur l'horloge interne (BPM).
// Les notes sortent en MIDI (canal par hexagone), vers l'hôte et / ou un port MIDI choisi, et le synthé interne
// peut les jouer. Une note MIDI reçue amorce un hexagone.
#pragma once
#include <array>
#include <atomic>
#include <map>
#include <mutex>
#include <juce_audio_devices/juce_audio_devices.h>
#include <juce_audio_processors/juce_audio_processors.h>
#include "SimpleSynth.h"
#include "StepClock.h"
#include "hexacorde.hpp"

class HexacordeProcessor : public juce::AudioProcessor {
 public:
  HexacordeProcessor();
  ~HexacordeProcessor() override;

  // état partagé avec l'éditeur
  std::mutex mtx;                                   // protège engine et flash
  hexa::Engine engine;
  std::map<int, std::array<int, 8>> flash;          // id d'hexagone -> pas de la dernière note de chaque côté
  std::atomic<double> lastStepMs{0}, periodMs{240}; // pour animer l'éditeur entre deux pas
  std::atomic<int> stateVersion{0};                 // incrémenté quand l'état est remplacé (chargement)

  juce::AudioParameterInt* tempo;                   // BPM, un pas = une croche
  juce::AudioParameterBool* run;                    // horloge interne
  juce::AudioParameterBool* syncHost;               // suivre l'hôte quand il joue
  juce::AudioParameterBool* synthOn;                // synthé interne
  juce::AudioParameterFloat* volume;

  template <class F> void edit(F f) {
    { std::lock_guard<std::mutex> lk(mtx); f(); }
    soundsDirty = true;
  }
  bool loadSetupText(const juce::String& text, juce::String& err);
  juce::String setupText();
  void resetAll();
  void silenceAll();

  // sortie MIDI directe (en plus de la sortie vers l'hôte)
  juce::StringArray midiOutputNames() const;
  void chooseMidiOutput(const juce::String& name);     // "" = aucune, "@virtual" = port virtuel (Linux, macOS)
  juce::String midiOutputChoice() const { return midiOutName; }

  // AudioProcessor
  void prepareToPlay(double sampleRate, int samplesPerBlock) override;
  void releaseResources() override {}
  bool isBusesLayoutSupported(const BusesLayout& l) const override { return l.getMainOutputChannelSet() == juce::AudioChannelSet::stereo(); }
  void processBlock(juce::AudioBuffer<float>&, juce::MidiBuffer&) override;
  juce::AudioProcessorEditor* createEditor() override;
  bool hasEditor() const override { return true; }
  const juce::String getName() const override { return "Hexacorde"; }
  bool acceptsMidi() const override { return true; }
  bool producesMidi() const override { return true; }
  bool isMidiEffect() const override { return false; }
  double getTailLengthSeconds() const override { return 0; }
  int getNumPrograms() override { return 1; }
  int getCurrentProgram() override { return 0; }
  void setCurrentProgram(int) override {}
  const juce::String getProgramName(int) override { return {}; }
  void changeProgramName(int, const juce::String&) override {}
  void getStateInformation(juce::MemoryBlock&) override;
  void setStateInformation(const void*, int) override;

 private:
  struct Pending { int ch, note, remaining; };         // note off à venir (échantillons depuis le début du bloc)
  std::vector<Pending> pending;
  std::vector<int> stepOffsets;
  StepClock clock;
  SimpleSynth synth;
  SoundLite sounds[16];
  std::atomic<bool> soundsDirty{true}, programsDirty{true};
  bool wasActive = false;
  double sr = 44100;

  juce::CriticalSection outLock;
  std::unique_ptr<juce::MidiOutput> midiOut;
  juce::String midiOutName;

  void refreshSounds();
  void flushPending(juce::MidiBuffer& out);
  JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(HexacordeProcessor)
};
