import fs from "node:fs";
import path from "node:path";

const PREFIX_FILE = path.join(process.cwd(), ".test-prefix");

export function generateTestPrefix(): string {
  const timestamp = Date.now();
  return `E2E_${timestamp}_`;
}

export function setTestPrefix(prefix: string): void {
  fs.writeFileSync(PREFIX_FILE, prefix, "utf-8");
}

export function getTestPrefix(): string {
  if (!fs.existsSync(PREFIX_FILE)) {
    throw new Error("Test prefix not found. Ensure global-setup has run.");
  }
  return fs.readFileSync(PREFIX_FILE, "utf-8").trim();
}

export function clearTestPrefix(): void {
  if (fs.existsSync(PREFIX_FILE)) {
    fs.unlinkSync(PREFIX_FILE);
  }
}

export function prefixName(name: string): string {
  return `${getTestPrefix()}${name}`;
}

export function prefixEmail(email: string): string {
  const prefix = getTestPrefix();
  const [localPart, domain] = email.split("@");
  return `${prefix}${localPart}@${domain}`;
}
