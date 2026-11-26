// The navigation's menus are <details> disclosures, which work without this. With it, opening one
// closes the others, and a click elsewhere or Escape closes them, with Escape returning focus to it.
(() => {
  const menus = () => [...document.querySelectorAll(".app-navigation-menu__details")];
  const closeAll = (except) => {
    for (const menu of menus()) if (menu !== except) menu.open = false;
  };
  for (const menu of menus())
    menu.addEventListener("toggle", () => {
      if (menu.open) closeAll(menu);
    });
  document.addEventListener("click", (event) => {
    if (!(event.target instanceof Element) || !event.target.closest(".app-navigation-menu__details")) closeAll(null);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    const open = menus().find((menu) => menu.open);
    if (!open) return;
    open.open = false;
    open.querySelector("summary")?.focus();
  });
})();
