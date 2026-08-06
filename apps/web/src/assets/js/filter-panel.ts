// Reveals a jurisdiction's sub-jurisdiction checkbox group when the parent
// jurisdiction is ticked, and clears + hides it when unticked. This is
// page-specific behaviour (courts-tribunals-list, location-name-search) that the
// MOJ filter component does not provide, so it stays as a small progressive
// enhancement alongside the MOJ FilterToggleButton.
export function initFilterPanel() {
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
