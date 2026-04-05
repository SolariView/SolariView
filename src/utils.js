/** Errors that indicate a transient RPC failure worth retrying. */
export const RETRYABLE = /timeout|ECONNRESET|ETIMEDOUT|rate.?limit|429|503|fetch failed/i;

/**
 * Retry an async operation up to `maxAttempts` times with exponential backoff.
 * Only retries on transient errors; throws immediately on deterministic failures.
 *
 * @param {() => Promise<unknown>} fn
 * @param {{ maxAttempts?: number, baseDelayMs?: number }} [opts]
 */
export async function withRetry(fn, { maxAttempts = 3, baseDelayMs = 250 } = {}) {
  let lastErr;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const isRetryable = RETRYABLE.test(err?.message ?? "");
      if (!isRetryable || attempt === maxAttempts) throw err;
      const delay = baseDelayMs * 2 ** (attempt - 1);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastErr;
}
