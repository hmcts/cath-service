// Verification report for parity captures. Builds a static site into <out>:
// overview, list pages (pip vs CaTH), other pip pages, journeys, and known pip defects.
// Styled with GOV.UK Frontend so it reads like the services it compares.
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, symlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";

const { values: args } = parseArgs({
  options: {
    lists: { type: "string" }, // dir containing pip/ and cath/ list captures
    manifest: { type: "string" },
    pages: { type: "string" }, // pip non-list page captures
    "cath-pages": { type: "string" }, // CaTH captures of mapped pages, same ids as pip's
    "pages-compare": { type: "string" }, // compare.json of pip pages against CaTH pages
    "route-map": { type: "string" },
    journeys: { type: "string" },
    defects: { type: "string" },
    run: { type: "string" }, // run.json of the baseline run
    compare: { type: "string" }, // compare.json from `parity compare` of the list pages
    review: { type: "string", multiple: true }, // review.json files from `parity review`
    govuk: { type: "string" }, // node_modules/govuk-frontend/dist/govuk
    only: { type: "string" }, // comma-separated publication and page ids to include (a focused check)
    title: { type: "string" }, // overview heading
    out: { type: "string" }
  }
});
const OUT = path.resolve(args.out);
const LOCALES = ["en", "cy"];
const ONLY = args.only ? new Set(args.only.split(",").filter(Boolean)) : null;
const fullManifest = JSON.parse(readFileSync(args.manifest, "utf-8"));
const manifest = {
  ...fullManifest,
  publications: fullManifest.publications.filter((p) => !ONLY || ONLY.has(p.id)),
  unmatched: ONLY ? [] : fullManifest.unmatched
};
const run = args.run && existsSync(args.run) ? JSON.parse(readFileSync(args.run, "utf-8")) : null;
const comparison = args.compare && existsSync(args.compare) ? JSON.parse(readFileSync(args.compare, "utf-8")) : null;
const reviews = (args.review ?? []).filter((file) => existsSync(file)).map((file) => JSON.parse(readFileSync(file, "utf-8")));
const reviewItemsFor = (id, locale) =>
  reviews.flatMap((review) =>
    review.items
      .filter((item) => item.review && item.pages.some((page) => page === `${id} ${locale}`))
      .map((item) => ({ ...item, requirementsSource: review.requirementsSource }))
  );
const pagesComparison = args["pages-compare"] && existsSync(args["pages-compare"]) ? JSON.parse(readFileSync(args["pages-compare"], "utf-8")) : null;
const routeMap =
  args["route-map"] && existsSync(args["route-map"]) ? new Map(JSON.parse(readFileSync(args["route-map"], "utf-8")).routes.map((e) => [e.pip, e])) : new Map();
const pageResultFor = (id, locale) => pagesComparison?.results.find((r) => r.id === id && r.locale === locale && r.state === "default") ?? null;
const resultFor = (id, locale) => comparison?.results.find((r) => r.id === id && r.locale === locale && r.state === "default") ?? null;

// ---------- site scaffolding ----------
rmSync(OUT, { recursive: true, force: true });
mkdirSync(path.join(OUT, "assets"), { recursive: true });
// node_modules is read-only here, so copy without carrying its permissions across
for (const source of ["govuk-frontend.min.css", "govuk-frontend.min.js", "assets/images", "assets/fonts", "assets/manifest.json"]) {
  if (existsSync(path.join(args.govuk, source))) execFileSync("cp", ["-r", "--no-preserve=mode", path.join(args.govuk, source), path.join(OUT, "assets/")]);
}
cpSync(path.join(import.meta.dirname, "report.css"), path.join(OUT, "assets/report.css"));
mkdirSync(path.join(OUT, "data"), { recursive: true });
for (const [name, target] of [
  ["lists", args.lists],
  ["pages", args.pages],
  ["cath-pages", args["cath-pages"]],
  ["journeys", args.journeys]
]) {
  if (target && existsSync(target)) symlinkSync(path.resolve(target), path.join(OUT, "data", name));
}

const NAV = [
  ["index.html", "Overview"],
  ["comparison.html", "Comparison"],
  ["lists.html", "List pages"],
  ["pages.html", "Other pages"],
  ["journeys.html", "Journeys"],
  ["defects.html", "Known pip defects"]
];

function layout({ file, title, active, body, depth = 0 }) {
  const up = "../".repeat(depth);
  const nav = NAV.map(
    ([href, label]) =>
      `<li class="govuk-service-navigation__item${active === href ? " govuk-service-navigation__item--active" : ""}"><a class="govuk-service-navigation__link" href="${up}${href}"${active === href ? ' aria-current="true"' : ""}>${label}</a></li>`
  ).join("");
  const html = `<!doctype html>
<html lang="en" class="govuk-template govuk-template--rebranded">
<head>
  <meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)} – CaTH parity</title>
  <link rel="icon" href="${up}assets/images/favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="${up}assets/govuk-frontend.min.css">
  <link rel="stylesheet" href="${up}assets/report.css">
</head>
<body class="govuk-template__body">
  <script>document.body.className += ' js-enabled' + ('noModule' in HTMLScriptElement.prototype ? ' govuk-frontend-supported' : '');</script>
  <header class="govuk-header" data-module="govuk-header"><div class="govuk-header__container govuk-width-container parity-wide">
    <div class="govuk-header__logo"><a href="${up}index.html" class="govuk-header__link govuk-header__link--homepage"><span class="parity-logo">CaTH parity</span></a></div>
  </div></header>
  <section class="govuk-service-navigation" data-module="govuk-service-navigation"><div class="govuk-width-container parity-wide"><div class="govuk-service-navigation__container">
    <span class="govuk-service-navigation__service-name"><span class="govuk-service-navigation__text">pip-frontend baseline</span></span>
    <nav class="govuk-service-navigation__wrapper" aria-label="Menu"><ul class="govuk-service-navigation__list">${nav}</ul></nav>
  </div></div></section>
  <div class="govuk-width-container parity-wide"><main class="govuk-main-wrapper" id="main-content">${body}</main></div>
  <footer class="govuk-footer"><div class="govuk-width-container parity-wide"><p class="govuk-body-s">Local verification report built from parity capture output. Not a deployed service.${run ? ` Baseline run finished ${esc(new Date(run.finishedAt).toLocaleString("en-GB", { timeZone: "Europe/London" }))} · ${esc(run.pip)}` : ""}</p></div></footer>
  <script type="module">import { initAll } from "${up}assets/govuk-frontend.min.js"; initAll();</script>
  <script>${FILTER_SCRIPT}</script>
</body></html>`;
  mkdirSync(path.dirname(path.join(OUT, file)), { recursive: true });
  writeFileSync(path.join(OUT, file), html);
}

// Filters any table marked data-filterable using the input that points at it
const FILTER_SCRIPT = `document.querySelectorAll('[data-filter-for]').forEach(function (input) {
  var table = document.getElementById(input.getAttribute('data-filter-for'));
  input.addEventListener('input', function () {
    var q = input.value.toLowerCase();
    table.querySelectorAll('tbody tr').forEach(function (row) { row.hidden = q && row.textContent.toLowerCase().indexOf(q) === -1; });
  });
});`;

// ---------- helpers ----------
function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
const readJson = (file) => (existsSync(file) ? JSON.parse(readFileSync(file, "utf-8")) : null);
const readLines = (file) =>
  existsSync(file)
    ? readFileSync(file, "utf-8")
        .trim()
        .split("\n")
        .filter(Boolean)
        .map((line) => JSON.parse(line))
    : [];
const plural = (count, one, many) => (count === 1 ? one : many);
const tag = (text, colour) => `<strong class="govuk-tag govuk-tag--${colour}">${esc(text)}</strong>`;
const ariaHeading = (file) => (existsSync(file) ? ((readFileSync(file, "utf-8").match(/heading "([^"]*)"/) ?? [])[1] ?? "") : "");

function unifiedDiff(a, b, labelA, labelB) {
  try {
    execFileSync("diff", ["-u", "--label", labelA, "--label", labelB, a, b], { encoding: "utf-8" });
    return "";
  } catch (error) {
    return error.stdout ?? "";
  }
}
function diffBlock(diff) {
  const lines = diff.split("\n").filter((line) => !line.startsWith("---") && !line.startsWith("+++"));
  return `<pre class="parity-diff">${lines
    .map((line) => `<span class="${line.startsWith("@@") ? "hunk" : line.startsWith("+") ? "add" : line.startsWith("-") ? "del" : ""}">${esc(line)}</span>`)
    .join("\n")}</pre>`;
}
const changedLineCount = (diff) => diff.split("\n").filter((line) => /^[+-](?![+-]{2})/.test(line)).length;

function axeSummary(file) {
  const axe = readJson(file);
  if (!axe) return { count: 0, html: "" };
  const items = axe.violations
    .map(
      (v) =>
        `<li>${tag(v.impact ?? "unknown", v.impact === "critical" ? "red" : v.impact === "serious" ? "orange" : "yellow")} <a class="govuk-link" href="${esc(v.helpUrl)}">${esc(v.id)}</a> – ${esc(v.help)} <span class="govuk-hint parity-inline-hint">(${v.targets.length} element${v.targets.length === 1 ? "" : "s"})</span></li>`
    )
    .join("");
  return {
    count: axe.violations.length,
    html: axe.violations.length ? `<ul class="govuk-list parity-axe">${items}</ul>` : `<p class="govuk-body-s parity-ok">No axe violations</p>`
  };
}

function fileLinks(base, dirOnDisk) {
  const files = ["aria.yml", "page.aria.yml", "text.txt", "meta.json", "axe.json", "provenance.json", "page.png", "page-full.png"].filter((f) =>
    existsSync(path.join(dirOnDisk, f))
  );
  return `<p class="govuk-body-s parity-files">${files.map((f) => `<a class="govuk-link" href="${base}/${f}">${f}</a>`).join(" · ")}</p>`;
}

function captureCard({ label, colour, dirOnDisk, href, depth }) {
  const up = "../".repeat(depth);
  if (!existsSync(path.join(dirOnDisk, "page.png"))) {
    return `<div class="parity-card parity-card--empty"><h3 class="govuk-heading-s">${tag(label, colour)}</h3><p class="govuk-body-s">Not captured</p></div>`;
  }
  const provenance = readJson(path.join(dirOnDisk, "provenance.json")) ?? {};
  const axe = axeSummary(path.join(dirOnDisk, "axe.json"));
  const wide = existsSync(path.join(dirOnDisk, "page-full.png")) ? ` · <a class="govuk-link" href="${up}${href}/page-full.png">unclipped screenshot</a>` : "";
  return `<div class="parity-card">
    <h3 class="govuk-heading-s">${tag(label, colour)} <span class="parity-url">${esc(provenance.url ?? "")}</span></h3>
    <a href="${up}${href}/page.png" class="parity-shot"><img src="${up}${href}/page.png" alt="${esc(label)} screenshot" loading="lazy"></a>
    <p class="govuk-body-s">HTTP ${esc(provenance.status ?? "?")}${wide}</p>
    <h4 class="govuk-heading-s parity-subheading">Accessibility (axe)</h4>${axe.html}
    ${fileLinks(`${up}${href}`, dirOnDisk)}
  </div>`;
}

const CATEGORY = {
  heading: ["Headings", "blue"],
  table: ["Tables", "purple"],
  form: ["Form controls", "pink"],
  button: ["Buttons", "turquoise"],
  link: ["Links", "turquoise"],
  text: ["Text", "grey"],
  page: ["Page", "light-blue"],
  "axe-new": ["Accessibility: new in CaTH", "red"],
  "axe-fixed": ["Accessibility: fixed in CaTH", "green"],
  "axe-inherited": ["Accessibility: inherited from pip", "yellow"]
};
const categoryTag = (category) => tag(CATEGORY[category]?.[0] ?? category, CATEGORY[category]?.[1] ?? "grey");
const differenceCount = (result) => result.findings.filter((f) => f.category !== "axe-inherited").length;

function findingsBlock(result) {
  if (!result) return "";
  if (result.verdict === "not-captured") return `<div class="govuk-inset-text">Not compared: CaTH did not capture this page.</div>`;
  const differences = result.findings.filter((f) => f.category !== "axe-inherited");
  const inherited = result.findings.filter((f) => f.category === "axe-inherited");
  if (!differences.length)
    return `<div class="govuk-panel parity-outcome parity-outcome--ok"><p class="govuk-panel__body">Matches pip after normalisation${inherited.length ? ` · ${inherited.length} accessibility issue(s) inherited from pip` : ""}</p></div>`;
  const groups = Object.entries(Object.groupBy(differences, (f) => f.category));
  const rows = groups
    .map(
      ([category, items]) =>
        `<tr class="govuk-table__row"><td class="govuk-table__cell parity-category">${categoryTag(category)}</td><td class="govuk-table__cell"><ul class="govuk-list parity-findings">${items.map((f) => `<li><span class="parity-change">${esc(f.change.replace(/-/g, " "))}</span> ${esc(f.detail)}</li>`).join("")}</ul></td></tr>`
    )
    .join("");
  return `<h3 class="govuk-heading-s">${differences.length} finding${differences.length === 1 ? "" : "s"} after normalisation</h3>
    <table class="govuk-table parity-findings-table"><tbody class="govuk-table__body">${rows}</tbody></table>
    ${inherited.length ? `<p class="govuk-body-s">${categoryTag("axe-inherited")} ${inherited.map((f) => esc(f.detail.split(":")[0])).join(", ")}</p>` : ""}`;
}

const VERDICT = { intended: ["Intended", "green"], defect: ["Defect", "red"], "needs-human": ["Needs a human", "yellow"] };

function reviewBlock(id, locale) {
  const items = reviewItemsFor(id, locale);
  if (!items.length) return "";
  const counts = Object.fromEntries(Object.keys(VERDICT).map((v) => [v, items.filter((i) => i.review.verdict === v).length]));
  const order = { defect: 0, "needs-human": 1, intended: 2 };
  const rows = items
    .sort((a, b) => order[a.review.verdict] - order[b.review.verdict])
    .map(
      (item) => `<tr class="govuk-table__row"><td class="govuk-table__cell">${tag(...VERDICT[item.review.verdict])}</td>
      <td class="govuk-table__cell">${categoryTag(item.category)}<br><span class="parity-change">${esc(item.change.replace(/-/g, " "))}</span> ${esc(item.detail)}</td>
      <td class="govuk-table__cell">${esc(item.review.reason)}${item.review.evidence ? `<blockquote class="parity-evidence">${esc(item.review.evidence)}</blockquote>` : ""}</td></tr>`
    )
    .join("");
  return `<div class="parity-review">
    <h3 class="govuk-heading-m">Review against the ticket</h3>
    <p class="govuk-body">${tag(`${counts.defect} defects`, "red")} ${tag(`${counts["needs-human"]} need a human`, "yellow")} ${tag(`${counts.intended} intended`, "green")} <span class="govuk-hint parity-inline-hint">Requirements: <code>${esc(items[0].requirementsSource ?? "none")}</code></span></p>
    <table class="govuk-table"><thead class="govuk-table__head"><tr class="govuk-table__row"><th class="govuk-table__header">Verdict</th><th class="govuk-table__header">Finding</th><th class="govuk-table__header">Reason and evidence</th></tr></thead><tbody class="govuk-table__body">${rows}</tbody></table>
  </div>`;
}

function statCard(number, label, detail = "") {
  return `<div class="parity-stat"><p class="parity-stat__number">${esc(number)}</p><p class="parity-stat__label">${esc(label)}</p>${detail ? `<p class="parity-stat__detail">${detail}</p>` : ""}</div>`;
}

function filterBox(tableId, placeholder) {
  return `<div class="govuk-form-group parity-filter"><label class="govuk-label" for="filter-${tableId}">Filter</label><input class="govuk-input govuk-!-width-one-half" id="filter-${tableId}" type="search" data-filter-for="${tableId}" placeholder="${esc(placeholder)}"></div>`;
}

// ---------- list pages ----------
const listRows = [];
let pipListAxe = 0;
let cathListAxe = 0;
for (const publication of manifest.publications) {
  const status = {};
  const sections = [];
  for (const locale of LOCALES) {
    const rel = `${publication.id}/${locale}/default`;
    const pipDir = path.join(args.lists, "pip", rel);
    const cathDir = path.join(args.lists, "cath", rel);
    const both = existsSync(path.join(pipDir, "aria.yml")) && existsSync(path.join(cathDir, "aria.yml"));
    if (locale === "en") {
      pipListAxe += axeSummary(path.join(pipDir, "axe.json")).count;
      cathListAxe += axeSummary(path.join(cathDir, "axe.json")).count;
    }
    const ariaDiff = both ? unifiedDiff(path.join(pipDir, "aria.yml"), path.join(cathDir, "aria.yml"), "pip", "CaTH") : null;
    const textDiff = both ? unifiedDiff(path.join(pipDir, "text.txt"), path.join(cathDir, "text.txt"), "pip", "CaTH") : null;
    status[locale] = ariaDiff === null ? null : changedLineCount(ariaDiff);
    sections.push(`<div class="govuk-tabs__panel${locale === "cy" ? " govuk-tabs__panel--hidden" : ""}" id="tab-${locale}">
      <h2 class="govuk-heading-m">${locale === "en" ? "English" : "Welsh"}</h2>
      <div class="parity-pair">
        ${captureCard({ label: "pip", colour: "blue", dirOnDisk: pipDir, href: `data/lists/pip/${rel}`, depth: 1 })}
        ${captureCard({ label: "CaTH", colour: "purple", dirOnDisk: cathDir, href: `data/lists/cath/${rel}`, depth: 1 })}
      </div>
      ${
        ariaDiff === null
          ? `<div class="govuk-inset-text">No comparison: ${publication.cathListType ? "CaTH page not captured (needs sign-in)" : "CaTH has no equivalent list type"}.</div>`
          : `${reviewBlock(publication.id, locale)}${findingsBlock(resultFor(publication.id, locale))}
             <details class="govuk-details"><summary class="govuk-details__summary"><span class="govuk-details__summary-text">Raw accessibility tree differences ${ariaDiff ? tag(`${status[locale]} lines`, "red") : tag("identical", "green")}</span></summary><div class="govuk-details__text">${ariaDiff ? diffBlock(ariaDiff) : "Identical."}</div></details>
             <details class="govuk-details"><summary class="govuk-details__summary"><span class="govuk-details__summary-text">Raw visible text differences ${textDiff ? tag(`${changedLineCount(textDiff)} lines`, "red") : tag("identical", "green")}</span></summary><div class="govuk-details__text">${textDiff ? diffBlock(textDiff) : "Identical."}</div></details>`
      }
    </div>`);
  }

  const notes = (publication.notes ?? []).map((n) => `<li>${esc(n)}</li>`).join("");
  layout({
    file: `lists/${publication.id}.html`,
    depth: 1,
    active: "lists.html",
    title: publication.listType,
    body: `<a href="../lists.html" class="govuk-back-link">All list pages</a>
    <span class="govuk-caption-l">List page</span><h1 class="govuk-heading-l parity-break">${esc(publication.listType)}</h1>
    <dl class="govuk-summary-list govuk-summary-list--no-border parity-meta">
      ${[
        ["pip page", publication.paths.pip],
        ["CaTH page", publication.paths.cath ?? "none"],
        ["CaTH list type", publication.cathListType ?? "none"],
        ["Location", publication.locationId],
        ["Content date", publication.contentDate],
        ["Payload", `${publication.format} · ${publication.origin}`]
      ]
        .map(
          ([k, v]) =>
            `<div class="govuk-summary-list__row"><dt class="govuk-summary-list__key">${esc(k)}</dt><dd class="govuk-summary-list__value"><code>${esc(v)}</code></dd></div>`
        )
        .join("")}
    </dl>
    ${notes ? `<div class="govuk-inset-text"><ul class="govuk-list govuk-list--bullet">${notes}</ul></div>` : ""}
    <div class="govuk-tabs" data-module="govuk-tabs"><ul class="govuk-tabs__list">
      <li class="govuk-tabs__list-item govuk-tabs__list-item--selected"><a class="govuk-tabs__tab" href="#tab-en">English</a></li>
      <li class="govuk-tabs__list-item"><a class="govuk-tabs__tab" href="#tab-cy">Welsh</a></li>
    </ul>${sections.join("")}</div>`
  });

  const cell = (locale) => {
    const result = resultFor(publication.id, locale);
    if (!result || result.verdict === "not-captured" || status[locale] === null) return `<td class="govuk-table__cell">${tag("not compared", "grey")}</td>`;
    const count = differenceCount(result);
    return `<td class="govuk-table__cell">${count === 0 ? tag("match", "green") : tag(`${count} finding${count === 1 ? "" : "s"}`, count > 10 ? "red" : "orange")}</td>`;
  };
  listRows.push(`<tr class="govuk-table__row">
    <td class="govuk-table__cell"><a class="govuk-link parity-break" href="lists/${publication.id}.html">${esc(publication.listType)}</a></td>
    <td class="govuk-table__cell">${tag(publication.format, publication.format === "excel" ? "turquoise" : publication.format === "flat-file" ? "grey" : "blue")}</td>
    ${cell("en")}${cell("cy")}
    <td class="govuk-table__cell govuk-body-s">${(publication.notes ?? []).map(esc).join("<br>")}</td></tr>`);
}
layout({
  file: "lists.html",
  active: "lists.html",
  title: "List pages",
  body: `<h1 class="govuk-heading-l">List pages</h1>
  <p class="govuk-body">Each list type is seeded into pip and CaTH from the same fixture, then captured in English and Welsh. Differences are raw accessibility-tree diffs before any normalisation, so artefact IDs and formatting-only markup still show.</p>
  ${filterBox("lists-table", "list type, format or note")}
  <table class="govuk-table" id="lists-table"><thead class="govuk-table__head"><tr class="govuk-table__row">
    <th class="govuk-table__header">List type</th><th class="govuk-table__header">Payload</th><th class="govuk-table__header">English</th><th class="govuk-table__header">Welsh</th><th class="govuk-table__header">Notes</th>
  </tr></thead><tbody class="govuk-table__body">${listRows.join("")}</tbody></table>
  ${manifest.unmatched?.length ? `<h2 class="govuk-heading-m">Not in the baseline (${manifest.unmatched.length})</h2><ul class="govuk-list govuk-list--bullet">${manifest.unmatched.map((u) => `<li><code>${esc(u.listType)}</code> – ${esc(u.reason)}</li>`).join("")}</ul>` : ""}`
});

// ---------- other pages ----------
const pageEntries = (args.pages ? readLines(path.join(args.pages, "index.jsonl")) : []).filter(
  (e) => e.state === "default" && e.locale === "en" && (!ONLY || ONLY.has(e.id))
);
const pageRows = [];
let pipPageAxe = 0;
for (const entry of pageEntries.sort((a, b) => a.source.route.localeCompare(b.source.route))) {
  const dirs = Object.fromEntries(LOCALES.map((l) => [l, path.join(args.pages, entry.id, l, "default")]));
  const axeCount = axeSummary(path.join(dirs.en, "axe.json")).count;
  pipPageAxe += axeCount;
  const heading = ariaHeading(path.join(dirs.en, "aria.yml"));
  const expanded = LOCALES.some((l) => existsSync(path.join(args.pages, entry.id, l, "expanded")));
  const mapping = routeMap.get(entry.source.route);
  const cathDirs = args["cath-pages"] ? Object.fromEntries(LOCALES.map((l) => [l, path.join(args["cath-pages"], entry.id, l, "default")])) : null;
  const hasCath = cathDirs && existsSync(path.join(cathDirs.en, "page.png"));
  const mappingNote = mapping
    ? `<p class="govuk-body">CaTH equivalent: ${mapping.cath ? `<code>${esc(mapping.cath)}</code> ${tag(mapping.match === "same-path" ? "same path" : `suggested, ${mapping.confidence} confidence`, mapping.match === "same-path" || mapping.confidence === "high" ? "green" : "yellow")}` : tag("none mapped", "grey")}</p>`
    : "";
  const sections = LOCALES.map(
    (locale) => `<div class="govuk-tabs__panel${locale === "cy" ? " govuk-tabs__panel--hidden" : ""}" id="tab-${locale}">
      <div class="parity-pair">
        ${captureCard({ label: "pip", colour: "blue", dirOnDisk: dirs[locale], href: `data/pages/${entry.id}/${locale}/default`, depth: 1 })}
        ${hasCath ? captureCard({ label: "CaTH", colour: "purple", dirOnDisk: cathDirs[locale], href: `data/cath-pages/${entry.id}/${locale}/default`, depth: 1 }) : `<div class="parity-card parity-card--empty"><h3 class="govuk-heading-s">${tag("CaTH", "purple")}</h3><p class="govuk-body-s">${mapping?.cath ? "Not captured yet: CaTH sign-in, or a dynamic route, is still needed." : "No CaTH equivalent mapped."}</p></div>`}
      </div>
      ${hasCath ? findingsBlock(pageResultFor(entry.id, locale)) : ""}
    </div>`
  ).join("");
  layout({
    file: `pages/${entry.id}.html`,
    depth: 1,
    active: "pages.html",
    title: entry.source.route,
    body: `<a href="../pages.html" class="govuk-back-link">All pages</a>
    <span class="govuk-caption-l">pip page · ${esc(entry.source.viewAs ?? "signed out")}</span><h1 class="govuk-heading-l parity-break"><code>${esc(entry.source.route)}</code></h1>
    <p class="govuk-body">${esc(heading)}</p>${mappingNote}
    <div class="govuk-tabs" data-module="govuk-tabs"><ul class="govuk-tabs__list">
      <li class="govuk-tabs__list-item govuk-tabs__list-item--selected"><a class="govuk-tabs__tab" href="#tab-en">English</a></li>
      <li class="govuk-tabs__list-item"><a class="govuk-tabs__tab" href="#tab-cy">Welsh</a></li>
    </ul>${sections}</div>
    ${expanded ? `<div class="govuk-inset-text">This page also has an <strong>expanded</strong> state (collapsed content opened): <a class="govuk-link" href="../data/pages/${entry.id}/en/expanded/page.png">English</a> · <a class="govuk-link" href="../data/pages/${entry.id}/cy/expanded/page.png">Welsh</a></div>` : ""}`
  });
  const compareCell = (locale) => {
    const result = hasCath ? pageResultFor(entry.id, locale) : null;
    if (!result) return `<td class="govuk-table__cell">${tag(mapping?.cath ? "not captured" : "no CaTH page", "grey")}</td>`;
    const count = differenceCount(result);
    return `<td class="govuk-table__cell">${count === 0 ? tag("match", "green") : tag(`${count} finding${count === 1 ? "" : "s"}`, count > 10 ? "red" : "orange")}</td>`;
  };
  pageRows.push(`<tr class="govuk-table__row">
    <td class="govuk-table__cell"><a class="govuk-link" href="pages/${entry.id}.html"><code>${esc(entry.source.route)}</code></a></td>
    <td class="govuk-table__cell">${entry.source.viewAs ? tag(entry.source.viewAs, "grey") : tag("signed out", "green")}</td>
    <td class="govuk-table__cell">${esc(heading)}</td>
    <td class="govuk-table__cell">${mapping?.cath ? `<code>${esc(mapping.cath)}</code>` : "—"}</td>
    ${compareCell("en")}${compareCell("cy")}
    <td class="govuk-table__cell"><a href="pages/${entry.id}.html"><img class="parity-thumb" src="data/pages/${entry.id}/en/default/page.png" alt="" loading="lazy"></a></td></tr>`);
}
layout({
  file: "pages.html",
  active: "pages.html",
  title: "Other pages",
  body: `<h1 class="govuk-heading-l">Other pages</h1>
  <p class="govuk-body">Every user-facing pip page from the route inventory, captured as the role its guard requires. CaTH pages come from <code>tools/ui-baseline/routes/route-map.json</code>; those that need CaTH sign-in are not captured yet.</p>
  ${filterBox("pages-table", "route, role or heading")}
  <table class="govuk-table" id="pages-table"><thead class="govuk-table__head"><tr class="govuk-table__row">
    <th class="govuk-table__header">Route</th><th class="govuk-table__header">Captured as</th><th class="govuk-table__header">Heading</th><th class="govuk-table__header">CaTH page</th><th class="govuk-table__header">English</th><th class="govuk-table__header">Welsh</th><th class="govuk-table__header">Preview</th>
  </tr></thead><tbody class="govuk-table__body">${pageRows.join("")}</tbody></table>`
});

// ---------- journeys ----------
const journeyIds =
  args.journeys && existsSync(args.journeys)
    ? readdirSync(args.journeys)
        .filter((n) => statSync(path.join(args.journeys, n)).isDirectory())
        .sort()
    : [];
const journeyRows = [];
let checkpointTotal = 0;
let journeyRuns = 0;
let journeyFailures = 0;
for (const id of journeyIds) {
  const records = LOCALES.map((locale) => ({ locale, record: readJson(path.join(args.journeys, id, locale, "journey.json")) })).filter((r) => r.record);
  if (!records.length) continue;
  const first = records[0].record;
  const panels = records.map(({ locale, record }) => {
    journeyRuns++;
    checkpointTotal += record.steps.length;
    if (!record.ok) journeyFailures++;
    const base = `../data/journeys/${id}/${locale}`;
    const steps = record.steps
      .map(
        (step, i) => `<li class="parity-step">
        <div class="parity-step__number">${i + 1}</div>
        <div class="parity-step__body">
          ${step.via ? `<p class="parity-step__via">${esc(step.via)}</p>` : `<p class="parity-step__via">Start</p>`}
          <div class="parity-step__card">
            <a href="${base}/${step.step}/page.png" class="parity-step__shot"><img src="${base}/${step.step}/page.png" alt="${esc(step.step)}" loading="lazy"></a>
            <div>
              <h3 class="govuk-heading-s">${esc(step.h1?.[0] || step.title || step.step)}</h3>
              <p class="govuk-body-s"><code>${esc(step.path)}</code></p>
              ${step.note ? `<div class="govuk-warning-text parity-note"><span class="govuk-warning-text__icon" aria-hidden="true">!</span><strong class="govuk-warning-text__text">${esc(step.note)}</strong></div>` : ""}
              <p class="govuk-body-s parity-files"><a class="govuk-link" href="${base}/${step.step}/aria.yml">aria.yml</a> · <a class="govuk-link" href="${base}/${step.step}/text.txt">text.txt</a> · <a class="govuk-link" href="${base}/${step.step}/axe.json">axe.json</a> · <a class="govuk-link" href="${base}/${step.step}/meta.json">meta.json</a></p>
            </div>
          </div>
        </div></li>`
      )
      .join("");
    const video = existsSync(path.join(args.journeys, id, locale, "video.webm"))
      ? `<video class="parity-video" controls preload="metadata" src="${base}/video.webm"></video>`
      : "";
    const outcome = record.ok
      ? `<div class="govuk-panel parity-outcome parity-outcome--ok"><p class="govuk-panel__body">Completed · ${record.steps.length} steps</p></div>`
      : `<div class="govuk-error-summary" data-module="govuk-error-summary"><div role="alert"><h2 class="govuk-error-summary__title">Journey stopped after ${record.steps.length} steps</h2><div class="govuk-error-summary__body"><pre class="parity-error">${esc(record.error)}</pre></div></div></div>`;
    return `<div class="govuk-tabs__panel${locale === "cy" ? " govuk-tabs__panel--hidden" : ""}" id="tab-${locale}">${outcome}${video}<ol class="parity-steps">${steps}</ol></div>`;
  });
  layout({
    file: `journeys/${id}.html`,
    depth: 1,
    active: "journeys.html",
    title: id,
    body: `<a href="../journeys.html" class="govuk-back-link">All journeys</a>
    <span class="govuk-caption-l">pip journey · signed in as ${esc(first.viewAs ?? "nobody")}</span><h1 class="govuk-heading-l">${esc(id)}</h1>
    <p class="govuk-body-l">${esc(first.description)}</p>
    <div class="govuk-tabs" data-module="govuk-tabs"><ul class="govuk-tabs__list">
      ${records.map(({ locale }, i) => `<li class="govuk-tabs__list-item${i === 0 ? " govuk-tabs__list-item--selected" : ""}"><a class="govuk-tabs__tab" href="#tab-${locale}">${locale === "en" ? "English" : "Welsh"}</a></li>`).join("")}
    </ul>${panels.join("")}</div>`
  });
  const cell = (locale) => {
    const r = records.find((x) => x.locale === locale)?.record;
    return `<td class="govuk-table__cell">${r ? (r.ok ? tag(`${r.steps.length} steps`, "green") : tag("stopped", "red")) : tag("not run", "grey")}</td>`;
  };
  const notes = records.some(({ record }) => record.steps.some((s) => s.note));
  journeyRows.push(`<tr class="govuk-table__row">
    <td class="govuk-table__cell"><a class="govuk-link" href="journeys/${id}.html">${esc(id)}</a>${notes ? `<br>${tag("has noted steps", "yellow")}` : ""}</td>
    <td class="govuk-table__cell">${esc(first.description)}</td>
    <td class="govuk-table__cell">${tag(first.viewAs ?? "signed out", "grey")}</td>${cell("en")}${cell("cy")}</tr>`);
}
layout({
  file: "journeys.html",
  active: "journeys.html",
  title: "Journeys",
  body: `<h1 class="govuk-heading-l">Journeys</h1>
  <p class="govuk-body">pip's user flows, ported from its own end-to-end tests and run against a freshly seeded pip stack. Every step is captured like a page, with a video of the whole journey in each language.</p>
  ${filterBox("journeys-table", "journey, role or description")}
  <table class="govuk-table" id="journeys-table"><thead class="govuk-table__head"><tr class="govuk-table__row">
    <th class="govuk-table__header">Journey</th><th class="govuk-table__header">What it does</th><th class="govuk-table__header">Signed in as</th><th class="govuk-table__header">English</th><th class="govuk-table__header">Welsh</th>
  </tr></thead><tbody class="govuk-table__body">${journeyRows.join("")}</tbody></table>`
});

// ---------- known defects ----------
const defectsMarkdown = args.defects && existsSync(args.defects) ? readFileSync(args.defects, "utf-8") : "";
const defectRows = defectsMarkdown
  .split("\n")
  .filter((line) => line.startsWith("|") && !/^\|\s*-/.test(line))
  .slice(1)
  .map((line) =>
    line
      .split("|")
      .slice(1, -1)
      .map((cell) => cell.trim())
  );
const inline = (text) => esc(text).replace(/`([^`]+)`/g, "<code>$1</code>");
layout({
  file: "defects.html",
  active: "defects.html",
  title: "Known pip defects",
  body: `<h1 class="govuk-heading-l">Known pip defects</h1>
  <p class="govuk-body">pip getting it wrong, found while building the baseline. The baseline records pip as it behaves; where CaTH differs because it does not have one of these defects, that difference is intended.</p>
  <table class="govuk-table"><thead class="govuk-table__head"><tr class="govuk-table__row"><th class="govuk-table__header">Where</th><th class="govuk-table__header">Defect</th><th class="govuk-table__header">Found by</th></tr></thead>
  <tbody class="govuk-table__body">${defectRows.map((cells) => `<tr class="govuk-table__row">${cells.map((c) => `<td class="govuk-table__cell">${inline(c)}</td>`).join("")}</tr>`).join("")}</tbody></table>`
});

// ---------- comparison ----------
if (comparison) {
  const t = comparison.totals;
  const compared = comparison.results.filter((r) => r.verdict !== "not-captured");
  // Counted as pages: a page matches only if every language and state of it matches
  const pagesCompared = new Set(compared.map((r) => r.id));
  const pagesMatching = [...pagesCompared].filter((id) => compared.filter((r) => r.id === id).every((r) => r.verdict === "match")).length;
  const pagesNotCompared = new Set(comparison.results.filter((r) => r.verdict === "not-captured" && !pagesCompared.has(r.id)).map((r) => r.id));
  const byCategory = Object.entries(
    Object.groupBy(
      compared.flatMap((r) => r.findings.filter((f) => f.category !== "axe-inherited")),
      (f) => f.category
    )
  ).sort((a, b) => b[1].length - a[1].length);
  const WIDE = 5;
  const patternRows = comparison.patterns
    .filter((p) => p.pages.length >= WIDE)
    .map(
      (p) => `<tr class="govuk-table__row">
      <td class="govuk-table__cell parity-count">${p.pages.length}</td>
      <td class="govuk-table__cell">${categoryTag(p.category)}</td>
      <td class="govuk-table__cell"><span class="parity-change">${esc(p.change.replace(/-/g, " "))}</span> ${esc(p.detail)}
        <details class="govuk-details parity-pages"><summary class="govuk-details__summary"><span class="govuk-details__summary-text">Pages</span></summary><div class="govuk-details__text">${p.pages
          .map((page) => {
            const [id, locale] = page.split(" ");
            return `<a class="govuk-link" href="lists/${esc(id)}.html#tab-${esc(locale)}">${esc(page)}</a>`;
          })
          .join(", ")}</div></details></td></tr>`
    )
    .join("");
  const narrow = comparison.patterns.filter((p) => p.pages.length < WIDE);
  const narrowRows = narrow
    .map(
      (p) =>
        `<tr class="govuk-table__row"><td class="govuk-table__cell">${p.pages.length}</td><td class="govuk-table__cell">${categoryTag(p.category)}</td><td class="govuk-table__cell"><span class="parity-change">${esc(p.change.replace(/-/g, " "))}</span> ${esc(p.detail)} <span class="govuk-hint parity-inline-hint">(${p.pages.map(esc).join(", ")})</span></td></tr>`
    )
    .join("");
  layout({
    file: "comparison.html",
    active: "comparison.html",
    title: "Comparison",
    body: `<h1 class="govuk-heading-l">pip against CaTH: list pages</h1>
    <p class="govuk-body">From <code>parity compare</code>, after removing known noise (IDs and dates from seeding, quote styles, live-region announcements, link hosts). Each finding is a structural difference; whether it is intended is decided against the ticket in the next step.</p>
    <div class="parity-stats">
      ${statCard(pagesCompared.size, `${plural(pagesCompared.size, "page", "pages")} compared`, `${compared.length} page-language ${plural(compared.length, "pair", "pairs")}`)}
      ${statCard(pagesMatching, `${plural(pagesMatching, "page matches", "pages match")} pip`, "in every language, after normalisation")}
      ${statCard(pagesCompared.size - pagesMatching, plural(pagesCompared.size - pagesMatching, "page differs", "pages differ"), `${compared.reduce((sum, r) => sum + differenceCount(r), 0)} findings across ${t.differs} page-language ${plural(t.differs, "pair", "pairs")}`)}
      ${statCard(pagesNotCompared.size, `${plural(pagesNotCompared.size, "page", "pages")} not compared`, "CaTH has no page, or it needs sign-in")}
    </div>
    <h2 class="govuk-heading-m">Findings by category</h2>
    <p class="govuk-body">${byCategory.map(([c, items]) => `${categoryTag(c)} ${items.length}`).join(" &nbsp; ")}</p>
    <h2 class="govuk-heading-m">Patterns across ${WIDE} or more pages</h2>
    <p class="govuk-body">The same finding on several pages usually has one cause, such as a shared template or locale setting, so these are the places to start.</p>
    ${filterBox("patterns-table", "category, change or detail")}
    <table class="govuk-table" id="patterns-table"><thead class="govuk-table__head"><tr class="govuk-table__row"><th class="govuk-table__header">Pages</th><th class="govuk-table__header">Category</th><th class="govuk-table__header">Finding</th></tr></thead>
    <tbody class="govuk-table__body">${patternRows}</tbody></table>
    ${narrow.length ? `<details class="govuk-details"><summary class="govuk-details__summary"><span class="govuk-details__summary-text">${narrow.length} smaller patterns (2 to ${WIDE - 1} pages)</span></summary><div class="govuk-details__text"><table class="govuk-table"><tbody class="govuk-table__body">${narrowRows}</tbody></table></div></details>` : ""}`
  });
}

// ---------- overview ----------
// A focused check leads with its verdict; the full baseline leads with what it covers
if (ONLY) {
  const allReviewItems = reviews.flatMap((review) => review.items.filter((item) => item.review));
  const count = (verdict) => allReviewItems.filter((item) => item.review.verdict === verdict).length;
  const checked = [
    ...manifest.publications.map((p) => ({
      label: p.listType,
      href: `lists/${p.id}.html`,
      id: p.id,
      kind: "List page",
      result: (locale) => resultFor(p.id, locale)
    })),
    ...pageEntries.map((e) => ({ label: e.source.route, href: `pages/${e.id}.html`, id: e.id, kind: "Page", result: (locale) => pageResultFor(e.id, locale) }))
  ];
  const rows = checked
    .map((item) => {
      const items = allReviewItems.filter((r) => r.pages.some((page) => page.startsWith(`${item.id} `)));
      const verdictTags = items.length
        ? [
            ["defect", "red", "defects"],
            ["needs-human", "yellow", "need a human"],
            ["intended", "green", "intended"]
          ]
            .map(([v, colour, label]) => tag(`${items.filter((r) => r.review.verdict === v).length} ${label}`, colour))
            .join(" ")
        : tag("not reviewed", "grey");
      const perLocale = LOCALES.map((locale) => {
        const result = item.result(locale);
        return `<td class="govuk-table__cell">${!result || result.verdict === "not-captured" ? tag("not compared", "grey") : differenceCount(result) === 0 ? tag("match", "green") : tag(`${differenceCount(result)} findings`, "orange")}</td>`;
      }).join("");
      return `<tr class="govuk-table__row"><td class="govuk-table__cell"><a class="govuk-link parity-break" href="${item.href}">${esc(item.label)}</a><br><span class="govuk-hint parity-inline-hint">${item.kind}</span></td>${perLocale}<td class="govuk-table__cell">${verdictTags}</td></tr>`;
    })
    .join("");
  layout({
    file: "index.html",
    active: "index.html",
    title: args.title ?? "Parity check",
    body: `<h1 class="govuk-heading-xl">${esc(args.title ?? "Parity check")}</h1>
    <p class="govuk-body-l">CaTH captured with the same data as the pip baseline, compared page by page${reviews.length ? " and reviewed against the ticket" : ""}.</p>
    <div class="parity-stats">
      ${reviews.length ? statCard(count("defect"), "defects", "differences the ticket does not explain") : ""}
      ${reviews.length ? statCard(count("needs-human"), "need a human", "e.g. Welsh wording the ticket does not give") : ""}
      ${reviews.length ? statCard(count("intended"), "intended", "backed by a quoted ticket line or known pip defect") : ""}
      ${statCard(checked.length, plural(checked.length, "page checked", "pages checked"), "in English and Welsh")}
    </div>
    <table class="govuk-table"><thead class="govuk-table__head"><tr class="govuk-table__row"><th class="govuk-table__header">Checked</th><th class="govuk-table__header">English</th><th class="govuk-table__header">Welsh</th><th class="govuk-table__header">Review</th></tr></thead>
    <tbody class="govuk-table__body">${rows}</tbody></table>
    ${run ? "" : `<p class="govuk-body-s">Compared against the pip baseline in <code>${esc(args.lists)}</code>.</p>`}`
  });
}

const cathLists = manifest.publications.filter((p) => existsSync(path.join(args.lists, "cath", p.id, "en/default/aria.yml"))).length;
if (!ONLY)
  layout({
    file: "index.html",
    active: "index.html",
    title: "Overview",
    body: `<h1 class="govuk-heading-xl">${esc(args.title ?? "pip baseline")}</h1>
  <p class="govuk-body-l">What pip-frontend shows, captured from pip running locally on its real backends, ready to compare CaTH against.</p>
  <div class="parity-stats">
    ${statCard(manifest.publications.length, "list pages", `${cathLists} also captured in CaTH`)}
    ${statCard(pageEntries.length, "other pages", "public, verified, admin, system admin")}
    ${statCard(journeyIds.length, "journeys", `${journeyRuns} runs · ${checkpointTotal} steps${journeyFailures ? ` · ${journeyFailures} stopped` : ""}`)}
    ${statCard(defectRows.length, "known pip defects", "recorded, not reproduced in CaTH")}
  </div>
  <div class="parity-stats">
    ${statCard(pipListAxe, "axe violations on pip list pages", "English")}
    ${statCard(cathListAxe, "axe violations on CaTH list pages", "English")}
    ${statCard(pipPageAxe, "axe violations on other pip pages", "English")}
  </div>
  ${
    run
      ? `<h2 class="govuk-heading-m">Baseline run</h2><dl class="govuk-summary-list">
    <div class="govuk-summary-list__row"><dt class="govuk-summary-list__key">pip commits</dt><dd class="govuk-summary-list__value"><code>${esc(run.pip)}</code></dd></div>
    <div class="govuk-summary-list__row"><dt class="govuk-summary-list__key">Finished</dt><dd class="govuk-summary-list__value">${esc(new Date(run.finishedAt).toLocaleString("en-GB", { timeZone: "Europe/London" }))}</dd></div>
    <div class="govuk-summary-list__row"><dt class="govuk-summary-list__key">Captures</dt><dd class="govuk-summary-list__value">${run.captures.listPages} list, ${run.captures.otherPages} page, ${run.captures.journeyCheckpoints} journey steps</dd></div>
    <div class="govuk-summary-list__row"><dt class="govuk-summary-list__key">Stopped journeys</dt><dd class="govuk-summary-list__value">${run.failedJourneys.length ? run.failedJourneys.map(esc).join("<br>") : "None"}</dd></div>
  </dl>`
      : ""
  }
  <h2 class="govuk-heading-m">How to read this</h2>
  <ul class="govuk-list govuk-list--bullet">
    <li><a class="govuk-link" href="comparison.html">Comparison</a> summarises pip against CaTH on the list pages: findings after normalisation, and the patterns that repeat across pages.</li>
    <li><a class="govuk-link" href="lists.html">List pages</a> put pip and CaTH side by side for the same publication, with the accessibility-tree and text differences.</li>
    <li><a class="govuk-link" href="pages.html">Other pages</a> and <a class="govuk-link" href="journeys.html">journeys</a> are the pip baseline only until CaTH routes and journeys are mapped.</li>
    <li>Differences here are raw. The comparison step will remove known noise (IDs, dates from seeding, formatting-only markup) and classify what is left against the ticket.</li>
  </ul>`
  });

console.log(
  `built ${OUT}: ${manifest.publications.length} list pages, ${pageEntries.length} other pages, ${journeyIds.length} journeys, ${defectRows.length} defects`
);
