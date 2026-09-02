import { init, type LDClient } from "@launchdarkly/node-server-sdk";

const LD_SDK_KEY = process.env.CATH_LD_KEY ?? "";

let client: LDClient | null = null;

async function getLdClient(): Promise<LDClient | null> {
  if (!LD_SDK_KEY) {
    return null;
  }

  if (!client) {
    client = init(LD_SDK_KEY);
    try {
      await client.waitForInitialization({ timeout: 5 });
    } catch {
      client = null;
      return null;
    }
  }

  return client;
}

export async function isFeatureEnabled(flagKey: string, userId: string): Promise<boolean> {
  const ldClient = await getLdClient();
  if (!ldClient) {
    return false;
  }
  return ldClient.variation(flagKey, { key: userId }, false);
}
