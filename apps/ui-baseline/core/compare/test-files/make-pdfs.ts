import path from "node:path";
import { fileURLToPath } from "node:url";
import { launchChromium } from "../../capture/browser.js";

// Writes the PDFs pdf-text and file-compare tests read: the same list styled two ways, as pip and
// CaTH do (fonts, sizes, borders, orientation, so different page breaks), one in a narrow column
// with a footer on every page as pip has (so words wrap at hyphens), and one with a changed row.
// Committed so unit tests need no browser; re-run with `npx tsx` to regenerate.
const DIR = path.dirname(fileURLToPath(import.meta.url));
const ROWS = Array.from(
  { length: 60 },
  (_, i) => `<tr><td>10:${String(i).padStart(2, "0")}</td><td>Court ${i % 5}</td><td>AB${1000 + i} Smith v Jones</td></tr>`
);
const PLAIN = "body{font:11px arial} td{padding:2px}";
// The wrapped copy breaks the line inside "non-devolved", as pip’s narrower columns do
const NOTE = (lineBreak = "") =>
  `<p>Find contact details and other information about courts and tribunals in England and Wales, and some non-${lineBreak}devolved tribunals in Scotland.</p>`;
const FOOTER = `<div style="font-size:8px;width:100%;text-align:center">Court and Tribunal Hearings Service PDF/UA page <span class="pageNumber"></span> of <span class="totalPages"></span>.</div>`;

const browser = await launchChromium();
const page = await browser.newPage();
const render = async (file: string, style: string, rows: string[], options: { landscape?: boolean; footer?: boolean; lineBreak?: string } = {}) => {
  await page.setContent(
    `<!doctype html><style>${style}</style><h1>Civil Daily Cause List</h1><p>List for 1 September 2023</p><table>${rows.join("")}</table>${NOTE(options.lineBreak)}`
  );
  await page.pdf({
    path: path.join(DIR, file),
    format: "A4",
    landscape: options.landscape,
    ...(options.footer ? { displayHeaderFooter: true, headerTemplate: "<div></div>", footerTemplate: FOOTER, margin: { top: "20px", bottom: "40px" } } : {})
  });
};
await render("plain.pdf", PLAIN, ROWS);
await render("styled.pdf", "body{font:16px georgia} h1{font-size:40px;color:red} td{padding:12px;border:1px solid}", ROWS, { landscape: true });
await render("wrapped.pdf", "body{font:12px arial;width:398px} td{padding:4px}", ROWS, { footer: true, lineBreak: "<br>" });
await render("changed.pdf", PLAIN, ROWS.toSpliced(3, 1, "<tr><td>10:03</td><td>Court 9</td><td>AB1003 Smith v Jones</td></tr>"));
await browser.close();
