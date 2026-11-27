import path from "node:path";
import { fileURLToPath } from "node:url";
import { createTestEnvironment, render } from "@hmcts/test-support";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";
import { cy } from "../../locales/cy.js";
import { en } from "../../locales/en.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE = "components/session-timeout-dialog.njk";

let env: nunjucks.Environment;

beforeEach(() => {
  env = createTestEnvironment([path.resolve(__dirname, "..")]);
});

function renderDialog(locale: typeof en | typeof cy = en) {
  return render(env, TEMPLATE, { ...locale, sessionWarningMs: 300000, sessionRedirectType: "CFT" });
}

describe("session-timeout-dialog template", () => {
  it("should render a dialog labelled by its heading and described by the countdown", () => {
    const { $ } = renderDialog();
    const dialog = $("dialog#session-timeout-dialog");

    expect(dialog).toHaveLength(1);
    expect(dialog.attr("open")).toBeUndefined();
    expect(dialog.attr("aria-labelledby")).toBe("session-timeout-heading");
    expect(dialog.attr("aria-describedby")).toBe("session-timeout-countdown");
    expect($("#session-timeout-countdown")).toHaveLength(1);
  });

  it("should render the AC heading as a programmatically focusable h2", () => {
    const { $ } = renderDialog();
    const heading = $("h2#session-timeout-heading");

    expect(heading.text().trim()).toBe("You're about to be signed out due to inactivity.");
    expect(heading.attr("tabindex")).toBe("-1");
  });

  it("should pass the timings, redirect type and countdown wording to the script", () => {
    const { $ } = renderDialog();
    const data = $("dialog").data() as Record<string, string | number>;

    expect(data.warningMs).toBe(300000);
    expect(data.redirectType).toBe("CFT");
    expect(data.countdownText).toBe("For your security, you will be signed out in {time}.");
    expect(data.minuteText).toBe("minute");
    expect(data.minutesText).toBe("minutes");
    expect(data.secondText).toBe("second");
    expect(data.secondsText).toBe("seconds");
    expect(data.errorText).toBe(en.sessionTimeout.keepAliveError);
  });

  it("should render a polite atomic live region for the countdown announcements", () => {
    const { $ } = renderDialog();
    const liveRegion = $("#session-timeout-announcement");

    expect(liveRegion.attr("aria-live")).toBe("polite");
    expect(liveRegion.attr("aria-atomic")).toBe("true");
    expect(liveRegion.hasClass("govuk-visually-hidden")).toBe(true);
  });

  it("should render a hidden error message for keep-alive failures", () => {
    const { $ } = renderDialog();

    expect($("#session-timeout-error").attr("hidden")).toBeDefined();
  });

  it("should render the Continue button as a non-submitting button", () => {
    const { $ } = renderDialog();
    const button = $("button.app-session-timeout__continue");

    expect(button).toHaveLength(1);
    expect(button.text().trim()).toBe("Continue");
    expect(button.attr("type")).toBe("button");
  });

  it("should render Welsh content when the cy locale is used", () => {
    const { $ } = renderDialog(cy);

    expect($("h2#session-timeout-heading").text().trim()).toBe(cy.sessionTimeout.heading);
    expect($("button.app-session-timeout__continue").text().trim()).toBe("Parhau");
    expect($("dialog").attr("data-countdown-text")).toBe(cy.sessionTimeout.countdown);
  });

  it("should keep the {time} placeholder in both locales", () => {
    expect(en.sessionTimeout.countdown).toContain("{time}");
    expect(cy.sessionTimeout.countdown).toContain("{time}");
  });

  it("should have the same session timeout keys in English and Welsh", () => {
    expect(Object.keys(cy.sessionTimeout).sort()).toEqual(Object.keys(en.sessionTimeout).sort());
  });
});
