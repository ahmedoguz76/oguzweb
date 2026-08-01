/**
 * OğuzWeb — font indirme
 * ----------------------------------------------------------------------------
 * Source Serif 4 ve Source Sans 3 variable woff2 dosyalarını, latin ve
 * latin-ext alt kümeleriyle indirir. latin-ext, Türkçe karakterler için
 * (ğ Ğ ş Ş İ ı) ZORUNLUDUR — yalnızca latin indirilirse markanın kendi adı
 * yedek fontla çizilir.
 *
 * Neden self-host (PHASE 08 §13):
 *   - üçüncü parti istek = 0 hedefi
 *   - KVKW/gizlilik: ziyaretçi IP'si Google'a gitmez
 *   - tarayıcı önbelleği bölümlendiği için CDN'in hız avantajı kalmadı
 *
 * Kullanım:  node tools/fonts.js
 * Ağ erişimi gerektirir.
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "src", "fonts");

/* Modern bir UA gönderilmezse Google woff2 yerine ttf döner. */
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

const FAMILIES = [
  {
    name: "Source Serif 4",
    slug: "source-serif-4",
    css: "https://fonts.googleapis.com/css2?family=Source+Serif+4:opsz,wght@8..60,300..700&display=swap",
  },
  {
    name: "Source Sans 3",
    slug: "source-sans-3",
    css: "https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@300..700&display=swap",
  },
];

const WANTED_SUBSETS = ["latin", "latin-ext"];

async function fetchText(url) {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} — ${url}`);
  return res.text();
}

/**
 * CSS2 çıktısını ayrıştırır. Google, her alt küme bloğunun üstüne
 * `/* latin-ext *​/` biçiminde bir yorum koyar; alt küme adını buradan alıyoruz.
 */
function parseFaces(css) {
  const faces = [];
  const blocks = css.split("@font-face");
  let currentSubset = null;

  for (const block of blocks) {
    const commentMatches = [...block.matchAll(/\/\*\s*([\w-]+)\s*\*\//g)];
    if (commentMatches.length) {
      currentSubset = commentMatches[commentMatches.length - 1][1];
    }
    const url = block.match(/url\((https:\/\/[^)]+\.woff2)\)/);
    const subsetBefore = block.match(/\/\*\s*([\w-]+)\s*\*\//);
    if (url) {
      faces.push({
        subset: subsetBefore ? subsetBefore[1] : currentSubset,
        url: url[1],
      });
    }
  }
  return faces;
}

async function main() {
  await fs.mkdir(OUT, { recursive: true });
  const report = [];

  for (const family of FAMILIES) {
    console.log(`\n${family.name}`);
    const css = await fetchText(family.css);
    const faces = parseFaces(css).filter((f) => WANTED_SUBSETS.includes(f.subset));

    if (!faces.length) {
      throw new Error(
        `${family.name}: latin/latin-ext woff2 bulunamadı. ` +
          `Google API çıktısı değişmiş olabilir — tools/fonts.js gözden geçirilmeli.`
      );
    }

    for (const face of faces) {
      const file = `${family.slug}-${face.subset}.woff2`;
      const res = await fetch(face.url, { headers: { "User-Agent": UA } });
      if (!res.ok) throw new Error(`${res.status} — ${face.url}`);
      const buf = Buffer.from(await res.arrayBuffer());
      await fs.writeFile(path.join(OUT, file), buf);
      console.log(`  ✓ ${file} — ${(buf.length / 1024).toFixed(1)} KB`);
      report.push({ file, bytes: buf.length });
    }
  }

  const total = report.reduce((n, r) => n + r.bytes, 0);
  console.log(`\nToplam: ${(total / 1024).toFixed(1)} KB (bütçe: 90 KB)`);
  if (total > 90 * 1024) {
    console.log("\x1b[31m✗ Font bütçesi aşıldı.\x1b[0m");
    process.exitCode = 1;
  }

  console.log(
    "\nSonraki adım: `node tools/font-metrics.js` ile yedek font metriklerini ölçün."
  );
}

main().catch((err) => {
  console.error(`\n\x1b[31m✗ ${err.message}\x1b[0m`);
  console.error(
    "\nAğ erişimi yoksa tools/download-fonts.sh veya .ps1 betiğini kendi bilgisayarınızda çalıştırın."
  );
  process.exit(1);
});
