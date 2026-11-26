export async function sendRequest(request: DeliveryRequest): Promise<void> {
  const headers: Record<string, string> = {};
  if (request.accessToken) {
    headers.Authorization = `Bearer ${request.accessToken}`;
  }
  if (request.contentType) {
    headers["Content-Type"] = request.contentType;
  }

  const response = await fetch(request.url, {
    method: request.method,
    headers,
    body: request.body ? new Uint8Array(request.body) : undefined
  });

  // The response body is never used, so release the connection straight away
  await response.body?.cancel();

  if (!response.ok) {
    throw new Error(`Third-party API returned status ${response.status}`);
  }
}

export interface DeliveryRequest {
  method: "POST" | "PUT" | "DELETE";
  url: string;
  accessToken: string | null;
  body?: Buffer;
  contentType?: string;
}
