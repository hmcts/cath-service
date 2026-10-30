import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

// Writes the PDFs pdf-text and file-compare tests read: the same list styled two ways, as pip and
// CaTH do (fonts, sizes, borders, orientation, so different page breaks), and one with a changed
// row. Committed so unit tests need no browser; re-run with `npx tsx` to regenerate.
const DIR = path.dirname(fileURLToPath(import.meta.url));
const ROWS = Array.from(
  { length: 60 },
  (_, i) => `<tr><td>10:${String(i).padStart(2, "0")}</td><td>Court ${i % 5}</td><td>AB${1000 + i} Smith v Jones</td></tr>`
);
const PLAIN = "body{font:11px arial} td{padding:2px}";

const browser = await chromium.launch();
const page = await browser.newPage();
const render = async (file: string, style: string, rows: string[], landscape = false) => {
  await page.setContent(`<!doctype html><style>${style}</style><h1>Civil Daily Cause List</h1><p>List for 1 September 2023</p><table>${rows.join("")}</table>`);
  await page.pdf({ path: path.join(DIR, file), format: "A4", landscape });
};
await render("plain.pdf", PLAIN, ROWS);
await render("styled.pdf", "body{font:16px georgia} h1{font-size:40px;color:red} td{padding:12px;border:1px solid}", ROWS, true);
await render("changed.pdf", PLAIN, ROWS.toSpliced(3, 1, "<tr><td>10:03</td><td>Court 9</td><td>AB1003 Smith v Jones</td></tr>"));
await browser.close();
