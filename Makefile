# Construit index.html (page unique, sans dépendance) à partir de src/.
#   make          construit index.html
#   make check    vérifie la syntaxe du JS assemblé (node)
#   make serve    sert le dossier sur http://localhost:8000 (nécessaire à Firefox pour Web MIDI)
#   make clean    supprime build/

JS := $(sort $(wildcard src/js/*.js))

all: index.html

# le JS est concaténé dans l'ordre des numéros de fichier, dans une seule fonction
# (les modules partagent donc la même portée) ; le CSS et le JS remplacent les repères du gabarit
build/app.js: $(JS) Makefile
	@mkdir -p build
	@{ echo "(() => {"; echo "'use strict';"; \
	   for f in $(JS); do echo; echo "// ===== $$f ====="; cat $$f; done; \
	   echo "})();"; } > $@

index.html: src/template.html src/style.css build/app.js Makefile
	sed -e '/@@CSS@@/{r src/style.css' -e 'd}' -e '/@@JS@@/{r build/app.js' -e 'd}' src/template.html > $@
	@echo "index.html construit ($$(wc -c < $@) octets)"

check: build/app.js
	node --check build/app.js && echo "syntaxe JS : ok"

serve: index.html
	python3 -m http.server 8000

clean:
	rm -rf build

.PHONY: all check serve clean
