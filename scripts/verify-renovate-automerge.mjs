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
// LIMIT OF THIS HARNESS: it proves what automerge RESOLVES to, not that merging is safe.
// It cannot see CI coverage. Renovate scores a branch green when every check run is
// skipped (getBranchStatus in modules/platform/github treats skipped, neutral and success
// alike) and master's branch protection has required status checks switched off, so "all assertions
// passed" says nothing about whether any job actually ran. Whether a manager's PR is
// covered at all depends on the detect-code-changes path gate in workflow.preview.yml -
// see the packageRules descriptions in renovate.json. Read this as a resolution test only.
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
  datasource: "npm",
  depTypes: ["dependencies"],
  depType: "dependencies",
  ...overrides
});

const devDep = (overrides) => npmDep({ depTypes: ["devDependencies"], depType: "devDependencies", ...overrides });

// The policy is an allowlist: only the npm and helmv3 managers automerge, because theirs
// are the only PRs inside the detect-code-changes path gate. Within npm, majors, pre-1.0.0
// packages, the yarn packageManager and Node (engines/volta) are held back. Every other manager falls through to
// automerge: false - the cases for them exist so a manager added to the allowlist without
// checking the path gate breaks this harness.
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

  // npm majors. The original incident, PR #753, was a devDependency major that broke the
  // GOV.UK assets, so the rule must stay depType-blind.
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

  // Managers outside the allowlist never automerge at any update type. Their PRs touch only
  // paths the preview pipeline skips, and terraform is applied for real by master.
  [
    "github-actions major",
    false,
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
    false,
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
    "docker-compose major",
    false,
    { versioning: "docker", manager: "docker-compose", depName: "postgres", currentValue: "18-alpine", newValue: "19-alpine", updateType: "major" }
  ],
  [
    "helmv3 major",
    true,
    { versioning: "semver", manager: "helmv3", depName: "nodejs", currentValue: "3.1.0", currentVersion: "3.1.0", newValue: "4.0.0", updateType: "major" }
  ],
  [
    "terraform-version minor",
    false,
    { versioning: "hashicorp", manager: "terraform-version", depName: "hashicorp/terraform", currentValue: "1.15.8", newValue: "1.16.0", updateType: "minor" }
  ],
  [
    "devcontainer feature major",
    false,
    {
      versioning: "docker",
      manager: "devcontainer",
      depName: "ghcr.io/devcontainers/features/docker-in-docker",
      currentValue: "2",
      newValue: "3",
      updateType: "major"
    }
  ],
  [
    "devcontainer image",
    false,
    {
      versioning: "docker",
      manager: "devcontainer",
      depName: "mcr.microsoft.com/devcontainers/base",
      currentValue: "ubuntu",
      newValue: "ubuntu",
      updateType: "digest"
    }
  ],
  [
    "corepack via custom regex manager",
    false,
    {
      versioning: "npm",
      manager: "custom.regex",
      depName: "corepack",
      datasource: "npm",
      currentValue: "0.36.0",
      currentVersion: "0.36.0",
      newValue: "0.37.0",
      updateType: "minor"
    }
  ],

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

  // The yarn packageManager never automerges; resolutions pins automerge below major.
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
  // Node never automerges by any route: the group (nvm and custom.regex - Renovate
  // registers custom managers as custom.regex, so the legacy "regex" spelling silently
  // matches nothing) or the dockerfile manager, whose only image is the production Node base.
  [
    "node via nvm",
    false,
    {
      versioning: "node",
      manager: "nvm",
      depName: "node",
      packageName: "node",
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
      manager: "custom.regex",
      depName: "node",
      packageName: "node",
      datasource: "docker",
      currentValue: "22.1.0",
      currentVersion: "22.1.0",
      newValue: "22.1.1",
      updateType: "patch"
    }
  ],
  [
    "node major via nvm",
    false,
    {
      versioning: "node",
      manager: "nvm",
      depName: "node",
      packageName: "node",
      datasource: "node-version",
      currentValue: "22.17.0",
      currentVersion: "22.17.0",
      newValue: "24.0.0",
      updateType: "major"
    }
  ],

  [
    "node base image via dockerfile manager",
    false,
    {
      versioning: "docker",
      manager: "dockerfile",
      depName: "hmctspublic.azurecr.io/base/node",
      packageName: "hmctspublic.azurecr.io/base/node",
      datasource: "docker",
      currentValue: "22-alpine",
      newValue: "24-alpine",
      updateType: "major"
    }
  ],
  [
    "node via npm engines",
    false,
    npmDep({
      depName: "node",
      packageName: "node",
      depTypes: ["engines"],
      depType: "engines",
      datasource: "node-version",
      versioning: "node",
      currentValue: "^22.0.0",
      newValue: "^22.1.0",
      updateType: "minor"
    })
  ],
  [
    "node via npm volta",
    false,
    npmDep({
      depName: "node",
      packageName: "node",
      depTypes: ["volta"],
      depType: "volta",
      datasource: "node-version",
      versioning: "node",
      currentValue: "22.17.0",
      currentVersion: "22.17.0",
      newValue: "22.18.0",
      updateType: "minor"
    })
  ],

  // Minor bumps across the remaining managers.
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
    true,
    { versioning: "semver", manager: "helmv3", depName: "nodejs", currentValue: "3.1.0", currentVersion: "3.1.0", newValue: "3.2.0", updateType: "minor" }
  ],
  [
    "docker-compose minor",
    false,
    { versioning: "docker", manager: "docker-compose", depName: "redis", currentValue: "8-alpine", newValue: "8.2-alpine", updateType: "minor" }
  ],

  // npm update types other than major reach the allowlist. pin, rollback and
  // lockFileMaintenance are disabled under config:recommended, so these assert resolution
  // for paths Renovate does not currently exercise. digest is absent: it only applies to
  // docker images, and no allowlisted manager raises one.
  ["pin", true, npmDep({ depName: "somepkg", currentValue: "^1.2.0", currentVersion: "1.2.0", newValue: "1.2.3", updateType: "pin" })],
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
    "npm minor grouped with a github-actions major is held because github-actions is not allowlisted",
    false,
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
    false,
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

// [description, expected minimumReleaseAge, upgrade]
const RELEASE_AGE_CASES = [
  ["npm dependency is held", "3 days", npmDep({ depName: "express", currentValue: "5.2.0", currentVersion: "5.2.0", newValue: "5.3.0", updateType: "minor" })],
  [
    "npm datasource under another manager is held",
    "3 days",
    { versioning: "npm", manager: "custom.regex", depName: "corepack", datasource: "npm", currentValue: "0.36.0", newValue: "0.37.0", updateType: "minor" }
  ],
  [
    "non-npm is not held",
    undefined,
    {
      versioning: "semver",
      manager: "helmv3",
      depName: "nodejs",
      datasource: "helm",
      currentValue: "3.1.0",
      currentVersion: "3.1.0",
      newValue: "3.2.0",
      updateType: "minor"
    }
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

for (const [description, expected, upgrade] of RELEASE_AGE_CASES) {
  const resolved = await applyPackageRules({ ...base, ...upgrade });
  if (resolved.minimumReleaseAge !== expected) {
    failures.push(`${description}: expected minimumReleaseAge ${expected}, got ${resolved.minimumReleaseAge}`);
  }
}

const total = CASES.length + GROUP_CASES.length + RELEASE_AGE_CASES.length;

if (failures.length > 0) {
  console.error(`${failures.length} of ${total} renovate assertions failed:\n`);
  for (const failure of failures) {
    console.error(`  - ${failure}`);
  }
  console.error("\nCheck packageRules order in .github/renovate.json - later rules override earlier ones.");
  process.exit(1);
}

console.log(`All ${total} renovate assertions passed.`);
