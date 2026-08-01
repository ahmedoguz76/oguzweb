/**
 * utils/media-query
 * ----------------------------------------------------------------------------
 * matchMedia etrafında ince bir sarmalayıcı. Hem header-scroll hem mobile-nav
 * medya sorgusu dinliyor; aynı kod iki yerde tekrarlanmasın diye ayrıldı.
 *
 * Breakpoint değerleri CSS ile AYNI kaynaktan gelmelidir; custom property'ler
 * medya sorgusunda kullanılamadığı için değer burada tekrar edilir. Tekrarın
 * sessizce ayrışmaması adına aşağıdaki sabitler tek yerde tutulur ve
 * tests/global.spec.js bunları CSS davranışıyla karşılaştırarak doğrular.
 */

export const BP = {
  sm: "(min-width: 26.875rem)", /* 430px */
  md: "(min-width: 48rem)",     /* 768px */
  lg: "(min-width: 64rem)",     /* 1024px */
  xl: "(min-width: 80rem)",     /* 1280px */
};

export const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

/**
 * Bir medya sorgusunu izler.
 * @returns {{ matches: boolean, stop: () => void }}
 */
export function watch(query, onChange) {
  const mql = window.matchMedia(query);
  const handler = (event) => onChange(event.matches);
  mql.addEventListener("change", handler);
  return {
    get matches() {
      return mql.matches;
    },
    stop() {
      mql.removeEventListener("change", handler);
    },
  };
}

/** Tek seferlik sorgu — dinleyici kurmadan. */
export function matches(query) {
  return window.matchMedia(query).matches;
}
