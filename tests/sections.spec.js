/**
 * OğuzWeb — bölüm testleri (İterasyon 2)
 * ----------------------------------------------------------------------------
 * Kapsam: kitle satırları · karşıtlık · süreç · kapsam · taahhütler · kapanış CTA
 *
 * Ölçülen şeyler semantik ve yapısal: görsel doğrulama insan işidir, ama
 * "sıralı liste gerçekten <ol> mü", "başlık seviyesi atlanmış mı",
 * "görünür alanda kaç birincil buton var" makine işidir.
 */

import { test, expect } from "playwright/test";

const PAGE = "/";
const WIDTHS = [1440, 1280, 1024, 768, 430, 390, 360];

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
  test(`${width}px · taşma yok, konsol temiz`, async ({ page }) => {
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
      /* K3 · Kaydırma/kırpma kabı içindeki öğeler meşrudur — bkz. aşağıdaki
         aynı adlı yardımcı. Sayfada yatay kaydırma üretmezler. */
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

  test(`${width}px · dokunma hedefleri`, async ({ page }) => {
    await open(page, width);
    const small = await page.evaluate(() =>
      [...document.querySelectorAll("main a, main button")]
        .filter((el) => el.getBoundingClientRect().height < 44)
        .map((el) => `${el.tagName.toLowerCase()}.${el.className}`)
    );
    expect(small, "\n" + small.join("\n")).toEqual([]);
  });
}

test("semantik yapı doğru", async ({ page }) => {
  await open(page, 1440);
  const s = await page.evaluate(() => ({
    /* Süreç sıralı liste olmalı: numaralar dekoratif metin değil, sıra
       bilgisidir — ekran okuyucu "4 öğeden 1'i" demeli. */
    processTag: document.querySelector(".c-process").tagName,
    processItems: document.querySelectorAll(".c-process > li").length,
    /* Kitle bölümü tanım listesi: sektör terim, problem tanımdır. */
    audienceTag: document.querySelector(".c-audience").tagName,
    terms: document.querySelectorAll(".c-audience dt").length,
    defs: document.querySelectorAll(".c-audience dd").length,
    /* Her bölüm başlığıyla ilişkilendirilmiş olmalı */
    labelled: [...document.querySelectorAll("main section")]
      .every((el) => el.hasAttribute("aria-labelledby")),
  }));

  expect(s.processTag).toBe("OL");
  expect(s.processItems).toBe(4);
  expect(s.audienceTag).toBe("DL");
  expect(s.terms).toBe(4);
  expect(s.defs).toBe(4);
  expect(s.labelled, "her section aria-labelledby taşımalı").toBe(true);
});

test("başlık hiyerarşisi seviye atlamıyor", async ({ page }) => {
  await open(page, 1440);
  const levels = await page.evaluate(() =>
    [...document.querySelectorAll("main h1, main h2, main h3, main h4")]
      .map((el) => Number(el.tagName[1]))
  );
  for (let i = 1; i < levels.length; i++) {
    expect(
      levels[i] - levels[i - 1],
      `h${levels[i - 1]} → h${levels[i]} seviye atlandı`
    ).toBeLessThanOrEqual(1);
  }
});

test("A2 ekseni yalnızca ≥1280px'te kayar", async ({ page }) => {
  for (const width of [1440, 1280, 1024, 768]) {
    await open(page, width);
    const { a1, a2 } = await page.evaluate(() => ({
      a1: Math.round(
        document.querySelector(".c-audience").getBoundingClientRect().left
      ),
      a2: Math.round(
        document.querySelector(".c-contrast").getBoundingClientRect().left
      ),
    }));
    if (width >= 1280) {
      expect(a2, `${width}px · A2 sağa kaymalı`).toBeGreaterThan(a1);
    } else {
      expect(a2, `${width}px · A2, A1'e düşmeli`).toBe(a1);
    }
  }
});

test("görünür alanda tek birincil buton", async ({ page }) => {
  await open(page, 1440);
  /* Kural GÖRÜNÜR ALAN başınadır, sayfa toplamı değil.
     PHASE 04 CTA haritası sayfa boyunca birden fazla birincil çağrıya izin
     verir (açılış, SSS sonu, kapanış) — yasak olan, aynı ekranda iki dolu
     butonun yarışmasıdır. Bu test önceki sürümde `main` içindeki tüm dolu
     butonları sayıyordu; adıyla ölçtüğü şey uyuşmuyordu.

     Sayfa ekran ekran taranır ve aynı anda kaç birincil butonun görünür
     olduğu ölçülür. */
  const worst = await page.evaluate(() => {
    const buttons = [...document.querySelectorAll("main .c-button--primary")];
    const vh = window.innerHeight;
    let max = 0;
    for (let y = 0; y < document.body.scrollHeight; y += vh / 2) {
      const visible = buttons.filter((b) => {
        const r = b.getBoundingClientRect();
        const top = r.top + window.scrollY;
        return top + r.height > y && top < y + vh;
      }).length;
      max = Math.max(max, visible);
    }
    return max;
  });
  expect(worst, "aynı ekranda birden fazla birincil buton yarışıyor")
    .toBeLessThanOrEqual(1);
});

test("kapanış CTA'sı ortalanmamış", async ({ page }) => {
  await open(page, 1440);
  const aligned = await page.evaluate(() => {
    const cta = document.querySelector(".c-cta");
    const audience = document.querySelector(".c-audience");
    return {
      ctaLeft: Math.round(cta.getBoundingClientRect().left),
      bodyLeft: Math.round(audience.getBoundingClientRect().left),
      textAlign: getComputedStyle(cta).textAlign,
    };
  });
  expect(aligned.ctaLeft, "kapanış ana eksende olmalı").toBe(aligned.bodyLeft);
  expect(aligned.textAlign).not.toBe("center");
});

test("kapanış bölümü sayfanın en büyük boşluğuna sahip", async ({ page }) => {
  await open(page, 1440);
  const pad = await page.evaluate(() => {
    const closing = document.querySelector(".l-section--closing");
    const normal = document.querySelector(".l-section:not(.l-section--closing)");
    return {
      closingTop: parseFloat(getComputedStyle(closing).paddingBlockStart),
      normalBottom: parseFloat(getComputedStyle(normal).paddingBlockEnd),
    };
  });
  expect(pad.closingTop).toBeGreaterThan(pad.normalBottom);
});

test("fiyat güvencesi metni bulunuyor", async ({ page }) => {
  await open(page, 1440);
  /* Fiyat gösterilmeyen bir sitede bu satır en yüksek dönüşüm etkili
     metindir. Kopya değişebilir; varlığı değişmemeli. */
  const text = await page.textContent(".c-cta__assurance");
  expect(text?.toLowerCase()).toContain("fiyat");
});

test("yasak pazarlama dili yok", async ({ page }) => {
  await open(page, 1440);
  const body = (await page.textContent("main"))?.toLowerCase() ?? "";
  const forbidden = [
    "uygun fiyat", "ekonomik", "bütçe dostu", "hemen başla",
    "ücretsiz danışmanlık", "%100 memnuniyet", "7/24",
    "hayallerinizdeki", "son 3", "kontenjan",
  ];
  const found = forbidden.filter((w) => body.includes(w));
  expect(found, "\n" + found.join("\n")).toEqual([]);
});

test("oran kuralı bölümlerde korunuyor", async ({ page }) => {
  for (const width of WIDTHS) {
    await open(page, width);
    const { section, inner } = await page.evaluate(() => {
      const root = document.documentElement;
      const rootPx = parseFloat(getComputedStyle(root).fontSize);
      const cs = getComputedStyle(root);
      const toPx = (raw) => {
        const v = raw.trim();
        return v.endsWith("rem") ? parseFloat(v) * rootPx : parseFloat(v);
      };
      return {
        section: toPx(cs.getPropertyValue("--space-section")),
        inner: toPx(cs.getPropertyValue("--space-section-inner-max")),
      };
    });
    expect(section / inner, `${width}px`).toBeGreaterThanOrEqual(2.5);
  }
});

/* ============================================================ ek denetimler
   (İterasyon 2 · birleştirilen kapsam) */

test.describe("ek denetimler", () => {
  for (const width of WIDTHS) {
    test(`${width}px · yatay taşma yok`, async ({ page }) => {
      await open(page, width);
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
    });
  }

  test("her bölüm erişilebilir isme sahip", async ({ page }) => {
    await open(page, 1280);
    const unnamed = await page.evaluate(() =>
      [...document.querySelectorAll("main section")]
        .filter((s) => !s.getAttribute("aria-labelledby") && !s.getAttribute("aria-label"))
        .map((s) => s.className)
    );
    expect(unnamed, "\n" + unnamed.join("\n")).toEqual([]);
  });

  test("süreç anlamsal sıralı liste, numaralar ekran okuyucudan gizli", async ({ page }) => {
    await open(page, 1280);
    const info = await page.evaluate(() => {
      const list = document.querySelector(".c-process");
      return {
        tag: list?.tagName,
        steps: list?.querySelectorAll("li").length,
        numbersHidden: [...(list?.querySelectorAll(".c-process__num") ?? [])]
          .every((n) => n.getAttribute("aria-hidden") === "true"),
      };
    });
    expect(info.tag).toBe("OL");
    expect(info.steps).toBe(4);
    expect(info.numbersHidden, "görsel numaralar aria-hidden olmalı").toBe(true);
  });

  test("içerik bölümlerinde dekoratif ikon yok", async ({ page }) => {
    await open(page, 1280);
    /* İkona izin verilen tek yer: eylem ve yön (buton, köprü bağlantısı). */
    const stray = await page.evaluate(() =>
      [...document.querySelectorAll("main .c-icon")]
        .filter((i) => !i.closest(".c-button, .c-link--bridge"))
        .map((i) => i.parentElement?.className ?? "?")
    );
    expect(stray, "\n" + stray.join("\n")).toEqual([]);
  });

  test("karşıtlıkta kazanan taraf ikinci sırada", async ({ page }) => {
    await open(page, 1280);
    const order = await page.evaluate(() =>
      [...document.querySelectorAll(".c-contrast__col")].map((c) =>
        c.classList.contains("c-contrast__col--primary") ? "primary" : "muted"
      )
    );
    /* Karşılaştırma olumlu tarafta bitmelidir; ters sıra ziyaretçiyi
       olumsuz bir notla bırakır. */
    expect(order).toEqual(["muted", "primary"]);
  });

  test("kapsam dışı hizmetler açıkça belirtiliyor", async ({ page }) => {
    await open(page, 1280);
    const text = await page.evaluate(
      () => document.querySelector(".c-scope__excluded")?.innerText ?? ""
    );
    expect(text.length, "kapsam dışı bloğu yok").toBeGreaterThan(20);
  });

  test("sayfada rakamlı fiyat sızıntısı yok", async ({ page }) => {
    await open(page, 1280);
    const text = await page.evaluate(() => document.body.innerText.toLowerCase());
    expect(/\d[\d.]*\s*(tl|₺)/.test(text), "sayfada fiyat görünüyor").toBe(false);
    /* Fiyatın yerini süre ve kapsam tutmalı */
    expect(text).toContain("hafta");
    expect(text).toContain("her projede ne var");
  });
});
