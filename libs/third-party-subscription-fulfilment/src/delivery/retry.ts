// Port of Reactor Retry.backoff(3, Duration.ofSeconds(2)) as used by legacy PIP (error-handling.num-of-retries / backoff)
const MAX_RETRIES = 3;
const MIN_BACKOFF_MS = 2000;
const JITTER_FACTOR = 0.5;

export async function withRetry(operation: () => Promise<void>, logContext: string): Promise<boolean> {
  for (let retry = 0; ; retry++) {
    try {
      await operation();
      return true;
    } catch (error) {
      if (retry >= MAX_RETRIES) {
        return false;
      }

      const delayMs = backoffDelay(retry + 1);
      console.warn(`${logContext} Attempt ${retry + 1} failed (${errorMessage(error)}), retrying in ${delayMs}ms`);
      await sleep(delayMs);
    }
  }
}

// Reactor RetryBackoffSpec: the jitter never takes the delay below the minimum backoff
function backoffDelay(retryNumber: number): number {
  const baseDelay = MIN_BACKOFF_MS * 2 ** (retryNumber - 1);
  const jitterOffset = baseDelay * JITTER_FACTOR;
  const lowBound = Math.max(MIN_BACKOFF_MS - baseDelay, -jitterOffset);
  const jitter = lowBound + Math.random() * (jitterOffset - lowBound);
  return Math.round(baseDelay + jitter);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
