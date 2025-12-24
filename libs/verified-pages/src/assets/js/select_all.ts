function syncRowCheckboxes(rowCheckboxes: NodeListOf<HTMLInputElement>, isChecked: boolean) {
  rowCheckboxes.forEach((checkbox) => {
    checkbox.checked = isChecked;
  });
}

function updateSelectAllState(selectAllCheckbox: HTMLInputElement, rowCheckboxes: NodeListOf<HTMLInputElement>) {
  const checkboxArray = Array.from(rowCheckboxes);
  const hasCheckboxes = checkboxArray.length > 0;
  const allChecked = hasCheckboxes && checkboxArray.every((checkbox) => checkbox.checked);
  const someChecked = checkboxArray.some((checkbox) => checkbox.checked);

  selectAllCheckbox.checked = allChecked;
  selectAllCheckbox.indeterminate = someChecked && !allChecked;
}

function updateAllSelectAllCheckboxStates() {
  const selectAllCheckboxes = document.querySelectorAll<HTMLInputElement>(".select-all-checkbox");
  selectAllCheckboxes.forEach((selectAllCheckbox) => {
    const tableId = selectAllCheckbox.dataset.table;
    if (!tableId) return;
    const rowCheckboxes = document.querySelectorAll<HTMLInputElement>(`#${tableId} .row-checkbox`);
    updateSelectAllState(selectAllCheckbox, rowCheckboxes);
  });
}

function syncSubscriptionCheckboxAcrossTabs(changedCheckbox: HTMLInputElement) {
  const subscriptionId = changedCheckbox.value;
  const allSubscriptionCheckboxes = document.querySelectorAll<HTMLInputElement>(`input[type="checkbox"][name="subscriptions"][value="${subscriptionId}"]`);

  allSubscriptionCheckboxes.forEach((checkbox) => {
    if (checkbox !== changedCheckbox) {
      checkbox.checked = changedCheckbox.checked;
    }
  });

  updateAllSelectAllCheckboxStates();
}

function setupSelectAllCheckbox(selectAllCheckbox: HTMLInputElement) {
  const tableId = selectAllCheckbox.dataset.table;
  if (!tableId) return;

  const rowCheckboxes = document.querySelectorAll<HTMLInputElement>(`#${tableId} .row-checkbox`);

  selectAllCheckbox.addEventListener("change", () => {
    selectAllCheckbox.indeterminate = false;
    syncRowCheckboxes(rowCheckboxes, selectAllCheckbox.checked);
    rowCheckboxes.forEach((checkbox) => {
      syncSubscriptionCheckboxAcrossTabs(checkbox);
    });
  });

  rowCheckboxes.forEach((rowCheckbox) => {
    rowCheckbox.addEventListener("change", () => {
      syncSubscriptionCheckboxAcrossTabs(rowCheckbox);
      updateSelectAllState(selectAllCheckbox, rowCheckboxes);
    });
  });

  updateSelectAllState(selectAllCheckbox, rowCheckboxes);
}

document.addEventListener("DOMContentLoaded", () => {
  const selectAllCheckboxes = document.querySelectorAll<HTMLInputElement>(".select-all-checkbox");
  selectAllCheckboxes.forEach(setupSelectAllCheckbox);
});
