import { parseArgs } from "node:util";
import { compareArtefactFiles } from "./artefact-files.js";
import { ARTEFACT_ID, matching } from "./cli-input.js";
import { EXIT_DIFFERENCES } from "./exit-codes.js";

// Compares the PDF and Excel files pip and CaTH made for a publication uploaded to both, by its
// artefact id in each (artefact-files.ts). PDFs by text only, Excel files cell by cell. Exits 1
// when any file differs or only one app made it.
//   yarn ui-baseline:compare-files --pip <artefact id> --cath <artefact id> [--env aat] [--name civil-list]
const { values: args } = parseArgs({
  options: {
    env: { type: "string", default: "aat" },
    pip: { type: "string" },
    cath: { type: "string" },
    name: { type: "string" },
    out: { type: "string" }
  }
});
if (!args.pip || !args.cath) throw new Error("--pip and --cath (the publication's artefact id in each app) are required");
matching(args.pip, ARTEFACT_ID, "--pip");
matching(args.cath, ARTEFACT_ID, "--cath");

const { out, summary, pipHasFiles, cathHasFiles, links } = await compareArtefactFiles({
  env: args.env,
  pipArtefactId: args.pip,
  cathArtefactId: args.cath,
  name: args.name,
  out: args.out
});
if (!pipHasFiles) console.log(`pip has no files for ${args.pip}: check the id, and that pip has finished processing it`);
if (!cathHasFiles) console.log(`CaTH has no files for ${args.cath}: check the id, and that CaTH has finished processing it`);
const t = summary.totals;
console.log(`${t.files} files: ${t.match} match, ${t.differs} differ, ${t.missing} CaTH did not make, ${t.extra} only CaTH made`);
for (const result of summary.results.filter((r) => r.verdict !== "match")) {
  console.log(`\n${result.kind}: ${result.verdict}`);
  for (const finding of result.findings) console.log(`  ${finding.change.replace(/-/g, " ")}: ${finding.detail}`);
}
if (links) console.log(`\n${links.listType}:\n  CaTH: ${links.cath ?? "no page"}\n  pip:  ${links.pip ?? "no page"}`);
console.log(`\n→ ${out}/compare/files-compare.json`);
process.exit(t.differs || t.missing || t.extra ? EXIT_DIFFERENCES : 0);
