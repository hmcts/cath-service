document.addEventListener("DOMContentLoaded", () => {
  const selectAllCheckboxes = document.querySelectorAll<HTMLInputElement>(".select-all-checkbox");

  selectAllCheckboxes.forEach((selectAllCheckbox) => {
    const tableId = selectAllCheckbox.dataset.table;
    if (!tableId) return;

    const rowCheckboxes = document.querySelectorAll<HTMLInputElement>(`#${tableId} .row-checkbox`);

    selectAllCheckbox.addEventListener("change", () => {
      rowCheckboxes.forEach((checkbox) => {
        checkbox.checked = selectAllCheckbox.checked;
      });
    });

    rowCheckboxes.forEach((rowCheckbox) => {
      rowCheckbox.addEventListener("change", () => {
        const allChecked = Array.from(rowCheckboxes).every((checkbox) => checkbox.checked);
        const someChecked = Array.from(rowCheckboxes).some((checkbox) => checkbox.checked);

        selectAllCheckbox.checked = allChecked;
        selectAllCheckbox.indeterminate = someChecked && !allChecked;
      });
    });
  });
});
