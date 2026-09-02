#!/usr/bin/env node

// Asserts what .github/renovate.json actually resolves to, by calling Renovate's own
// applyPackageRules against the real config file.
//
// Why this exists rather than a vitest test asserting the JSON's literals: a test that
// reads renovate.json and checks it contains matchUpdateTypes: ["minor","patch"] proves
// nothing about Renovate's resolution semantics. packageRules are order-dependent and
// last-match-wins, matchCurrentVersion needs a `versioning` to compare against, and a
// grouped branch automerges only if every upgrade in it does
// (workers/repository/updates/generate.js: config.upgrades.every(u => u.automerge)).
// Those are the parts that break silently. During #889 an ad-hoc version of this harness
// was run and then deleted; its fixtures omitted `versioning`, which produced a false
// negative on matchCurrentVersion that went unnoticed precisely because nothing was
// committed. Hence this file.
//
// Renovate is not a devDependency here - the package tree is ~333MB and it updates itself.
// The workflow installs it into a scratch prefix and passes the path in RENOVATE_MODULE.
// Locally: npm i --prefix /tmp/rv renovate
//          RENOVATE_MODULE=/tmp/rv/node_modules/renovate node scripts/verify-renovate-automerge.mjs

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = path.join(__dirname, "..", ".github", "renovate.json");
const RULES_SUBPATH = "dist/util/package-rules/index.js";

const renovateRoot = process.env.RENOVATE_MODULE;
const rulesModule = renovateRoot ? path.join(renovateRoot, RULES_SUBPATH) : `renovate/${RULES_SUBPATH}`;

let applyPackageRules;
try {
  ({ applyPackageRules } = await import(renovateRoot ? `file://${rulesModule}` : rulesModule));
} catch (error) {
  console.error(`Could not load Renovate from "${rulesModule}": ${error.code ?? error.message}`);
  console.error("Set RENOVATE_MODULE to the root of an installed renovate package.");
  process.exit(2);
}

const config = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
const base = { automerge: config.automerge, packageRules: config.packageRules };

// `versioning` is required: Renovate's matchCurrentVersion matcher calls get(versioning)
// and cannot compare a range without it.
const npmDep = (overrides) => ({
  versioning: "npm",
  manager: "npm",
  depTypes: ["dependencies"],
  depType: "dependencies",
  ...overrides
});

const devDep = (overrides) => npmDep({ depTypes: ["devDependencies"], depType: "devDependencies", ...overrides });

// [description, expected automerge, upgrade]
const CASES = [
  // Non-breaking npm updates automerge (the point of the change).
  [
    "npm minor, dependency",
    true,
    npmDep({ depName: "govuk-frontend", currentValue: "6.2.0", currentVersion: "6.2.0", newValue: "6.4.0", updateType: "minor" })
  ],
  ["npm minor, caret range", true, npmDep({ depName: "express", currentValue: "^5.2.0", currentVersion: "5.2.0", newValue: "^5.3.0", updateType: "minor" })],
  ["npm patch, devDependency", true, devDep({ depName: "vitest", currentValue: "4.1.8", currentVersion: "4.1.8", newValue: "4.1.10", updateType: "patch" })],

  // The original incident: a devDependency major that broke the GOV.UK assets.
  [
    "npm major, the PR #753 bump",
    false,
    devDep({ depName: "vite-plugin-static-copy", currentValue: "3.4.0", currentVersion: "3.4.0", newValue: "4.1.1", updateType: "major" })
  ],
  ["npm major, dependency", false, npmDep({ depName: "vite", currentValue: "7.3.6", currentVersion: "7.3.6", newValue: "8.0.0", updateType: "major" })],

  // Pre-1.0.0: a 0.x minor may break, but Renovate still calls it minor. Both matcher
  // forms are needed - neither covers every value shape on its own.
  ["pre-1.0.0 pin, minor", false, npmDep({ depName: "passport", currentValue: "0.7.0", currentVersion: "0.7.0", newValue: "0.8.0", updateType: "minor" })],
  ["pre-1.0.0 pin, patch", false, npmDep({ depName: "passport", currentValue: "0.7.0", currentVersion: "0.7.0", newValue: "0.7.1", updateType: "patch" })],
  [
    "pre-1.0.0 caret range, peerDependency",
    false,
    npmDep({
      depName: "passport",
      depTypes: ["peerDependencies"],
      depType: "peerDependencies",
      currentValue: "^0.7.0",
      newValue: "^0.8.0",
      updateType: "minor"
    })
  ],
  [
    "pre-1.0.0 tilde range",
    false,
    npmDep({
      depName: "passport",
      depTypes: ["peerDependencies"],
      depType: "peerDependencies",
      currentValue: "~0.7.0",
      newValue: "~0.8.0",
      updateType: "minor"
    })
  ],
  [
    "pre-1.0.0 compound range",
    false,
    npmDep({ depName: "hypothetical", currentValue: ">=0.5.0 <1.0.0", currentVersion: "0.5.0", newValue: ">=0.6.0 <1.0.0", updateType: "minor" })
  ],
  ["pre-1.0.0 bare major range", false, npmDep({ depName: "hypothetical", currentValue: "0", currentVersion: "0.9.0", newValue: "1", updateType: "minor" })],
  [
    "1.x is not caught by the pre-1.0.0 rules",
    true,
    npmDep({ depName: "lodash", currentValue: "4.18.1", currentVersion: "4.18.1", newValue: "4.19.0", updateType: "minor" })
  ],

  // Toolchain and deliberate pins.
  [
    "packageManager minor",
    false,
    npmDep({
      depName: "yarn",
      depTypes: ["packageManager"],
      depType: "packageManager",
      currentValue: "4.17.0",
      currentVersion: "4.17.0",
      newValue: "4.18.0",
      updateType: "minor"
    })
  ],
  [
    "packageManager patch",
    false,
    npmDep({
      depName: "yarn",
      depTypes: ["packageManager"],
      depType: "packageManager",
      currentValue: "4.17.0",
      currentVersion: "4.17.0",
      newValue: "4.17.1",
      updateType: "patch"
    })
  ],
  [
    "resolutions minor",
    false,
    npmDep({
      depName: "axios",
      depTypes: ["resolutions"],
      depType: "resolutions",
      currentValue: "1.18.1",
      currentVersion: "1.18.1",
      newValue: "1.19.0",
      updateType: "minor"
    })
  ],
  [
    "resolutions patch",
    false,
    npmDep({
      depName: "tar",
      depTypes: ["resolutions"],
      depType: "resolutions",
      currentValue: "7.5.19",
      currentVersion: "7.5.19",
      newValue: "7.5.20",
      updateType: "patch"
    })
  ],
  [
    "the same package as a plain dependency still automerges",
    true,
    npmDep({ depName: "axios", currentValue: "1.18.1", currentVersion: "1.18.1", newValue: "1.19.0", updateType: "minor" })
  ],

  // Node moves .nvmrc, four Dockerfile base images and three workflow files at once.
  [
    "node via nvm",
    false,
    {
      versioning: "node",
      manager: "nvm",
      depName: "node",
      datasource: "node-version",
      currentValue: "24.17.0",
      currentVersion: "24.17.0",
      newValue: "24.18.0",
      updateType: "minor"
    }
  ],
  [
    "node via custom regex manager",
    false,
    {
      versioning: "node",
      manager: "regex",
      depName: "node",
      datasource: "docker",
      currentValue: "22.1.0",
      currentVersion: "22.1.0",
      newValue: "22.1.1",
      updateType: "patch"
    }
  ],

  // Only npm is in scope; every other manager stays manual.
  [
    "terraform minor",
    false,
    {
      versioning: "semver",
      manager: "terraform",
      depName: "azurerm",
      currentValue: "4.10.0",
      currentVersion: "4.10.0",
      newValue: "4.11.0",
      updateType: "minor"
    }
  ],
  [
    "github-actions minor",
    false,
    {
      versioning: "docker",
      manager: "github-actions",
      depName: "actions/checkout",
      currentValue: "v7.0.0",
      currentVersion: "v7.0.0",
      newValue: "v7.1.0",
      updateType: "minor"
    }
  ],
  [
    "helmv3 minor",
    false,
    { versioning: "semver", manager: "helmv3", depName: "nodejs", currentValue: "3.1.0", currentVersion: "3.1.0", newValue: "3.2.0", updateType: "minor" }
  ],
  [
    "dockerfile minor",
    false,
    { versioning: "docker", manager: "dockerfile", depName: "postgres", currentValue: "16.1", currentVersion: "16.1", newValue: "16.2", updateType: "minor" }
  ],

  // Update types outside minor/patch fall through to the top-level automerge: false.
  ["pin", false, npmDep({ depName: "somepkg", currentValue: "^1.2.0", currentVersion: "1.2.0", newValue: "1.2.3", updateType: "pin" })],
  ["digest", false, { versioning: "docker", manager: "dockerfile", depName: "node", currentValue: "22-alpine", newValue: "22-alpine", updateType: "digest" }],
  ["rollback", false, npmDep({ depName: "somepkg", currentValue: "2.0.0", currentVersion: "2.0.0", newValue: "1.9.0", updateType: "rollback" })],
  ["replacement", false, npmDep({ depName: "somepkg", currentValue: "1.0.0", currentVersion: "1.0.0", newValue: "1.0.0", updateType: "replacement" })],
  ["lockFileMaintenance", false, { manager: "npm", updateType: "lockFileMaintenance", isLockFileMaintenance: true }]
];

// A grouped branch takes the AND of its members, so one denied upgrade holds the branch.
const GROUP_CASES = [
  [
    "all-minor monorepo group",
    true,
    [
      npmDep({ depName: "@prisma/client", currentValue: "7.8.0", currentVersion: "7.8.0", newValue: "7.9.1", updateType: "minor" }),
      devDep({ depName: "prisma", currentValue: "7.8.0", currentVersion: "7.8.0", newValue: "7.9.1", updateType: "minor" })
    ]
  ],
  [
    "minor grouped with a major",
    false,
    [
      npmDep({ depName: "a", currentValue: "1.0.0", currentVersion: "1.0.0", newValue: "1.1.0", updateType: "minor" }),
      npmDep({ depName: "b", currentValue: "1.0.0", currentVersion: "1.0.0", newValue: "2.0.0", updateType: "major" })
    ]
  ],
  [
    "minor grouped with a pre-1.0.0",
    false,
    [
      npmDep({ depName: "a", currentValue: "1.0.0", currentVersion: "1.0.0", newValue: "1.1.0", updateType: "minor" }),
      npmDep({ depName: "passport", currentValue: "0.7.0", currentVersion: "0.7.0", newValue: "0.8.0", updateType: "minor" })
    ]
  ],
  [
    "minor grouped with a resolutions bump",
    false,
    [
      npmDep({ depName: "a", currentValue: "1.0.0", currentVersion: "1.0.0", newValue: "1.1.0", updateType: "minor" }),
      npmDep({
        depName: "axios",
        depTypes: ["resolutions"],
        depType: "resolutions",
        currentValue: "1.18.1",
        currentVersion: "1.18.1",
        newValue: "1.19.0",
        updateType: "minor"
      })
    ]
  ]
];

const failures = [];

for (const [description, expected, upgrade] of CASES) {
  const resolved = await applyPackageRules({ ...base, ...upgrade });
  const actual = resolved.automerge === true;
  if (actual !== expected) {
    failures.push(`${description}: expected automerge ${expected}, got ${actual}`);
  }
}

for (const [description, expected, members] of GROUP_CASES) {
  const resolved = [];
  for (const member of members) {
    resolved.push(await applyPackageRules({ ...base, ...member }));
  }
  const actual = resolved.every((upgrade) => upgrade.automerge === true);
  if (actual !== expected) {
    failures.push(`${description}: expected branch automerge ${expected}, got ${actual}`);
  }
}

const total = CASES.length + GROUP_CASES.length;

if (failures.length > 0) {
  console.error(`${failures.length} of ${total} renovate automerge assertions failed:\n`);
  for (const failure of failures) {
    console.error(`  - ${failure}`);
  }
  console.error("\nCheck packageRules order in .github/renovate.json - later rules override earlier ones.");
  process.exit(1);
}

console.log(`All ${total} renovate automerge assertions passed.`);
