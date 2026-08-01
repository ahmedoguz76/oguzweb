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

  const desktop = watch(BP.md, (isDesktop) => {
    if (isDesktop) close({ restoreFocus: false });
  });

  toggle.addEventListener("click", onToggleClick);
  closeButton?.addEventListener("click", () => close());
  panel.addEventListener("click", onPanelClick);
  document.addEventListener("keydown", onKeydown);

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
