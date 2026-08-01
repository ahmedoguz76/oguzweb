#!/usr/bin/env bash
# OğuzWeb — font indirme (macOS / Linux)
# Kullanım:  bash tools/download-fonts.sh
# Ağ erişimi gerektirir. Node 18+ kurulu olmalıdır (fetch API için).

set -euo pipefail
cd "$(dirname "$0")/.."

if ! command -v node >/dev/null 2>&1; then
  echo "✗ Node bulunamadı. https://nodejs.org adresinden kurun (18 veya üzeri)."
  exit 1
fi

NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
if [ "$NODE_MAJOR" -lt 18 ]; then
  echo "✗ Node $NODE_MAJOR bulundu. 18 veya üzeri gerekli."
  exit 1
fi

echo "Source Serif 4 ve Source Sans 3 indiriliyor (latin + latin-ext)…"
node tools/fonts.js

echo
echo "Dosyalar: src/fonts/"
ls -lh src/fonts/ 2>/dev/null || true
echo
echo "Sonraki adım:"
echo "  1) npx serve .   (veya python3 -m http.server)"
echo "  2) tarayıcıda tools/font-metrics.html açın"
echo "  3) çıkan değerleri src/css/03-base/fonts.css içine yapıştırın"
