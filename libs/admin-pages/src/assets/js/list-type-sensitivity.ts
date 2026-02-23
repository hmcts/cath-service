export function initListTypeSensitivity() {
  const form = document.querySelector("[data-list-type-sensitivity]") as HTMLElement;
  if (!form) {
    return;
  }

  const mappingJson = form.getAttribute("data-list-type-sensitivity");
  if (!mappingJson) {
    return;
  }

  let listTypeSensitivityMap: Record<string, string>;
  try {
    listTypeSensitivityMap = JSON.parse(mappingJson);
  } catch (e) {
    console.error("Failed to parse list type sensitivity mapping:", e);
    return;
  }

  const listTypeSelect = document.querySelector('select[name="listType"]') as HTMLSelectElement;
  const sensitivitySelect = document.querySelector('select[name="sensitivity"]') as HTMLSelectElement;

  if (!listTypeSelect || !sensitivitySelect) {
    return;
  }

  listTypeSelect.addEventListener("change", () => {
    const selectedListTypeId = listTypeSelect.value;

    if (!selectedListTypeId || selectedListTypeId === "") {
      sensitivitySelect.value = "";
      return;
    }

    const defaultSensitivity = listTypeSensitivityMap[selectedListTypeId];
    if (defaultSensitivity) {
      sensitivitySelect.value = defaultSensitivity;
    }
  });
}
