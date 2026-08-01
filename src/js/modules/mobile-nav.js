/**
 * modules/mobile-nav
 * ----------------------------------------------------------------------------
 * Mobil menü paneli.
 *
 * KAPANIŞ YOLLARI — hepsi TEK bir close() fonksiyonundan geçer:
 *   · kapatma butonu
 *   · Escape
 *   · panel dışına tıklama
 *   · bir bağlantıya tıklama
 *   · masaüstü breakpoint'ine geçiş
 *   · modül yok edilirken
 *
 * Tek çıkış noktası olması, kaydırma kilidinin HİÇBİR koşulda açık
 * kalmamasını garanti eder. Birden fazla kapanış kodu yazılsaydı, er ya da
 * geç biri kilidi temizlemeyi unuturdu ve kullanıcı sayfayı kaydıramaz
 * hale gelirdi — sessiz ve tanısı zor bir hata.
 *
 * ODAK: açılışta panele taşınır, kapanışta TETİKLEYİCİYE geri döner.
 * İkinci adım atlanırsa klavye kullanıcısı sayfanın başına fırlar.
 */

import { createFocusTrap } from "./utils/focus-trap.js";
import { watch, BP } from "./utils/media-query.js";

export function initMobileNav({ toggle, panel, closeButton }) {
  if (!toggle || !panel) return null;

  const root = document.documentElement;
  const trap = createFocusTrap(panel);
  let open = false;
  let lastFocused = null;

  function setState(isOpen) {
    open = isOpen;
    panel.classList.toggle("is-open", isOpen);
    toggle.setAttribute("aria-expanded", String(isOpen));
    root.classList.toggle("is-nav-open", isOpen);
    document.body.classList.toggle("u-no-scroll", isOpen);
  }

  function openNav() {
    if (open) return;
    lastFocused = document.activeElement;
    setState(true);
    trap.activate();

    /* Odak kapatma butonuna gider, ilk bağlantıya değil: kullanıcı menüyü
       yanlışlıkla açtıysa çıkış yolu ilk elindedir. */
    const target = closeButton ?? trap.first();
    target?.focus();
  }

  function close({ restoreFocus = true } = {}) {
    if (!open) return;
    setState(false);
    trap.deactivate();
    if (restoreFocus && lastFocused && document.contains(lastFocused)) {
      lastFocused.focus();
    }
    lastFocused = null;
  }

  function onToggleClick() {
    open ? close() : openNav();
  }

  function onKeydown(event) {
    if (event.key === "Escape" && open) {
      event.preventDefault();
      close();
    }
  }

  /* Panel dışına tıklama. Panel tam ekran olduğu için "dış alan" pratikte
     panelin boş bölgeleridir; bar ve gövde dışına yapılan tıklama kapatır. */
  function onPanelClick(event) {
    if (!open) return;
    if (event.target.closest("a")) {
      close({ restoreFocus: false });
      return;
    }
    const interactive = event.target.closest(
      ".c-nav-mobile__bar, .c-nav-mobile__body, .c-nav-mobile__footer"
    );
    if (!interactive) close();
  }

  /* Masaüstüne geçildiğinde menü her koşulda kapanır ve kilit temizlenir.
     CSS de paneli gizler; ama kaydırma kilidi ve aria durumu yalnızca
     buradan temizlenebilir. */
  const desktop = watch(BP.md, (isDesktop) => {
    if (isDesktop) close({ restoreFocus: false });
  });

  toggle.addEventListener("click", onToggleClick);
  closeButton?.addEventListener("click", () => close());
  panel.addEventListener("click", onPanelClick);
  document.addEventListener("keydown", onKeydown);

  /* Başlangıç durumu — sunucudan gelen HTML ile senkron */
  toggle.setAttribute("aria-expanded", "false");

  return {
    open: openNav,
    close,
    get isOpen() {
      return open;
    },
    destroy() {
      close({ restoreFocus: false });
      toggle.removeEventListener("click", onToggleClick);
      panel.removeEventListener("click", onPanelClick);
      document.removeEventListener("keydown", onKeydown);
      desktop.stop();
    },
  };
}
