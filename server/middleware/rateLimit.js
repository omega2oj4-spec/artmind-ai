const buckets = new Map();

export function createRateLimiter({ windowMs, max, key = req => req.ip }) {
  return (req, res, next) => {
    const now = Date.now();
    const bucketKey = `${key(req)}:${req.path}`;
    const recent = (buckets.get(bucketKey) || []).filter(time => now - time < windowMs);
    if (recent.length >= max) {
      return res.status(429).json({ error: 'Too many requests. Please try again later.' });
    }
    recent.push(now);
    buckets.set(bucketKey, recent);
    return next();
  };
}
