export const BP = {
  sm: "(min-width: 26.875rem)",
  md: "(min-width: 48rem)",
  lg: "(min-width: 64rem)",
  xl: "(min-width: 80rem)",
};

export const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

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

export function matches(query) {
  return window.matchMedia(query).matches;
}
