/**
 * Dependency-free sliding-window rate limiter.
 *
 * Why it exists: every conversation turn fans out to OpenAI. Without a cap,
 * one stuck frontend retry-loop (or one curious teammate with a while-true)
 * burns the shared API budget mid-demo. In-memory is fine here — single
 * process, hackathon scale; swap for a Redis store if this ever runs on
 * more than one instance.
 */
const buckets = new Map();

export function rateLimit({ windowMs = 60_000, max = 120 } = {}) {
  return (req, res, next) => {
    const key = req.ip ?? 'unknown';
    const now = Date.now();
    let hits = buckets.get(key);
    if (!hits) {
      hits = [];
      buckets.set(key, hits);
    }
    // drop entries outside the window
    while (hits.length > 0 && hits[0] <= now - windowMs) hits.shift();

    if (hits.length >= max) {
      res.set('Retry-After', String(Math.ceil(windowMs / 1000)));
      return res.status(429).json({ error: 'Too many requests — slow down.' });
    }
    hits.push(now);
    return next();
  };
}

// Periodic cleanup so idle IPs don't accumulate forever
setInterval(() => {
  const cutoff = Date.now() - 5 * 60_000;
  for (const [key, hits] of buckets) {
    if (hits.length === 0 || hits[hits.length - 1] < cutoff) buckets.delete(key);
  }
}, 60_000).unref();
