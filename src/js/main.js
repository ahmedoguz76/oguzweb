/**
 * main
 * ----------------------------------------------------------------------------
 * Giriş noktası. İki iş yapar: modülleri bulur, hataları yalıtır.
 *
 * HATA YALITIMI
 * Bir modül patlarsa diğerleri ayakta kalır. Mobil menüdeki bir hata,
 * header'ın kaydırma davranışını düşürmemeli. Sayfa JS olmadan da çalıştığı
 * için, bir modülün sessizce devre dışı kalması kabul edilebilir bir bozulma
 * biçimidir — beyaz ekran değil.
 *
 * Modüller DOM'da karşılıkları varsa başlatılır; yoksa sessizce atlanır.
 * Böylece tek bir main.js tüm sayfalarda çalışır.
 */

import { initHeaderScroll } from "./modules/header-scroll.js";
import { initMobileNav } from "./modules/mobile-nav.js";
import { initFaq } from "./modules/faq.js";
import { initContactForm } from "./modules/contact-form.js";

const registry = [];

function safeInit(name, fn) {
  try {
    const instance = fn();
    if (instance) registry.push({ name, instance });
  } catch (error) {
    /* Konsola yazılır ama kullanıcıya yansımaz. Test paketi konsolu
       denetlediği için bu, sessiz bir hata olmaz. */
    console.error(`[oguzweb] "${name}" başlatılamadı:`, error);
  }
}

safeInit("header-scroll", () =>
  initHeaderScroll(document.querySelector("[data-header]"))
);

safeInit("faq", () => initFaq(document.querySelector("[data-faq]")));

safeInit("contact-form", () =>
  initContactForm(document.querySelector("[data-contact-form]"))
);

safeInit("mobile-nav", () =>
  initMobileNav({
    toggle: document.querySelector("[data-nav-toggle]"),
    panel: document.querySelector("[data-nav-panel]"),
    closeButton: document.querySelector("[data-nav-close]"),
  })
);

/* Test erişimi. Üretimde de kalır: 300 bayttan küçük ve hata ayıklamayı
   mümkün kılıyor. */
window.__oguzweb = Object.fromEntries(
  registry.map(({ name, instance }) => [name, instance])
);
