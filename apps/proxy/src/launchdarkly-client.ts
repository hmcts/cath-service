import { init, type LDClient } from "@launchdarkly/node-server-sdk";

const INIT_TIMEOUT_SECONDS = 10;

let client: LDClient | null = null;

export async function initLaunchDarklyClient(sdkKey: string): Promise<void> {
  client = init(sdkKey);
  await client.waitForInitialization({ timeout: INIT_TIMEOUT_SECONDS });
}

export function getLaunchDarklyClient(): LDClient | null {
  return client;
}

export async function closeLaunchDarklyClient(): Promise<void> {
  if (client) {
    await client.flush();
    client.close();
    client = null;
  }
}
