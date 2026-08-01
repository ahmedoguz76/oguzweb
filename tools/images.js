/**
 * OğuzWeb — görsel boru hattı
 * ----------------------------------------------------------------------------
 * src/images/_source/  →  src/images/
 *
 * Her kaynak görselden üretilenler (PHASE 08 §14):
 *   AVIF  × 480 / 768 / 1024 / 1440
 *   WebP  × 480 / 768 / 1024 / 1440   (yedek)
 *   JPEG  × 1440                       (son çare)
 *   + manifest.json (genişlik/yükseklik → CLS için HTML'e yazılacak)
 *
 * Kalite değerleri varsayılan kabul edilmez; görsel karşılaştırmayla
 * doğrulanır. Bu dosyadaki değerler başlangıç noktasıdır.
 *
 * Tek bağımlılık: sharp.   npm install
 * Kullanım:  node tools/images.js
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = path.join(ROOT, "src", "images", "_source");
const OUT = path.join(ROOT, "src", "images");

const WIDTHS = [480, 768, 1024, 1440];
const QUALITY = { avif: 55, webp: 78, jpeg: 82 };
const MAX_BYTES = 150 * 1024; /* PHASE 08 §7 — görsel başına bütçe */

let sharp;
try {
  ({ default: sharp } = await import("sharp"));
} catch {
  console.error(
    "\n\x1b[31m✗ sharp bulunamadı.\x1b[0m\n\n" +
      "  npm install\n\n" +
      "  Ağ erişiminiz yoksa görselleri elle hazırlayıp src/images/ içine\n" +
      "  koyabilirsiniz. Beklenen adlandırma:\n" +
      "    <ad>-<genişlik>.avif / .webp / .jpg\n"
  );
  process.exit(1);
}

async function main() {
  await fs.mkdir(SOURCE, { recursive: true });
  await fs.mkdir(OUT, { recursive: true });

  const files = (await fs.readdir(SOURCE)).filter((f) =>
    /\.(png|jpe?g|tiff?|webp)$/i.test(f)
  );

  if (!files.length) {
    console.log(
      "\nsrc/images/_source/ boş.\n\n" +
        "Proje ekran görüntüsü standardı (PHASE 08 §12):\n" +
        "  · yakalama genişliği 1440px, tüm projelerde aynı\n" +
        "  · tarayıcı çerçevesi yok, içerik alanına kırpılmış\n" +
        "  · en-boy oranı 16:10 (masaüstü) / 4:5 (mobil, portre)\n" +
        "  · kaynak format PNG (kayıpsız), sRGB\n"
    );
    return;
  }

  const manifest = {};
  let warnings = 0;

  for (const file of files) {
    const name = path.parse(file).name;
    const input = path.join(SOURCE, file);
    const image = sharp(input);
    const meta = await image.metadata();

    manifest[name] = {
      width: meta.width,
      height: meta.height,
      ratio: +(meta.width / meta.height).toFixed(4),
      variants: [],
    };

    console.log(`\n${file}  (${meta.width}×${meta.height})`);

    for (const w of WIDTHS) {
      if (w > meta.width) continue;

      for (const format of ["avif", "webp"]) {
        const out = path.join(OUT, `${name}-${w}.${format}`);
        await sharp(input)
          .resize({ width: w, withoutEnlargement: true })
          [format]({ quality: QUALITY[format] })
          .toFile(out);
        const { size } = await fs.stat(out);
        manifest[name].variants.push({ format, width: w, bytes: size });
        const flag = size > MAX_BYTES ? " \x1b[33m← bütçe aşımı\x1b[0m" : "";
        if (size > MAX_BYTES) warnings++;
        console.log(`  ${name}-${w}.${format} — ${(size / 1024).toFixed(1)} KB${flag}`);
      }
    }

    const jpegOut = path.join(OUT, `${name}-1440.jpg`);
    await sharp(input)
      .resize({ width: 1440, withoutEnlargement: true })
      .jpeg({ quality: QUALITY.jpeg, mozjpeg: true })
      .toFile(jpegOut);
    console.log(`  ${name}-1440.jpg — yedek`);
  }

  await fs.writeFile(
    path.join(OUT, "manifest.json"),
    JSON.stringify(manifest, null, 2),
    "utf8"
  );

  console.log(`\n✓ ${files.length} görsel işlendi. manifest.json güncellendi.`);
  if (warnings) {
    console.log(
      `\x1b[33m! ${warnings} varyant 150 KB bütçesini aştı — kaliteyi düşürün ` +
        `veya kaynağı yeniden kırpın.\x1b[0m`
    );
  }
}

main().catch((err) => {
  console.error(`\n\x1b[31m✗ ${err.message}\x1b[0m`);
  process.exit(1);
});
