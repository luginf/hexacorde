#include "../hexacorde.hpp"
#include <cstdio>
int main() {
  hexa::Engine e;
  e.prime(e.slots[0]);
  int n = 0;
  for (int i = 0; i < 20; i++) for (auto& ev : e.step()) { n++; std::printf("%d %c %d %d\n", ev.tick, ev.label, ev.midi, ev.velocity); }
  std::string s = e.saveSetup("x"), err;
  hexa::Engine f; bool ok = f.loadSetup(s, &err);
  std::printf("notes %d reload %d %s same %d\n", n, ok, err.c_str(), f.saveSetup("x") == s);
}
