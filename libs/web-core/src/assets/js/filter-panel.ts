export function initFilterPanel() {
  // Handle jurisdiction sub-jurisdiction toggle
  const jurisdictionCheckboxes = document.querySelectorAll<HTMLInputElement>('input[name="jurisdiction"]');

  jurisdictionCheckboxes.forEach((checkbox) => {
    checkbox.addEventListener('change', (event) => {
      const target = event.target as HTMLInputElement;
      const jurisdictionValue = target.value;
      const subJurisdictionSection = document.querySelector(`.sub-jurisdiction-section[data-parent-jurisdiction="${jurisdictionValue}"]`) as HTMLElement;

      if (subJurisdictionSection) {
        if (target.checked) {
          subJurisdictionSection.style.display = 'block';
        } else {
          subJurisdictionSection.style.display = 'none';
          const subCheckboxes = subJurisdictionSection.querySelectorAll<HTMLInputElement>('input[type="checkbox"]');
          subCheckboxes.forEach((subCheckbox) => {
            subCheckbox.checked = false;
          });
        }
      }
    });
  });

  // Handle collapsible filter sections
  const toggleButtons = document.querySelectorAll<HTMLElement>('.filter-section-toggle');

  toggleButtons.forEach((button) => {
    button.addEventListener('click', (event) => {
      const target = event.currentTarget as HTMLElement;
      const targetId = target.getAttribute('aria-controls');
      if (!targetId) return;

      const content = document.getElementById(targetId);
      if (!content) return;

      const icon = target.querySelector('.filter-section-icon');
      const isExpanded = target.getAttribute('aria-expanded') === 'true';

      if (isExpanded) {
        target.setAttribute('aria-expanded', 'false');
        content.setAttribute('hidden', '');
        if (icon) icon.textContent = '+';
      } else {
        target.setAttribute('aria-expanded', 'true');
        content.removeAttribute('hidden');
        if (icon) icon.textContent = '−';
      }
    });
  });
}

