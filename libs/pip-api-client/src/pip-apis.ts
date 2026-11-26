// PIP API hosts are <prefix>.<environment>.platform.hmcts.net, e.g. pip-data-management.staging.platform.hmcts.net.
// Each API has its own app registration, so a token is only accepted by the API whose app ID URI (the scope,
// from Key Vault) it was requested for. The host prefix decides which scope is used.
const PIP_APIS = [
  { hostPrefix: "pip-data-management", scopeVariable: "PIP_DATA_MANAGEMENT_SCOPE" },
  { hostPrefix: "pip-account-management", scopeVariable: "PIP_ACCOUNT_MANAGEMENT_SCOPE" }
] as const;
const HOST_SUFFIX = ".platform.hmcts.net";
const ENVIRONMENT_LABEL = /^[a-z0-9-]+$/;

export function getPipApiHostPatterns(): string[] {
  return PIP_APIS.filter((api) => readScope(api) !== undefined).map((api) => `${api.hostPrefix}.<environment>${HOST_SUFFIX}`);
}

export function getPipApiScope(host: string): string | undefined {
  const api = findPipApi(normaliseHost(host));
  return api ? readScope(api) : undefined;
}

export function isAllowedPipHost(host: string): boolean {
  return getPipApiScope(host) !== undefined;
}

export function normaliseHost(host: string): string {
  return host.trim().toLowerCase().replace(/\.$/, "");
}

function readScope({ scopeVariable }: PipApi): string | undefined {
  const scope = process.env[scopeVariable]?.trim();
  return scope ? scope : undefined;
}

function findPipApi(host: string): PipApi | undefined {
  return PIP_APIS.find(({ hostPrefix }) => {
    const prefix = `${hostPrefix}.`;
    if (!host.startsWith(prefix) || !host.endsWith(HOST_SUFFIX)) {
      return false;
    }
    return ENVIRONMENT_LABEL.test(host.slice(prefix.length, host.length - HOST_SUFFIX.length));
  });
}

type PipApi = (typeof PIP_APIS)[number];
