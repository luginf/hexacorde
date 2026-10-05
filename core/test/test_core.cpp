// Compare le cœur C++ à l'application web : chaque scénario de ref.txt (voir make_ref.py) donne un setup,
// un hexagone à amorcer et la suite exacte de notes produite par le JS ; le C++ doit produire la même.
#include <cstdio>
#include <fstream>
#include <iostream>
#include <sstream>
#include "../hexacorde.hpp"

int main(int argc, char** argv) {
  std::ifstream f(argc > 1 ? argv[1] : "core/test/ref.txt");
  if (!f) { std::fprintf(stderr, "ref.txt introuvable\n"); return 2; }
  std::string line, name, setup;
  int steps = 0, scenarios = 0, failures = 0, notes = 0, customs = 0;
  char prime = 0;
  std::vector<std::string> expected;
  while (std::getline(f, line)) {
    if (line.rfind("SCENARIO ", 0) == 0) { name = line.substr(9); expected.clear(); }
    else if (line.rfind("STEPS ", 0) == 0) steps = std::stoi(line.substr(6));
    else if (line.rfind("PRIME ", 0) == 0) prime = line[6] == '-' ? 0 : line[6];
    else if (line.rfind("SETUP ", 0) == 0) setup = line.substr(6);
    else if (line.rfind("E ", 0) == 0) expected.push_back(line);
    else if (line.rfind("CUSTOM ", 0) == 0) {      // fillCustom puis setSides(7) puis setSides(6), pour une gamme
      std::istringstream in(line.substr(7));
      std::string mode, a, b, c;
      in >> mode >> a >> b >> c;
      hexa::Engine e;
      hexa::Slot& s = *e.byLabel('A');
      s.mode = mode; s.customOn = false;
      auto dump = [&]() {
        std::string o = "[";
        for (size_t i = 0; i < s.custom.size(); i++) o += (i ? "," : "") + std::string("[") + std::to_string(s.custom[i].p) + "," + std::to_string(s.custom[i].b) + "]";
        return o + "]";
      };
      hexa::Engine::fillCustom(s);
      std::string ga = dump(); e.setSides(s, 7); std::string gb = dump(); e.setSides(s, 6); std::string gc = dump();
      customs++;
      if (ga != a || gb != b || gc != c) { failures++; std::printf("FAIL notes personnalisées %s\n  js  %s %s %s\n  c++ %s %s %s\n", mode.c_str(), a.c_str(), b.c_str(), c.c_str(), ga.c_str(), gb.c_str(), gc.c_str()); }
    }
    else if (line == "END") {
      scenarios++;
      hexa::Engine e;
      std::string err;
      if (!e.loadSetup(setup, &err)) { std::printf("FAIL %s : setup refusé (%s)\n", name.c_str(), err.c_str()); failures++; continue; }
      // aller-retour du setup : le C++ doit réécrire exactement le JSON du JS (sans la date)
      std::string back = e.toJson().dump();
      if (back != setup) {
        std::printf("FAIL %s : le setup réécrit diffère\n  js  %s\n  c++ %s\n", name.c_str(), setup.c_str(), back.c_str());
        failures++;
      }
      if (prime) e.prime(*e.byLabel(prime));
      std::vector<std::string> got;
      for (int i = 0; i < steps; i++)
        for (const auto& ev : e.step()) {
          char buf[96];
          std::snprintf(buf, sizeof buf, "E %d %c %d %d %d %d", ev.tick, ev.label, ev.channel, ev.midi, ev.velocity, ev.side);
          got.push_back(buf);
        }
      notes += static_cast<int>(got.size());
      size_t n = std::min(got.size(), expected.size()), bad = 0;
      for (size_t i = 0; i < n && !bad; i++) if (got[i] != expected[i]) bad = i + 1;
      if (got.size() != expected.size() || bad) {
        failures++;
        std::printf("FAIL %s : %zu notes attendues, %zu obtenues", name.c_str(), expected.size(), got.size());
        if (bad) std::printf(" ; première différence #%zu\n  js  %s\n  c++ %s", bad, expected[bad - 1].c_str(), got[bad - 1].c_str());
        std::printf("\n");
      } else std::printf("ok   %-26s %4zu notes\n", name.c_str(), got.size());
    }
  }
  // réglages globaux
  if (hexa::scaleTable().size() != 23) { std::printf("FAIL table des gammes : %zu au lieu de 23\n", hexa::scaleTable().size()); failures++; }
  std::printf("%d scénarios, %d notes, %d gammes éditées, %d échec(s)\n", scenarios, notes, customs, failures);
  return failures ? 1 : 0;
}
