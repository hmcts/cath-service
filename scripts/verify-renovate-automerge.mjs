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

// The policy is: everything automerges except npm majors. Cases expecting false are
// therefore the npm majors, and the rest assert the permissive default really does reach
// them - including the categories that used to be carved out, so a silent re-narrowing
// shows up here as a failure.
//
// [description, expected automerge, upgrade]
const CASES = [
  // Non-breaking npm updates.
  [
    "npm minor, dependency",
    true,
    npmDep({ depName: "govuk-frontend", currentValue: "6.2.0", currentVersion: "6.2.0", newValue: "6.4.0", updateType: "minor" })
  ],
  ["npm minor, caret range", true, npmDep({ depName: "express", currentValue: "^5.2.0", currentVersion: "5.2.0", newValue: "^5.3.0", updateType: "minor" })],
  ["npm patch, devDependency", true, devDep({ depName: "vitest", currentValue: "4.1.8", currentVersion: "4.1.8", newValue: "4.1.10", updateType: "patch" })],

  // npm majors are the sole exclusion. The original incident, PR #753, was a
  // devDependency major that broke the GOV.UK assets, so the rule must stay depType-blind.
  [
    "npm major, the PR #753 bump",
    false,
    devDep({ depName: "vite-plugin-static-copy", currentValue: "3.4.0", currentVersion: "3.4.0", newValue: "4.1.1", updateType: "major" })
  ],
  ["npm major, dependency", false, npmDep({ depName: "vite", currentValue: "7.3.6", currentVersion: "7.3.6", newValue: "8.0.0", updateType: "major" })],
  [
    "npm major, resolutions entry",
    false,
    npmDep({
      depName: "axios",
      depTypes: ["resolutions"],
      depType: "resolutions",
      currentValue: "1.18.1",
      currentVersion: "1.18.1",
      newValue: "2.0.0",
      updateType: "major"
    })
  ],
  [
    "npm major, packageManager",
    false,
    npmDep({
      depName: "yarn",
      depTypes: ["packageManager"],
      depType: "packageManager",
      currentValue: "4.17.0",
      currentVersion: "4.17.0",
      newValue: "5.0.0",
      updateType: "major"
    })
  ],
  [
    "npm major out of a pre-1.0.0 package",
    false,
    npmDep({ depName: "passport", currentValue: "0.7.0", currentVersion: "0.7.0", newValue: "1.0.0", updateType: "major" })
  ],

  // Majors in every other manager DO automerge - only npm majors are excluded.
  [
    "github-actions major",
    true,
    {
      versioning: "docker",
      manager: "github-actions",
      depName: "actions/checkout",
      currentValue: "v7.0.0",
      currentVersion: "v7.0.0",
      newValue: "v8.0.0",
      updateType: "major"
    }
  ],
  [
    "terraform major",
    true,
    {
      versioning: "semver",
      manager: "terraform",
      depName: "azurerm",
      currentValue: "4.10.0",
      currentVersion: "4.10.0",
      newValue: "5.0.0",
      updateType: "major"
    }
  ],
  [
    "helmv3 major",
    true,
    { versioning: "semver", manager: "helmv3", depName: "nodejs", currentValue: "3.1.0", currentVersion: "3.1.0", newValue: "4.0.0", updateType: "major" }
  ],
  [
    "dockerfile major",
    true,
    { versioning: "docker", manager: "dockerfile", depName: "postgres", currentValue: "16.1", currentVersion: "16.1", newValue: "17.0", updateType: "major" }
  ],

  // Pre-1.0.0 npm bumps now automerge: under semver a 0.x minor may break, but Renovate
  // classifies it as minor and the policy only stops majors.
  ["pre-1.0.0 pin, minor", true, npmDep({ depName: "passport", currentValue: "0.7.0", currentVersion: "0.7.0", newValue: "0.8.0", updateType: "minor" })],
  ["pre-1.0.0 pin, patch", true, npmDep({ depName: "passport", currentValue: "0.7.0", currentVersion: "0.7.0", newValue: "0.7.1", updateType: "patch" })],
  [
    "pre-1.0.0 caret range, peerDependency",
    true,
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
    true,
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
    true,
    npmDep({ depName: "hypothetical", currentValue: ">=0.5.0 <1.0.0", currentVersion: "0.5.0", newValue: ">=0.6.0 <1.0.0", updateType: "minor" })
  ],
  ["pre-1.0.0 bare major range", true, npmDep({ depName: "hypothetical", currentValue: "0", currentVersion: "0.9.0", newValue: "1", updateType: "minor" })],
  ["1.x minor", true, npmDep({ depName: "lodash", currentValue: "4.18.1", currentVersion: "4.18.1", newValue: "4.19.0", updateType: "minor" })],

  // Toolchain and deliberate pins automerge below major.
  [
    "packageManager minor",
    true,
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
    true,
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
    true,
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
    true,
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
  // Node moves .nvmrc, the root Dockerfile base image and three workflow files together,
  // and now automerges with them. Neither manager is npm, so even a major is allowed.
  [
    "node via nvm",
    true,
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
    true,
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
  [
    "node major via nvm",
    true,
    {
      versioning: "node",
      manager: "nvm",
      depName: "node",
      datasource: "node-version",
      currentValue: "22.17.0",
      currentVersion: "22.17.0",
      newValue: "24.0.0",
      updateType: "major"
    }
  ],

  // Every other manager automerges below major too.
  [
    "terraform minor",
    true,
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
    true,
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
    true,
    { versioning: "semver", manager: "helmv3", depName: "nodejs", currentValue: "3.1.0", currentVersion: "3.1.0", newValue: "3.2.0", updateType: "minor" }
  ],
  [
    "dockerfile minor",
    true,
    { versioning: "docker", manager: "dockerfile", depName: "postgres", currentValue: "16.1", currentVersion: "16.1", newValue: "16.2", updateType: "minor" }
  ],

  // Update types other than major reach the permissive default.
  ["pin", true, npmDep({ depName: "somepkg", currentValue: "^1.2.0", currentVersion: "1.2.0", newValue: "1.2.3", updateType: "pin" })],
  ["digest", true, { versioning: "docker", manager: "dockerfile", depName: "node", currentValue: "22-alpine", newValue: "22-alpine", updateType: "digest" }],
  ["rollback", true, npmDep({ depName: "somepkg", currentValue: "2.0.0", currentVersion: "2.0.0", newValue: "1.9.0", updateType: "rollback" })],
  ["replacement", true, npmDep({ depName: "somepkg", currentValue: "1.0.0", currentVersion: "1.0.0", newValue: "1.0.0", updateType: "replacement" })],
  ["lockFileMaintenance", true, { manager: "npm", updateType: "lockFileMaintenance", isLockFileMaintenance: true }]
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
    "minor grouped with an npm major",
    false,
    [
      npmDep({ depName: "a", currentValue: "1.0.0", currentVersion: "1.0.0", newValue: "1.1.0", updateType: "minor" }),
      npmDep({ depName: "b", currentValue: "1.0.0", currentVersion: "1.0.0", newValue: "2.0.0", updateType: "major" })
    ]
  ],
  [
    "npm minor grouped with a non-npm major still automerges",
    true,
    [
      npmDep({ depName: "a", currentValue: "1.0.0", currentVersion: "1.0.0", newValue: "1.1.0", updateType: "minor" }),
      {
        versioning: "docker",
        manager: "github-actions",
        depName: "actions/setup-node",
        currentValue: "v6.0.0",
        currentVersion: "v6.0.0",
        newValue: "v7.0.0",
        updateType: "major"
      }
    ]
  ],
  [
    "minor grouped with a pre-1.0.0",
    true,
    [
      npmDep({ depName: "a", currentValue: "1.0.0", currentVersion: "1.0.0", newValue: "1.1.0", updateType: "minor" }),
      npmDep({ depName: "passport", currentValue: "0.7.0", currentVersion: "0.7.0", newValue: "0.8.0", updateType: "minor" })
    ]
  ],
  [
    "minor grouped with a resolutions bump",
    true,
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
