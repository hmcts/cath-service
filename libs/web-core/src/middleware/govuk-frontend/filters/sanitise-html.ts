import nunjucks from "nunjucks";
import { sanitiseHtml } from "../../../sanitisation/html-sanitisation.js";

// Returns a SafeString so autoescaping is skipped for this value only. Sanitising and
// marking safe are deliberately the same step: a bare "| safe" in a template is what
// allowed admin-authored markup to reach the public page unchecked (VIBE-522), so the
// only route to unescaped output here is through the sanitiser.
export function sanitiseHtmlFilter(value: unknown): nunjucks.runtime.SafeString {
  if (typeof value !== "string") {
    return new nunjucks.runtime.SafeString("");
  }

  return new nunjucks.runtime.SafeString(sanitiseHtml(value));
}
