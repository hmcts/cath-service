/**
 * @vitest-environment happy-dom
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { initListTypeSensitivity } from "./list-type-sensitivity.js";

describe("initListTypeSensitivity", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("should do nothing if form element not found", () => {
    initListTypeSensitivity();
    expect(document.querySelectorAll("select").length).toBe(0);
  });

  it("should do nothing if data-list-type-sensitivity attribute is missing", () => {
    document.body.innerHTML = '<form id="test-form"></form>';
    initListTypeSensitivity();
    expect(document.querySelectorAll("select").length).toBe(0);
  });

  it("should do nothing if JSON parsing fails", () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    document.body.innerHTML = '<form data-list-type-sensitivity="invalid json"></form>';
    initListTypeSensitivity();
    expect(consoleErrorSpy).toHaveBeenCalledWith("Failed to parse list type sensitivity mapping:", expect.any(SyntaxError));
    consoleErrorSpy.mockRestore();
  });

  it("should do nothing if listType select not found", () => {
    document.body.innerHTML = `
      <form data-list-type-sensitivity='{"1": "PUBLIC"}'>
        <select name="sensitivity"></select>
      </form>
    `;
    initListTypeSensitivity();
    const sensitivitySelect = document.querySelector('select[name="sensitivity"]') as HTMLSelectElement;
    expect(sensitivitySelect).toBeTruthy();
  });

  it("should do nothing if sensitivity select not found", () => {
    document.body.innerHTML = `
      <form data-list-type-sensitivity='{"1": "PUBLIC"}'>
        <select name="listType"></select>
      </form>
    `;
    initListTypeSensitivity();
    const listTypeSelect = document.querySelector('select[name="listType"]') as HTMLSelectElement;
    expect(listTypeSelect).toBeTruthy();
  });

  it("should set sensitivity when list type is selected", () => {
    document.body.innerHTML = `
      <form data-list-type-sensitivity='{"1": "PUBLIC", "2": "PRIVATE"}'>
        <select name="listType">
          <option value="">Select</option>
          <option value="1">Civil Daily Cause List</option>
          <option value="2">Family Daily Cause List</option>
        </select>
        <select name="sensitivity">
          <option value="">Select</option>
          <option value="PUBLIC">Public</option>
          <option value="PRIVATE">Private</option>
        </select>
      </form>
    `;

    initListTypeSensitivity();

    const listTypeSelect = document.querySelector('select[name="listType"]') as HTMLSelectElement;
    const sensitivitySelect = document.querySelector('select[name="sensitivity"]') as HTMLSelectElement;

    listTypeSelect.value = "1";
    listTypeSelect.dispatchEvent(new Event("change"));

    expect(sensitivitySelect.value).toBe("PUBLIC");
  });

  it("should clear sensitivity when empty list type is selected", () => {
    document.body.innerHTML = `
      <form data-list-type-sensitivity='{"1": "PUBLIC"}'>
        <select name="listType">
          <option value="">Select</option>
          <option value="1">Civil Daily Cause List</option>
        </select>
        <select name="sensitivity">
          <option value="">Select</option>
          <option value="PUBLIC">Public</option>
        </select>
      </form>
    `;

    initListTypeSensitivity();

    const listTypeSelect = document.querySelector('select[name="listType"]') as HTMLSelectElement;
    const sensitivitySelect = document.querySelector('select[name="sensitivity"]') as HTMLSelectElement;

    // First set a value
    listTypeSelect.value = "1";
    listTypeSelect.dispatchEvent(new Event("change"));
    expect(sensitivitySelect.value).toBe("PUBLIC");

    // Then clear it
    listTypeSelect.value = "";
    listTypeSelect.dispatchEvent(new Event("change"));
    expect(sensitivitySelect.value).toBe("");
  });

  it("should handle list type with no default sensitivity", () => {
    document.body.innerHTML = `
      <form data-list-type-sensitivity='{"1": "PUBLIC"}'>
        <select name="listType">
          <option value="">Select</option>
          <option value="1">Civil Daily Cause List</option>
          <option value="2">Crown Daily List</option>
        </select>
        <select name="sensitivity">
          <option value="">Select</option>
          <option value="PUBLIC">Public</option>
        </select>
      </form>
    `;

    initListTypeSensitivity();

    const listTypeSelect = document.querySelector('select[name="listType"]') as HTMLSelectElement;
    const sensitivitySelect = document.querySelector('select[name="sensitivity"]') as HTMLSelectElement;

    // Select list type without default sensitivity
    listTypeSelect.value = "2";
    listTypeSelect.dispatchEvent(new Event("change"));

    // Sensitivity should remain unchanged (current implementation doesn't set value if not in map)
    expect(sensitivitySelect.value).toBe("");
  });

  it("should handle multiple list type changes", () => {
    document.body.innerHTML = `
      <form data-list-type-sensitivity='{"1": "PUBLIC", "2": "PRIVATE", "3": "CLASSIFIED"}'>
        <select name="listType">
          <option value="">Select</option>
          <option value="1">List Type 1</option>
          <option value="2">List Type 2</option>
          <option value="3">List Type 3</option>
        </select>
        <select name="sensitivity">
          <option value="">Select</option>
          <option value="PUBLIC">Public</option>
          <option value="PRIVATE">Private</option>
          <option value="CLASSIFIED">Classified</option>
        </select>
      </form>
    `;

    initListTypeSensitivity();

    const listTypeSelect = document.querySelector('select[name="listType"]') as HTMLSelectElement;
    const sensitivitySelect = document.querySelector('select[name="sensitivity"]') as HTMLSelectElement;

    // Change to list type 1
    listTypeSelect.value = "1";
    listTypeSelect.dispatchEvent(new Event("change"));
    expect(sensitivitySelect.value).toBe("PUBLIC");

    // Change to list type 2
    listTypeSelect.value = "2";
    listTypeSelect.dispatchEvent(new Event("change"));
    expect(sensitivitySelect.value).toBe("PRIVATE");

    // Change to list type 3
    listTypeSelect.value = "3";
    listTypeSelect.dispatchEvent(new Event("change"));
    expect(sensitivitySelect.value).toBe("CLASSIFIED");

    // Clear selection
    listTypeSelect.value = "";
    listTypeSelect.dispatchEvent(new Event("change"));
    expect(sensitivitySelect.value).toBe("");
  });

  it("should work with valid JSON containing various list types", () => {
    document.body.innerHTML = `
      <form data-list-type-sensitivity='{"6": "PUBLIC", "8": "PUBLIC", "9": "PUBLIC"}'>
        <select name="listType">
          <option value="">Select</option>
          <option value="6">Crown Daily List</option>
          <option value="8">Civil and Family Daily Cause List</option>
          <option value="9">Care Standards Tribunal Weekly Hearing List</option>
        </select>
        <select name="sensitivity">
          <option value="">Select</option>
          <option value="PUBLIC">Public</option>
        </select>
      </form>
    `;

    initListTypeSensitivity();

    const listTypeSelect = document.querySelector('select[name="listType"]') as HTMLSelectElement;
    const sensitivitySelect = document.querySelector('select[name="sensitivity"]') as HTMLSelectElement;

    listTypeSelect.value = "8";
    listTypeSelect.dispatchEvent(new Event("change"));
    expect(sensitivitySelect.value).toBe("PUBLIC");
  });
});
