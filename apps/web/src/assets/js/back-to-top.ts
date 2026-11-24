const LINK_SELECTOR = ".app-back-to-top__link";
const FOCUSED_CLASS = "app-back-to-top-focused";

export function initBackToTop() {
  for (const link of document.querySelectorAll<HTMLAnchorElement>(LINK_SELECTOR)) {
    link.addEventListener("click", () => {
      const targetId = link.getAttribute("href")?.slice(1);
      const target = targetId ? document.getElementById(targetId) : null;
      if (target) {
        focusTemporarily(target);
      }
    });
  }
}

export function focusTemporarily(element: HTMLElement) {
  // Mirrors the GOV.UK skip link: a permanent tabindex on <main> would let mouse
  // clicks inside it reset the sequential focus start point back to the top.
  const hasOwnTabindex = element.hasAttribute("tabindex");
  if (!hasOwnTabindex) {
    element.setAttribute("tabindex", "-1");
  }
  element.addEventListener(
    "blur",
    () => {
      if (!hasOwnTabindex) {
        element.removeAttribute("tabindex");
      }
      element.classList.remove(FOCUSED_CLASS);
    },
    { once: true }
  );
  element.classList.add(FOCUSED_CLASS);
  element.focus();
}
