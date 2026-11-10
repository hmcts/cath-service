import nunjucks from "nunjucks";
import { APP_NAVIGATION, footerMeta, reportPageContext } from "../report/report-page.mjs";

// A report page as the hosted check serves it: with Home and Result at the start of its navigation,
// as the app's own pages have them. A page written before the current layout (report-page.njk) is
// redrawn in it first, from the parts of it that the old layout always wrote the same way, so every
// report looks the same whenever its check ran.
const OLD_NAVIGATION = '<nav class="govuk-service-navigation__wrapper" aria-label="Menu"><ul class="govuk-service-navigation__list">';
const OLD_MAIN = '<main class="govuk-main-wrapper" id="main-content">';
const OLD_MAIN_END = "</main></div>";
const OLD_TITLE = /<title>([\s\S]*?) – CaTH parity<\/title>/;
const OLD_DEPTH = /href="((?:\.\.\/)*)assets\/govuk-frontend\.min\.css"/;
const OLD_ACTIVE = /govuk-service-navigation__item--active"><a class="govuk-service-navigation__link" href="(?:\.\.\/)*([a-z-]+\.html)"/;
const OLD_BASELINE = /Baseline run finished ([^<]*?) · ([^<]*?)<\/p>/;
const OLD_FILTER_SCRIPT = /<script>((?:(?!<\/script>)[\s\S])*)<\/script>\s*<\/body>/;

// A page of the report itself, rather than one of the captured pip or CaTH pages kept beside it
export function isReportPage(html: string): boolean {
  return html.includes(APP_NAVIGATION) || html.includes(OLD_NAVIGATION);
}

export function withAppNavigation(views: nunjucks.Environment, html: string, runId: string): string {
  const links = views.renderString('{% from "navigation.njk" import navigationItems %}{{ navigationItems(items) }}', {
    items: [
      { text: "Home", href: "/" },
      { text: "Result", href: `/runs/${encodeURIComponent(runId)}` }
    ]
  });
  if (html.includes(APP_NAVIGATION)) return html.replace(APP_NAVIGATION, links);
  // An old page it cannot take apart keeps its layout, with the links at the start of its navigation
  return redrawn(views, html)?.replace(APP_NAVIGATION, links) ?? html.replace(OLD_NAVIGATION, `${OLD_NAVIGATION}${links}`);
}

// An old-layout page in the current layout; null if it is not one the old layout wrote
function redrawn(views: nunjucks.Environment, html: string): string | null {
  const title = html.match(OLD_TITLE)?.[1];
  const start = html.indexOf(OLD_MAIN);
  const end = html.lastIndexOf(OLD_MAIN_END);
  if (title === undefined || start === -1 || end < start) return null;
  const baseline = html.match(OLD_BASELINE);
  // Which sections the old page had, and which it was in, from its navigation alone
  const navigationStart = html.indexOf(OLD_NAVIGATION);
  const navigation = navigationStart === -1 ? "" : html.slice(navigationStart, html.indexOf("</ul></nav>", navigationStart));
  const hasSection = (file: string) => new RegExp(`href="(?:\\.\\./)*${file.replace(".", "\\.")}"`).test(navigation);
  const context = reportPageContext({
    // Already escaped when the old layout wrote them
    title: new nunjucks.runtime.SafeString(title),
    body: html.slice(start + OLD_MAIN.length, end),
    depth: (html.match(OLD_DEPTH)?.[1] ?? "").length / "../".length,
    active: navigation.match(OLD_ACTIVE)?.[1] ?? null,
    has: { comparison: hasSection("comparison.html"), files: hasSection("files.html"), accessibility: hasSection("accessibility.html") },
    footerMeta: footerMeta(baseline ? { finished: baseline[1], pip: baseline[2] } : null),
    filterScript: html.match(OLD_FILTER_SCRIPT)?.[1] ?? ""
  });
  return views.render("report-page.njk", context);
}
