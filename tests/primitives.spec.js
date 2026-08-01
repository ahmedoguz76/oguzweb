/**
 * OğuzWeb — primitive bileşen testleri (Aşama 3)
 * ----------------------------------------------------------------------------
 * Ölçülen şeyler:
 *   · dokunma hedefi >= 44px (her boyut, her genişlik)
 *   · odak halkası GÖRÜNÜR ve kontrastı >= 3:1
 *   · katman sırası çalışıyor (buton alt çizgisi yok)
 *   · ikonlar erişilebilir (aria-hidden + boyut)
 *   · görsel oranları tam, yuvarlatma/gölge yok
 *   · yatay taşma ve konsol temizliği
 *
 * Kontrast göz kararıyla değil hesaplanarak doğrulanır: WCAG relative
 * luminance formülü tarayıcı içinde çalıştırılır.
 */

import { test, expect } from "playwright/test";

const WIDTHS = [1440, 1024, 768, 390, 360];
const PAGE = "/_dev-primitives";

/* WCAG 2.x kontrast oranı — tarayıcı içinde çalıştırılır */
const CONTRAST_FN = `
  (a, b) => {
    const lin = (c) => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    };
    const lum = (rgb) =>
      0.2126 * lin(rgb[0]) + 0.7152 * lin(rgb[1]) + 0.0722 * lin(rgb[2]);
    const L1 = lum(a), L2 = lum(b);
    return (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
  }
`;

async function open(page, width) {
  const consoleErrors = [];
  const broken = [];
  page.on("console", (m) => {
    if (m.type() !== "error" && m.type() !== "warning") return;
    if (/Failed to load resource/i.test(m.text())) return;
    consoleErrors.push(`${m.type()}: ${m.text()}`);
  });
  page.on("pageerror", (e) => consoleErrors.push(`pageerror: ${e.message}`));
  page.on("response", (r) => {
    if (r.status() >= 400 && !/\.woff2$/.test(r.url())) {
      broken.push(`${r.status()} ${new URL(r.url()).pathname}`);
    }
  });
  await page.setViewportSize({ width, height: 900 });
  await page.goto(PAGE, { waitUntil: "networkidle" });
  return { consoleErrors, broken };
}

for (const width of WIDTHS) {
  test.describe(`${width}px`, () => {

    test("yatay taşma yok, konsol temiz", async ({ page }) => {
      const { consoleErrors, broken } = await open(page, width);

      const doc = await page.evaluate(() => ({
        s: document.documentElement.scrollWidth,
        c: document.documentElement.clientWidth,
      }));
      expect(doc.s, `belge ${doc.s}px > viewport ${doc.c}px`)
        .toBeLessThanOrEqual(doc.c);

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
          if (!r.width && !r.height) continue;
          if ((r.right > vw + 1 || r.left < -1) && !inContained(el)) {
            out.push(`<${el.tagName.toLowerCase()} class="${el.className}">`);
          }
        }
        return out.slice(0, 5);
      });
      expect(offenders, "\n" + offenders.join("\n")).toEqual([]);
      expect(consoleErrors, "\n" + consoleErrors.join("\n")).toEqual([]);
      expect(broken, "\n" + broken.join("\n")).toEqual([]);
    });

    test("dokunma hedefi ≥ 44px", async ({ page }) => {
      await open(page, width);
      const small = await page.evaluate(() => {
        const out = [];
        const targets = document.querySelectorAll(
          ".c-button, .c-link--nav, .c-link--bridge"
        );
        for (const el of targets) {
          const r = el.getBoundingClientRect();
          if (r.height < 44) {
            out.push(`${el.className} → ${Math.round(r.height)}px`);
          }
        }
        return out;
      });
      expect(small, "\n" + small.join("\n")).toEqual([]);
    });

    test("buton yükseklikleri sistem değerlerinde", async ({ page }) => {
      await open(page, width);
      const heights = await page.evaluate(() => {
        const h = (sel) =>
          Math.round(document.querySelector(sel).getBoundingClientRect().height);
        return {
          sm: h('[data-size="sm"]'),
          md: h('[data-size="md"]'),
          lg: h('[data-size="lg"]'),
        };
      });
      expect(heights).toEqual({ sm: 44, md: 48, lg: 56 });
    });

    test("katman sırası çalışıyor · butonda alt çizgi yok", async ({ page }) => {
      await open(page, width);
      /* base katmanı `a` öğesine underline verir. Bağlantı olarak
         işaretlenmiş bir buton (tertiary hariç) alt çizgi taşımamalı —
         components katmanı base'i geçmeli. */
      const decoration = await page.evaluate(() => {
        const el = document.querySelector('[data-btn="primary"]');
        return getComputedStyle(el).textDecorationLine;
      });
      expect(decoration).toBe("none");
    });

    test("odak halkası görünür ve kontrastlı", async ({ page }) => {
      await open(page, width);

      for (const sel of ['[data-focus="primary"]', '[data-focus="secondary"]', '[data-focus="link"]']) {
        await page.focus(sel);

        const ring = await page.evaluate((s) => {
          const el = document.querySelector(s);
          const cs = getComputedStyle(el);
          const parse = (c) =>
            c.match(/\d+/g).slice(0, 3).map(Number);
          return {
            width: parseFloat(cs.outlineWidth),
            style: cs.outlineStyle,
            color: parse(cs.outlineColor),
            offset: parseFloat(cs.outlineOffset),
            pageBg: parse(getComputedStyle(document.body).backgroundColor),
          };
        }, sel);

        expect(ring.style, `${sel} · outline-style`).not.toBe("none");
        expect(ring.width, `${sel} · outline-width`).toBeGreaterThanOrEqual(2);
        expect(ring.offset, `${sel} · outline-offset`).toBeGreaterThanOrEqual(2);

        /* Halka offset nedeniyle sayfa zemininin üstüne düşer.
           Kontrast oranı >= 3:1 olmalı (WCAG 2.2 · arayüz bileşeni). */
        const ratio = await page.evaluate(
          ([fn, a, b]) => eval(fn)(a, b),
          [CONTRAST_FN, ring.color, ring.pageBg]
        );
        expect(ratio, `${sel} · halka kontrastı ${ratio.toFixed(2)}:1`)
          .toBeGreaterThanOrEqual(3);
      }
    });

    test("ikonlar erişilebilir ve doğru boyutta", async ({ page }) => {
      await open(page, width);
      const icons = await page.evaluate(() => {
        const out = { missingHidden: [], wrongSize: [], count: 0 };
        for (const el of document.querySelectorAll(".c-icon")) {
          out.count++;
          const labelled =
            el.getAttribute("aria-hidden") === "true" ||
            el.getAttribute("role") === "img" ||
            el.querySelector("title");
          if (!labelled) out.missingHidden.push(el.outerHTML.slice(0, 60));

          const r = el.getBoundingClientRect();
          const expected = el.classList.contains("c-icon--sm") ? 20 : 24;
          if (Math.round(r.width) !== expected) {
            out.wrongSize.push(`${Math.round(r.width)}px ≠ ${expected}px`);
          }
        }
        return out;
      });
      expect(icons.count, "ikon bulunamadı").toBeGreaterThan(0);
      expect(icons.missingHidden, "\n" + icons.missingHidden.join("\n")).toEqual([]);
      expect(icons.wrongSize, "\n" + icons.wrongSize.join("\n")).toEqual([]);
    });

    test("görsel oranları tam", async ({ page }) => {
      await open(page, width);
      const ratios = await page.evaluate(() => {
        const out = {};
        for (const [key, expected] of [["16-10", 16 / 10], ["4-5", 4 / 5], ["3-2", 3 / 2]]) {
          const media = document
            .querySelector(`[data-img="${key}"] .c-image__media`)
            .getBoundingClientRect();
          out[key] = {
            measured: +(media.width / media.height).toFixed(3),
            expected: +expected.toFixed(3),
          };
        }
        return out;
      });
      for (const [key, v] of Object.entries(ratios)) {
        expect(Math.abs(v.measured - v.expected), `${key} · ${v.measured}`)
          .toBeLessThan(0.02);
      }
    });

    test("görsellerde yuvarlatma ve gölge yok", async ({ page }) => {
      await open(page, width);
      const bad = await page.evaluate(() => {
        const out = [];
        for (const el of document.querySelectorAll(".c-image, .c-image__media, .c-image img")) {
          const cs = getComputedStyle(el);
          if (parseFloat(cs.borderTopLeftRadius) > 0) out.push(`radius: ${el.className}`);
          if (cs.boxShadow !== "none") out.push(`shadow: ${el.className}`);
        }
        return out;
      });
      expect(bad, "\n" + bad.join("\n")).toEqual([]);
    });

    test("atlama bağlantısı odakla görünür olur", async ({ page }) => {
      await open(page, width);
      const before = await page.evaluate(() => {
        const el = document.querySelector(".c-link--skip");
        return el.getBoundingClientRect().top;
      });
      await page.keyboard.press("Tab");
      const after = await page.evaluate(() => {
        const el = document.querySelector(".c-link--skip");
        return {
          top: el.getBoundingClientRect().top,
          focused: document.activeElement === el,
        };
      });
      expect(after.focused, "ilk Tab atlama bağlantısına gitmeli").toBe(true);
      expect(after.top, "odaklanınca görünür alana girmeli").toBeGreaterThan(before);
    });
  });
}
