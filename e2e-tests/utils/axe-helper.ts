import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";

// GOV.UK Frontend's crown copyright footer link does not meet wcag258 target size requirements.
// This is a known third-party issue outside our control.
const DISABLED_RULES = ["target-size"];

export function axeCheck(page: Page): AxeBuilder {
  return new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).disableRules(DISABLED_RULES);
}
