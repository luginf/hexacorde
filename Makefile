# Hexacorde : quatre parties, chacune dans son dossier.
#   docs/  l'application web (sources dans docs/src/, page générée docs/index.html, publiée par GitHub Pages)
#   core/  le cœur C++ sans dépendance (portage du moteur JS, vérifié contre lui)
#   vcv/   le module VCV Rack construit sur core/
#   juce/  le plugin JUCE (VST3, standalone) construit sur core/
#
#   make              construit docs/index.html (page unique, sans dépendance) à partir de docs/src/
#   make check        vérifie la syntaxe du JS assemblé (node)
#   make serve        sert docs/ sur http://localhost:8000 (nécessaire à Firefox pour Web MIDI)
#   make core-test    compile le cœur C++ et le compare à l'application web (core/test/ref.txt)
#   make core-ref     régénère core/test/ref.txt depuis docs/index.html (demande google-chrome)
#   make vcv          compile le module VCV Rack (demande le Rack SDK, voir vcv/README.md)
#   make vcv-release  exporte le module comme dépôt autonome (pour la VCV Library)
#   make juce         compile le plugin JUCE (télécharge JUCE ; cmake requis, voir juce/README.md)
#   make juce-test    teste le plugin sans interface ni carte son (horloge, notes MIDI, état)
#   make clean        supprime les fichiers intermédiaires

WEB := docs
JS := $(sort $(wildcard $(WEB)/src/js/*.js))

all: web
web: $(WEB)/index.html

# le JS est concaténé dans l'ordre des numéros de fichier, dans une seule fonction
# (les modules partagent donc la même portée) ; le CSS et le JS remplacent les repères du gabarit
$(WEB)/build/app.js: $(JS) Makefile
	@mkdir -p $(WEB)/build
	@{ echo "(() => {"; echo "'use strict';"; \
	   for f in $(JS); do echo; echo "// ===== $$f ====="; cat $$f; done; \
	   echo "})();"; } > $@

$(WEB)/index.html: $(WEB)/src/template.html $(WEB)/src/style.css $(WEB)/build/app.js Makefile
	sed -e '/@@CSS@@/{r $(WEB)/src/style.css' -e 'd}' -e '/@@JS@@/{r $(WEB)/build/app.js' -e 'd}' $(WEB)/src/template.html > $@
	@echo "$@ construit ($$(wc -c < $@) octets)"

check: $(WEB)/build/app.js
	node --check $(WEB)/build/app.js && echo "syntaxe JS : ok"

serve: $(WEB)/index.html
	cd $(WEB) && python3 -m http.server 8000

clean:
	rm -rf $(WEB)/build core/build juce/build

# ---- cœur C++ : tables générées depuis les sources JS, puis test de fidélité contre le JS ----
core/tables.hpp: core/gen_tables.js $(WEB)/src/js/01-constants.js $(WEB)/src/js/02-hexagrams.js $(WEB)/src/js/00b-lang-en.js $(WEB)/src/js/00c-lang-fr.js
	node core/gen_tables.js > $@

core-test: core/tables.hpp
	@mkdir -p core/build
	g++ -std=c++17 -Wall -Wextra -O1 -o core/build/test_core core/test/test_core.cpp
	core/build/test_core

core-ref: $(WEB)/index.html
	python3 core/test/make_ref.py

# ---- module VCV Rack (demande le Rack SDK : RACK_DIR=... ; par défaut ~/src/rack/Rack-SDK) ----
vcv: core/tables.hpp
	$(MAKE) -C vcv

# ---- plugin JUCE (télécharge JUCE ; cmake requis) : make juce [JUCE_DIR=/chemin/vers/JUCE] ; make juce-test = horloge puis processBlock sans interface ----
juce: core/tables.hpp
	cmake -S juce -B juce/build -DCMAKE_BUILD_TYPE=Release $(if $(JUCE_DIR),-DJUCE_DIR=$(JUCE_DIR))
	cmake --build juce/build -j4

juce-test: core/tables.hpp
	@mkdir -p juce/build
	g++ -std=c++17 -Wall -Wextra -o juce/build/test_clock juce/test/test_clock.cpp
	juce/build/test_clock
	cmake -S juce -B juce/build -DCMAKE_BUILD_TYPE=Release $(if $(JUCE_DIR),-DJUCE_DIR=$(JUCE_DIR))
	cmake --build juce/build --target HexacordeTest -j4
	juce/build/HexacordeTest_artefacts/Release/HexacordeTest

# dépôt autonome du module pour la VCV Library (voir vcv/release.sh) : make vcv-release [OUT=dossier]
vcv-release: core/tables.hpp
	vcv/release.sh $(OUT)

.PHONY: juce juce-test vcv-release all web check serve clean core-test core-ref vcv
