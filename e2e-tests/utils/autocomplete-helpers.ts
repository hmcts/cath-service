import { expect, type Locator, type Page } from "@playwright/test";

// The combobox only exists once search-autocomplete.ts has initialised, so typing into it never lands in the original
// input (which keeps the same id but is hidden). The full option text is typed so the listbox holds exactly that option,
// which makes the keyboard selection deterministic.
export async function selectAutocompleteOption(page: Page, combobox: Locator, optionText: string): Promise<string> {
  await combobox.fill(optionText);

  const options = page.getByRole("option");
  await expect(options.filter({ hasText: optionText })).toBeVisible();
  await expect(options).toHaveCount(1);

  await combobox.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(combobox).toHaveValue(optionText);

  const comboboxId = await combobox.getAttribute("id");
  const hiddenInput = page.locator(`input[type="hidden"][id="${comboboxId}Id"]`);
  await expect(hiddenInput).not.toHaveValue("");
  return hiddenInput.inputValue();
}
