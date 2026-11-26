// Progressive enhancement for the filter sidebar that the MOJ filter component
// does not provide (courts-tribunals-list, jurisdiction-data-list,
// location-name-search): collapsible filter sections with a +/− toggle, plus
// revealing a jurisdiction's sub-jurisdiction checkbox group when its parent is
// ticked. Both run alongside the MOJ FilterToggleButton (whole-panel show/hide).
export function initFilterPanel() {
  initSubJurisdictionReveal();
  initCollapsibleSections();
}

function initSubJurisdictionReveal() {
  const jurisdictionCheckboxes = document.querySelectorAll<HTMLInputElement>('input[name="jurisdiction"]');

  jurisdictionCheckboxes.forEach((checkbox) => {
    checkbox.addEventListener("change", (event) => {
      const target = event.target as HTMLInputElement;
      const jurisdictionValue = target.value;
      const subJurisdictionSection = document.querySelector(`.sub-jurisdiction-section[data-parent-jurisdiction="${jurisdictionValue}"]`) as HTMLElement;

      if (subJurisdictionSection) {
        if (target.checked) {
          subJurisdictionSection.hidden = false;
        } else {
          subJurisdictionSection.hidden = true;
          const subCheckboxes = subJurisdictionSection.querySelectorAll<HTMLInputElement>('input[type="checkbox"]');
          subCheckboxes.forEach((subCheckbox) => {
            subCheckbox.checked = false;
          });
        }
      }
    });
  });
}

function initCollapsibleSections() {
  const toggleButtons = document.querySelectorAll<HTMLElement>(".filter-section-toggle");

  toggleButtons.forEach((button) => {
    button.addEventListener("click", (event) => {
      const target = event.currentTarget as HTMLElement;
      const targetId = target.getAttribute("aria-controls");
      if (!targetId) return;

      const content = document.getElementById(targetId);
      if (!content) return;

      const icon = target.querySelector(".filter-section-icon");
      // Icon glyphs default to −/+ but can be overridden per toggle (e.g. the SJP
      // lists use ▼/▶) via data-expanded-icon / data-collapsed-icon.
      const expandedIcon = target.getAttribute("data-expanded-icon") || "−";
      const collapsedIcon = target.getAttribute("data-collapsed-icon") || "+";
      const isExpanded = target.getAttribute("aria-expanded") === "true";

      if (isExpanded) {
        target.setAttribute("aria-expanded", "false");
        content.setAttribute("hidden", "");
        if (icon) icon.textContent = collapsedIcon;
      } else {
        target.setAttribute("aria-expanded", "true");
        content.removeAttribute("hidden");
        if (icon) icon.textContent = expandedIcon;
      }
    });
  });
}
