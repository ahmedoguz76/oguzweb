const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex='0']",
].join(",");

function focusable(container) {
  return [...container.querySelectorAll(FOCUSABLE)].filter((el) => {
    if (el.hasAttribute("inert")) return false;
    if (el.closest("[inert]")) return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 || rect.height > 0;
  });
}

export function createFocusTrap(container) {
  let active = false;

  function onKeydown(event) {
    if (event.key !== "Tab") return;

    const items = focusable(container);
    if (items.length === 0) {

      event.preventDefault();
      return;
    }

    const first = items[0];
    const last = items[items.length - 1];
    const current = document.activeElement;

    if (event.shiftKey && (current === first || !container.contains(current))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && current === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return {
    activate() {
      if (active) return;
      active = true;
      document.addEventListener("keydown", onKeydown, true);
    },
    deactivate() {
      if (!active) return;
      active = false;
      document.removeEventListener("keydown", onKeydown, true);
    },

    first() {
      return focusable(container)[0] ?? null;
    },
    get isActive() {
      return active;
    },
  };
}
