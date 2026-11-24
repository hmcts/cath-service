import path from "node:path";
import { fileURLToPath } from "node:url";
import { createTestEnvironment, render } from "@hmcts/test-support";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";
import { en } from "../../locales/en.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE = "layouts/base-template.njk";
const IDLE_ATTRIBUTE = "data-session-idle-ms";

let env: nunjucks.Environment;

beforeEach(() => {
  env = createTestEnvironment([path.resolve(__dirname, "..")]);
});

describe("base-template body attributes", () => {
  it("should set the idle duration on body when authenticated", () => {
    const { $ } = render(env, TEMPLATE, { isAuthenticated: true, sessionIdleMs: 590000 });

    expect($("body").attr(IDLE_ATTRIBUTE)).toBe("590000");
  });

  it("should not set the idle duration for an anonymous user", () => {
    const { $ } = render(env, TEMPLATE, { isAuthenticated: false, sessionIdleMs: 590000 });

    expect($("body").attr(IDLE_ATTRIBUTE)).toBeUndefined();
  });

  it("should not set the idle duration when the route is not tracked", () => {
    const { $ } = render(env, TEMPLATE, { isAuthenticated: true });

    expect($("body").attr(IDLE_ATTRIBUTE)).toBeUndefined();
  });

  it("should render a zero idle duration, which the client ignores", () => {
    const { $ } = render(env, TEMPLATE, { isAuthenticated: true, sessionIdleMs: 0 });

    expect($("body").attr(IDLE_ATTRIBUTE)).toBe("0");
  });

  it("should keep the govuk template body class", () => {
    const { $ } = render(env, TEMPLATE, { isAuthenticated: true, sessionIdleMs: 590000 });

    expect($("body").hasClass("govuk-template__body")).toBe(true);
  });
});

describe("base-template session timeout dialog", () => {
  const SIGNED_IN = { ...en, isAuthenticated: true, sessionIdleMs: 590000, sessionWarningMs: 300000, sessionRedirectType: "SSO" };

  it("should include the timeout warning dialog for a signed-in user", () => {
    const { $ } = render(env, TEMPLATE, SIGNED_IN);

    expect($("dialog#session-timeout-dialog")).toHaveLength(1);
    expect($("dialog#session-timeout-dialog").attr("data-redirect-type")).toBe("SSO");
  });

  it("should place the dialog outside the main content", () => {
    const { $ } = render(env, TEMPLATE, SIGNED_IN);

    expect($("main #session-timeout-dialog")).toHaveLength(0);
  });

  it("should not include the dialog for an anonymous user", () => {
    const { $ } = render(env, TEMPLATE, { ...SIGNED_IN, isAuthenticated: false });

    expect($("dialog#session-timeout-dialog")).toHaveLength(0);
  });

  it("should not include the dialog when the route is not tracked", () => {
    const { $ } = render(env, TEMPLATE, { ...SIGNED_IN, sessionIdleMs: undefined });

    expect($("dialog#session-timeout-dialog")).toHaveLength(0);
  });
});
