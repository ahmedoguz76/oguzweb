/**
 * OğuzWeb — düzen doğrulama testi (Aşama 2)
 * ----------------------------------------------------------------------------
 * Kabul kriteri: 1440 / 1280 / 1024 / 768 / 430 / 390 / 360px genişliklerde
 * SIFIR yatay taşma, SIFIR konsol hatası, SIFIR kırık kaynak.
 *
 * Şerit indirgeme tablosu ve oran kuralı GÖZ KARARIYLA değil ÖLÇÜLEREK
 * doğrulanır — sayı ya tutar ya tutmaz.
 *
 * Font dosyaları ayrı ele alınır: depoya dahil edilmedikleri için
 * (`npm run fonts` ile indirilir) yokluklarında test kırmızıya boyanmaz,
 * ama SESSİZ de geçilmez — açık bir uyarı basılır. Sessiz muafiyet,
 * kapatılmış testtir.
 *
 * Kullanım:
 *   npx playwright test
 */

import { test, expect } from "playwright/test";

const WIDTHS = [1440, 1280, 1024, 768, 430, 390, 360];
const PAGES = ["/", "/_dev-layout", "/_dev-tokens"];

/* PHASE 07 §0 · beklenen şerit sütun sayıları */
const EXPECTED_SPANS = {
  1440: { reading: 6, standard: 8, wide: 10, full: 12 },
  1280: { reading: 6, standard: 8, wide: 10, full: 12 },
  1024: { reading: 8, standard: 10, wide: 12, full: 12 },
  768:  { reading: 10, standard: 12, wide: 12, full: 12 },
  430:  { reading: 12, standard: 12, wide: 12, full: 12 },
  390:  { reading: 12, standard: 12, wide: 12, full: 12 },
  360:  { reading: 12, standard: 12, wide: 12, full: 12 },
};

/* PHASE 07 §0 · beklenen duyarlı token değerleri (px) */
const EXPECTED_TOKENS = {
  1440: { pad: 80, gutter: 32, section: 160, inner: 64 },
  1280: { pad: 80, gutter: 32, section: 160, inner: 64 },
  1024: { pad: 64, gutter: 32, section: 128, inner: 48 },
  768:  { pad: 40, gutter: 24, section: 96, inner: 32 },
  430:  { pad: 24, gutter: 16, section: 80, inner: 32 },
  390:  { pad: 20, gutter: 16, section: 80, inner: 32 },
  360:  { pad: 20, gutter: 16, section: 80, inner: 32 },
};

/* Aşama 1'de bilinçli olarak eksik bırakılan kaynaklar.
   Aşama 11 kontrol listesinde kapatılacak. */
const KNOWN_ABSENT = [/\.woff2$/];

const isKnownAbsent = (url) => KNOWN_ABSENT.some((re) => re.test(url));

/**
 * Sayfayı açar; konsol hatalarını ve kırık kaynakları toplar.
 * Kaynak takibi URL bazlıdır: "Failed to load resource" mesajı hangi
 * dosyanın kırıldığını söylemez, response olayı söyler.
 */
async function open(page, url, width) {
  const consoleErrors = [];
  const broken = [];
  const absent = [];

  page.on("console", (msg) => {
    const type = msg.type();
    if (type !== "error" && type !== "warning") return;
    /* Kaynak hataları response olayında zaten yakalanıyor — çift raporlama yok */
    if (/Failed to load resource/i.test(msg.text())) return;
    consoleErrors.push(`${type}: ${msg.text()}`);
  });
  page.on("pageerror", (err) => consoleErrors.push(`pageerror: ${err.message}`));
  page.on("response", (res) => {
    if (res.status() < 400) return;
    const u = new URL(res.url()).pathname;
    (isKnownAbsent(u) ? absent : broken).push(`${res.status()} ${u}`);
  });

  await page.setViewportSize({ width, height: 900 });
  await page.goto(url, { waitUntil: "networkidle" });

  return { consoleErrors, broken, absent };
}

/* rem cinsinden gelen token değerlerini px'e çevirir.
   getPropertyValue custom property'nin HAM değerini döndürür — hesaplanmış
   px değil. Bu ayrım, testin ilk sürümünde 28 yanlış başarısızlık üretti. */
async function tokensInPx(page) {
  return page.evaluate(() => {
    const root = document.documentElement;
    const rootPx = parseFloat(getComputedStyle(root).fontSize);
    const cs = getComputedStyle(root);
    const toPx = (raw) => {
      const v = raw.trim();
      if (v.endsWith("rem")) return parseFloat(v) * rootPx;
      if (v.endsWith("px")) return parseFloat(v);
      return NaN;
    };
    return {
      pad: toPx(cs.getPropertyValue("--container-pad")),
      gutter: toPx(cs.getPropertyValue("--grid-gutter")),
      section: toPx(cs.getPropertyValue("--space-section")),
      inner: toPx(cs.getPropertyValue("--space-section-inner-max")),
    };
  });
}

for (const width of WIDTHS) {
  test.describe(`${width}px`, () => {

    for (const url of PAGES) {
      test(`${url} · yatay taşma yok`, async ({ page }) => {
        await open(page, url, width);

        const doc = await page.evaluate(() => ({
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
        }));
        expect(
          doc.scrollWidth,
          `belge ${doc.scrollWidth}px > viewport ${doc.clientWidth}px`
        ).toBeLessThanOrEqual(doc.clientWidth);

        const offenders = await page.evaluate(() => {
          const out = [];
          const vw = document.documentElement.clientWidth;
          /* K3 · Kaydırma/kırpma kabı içindeki öğeler MEŞRUDUR.
             `overflow-x: auto` olan bir raf (case study mobil ekran görüntüleri)
             ya da `overflow: hidden` olan bir kap (hero görseli) içindeki öğe,
             viewport'un dışına taşan bir kutu geometrisine sahip olabilir ama
             sayfada yatay kaydırma ÜRETMEZ. Bu kontrol onları dışlamazsa
             gerçek bir hata yokken kırmızı yanar — ve sürekli yanlış alarm
             veren test, kapatılan testtir. */
          const inContained = (node) => {
            let n = node.parentElement;
            while (n && n !== document.body) {
              const ox = getComputedStyle(n).overflowX;
              if (ox === "auto" || ox === "scroll" || ox === "hidden" || ox === "clip") return true;
              n = n.parentElement;
            }
            return false;
          };

          for (const el of document.querySelectorAll("body *")) {
            const r = el.getBoundingClientRect();
            if (r.width === 0 && r.height === 0) continue;
            if ((r.right > vw + 1 || r.left < -1) && !inContained(el)) {
              out.push(
                `<${el.tagName.toLowerCase()} class="${el.className}"> ` +
                `left ${Math.round(r.left)} right ${Math.round(r.right)}`
              );
            }
          }
          return out.slice(0, 5);
        });
        expect(offenders, "\n" + offenders.join("\n")).toEqual([]);
      });

      test(`${url} · konsol temiz, kaynak kırık değil`, async ({ page }) => {
        const { consoleErrors, broken, absent } = await open(page, url, width);

        if (absent.length) {
          console.warn(
            `      ⚠ ${url} @${width}px — bilinçli eksik kaynak: ` +
            `${absent.length} font dosyası (npm run fonts)`
          );
        }

        expect(consoleErrors, "\n" + consoleErrors.join("\n")).toEqual([]);
        expect(broken, "\n" + broken.join("\n")).toEqual([]);
      });
    }

    test("duyarlı token değerleri", async ({ page }) => {
      await open(page, "/_dev-layout", width);
      expect(await tokensInPx(page)).toEqual(EXPECTED_TOKENS[width]);
    });

    test("oran kuralı ≥ 2.5", async ({ page }) => {
      await open(page, "/_dev-layout", width);
      const { section, inner } = await tokensInPx(page);
      expect(
        section / inner,
        `${section} / ${inner} = ${(section / inner).toFixed(2)} — kural 2.5`
      ).toBeGreaterThanOrEqual(2.5);
    });

    test("şerit indirgeme tablosu", async ({ page }) => {
      await open(page, "/_dev-layout", width);

      const measured = await page.evaluate(() => {
        const grid = document.querySelector(".l-grid");
        const cs = getComputedStyle(grid);
        const colW = parseFloat(cs.gridTemplateColumns.split(" ")[0]);
        const gap = parseFloat(cs.columnGap);
        const spanOf = (name) => {
          const w = document
            .querySelector(`[data-lane="${name}"]`)
            .getBoundingClientRect().width;
          /* w = n·colW + (n−1)·gap  →  n = (w + gap) / (colW + gap) */
          return Math.round((w + gap) / (colW + gap));
        };
        return {
          reading: spanOf("reading"),
          standard: spanOf("standard"),
          wide: spanOf("wide"),
          full: spanOf("full"),
        };
      });

      expect(measured).toEqual(EXPECTED_SPANS[width]);
    });

    test("A2 ekseni yalnızca ≥1280px", async ({ page }) => {
      await open(page, "/_dev-layout", width);

      const { a1, a2 } = await page.evaluate(() => ({
        a1: Math.round(
          document.querySelector('[data-lane="standard"]').getBoundingClientRect().left
        ),
        a2: Math.round(
          document.querySelector('[data-lane="a2-standard"]').getBoundingClientRect().left
        ),
      }));

      if (width >= 1280) {
        expect(a2, "A2 sağa kaymalı").toBeGreaterThan(a1);
      } else {
        expect(a2, "A2, A1'e düşmeli").toBe(a1);
      }
    });
  });
}
