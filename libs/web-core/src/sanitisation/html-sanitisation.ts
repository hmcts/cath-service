import sanitizeHtml from "sanitize-html";

// Admin-authored location messages are rendered as markup on the public
// summary-of-publications page. Legacy CaTH stored raw HTML in those fields and rendered
// it unsanitised, so this allowlist has to cover the formatting real courts already use
// — emphasis, paragraph breaks, lists and links — while discarding anything that can
// execute script or navigate the page.
export const ALLOWED_HTML_TAGS = ["p", "br", "strong", "b", "em", "i", "ul", "ol", "li", "a"];

// Mirrors how an HTML parser opens a tag: "<" immediately followed by a tag name, no
// space between them. "Hearings finish < 4pm" is therefore left alone, while "<b" is not.
const TAG_NAME_REGEX = /<\/?([a-zA-Z][a-zA-Z0-9]*)/g;

const SANITISE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ALLOWED_HTML_TAGS,
  allowedAttributes: { a: ["href"] },
  allowedSchemes: ["http", "https", "mailto"],
  allowProtocolRelative: false,
  disallowedTagsMode: "discard"
};

export function sanitiseHtml(value: string): string {
  return sanitizeHtml(value, SANITISE_OPTIONS);
}

// Reported back to admins so they can correct their own input. The sanitiser above is the
// security control; this only needs to be accurate enough to name what was rejected.
export function findDisallowedHtmlTags(value: string): string[] {
  const disallowed = new Set<string>();

  for (const [, tagName] of value.matchAll(TAG_NAME_REGEX)) {
    const name = tagName.toLowerCase();

    if (!ALLOWED_HTML_TAGS.includes(name)) {
      disallowed.add(name);
    }
  }

  return [...disallowed];
}
