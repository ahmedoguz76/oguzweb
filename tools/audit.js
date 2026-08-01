/**
 * OğuzWeb — sistem denetimi
 * ----------------------------------------------------------------------------
 * Design system kurallarını kodda otomatik zorlar. Sıfır bağımlılık.
 *
 * Kural motoru BİLDİRİM tabanlıdır: CSS `özellik: değer` çiftlerine
 * ayrıştırılır ve kurallar değer üzerinde çalışır. Ham regex taraması yanlış
 * pozitif üretiyordu (`var(--space-4)` içindeki tire "negatif margin"
 * sanılıyordu) — bu yaklaşım o hata sınıfını ortadan kaldırır.
 *
 * MUAFİYET: bir bildirimin üstündeki satıra
 *     audit-ignore: A3 · gerekçe
 * içeren bir CSS yorumu yazılırsa o kural o bildirimde atlanır.
 * Gerekçe yazmak zorunludur — muafiyet sessiz olmamalı.
 *
 * Kurallar
 *   A1 · Bileşen dosyalarında primitive token yasak (K3 · marka taşınabilirliği)
 *   A2 · Skala dışı px değeri yasak (P4)
 *   A3 · Negatif margin yasak (§21)
 *   A4 · !important yasak (reset ve utilities hariç)
 *   A5 · ID seçici yasak
 *   A6 · Üst boşluk yasak — boşluk aşağı akar (§21/D1)
 *   A7 · border-radius yalnızca --radius-* ile
 *   A8 · box-shadow yalnızca --shadow-* ile
 *   A9 · text-transform: uppercase yasak (Türkçe i/İ)
 *   A10 · Yasak özellik animasyonu
 *
 * Kullanım:  node tools/audit.js       Çıkış kodu: ihlal varsa 1
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CSS = path.join(ROOT, "src", "css");

/* 4px tabanına oturan izinli px değerleri + teknik istisnalar:
   1px hairline · 2px odak halkası ve köşe · 3px alt çizgi offset */
const ALLOWED_PX = new Set([
  0, 1, 2, 3, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96, 128, 160, 192,
]);

/* Animasyonuna izin verilen özellikler. grid-template-rows akordeon için
   gerekçeli istisnadır (PHASE 08 §5). */
const ANIMATABLE = new Set([
  "opacity", "transform", "color", "background-color", "border-color",
  "outline", "outline-color", "outline-offset",
  "text-decoration", "text-decoration-thickness", "text-decoration-color",
  "grid-template-rows", "visibility", "none",
]);

const NOT_MARGIN = /^(?:scroll-margin|margin-trim)/;

const c = {
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
};

async function walk(dir) {
  const out = [];
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(full)));
    else if (full.endsWith(".css")) out.push(full);
  }
  return out;
}

const lineAt = (text, index) => text.slice(0, index).split("\n").length;

function parse(raw) {
  /* 1 · Muafiyet direktiflerini topla (yorumlar silinmeden önce) */
  const ignores = new Map();
  const ignoreRe = /audit-ignore:\s*([A-Z]\d+(?:\s*,\s*[A-Z]\d+)*)/g;
  let m;
  while ((m = ignoreRe.exec(raw))) {
    const line = lineAt(raw, m.index);
    const ids = m[1].split(",").map((s) => s.trim());
    for (const l of [line, line + 1, line + 2]) {
      if (!ignores.has(l)) ignores.set(l, new Set());
      ids.forEach((id) => ignores.get(l).add(id));
    }
  }

  /* 2 · Yorumları boşlukla değiştir — satır numaraları korunur */
  const code = raw.replace(/\/\*[\s\S]*?\*\//g, (s) => s.replace(/[^\n]/g, " "));

  /* 3 · Bildirimleri ayrıştır */
  const decls = [];
  const declRe = /([-a-zA-Z]+)\s*:\s*([^;{}]+)[;}]/g;
  while ((m = declRe.exec(code))) {
    decls.push({
      prop: m[1].toLowerCase(),
      value: m[2].trim(),
      line: lineAt(code, m.index),
    });
  }

  return { code, decls, ignores };
}

/* var(...) referanslarını çıkarır — içlerindeki tireler aritmetik işaret değil */
const stripVars = (v) => v.replace(/var\(\s*--[\w-]+\s*(?:,[^()]*)?\)/g, "V");

function auditFile(rel, raw) {
  const { code, decls, ignores } = parse(raw);
  const hits = [];
  const add = (id, line, text, hint) => {
    if (ignores.get(line)?.has(id)) return;
    hits.push({ id, line, text, hint });
  };

  const isComponent = rel.startsWith("05-components/");
  const isTokens = rel.startsWith("02-tokens/");
  const isReset = rel.startsWith("01-reset");
  const isUtilities = rel.startsWith("06-utilities");

  for (const d of decls) {
    /* Custom property tanımları kuralların dışındadır — skalayı onlar kurar */
    if (d.prop.startsWith("--")) continue;

    const bare = stripVars(d.value);

    /* A1 */
    if (isComponent && /var\(\s*--(?:ink|paper|accent)-\d{3}/.test(d.value)) {
      add("A1", d.line, `${d.prop}: ${d.value}`,
        "semantic token kullanın (--text-primary, --surface-page, …)");
    }

    /* A2 */
    if (!isTokens) {
      for (const px of bare.matchAll(/(-?\d+(?:\.\d+)?)px/g)) {
        const n = Math.abs(Number(px[1]));
        if (!ALLOWED_PX.has(n)) {
          add("A2", d.line, `${d.prop}: ${px[0]}`,
            "4px tabanlı skalaya oturmuyor (P4)");
        }
      }
    }

    /* A3 */
    if (/^margin/.test(d.prop) && !NOT_MARGIN.test(d.prop) &&
        /(?:^|[\s(,])-\d/.test(bare)) {
      add("A3", d.line, `${d.prop}: ${d.value}`, "yapısal hatanın belirtisi");
    }

    /* A6 */
    if (!isReset && /^(?:margin-block-start|margin-top)$/.test(d.prop)) {
      add("A6", d.line, `${d.prop}: ${d.value}`,
        "boşluk aşağı akar (§21/D1) — alt boşluk verin");
    }

    /* A7 */
    if (d.prop === "border-radius" &&
        !/^(?:var\(\s*--radius|0$|0[a-z%]|inherit|initial|unset)/.test(d.value)) {
      add("A7", d.line, `${d.prop}: ${d.value}`, "--radius-none veya --radius-xs");
    }

    /* A8 */
    if (d.prop === "box-shadow" && !/^(?:var\(\s*--shadow|none)/.test(d.value)) {
      add("A8", d.line, `${d.prop}: ${d.value}`, "gölge yok; istisna --shadow-overlay");
    }

    /* A9 */
    if (d.prop === "text-transform" && /uppercase/.test(d.value)) {
      add("A9", d.line, `${d.prop}: ${d.value}`, "Türkçe'de i→İ dönüşümü bozulur");
    }

    /* A10 */
    if (d.prop === "transition" || d.prop === "transition-property") {
      const props = d.value
        .split(",")
        .map((part) => part.trim().split(/\s+/)[0])
        .filter(Boolean);
      for (const p of props) {
        if (!ANIMATABLE.has(p)) {
          add("A10", d.line, `transition: … ${p} …`,
            "yalnızca opacity/transform (+ renk ve akordeon istisnası)");
        }
      }
    }
  }

  /* A4 */
  if (!isUtilities && !isReset) {
    for (const m of code.matchAll(/!important/g)) {
      add("A4", lineAt(code, m.index), "!important",
        "katman sırası zaten özgüllüğü çözüyor");
    }
  }

  /* A5 */
  for (const m of code.matchAll(/^\s*#[\w-]+[^{;]*\{/gm)) {
    add("A5", lineAt(code, m.index), m[0].trim().slice(0, 40), "sınıf kullanın");
  }

  return hits;
}

async function main() {
  const files = await walk(CSS);
  if (!files.length) {
    console.log(c.yellow("\nCSS dosyası bulunamadı.\n"));
    process.exit(0);
  }

  let total = 0;
  console.log(c.bold("\nOğuzWeb · sistem denetimi\n"));

  for (const file of files) {
    const rel = path.relative(CSS, file).split(path.sep).join("/");
    const hits = auditFile(rel, await fs.readFile(file, "utf8"));
    if (!hits.length) continue;
    total += hits.length;
    console.log(`  ${c.red("✗")} ${rel}`);
    for (const h of hits) {
      console.log(`      ${c.dim(`${h.id} · satır ${h.line}`)}  ${h.text}`);
      console.log(`      ${c.dim(`→ ${h.hint}`)}`);
    }
  }

  console.log();
  if (total === 0) {
    console.log(`  ${c.green("✓")} ${files.length} dosya denetlendi — ihlal yok\n`);
    process.exit(0);
  }
  console.log(`  ${c.red(`${total} ihlal bulundu`)}\n`);
  process.exit(1);
}

main().catch((err) => {
  console.error(c.red(`\nDenetim hatası: ${err.message}\n`));
  process.exit(1);
});
