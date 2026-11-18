// What every report page is drawn with (report-page.njk): its sections, the navigation they make, and
// what goes in the header and footer. Shared by make-report.mjs, which writes the report, and the
// hosted check (src/report-pages.ts), which redraws a report written before the current layout so
// every report it serves looks the same. Plain JavaScript, as make-report.mjs runs under node alone.

// Where the hosted check adds its own links (Home, Result) to a report page as it serves it. Nothing
// else does: opened from disk or a zip, those links would lead nowhere.
export const APP_NAVIGATION = "<!-- ui-baseline: app navigation -->";

// The report's sections, in order. The pages it captured are under one menu; a section's own pages
// (a list, a page, a journey, a file) count as being in it. Comparison and Accessibility are only
// written when there is a comparison of pages or accessibility checks, and each kind of file only
// when files of that kind were compared; a menu with nothing in it is left out.
const SECTIONS = [
  { href: "index.html", text: "Overview" },
  { href: "comparison.html", text: "Comparison", needs: "comparison" },
  { href: "accessibility.html", text: "Accessibility", needs: "accessibility" },
  {
    text: "Pages",
    items: [
      { href: "lists.html", text: "List pages" },
      { href: "pages.html", text: "Other pages" },
      { href: "journeys.html", text: "Journeys" }
    ]
  },
  {
    text: "Files",
    items: [
      { href: "pdfs.html", text: "PDF files", needs: "pdfs" },
      { href: "excel.html", text: "Excel files", needs: "excel" },
      { href: "other-files.html", text: "Other files", needs: "otherFiles" }
    ]
  },
  // A report written before files had a page per kind
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
  const present = (item) => !item.needs || has[item.needs];
  const navigation = SECTIONS.filter(present)
    .map((section) => (section.items ? { text: section.text, items: section.items.filter(present).map(link) } : link(section)))
    .filter((section) => !section.items || section.items.length);
  return { title, body, up, navigation, appNavigationSlot: APP_NAVIGATION, footerMeta, filterScript };
}

// The footer's line about where the report came from, as HTML: escape what goes into it
export function footerMeta(baseline) {
  return `Built from the UI baseline's captures; not a deployed service.${baseline ? ` Baseline recorded ${baseline.finished} from ${baseline.pip}.` : ""}`;
}
