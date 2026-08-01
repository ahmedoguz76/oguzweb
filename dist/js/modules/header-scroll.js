import { watch, matches, REDUCED_MOTION } from "./utils/media-query.js";

const THRESHOLD = 400;
const MIN_DELTA = 4;

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

    header.classList.toggle("is-pinned", y > 0);

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

    reveal() {
      header.classList.remove("is-hidden");
    },
  };
}
