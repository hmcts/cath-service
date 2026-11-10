import { type Browser, chromium } from "playwright";

// Local CaTH and pip serve HTTPS with self-signed certificates, from this machine or, in the
// devcontainer, from Docker Desktop on the host
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "host.docker.internal"]);

// Playwright's own Chromium, or the one at PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH: Playwright's
// builds do not run on Alpine, so the hosted check's image uses Alpine's Chromium instead
export function launchChromium(): Promise<Browser> {
  return chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined });
}

// Whether a browser going to this address should accept a certificate it cannot verify: only for
// this machine. Anywhere else a certificate error is a real problem, and checks sign in with test
// accounts' passwords, which must not be sent to a server that cannot prove who it is.
export function acceptsUnverifiedCertificate(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return LOCAL_HOSTS.has(hostname) || hostname.endsWith(".localhost");
  } catch {
    return false;
  }
}
