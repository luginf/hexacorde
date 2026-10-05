// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (c) 2026, luginf
#include "PluginEditor.h"

namespace {
using HEngine = hexa::Engine;
using HSlot = hexa::Slot;
using juce::Point;

constexpr float S = 90.f, M = 60.f, R = 36.f;          // mêmes unités que l'application web (grille, marge, rayon)
float px(float g) { return M + g * S; }
const char* NOTE_EN[12] = {"C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"};
const char* TRIGRAM_EN[8] = {"Qian (Heaven)", "Zhen (Thunder)", "Kan (Water)", "Gen (Mountain)", "Kun (Earth)", "Xun (Wind)", "Li (Fire)", "Dui (Lake)"};

juce::Colour col(unsigned rgb, float a = 1.f) { return juce::Colour((juce::uint32)(0xff000000u | rgb)).withAlpha(a); }
const unsigned C_BG = 0x14141a, C_BODY = 0x1c1c22, C_EDGE = 0x2a2a33, C_INK = 0xe8e0c8, C_DIM = 0x8a8574, C_YANG = 0xffb000, C_YIN = 0x5fc8d8, C_GRID = 0x3a3a44, C_GLYPH = 0x4a4a56;

// sommet du polygone (degrés SVG : 0 = à droite, sens horaire à l'écran)
Point<float> vertexAt(float deg, float d = 0.f) {
  float a = juce::degreesToRadians(deg + d);
  return {R * std::cos(a), R * std::sin(a)};
}
Point<float> rotatePt(Point<float> p, float deg) {
  float a = juce::degreesToRadians(deg), c = std::cos(a), s = std::sin(a);
  return {p.x * c - p.y * s, p.x * s + p.y * c};
}
float segDist(Point<float> p, Point<float> a, Point<float> b) {
  auto ab = b - a;
  float l2 = ab.x * ab.x + ab.y * ab.y, t = l2 > 0 ? juce::jlimit(0.f, 1.f, ((p - a).x * ab.x + (p - a).y * ab.y) / l2) : 0.f;
  return (p - (a + ab * t)).getDistanceFromOrigin();
}
juce::Font font(float h) { return juce::Font(juce::FontOptions(h)); }

HSlot* slotById(HEngine& e, int id) { return e.find(id); }
juce::String noteLabel(HEngine& e, int id, int off) {
  if (off < 0) return "silence";
  HSlot* s = slotById(e, id);
  int t = s ? e.slotTonic(*s) : 0;
  return juce::String(NOTE_EN[(t + off) % 12]) + (off >= 12 ? "'" : "");
}
}  // namespace

// ---------------------------------------------------------------------------------------------------------------
// plateau

BoardComponent::BoardComponent(HexacordeProcessor& p) : proc(p) { startTimerHz(60); }

float BoardComponent::scale() const {
  std::lock_guard<std::mutex> lk(proc.mtx);
  const HEngine& e = proc.engine;
  return std::min(getWidth() / (2 * M + (e.cols - 1) * S), getHeight() / (2 * M + (e.rows - 1) * S));
}
juce::AffineTransform BoardComponent::toScreen() const {
  std::lock_guard<std::mutex> lk(proc.mtx);
  const HEngine& e = proc.engine;
  float w = 2 * M + (e.cols - 1) * S, h = 2 * M + (e.rows - 1) * S, s = std::min(getWidth() / w, getHeight() / h);
  return juce::AffineTransform::scale(s).translated((getWidth() - s * w) / 2, (getHeight() - s * h) / 2);
}
Point<float> BoardComponent::toLogical(Point<float> p) const { return p.transformedBy(toScreen().inverted()); }

int BoardComponent::hitSlot(Point<float> p, int& line) {       // verrou déjà pris
  HEngine& e = proc.engine;
  line = -1;
  for (int i = (int)e.slots.size() - 1; i >= 0; i--) {
    const HSlot& s = e.slots[(size_t)i];
    Point<float> d = p - Point<float>(px((float)s.gx), px((float)s.gy));
    if (d.getDistanceFromOrigin() > R + 5) continue;
    float rotDeg = 360.f / s.n * s.rot;
    for (int k = 0; k < s.n; k++) {
      auto a = rotatePt(vertexAt(270 + (float)hexa::sideAng(k, s.n), -180.f / s.n), rotDeg);
      auto b = rotatePt(vertexAt(270 + (float)hexa::sideAng(k, s.n), 180.f / s.n), rotDeg);
      if (segDist(d, a, b) < 7.f) { line = k; break; }
    }
    return s.id;
  }
  return -1;
}

void BoardComponent::paint(juce::Graphics& g) {
  g.fillAll(col(C_BG));
  HEngine e;
  std::map<int, std::array<int, 8>> flash;
  {
    std::lock_guard<std::mutex> lk(proc.mtx);
    e = proc.engine;
    flash = proc.flash;
  }
  const double now = juce::Time::getMillisecondCounterHiRes() / 1000.0;
  const double period = std::max(1.0, proc.periodMs.load());
  const bool running = proc.run->get();
  const double u = running ? juce::jlimit(0.0, 1.0, (juce::Time::getMillisecondCounterHiRes() - proc.lastStepMs.load()) / period) : 0.0;
  const double tf = e.tick + u;

  g.addTransform(toScreen());
  g.setColour(col(C_GRID));
  for (int y = 0; y < e.rows; y++) for (int x = 0; x < e.cols; x++) g.fillEllipse(px((float)x) - 2.5f, px((float)y) - 2.5f, 5.f, 5.f);

  for (const HSlot& s : e.slots) {
    Anim& a = anims[s.id];
    if (a.lastRot != s.rot) { a.delta = s.rot - a.lastRot; a.lastRot = s.rot; a.t0 = now; }
    const double dur = std::min(0.3, period / 1000.0), uu = juce::jlimit(0.0, 1.0, (now - a.t0) / dur), ease = uu * uu * (3 - 2 * uu);
    const float rotAngle = (float)(360.0 / s.n * (s.rot - a.delta * (1 - ease)));
    auto it = flash.find(s.id);
    const std::array<int, 8>* fl = it == flash.end() ? nullptr : &it->second;
    const int n = s.n;

    juce::Graphics::ScopedSaveState ss(g);
    g.addTransform(juce::AffineTransform::translation(px((float)s.gx), px((float)s.gy)));
    g.setOpacity(s.active ? 1.f : 0.3f);
    juce::Path body;
    for (int k = 0; k < n; k++) {
      auto v = vertexAt(270 + (float)hexa::sideAng(k, n), -180.f / n);
      if (k == 0) body.startNewSubPath(v); else body.lineTo(v);
    }
    body.closeSubPath();
    g.setColour(col(C_BODY, s.active ? 1.f : 0.3f)); g.fillPath(body);
    g.setColour(col(C_EDGE, s.active ? 1.f : 0.3f)); g.strokePath(body, juce::PathStrokeType(1.f));
    {                                                       // traits : ils tournent avec l'hexagone
      juce::Graphics::ScopedSaveState ss2(g);
      g.addTransform(juce::AffineTransform::rotation(juce::degreesToRadians(rotAngle)));
      for (int k = 0; k < n; k++) {
        auto va = vertexAt(270 + (float)hexa::sideAng(k, n), -180.f / n), vb = vertexAt(270 + (float)hexa::sideAng(k, n), 180.f / n);
        auto lerp = [&](float t) { return va + (vb - va) * t; };
        float f = fl ? (float)std::max(0.0, 1.0 - (tf - (*fl)[(size_t)k]) / 2.5) : 0.f;
        g.setColour(f > 0 ? col(s.lines[(size_t)k] ? C_YANG : C_YIN, (0.55f + 0.45f * f) * (s.active ? 1.f : 0.3f)) : col(C_INK, 0.55f * (s.active ? 1.f : 0.3f)));
        juce::Path ln;
        if (s.lines[(size_t)k]) { ln.startNewSubPath(lerp(0.12f)); ln.lineTo(lerp(0.88f)); }
        else { ln.startNewSubPath(lerp(0.12f)); ln.lineTo(lerp(0.42f)); ln.startNewSubPath(lerp(0.58f)); ln.lineTo(lerp(0.88f)); }
        g.strokePath(ln, juce::PathStrokeType(5.f + 3.f * f, juce::PathStrokeType::curved, juce::PathStrokeType::rounded));
      }
    }
    g.setFont(font(9.f));
    for (int k = 0; k < n; k++) {                           // noms de notes (restent droits)
      int off = HEngine::offsetOf(s, k);
      juce::String txt = off < 0 ? juce::String(".") : juce::String(NOTE_EN[(e.slotTonic(s) + off) % 12]) + (off >= 12 ? "'" : "");
      float a2 = juce::degreesToRadians(270 + (float)hexa::sideAng(k, n) + rotAngle);
      float f = fl ? (float)std::max(0.0, 1.0 - (tf - (*fl)[(size_t)k]) / 2.5) : 0.f;
      g.setColour(f > 0 ? col(C_INK, s.active ? 1.f : 0.3f) : col(C_DIM, s.active ? 1.f : 0.3f));
      g.drawText(txt, juce::Rectangle<float>(20, 12).withCentre({std::cos(a2) * R * 0.58f, std::sin(a2) * R * 0.58f}), juce::Justification::centred, false);
    }
    g.setFont(font(15.f)); g.setColour(col(C_GLYPH, s.active ? 1.f : 0.3f));
    g.drawText(juce::String::charToString((juce::juce_wchar)s.label), juce::Rectangle<float>(30, 18).withCentre({0, 0}), juce::Justification::centred, false);
    int hn = hexa::hexNumber(s.lines);
    g.setFont(font(8.5f)); g.setColour(col(C_DIM, s.active ? 1.f : 0.3f));
    g.drawText(juce::String(hn) + " " + hexa::hexName(hn).pinyin + (n == 7 ? " +1" : ""), juce::Rectangle<float>(90, 12).withCentre({0, R + 11}), juce::Justification::centred, false);
  }

  for (const hexa::Pulse& p : e.pulses) {                  // impulsions : forte = ambre, douce = cyan
    double uu = juce::jlimit(0.0, 1.0, (tf - p.t0) / std::max(1, p.t1 - p.t0));
    float x = px((float)(p.x0 + (p.x1 - p.x0) * uu)), y = px((float)(p.y0 + (p.y1 - p.y0) * uu)), r = p.strong ? 6.f : 4.f;
    g.setColour(col(p.strong ? C_YANG : C_YIN, p.target >= 0 ? 1.f : (float)(1 - uu)));
    g.fillEllipse(x - r, y - r, 2 * r, 2 * r);
  }
  if (dragId >= 0 && dragMoved && dragLine < 0) {          // fantôme de l'hexagone qu'on déplace
    g.setColour(col(C_YANG, 0.6f));
    g.drawEllipse(dragPos.x - R, dragPos.y - R, 2 * R, 2 * R, 1.5f);
  }
}

void BoardComponent::startClockIfIdle() {
  if (!proc.run->get() && !(proc.syncHost->get() && false)) proc.run->setValueNotifyingHost(1.f);
}

void BoardComponent::mouseDown(const juce::MouseEvent& ev) {
  Point<float> p = toLogical(ev.position);
  int line = -1, id;
  { std::lock_guard<std::mutex> lk(proc.mtx); id = hitSlot(p, line); }
  if (ev.mods.isPopupMenu()) {
    if (id >= 0) slotMenu(id); else boardMenu(p);
    return;
  }
  if (id >= 0) {
    dragId = id; dragLine = line; dragStart = p; dragPos = p; dragMoved = false;
    spinTotal = 0; spinApplied = 0;
    std::lock_guard<std::mutex> lk(proc.mtx);
    if (const HSlot* s = proc.engine.find(id))
      spinPrev = juce::radiansToDegrees(std::atan2(p.y - px((float)s->gy), p.x - px((float)s->gx)));
  }
}

void BoardComponent::mouseDrag(const juce::MouseEvent& ev) {
  if (dragId < 0) return;
  dragPos = toLogical(ev.position);
  if (!dragMoved && (dragPos - dragStart).getDistanceFromOrigin() * scale() < 5.f) return;
  dragMoved = true;
  if (dragLine >= 0) {                                      // glisser un trait : tourner l'hexagone par crans
    std::lock_guard<std::mutex> lk(proc.mtx);
    HSlot* s = proc.engine.find(dragId);
    if (!s) return;
    float ang = juce::radiansToDegrees(std::atan2(dragPos.y - px((float)s->gy), dragPos.x - px((float)s->gx))), d = ang - spinPrev;
    if (d > 180) d -= 360; else if (d < -180) d += 360;
    spinPrev = ang; spinTotal += d;
    int n = (int)std::lround(spinTotal / (360.f / s->n));
    if (n != spinApplied) { proc.engine.rotateBy(*s, n - spinApplied); spinApplied = n; }
  }
}

void BoardComponent::mouseUp(const juce::MouseEvent& ev) {
  if (dragId < 0) return;
  const int id = dragId, line = dragLine;
  const bool moved = dragMoved;
  dragId = -1;
  if (ev.mods.isPopupMenu()) return;
  bool primed = false;
  proc.edit([&] {
    HSlot* s = proc.engine.find(id);
    if (!s) return;
    if (!moved) {
      if (line >= 0) s->lines[(size_t)line] ^= 1;                                  // clic sur un trait : plein / brisé
      else if (s->active) { proc.engine.prime(*s); primed = true; }               // clic sur l'hexagone : amorce
    } else if (line < 0) {                                                         // déplacement sur un point libre
      int gx = juce::jlimit(0, proc.engine.cols - 1, (int)std::lround((dragPos.x - M) / S));
      int gy = juce::jlimit(0, proc.engine.rows - 1, (int)std::lround((dragPos.y - M) / S));
      bool taken = false;
      for (const HSlot& o : proc.engine.slots) if (o.id != id && o.gx == gx && o.gy == gy) taken = true;
      if (!taken) { s->gx = gx; s->gy = gy; }
    }
  });
  if (primed) startClockIfIdle();
}

void BoardComponent::mouseWheelMove(const juce::MouseEvent& ev, const juce::MouseWheelDetails& w) {   // molette : tourne l'hexagone (bas = horaire)
  int line, id;
  { std::lock_guard<std::mutex> lk(proc.mtx); id = hitSlot(toLogical(ev.position), line); }
  if (id < 0 || w.deltaY == 0) return;
  const int d = w.deltaY < 0 ? 1 : -1;
  proc.edit([&] { if (HSlot* s = proc.engine.find(id)) proc.engine.rotateBy(*s, d); });
}

// ---- menu d'un hexagone ----
void BoardComponent::slotMenu(int id) {
  HexacordeProcessor* P = &proc;
  auto with = [P, id](auto f) { P->edit([&] { if (HSlot* s = P->engine.find(id)) f(*s); }); };
  auto get = [P, id](auto f) {
    std::lock_guard<std::mutex> lk(P->mtx);
    HSlot* s = P->engine.find(id);
    return s ? f(*s) : decltype(f(*s))();
  };
  juce::PopupMenu m;
  {
    std::lock_guard<std::mutex> lk(proc.mtx);
    HSlot* s = proc.engine.find(id);
    if (!s) return;
    int hn = hexa::hexNumber(s->lines);
    m.addSectionHeader(juce::String::charToString((juce::juce_wchar)s->label) + " : " + juce::String(hn) + ". " + hexa::hexName(hn).pinyin + ", " + hexa::hexName(hn).en);
  }
  juce::PopupMenu hexM;                                     // trigramme inférieur puis supérieur
  for (int lo = 0; lo < 8; lo++) {
    juce::PopupMenu sub;
    for (int up = 0; up < 8; up++) {
      int n = hexa::kwTable()[lo][up];
      sub.addItem(juce::String(TRIGRAM_EN[up]) + " : " + juce::String(n) + ". " + hexa::hexName(n).en, [with, n] { with([n](HSlot& s) { HEngine e; e.setHexagram(s, n); }); });
    }
    hexM.addSubMenu(juce::String("Lower: ") + TRIGRAM_EN[lo], sub);
  }
  m.addSubMenu("Hexagram", hexM);

  juce::PopupMenu scaleM;
  for (const hexa::ScaleDef& d : hexa::scaleTable()) {
    std::string key = d.key;
    scaleM.addItem(d.en, true, get([key](HSlot& s) { return s.mode == key; }), [with, key] { with([key](HSlot& s) { s.mode = key; }); });
  }
  m.addSubMenu("Scale", scaleM);

  juce::PopupMenu chM;
  for (int c = 0; c < 16; c++) chM.addItem("Channel " + juce::String(c + 1), true, get([c](HSlot& s) { return s.channel == c; }), [with, c] { with([c](HSlot& s) { s.channel = c; }); });
  m.addSubMenu("MIDI channel", chM);

  juce::PopupMenu tonM;
  tonM.addItem("global tonic", true, get([](HSlot& s) { return s.tonic < 0; }), [with] { with([](HSlot& s) { s.tonic = -1; }); });
  for (int t = 0; t < 12; t++) tonM.addItem(NOTE_EN[t], true, get([t](HSlot& s) { return s.tonic == t; }), [with, t] { with([t](HSlot& s) { s.tonic = t; }); });
  m.addSubMenu("Tonic", tonM);
  juce::PopupMenu octM;
  for (int o = -3; o <= 3; o++) octM.addItem(juce::String(o), true, get([o](HSlot& s) { return s.octave == o; }), [with, o] { with([o](HSlot& s) { s.octave = o; }); });
  m.addSubMenu("Octave", octM);

  m.addSeparator();
  m.addItem("Rotation", true, get([](HSlot& s) { return s.rotOn; }), [with] { with([](HSlot& s) { s.rotOn = !s.rotOn; }); });
  m.addItem("Rotation counterclockwise", true, get([](HSlot& s) { return s.rotDir < 0; }), [with] { with([](HSlot& s) { s.rotDir = -s.rotDir; }); });
  juce::PopupMenu spM;
  static const struct { double v; const char* name; } sp[] = {{0.125, "/8"}, {0.25, "/4"}, {1.0 / 3, "/3"}, {0.5, "/2"}, {1, "x1"}, {2, "x2"}, {3, "x3"}};
  for (const auto& x : sp) {
    double v = x.v;
    spM.addItem(x.name, true, get([v](HSlot& s) { return std::fabs(s.rotSpeed - v) < 1e-6; }), [with, v] { with([v](HSlot& s) { s.rotSpeed = v; s.rotAcc = 0; }); });
  }
  m.addSubMenu("Rotation speed", spM);
  juce::PopupMenu loopM;
  loopM.addItem("off", true, get([](HSlot& s) { return !s.loopOn; }), [with] { with([](HSlot& s) { s.loopOn = false; }); });
  for (int n : {2, 3, 4, 6, 8, 12, 16, 24, 32, 48, 64})
    loopM.addItem(juce::String(n), true, get([n](HSlot& s) { return s.loopOn && s.loopN == n; }), [with, n] { with([n](HSlot& s) { s.loopOn = true; s.loopN = n; }); });
  m.addSubMenu("Priming every N steps", loopM);
  m.addItem("7th side (heptagon)", true, get([](HSlot& s) { return s.n == 7; }), [P, with] { with([P](HSlot& s) { P->engine.setSides(s, s.n == 7 ? 6 : 7); }); });

  m.addSeparator();
  m.addItem("Custom notes", true, get([](HSlot& s) { return s.customOn; }), [with] { with([](HSlot& s) { s.customOn = !s.customOn; }); });
  juce::PopupMenu cnM;
  int n = get([](HSlot& s) { return s.n; });
  cnM.addItem("Reload the scale", [with] { with([](HSlot& s) { HEngine::fillCustom(s); s.customOn = true; }); });
  cnM.addItem("Shuffle the order", [P, with] {
    static std::mt19937 rng{std::random_device{}()};
    with([P](HSlot& s) { P->engine.shuffleCustom(s, rng); });
  });
  for (int k = 0; k < n; k++) {
    juce::PopupMenu lineM;
    for (int w = 0; w < 2; w++) {
      juce::PopupMenu noteM;
      for (int off = -1; off < 24; off++)
        noteM.addItem(noteLabel(proc.engine, id, off), true,
                      get([k, w, off](HSlot& s) { return k < (int)s.custom.size() && (w ? s.custom[(size_t)k].b : s.custom[(size_t)k].p) == off; }),
                      [with, k, w, off] { with([k, w, off](HSlot& s) { if (k < (int)s.custom.size()) { (w ? s.custom[(size_t)k].b : s.custom[(size_t)k].p) = off; s.customOn = true; } }); });
      lineM.addSubMenu(w ? "Broken line" : "Solid line", noteM);
    }
    cnM.addSubMenu("Line " + juce::String(k + 1), lineM);
  }
  m.addSubMenu("Edit the custom notes", cnM);

  m.addSeparator();
  m.addItem("Reset", [P, with] { with([P](HSlot& s) { P->engine.resetSlot(s); }); });
  m.addItem("Active", true, get([](HSlot& s) { return s.active; }), [with] { with([](HSlot& s) { s.active = !s.active; if (!s.active) s.phOn = false; }); });
  m.addItem("Delete", [P, id] { P->edit([&] { P->engine.removeSlot(id); }); });
  m.showMenuAsync(juce::PopupMenu::Options());
}

// ---- menu du plateau ----
void BoardComponent::boardMenu(Point<float> lp) {
  HexacordeProcessor* P = &proc;
  juce::PopupMenu m;
  int cols, rows, count;
  { std::lock_guard<std::mutex> lk(proc.mtx); cols = proc.engine.cols; rows = proc.engine.rows; count = (int)proc.engine.slots.size(); }
  const int gx = juce::jlimit(0, cols - 1, (int)std::lround((lp.x - M) / S)), gy = juce::jlimit(0, rows - 1, (int)std::lround((lp.y - M) / S));
  m.addItem("New hexagram here", count < hexa::MAX_SLOTS, false, [P, gx, gy] {
    static std::mt19937 rng{std::random_device{}()};
    P->edit([&] {
      int x, y;
      if (!P->engine.freeCellNear(gx, gy, x, y)) return;
      hexa::SlotInit c; c.gx = x; c.gy = y; c.mode = P->engine.opt.scale;
      for (int i = 0; i < 6; i++) c.lines.push_back(std::uniform_int_distribution<int>(0, 1)(rng));
      P->engine.addSlot(c);
    });
  });
  m.addSeparator();
  auto resize = [P](int dc, int dr) { P->edit([&] { P->engine.setGridSize(P->engine.cols + dc, P->engine.rows + dr); }); };
  m.addItem("More columns", cols < hexa::N_MAX, false, [resize] { resize(1, 0); });
  m.addItem("Fewer columns", P->engine.canResize(cols - 1, rows), false, [resize] { resize(-1, 0); });
  m.addItem("More rows", rows < hexa::N_MAX, false, [resize] { resize(0, 1); });
  m.addItem("Fewer rows", P->engine.canResize(cols, rows - 1), false, [resize] { resize(0, -1); });
  m.showMenuAsync(juce::PopupMenu::Options());
}

// ---------------------------------------------------------------------------------------------------------------
// fenêtre

HexacordeEditor::HexacordeEditor(HexacordeProcessor& p) : AudioProcessorEditor(&p), proc(p), board(p) {
  addAndMakeVisible(board);
  addAndMakeVisible(runBtn);
  runAtt = std::make_unique<juce::ButtonParameterAttachment>(*proc.run, runBtn);
  tempoSl.setSliderStyle(juce::Slider::LinearBar);
  tempoSl.setTextValueSuffix(" BPM");
  addAndMakeVisible(tempoSl);
  tempoAtt = std::make_unique<juce::SliderParameterAttachment>(*proc.tempo, tempoSl);
  for (int t = 0; t < 12; t++) tonicCb.addItem(juce::String("Tonic ") + NOTE_EN[t], t + 1);
  for (int o = -3; o <= 3; o++) octaveCb.addItem("Octave " + juce::String(o), o + 4);
  for (size_t i = 0; i < hexa::scaleTable().size(); i++) scaleCb.addItem(hexa::scaleTable()[i].en, (int)i + 1);
  for (auto* c : {&tonicCb, &octaveCb, &scaleCb}) addAndMakeVisible(c);
  for (auto* b : {&optionsBtn, &setupBtn, &drawBtn, &scatterBtn, &silenceBtn}) addAndMakeVisible(b);

  tonicCb.onChange = [this] { int v = tonicCb.getSelectedId() - 1; proc.edit([&] { proc.engine.opt.tonic = v; }); };
  octaveCb.onChange = [this] { int v = octaveCb.getSelectedId() - 4; proc.edit([&] { proc.engine.opt.octave = v; }); };
  scaleCb.onChange = [this] {
    size_t i = (size_t)(scaleCb.getSelectedId() - 1);
    if (i >= hexa::scaleTable().size()) return;
    std::string key = hexa::scaleTable()[i].key;
    proc.edit([&] { proc.engine.opt.scale = key; for (auto& s : proc.engine.slots) s.mode = key; });
  };
  optionsBtn.onClick = [this] { optionsMenu(); };
  setupBtn.onClick = [this] { setupMenu(); };
  drawBtn.onClick = [this] { proc.edit([&] { proc.engine.drawRandom(rng); }); };
  scatterBtn.onClick = [this] { proc.edit([&] { proc.engine.scatter(rng); }); };
  silenceBtn.onClick = [this] { proc.silenceAll(); };

  setResizable(true, true);
  setResizeLimits(520, 460, 2000, 1600);
  setSize(860, 760);
  syncControls();
  startTimerHz(10);
}

HexacordeEditor::~HexacordeEditor() = default;

void HexacordeEditor::paint(juce::Graphics& g) { g.fillAll(col(C_BG)); }

void HexacordeEditor::resized() {
  auto r = getLocalBounds().reduced(6);
  auto bar = r.removeFromTop(28);
  runBtn.setBounds(bar.removeFromLeft(60));
  tempoSl.setBounds(bar.removeFromLeft(110));
  bar.removeFromLeft(6);
  tonicCb.setBounds(bar.removeFromLeft(100)); bar.removeFromLeft(4);
  octaveCb.setBounds(bar.removeFromLeft(100)); bar.removeFromLeft(4);
  scaleCb.setBounds(bar.removeFromLeft(150));
  r.removeFromTop(4);
  auto bar2 = r.removeFromTop(28);
  for (auto* b : {&optionsBtn, &setupBtn, &drawBtn, &scatterBtn, &silenceBtn}) { b->setBounds(bar2.removeFromLeft(90)); bar2.removeFromLeft(4); }
  r.removeFromTop(4);
  board.setBounds(r);
}

void HexacordeEditor::syncControls() {
  std::lock_guard<std::mutex> lk(proc.mtx);
  tonicCb.setSelectedId(proc.engine.opt.tonic + 1, juce::dontSendNotification);
  octaveCb.setSelectedId(proc.engine.opt.octave + 4, juce::dontSendNotification);
  for (size_t i = 0; i < hexa::scaleTable().size(); i++)
    if (proc.engine.opt.scale == hexa::scaleTable()[i].key) scaleCb.setSelectedId((int)i + 1, juce::dontSendNotification);
}

void HexacordeEditor::timerCallback() {
  int v = proc.stateVersion.load();
  if (v != seenVersion) { seenVersion = v; syncControls(); }
}

void HexacordeEditor::optionsMenu() {
  HexacordeProcessor* P = &proc;
  juce::PopupMenu m;
  auto flag = [&](const char* name, juce::AudioParameterBool* prm) {
    m.addItem(name, true, prm->get(), [prm] { prm->setValueNotifyingHost(prm->get() ? 0.f : 1.f); });
  };
  flag("Follow the host transport", proc.syncHost);
  flag("Internal synth", proc.synthOn);
  m.addItem("Mutation", true, [&] { std::lock_guard<std::mutex> lk(proc.mtx); return proc.engine.opt.mutate; }(), [P] { P->edit([&] { P->engine.opt.mutate = !P->engine.opt.mutate; }); });
  m.addItem("Uniform octave", true, [&] { std::lock_guard<std::mutex> lk(proc.mtx); return proc.engine.opt.uniform; }(), [P] { P->edit([&] { P->engine.opt.uniform = !P->engine.opt.uniform; }); });
  juce::PopupMenu rangeM;
  for (double r : {1.5, 2.5, 3.5, 5.0})
    rangeM.addItem(juce::String(r, 1) + " cells", true, [&] { std::lock_guard<std::mutex> lk(proc.mtx); return proc.engine.opt.softRange == r; }(), [P, r] { P->edit([&] { P->engine.opt.softRange = r; }); });
  m.addSubMenu("Soft pulse range", rangeM);
  juce::PopupMenu waveM;
  for (const char* w : {"square", "sawtooth", "triangle", "sine", "fm"})
    waveM.addItem(w, true, [&] { std::lock_guard<std::mutex> lk(proc.mtx); return proc.engine.sound.wave == w; }(), [P, w] { P->edit([&] { P->engine.sound.wave = w; }); });
  m.addSubMenu("Synth waveform", waveM);
  juce::PopupMenu allM;
  allM.addItem("Individual channels", true, [&] { std::lock_guard<std::mutex> lk(proc.mtx); return proc.engine.opt.chanAll < 0; }(), [P] { P->edit([&] { P->engine.opt.chanAll = -1; }); });
  for (int c = 0; c < 16; c++)
    allM.addItem("All on channel " + juce::String(c + 1), true, [&] { std::lock_guard<std::mutex> lk(proc.mtx); return proc.engine.opt.chanAll == c; }(), [P, c] { P->edit([&] { P->engine.opt.chanAll = c; }); });
  m.addSubMenu("Common MIDI channel", allM);
  juce::PopupMenu outM;
  outM.addItem("None (host output only)", true, proc.midiOutputChoice().isEmpty(), [P] { P->chooseMidiOutput({}); });
#if JUCE_LINUX || JUCE_MAC || JUCE_IOS
  outM.addItem("Virtual port \"Hexacorde\"", true, proc.midiOutputChoice() == "@virtual", [P] { P->chooseMidiOutput("@virtual"); });
#endif
  for (const auto& name : proc.midiOutputNames())
    outM.addItem(name, true, proc.midiOutputChoice() == name, [P, name] { P->chooseMidiOutput(name); });
  m.addSubMenu("MIDI output", outM);
  m.showMenuAsync(juce::PopupMenu::Options().withTargetComponent(optionsBtn));
}

void HexacordeEditor::setupMenu() {
  juce::PopupMenu m;
  m.addItem("Open...", [this] {
    chooser = std::make_unique<juce::FileChooser>("Open a setup", juce::File(), "*.json;*.txt");
    chooser->launchAsync(juce::FileBrowserComponent::openMode | juce::FileBrowserComponent::canSelectFiles, [this](const juce::FileChooser& fc) {
      juce::File f = fc.getResult();
      if (!f.existsAsFile()) return;
      juce::String err;
      if (!proc.loadSetupText(f.loadFileAsString(), err))
        juce::AlertWindow::showMessageBoxAsync(juce::MessageBoxIconType::WarningIcon, "Hexacorde", "Cannot load the setup: " + err);
    });
  });
  m.addItem("Save...", [this] {
    chooser = std::make_unique<juce::FileChooser>("Save the setup", juce::File::getSpecialLocation(juce::File::userDocumentsDirectory).getChildFile("hexacorde.json"), "*.json");
    chooser->launchAsync(juce::FileBrowserComponent::saveMode | juce::FileBrowserComponent::canSelectFiles | juce::FileBrowserComponent::warnAboutOverwriting, [this](const juce::FileChooser& fc) {
      juce::File f = fc.getResult();
      if (f != juce::File()) f.replaceWithText(proc.setupText() + "\n");
    });
  });
  m.addSeparator();
  m.addItem("Copy to the clipboard", [this] { juce::SystemClipboard::copyTextToClipboard(proc.setupText()); });
  m.addItem("Paste from the clipboard", [this] {
    juce::String err;
    if (!proc.loadSetupText(juce::SystemClipboard::getTextFromClipboard(), err))
      juce::AlertWindow::showMessageBoxAsync(juce::MessageBoxIconType::WarningIcon, "Hexacorde", "Cannot load the setup: " + err);
  });
  m.addSeparator();
  m.addItem("Back to the six starting hexagrams", [this] { proc.resetAll(); });
  m.showMenuAsync(juce::PopupMenu::Options().withTargetComponent(setupBtn));
}
