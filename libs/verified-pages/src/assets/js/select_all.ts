function syncRowCheckboxes(rowCheckboxes: NodeListOf<HTMLInputElement>, isChecked: boolean) {
  rowCheckboxes.forEach((checkbox) => {
    checkbox.checked = isChecked;
  });
}

function updateSelectAllState(selectAllCheckbox: HTMLInputElement, rowCheckboxes: NodeListOf<HTMLInputElement>) {
  const checkboxArray = Array.from(rowCheckboxes);
  const allChecked = checkboxArray.every((checkbox) => checkbox.checked);
  const someChecked = checkboxArray.some((checkbox) => checkbox.checked);

  selectAllCheckbox.checked = allChecked;
  selectAllCheckbox.indeterminate = someChecked && !allChecked;
}

function setupSelectAllCheckbox(selectAllCheckbox: HTMLInputElement) {
  const tableId = selectAllCheckbox.dataset.table;
  if (!tableId) return;

  const rowCheckboxes = document.querySelectorAll<HTMLInputElement>(`#${tableId} .row-checkbox`);

  selectAllCheckbox.addEventListener("change", () => {
    syncRowCheckboxes(rowCheckboxes, selectAllCheckbox.checked);
  });

  rowCheckboxes.forEach((rowCheckbox) => {
    rowCheckbox.addEventListener("change", () => {
      updateSelectAllState(selectAllCheckbox, rowCheckboxes);
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const selectAllCheckboxes = document.querySelectorAll<HTMLInputElement>(".select-all-checkbox");
  selectAllCheckboxes.forEach(setupSelectAllCheckbox);
});
