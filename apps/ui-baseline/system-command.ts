import { existsSync } from "node:fs";
import path from "node:path";

// Tools the scripts run (tar, zip, git, gh) are taken from these directories, never looked up on
// PATH, so a writable directory early on PATH cannot put another program in their place. On the
// Alpine image apk puts GNU tar in /bin (over busybox) and zip in /usr/bin; macOS has /usr/bin/tar;
// git and gh are often in /usr/local/bin, or Homebrew's /opt/homebrew/bin.
const SYSTEM_DIRS = ["/usr/bin", "/bin", "/usr/local/bin", "/opt/homebrew/bin"];

export function systemCommand(name: string, dirs: readonly string[] = SYSTEM_DIRS): string {
  const found = dirs.map((dir) => path.join(dir, name)).find((file) => existsSync(file));
  if (!found) throw new Error(`${name} is not installed in ${dirs.join(" or ")}`);
  return found;
}
