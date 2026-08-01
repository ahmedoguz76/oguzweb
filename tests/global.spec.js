/**
 * OğuzWeb — global bileşen testleri (Aşama 4)
 * ----------------------------------------------------------------------------
 * Ölçülen şeyler:
 *   · header yükseklikleri ve kaydırma davranışı
 *   · hareket azaltma açıkken header'ın HİÇ gizlenmemesi
 *   · mobil menü: odak taşınması, geri dönmesi, tüm kapanış yolları
 *   · kaydırma kilidinin her koşulda temizlenmesi
 *   · odak tuzağının döngüsü
 *   · DOM sırası = görsel sıra
 *   · pozitif tabindex yokluğu
 *   · JS KAPALIYKEN navigasyonun erişilebilir kalması
 */

import { test, expect } from "playwright/test";

/**
 * Kaydırma yardımcısı.
 * `scroll-behavior: smooth` etkin olduğu için `window.scrollTo(0, y)`
 * ANİMASYONLU kaydırır: 120ms sonra sayfa henüz hedefe varmamış olur ve
 * test, header mantığını değil animasyon hızını ölçer. İlk sürümde iki test
 * tam olarak bu yüzden yanlış kırmızı verdi.
 *
 * `behavior: "instant"` animasyonu atlar; test yalnızca header mantığını
 * ölçer. Yumuşak kaydırmanın kendisi ayrı bir davranıştır ve burada
 * doğrulanmaz.
 */
async function scrollTo(page, y) {
  await page.evaluate(
    (v) => window.scrollTo({ top: v, behavior: "instant" }),
    y
  );
  await page.waitForFunction(
    (v) => Math.abs(window.scrollY - v) < 2,
    y,
    { timeout: 2000 }
  );
  await page.waitForTimeout(80); /* rAF turunun tamamlanması için */
}

const PAGE = "/_dev-global";

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
  await page.setViewportSize({ width, height: 800 });
  await page.goto(PAGE, { waitUntil: "networkidle" });

  /* Yumuşak kaydırma testte belirsizlik üretir: scrollTo(600) çağrıldıktan
     120ms sonra sayfa gerçekte 513px'te olabilir ve yön okuması kararsız
     kalır. Bu, testi zamanlama şansına bağlar. Test ortamında anlık
     kaydırmaya geçilir — ölçülen davranış aynı, belirsizlik yok. */
  await page.addStyleTag({ content: "html { scroll-behavior: auto !important }" });

  return { consoleErrors, broken };
}

/**
 * Belirli bir Y konumuna kaydırır ve GERÇEKTEN oraya varılmasını bekler.
 * Ardından bir kare bekler ki rAF ile sınırlandırılmış kaydırma işleyicisi
 * çalışmış olsun.
 */
async function scrollToY(page, y) {
  await page.evaluate((target) => window.scrollTo(0, target), y);
  await page.waitForFunction(
    (target) => Math.abs(window.scrollY - target) <= 1,
    y,
    { timeout: 2000 }
  );
  await page.evaluate(
    () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
  );
}

/* ============================================================ yapı */

test.describe("yapı", () => {
  for (const width of [1440, 1280, 1024, 768, 430, 390, 360]) {
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

    test(`${width}px · pozitif tabindex yok`, async ({ page }) => {
      await open(page, width);
      const positive = await page.evaluate(() =>
        [...document.querySelectorAll("[tabindex]")]
          .filter((el) => Number(el.getAttribute("tabindex")) > 0)
          .map((el) => `${el.tagName.toLowerCase()}.${el.className}`)
      );
      expect(positive, "\n" + positive.join("\n")).toEqual([]);
    });
  }

  test("header yükseklikleri sistem değerlerinde", async ({ page }) => {
    for (const [width, expected] of [[1440, 72], [768, 72], [430, 64], [360, 64]]) {
      await open(page, width);
      const h = await page.evaluate(() =>
        Math.round(
          document.querySelector(".c-header__inner").getBoundingClientRect().height
        )
      );
      expect(h, `${width}px`).toBe(expected);
    }
  });

  test("DOM sırası = görsel sıra (masaüstü)", async ({ page }) => {
    await open(page, 1440);
    const order = await page.evaluate(() => {
      const items = [
        ".c-header__brand",
        ".c-nav",
        ".c-header__actions",
      ].map((sel) => {
        const el = document.querySelector(sel);
        return { sel, left: el.getBoundingClientRect().left };
      });
      return items;
    });
    for (let i = 1; i < order.length; i++) {
      expect(
        order[i].left,
        `${order[i].sel} DOM'da sonra ama görsel olarak önce`
      ).toBeGreaterThan(order[i - 1].left);
    }
  });

  test("atlama bağlantısı ilk odak", async ({ page }) => {
    await open(page, 1440);
    await page.keyboard.press("Tab");
    const isSkip = await page.evaluate(() =>
      document.activeElement?.classList.contains("c-link--skip")
    );
    expect(isSkip).toBe(true);
  });

  test("menü tetikleyicisi yalnızca <768px'te görünür", async ({ page }) => {
    for (const [width, visible] of [[1440, false], [768, false], [430, true], [360, true]]) {
      await open(page, width);
      const shown = await page.evaluate(() => {
        const el = document.querySelector("[data-nav-toggle]");
        return getComputedStyle(el).display !== "none";
      });
      expect(shown, `${width}px`).toBe(visible);
    }
  });
});

/* ============================================================ mobil menü */

test.describe("mobil menü · 390px", () => {
  test.beforeEach(async ({ page }) => {
    await open(page, 390);
  });

  test("açılışta odak kapatma butonuna gider", async ({ page }) => {
    await page.click("[data-nav-toggle]");
    const state = await page.evaluate(() => ({
      focused: document.activeElement?.hasAttribute("data-nav-close"),
      expanded: document
        .querySelector("[data-nav-toggle]")
        .getAttribute("aria-expanded"),
      open: document.querySelector("[data-nav-panel]").classList.contains("is-open"),
      locked: document.body.classList.contains("u-no-scroll"),
    }));
    expect(state).toEqual({
      focused: true, expanded: "true", open: true, locked: true,
    });
  });

  test("kapanışta odak tetikleyiciye döner, kilit temizlenir", async ({ page }) => {
    await page.click("[data-nav-toggle]");
    await page.click("[data-nav-close]");
    const state = await page.evaluate(() => ({
      focused: document.activeElement?.hasAttribute("data-nav-toggle"),
      expanded: document
        .querySelector("[data-nav-toggle]")
        .getAttribute("aria-expanded"),
      locked: document.body.classList.contains("u-no-scroll"),
    }));
    expect(state).toEqual({ focused: true, expanded: "false", locked: false });
  });

  test("Escape kapatır ve odağı geri verir", async ({ page }) => {
    await page.click("[data-nav-toggle]");
    await page.keyboard.press("Escape");
    const state = await page.evaluate(() => ({
      open: document.querySelector("[data-nav-panel]").classList.contains("is-open"),
      focused: document.activeElement?.hasAttribute("data-nav-toggle"),
      locked: document.body.classList.contains("u-no-scroll"),
    }));
    expect(state).toEqual({ open: false, focused: true, locked: false });
  });

  test("dış alana tıklama kapatır", async ({ page }) => {
    await page.click("[data-nav-toggle]");
    /* Panelin boş bölgesi — bar/body/footer dışı */
    await page.evaluate(() => {
      const panel = document.querySelector("[data-nav-panel]");
      panel.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    const state = await page.evaluate(() => ({
      open: document.querySelector("[data-nav-panel]").classList.contains("is-open"),
      locked: document.body.classList.contains("u-no-scroll"),
    }));
    expect(state).toEqual({ open: false, locked: false });
  });

  test("bağlantıya tıklama kapatır ve kilidi temizler", async ({ page }) => {
    await page.click("[data-nav-toggle]");
    await page.evaluate(() => {
      const link = document.querySelector(".c-nav-mobile__link");
      link.addEventListener("click", (e) => e.preventDefault(), { once: true });
      link.click();
    });
    const state = await page.evaluate(() => ({
      open: document.querySelector("[data-nav-panel]").classList.contains("is-open"),
      locked: document.body.classList.contains("u-no-scroll"),
    }));
    expect(state).toEqual({ open: false, locked: false });
  });

  test("masaüstüne geçiş kapatır ve kilidi temizler", async ({ page }) => {
    await page.click("[data-nav-toggle]");
    await page.setViewportSize({ width: 1024, height: 800 });
    await page.waitForTimeout(120);
    const state = await page.evaluate(() => ({
      open: document.querySelector("[data-nav-panel]").classList.contains("is-open"),
      locked: document.body.classList.contains("u-no-scroll"),
      expanded: document
        .querySelector("[data-nav-toggle]")
        .getAttribute("aria-expanded"),
    }));
    expect(state).toEqual({ open: false, locked: false, expanded: "false" });
  });

  test("odak tuzağı panel içinde döngü yapar", async ({ page }) => {
    await page.click("[data-nav-toggle]");

    /* Panel içindeki odaklanabilir öğe sayısı kadar Tab: başa dönmeli */
    const count = await page.evaluate(
      () =>
        document.querySelectorAll("[data-nav-panel] a, [data-nav-panel] button")
          .length
    );
    for (let i = 0; i < count + 2; i++) await page.keyboard.press("Tab");

    const inside = await page.evaluate(() =>
      document.querySelector("[data-nav-panel]").contains(document.activeElement)
    );
    expect(inside, "odak panelden kaçtı").toBe(true);
  });

  test("Shift+Tab da panelde kalır", async ({ page }) => {
    await page.click("[data-nav-toggle]");
    for (let i = 0; i < 4; i++) await page.keyboard.press("Shift+Tab");
    const inside = await page.evaluate(() =>
      document.querySelector("[data-nav-panel]").contains(document.activeElement)
    );
    expect(inside).toBe(true);
  });
});

/* ============================================================ header kaydırma */

test.describe("header kaydırma davranışı", () => {
  test("400px eşiğinden önce gizlenmez", async ({ page }) => {
    await open(page, 1280);
    await scrollTo(page, 300);
    const hidden = await page.evaluate(() =>
      document.querySelector("[data-header]").classList.contains("is-hidden")
    );
    expect(hidden).toBe(false);
  });

  test("eşikten sonra aşağıda gizlenir, yukarıda belirir", async ({ page }) => {
    await open(page, 1280);

    await scrollTo(page, 600);
    await scrollTo(page, 900);
    expect(
      await page.evaluate(() =>
        document.querySelector("[data-header]").classList.contains("is-hidden")
      ),
      "aşağı kaydırmada gizlenmeli"
    ).toBe(true);

    await scrollTo(page, 700);
    expect(
      await page.evaluate(() =>
        document.querySelector("[data-header]").classList.contains("is-hidden")
      ),
      "yukarı kaydırmada belirmeli"
    ).toBe(false);
  });

  test("kaydırınca hairline belirir", async ({ page }) => {
    await open(page, 1280);
    expect(
      await page.evaluate(() =>
        document.querySelector("[data-header]").classList.contains("is-pinned")
      )
    ).toBe(false);

    await scrollTo(page, 200);
    expect(
      await page.evaluate(() =>
        document.querySelector("[data-header]").classList.contains("is-pinned")
      )
    ).toBe(true);
  });
});

test.describe("hareket azaltma", () => {
  /**
   * `test.use({ reducedMotion })` bu Playwright sürümünde bağlama
   * uygulanmıyor — sayfa içinde matchMedia false dönüyordu ve test, ölçmek
   * istediği şeyi hiç ölçmüyordu. `page.emulateMedia()` açık ve
   * doğrulanabilir; goto'dan ÖNCE çağrılır çünkü modül hareket tercihini
   * başlatma anında okur.
   */
  test("header hiç gizlenmez", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    expect(
      await page.evaluate(() =>
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ),
      "emülasyon uygulanmadı — test geçerli değil"
    ).toBe(true);

    await open(page, 1280);
    for (const y of [600, 900, 1400]) {
      await scrollTo(page, y);
      expect(
        await page.evaluate(() =>
          document.querySelector("[data-header]").classList.contains("is-hidden")
        ),
        `scrollY ${y}`
      ).toBe(false);
    }
  });
});

/* ============================================================ JS kapalı */

test.describe("JavaScript kapalı", () => {
  test.use({ javaScriptEnabled: false });

  for (const width of [1280, 390]) {
    test(`${width}px · navigasyon erişilebilir kalır`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto(PAGE);

      const state = await page.evaluate(() => {
        const links = [...document.querySelectorAll(".c-nav a, .c-nav-mobile__link")];
        const visible = links.filter((el) => {
          const r = el.getBoundingClientRect();
          const cs = getComputedStyle(el);
          return r.width > 0 && r.height > 0 &&
            cs.visibility !== "hidden" && cs.display !== "none";
        });
        const toggle = document.querySelector("[data-nav-toggle]");
        return {
          visibleLinks: visible.length,
          toggleShown: getComputedStyle(toggle).display !== "none",
          footerLinks: document.querySelectorAll(".c-footer__list a").length,
        };
      });

      /* En az bir yolla navigasyona ulaşılabilmeli: header navigasyonu ya da
         alt bilgi. İkisi de yoksa site JS'siz gezilemez demektir. */
      expect(
        state.visibleLinks + state.footerLinks,
        "JS'siz hiçbir navigasyon bağlantısı erişilebilir değil"
      ).toBeGreaterThan(0);

      /* Çalışmayan bir tetikleyici gösterilmemeli — tıklandığında hiçbir şey
         olmayan buton, olmayan butondan kötüdür. */
      expect(state.toggleShown, "JS yokken tetikleyici gizlenmeli").toBe(false);
    });
  }

  test("390px · taşma yok", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    await page.goto(PAGE);
    const doc = await page.evaluate(() => ({
      s: document.documentElement.scrollWidth,
      c: document.documentElement.clientWidth,
    }));
    expect(doc.s).toBeLessThanOrEqual(doc.c);
  });
});
