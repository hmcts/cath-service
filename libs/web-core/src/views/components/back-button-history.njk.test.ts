/**
 * @vitest-environment happy-dom
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import nunjucks from "nunjucks";
import { beforeEach, describe, expect, it, vi } from "vitest";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ERROR_PAGE = `
  <div class="govuk-error-summary"><a href="#location">Enter a court or tribunal</a></div>
  <form method="post">
    <div class="govuk-form-group govuk-form-group--error">
      <p id="location-hint" class="govuk-hint">Hint</p>
      <p id="location-error" class="govuk-error-message"><span class="govuk-visually-hidden">Error:</span> Enter a court or tribunal</p>
      <input class="govuk-input govuk-input--error" id="location" aria-describedby="location-error location-hint">
    </div>
    <div class="govuk-form-group govuk-form-group--error">
      <fieldset class="govuk-fieldset" aria-describedby="viewOption-error">
        <p id="viewOption-error" class="govuk-error-message">Select an option</p>
        <input class="govuk-radios__input" type="radio" id="viewOption" name="viewOption" value="court-tribunal">
      </fieldset>
    </div>
  </form>
`;

function renderScript() {
  const env = new nunjucks.Environment(new nunjucks.FileSystemLoader(path.join(__dirname, "..")));
  return env.renderString('{% from "components/back-button-history.njk" import backButtonHistory %}{{ backButtonHistory(cspNonce) }}', {
    cspNonce: "test-nonce"
  });
}

function runScript() {
  const scriptText = new DOMParser().parseFromString(renderScript(), "text/html").querySelector("script")?.textContent ?? "";
  new Function(scriptText)();
}

function firePageShow(isPersisted: boolean) {
  const event = new Event("pageshow");
  Object.defineProperty(event, "persisted", { value: isPersisted });
  window.dispatchEvent(event);
}

describe("back-button-history.njk", () => {
  beforeEach(() => {
    document.body.innerHTML = ERROR_PAGE;
    vi.restoreAllMocks();
  });

  it("should render an inline script carrying the CSP nonce", () => {
    const script = new DOMParser().parseFromString(renderScript(), "text/html").querySelector("script");

    expect(script?.getAttribute("nonce")).toBe("test-nonce");
  });

  it("should replace the current history entry with the same URL", () => {
    const replaceState = vi.spyOn(window.history, "replaceState");

    runScript();

    expect(replaceState).toHaveBeenCalledWith(null, "", window.location.href);
  });

  it("should leave the errors alone on a normal page load", () => {
    runScript();
    firePageShow(false);

    expect(document.querySelectorAll(".govuk-error-summary")).toHaveLength(1);
    expect(document.querySelectorAll(".govuk-error-message")).toHaveLength(2);
  });

  it("should remove the error summary, messages and error styling when restored from the back/forward cache", () => {
    runScript();
    firePageShow(true);

    expect(document.querySelectorAll(".govuk-error-summary")).toHaveLength(0);
    expect(document.querySelectorAll(".govuk-error-message")).toHaveLength(0);
    expect(document.querySelectorAll(".govuk-form-group--error")).toHaveLength(0);
    expect(document.getElementById("location")?.classList.contains("govuk-input--error")).toBe(false);
    expect(document.getElementById("location")?.classList.contains("govuk-input")).toBe(true);
  });

  it("should drop only the removed error ids from aria-describedby", () => {
    runScript();
    firePageShow(true);

    expect(document.getElementById("location")?.getAttribute("aria-describedby")).toBe("location-hint");
    expect(document.querySelector("fieldset")?.hasAttribute("aria-describedby")).toBe(false);
  });

  it("should keep what the user entered when restored from the back/forward cache", () => {
    const radio = document.getElementById("viewOption") as HTMLInputElement;
    const input = document.getElementById("location") as HTMLInputElement;
    radio.checked = true;
    input.value = "Oxford Combined Court Centre";

    runScript();
    firePageShow(true);

    expect(radio.checked).toBe(true);
    expect(input.value).toBe("Oxford Combined Court Centre");
  });
});
