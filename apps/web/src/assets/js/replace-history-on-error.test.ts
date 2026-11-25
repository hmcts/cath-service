/**
 * @vitest-environment happy-dom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { initReplaceHistoryOnError } from "./replace-history-on-error.js";

type PageshowHandler = (event: PageTransitionEvent) => void;

function renderForm({ isOptedIn, hasError }: { isOptedIn: boolean; hasError: boolean }) {
  document.body.innerHTML = `
    <form method="post" ${isOptedIn ? "data-replace-history-on-error" : ""}>
      <div class="govuk-form-group${hasError ? " govuk-form-group--error" : ""}"></div>
    </form>`;
}

describe("initReplaceHistoryOnError", () => {
  let replaceState: ReturnType<typeof vi.spyOn>;
  let pageshowHandler: PageshowHandler | undefined;

  beforeEach(() => {
    pageshowHandler = undefined;
    replaceState = vi.spyOn(window.history, "replaceState");
    vi.spyOn(window, "addEventListener").mockImplementation((type: string, listener: unknown) => {
      if (type === "pageshow") {
        pageshowHandler = listener as PageshowHandler;
      }
    });
  });

  afterEach(() => {
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  it("should replace the history entry when an opted-in form shows an error", () => {
    renderForm({ isOptedIn: true, hasError: true });

    initReplaceHistoryOnError();

    expect(replaceState).toHaveBeenCalledWith(null, "", window.location.href);
  });

  it("should not replace the history entry when the opted-in form has no error", () => {
    renderForm({ isOptedIn: true, hasError: false });

    initReplaceHistoryOnError();

    expect(replaceState).not.toHaveBeenCalled();
    expect(pageshowHandler).toBeUndefined();
  });

  it("should not replace the history entry when the form has not opted in", () => {
    renderForm({ isOptedIn: false, hasError: true });

    initReplaceHistoryOnError();

    expect(replaceState).not.toHaveBeenCalled();
    expect(pageshowHandler).toBeUndefined();
  });

  describe("when the page is shown again", () => {
    function stubReload() {
      const reload = vi.fn();
      vi.spyOn(window, "location", "get").mockReturnValue({ href: "http://localhost/view-option", reload } as unknown as Location);
      return reload;
    }

    it("should reload the error page when it is restored from the back/forward cache", () => {
      renderForm({ isOptedIn: true, hasError: true });
      initReplaceHistoryOnError();
      const reload = stubReload();

      pageshowHandler?.({ persisted: true } as PageTransitionEvent);

      expect(reload).toHaveBeenCalled();
    });

    it("should not reload the error page on a normal page load", () => {
      renderForm({ isOptedIn: true, hasError: true });
      initReplaceHistoryOnError();
      const reload = stubReload();

      pageshowHandler?.({ persisted: false } as PageTransitionEvent);

      expect(pageshowHandler).toBeDefined();
      expect(reload).not.toHaveBeenCalled();
    });
  });
});
