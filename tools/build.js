/**
 * OğuzWeb — build
 * ----------------------------------------------------------------------------
 * Sıfır bağımlılık. Sadece Node çekirdek modülleri.
 *
 * Yaptığı işler (PHASE 08 / K1 — "yalnızca üç iş"):
 *   1. HTML parça birleştirme + değişken yerleştirme
 *   2. CSS @import zincirini tek dosyada birleştirme + küçültme + içerik hash'i
 *   3. HTML küçültme, statik varlık kopyalama, bütçe raporu
 *
 * Yapmadığı işler (bilinçli):
 *   - JS bundling / transpile  → native ES modules, olduğu gibi kopyalanır
 *   - JS küçültme              → regex tabanlı JS küçültme doğruluk riski taşır,
 *                                kazanç ~1 KB. Risk/kazanç oranı kabul edilmedi.
 *
 * Kullanım:  node tools/build.js  [--watch]
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { gzipSync } from "node:zlib";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { stripJsComments, isValidModule } from "./strip-comments.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(ROOT, "src");
const DIST = path.join(ROOT, "dist");

const PAGES = path.join(SRC, "pages");
const PARTIALS = path.join(SRC, "partials");
const CSS_ENTRY = path.join(SRC, "css", "main.css");

/* Bütçeler — PHASE 08 §7. Aşım hata olarak raporlanır, uyarı olarak değil. */
const BUDGET_BYTES = {
  "css/main.css": 40 * 1024, /* ham vekil ölçü — sözleşme gzip üzerinde */
  "js (toplam)": 12 * 1024, /* ham; gzip hedefi 4 KB */
  "html (sayfa başına)": 40 * 1024,
};

const INCLUDE_RE = /<!--\s*include:\s*([\w./-]+)\s*-->/g;
const META_RE = /^<!--\s*meta\s*([\s\S]*?)-->\s*/;
const VAR_RE = /\{\{\s*([\w.-]+)\s*\}\}/g;
const CSS_IMPORT_RE =
  /@import\s+(?:url\(\s*["']?([^"')]+)["']?\s*\)|["']([^"']+)["'])\s*(?:layer\(\s*([\w-]+)\s*\))?\s*;/g;

const MAX_INCLUDE_DEPTH = 8;

/* ---------------------------------------------------------------- yardımcılar */

const log = {
  step: (m) => console.log(`\n\x1b[1m${m}\x1b[0m`),
  ok: (m) => console.log(`  \x1b[32m✓\x1b[0m ${m}`),
  warn: (m) => console.log(`  \x1b[33m!\x1b[0m ${m}`),
  fail: (m) => console.log(`  \x1b[31m✗\x1b[0m ${m}`),
  info: (m) => console.log(`    ${m}`),
};

const kb = (n) => `${(n / 1024).toFixed(1)} KB`;

async function walk(dir, filter = () => true) {
  const out = [];
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(full, filter)));
    else if (filter(full)) out.push(full);
  }
  return out;
}

async function copyDir(from, to) {
  try {
    await fs.access(from);
  } catch {
    return 0;
  }
  await fs.mkdir(to, { recursive: true });
  const entries = await fs.readdir(from, { withFileTypes: true });
  let count = 0;
  for (const e of entries) {
    const src = path.join(from, e.name);
    const dst = path.join(to, e.name);
    if (e.isDirectory()) count += await copyDir(src, dst);
    else {
      await fs.copyFile(src, dst);
      count++;
    }
  }
  return count;
}

function hash8(text) {
  return crypto.createHash("sha256").update(text).digest("hex").slice(0, 8);
}

/* -------------------------------------------------------------------- CSS */

/**
 * @import zincirini özyinelemeli olarak tek dosyada birleştirir.
 * `layer(x)` bildirimi varsa içerik @layer x { ... } bloğuna sarılır.
 * Çalışma zamanında @import kullanılmaz: istekler seri hale gelir ve
 * render'ı geciktirir (PHASE 08 §7 — tek CSS dosyası kararı).
 */
async function inlineCss(file, seen = new Set()) {
  const abs = path.resolve(file);
  if (seen.has(abs)) {
    log.warn(`döngüsel @import atlandı: ${path.relative(SRC, abs)}`);
    return "";
  }
  seen.add(abs);

  let css = await fs.readFile(abs, "utf8");
  const dir = path.dirname(abs);
  const jobs = [];

  css.replace(CSS_IMPORT_RE, (match, urlA, urlB, layer) => {
    jobs.push({ match, target: urlA || urlB, layer });
    return match;
  });

  for (const job of jobs) {
    const target = path.resolve(dir, job.target);
    let body = await inlineCss(target, seen);
    if (job.layer) body = `@layer ${job.layer} {\n${body}\n}`;
    css = css.replace(
      job.match,
      `\n/* ↓ ${path.relative(SRC, target)} */\n${body}\n`
    );
  }
  return css;
}

/**
 * Muhafazakâr CSS küçültme.
 * Dize ve url() içeriğine dokunmaz; yalnızca yorumları ve fazla boşluğu alır.
 */
function minifyCss(css) {
  const strings = [];
  let out = css.replace(/(["'])(?:\\.|(?!\1)[^\\\n])*\1/g, (m) => {
    strings.push(m);
    return `\u0000S${strings.length - 1}\u0000`;
  });

  out = out
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\s+/g, " ")
    /* DİKKAT: `+` bu sınıfa EKLENMEZ.
       CSS spesifikasyonu calc()/clamp() içinde `+` ve `-` operatörlerinin
       İKİ YANINDA da boşluk zorunlu kılar. `1.75rem + 3.3333vw` ifadesini
       `1.75rem+3.3333vw` haline getirmek değeri geçersiz yapar; custom
       property hesaplama anında düşer ve TÜM tip skalası sessizce çöker.
       Kazanç birkaç bayt, maliyet tasarımın tamamı. */
    .replace(/\s*([{}:;,>~])\s*/g, "$1")
    .replace(/;}/g, "}")
    .replace(/\(\s+/g, "(")
    .replace(/\s+\)/g, ")")
    .trim();

  return out.replace(/\u0000S(\d+)\u0000/g, (_, i) => strings[Number(i)]);
}

/* ------------------------------------------------------------------- HTML */

async function resolveIncludes(html, depth = 0) {
  if (depth > MAX_INCLUDE_DEPTH) {
    throw new Error(`include derinliği ${MAX_INCLUDE_DEPTH} aşıldı`);
  }
  const jobs = [];
  html.replace(INCLUDE_RE, (match, rel) => {
    jobs.push({ match, rel });
    return match;
  });
  if (!jobs.length) return html;

  for (const job of jobs) {
    const file = path.join(PARTIALS, job.rel);
    let body;
    try {
      body = await fs.readFile(file, "utf8");
    } catch {
      throw new Error(`parça bulunamadı: partials/${job.rel}`);
    }
    body = await resolveIncludes(body, depth + 1);
    html = html.replace(job.match, body);
  }
  return html;
}

function applyVars(html, vars) {
  const missing = new Set();
  const out = html.replace(VAR_RE, (match, key) => {
    if (Object.prototype.hasOwnProperty.call(vars, key)) return String(vars[key]);
    missing.add(key);
    return "";
  });
  return { out, missing: [...missing] };
}

/**
 * Muhafazakâr HTML küçültme.
 * pre/textarea/script/style içeriğine dokunulmaz.
 */
function minifyHtml(html) {
  const protectedBlocks = [];
  let out = html.replace(
    /<(pre|textarea|script|style)\b[\s\S]*?<\/\1>/gi,
    (m) => {
      protectedBlocks.push(m);
      return `\u0000B${protectedBlocks.length - 1}\u0000`;
    }
  );

  out = out
    .replace(/<!--(?!\[if)(?!\s*!)[\s\S]*?-->/g, "")
    .replace(/\n\s*\n/g, "\n")
    .replace(/>\s+</g, "><")
    .replace(/\s{2,}/g, " ")
    .trim();

  return out.replace(/\u0000B(\d+)\u0000/g, (_, i) => protectedBlocks[Number(i)]);
}

/* ------------------------------------------------------------------ build */

async function build({ minify = true } = {}) {
  const started = Date.now();
  const pkg = JSON.parse(await fs.readFile(path.join(ROOT, "package.json"), "utf8"));

  log.step("1 · Temizlik");
  await fs.rm(DIST, { recursive: true, force: true });
  await fs.mkdir(DIST, { recursive: true });
  log.ok("dist/ sıfırlandı");

  /* ---- CSS ---- */
  log.step("2 · CSS");
  let css = await inlineCss(CSS_ENTRY);
  const cssRaw = Buffer.byteLength(css);
  if (minify) css = minifyCss(css);
  const cssHash = hash8(css);
  const cssName = `main.${cssHash}.css`;
  await fs.mkdir(path.join(DIST, "css"), { recursive: true });
  await fs.writeFile(path.join(DIST, "css", cssName), css, "utf8");
  const cssSize = Buffer.byteLength(css);
  log.ok(`css/${cssName} — ${kb(cssRaw)} → ${kb(cssSize)}`);

  /* ---- JS ----
     Bundling ve transpile YOK. Tek işlem: yorum ayıklama.
     Kaynak dosyalar dokunulmaz — "neden böyle" bilgisi depoda kalır,
     yalnızca dist'e gitmez. Çıktı `node --check` ile doğrulanır;
     doğrulama başarısız olursa orijinal kullanılır. */
  log.step("3 · JavaScript");
  const jsFiles = await walk(path.join(SRC, "js"), (f) => f.endsWith(".js"));
  let jsTotal = 0;
  let jsRaw = 0;
  let jsFallback = 0;
  const jsBodies = [];
  for (const file of jsFiles) {
    const rel = path.relative(path.join(SRC, "js"), file);
    const dst = path.join(DIST, "js", rel);
    await fs.mkdir(path.dirname(dst), { recursive: true });
    const original = await fs.readFile(file, "utf8");
    jsRaw += Buffer.byteLength(original);

    let output = original;
    if (minify) {
      const stripped = stripJsComments(original);
      if (await isValidModule(stripped)) {
        output = stripped;
      } else {
        jsFallback++;
        log.warn(`${rel}: yorum ayıklama sözdizimini bozdu — orijinal kullanıldı`);
      }
    }

    await fs.writeFile(dst, output, "utf8");
    jsBodies.push(Buffer.from(output, "utf8"));
    jsTotal += Buffer.byteLength(output);
  }
  if (jsFiles.length && minify) {
    log.info(`yorum ayıklama: ${kb(jsRaw)} → ${kb(jsTotal)}` +
      (jsFallback ? ` · ${jsFallback} dosyada geri düşüldü` : ""));
  }
  log.ok(
    jsFiles.length
      ? `${jsFiles.length} modül — ${kb(jsTotal)}`
      : "modül yok (Aşama 4'te eklenecek)"
  );

  /* ---- HTML ---- */
  log.step("4 · HTML");
  const pages = await walk(PAGES, (f) => f.endsWith(".html"));
  const pageSizes = [];

  const isProd = process.argv.includes("--prod");

  for (const file of pages) {
    const rel = path.relative(PAGES, file);

    /* `_` ile başlayan sayfalar geliştirme araçlarıdır (_dev-tokens gibi).
       Üretim derlemesine dahil edilmezler. */
    if (isProd && path.basename(rel).startsWith("_")) {
      log.info(`atlandı (geliştirme sayfası): ${rel}`);
      continue;
    }

    let raw = await fs.readFile(file, "utf8");

    let meta = {};
    const metaMatch = raw.match(META_RE);
    if (metaMatch) {
      try {
        meta = JSON.parse(metaMatch[1].trim());
      } catch (err) {
        throw new Error(`${rel}: meta bloğu geçersiz JSON — ${err.message}`);
      }
      raw = raw.slice(metaMatch[0].length);
    }

    const depth = rel.split(path.sep).length - 1;
    const base = depth ? "../".repeat(depth) : "./";

    const vars = {
      version: pkg.version,
      cssPath: `${base}css/${cssName}`,
      jsPath: `${base}js/main.js?v=${pkg.version}`,
      basePath: base,
      buildYear: String(new Date().getFullYear()),

      /* ------------------------------------------------------------------
         WhatsApp ön yazılı mesajları.
         Ziyaretçinin en büyük engeli "ne yazacağımı bilmiyorum"dur; boş bir
         WhatsApp ekranı, tıklamayı geri alan sessiz bir engeldir. Hazır
         mesaj hem bu engeli kaldırır hem konuşmayı nitelendirir.

         Burada tanımlanır çünkü tek kaynak olması gerekir: aynı metin dört
         sayfada elle tekrarlanırsa er ya da geç ayrışır. encodeURIComponent
         Türkçe karakterleri güvenli hale getirir.
         ------------------------------------------------------------------ */
      waHero: encodeURIComponent(
        "Merhaba OğuzWeb, web sitesi projem hakkında bilgi almak istiyorum."
      ),
      waClosing: encodeURIComponent(
        "Merhaba OğuzWeb, işletmem için web sitesi yaptırmak istiyorum. " +
        "Kısaca ne yapmak istediğimi anlatayım:"
      ),
      waContact: encodeURIComponent(
        "Merhaba OğuzWeb, projem hakkında konuşmak istiyorum. " +
        "İşletme adı ve sektörüm:"
      ),

      ...meta,
    };

    let html = await resolveIncludes(raw);
    const { out, missing } = applyVars(html, vars);
    html = out;
    if (missing.length) {
      log.warn(`${rel}: tanımsız değişken → ${missing.join(", ")}`);
    }
    if (minify) html = minifyHtml(html);

    const dst = path.join(DIST, rel);
    await fs.mkdir(path.dirname(dst), { recursive: true });
    await fs.writeFile(dst, html, "utf8");
    pageSizes.push([rel, Buffer.byteLength(html)]);
  }
  for (const [rel, size] of pageSizes) log.ok(`${rel} — ${kb(size)}`);
  if (!pages.length) log.warn("sayfa yok");

  /* ---- Varlıklar ---- */
  log.step("5 · Varlıklar");
  const fonts = await copyDir(path.join(SRC, "fonts"), path.join(DIST, "fonts"));
  const images = await copyDir(path.join(SRC, "images"), path.join(DIST, "images"));
  const statics = await copyDir(path.join(SRC, "static"), DIST);
  log.ok(`font: ${fonts} · görsel: ${images} · statik: ${statics}`);
  if (fonts === 0) {
    log.info("harici font yok — güvenilir sistem fontları kullanılıyor");
  }

  /* ---- Bütçe ---- */
  /* ---- Küçültme sonrası geçerlilik guard'ı ----
     Bu kontrol bir kez gerçek bir hatayı yakaladı: minifier clamp() içindeki
     `+` operatörünün boşluklarını siliyordu ve tüm tip skalası sessizce
     çöküyordu. Sessiz hata, gürültülü hatadan tehlikelidir. */
  log.step("6 · CSS geçerlilik guard'ı");
  const cssGuards = [
    [/(\d(?:\.\d+)?(?:rem|em|px|vw|vh|%|ch))\+/g, "calc/clamp: `+` öncesi boşluk kaybolmuş"],
    [/\+(\d(?:\.\d+)?(?:rem|em|px|vw|vh|%|ch))/g, "calc/clamp: `+` sonrası boşluk kaybolmuş"],
    [/(\d(?:rem|em|px|vw|vh|%))-(\d)/g, "calc/clamp: `-` çevresinde boşluk kaybolmuş"],
  ];
  let guardFail = 0;
  for (const [re, message] of cssGuards) {
    re.lastIndex = 0;
    const hit = re.exec(css);
    if (hit) {
      guardFail++;
      log.fail(`${message} → "${hit[0]}"`);
    }
  }
  if (guardFail) {
    throw new Error("CSS küçültme geçersiz çıktı üretti — build durduruldu");
  }
  log.ok("calc/clamp operatör boşlukları korunmuş");

  log.step("7 · Bütçe denetimi");

  /* Sözleşme GZIP üzerinedir (PHASE 08 §7). Ham KB yalnızca bir vekil ölçüydü
     ve gerçek transfer maliyetini yansıtmıyor: yorum ve boşluk ham boyutu
     şişirir ama neredeyse sıfır bayta sıkışır. Ölçülen şey, kullanıcının
     gerçekten indirdiği şey olmalı. */
  let over = 0;
  const gz = (buf) => gzipSync(buf, { level: 9 }).length;
  const cssGz = gz(Buffer.from(css, "utf8"));
  const jsGz = jsBodies.length ? gz(Buffer.concat(jsBodies)) : 0;
  const gzipChecks = [
    ["css (gzip)", cssGz, 7 * 1024],
    ["js (gzip)", jsGz, 4 * 1024],
  ];
  for (const [name, size, limit] of gzipChecks) {
    const ok = size <= limit;
    const line = `${name}: ${kb(size)} / ${kb(limit)}`;
    ok ? log.ok(line) : log.fail(line);
    if (!ok) over++;
  }

  const checks = [
    ["css/main.css", cssSize],
    ["js (toplam)", jsTotal],
    ...pageSizes.map(([rel, size]) => [`html (sayfa başına)`, size, rel]),
  ];
  const seenLabel = new Set();
  for (const [label, size, note] of checks) {
    const limit = BUDGET_BYTES[label];
    if (!limit) continue;
    const key = `${label}${note || ""}`;
    if (seenLabel.has(key)) continue;
    seenLabel.add(key);
    const name = note ? `${label} · ${note}` : label;
    if (size > limit) {
      over++;
      log.fail(`${name}: ${kb(size)} / ${kb(limit)} — AŞILDI`);
    } else {
      log.ok(`${name}: ${kb(size)} / ${kb(limit)}`);
    }
  }

  const ms = Date.now() - started;
  log.step(over ? `Tamamlandı (${ms}ms) — ${over} bütçe aşımı` : `Tamamlandı (${ms}ms)`);
  if (over) process.exitCode = 1;
}

/* -------------------------------------------------------------------- CLI */

const args = new Set(process.argv.slice(2));

if (args.has("--watch")) {
  const { watch } = await import("node:fs");
  await build({ minify: false });
  console.log("\nİzleniyor… (Ctrl+C ile çıkın)");
  let timer = null;
  watch(SRC, { recursive: true }, () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      build({ minify: false }).catch((e) => log.fail(e.message));
    }, 120);
  });
} else {
  await build({ minify: !args.has("--no-minify") }).catch((e) => {
    log.fail(e.message);
    process.exit(1);
  });
}
