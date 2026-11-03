import { readFile, writeFile } from "node:fs/promises";
import { inRecordingScope, loadRecordingScope } from "../scope.js";

// Trims a capture targets file to a ticket recording's scope (UI_BASELINE_SCOPE), keeping each
// page's variants and mobile capture with it. Does nothing in a full recording.
//   tsx tools/ui-baseline/pip/scope-targets.ts lists|pages <targets.json>
const [area, file] = process.argv.slice(2);
if ((area !== "lists" && area !== "pages") || !file) throw new Error("usage: scope-targets.ts lists|pages <targets.json>");

const scope = await loadRecordingScope();
if (scope) {
  const targets = JSON.parse(await readFile(file, "utf-8")) as { id: string }[];
  const kept = targets.filter((target) => inRecordingScope(scope, area, target.id));
  await writeFile(file, JSON.stringify(kept, null, 2));
  console.log(`${area}: ${kept.length} of ${targets.length} targets in ${scope.name}`);
}
