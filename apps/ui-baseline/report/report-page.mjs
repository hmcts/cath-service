// What every report page is drawn with (report-page.njk): its sections, the navigation they make, and
// what goes in the header and footer. Shared by make-report.mjs, which writes the report, and the
// hosted check (src/report-pages.ts), which redraws a report written before the current layout so
// every report it serves looks the same. Plain JavaScript, as make-report.mjs runs under node alone.

// Where the hosted check adds its own links (Home, Result) to a report page as it serves it. Nothing
// else does: opened from disk or a zip, those links would lead nowhere.
export const APP_NAVIGATION = "<!-- ui-baseline: app navigation -->";

// The report's sections, in order. The pages it captured are under one menu; a section's own pages
// (a list, a page, a journey) count as being in it. Comparison and Files are only written when
// there is a comparison of pages or of files.
const SECTIONS = [
  { href: "index.html", text: "Overview" },
  { href: "comparison.html", text: "Comparison", needs: "comparison" },
  {
    text: "Pages",
    items: [
      { href: "lists.html", text: "List pages" },
      { href: "pages.html", text: "Other pages" },
      { href: "journeys.html", text: "Journeys" }
    ]
  },
  { href: "files.html", text: "Files", needs: "files" },
  { href: "defects.html", text: "Known pip defects" }
];

// The context report-page.njk is rendered with. depth is how many folders below the report's root
// the page is; active the section it is in (its file name); has which optional sections exist.
export function reportPageContext({ title, body, depth, active, has, footerMeta, filterScript }) {
  // ./ rather than nothing at the root, as a module script is only loaded from a path that starts with one
  const up = depth ? "../".repeat(depth) : "./";
  // The page itself is "page"; one inside a section, such as a list's page, is "true"
  const link = (item) => ({ text: item.text, href: `${up}${item.href}`, active: active === item.href, ariaCurrent: depth === 0 ? "page" : "true" });
  const navigation = SECTIONS.filter((section) => !section.needs || has[section.needs]).map((section) =>
    section.items ? { text: section.text, items: section.items.map(link) } : link(section)
  );
  return { title, body, up, navigation, appNavigationSlot: APP_NAVIGATION, footerMeta, filterScript };
}

// The footer's line about where the report came from, as HTML: escape what goes into it
export function footerMeta(baseline) {
  return `Built from the UI baseline's captures; not a deployed service.${baseline ? ` Baseline recorded ${baseline.finished} from ${baseline.pip}.` : ""}`;
}
