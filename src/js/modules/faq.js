export function initFaq(root) {
  if (!root) return null;
  const buttons = [...root.querySelectorAll(".c-faq__button")];
  const close = (button) => {
    button.setAttribute("aria-expanded", "false");
    button.nextElementSibling?.removeAttribute("data-open");
  };
  const open = (button) => {
    button.setAttribute("aria-expanded", "true");
    button.nextElementSibling?.setAttribute("data-open", "true");
  };
  buttons.forEach((button) => button.addEventListener("click", () => {
    const expanded = button.getAttribute("aria-expanded") === "true";
    buttons.forEach(close);
    if (!expanded) open(button);
  }));
  return { closeAll: () => buttons.forEach(close) };
}
