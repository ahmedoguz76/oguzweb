#!/usr/bin/env bash
# OğuzWeb — görsel indirme ve hazırlama (macOS / Linux)
# Kullanım:  bash tools/download-images.sh
#
# İki iş yapar:
#   1) assets.json içinde tanımlı uzak görselleri src/images/_source/ altına indirir
#   2) node tools/images.js çalıştırıp AVIF/WebP/JPEG varyantlarını üretir
#
# assets.json yoksa yalnızca 2. adım çalışır — görselleri elle
# src/images/_source/ klasörüne koymanız yeterlidir.

set -euo pipefail
cd "$(dirname "$0")/.."

SRC_DIR="src/images/_source"
MANIFEST="tools/assets.json"
mkdir -p "$SRC_DIR"

if [ -f "$MANIFEST" ]; then
  echo "Manifest bulundu: $MANIFEST"
  if ! command -v curl >/dev/null 2>&1; then
    echo "✗ curl bulunamadı."
    exit 1
  fi
  node -e '
    const fs=require("fs");
    const list=JSON.parse(fs.readFileSync("tools/assets.json","utf8"));
    for(const item of list) console.log(item.url+"\t"+item.file);
  ' | while IFS=$'\t' read -r url file; do
    target="$SRC_DIR/$file"
    if [ -f "$target" ]; then
      echo "  · $file (mevcut, atlandı)"
      continue
    fi
    echo "  ↓ $file"
    curl -fsSL "$url" -o "$target" || { echo "  ✗ indirilemedi: $url"; }
  done
else
  echo "tools/assets.json yok — indirme adımı atlandı."
  echo "Görselleri elle $SRC_DIR klasörüne koyun."
fi

echo
COUNT=$(find "$SRC_DIR" -type f \( -name '*.png' -o -name '*.jpg' -o -name '*.jpeg' \) 2>/dev/null | wc -l | tr -d ' ')
echo "$SRC_DIR içinde $COUNT kaynak görsel var."

if [ "$COUNT" -eq 0 ]; then
  echo
  echo "Proje ekran görüntüsü standardı:"
  echo "  · yakalama genişliği 1440px (tüm projelerde aynı)"
  echo "  · tarayıcı çerçevesi yok, içerik alanına kırpılmış"
  echo "  · en-boy oranı 16:10 masaüstü / 4:5 portre"
  echo "  · PNG, sRGB"
  exit 0
fi

echo
echo "Varyantlar üretiliyor…"
node tools/images.js
