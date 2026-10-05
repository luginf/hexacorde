// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (c) 2026, luginf
// Éditeur : barre d'outils et plateau (mêmes unités et mêmes gestes que l'application web et le module VCV Rack).
#pragma once
#include <juce_audio_utils/juce_audio_utils.h>
#include "PluginProcessor.h"

class BoardComponent : public juce::Component, private juce::Timer {
 public:
  explicit BoardComponent(HexacordeProcessor& p);
  void paint(juce::Graphics&) override;
  void mouseDown(const juce::MouseEvent&) override;
  void mouseDrag(const juce::MouseEvent&) override;
  void mouseUp(const juce::MouseEvent&) override;
  void mouseWheelMove(const juce::MouseEvent&, const juce::MouseWheelDetails&) override;

 private:
  struct Anim { int lastRot = 0; double t0 = -1e9; int delta = 0; };
  HexacordeProcessor& proc;
  std::map<int, Anim> anims;
  int dragId = -1, dragLine = -1;
  juce::Point<float> dragStart, dragPos;
  bool dragMoved = false;
  float spinPrev = 0, spinTotal = 0;
  int spinApplied = 0;

  void timerCallback() override { repaint(); }
  float scale() const;
  juce::AffineTransform toScreen() const;
  juce::Point<float> toLogical(juce::Point<float> p) const;
  int hitSlot(juce::Point<float> p, int& line);
  void slotMenu(int id);
  void boardMenu(juce::Point<float> logical);
  void startClockIfIdle();
};

class HexacordeEditor : public juce::AudioProcessorEditor, private juce::Timer {
 public:
  explicit HexacordeEditor(HexacordeProcessor&);
  ~HexacordeEditor() override;
  void resized() override;
  void paint(juce::Graphics&) override;

 private:
  HexacordeProcessor& proc;
  BoardComponent board;
  juce::ToggleButton runBtn{"Run"};
  juce::Slider tempoSl;
  juce::Label tempoLbl{{}, "BPM"};
  juce::ComboBox tonicCb, octaveCb, scaleCb;
  juce::TextButton optionsBtn{"Options"}, setupBtn{"Setup"}, drawBtn{"Draw"}, scatterBtn{"Scatter"}, silenceBtn{"Silence"};
  std::unique_ptr<juce::SliderParameterAttachment> tempoAtt;
  std::unique_ptr<juce::ButtonParameterAttachment> runAtt;
  std::unique_ptr<juce::FileChooser> chooser;
  int seenVersion = -1;
  std::mt19937 rng{std::random_device{}()};

  void timerCallback() override;
  void syncControls();
  void optionsMenu();
  void setupMenu();
};
