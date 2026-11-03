import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Checks what the command line gives the check and a recording before it reaches a file path or a
// command. Names must have the shape they are documented to have, and directories the scripts
// write to (and empty first) must be inside the tool's output folder or the system's temp folder,
// so a mistyped --out, or a --ticket like "../..", can never point them anywhere else.
const OUTPUT_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "output");

export const TICKET = /^\d+$/;
export const LIST_TYPE = /^[A-Z][A-Z0-9_]{2,}$/;
// Includes CaTH's dynamic segments ("[id]") and files ("/robots.txt"); never "..", as routes name folders
export const ROUTE = /^(?!.*\.\.)\/[A-Za-z0-9[\]._/-]*$/;
export const JOURNEY = /^[a-z0-9][a-z0-9-]*$/;
export const LOCALE = /^(en|cy)$/;
export const REPO = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;

// The value, if it has the expected shape; otherwise an error naming the option
export function matching(value: string, pattern: RegExp, option: string): string {
  if (!pattern.test(value)) throw new Error(`${option} "${value}" is not valid (expected ${pattern.source})`);
  return value;
}

// The path, resolved, if it is inside the output folder, the system temp folder or the hosted app's
// data folder; never one of those folders itself, which a script emptying its --out would empty
export function confinedPath(value: string, option: string): string {
  const resolved = path.resolve(value);
  const roots = [OUTPUT_DIR, tmpdir(), process.env.UI_BASELINE_DATA_DIR].filter((root): root is string => !!root).map((root) => path.resolve(root));
  if (!roots.some((root) => resolved.startsWith(`${root}${path.sep}`))) throw new Error(`${option} must be inside ${roots.join(" or ")}, not ${resolved}`);
  return resolved;
}

// An http(s) address, such as the CaTH a check is pointed at with --target
export function httpUrl(value: string, option: string): string {
  const url = new URL(value);
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error(`${option} must be an http or https address, not ${value}`);
  return value;
}
