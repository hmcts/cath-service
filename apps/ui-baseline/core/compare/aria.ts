// Parses Playwright's ariaSnapshot() YAML into the structure a comparison cares about. The format
// is a YAML list per node: `- role "accessible name" [attrs]: text`, nested by two-space indents,
// with the whole node quoted in single quotes when the name contains a colon.

export interface AriaNode {
  role: string;
  name: string;
  attributes: string[];
  text: string;
  children: AriaNode[];
}

export interface PageStructure {
  headings: { level: number; text: string }[];
  tables: { columns: string[]; rows: string[][] }[];
  controls: { role: string; label: string }[];
  buttons: string[];
  links: { text: string; url: string | null }[];
  text: string[];
}

const LINE = /^(\s*)- (.*)$/;
const CONTROL_ROLES = new Set(["textbox", "searchbox", "checkbox", "radio", "combobox", "spinbutton", "slider", "switch"]);
const TEXT_ROLES = new Set(["paragraph", "text", "listitem", "term", "definition", "strong", "emphasis", "group", "status", "alert"]);

export function parseAria(snapshot: string): AriaNode[] {
  const root: AriaNode = { role: "root", name: "", attributes: [], text: "", children: [] };
  const stack: { indent: number; node: AriaNode }[] = [{ indent: -1, node: root }];
  for (const line of snapshot.split("\n")) {
    const match = line.match(LINE);
    if (!match) continue;
    const indent = match[1].length;
    const node = parseNode(match[2]);
    while (stack.length > 1 && stack[stack.length - 1].indent >= indent) stack.pop();
    stack[stack.length - 1].node.children.push(node);
    stack.push({ indent, node });
  }
  return root.children;
}

function parseNode(raw: string): AriaNode {
  let body = raw.trim();
  let text = "";
  // A quoted node ends with `':` when it has children or `': value` when it has text
  const quoted = body.match(/^'(.*)'(?::\s*(.*))?$/);
  if (quoted) {
    body = quoted[1].replace(/''/g, "'");
    text = unquote(quoted[2] ?? "");
  } else {
    const colon = findValueColon(body);
    if (colon >= 0) {
      text = unquote(body.slice(colon + 1).trim());
      body = body.slice(0, colon);
    }
  }
  const role = body.match(/^(\/?[\w-]+)/)?.[1] ?? body;
  const name = body.match(/^\/?[\w-]+\s+"((?:[^"\\]|\\.)*)"/)?.[1]?.replace(/\\"/g, '"') ?? "";
  const attributes = [...body.matchAll(/\[([^\]]+)\]/g)].map((m) => m[1]);
  return { role, name, attributes, text, children: [] };
}

// The colon that separates a node from its text is the first one outside the quoted name
function findValueColon(body: string): number {
  let inQuote = false;
  for (let i = 0; i < body.length; i++) {
    if (body[i] === '"' && body[i - 1] !== "\\") inQuote = !inQuote;
    if (body[i] === ":" && !inQuote) return i;
  }
  return -1;
}

function unquote(value: string): string {
  const trimmed = value.trim();
  if (/^".*"$/.test(trimmed)) return trimmed.slice(1, -1).replace(/\\"/g, '"');
  if (/^'.*'$/.test(trimmed)) return trimmed.slice(1, -1).replace(/''/g, "'");
  return trimmed;
}

export function structureOf(nodes: AriaNode[]): PageStructure {
  const structure: PageStructure = { headings: [], tables: [], controls: [], buttons: [], links: [], text: [] };
  const visit = (node: AriaNode) => {
    if (node.role === "heading") {
      structure.headings.push({ level: Number(node.attributes.find((a) => a.startsWith("level="))?.slice(6) ?? 0), text: node.name || node.text });
      return;
    }
    if (node.role === "table") {
      structure.tables.push(tableOf(node));
      return;
    }
    if (CONTROL_ROLES.has(node.role)) structure.controls.push({ role: node.role, label: node.name });
    else if (node.role === "button") structure.buttons.push(node.name || node.text);
    else if (node.role === "link") {
      structure.links.push({ text: node.name || node.text, url: node.children.find((c) => c.role === "/url")?.text ?? null });
      return;
    } else if (TEXT_ROLES.has(node.role) && node.text) structure.text.push(node.text);
    for (const child of node.children) visit(child);
  };
  for (const node of nodes) visit(node);
  return structure;
}

function tableOf(table: AriaNode): { columns: string[]; rows: string[][] } {
  const rows: AriaNode[] = [];
  const collect = (node: AriaNode) => {
    if (node.role === "row") rows.push(node);
    else for (const child of node.children) collect(child);
  };
  collect(table);
  const columns: string[] = [];
  const bodyRows: string[][] = [];
  for (const row of rows) {
    const cells = row.children.filter((c) => ["cell", "columnheader", "rowheader", "gridcell"].includes(c.role));
    if (cells.length && cells.every((c) => c.role === "columnheader")) columns.push(...cells.map(cellText));
    else bodyRows.push(cells.map(cellText));
  }
  return { columns, rows: bodyRows };
}

function cellText(cell: AriaNode): string {
  if (cell.name) return cell.name;
  if (cell.text) return cell.text;
  return cell.children
    .map((c) => c.name || c.text)
    .filter(Boolean)
    .join(" ");
}
