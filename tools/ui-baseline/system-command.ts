import { existsSync } from "node:fs";
import path from "node:path";

// System tools (tar, zip) are run from the system's own directories, never looked up on PATH, so a
// writable directory early on PATH cannot put another program in their place. Both are needed: on
// the Alpine image apk puts GNU tar in /bin (over busybox) and zip in /usr/bin; macOS has /usr/bin/tar.
const SYSTEM_DIRS = ["/usr/bin", "/bin"];

export function systemCommand(name: string, dirs: readonly string[] = SYSTEM_DIRS): string {
  const found = dirs.map((dir) => path.join(dir, name)).find((file) => existsSync(file));
  if (!found) throw new Error(`${name} is not installed in ${dirs.join(" or ")}`);
  return found;
}
