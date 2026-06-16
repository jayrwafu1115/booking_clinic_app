type RateLimitOptions = {
  limit: number;
  windowMs: number;
};

type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: number;
};

// ── In-memory fallback (single-instance) ─────────────────────────────────────

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

function checkInMemory(key: string, options: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    const resetAt = now + options.windowMs;
    buckets.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: Math.max(options.limit - 1, 0), resetAt };
  }

  if (existing.count >= options.limit) {
    return { allowed: false, remaining: 0, resetAt: existing.resetAt };
  }

  existing.count += 1;
  return { allowed: true, remaining: Math.max(options.limit - existing.count, 0), resetAt: existing.resetAt };
}

// ── Upstash Redis (multi-instance, via REST API — no SDK needed) ──────────────
// Set UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN in env to enable.
// Falls back to in-memory when env vars are absent or the request fails.

async function checkUpstash(key: string, options: RateLimitOptions): Promise<RateLimitResult | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  const windowSec = Math.ceil(options.windowMs / 1000);
  const redisKey = `rl:${key}`;
  const headers = { Authorization: `Bearer ${token}` };

  try {
    const incrRes = await fetch(`${url}/incr/${encodeURIComponent(redisKey)}`, {
      method: "GET",
      headers,
      cache: "no-store",
    });
    if (!incrRes.ok) return null;

    const { result: count } = (await incrRes.json()) as { result: number };

    // Set TTL only on first increment so the window resets naturally.
    if (count === 1) {
      void fetch(`${url}/expire/${encodeURIComponent(redisKey)}/${windowSec}`, {
        method: "GET",
        headers,
        cache: "no-store",
      });
    }

    return {
      allowed: count <= options.limit,
      remaining: Math.max(options.limit - count, 0),
      resetAt: Date.now() + options.windowMs,
    };
  } catch {
    return null;
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function checkRateLimit(key: string, options: RateLimitOptions): Promise<RateLimitResult> {
  const redisResult = await checkUpstash(key, options);
  if (redisResult) return redisResult;
  return checkInMemory(key, options);
}
