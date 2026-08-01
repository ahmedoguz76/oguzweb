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

window.__oguzweb = Object.fromEntries(
  registry.map(({ name, instance }) => [name, instance])
);
