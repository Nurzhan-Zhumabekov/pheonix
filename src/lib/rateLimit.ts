/**
 * Small in-memory limiter to protect the API budget.
 * It is per server instance, which is enough for a demo; use a shared store in production.
 */

const WINDOW_MS = 60 * 60 * 1000;
const hits = new Map<string, number[]>();

export function allowRequest(key: string, limit: number, now: number = Date.now()): boolean {
  const recent = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= limit) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  return true;
}

export function resetRateLimit(): void {
  hits.clear();
}
