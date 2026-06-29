const { execSync } = require("child_process");
const { existsSync } = require("fs");

// Skip in CI environments and Docker builds (no .git directory)
if (!process.env.CI && existsSync(".git")) {
  execSync("lefthook install", { stdio: "inherit" });
}
