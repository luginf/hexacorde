// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (c) 2026, luginf
#include "PluginProcessor.h"
#include "PluginEditor.h"

HexacordeProcessor::HexacordeProcessor()
    : AudioProcessor(BusesProperties().withOutput("Output", juce::AudioChannelSet::stereo(), true)) {
  addParameter(tempo = new juce::AudioParameterInt({"tempo", 1}, "Tempo (BPM)", 30, 375, 125));
  addParameter(run = new juce::AudioParameterBool({"run", 1}, "Internal clock", false));
  addParameter(syncHost = new juce::AudioParameterBool({"sync", 1}, "Follow the host", true));
  addParameter(synthOn = new juce::AudioParameterBool({"synth", 1}, "Internal synth", true));
  addParameter(volume = new juce::AudioParameterFloat({"volume", 1}, "Volume", 0.f, 1.f, 0.6f));
}

HexacordeProcessor::~HexacordeProcessor() = default;

void HexacordeProcessor::prepareToPlay(double sampleRate, int) {
  sr = sampleRate;
  synth.prepare(sr);
  pending.clear();
  pending.reserve(256);
  stepOffsets.reserve(64);
  clock.resetInternal(); clock.resetHost();
  wasActive = false;
  soundsDirty = true; programsDirty = true;
}

void HexacordeProcessor::refreshSounds() {            // verrou déjà pris
  for (int c = 0; c < 16; c++) sounds[c] = SoundLite::from(engine.hasChanSound[c] ? engine.chanSound[c] : engine.sound);
}

// envoie tous les note off en attente à l'échantillon 0 (pause, arrêt de l'hôte)
void HexacordeProcessor::flushPending(juce::MidiBuffer& out) {
  for (const Pending& p : pending) out.addEvent(juce::MidiMessage::noteOff(p.ch + 1, p.note), 0);
  pending.clear();
}

void HexacordeProcessor::processBlock(juce::AudioBuffer<float>& buffer, juce::MidiBuffer& midi) {
  juce::ScopedNoDenormals noDenormals;
  const int n = buffer.getNumSamples();
  buffer.clear();

  // notes reçues : la note k amorce l'hexagone (k modulo nombre d'hexagones)
  for (const auto meta : midi) {
    const auto m = meta.getMessage();
    if (!m.isNoteOn()) continue;
    std::lock_guard<std::mutex> lk(mtx);
    if (engine.slots.empty()) continue;
    hexa::Slot& s = engine.slots[(size_t)m.getNoteNumber() % engine.slots.size()];
    if (s.active) engine.prime(s);
  }
  midi.clear();

  // quelle horloge ?
  double bpm = tempo->get();
  double ppq = 0;
  bool hostPlaying = false;
  if (auto* ph = getPlayHead())
    if (auto pos = ph->getPosition())
      if (pos->getIsPlaying() && pos->getPpqPosition().hasValue()) {
        hostPlaying = true;
        ppq = *pos->getPpqPosition();
        if (pos->getBpm().hasValue() && syncHost->get()) bpm = *pos->getBpm();
      }
  const bool useHost = hostPlaying && syncHost->get();
  const bool active = useHost || run->get();
  if (!active && wasActive) flushPending(midi);          // pause : on coupe les notes
  if (active && !wasActive) { clock.resetInternal(); clock.resetHost(); programsDirty = true; }
  wasActive = active;

  stepOffsets.clear();
  if (active) {
    if (useHost) clock.host(sr, bpm, ppq, n, stepOffsets);
    else clock.internal(sr, bpm, n, stepOffsets);
  }

  if (soundsDirty.exchange(false)) { std::lock_guard<std::mutex> lk(mtx); refreshSounds(); }
  if (programsDirty.exchange(false)) {
    std::lock_guard<std::mutex> lk(mtx);
    for (int c = 0; c < 16; c++) if (engine.program[c] >= 0) midi.addEvent(juce::MidiMessage::programChange(c + 1, engine.program[c]), 0);
  }

  const double period = StepClock::samplesPerStep(sr, bpm);
  if (!stepOffsets.empty()) {
    std::lock_guard<std::mutex> lk(mtx);
    engine.tickMs = (int)std::lround(30000.0 / bpm);
    periodMs = 30000.0 / bpm;
    lastStepMs = juce::Time::getMillisecondCounterHiRes();
    for (int off : stepOffsets) {
      for (const hexa::NoteEvent& e : engine.step()) {
        auto& fl = flash[e.slotId];
        if (fl[0] == 0 && fl[1] == 0 && fl[2] == 0 && fl[3] == 0 && fl[4] == 0 && fl[5] == 0 && fl[6] == 0) fl.fill(-99);
        fl[(size_t)e.side] = e.tick;
        const int ch = e.channel;
        for (size_t i = 0; i < pending.size();)            // même note déjà en cours : on la relâche d'abord
          if (pending[i].ch == ch && pending[i].note == e.midi) {
            midi.addEvent(juce::MidiMessage::noteOff(ch + 1, e.midi), off);
            pending.erase(pending.begin() + (long)i);
          } else i++;
        midi.addEvent(juce::MidiMessage::noteOn(ch + 1, e.midi, (juce::uint8)e.velocity), off);
        pending.push_back({ch, e.midi, off + (int)(0.9 * period)});     // la note dure 90 % d'un pas
      }
    }
  }

  // note off échus dans ce bloc
  for (size_t i = 0; i < pending.size();) {
    if (pending[i].remaining < n) {
      midi.addEvent(juce::MidiMessage::noteOff(pending[i].ch + 1, pending[i].note), juce::jmax(0, pending[i].remaining));
      pending.erase(pending.begin() + (long)i);
    } else { pending[i].remaining -= n; i++; }
  }

  // sortie MIDI directe, avec 20 ms d'avance pour que le fil d'envoi garde le rythme exact
  {
    const juce::ScopedTryLock sl(outLock);
    if (sl.isLocked() && midiOut && !midi.isEmpty())
      midiOut->sendBlockOfMessages(midi, juce::Time::getMillisecondCounterHiRes() + 20.0, sr);
  }

  // synthé interne : on rend entre les évènements
  if (synthOn->get()) {
    int pos = 0;
    const float vol = volume->get();
    for (const auto meta : midi) {
      const auto m = meta.getMessage();
      const int t = juce::jlimit(0, n, meta.samplePosition);
      if (t > pos) { synth.render(buffer, pos, t - pos, vol); pos = t; }
      if (m.isNoteOn()) synth.noteOn(m.getChannel() - 1, m.getNoteNumber(), m.getVelocity(), sounds[juce::jlimit(0, 15, m.getChannel() - 1)]);
      else if (m.isNoteOff()) synth.noteOff(m.getChannel() - 1, m.getNoteNumber());
    }
    if (pos < n) synth.render(buffer, pos, n - pos, vol);
  } else synth.allOff();
}

// ---------- setup et état ----------
bool HexacordeProcessor::loadSetupText(const juce::String& text, juce::String& err) {
  std::string e;
  bool ok;
  {
    std::lock_guard<std::mutex> lk(mtx);
    ok = engine.loadSetup(text.toStdString(), &e);
    if (ok) flash.clear();
  }
  if (!ok) { err = juce::String::fromUTF8(e.c_str()); return false; }
  *tempo = (int)std::lround(30000.0 / engine.tickMs);
  soundsDirty = true; programsDirty = true;
  stateVersion++;
  return true;
}

juce::String HexacordeProcessor::setupText() {
  std::lock_guard<std::mutex> lk(mtx);
  engine.tickMs = (int)std::lround(30000.0 / tempo->get());
  return juce::String::fromUTF8(engine.saveSetup().c_str());
}

void HexacordeProcessor::resetAll() {
  { std::lock_guard<std::mutex> lk(mtx); engine.resetDefault(); flash.clear(); }
  soundsDirty = true; stateVersion++;
}

void HexacordeProcessor::silenceAll() {
  std::lock_guard<std::mutex> lk(mtx);
  engine.silence();
}

void HexacordeProcessor::getStateInformation(juce::MemoryBlock& dest) {
  juce::XmlElement xml("HEXACORDE");
  xml.setAttribute("setup", setupText());
  xml.setAttribute("run", run->get());
  xml.setAttribute("sync", syncHost->get());
  xml.setAttribute("synth", synthOn->get());
  xml.setAttribute("volume", (double)volume->get());
  xml.setAttribute("midiOut", midiOutName);
  copyXmlToBinary(xml, dest);
}

void HexacordeProcessor::setStateInformation(const void* data, int size) {
  auto xml = getXmlFromBinary(data, size);
  if (!xml || !xml->hasTagName("HEXACORDE")) return;
  juce::String err;
  loadSetupText(xml->getStringAttribute("setup"), err);
  *run = xml->getBoolAttribute("run", false);
  *syncHost = xml->getBoolAttribute("sync", true);
  *synthOn = xml->getBoolAttribute("synth", true);
  *volume = (float)xml->getDoubleAttribute("volume", 0.6);
  const juce::String out = xml->getStringAttribute("midiOut");
  if (out.isNotEmpty()) chooseMidiOutput(out);
}

// ---------- sortie MIDI directe ----------
juce::StringArray HexacordeProcessor::midiOutputNames() const {
  juce::StringArray names;
  for (const auto& d : juce::MidiOutput::getAvailableDevices()) names.add(d.name);
  return names;
}

void HexacordeProcessor::chooseMidiOutput(const juce::String& name) {
  std::unique_ptr<juce::MidiOutput> out;
  if (name == "@virtual") {
    out = juce::MidiOutput::createNewDevice("Hexacorde");
  } else if (name.isNotEmpty()) {
    for (const auto& d : juce::MidiOutput::getAvailableDevices())
      if (d.name == name) { out = juce::MidiOutput::openDevice(d.identifier); break; }
  }
  if (out) out->startBackgroundThread();
  {
    const juce::ScopedLock sl(outLock);
    midiOut = std::move(out);
    midiOutName = midiOut ? name : juce::String();
  }
  programsDirty = true;
}

juce::AudioProcessorEditor* HexacordeProcessor::createEditor() { return new HexacordeEditor(*this); }

juce::AudioProcessor* JUCE_CALLTYPE createPluginFilter() { return new HexacordeProcessor(); }
