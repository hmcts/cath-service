/**
 * @vitest-environment happy-dom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { initRestoreFileUpload } from "./restore-file-upload.js";

class FakeDataTransfer {
  private readonly list: File[] = [];
  readonly items = { add: (file: File) => this.list.push(file) };
  get files() {
    return this.list as unknown as FileList;
  }
}

function renderInput(attributes = 'data-pending-file-url="/manual-upload/pending-file" data-pending-file-name="hearing-list.json"') {
  document.body.innerHTML = `<input class="govuk-file-upload" id="file" name="file" type="file" ${attributes} />`;
  const input = document.querySelector<HTMLInputElement>("#file") as HTMLInputElement;
  let assigned: FileList | undefined;
  Object.defineProperty(input, "files", {
    configurable: true,
    get: () => assigned,
    set: (value: FileList) => {
      assigned = value;
    }
  });
  return input;
}

describe("initRestoreFileUpload", () => {
  beforeEach(() => {
    vi.stubGlobal("DataTransfer", FakeDataTransfer);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    document.body.innerHTML = "";
  });

  it("should put the kept file back into the file input with its original name", async () => {
    // Arrange
    const input = renderInput();
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, blob: () => Promise.resolve(new Blob(["{}"], { type: "application/json" })) });
    vi.stubGlobal("fetch", fetchMock);

    // Act
    await initRestoreFileUpload();

    // Assert
    expect(fetchMock).toHaveBeenCalledWith("/manual-upload/pending-file", { credentials: "same-origin" });
    expect(input.files).toHaveLength(1);
    expect(input.files?.[0].name).toBe("hearing-list.json");
    expect(input.files?.[0].type).toBe("application/json");
  });

  it("should leave the input empty when the kept file is no longer available", async () => {
    // Arrange
    const input = renderInput();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));

    // Act
    await initRestoreFileUpload();

    // Assert
    expect(input.files).toBeUndefined();
  });

  it("should leave the input empty when the request fails", async () => {
    // Arrange
    const input = renderInput();
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));
    vi.spyOn(console, "error").mockImplementation(() => {});

    // Act
    await initRestoreFileUpload();

    // Assert
    expect(input.files).toBeUndefined();
    expect(console.error).toHaveBeenCalled();
  });

  it("should do nothing when there is no kept file", async () => {
    // Arrange
    renderInput("");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    // Act
    await initRestoreFileUpload();

    // Assert
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
