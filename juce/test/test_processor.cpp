// Test du plugin sans interface ni carte son : on appelle processBlock à la main et on compare les notes MIDI
// à celles que le cœur produit tout seul (même suite, au bon échantillon).
#include <cstdio>
#include "PluginProcessor.h"

static int fails = 0;
#define CHECK(c) do { if (!(c)) { std::printf("ECHEC ligne %d : %s\n", __LINE__, #c); fails++; } } while (0)

struct Ev { long long pos; int ch, note, vel; bool on; };

struct FakeHost : juce::AudioPlayHead {
  bool playing = true; double ppq = 0, bpm = 120;
  juce::Optional<PositionInfo> getPosition() const override {
    PositionInfo p; p.setIsPlaying(playing); p.setPpqPosition(ppq); p.setBpm(bpm); return p;
  }
};

static std::vector<Ev> run(HexacordeProcessor& p, int blocks, int bs, FakeHost* host, double bpmHost = 120) {
  std::vector<Ev> out;
  juce::AudioBuffer<float> buf(2, bs);
  for (int b = 0; b < blocks; b++) {
    if (host) { p.setPlayHead(host); }
    juce::MidiBuffer midi;
    p.processBlock(buf, midi);
    for (const auto m : midi) {
      auto msg = m.getMessage();
      if (msg.isNoteOnOrOff()) out.push_back({(long long)b * bs + m.samplePosition, msg.getChannel() - 1, msg.getNoteNumber(), msg.getVelocity(), msg.isNoteOn()});
    }
    if (host) host->ppq += bs * bpmHost / 60.0 / 48000.0;
  }
  return out;
}

int main() {
  juce::ScopedJuceInitialiser_GUI init;
  const int bs = 512;
  // 1. horloge interne, 125 BPM : un pas tous les 11520 échantillons
  {
    hexa::Engine ref;
    ref.prime(*ref.byLabel('A'));
    std::vector<hexa::NoteEvent> want;
    for (int i = 0; i < 40; i++) for (auto& e : ref.step()) want.push_back(e);

    HexacordeProcessor p;
    p.prepareToPlay(48000, bs);
    p.edit([&] { p.engine.prime(*p.engine.byLabel('A')); });
    *p.run = true;
    *p.synthOn = true;
    std::vector<Ev> got = run(p, 40 * 11520 / bs + 2, bs, nullptr);
    std::vector<Ev> ons;
    int offs = 0;
    for (auto& e : got) { if (e.on) ons.push_back(e); else offs++; }
    // les 40 premiers pas tiennent dans 39 * 11520 + 1 échantillons ; on garde les notes dont le pas est < 40
    std::vector<Ev> first;
    for (auto& e : ons) if (e.pos < 40LL * 11520) first.push_back(e);
    CHECK(first.size() == want.size());
    for (size_t i = 0; i < std::min(first.size(), want.size()); i++) {
      CHECK(first[i].ch == want[i].channel && first[i].note == want[i].midi && first[i].vel == want[i].velocity);
      CHECK(first[i].pos == (long long)(want[i].tick - 1) * 11520);
    }
    CHECK(offs >= (int)first.size() - 8);
    for (auto& e : got) if (!e.on) {        // chaque note off tombe 0,9 pas après son note on
      bool found = false;
      for (auto& o : ons) if (o.ch == e.ch && o.note == e.note && e.pos - o.pos == (long long)(0.9 * 11520)) found = true;
      CHECK(found);
    }
    std::printf("horloge interne : %zu notes comparees\n", first.size());
  }
  // 2. suivi de l'hôte, 120 BPM : un pas toutes les 12000 échantillons, tempo de l'hôte prioritaire
  {
    hexa::Engine ref;
    ref.prime(*ref.byLabel('A'));
    std::vector<hexa::NoteEvent> want;
    for (int i = 0; i < 20; i++) for (auto& e : ref.step()) want.push_back(e);

    HexacordeProcessor p;
    p.prepareToPlay(48000, bs);
    p.edit([&] { p.engine.prime(*p.engine.byLabel('A')); });
    FakeHost host;
    std::vector<Ev> got = run(p, 20 * 12000 / bs + 2, bs, &host);
    std::vector<Ev> first;
    for (auto& e : got) if (e.on && e.pos < 20LL * 12000) first.push_back(e);
    CHECK(first.size() == want.size());
    for (size_t i = 0; i < std::min(first.size(), want.size()); i++) {
      CHECK(first[i].note == want[i].midi);
      CHECK(std::llabs(first[i].pos - (long long)(want[i].tick - 1) * 12000) <= 1);
    }
    std::printf("suivi de l'hote : %zu notes comparees\n", first.size());
    // hôte à l'arrêt et horloge interne coupée : silence
    FakeHost stopped; stopped.playing = false;
    HexacordeProcessor q;
    q.prepareToPlay(48000, bs);
    q.edit([&] { q.engine.prime(*q.engine.byLabel('A')); });
    CHECK(run(q, 100, bs, &stopped).empty());
  }
  // 3. setup : aller-retour par l'état du plugin
  {
    HexacordeProcessor p;
    p.edit([&] { p.engine.opt.tonic = 7; p.engine.byLabel('B')->mode = "dorien"; });
    juce::MemoryBlock mb;
    p.getStateInformation(mb);
    HexacordeProcessor q;
    q.setStateInformation(mb.getData(), (int)mb.getSize());
    CHECK(q.engine.opt.tonic == 7 && q.engine.byLabel('B')->mode == "dorien");
    juce::String err;
    CHECK(!q.loadSetupText("pas du json", err) && err.isNotEmpty());
  }
  std::printf(fails ? "%d echec(s)\n" : "plugin : ok\n", fails);
  return fails ? 1 : 0;
}
