/**
 * modules/header-scroll
 * ----------------------------------------------------------------------------
 * Sayfanın ilk 400px'inde header her zaman görünür. Sonrasında aşağı
 * kaydırmada gizlenir, yukarı kaydırmada belirir.
 *
 * JS yalnızca SINIF ekler/kaldırır — hiçbir stil değeri buradan yazılmaz.
 * Animasyonun tek kaynağı CSS'tir; ileride bir süreyi değiştirmek için bu
 * dosyaya bakmak gerekmez. (PHASE 08 §11)
 *
 * HAREKET AZALTMA
 * Kullanıcı hareket azaltma istiyorsa header HİÇ gizlenmez. Reset katmanı
 * geçiş süresini zaten sıfırlar; ama süresi sıfırlanmış bir gizle/göster,
 * yumuşak bir animasyondan daha rahatsız edicidir — sıçrayarak kaybolur.
 * Doğru cevap hareketi hızlandırmak değil, davranışı kapatmaktır.
 */

import { watch, matches, REDUCED_MOTION } from "./utils/media-query.js";

const THRESHOLD = 400;
const MIN_DELTA = 4; /* titreme eşiği */

export function initHeaderScroll(header) {
  if (!header) return null;

  let lastY = window.scrollY;
  let ticking = false;
  let reduced = matches(REDUCED_MOTION);

  const motionWatcher = watch(REDUCED_MOTION, (isReduced) => {
    reduced = isReduced;
    if (reduced) header.classList.remove("is-hidden");
  });

  function update() {
    ticking = false;
    const y = window.scrollY;
    const delta = y - lastY;

    /* Kaydırıldığında içerikten ayıran hairline belirir */
    header.classList.toggle("is-pinned", y > 0);

    /* Mobil menü açıkken header gizlenmez: kullanıcı kaydırmıyor, panel
       kaydırıyor olabilir ve header'ın kaybolması menünün altında beklenmedik
       bir boşluk bırakır. */
    const navOpen = document.documentElement.classList.contains("is-nav-open");

    if (reduced || navOpen || y <= THRESHOLD) {
      header.classList.remove("is-hidden");
      lastY = y;
      return;
    }

    if (Math.abs(delta) < MIN_DELTA) return;

    header.classList.toggle("is-hidden", delta > 0);
    lastY = y;
  }

  function onScroll() {
    if (ticking) return;
    ticking = true;
    /* rAF ile sınırlandırılır: her kaydırma olayında hesap yapmak ana iş
       parçacığını doldurur ve INP hedefini (<=150ms) riske atar. */
    requestAnimationFrame(update);
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  update();

  return {
    destroy() {
      window.removeEventListener("scroll", onScroll);
      motionWatcher.stop();
      header.classList.remove("is-hidden", "is-pinned");
    },
    /** Test ve mobil menü için: header'ı zorla görünür yap. */
    reveal() {
      header.classList.remove("is-hidden");
    },
  };
}
