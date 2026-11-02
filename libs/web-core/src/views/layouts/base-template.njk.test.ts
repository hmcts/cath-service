import path from "node:path";
import { fileURLToPath } from "node:url";
import { createTestEnvironment, render } from "@hmcts/test-support";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE = "layouts/base-template.njk";
const IDLE_ATTRIBUTE = "data-session-idle-ms";

let env: nunjucks.Environment;

beforeEach(() => {
  env = createTestEnvironment([path.resolve(__dirname, "..")]);
});

describe("base-template body attributes", () => {
  it("should set the idle duration on body when authenticated", () => {
    const { $ } = render(env, TEMPLATE, { isAuthenticated: true, sessionIdleMs: 2400000 });

    expect($("body").attr(IDLE_ATTRIBUTE)).toBe("2400000");
  });

  it("should not set the idle duration for an anonymous user", () => {
    const { $ } = render(env, TEMPLATE, { isAuthenticated: false, sessionIdleMs: 2400000 });

    expect($("body").attr(IDLE_ATTRIBUTE)).toBeUndefined();
  });

  it("should not set the idle duration when the route is not tracked", () => {
    const { $ } = render(env, TEMPLATE, { isAuthenticated: true });

    expect($("body").attr(IDLE_ATTRIBUTE)).toBeUndefined();
  });

  it("should not set the idle duration on the session expiring page", () => {
    const { $ } = render(env, TEMPLATE, { isAuthenticated: true, sessionIdleMs: 2400000, isSessionExpiringPage: true });

    expect($("body").attr(IDLE_ATTRIBUTE)).toBeUndefined();
  });

  it("should render a zero idle duration, which the client ignores", () => {
    const { $ } = render(env, TEMPLATE, { isAuthenticated: true, sessionIdleMs: 0 });

    expect($("body").attr(IDLE_ATTRIBUTE)).toBe("0");
  });

  it("should keep the govuk template body class", () => {
    const { $ } = render(env, TEMPLATE, { isAuthenticated: true, sessionIdleMs: 2400000 });

    expect($("body").hasClass("govuk-template__body")).toBe(true);
  });
});
